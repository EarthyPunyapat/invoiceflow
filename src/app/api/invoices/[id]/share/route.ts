import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateShareToken } from "@/lib/token";

// POST /api/invoices/[id]/share — issue (or reuse) the public share link
// for a SENT or OVERDUE invoice. Tokens are 128-bit random hex, safe to
// expose as unguessable URLs (/i/[token]).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    let shareToken = invoice.shareToken;
    if (!shareToken) {
      shareToken = generateShareToken();
      try {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { shareToken },
        });
      } catch {
        // Rare race: two tabs issued tokens simultaneously and the unique
        // index kept only one — reuse whichever token was persisted.
        const fresh = await prisma.invoice.findUnique({
          where: { id: invoice.id },
          select: { shareToken: true },
        });
        shareToken = fresh?.shareToken ?? shareToken;
      }
    }

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin)
      .trim()
      .replace(/\/+$/, "");

    return NextResponse.json({ url: `${base}/i/${shareToken}` });
  } catch (error) {
    console.error("[INVOICE_SHARE]", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
