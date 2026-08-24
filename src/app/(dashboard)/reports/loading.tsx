// ─── Reports Route Loading Skeleton ─────────────────────────────────
// Mirrors the real page: KPI glass-panel cards, the "Revenue by month"
// chart panel, and the top-clients table panel.

import { Skeleton } from "@/components/ui/skeleton";

// Deterministic placeholder bar heights (%) for the chart area — no
// Math.random so server/client renders always agree.
const CHART_BARS = [35, 55, 45, 70, 60, 85];

export default function ReportsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" role="status">
      <span className="sr-only">Loading reports…</span>

      {/* Page header (no action button on this page) */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {/* KPI cards — 4 glass panels with icon tile + label/value */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel relative overflow-hidden p-5">
            <div className="relative flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-xl flex-shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue by month panel */}
      <div className="glass-panel p-6">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-2 h-3 w-56" />
        {/* Bar-chart area — bottom-aligned bars over a baseline */}
        <div className="mt-6 flex h-40 items-end gap-3 border-b border-gray-100 dark:border-gray-800 pb-px">
          {CHART_BARS.map((height, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      {/* Top clients panel */}
      <div className="glass-panel overflow-hidden">
        <div className="space-y-2 px-6 py-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-52" />
        </div>
        <div className="px-6 pb-6">
          {/* Header row — Client / Invoices / Revenue */}
          <div className="grid grid-cols-3 border-b border-gray-100 dark:border-gray-800 pb-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16 justify-self-end" />
            <Skeleton className="h-3 w-16 justify-self-end" />
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-3 items-center py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-8 justify-self-end" />
                <Skeleton className="h-4 w-16 justify-self-end" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
