import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientsToCsv } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        email: true,
        company: true,
        phone: true,
        createdAt: true,
      },
    });

    const csv = clientsToCsv(clients);

    const today = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clients-${today}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/clients failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
