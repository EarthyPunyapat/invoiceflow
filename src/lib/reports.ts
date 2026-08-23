/**
 * Reports & analytics — PURE functions only (no Prisma, no IO).
 *
 * The reports page fetches raw invoices server-side and feeds them
 * through these helpers, keeping every calculation unit-testable.
 *
 * All month math uses UTC components for timezone-stable buckets.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

// ─── Revenue by month ────────────────────────────────────────────

export interface RevenuePointInput {
  total: number;
  status: string;
  /** Bucketing date — callers typically pass createdAt. */
  date: Date | string;
}

export interface MonthlyRevenue {
  label: string;
  revenue: number;
}

/**
 * Sum PAID invoice totals into the last `months` calendar-month buckets,
 * ending at `now`'s month. Returns buckets chronologically; months with
 * no paid invoices are zero-filled so charts keep a stable x-axis.
 */
export function revenueByMonth(
  invoices: RevenuePointInput[],
  months = 6,
  now: Date = new Date()
): MonthlyRevenue[] {
  if (months <= 0) return [];

  const buckets: MonthlyRevenue[] = [];
  const bucketIndex = new Map<string, number>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)
    );
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    bucketIndex.set(key, buckets.length);
    buckets.push({
      label: `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      revenue: 0,
    });
  }

  for (const inv of invoices) {
    if (inv.status !== "PAID") continue;
    const d = typeof inv.date === "string" ? new Date(inv.date) : inv.date;
    if (Number.isNaN(d.getTime())) continue;
    const idx = bucketIndex.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
    if (idx !== undefined) buckets[idx].revenue += inv.total;
  }

  return buckets;
}

// ─── Top clients ─────────────────────────────────────────────────

export interface TopClientInput {
  clientName: string;
  total: number;
  status: string;
}

export interface ClientRevenue {
  clientName: string;
  total: number;
  count: number;
}

/**
 * Aggregate PAID invoice totals per client, sorted by revenue desc.
 * Ties break alphabetically so output is deterministic.
 */
export function topClients(
  invoices: TopClientInput[],
  limit = 5
): ClientRevenue[] {
  const byClient = new Map<string, ClientRevenue>();

  for (const inv of invoices) {
    if (inv.status !== "PAID") continue;
    const entry =
      byClient.get(inv.clientName) ??
      { clientName: inv.clientName, total: 0, count: 0 };
    entry.total += inv.total;
    entry.count += 1;
    byClient.set(inv.clientName, entry);
  }

  return Array.from(byClient.values())
    .sort(
      (a, b) => b.total - a.total || a.clientName.localeCompare(b.clientName)
    )
    .slice(0, Math.max(0, limit));
}

// ─── Average days to pay ─────────────────────────────────────────

export interface PaymentSpanInput {
  sentAt: Date | string | null;
  paidAt: Date | string | null;
}

/**
 * Mean whole days between sentAt and paidAt across invoices that have
 * both timestamps. Inverted spans (paid before sent — data anomalies)
 * are skipped rather than skewing the mean. Returns null when there is
 * insufficient data.
 */
export function avgDaysToPay(invoices: PaymentSpanInput[]): number | null {
  let sumDays = 0;
  let counted = 0;

  for (const inv of invoices) {
    if (!inv.sentAt || !inv.paidAt) continue;
    const sent = new Date(inv.sentAt);
    const paid = new Date(inv.paidAt);
    if (Number.isNaN(sent.getTime()) || Number.isNaN(paid.getTime())) continue;

    const days = (paid.getTime() - sent.getTime()) / DAY_MS;
    if (days < 0) continue; // anomaly guard

    sumDays += days;
    counted += 1;
  }

  if (counted === 0) return null;
  return Math.round(sumDays / counted);
}
