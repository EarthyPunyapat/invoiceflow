/**
 * Recurring invoice generation — pure logic only (no Prisma, no IO).
 */

export type Frequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

export const FREQUENCIES: readonly Frequency[] = [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "YEARLY",
];

/** Add one frequency interval to a date, clamping to month end where needed. */
export function addInterval(from: Date, freq: Frequency): Date {
  const d = new Date(from.getTime());

  switch (freq) {
    case "WEEKLY":
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    case "BIWEEKLY":
      d.setUTCDate(d.getUTCDate() + 14);
      return d;
    case "MONTHLY": {
      const targetMonth = d.getUTCMonth() + 1;
      const dayOfMonth = d.getUTCDate();
      const next = new Date(
        Date.UTC(d.getUTCFullYear(), targetMonth, 1, 0, 0, 0, 0)
      );
      const daysInTarget = daysInUTCMonth(next.getUTCFullYear(), targetMonth);
      next.setUTCDate(Math.min(dayOfMonth, daysInTarget));
      // preserve time-of-day from source
      copyTime(from, next);
      return next;
    }
    case "YEARLY": {
      const targetYear = d.getUTCFullYear() + 1;
      const next = new Date(
        Date.UTC(targetYear, d.getUTCMonth(), 1, 0, 0, 0, 0)
      );
      const daysInMonth = daysInUTCMonth(targetYear, d.getUTCMonth());
      next.setUTCDate(Math.min(d.getUTCDate(), daysInMonth));
      copyTime(from, next);
      return next;
    }
  }
}

/** Next run timestamp for a template, given its last anchor date. */
export function computeNextRunAt(freq: Frequency, from: Date): Date {
  return addInterval(from, freq);
}

export interface RecurringTemplateShape {
  paused?: boolean;
  nextRunAt: Date | string;
  endDate?: Date | string | null;
}

/** A template is due when not paused, past nextRunAt, and before endDate (if set). */
export function isDue(
  template: RecurringTemplateShape,
  now: Date = new Date()
): boolean {
  if (template.paused) return false;
  if (new Date(template.nextRunAt).getTime() > now.getTime()) return false;
  if (
    template.endDate != null &&
    new Date(template.endDate).getTime() < now.getTime()
  ) {
    return false;
  }
  return true;
}

// ─── internals ───────────────────────────────────────────────────

function daysInUTCMonth(year: number, monthIndex: number): number {
  // day 0 of the following month === last day of `monthIndex`
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function copyTime(source: Date, target: Date): void {
  target.setUTCHours(
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds()
  );
}
