import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invoicesToCsv } from "@/lib/csv";
import { requireUser } from "@/lib/require-user";

export async function GET(req: NextRequest) {
    const userId = await requireUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        invoiceNumber: true,
        status: true,
        total: true,
        currency: true,
        dueDate: true,
        paidAt: true,
        client: { select: { name: true } },
      },
    });

    const csv = invoicesToCsv(
      invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        total: inv.total,
        currency: inv.currency,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        clientName: inv.client.name,
      }))
    );

    const today = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoices-${today}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export/invoices failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
