import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/email";
import { EmailDeliveryError } from "@/lib/email-error";
import { emailConfigured } from "@/lib/integration-config";
import { z } from "zod";
import { appUrl } from "@/lib/app-url";

export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const params = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!invoice)
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!["DRAFT", "SENT", "OVERDUE"].includes(invoice.status)) {
    return NextResponse.json(
      { error: "This invoice cannot be sent" },
      { status: 400 },
    );
  }
  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email delivery is not configured for this deployment. Set up an email service and verified sender before retrying.",
        code: "EMAIL_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = z
      .object({ requestId: z.string().uuid().optional() })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid email request" },
        { status: 400 },
      );
    const { emailId } = await sendInvoiceEmail(
      invoice.id,
      false,
      parsed.data.requestId,
    );
    const updated = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
      include: { client: true, items: true },
    });
    return NextResponse.json({
      data: updated,
      emailId,
      shareUrl: `${appUrl()}/i/${updated.shareToken}`,
      message: emailId
        ? "Email submitted for delivery"
        : "Invoice email was already submitted",
    });
  } catch (error) {
    if (error instanceof EmailDeliveryError)
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    console.error("[SEND_INVOICE]", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        error:
          "The email service could not be reached. Your invoice is saved; please retry.",
        code: "EMAIL_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
}
