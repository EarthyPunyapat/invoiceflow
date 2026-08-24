// ─── Invoices Route Loading Skeleton ────────────────────────────────
// Mirrors the real page: header with action button, status pill row +
// search bar, then the 6-column invoice table.

import { Skeleton } from "@/components/ui/skeleton";

export default function InvoicesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" role="status">
      <span className="sr-only">Loading invoices…</span>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Filters — status pills + search input */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 px-5 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-3 ${i % 2 === 0 ? "w-14" : "w-10"} ${i === 3 ? "ml-auto hidden md:block" : ""} ${i === 5 ? "hidden lg:block" : ""}`}
            />
          ))}
        </div>
        {/* Body rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center px-5 py-4 gap-6">
              {/* Invoice number + client */}
              <div className="space-y-1.5 w-40 flex-shrink-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28 sm:hidden" />
              </div>
              <div className="hidden sm:block space-y-1.5 w-36">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              {/* Status badge */}
              <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
              {/* Amount (right-aligned like the real table) */}
              <Skeleton className="ml-auto h-4 w-20 flex-shrink-0" />
              {/* Date columns on larger screens */}
              <Skeleton className="hidden sm:block h-4 w-20 flex-shrink-0" />
              <Skeleton className="hidden md:block h-4 w-20 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
