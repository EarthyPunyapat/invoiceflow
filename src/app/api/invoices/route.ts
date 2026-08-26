import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  monthPrefix,
  sanitizeInvoicePrefix,
  nextInvoiceNumber,
} from "@/lib/invoice-number";
import {
  applyTaxPercent,
  centsToDollars,
  dollarsToCents,
  sumCents,
} from "@/lib/money";
import { buildInvoiceWhere, parseListParams } from "@/lib/invoice-filters";
import { invoiceCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // pageSize (with legacy `limit` alias), default 10, clamped to 50.
  const { page, pageSize } = parseListParams(
    searchParams.get("page"),
    searchParams.get("pageSize") || searchParams.get("limit")
  );
  // Shared pure filter builder: owner-scoped, validated status, q/search
  // free-text across invoice number + client name/company.
  const where = buildInvoiceWhere(session.user.id, {
    q: searchParams.get("q"),
    search: searchParams.get("search"), // legacy alias
    status: searchParams.get("status"),
  });

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    invoices,
    total,
    page,
    pageSize,
    pagination: {
      page,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = invoiceCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { clientId, items, dueDate, status, currency, tax, notes } =
      parsed.data;

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: session.user.id },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Calculate totals via integer-cents money helpers (float-safe).
    // Line totals are rounded once per line, then summed exactly in cents.
    const lineCents = items.map((item: any) =>
      dollarsToCents(item.quantity * item.unitPrice)
    );
    const subtotalCents = sumCents(...lineCents);
    const { taxCents, totalCents } = applyTaxPercent(
      subtotalCents,
      Number(tax) || 0
    );
    const subtotal = centsToDollars(subtotalCents);
    const total = centsToDollars(totalCents);

    // Generate invoice number — honors settings.invoicePrefix ("PFX-0001"),
    // falling back to the default INV-YYYYMM-XXXX scheme. The sequence
    // lookup is scoped to this user AND to the same scheme pattern, so a
    // custom prefix never continues the default count and per-user
    // sequences stay independent (see invoice-number.ts for the
    // race-condition caveat).
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { invoicePrefix: true },
    });
    const scheme = sanitizeInvoicePrefix(user?.invoicePrefix);
    const schemePattern = scheme ? `${scheme}-` : monthPrefix(new Date());
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        userId: session.user.id,
        invoiceNumber: { startsWith: schemePattern },
      },
      orderBy: { invoiceNumber: "desc" },
    });
    const invoiceNumber = nextInvoiceNumber({
      prefix: scheme,
      date: new Date(),
      lastNumber: lastInvoice?.invoiceNumber ?? null,
    });

    const invoice = await prisma.invoice.create({
      data: {
        userId: session.user.id,
        clientId,
        invoiceNumber,
        status,
        subtotal,
        tax,
        total,
        currency,
        dueDate: new Date(dueDate),
        notes: notes || null,
        sentAt: status === "SENT" ? new Date() : null,
          items: {
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

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}
