// ─── Reminder schedule & helpers ───────────────────────────────────
//
// Extracted from src/app/api/cron/chase-invoices/route.ts so the logic is unit-testable.
//
// Day 3   → friendly  (first nudge)
// Day 7   → firm      (escalated)
// Day 14+ → final     (last warning, repeatable every 7 days thereafter)

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export const SCHEDULE: Array<{ minDays: number; type: "friendly" | "firm" | "final" }> = [
  { minDays: 3, type: "friendly" },
  { minDays: 7, type: "firm" },
  { minDays: 14, type: "final" },
];

export function getNextReminderType(
  daysOverdue: number,
  reminderCount: number,
): "friendly" | "firm" | "final" | null {
  // Walk schedule in reverse to find the highest applicable tier
  for (let i = SCHEDULE.length - 1; i >= 0; i--) {
    const tier = SCHEDULE[i];

    if (daysOverdue >= tier.minDays) {
      // Determine how many reminders should have been sent by this tier
      // Tier 0 (friendly): reminderCount 0 → send reminder 0 (friendly)
      // Tier 1 (firm):     reminderCount 1 → send reminder 1 (firm)
      // Tier 2 (final):    reminderCount 2 → send reminder 2 (final)
      // Tier 2+            reminderCount >= 3 → final repeats every 7 days

      if (reminderCount <= i) {
        // Haven't sent this tier's reminder yet
        return tier.type;
      }

      if (i === 2 && reminderCount >= 3) {
        // Final tier: re-send every 7 days after the last reminder
        // Only if it's been 7+ days since the last reminder
        return "final";
      }
    }
  }

  return null; // No reminder due
}
