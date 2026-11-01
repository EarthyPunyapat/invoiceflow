import { normalizeReportCurrency } from "@/lib/report-currency";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clientCreateSchema,
  clientUpdateSchema,
} from "@/lib/validators/clients";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // Invoice/estimate pickers do not need invoice history or reporting totals.
  // Keep this path small and independent of unrelated financial queries.
  if (searchParams.get("view") === "options") {
    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true, email: true, company: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ clients });
  }

  const search = searchParams.get("search");
  const requestedCurrency = searchParams.get("currency");
  const currency = requestedCurrency === null ? "USD" : normalizeReportCurrency(requestedCurrency);
  if (!currency) return NextResponse.json({ error: "Invalid currency" }, { status: 400 });

  const where: any = { userId: session.user.id };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      invoices: {
        select: {
          id: true,
          status: true,
          total: true,
          currency: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const clientsWithStats = clients.map((client) => ({
    ...client,
    invoiceCount: client.invoices.length,
    statsCurrency: currency,
    totalBilled: client.invoices.filter(invoice => invoice.currency === currency).reduce(
      (sum, inv) => sum + (inv.status !== "CANCELLED" ? inv.total : 0),
      0
    ),
    outstanding: client.invoices.filter(invoice => invoice.currency === currency).reduce(
      (sum, inv) =>
        sum + (inv.status === "SENT" || inv.status === "OVERDUE" ? inv.total : 0),
      0
    ),
  }));

  return NextResponse.json({ clients: clientsWithStats, currency });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = clientCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }
    const { name, email, company, phone } = parsed.data;

    const client = await prisma.client.create({
      data: {
        name,
        email,
        company: company || null,
        phone: phone || null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    console.error("Create client error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A client with this email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
