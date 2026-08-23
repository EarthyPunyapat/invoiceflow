import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/estimates/[id]/convert
 *
 * Converts an accepted/sent/draft estimate into a real invoice:
 *   1. Clone estimate fields + items onto a new Invoice (new INV number,
 *      DRAFT status, due date = issue + 30 days).
 *   2. Mark the estimate CONVERTED so it can't be double-converted.
 *
 * Money fields are carried over verbatim (identical line items ⇒ identical
 * totals) — no float recomputation at the boundary.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const estimate = await prisma.estimate.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { items: { orderBy: { createdAt: "asc" } } },
    });

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (estimate.status === "CONVERTED") {
      return NextResponse.json(
        { error: "Estimate has already been converted" },
        { status: 400 }
      );
    }

    if (estimate.status === "DECLINED") {
      return NextResponse.json(
        { error: "Declined estimates cannot be converted" },
        { status: 400 }
      );
    }

    const invoice = await prisma.$transaction(async (tx) => {
      // Invoice number (INV-YYYYMM-XXXX), same scheme as the invoices API.
      const now = new Date();
      const prefix = `INV-${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
      const lastInvoice = await tx.invoice.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: "desc" },
      });
      const parsed = parseInt(
        lastInvoice?.invoiceNumber.split("-").pop() || "",
        10
      );
      const invoiceNumber = `${prefix}-${String(
        Number.isNaN(parsed) ? 1 : parsed + 1
      ).padStart(4, "0")}`;

      // Due date: 30 days from now (standard terms on conversion).
      const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const created = await tx.invoice.create({
        data: {
          userId: estimate.userId,
          clientId: estimate.clientId,
          invoiceNumber,
          status: "DRAFT",
          subtotal: estimate.subtotal,
          tax: estimate.tax,
          total: estimate.total,
          currency: estimate.currency,
          dueDate,
          notes: estimate.notes,
          items: {
            create: estimate.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
        include: {
          client: {
            select: { id: true, name: true, company: true, email: true },
          },
          items: true,
        },
      });

      await tx.estimate.update({
        where: { id: estimate.id },
        data: { status: "CONVERTED" },
      });

      return created;
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error("Convert estimate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to convert estimate" },
      { status: 500 }
    );
  }
}
