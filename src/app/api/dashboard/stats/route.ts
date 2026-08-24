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

    // Run all stats queries in parallel. The status breakdown comes from
    // ONE groupBy instead of five separate count() calls, cutting invoice
    // round trips here from 7 to 4 while returning identical numbers.
    const [
      totalInvoices,
      totalClients,
      totalRevenue,
      statusGroups,
      revenueThisMonth,
      revenueLastMonth,
      recentInvoices,
    ] = await Promise.all([
      // Total invoices — deliberately independent: CANCELLED invoices are
      // not part of byStatus, so total ≠ sum of the four statuses.
      prisma.invoice.count({ where: { userId } }),

      // Total clients count
      prisma.client.count({ where: { userId } }),

      // Total revenue (paid invoices)
      prisma.invoice.aggregate({
        where: { userId, status: "PAID" },
        _sum: { total: true },
      }),

      // Every status count in one grouped query
      prisma.invoice.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
      }),

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

      // Recent invoices (last 5) — narrowed select instead of full-row
      // fetch; covers everything a "recent activity" list renders/links.
      prisma.invoice.findMany({
        where: { userId },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          dueDate: true,
          currency: true,
          updatedAt: true,
          client: {
            select: { id: true, name: true, email: true, company: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    // Derive the per-status counts from the single grouped query.
    const countByStatus = new Map(
      statusGroups.map((group) => [group.status, group._count._all])
    );
    const draftInvoices = countByStatus.get("DRAFT") ?? 0;
    const sentInvoices = countByStatus.get("SENT") ?? 0;
    const paidInvoices = countByStatus.get("PAID") ?? 0;
    const overdueInvoices = countByStatus.get("OVERDUE") ?? 0;

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
