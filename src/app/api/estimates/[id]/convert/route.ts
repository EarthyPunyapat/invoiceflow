import { ConflictError } from "@/lib/api-error";
import { requireActivePlan } from "@/lib/plan-guard";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lockOwner } from "@/lib/billing";
import { allocateInvoiceNumber } from "@/lib/invoice-sequence";
import { requireUser } from "@/lib/require-user";

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
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const userId = await requireUser(req);

  if (!userId) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }
  const planRequired = await requireActivePlan(userId);
  if (planRequired) return planRequired;

  try {
    const estimate = await prisma.estimate.findFirst({
      where: { id: params.id, userId: userId },
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

    const ownerId = userId;
    const invoice = await prisma.$transaction(async (tx) => {
      await lockOwner(tx, estimate.userId);
      const claimed = await tx.estimate.updateMany({
        where: { id: estimate.id, userId: ownerId, status: { in: ["DRAFT", "SENT", "ACCEPTED"] } },
        data: { status: "CONVERTED" },
      });
      if (!claimed.count) throw new ConflictError("Estimate has already been converted or declined");
      const now = new Date();
      const invoiceNumber = await allocateInvoiceNumber(tx, estimate.userId, now);

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
      { error: error instanceof ConflictError ? error.message : "Failed to convert estimate" },
      { status: error instanceof ConflictError ? 409 : 500 }
    );
  }
}
