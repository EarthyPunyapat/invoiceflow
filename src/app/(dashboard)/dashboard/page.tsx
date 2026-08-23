import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { bucketOutstanding } from "@/lib/aging";
import { AgingReport } from "@/components/aging-report";
import Link from "next/link";
import {
  FileText,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  Plus,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [invoiceStats, clientCount, recentInvoices, outstandingInvoices] = await Promise.all([
    prisma.invoice.groupBy({
      by: ["status"],
      where: { userId: session.user.id },
      _sum: { total: true },
      _count: true,
    }),
    prisma.client.count({ where: { userId: session.user.id } }),
    prisma.invoice.findMany({
      where: { userId: session.user.id },
      include: { client: { select: { name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        userId: session.user.id,
        status: { in: ["SENT", "OVERDUE"] },
      },
      select: { total: true, dueDate: true, status: true },
    }),
  ]);

  const totalInvoiced = invoiceStats.reduce(
    (sum, s) => sum + (s._sum.total || 0),
    0
  );
  const paidAmount =
    invoiceStats.find((s) => s.status === "PAID")?._sum.total || 0;
  const overdueAmount =
    invoiceStats.find((s) => s.status === "OVERDUE")?._sum.total || 0;
  const pendingAmount =
    invoiceStats
      .filter((s) => s.status === "SENT" || s.status === "DRAFT")
      .reduce((sum, s) => sum + (s._sum.total || 0), 0);

  const stats = [
    {
      label: "Total Invoiced",
      value: formatCurrency(totalInvoiced),
      icon: DollarSign,
      color: "text-primary-600 dark:text-primary-400",
      bg: "bg-primary-50 dark:bg-primary-900/20",
      ring: "ring-primary-500/10",
    },
    {
      label: "Paid",
      value: formatCurrency(paidAmount),
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      ring: "ring-emerald-500/10",
    },
    {
      label: "Pending",
      value: formatCurrency(pendingAmount),
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      ring: "ring-amber-500/10",
    },
    {
      label: "Clients",
      value: clientCount.toString(),
      icon: Users,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      ring: "ring-sky-500/10",
    },
  ];

  const statusStyles: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    SENT: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    OVERDUE: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="space-y-8">
      {/* ─── Animation & hover styles ─── */}
      <style>{`
        :root {
          --ease-out-custom: cubic-bezier(0.23, 1, 0.32, 1);
          --duration-fast: 150ms;
          --duration-ui: 200ms;
        }

        /* Stats card elevate on hover — gated to pointer:fine */
        @media (hover: hover) and (pointer: fine) {
          .stat-card {
            transition: transform var(--duration-ui) var(--ease-out-custom),
                        box-shadow var(--duration-ui) var(--ease-out-custom);
          }
          .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04);
          }

          .table-row {
            transition: background-color var(--duration-fast) var(--ease-out-custom);
          }
          .table-row:hover {
            background-color: var(--color-bg-alt, #f9fafb);
          }

          .dark .table-row:hover {
            background-color: rgba(31,41,55,0.5);
          }

          .new-invoice-btn {
            transition: background-color var(--duration-fast) var(--ease-out-custom),
                        box-shadow var(--duration-fast) var(--ease-out-custom),
                        transform var(--duration-fast) var(--ease-out-custom);
          }

          .new-invoice-btn:hover {
            box-shadow: 0 4px 12px rgba(79,70,229,0.25);
            transform: translateY(-1px);
          }
        }

        /* Reduced motion: remove all movement */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .stat-card:hover {
            transform: none !important;
          }
        }
      `}</style>

      {/* ─── Page Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {session.user.name || "User"}
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="new-invoice-btn inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* ─── Stats Grid — Glass panel cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`stat-card glass-panel relative overflow-hidden p-5 ${stat.ring}`}
          >
            {/* Subtle background glow */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20 ${stat.bg}`} />
            <div className="relative flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Aging Report — Outstanding by age bucket ─── */}
      <AgingReport buckets={bucketOutstanding(outstandingInvoices, new Date())} />

      {/* ─── Recent Invoices — Glass panel table ─── */}
      <div className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Invoices
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Your latest {recentInvoices.length} invoice{recentInvoices.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 link-underline"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="px-6 pb-5">
          {recentInvoices.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                <FileText className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">
                No invoices yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create your first invoice to get started.
              </p>
              <Link
                href="/invoices/new"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first invoice
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Table header */}
              <div className="flex items-center gap-4 px-2 pb-3">
                <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Invoice
                </span>
                <span className="w-28 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Amount
                </span>
                <span className="w-24 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Status
                </span>
              </div>

              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className="table-row flex items-center gap-4 py-3.5 -mx-2 px-2 rounded-lg focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                      <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {inv.client.name}
                        {inv.client.company && ` · ${inv.client.company}`}
                      </p>
                    </div>
                  </div>
                  <div className="w-28 text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                      {formatCurrency(inv.total)}
                    </p>
                  </div>
                  <div className="w-24 text-right flex-shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        statusStyles[inv.status] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {inv.status === "OVERDUE" && (
                        <AlertCircle className="mr-1 h-3 w-3" />
                      )}
                      {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
