import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientsToCsv } from "@/lib/csv";
import { requireUser } from "@/lib/require-user";

export async function GET(req: NextRequest) {
    const userId = await requireUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const clients = await prisma.client.findMany({
      where: { userId: userId },
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
