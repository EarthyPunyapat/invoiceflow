import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPaymentReminder } from "@/lib/email";

// ─── Helper: compute days overdue ──────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Reminder schedule ─────────────────────────────────────────────
//
// Day 3   → friendly  (first nudge)
// Day 7   → firm      (escalated)
// Day 14+ → final     (last warning, repeatable every 7 days thereafter)

const SCHEDULE: Array<{ minDays: number; type: "friendly" | "firm" | "final" }> = [
  { minDays: 3, type: "friendly" },
  { minDays: 7, type: "firm" },
  { minDays: 14, type: "final" },
];

function getNextReminderType(
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

// ─── GET /api/cron/chase-invoices ──────────────────────────────────

export async function GET(req: NextRequest) {
  const start = Date.now();

  // Require a shared secret for cron auth
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const now = new Date();

    // Find SENT invoices past their due date
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "SENT",
        dueDate: { lt: now },
      },
      include: {
        client: true,
        user: { select: { email: true, name: true } },
      },
    });

    const results: Array<{
      invoiceId: string;
      invoiceNumber: string;
      daysOverdue: number;
      type: string;
      emailId: string | null;
      error?: string;
    }> = [];

    for (const invoice of overdueInvoices) {
      const daysOverdue = daysBetween(now, new Date(invoice.dueDate));
      const reminderType = getNextReminderType(
        daysOverdue,
        invoice.reminderCount,
      );

      if (!reminderType) {
        continue; // Not due for a reminder yet
      }

      // For final repeat reminders, check 7-day cooldown since last reminder
      if (
        reminderType === "final" &&
        invoice.reminderCount >= 3 &&
        invoice.lastReminderSentAt
      ) {
        const daysSinceLastReminder = daysBetween(
          now,
          new Date(invoice.lastReminderSentAt),
        );
        if (daysSinceLastReminder < 7) {
          continue; // Still within cooldown
        }
      }

      try {
        const { emailId } = await sendPaymentReminder(
          invoice.id,
          reminderType,
        );

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          daysOverdue,
          type: reminderType,
          emailId: emailId ?? null,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        console.error(
          `[chase-invoices] Failed for ${invoice.invoiceNumber}:`,
          message,
        );

        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          daysOverdue,
          type: reminderType,
          emailId: null,
          error: message,
        });
      }
    }

    const duration = Date.now() - start;

    return NextResponse.json({
      ok: true,
      processed: overdueInvoices.length,
      sent: results.filter((r) => !r.error).length,
      errors: results.filter((r) => r.error).length,
      results,
      durationMs: duration,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[chase-invoices]", message);

    return NextResponse.json(
      { error: "Failed to chase invoices", detail: message },
      { status: 500 },
    );
  }
}
