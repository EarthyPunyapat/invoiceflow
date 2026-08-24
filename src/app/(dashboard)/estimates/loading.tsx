// ─── Estimates Route Loading Skeleton ───────────────────────────────
// Mirrors the real page: header with "New Estimate" button, status pill
// row + search bar, then the 6-column estimate table (Estimate / Client /
// Status / Amount / Issued / Expires).

import { Skeleton } from "@/components/ui/skeleton";

export default function EstimatesLoading() {
  return (
    <div className="space-y-6" aria-busy="true" role="status">
      <span className="sr-only">Loading estimates…</span>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      {/* Filters — 6 status pills (scrollable like the real row) + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-7 w-16 rounded-full flex-shrink-0"
            />
          ))}
        </div>
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header row — mirrors column visibility (Issued sm+, Expires md+) */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 px-5 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="hidden sm:block h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="hidden sm:block h-3 w-12" />
          <Skeleton className="hidden md:block h-3 w-14" />
        </div>
        {/* Body rows */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center px-5 py-4 gap-6">
              {/* Estimate number (+ date line on mobile) */}
              <div className="space-y-1.5 w-40 flex-shrink-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20 sm:hidden" />
              </div>
              {/* Client name + company (desktop) */}
              <div className="hidden sm:block space-y-1.5 w-36">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              {/* Status badge */}
              <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
              {/* Amount (right-aligned like the real table) */}
              <Skeleton className="ml-auto h-4 w-20 flex-shrink-0" />
              {/* Issued / Expires on larger screens */}
              <Skeleton className="hidden sm:block h-4 w-20 flex-shrink-0" />
              <Skeleton className="hidden md:block h-4 w-20 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
