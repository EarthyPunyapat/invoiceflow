import { formatCurrency } from "@/lib/utils";

export interface BarChartPoint {
  label: string;
  value: number;
}

/**
 * Dependency-free server-rendered SVG bar chart.
 * Y-axis auto-scales; values are exposed via <title> tooltips and
 * month labels render under each bar. Renders a friendly empty state
 * when every value is zero.
 */
export function BarChart({
  data,
  height = 160,
}: {
  data: BarChartPoint[];
  height?: number;
}) {
  const W = 600;
  const H = height;
  const padBottom = 24; // room for x labels
  const plotH = H - padBottom;

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center"
        style={{ height }}
      >
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          No paid invoices yet
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Revenue will appear here once invoices are marked as paid.
        </p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = W / data.length;
  const barWidth = Math.min(slot * 0.6, 64);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Revenue by month bar chart"
    >
      {data.map((point, i) => {
        // Scale against the plot height so the tallest bar exactly fills it.
        const barH = Math.max(2, (point.value / max) * plotH);
        const x = i * slot + (slot - barWidth) / 2;
        return (
          <g key={point.label}>
            <title>{`${point.label}: ${formatCurrency(point.value)}`}</title>
            <rect
              x={x}
              y={plotH - barH}
              width={barWidth}
              height={barH}
              rx={6}
              className="fill-primary-600 dark:fill-primary-400"
            >
              <title>{`${point.label}: ${formatCurrency(point.value)}`}</title>
            </rect>
            <text
              x={i * slot + slot / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              className="fill-gray-500 dark:fill-gray-400"
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
