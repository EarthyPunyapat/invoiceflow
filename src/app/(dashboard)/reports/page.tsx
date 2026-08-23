import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { avgDaysToPay, revenueByMonth, topClients } from "@/lib/reports";
import { BarChart } from "@/components/reports/bar-chart";
import {
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  Plus,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    select: {
      total: true,
      status: true,
      createdAt: true,
      sentAt: true,
      paidAt: true,
      client: { select: { name: true } },
    },
  });

  const paid = invoices.filter((inv) => inv.status === "PAID");

  // ─── KPI figures ──────────────────────────────────────────────
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const mtdPaid = paid.reduce(
    (sum, inv) => sum + (inv.paidAt && inv.paidAt >= monthStart ? inv.total : 0),
    0
  );
  const outstanding = invoices
    .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.total, 0);
  const avgDays = avgDaysToPay(invoices);

  const kpis = [
    {
      label: "Paid this month",
      value: formatCurrency(mtdPaid),
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstanding),
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Avg days to pay",
      value: avgDays === null ? "—" : `${avgDays} days`,
      icon: TrendingUp,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      label: "Paying clients",
      value: new Set(paid.map((inv) => inv.client.name)).size.toString(),
      icon: Users,
      color: "text-primary-600 dark:text-primary-400",
      bg: "bg-primary-50 dark:bg-primary-900/20",
    },
  ];

  // ─── Chart & table data via pure helpers ──────────────────────
  const revenue = revenueByMonth(
    invoices.map((inv) => ({
      total: inv.total,
      status: inv.status,
      date: inv.createdAt,
    })),
    6
  );

  const clients = topClients(
    paid.map((inv) => ({
      clientName: inv.client.name,
      total: inv.total,
      status: inv.status,
    })),
    5
  );

  const revenuePoints = revenue.map((r) => ({ label: r.label, value: r.revenue }));

  const hasAnyInvoices = invoices.length > 0;

  return (
    <div className="space-y-8">
      {/* ─── Page Header ─── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Revenue trends and client performance at a glance
        </p>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-panel relative overflow-hidden p-5">
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20 ${kpi.bg}`} />
            <div className="relative flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {kpi.label}
                </p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {kpi.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Revenue by Month ─── */}
      <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Revenue by month
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Paid invoices over the last 6 months
        </p>
        <div className="mt-6">
          <BarChart data={revenuePoints} />
        </div>
      </div>

      {/* ─── Top Clients ─── */}
      <div className="glass-panel overflow-hidden">
        <div className="px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top clients
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Your best customers by paid revenue
          </p>
        </div>
        <div className="px-6 pb-6">
          {clients.length === 0 ? (
            hasAnyInvoices ? (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No paid invoices yet — revenue per client appears here after you
                mark invoices as paid.
              </p>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Nothing to report yet
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create and send your first invoice to unlock analytics.
                </p>
                <Link
                  href="/invoices/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New invoice
                </Link>
              </div>
            )
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Client
                  </th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Invoices
                  </th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {clients.map((client) => (
                  <tr key={client.clientName}>
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {client.clientName}
                    </td>
                    <td className="py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                      {client.count}
                    </td>
                    <td className="py-3 text-right font-semibold tabular-nums text-gray-900 dark:text-white">
                      {formatCurrency(client.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
