"use client";

import { Check, X, Asterisk, Trophy, Zap } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Comparison data — edit this array to change the comparison table  */
/* ------------------------------------------------------------------ */

export interface ComparisonRow {
  /** The feature name displayed in the left column. */
  feature: string;
  /** How InvoiceFlow Pro handles this feature. */
  invoiceflow: boolean | string;
  /** How doing things manually handles this feature. */
  manual: "✗" | "partial" | string;
  /** How FreshBooks handles this feature. null = no comparison. */
  freshbooks: boolean | "limited" | null | string;
  /** Optional note for FreshBooks (shown as asterisk tooltip). */
  freshbooksNote?: string;
  /** If true, InvoiceFlow is the clear winner for this row. */
  invoiceflowWinner?: boolean;
}

export const comparisonRows: ComparisonRow[] = [
  {
    feature: "Auto-invoicing",
    invoiceflow: true,
    manual: "✗",
    freshbooks: true,
    freshbooksNote: "Requires manual trigger or recurring profiles",
    invoiceflowWinner: true,
  },
  {
    feature: "Smart Reminders",
    invoiceflow: true,
    manual: "✗",
    freshbooks: true,
    freshbooksNote: "Limited to 3 reminders per invoice",
    invoiceflowWinner: true,
  },
  {
    feature: "Custom Branding",
    invoiceflow: true,
    manual: "partial",
    freshbooks: true,
    freshbooksNote: "Only on higher-tier plans",
    invoiceflowWinner: true,
  },
  {
    feature: "Dashboard",
    invoiceflow: true,
    manual: "✗",
    freshbooks: true,
    invoiceflowWinner: false,
  },
  {
    feature: "Client Portal",
    invoiceflow: true,
    manual: "✗",
    freshbooks: true,
    invoiceflowWinner: false,
  },
  {
    feature: "Email Support",
    invoiceflow: true,
    manual: "✗",
    freshbooks: true,
    invoiceflowWinner: false,
  },
  {
    feature: "Priority Support",
    invoiceflow: true,
    manual: "✗",
    freshbooks: "limited",
    freshbooksNote: "Available only on Premium plan ($60/mo)",
    invoiceflowWinner: true,
  },
  {
    feature: "Pricing",
    invoiceflow: "$19/mo",
    manual: "$4,500/yr",
    freshbooks: "$30/mo",
    freshbooksNote: "For comparable features; basic plans start at $19/mo",
    invoiceflowWinner: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Column definitions                                                  */
/* ------------------------------------------------------------------ */

export interface ComparisonColumn {
  key: string;
  label: string;
  sublabel?: string;
  isWinner?: boolean;
}

export const comparisonColumns: ComparisonColumn[] = [
  {
    key: "invoiceflow",
    label: "InvoiceFlow Pro",
    sublabel: "$19/mo",
    isWinner: true,
  },
  {
    key: "manual",
    label: "Manual",
    sublabel: "Free but costly",
  },
  {
    key: "freshbooks",
    label: "FreshBooks",
    sublabel: "From $19/mo",
  },
];

/* ------------------------------------------------------------------ */
/*  Cell renderer helpers                                              */
/* ------------------------------------------------------------------ */

function CheckCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <div className="flex items-center justify-center">
        <Check className="h-5 w-5 text-emerald-500" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {value}
    </span>
  );
}

function ManualCell({ value }: { value: "✗" | "partial" | string }) {
  if (value === "✗") {
    return (
      <div className="flex items-center justify-center">
        <X className="h-5 w-5 text-red-400 dark:text-red-500" strokeWidth={2} />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
        Partial
      </span>
    );
  }
  return (
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
      {value}
    </span>
  );
}

function FreshBooksCell({
  value,
  note,
}: {
  value: boolean | "limited" | null | string;
  note?: string;
}) {
  if (value === null) {
    return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>;
  }
  if (value === true) {
    return (
      <div className="flex items-center justify-center gap-1">
        <Check className="h-5 w-5 text-gray-400 dark:text-gray-500" strokeWidth={2} />
        {note && (
          <span title={note} className="cursor-help">
            <Asterisk className="h-3.5 w-3.5 text-amber-500" />
          </span>
        )}
      </div>
    );
  }
  if (value === "limited") {
    return (
      <div className="flex items-center justify-center gap-1">
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
          Limited
        </span>
        {note && (
          <span title={note} className="cursor-help">
            <Asterisk className="h-3.5 w-3.5 text-amber-500" />
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {value}
      </span>
      {note && (
        <span title={note} className="cursor-help">
          <Asterisk className="h-3.5 w-3.5 text-amber-500" />
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ComparisonTable — data-driven comparison grid                     */
/* ------------------------------------------------------------------ */

export interface ComparisonTableProps {
  /** Comparison data rows. Defaults to the exported comparisonRows. */
  rows?: ComparisonRow[];
  /** Column definitions. Defaults to the exported comparisonColumns. */
  columns?: ComparisonColumn[];
  /** Optional className override. */
  className?: string;
  /** Optional title override. */
  title?: string;
  /** Optional subtitle override. */
  subtitle?: string;
}

export function ComparisonTable({
  rows = comparisonRows,
  columns = comparisonColumns,
  className = "",
  title = "How InvoiceFlow stacks up",
  subtitle = "See why professionals choose InvoiceFlow over manual invoicing or FreshBooks",
}: ComparisonTableProps) {
  return (
    <div className={`mx-auto max-w-4xl ${className}`}>
      {/* ── Section heading ── */}
      <div className="text-center mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-primary-800 bg-primary-50/80 dark:bg-primary-900/30 px-4 py-1.5 text-sm font-semibold text-primary-700 dark:text-primary-300">
          <Trophy className="h-3.5 w-3.5" />
          Comparison
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      </div>

      {/* ── Glass panel wrapper ── */}
      <div className="glass-panel-strong overflow-hidden">
        {/* ── Responsive table ── */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[600px]">
            {/* ── Header ── */}
            <thead>
              <tr className="border-b border-gray-200/60 dark:border-white/5">
                {/* Feature column header */}
                <th className="py-4 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Feature
                </th>
                {/* Product columns */}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`
                      py-4 px-3 text-center text-xs font-semibold uppercase tracking-wider
                      ${
                        col.isWinner
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-gray-500 dark:text-gray-400"
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {col.isWinner && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <Trophy className="h-3 w-3 text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-500 tracking-normal">
                            WINNER
                          </span>
                        </div>
                      )}
                      <span className={col.isWinner ? "text-sm" : ""}>
                        {col.label}
                      </span>
                      {col.sublabel && (
                        <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 normal-case">
                          {col.sublabel}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {rows.map((row, rowIdx) => {
                const isEvenRow = rowIdx % 2 === 0;
                const isLastRow = rowIdx === rows.length - 1;

                return (
                  <tr
                    key={row.feature}
                    className={`
                      table-row-interactive
                      ${
                        isEvenRow
                          ? "bg-transparent"
                          : "bg-gray-50/40 dark:bg-white/[0.02]"
                      }
                      ${isLastRow ? "" : "border-b border-gray-200/40 dark:border-white/[0.03]"}
                    `}
                  >
                    {/* ── Feature label (first column) ── */}
                    <td
                      className={`
                        py-4 pl-6 pr-4 text-sm
                        ${
                          row.invoiceflowWinner
                            ? "font-semibold text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {row.invoiceflowWinner && (
                          <Zap className="h-3.5 w-3.5 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                        )}
                        <span>{row.feature}</span>
                      </div>
                    </td>

                    {/* ── InvoiceFlow Pro column ── */}
                    <td
                      className={`
                        py-4 px-3
                        ${row.invoiceflowWinner ? "bg-primary-50/30 dark:bg-primary-900/10" : ""}
                      `}
                    >
                      {/* Winner accent bar on left of cell */}
                      {row.invoiceflowWinner && (
                        <div className="relative">
                          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary-500 dark:bg-primary-400" />
                          <CheckCell value={row.invoiceflow} />
                        </div>
                      )}
                      {!row.invoiceflowWinner && (
                        <CheckCell value={row.invoiceflow} />
                      )}
                    </td>

                    {/* ── Manual column ── */}
                    <td className="py-4 px-3">
                      <ManualCell value={row.manual} />
                    </td>

                    {/* ── FreshBooks column ── */}
                    <td className="py-4 px-3">
                      <FreshBooksCell
                        value={row.freshbooks}
                        note={row.freshbooksNote}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer note ── */}
        <div className="border-t border-gray-200/60 dark:border-white/5 px-6 py-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Asterisk className="h-3 w-3 text-amber-500" />
          <span>
            Asterisks indicate limitations or caveats. See FreshBooks pricing
            page for full details.
          </span>
        </div>
      </div>
    </div>
  );
}

export default ComparisonTable;
