import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/stats — aggregate dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Run all stats queries in parallel
    const [
      totalInvoices,
      totalClients,
      totalRevenue,
      paidInvoices,
      overdueInvoices,
      draftInvoices,
      sentInvoices,
      revenueThisMonth,
      revenueLastMonth,
      recentInvoices,
    ] = await Promise.all([
      // Total invoices count
      prisma.invoice.count({ where: { userId } }),

      // Total clients count
      prisma.client.count({ where: { userId } }),

      // Total revenue (paid invoices)
      prisma.invoice.aggregate({
        where: { userId, status: "PAID" },
        _sum: { total: true },
      }),

      // Count by status: PAID
      prisma.invoice.count({ where: { userId, status: "PAID" } }),

      // Count by status: OVERDUE
      prisma.invoice.count({ where: { userId, status: "OVERDUE" } }),

      // Count by status: DRAFT
      prisma.invoice.count({ where: { userId, status: "DRAFT" } }),

      // Count by status: SENT
      prisma.invoice.count({ where: { userId, status: "SENT" } }),

      // Revenue this month
      prisma.invoice.aggregate({
        where: {
          userId,
          status: "PAID",
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { total: true },
      }),

      // Revenue last month
      prisma.invoice.aggregate({
        where: {
          userId,
          status: "PAID",
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { total: true },
      }),

      // Recent invoices (last 5)
      prisma.invoice.findMany({
        where: { userId },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    const thisMonth = revenueThisMonth._sum.total || 0;
    const lastMonth = revenueLastMonth._sum.total || 0;
    const revenueGrowth =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;

    return NextResponse.json({
      data: {
        counts: {
          totalInvoices,
          totalClients,
          byStatus: {
            draft: draftInvoices,
            sent: sentInvoices,
            paid: paidInvoices,
            overdue: overdueInvoices,
          },
        },
        revenue: {
          total: totalRevenue._sum.total || 0,
          thisMonth,
          lastMonth,
          growth: Math.round(revenueGrowth * 100) / 100,
        },
        recentInvoices,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_STATS]", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
