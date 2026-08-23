import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isDue,
  computeNextRunAt,
  type Frequency,
} from "@/lib/recurring";
import { monthPrefix, nextSequence } from "@/lib/invoice-number";
import {
  applyTaxPercent,
  centsToDollars,
  dollarsToCents,
  sumCents,
} from "@/lib/money";

// ─── GET /api/cron/generate-recurring ──────────────────────────────
//
// Cron job: for every due RecurringInvoice template, clone its source
// invoice into a fresh DRAFT invoice (same line items/totals) and
// advance the schedule by one frequency period. Mirrors the
// chase-invoices route pattern: Bearer-secret auth, per-item try/catch,
// summary JSON.

const DEFAULT_PAYMENT_TERM_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const start = Date.now();

  // Require a shared secret for cron auth
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expected) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const now = new Date();

    const templates = await prisma.recurringInvoice.findMany({
      where: { paused: false, nextRunAt: { lte: now } },
    });

    // Only templates that pass the pure due-check (endDate respected).
    const dueTemplates = templates.filter((t) => isDue(t, now));

    // sourceInvoiceId is a plain field (no FK relation in the schema),
    // so batch-fetch the source invoices + items ourselves.
    const sourceIds = dueTemplates
      .map((t) => t.sourceInvoiceId)
      .filter((id): id is string => Boolean(id));

    const sources = await prisma.invoice.findMany({
      where: { id: { in: sourceIds } },
      include: { items: true },
    });
    const sourceById = new Map(sources.map((s) => [s.id, s]));

    // Invoice numbers share the INV-YYYYMM-XXXX sequence; allocate a
    // local cursor so templates processed in this run never collide.
    let lastNumber: string | null =
      (
        await prisma.invoice.findFirst({
          where: { invoiceNumber: { startsWith: monthPrefix(now) } },
          orderBy: { invoiceNumber: "desc" },
          select: { invoiceNumber: true },
        })
      )?.invoiceNumber ?? null;

    const results: Array<{
      recurringId: string;
      invoiceId?: string;
      invoiceNumber?: string;
      nextRunAt?: string;
      error?: string;
    }> = [];

    for (const template of dueTemplates) {
      try {
        const source = template.sourceInvoiceId
          ? sourceById.get(template.sourceInvoiceId)
          : undefined;

        if (!source) {
          results.push({
            recurringId: template.id,
            error: "Source invoice not found",
          });
          continue;
        }

        // Preserve the source's payment term when it is sane (a genuine
        // 0-day term stays 0; only non-finite/negative falls back to 30).
        const rawTerm = Math.round(
          (new Date(source.dueDate).getTime() -
            new Date(source.createdAt).getTime()) /
            DAY_MS
        );
        const effectiveTerm =
          Number.isFinite(rawTerm) && rawTerm >= 0
            ? rawTerm
            : DEFAULT_PAYMENT_TERM_DAYS;

        // Bill the scheduled slot even when cron fires late.
        const issueDate = template.nextRunAt;
        const dueDate = new Date(issueDate.getTime() + effectiveTerm * DAY_MS);

        lastNumber = `${monthPrefix(issueDate)}-${String(
          nextSequence(lastNumber)
        ).padStart(4, "0")}`;

        // Recompute money through integer-cents helpers (float-safe),
        // mirroring POST /api/invoices: round each line once, sum exactly,
        // apply tax percent, convert back only at the storage edge.
        const orderedItems = [...source.items].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        const lineCents = orderedItems.map((item) =>
          dollarsToCents(item.quantity * item.unitPrice)
        );
        const subtotalCents = sumCents(...lineCents);
        const { taxCents, totalCents } = applyTaxPercent(
          subtotalCents,
          source.tax ?? 0
        );

        const created = await prisma.invoice.create({
          data: {
            userId: template.userId,
            clientId: template.clientId,
            invoiceNumber: lastNumber,
            status: "DRAFT",
            currency: source.currency,
            subtotal: centsToDollars(subtotalCents),
            tax: source.tax ?? 0,
            total: centsToDollars(totalCents),
            dueDate,
            notes: template.notes ?? source.notes ?? null,
            items: {
              create: orderedItems.map((item, i) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: centsToDollars(lineCents[i]),
              })),
            },
          },
        });

        const nextRunAt = computeNextRunAt(
          template.frequency as Frequency,
          new Date(template.nextRunAt)
        );

        await prisma.recurringInvoice.update({
          where: { id: template.id },
          data: { nextRunAt },
        });

        results.push({
          recurringId: template.id,
          invoiceId: created.id,
          invoiceNumber: created.invoiceNumber,
          nextRunAt: nextRunAt.toISOString(),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        console.error(`[generate-recurring] Failed for ${template.id}:`, message);
        results.push({ recurringId: template.id, error: message });
      }
    }

    const duration = Date.now() - start;

    return NextResponse.json({
      ok: true,
      processed: dueTemplates.length,
      generated: results.filter((r) => !r.error).length,
      skipped: results.filter((r) => r.error).length,
      details: results,
      durationMs: duration,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[generate-recurring]", message);

    return NextResponse.json(
      { error: "Failed to generate recurring invoices", detail: message },
      { status: 500 },
    );
  }
}
