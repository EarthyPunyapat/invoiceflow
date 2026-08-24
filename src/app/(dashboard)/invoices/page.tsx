import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, statusVariant } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildInvoiceWhere, parseListParams } from "@/lib/invoice-filters";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

interface InvoicesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const status = (searchParams.status as string) || "";
  const search =
    (searchParams.q as string) || (searchParams.search as string) || "";

  // Shared pure helpers — identical filter/pagination semantics to
  // GET /api/invoices so the page and the API can never drift apart.
  const { page, pageSize } = parseListParams(
    (searchParams.page as string) || null,
    "20"
  );
  const skip = (page - 1) * pageSize;

  const where = buildInvoiceWhere(session.user.id, {
    q: search || null,
    status: status || null,
  });

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  function buildUrl(newParams: Record<string, string>) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (newParams.page) params.set("page", newParams.page);
    if (newParams.status !== undefined) {
      if (newParams.status) params.set("status", newParams.status);
      else params.delete("status");
    }
    return `/invoices?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invoices
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} invoice{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/api/export/invoices">
            <Button variant="outline">
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </a>
          <Link href="/invoices/new">
            <Button>
              <Plus className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildUrl({ status: f.value, page: "1" })}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                (status || "") === f.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form action="/invoices" method="GET" className="flex gap-2 flex-1">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              name="search"
              placeholder="Search invoices..."
              defaultValue={search}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Date
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Due Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      No invoices found
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/invoices/${inv.id}`} className="block">
                        <p className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                          {formatDate(inv.createdAt)}
                        </p>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {inv.client.name}
                      </p>
                      {inv.client.company && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {inv.client.company}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant(inv.status)}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(inv.total, inv.currency)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {formatDate(inv.dueDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={buildUrl({ page: String(page - 1) })}>
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
              {page < totalPages ? (
                <Link href={buildUrl({ page: String(page + 1) })}>
                  <Button variant="outline" size="sm">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
