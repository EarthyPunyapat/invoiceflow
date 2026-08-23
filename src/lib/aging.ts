// ─── Aging buckets for outstanding invoices ───────────────────────

export interface AgingInput {
  total: number;
  dueDate: Date | string;
  status?: string;
}

export interface AgingBuckets {
  current: number;
  d30: number;
  d60: number;
  d90plus: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Days overdue (positive = past due, negative/zero = not yet due). */
export function daysOverdue(dueDate: Date | string, now: Date): number {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return Math.floor((now.getTime() - due.getTime()) / DAY_MS);
}

/**
 * Sum invoice totals into aging buckets by days overdue:
 *   <30 (incl. future-due) → current · 30–59 → d30 · 60–89 → d60 · 90+ → d90plus
 * Invoices with status PAID or CANCELLED are excluded.
 */
export function bucketOutstanding(invoices: AgingInput[], now: Date): AgingBuckets {
  const buckets: AgingBuckets = { current: 0, d30: 0, d60: 0, d90plus: 0 };

  for (const inv of invoices) {
    if (inv.status === "PAID" || inv.status === "CANCELLED") continue;

    const overdue = daysOverdue(inv.dueDate, now);
    if (overdue >= 90) buckets.d90plus += inv.total;
    else if (overdue >= 60) buckets.d60 += inv.total;
    else if (overdue >= 30) buckets.d30 += inv.total;
    else buckets.current += inv.total;
  }

  return buckets;
}
