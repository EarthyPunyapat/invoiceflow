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
  { params }: { params: { id: string } }
) {
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
  { params }: { params: { id: string } }
) {
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

    const updateData: any = { status };
    if (status === "SENT" && !invoice.sentAt) {
      updateData.sentAt = new Date();
    }
    if (status === "PAID" && !invoice.paidAt) {
      updateData.paidAt = new Date();
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        items: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ invoice: updated });
  } catch (error: any) {
    console.error("Update invoice error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// PUT — full edit of a DRAFT invoice: line items, client, dates, tax.
// Totals are recomputed through the SAME integer-cents pipeline as
// POST /api/invoices so stored amounts stay float-safe and consistent.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = invoiceUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { clientId, dueDate, notes, tax, currency, items } = parsed.data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only drafts are editable — mirrors the DELETE guard. Sent/paid
    // invoices are financial records; changes go through new versions.
    if (invoice.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft invoices can be edited" },
        { status: 400 }
      );
    }

    if (clientId && clientId !== invoice.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, userId: session.user.id },
      });
      if (!client) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }
    }

    // Integer-cents pipeline (identical to POST): round each line once,
    // sum exactly in cents, apply tax HALF-UP, convert back at the edge.
    const lineCents = items.map((item: any) =>
      dollarsToCents(item.quantity * item.unitPrice)
    );
    const subtotalCents = sumCents(...lineCents);
    const { totalCents } = applyTaxPercent(subtotalCents, Number(tax) || 0);

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...(clientId ? { clientId } : {}),
        dueDate: dueDate ? new Date(dueDate) : invoice.dueDate,
        currency,
        tax: Number(tax) || 0,
        subtotal: centsToDollars(subtotalCents),
        total: centsToDollars(totalCents),
        notes: notes !== undefined ? notes : invoice.notes,
        items: {
          deleteMany: {},
          create: items.map((item: any, i: number) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: centsToDollars(lineCents[i]),
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true, company: true, email: true } },
        items: true,
      },
    });

    return NextResponse.json({ invoice: updated });
  } catch (error: any) {
    console.error("Replace invoice error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update invoice" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Only allow deleting DRAFT invoices
  if (invoice.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft invoices can be deleted" },
      { status: 400 }
    );
  }

  await prisma.invoice.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
