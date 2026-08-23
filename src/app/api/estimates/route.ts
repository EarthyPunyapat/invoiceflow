import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextSequence, monthPrefix } from "@/lib/invoice-number";
import {
  applyTaxPercent,
  centsToDollars,
  dollarsToCents,
  sumCents,
} from "@/lib/money";
import { estimateCreateSchema } from "@/lib/validators";

// ─── GET /api/estimates — list with filters + pagination ────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = { userId: session.user.id };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { estimateNumber: { contains: search, mode: "insensitive" as const } },
      { client: { name: { contains: search, mode: "insensitive" as const } } },
    ];
  }

  const [estimates, total] = await Promise.all([
    prisma.estimate.findMany({
      where,
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.estimate.count({ where }),
  ]);

  return NextResponse.json({
    estimates,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ─── POST /api/estimates — create ───────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = estimateCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const {
      clientId,
      items,
      issueDate,
      expiryDate,
      status,
      currency,
      tax,
      notes,
    } = parsed.data;

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: session.user.id },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Totals via integer-cents money helpers (float-safe), same math
    // as invoice creation: round once per line, sum exactly in cents.
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

    // Estimate numbering (EST-YYYYMM-XXXX) — same sequence helper as invoices.
    const prefix = monthPrefix(new Date(issueDate)).replace("INV", "EST");
    const lastEstimate = await prisma.estimate.findFirst({
      where: { estimateNumber: { startsWith: prefix } },
      orderBy: { estimateNumber: "desc" },
    });
    const estimateNumber = `${prefix}-${String(
      nextSequence(lastEstimate?.estimateNumber ?? null)
    ).padStart(4, "0")}`;

    const estimate = await prisma.estimate.create({
      data: {
        userId: session.user.id,
        clientId,
        estimateNumber,
        status,
        subtotal,
        tax,
        total,
        currency,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        notes: notes || null,
        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: dollarsToCents(item.quantity * item.unitPrice) / 100,
          })),
        },
      },
      include: {
        items: true,
        client: true,
      },
    });

    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error: any) {
    console.error("Create estimate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create estimate" },
      { status: 500 }
    );
  }
}
