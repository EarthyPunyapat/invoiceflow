import { NextRequest, NextResponse } from "next/server";
import { requireActivePlan } from "@/lib/plan-guard";
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
import { requireUser } from "@/lib/require-user";

// ─── GET /api/estimates — list with filters + pagination ────────────
export async function GET(req: NextRequest) {
    const userId = await requireUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: any = { userId: userId };
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
    const userId = await requireUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const planRequired = await requireActivePlan(userId);
  if (planRequired) return planRequired;
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
      where: { id: clientId, userId: userId },
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

    const estimate = await prisma.$transaction(async tx => {
      const prefix = monthPrefix(new Date(issueDate)).replace("INV", "EST");
      // Estimate numbers are globally unique in the existing schema.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`estimate-number:${prefix}`}))`;
      const records = await tx.estimate.findMany({ where: { estimateNumber: { startsWith: `${prefix}-` } }, select: { estimateNumber: true } });
      const last = records.reduce<string | null>((best, row) => nextSequence(row.estimateNumber) > nextSequence(best) ? row.estimateNumber : best, null);
      const estimateNumber = `${prefix}-${String(nextSequence(last)).padStart(4, "0")}`;
    const created = await tx.estimate.create({
      data: {
        userId,
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

      return created;
    });

    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error: any) {
    if (error instanceof RangeError) return NextResponse.json({ error: "Invoice amounts exceed supported limits" }, { status: 400 });
    console.error("Create estimate error:", error);
    return NextResponse.json(
      { error: "Failed to create estimate" },
      { status: 500 }
    );
  }
}
