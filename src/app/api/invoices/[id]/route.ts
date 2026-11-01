import { ConflictError } from "@/lib/api-error";
import { lockOwner } from "@/lib/billing";
import { canTransition } from "@/lib/invoice-status";
import { getStripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  applyTaxPercent,
  centsToDollars,
  dollarsToCents,
  sumCents,
} from "@/lib/money";
import {
  invoiceStatusUpdateSchema,
  invoiceUpdateSchema,
} from "@/lib/validators/invoices";

export async function GET(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      client: true,
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = invoiceStatusUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { status } = parsed.data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const ownerId = session.user.id;
    const updated = await prisma.$transaction(async (tx) => {
      await lockOwner(tx, ownerId);
      const current = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      if (!canTransition(current.status, status)) throw new ConflictError("Invalid invoice status transition");
      if (current.checkoutSessionId && status !== current.status) {
        const account = await tx.stripeAccount.findUnique({ where: { userId: ownerId } });
        if (!account) throw new Error("Payment account not found");
        const stripe = getStripe();
        const checkout = await stripe.checkout.sessions.retrieve(current.checkoutSessionId, { stripeAccount: account.stripeAccountId });
        if (checkout.status === "complete") throw new ConflictError("A payment is processing; wait for confirmation");
        if (checkout.status === "open") await stripe.checkout.sessions.expire(checkout.id, { stripeAccount: account.stripeAccountId });
      }
      const data = { status, ...(status === "SENT" && !current.sentAt ? { sentAt: new Date() } : {}), ...(status === "PAID" && !current.paidAt ? { paidAt: new Date() } : {}) };
      return tx.invoice.update({ where: { id: current.id }, data, include: { client: true, items: { orderBy: { createdAt: "asc" } } } });
    }, { timeout: 30_000 });

    return NextResponse.json({ invoice: updated });
  } catch (error: any) {
    console.error("Update invoice error:", error);
    return NextResponse.json(
      { error: error instanceof ConflictError ? error.message : "Failed to update invoice" },
      { status: error instanceof ConflictError ? 409 : 500 }
    );
  }
}

// Draft edits share the same owner lock as send, checkout, and settlement.
export async function PUT(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = session.user.id;
  try {
    const parsed = invoiceUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
    }
    const { clientId, dueDate, notes, tax, currency, items } = parsed.data;
    return await prisma.$transaction(async tx => {
      await lockOwner(tx, ownerId);
      const invoice = await tx.invoice.findFirst({ where: { id: params.id, userId: ownerId } });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      if (invoice.status !== "DRAFT") {
        return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 409 });
      }
      if (clientId && clientId !== invoice.clientId) {
        const client = await tx.client.findFirst({ where: { id: clientId, userId: ownerId } });
        if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }
      const lineCents = items.map(item => dollarsToCents(item.quantity * item.unitPrice));
      const subtotalCents = sumCents(...lineCents);
      const { totalCents } = applyTaxPercent(subtotalCents, tax);
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          ...(clientId ? { clientId } : {}),
          dueDate: dueDate ? new Date(dueDate) : invoice.dueDate,
          currency, tax, subtotal: centsToDollars(subtotalCents), total: centsToDollars(totalCents),
          notes: notes !== undefined ? notes : invoice.notes,
          items: { deleteMany: {}, create: items.map((item, i) => ({
            description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: centsToDollars(lineCents[i]),
          })) },
        },
        include: { client: { select: { id: true, name: true, company: true, email: true } }, items: true },
      });
      return NextResponse.json({ invoice: updated });
    }, { maxWait: 10_000 });
  } catch (error) {
    console.error("Replace invoice error:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = session.user.id;
  try {
    return await prisma.$transaction(async tx => {
      await lockOwner(tx, ownerId);
      const invoice = await tx.invoice.findFirst({ where: { id: params.id, userId: ownerId } });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      if (invoice.status !== "DRAFT") {
        return NextResponse.json({ error: "Only draft invoices can be deleted" }, { status: 409 });
      }
      await tx.invoice.delete({ where: { id: invoice.id } });
      return NextResponse.json({ success: true });
    }, { maxWait: 10_000 });
  } catch (error) {
    console.error("Delete invoice error:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
