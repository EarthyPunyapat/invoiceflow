import { formatCurrency } from "@/lib/utils";
import type { AgingBuckets } from "@/lib/aging";

/**
 * Presentational aging report: outstanding invoice totals grouped by
 * how far past due they are. Pure props — data fetched by the caller.
 */
export function AgingReport({ buckets }: { buckets: AgingBuckets }) {
  const cells = [
    {
      label: "Current",
      hint: "Due in 30 days or not yet due",
      value: buckets.current,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "1–30 days overdue",
      hint: "Nudge soon",
      value: buckets.d30,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-900/20",
    },
    {
      label: "31–60 days overdue",
      hint: "Send a firm reminder",
      value: buckets.d60,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "90+ days overdue",
      hint: "Escalate or write off",
      value: buckets.d90plus,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  const totalOutstanding = buckets.current + buckets.d30 + buckets.d60 + buckets.d90plus;

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-6 py-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Outstanding Invoices
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {formatCurrency(totalOutstanding)} outstanding by age
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800 lg:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} className="bg-white p-5 dark:bg-gray-900">
            <p className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cell.bg} ${cell.color}`}>
              {cell.label}
            </p>
            <p className="mt-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
              {formatCurrency(cell.value)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{cell.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
