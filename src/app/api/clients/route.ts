import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

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
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const clientsWithStats = clients.map((client) => ({
    ...client,
    invoiceCount: client.invoices.length,
    totalBilled: client.invoices.reduce(
      (sum, inv) => sum + (inv.status !== "CANCELLED" ? inv.total : 0),
      0
    ),
    outstanding: client.invoices.reduce(
      (sum, inv) =>
        sum + (inv.status === "SENT" || inv.status === "OVERDUE" ? inv.total : 0),
      0
    ),
  }));

  return NextResponse.json({ clients: clientsWithStats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, company, phone } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

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
      { error: error.message || "Failed to create client" },
      { status: 500 }
    );
  }
}
