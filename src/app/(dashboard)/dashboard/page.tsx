import { ReportCurrencyFilter } from "@/components/report-currency-filter";
import {
  reportCurrencyOptions,
  selectReportCurrency,
} from "@/lib/report-currency";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { bucketOutstanding } from "@/lib/aging";
import { AgingReport } from "@/components/aging-report";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const params = await searchParams;
  const available = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    distinct: ["currency"],
    select: { currency: true },
  });
  const currencies = reportCurrencyOptions(
    available.map((invoice) => invoice.currency),
  );
  const currency = selectReportCurrency(params.currency, currencies);

  const [invoiceStats, clientCount, recentInvoices, outstandingInvoices] =
    await Promise.all([
      prisma.invoice.groupBy({
        by: ["status"],
        where: { userId: session.user.id, currency },
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
          currency,
          status: { in: ["SENT", "OVERDUE"] },
        },
        select: { total: true, dueDate: true, status: true },
      }),
    ]);

  const paidAmount =
    invoiceStats.find((s) => s.status === "PAID")?._sum.total || 0;
  const awaitingAmount = outstandingInvoices.reduce(
    (sum, invoice) => sum + invoice.total,
    0,
  );
  const draftAmount =
    invoiceStats.find((stat) => stat.status === "DRAFT")?._sum.total || 0;
  const overdueCount = outstandingInvoices.filter(
    (invoice) => invoice.dueDate < new Date(),
  ).length;
  const stats = [
    {
      label: "Awaiting payment",
      value: formatCurrency(awaitingAmount, currency),
    },
    { label: "Paid", value: formatCurrency(paidAmount, currency) },
    { label: "In drafts", value: formatCurrency(draftAmount, currency) },
    { label: "Clients", value: clientCount.toString() },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold">Overview</h1>
          <p className="mt-2 text-sm text-gray-600">
            {overdueCount
              ? `${overdueCount} invoice${overdueCount === 1 ? " needs" : "s need"} a follow-up.`
              : "A clear view of your invoices and what comes next."}
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="app-button h-10 bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
        >
          <Plus size={16} />
          New invoice
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-600">Your business, in {currency}</p>
        <ReportCurrencyFilter currency={currency} currencies={currencies} />
      </div>
      <div className="summary-strip">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>
      <section className="pt-2">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Recent invoices</h2>
            <p className="mt-1 text-sm text-gray-500">
              The latest work on your books.
            </p>
          </div>
          <Link
            href="/invoices"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            View all invoices
          </Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="page-empty rounded-xl bg-gray-50">
            <h3>Your first invoice starts here.</h3>
            <p>
              Add a client and the work you did. We’ll keep the details
              together.
            </p>
            <Link
              href="/invoices/new"
              className="app-button mt-5 h-10 bg-primary-600 px-4 text-sm text-white"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="px-5 py-3">Invoice</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="min-w-[150px] px-5 py-4">
                      {invoice.client.name}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(invoice.status)}>
                        {invoice.status.charAt(0) +
                          invoice.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <AgingReport
        buckets={bucketOutstanding(outstandingInvoices, new Date())}
        currency={currency}
      />
    </div>
  );
}
