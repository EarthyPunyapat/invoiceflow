import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EstimateStatus, Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  Plus,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseListParams } from "@/lib/invoice-filters";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "DECLINED", label: "Declined" },
  { value: "CONVERTED", label: "Converted" },
];

/** Estimate-specific badge colors (shared statusVariant is invoice-oriented). */
function estimateStatusVariant(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "success" as const;
    case "SENT":
      return "info" as const;
    case "DECLINED":
      return "danger" as const;
    case "DRAFT":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

interface EstimatesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function EstimatesPage({ searchParams }: EstimatesPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const status = (searchParams.status as string) || "";
  // searchParams values may be string | string[] | undefined in Next 14;
  // arrays are dropped so downstream .trim()/params.set() see plain strings.
  const search =
    typeof searchParams.search === "string" ? searchParams.search : "";

  // Same pagination semantics as the invoices list (20/page here).
  const { page, pageSize } = parseListParams(
    (searchParams.page as string) || null,
    "20"
  );
  const skip = (page - 1) * pageSize;

  const where: Prisma.EstimateWhereInput = { userId: session.user.id };
  if (
    status &&
    status !== "ALL" &&
    STATUS_FILTERS.some((f) => f.value === status)
  ) {
    where.status = status as EstimateStatus;
  }
  if (search.trim()) {
    where.OR = [
      { estimateNumber: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
      { client: { company: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [estimates, total] = await Promise.all([
    prisma.estimate.findMany({
      where,
      include: { client: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.estimate.count({ where }),
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
    return `/estimates?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Estimates
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} estimate{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/estimates/new">
          <Button>
            <Plus className="w-4 h-4 mr-1.5" />
            New Estimate
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildUrl({ status: f.value, page: "1" })}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                status === f.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form action="/estimates" method="GET" className="flex gap-2 flex-1">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              name="search"
              placeholder="Search estimates..."
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
                  Estimate
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
                  Issued
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <FileText className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      No estimates found
                    </p>
                  </td>
                </tr>
              ) : (
                estimates.map((est) => (
                  <tr key={est.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/estimates/${est.id}`} className="block">
                        <p className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                          {est.estimateNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                          {formatDate(est.createdAt)}
                        </p>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {est.client.name}
                      </p>
                      {est.client.company && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {est.client.company}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={estimateStatusVariant(est.status)}>
                        {est.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(est.total, est.currency)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatDate(est.issueDate ?? est.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                      {est.expiryDate ? formatDate(est.expiryDate) : "—"}
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
