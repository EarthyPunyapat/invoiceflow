import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/email";
import { appUrl } from "@/lib/app-url";

export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invoice = await prisma.invoice.findFirst({ where: { id: params.id, userId: session.user.id } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!["DRAFT", "SENT", "OVERDUE"].includes(invoice.status)) {
    return NextResponse.json({ error: "This invoice cannot be sent" }, { status: 400 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: "Email delivery is not configured" }, { status: 503 });
  }
  try {
    const { emailId } = await sendInvoiceEmail(invoice.id);
    const updated = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { client: true, items: true } });
    return NextResponse.json({ data: updated, emailId, shareUrl: `${appUrl()}/i/${updated.shareToken}`, message: "Invoice sent successfully" });
  } catch (error) {
    console.error("[SEND_INVOICE]", error);
    return NextResponse.json({ error: "Failed to send invoice" }, { status: 502 });
  }
}
