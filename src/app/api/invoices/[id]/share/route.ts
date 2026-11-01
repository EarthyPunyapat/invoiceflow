import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureShareToken } from "@/lib/invoice-share";
import { appUrl } from "@/lib/app-url";

// POST /api/invoices/[id]/share — issue (or reuse) the public share link
// for a SENT or OVERDUE invoice. Tokens are 128-bit random hex, safe to
// expose as unguessable URLs (/i/[token]).
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId },
      select: { id: true, status: true, shareToken: true },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status !== "SENT" && invoice.status !== "OVERDUE") {
      return NextResponse.json(
        { error: "Only sent or overdue invoices can be shared" },
        { status: 400 }
      );
    }

    const shareToken = await ensureShareToken(invoice.id);
    const base = appUrl();

    return NextResponse.json({ url: `${base}/i/${shareToken}` });
  } catch (error) {
    console.error("[INVOICE_SHARE]", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
