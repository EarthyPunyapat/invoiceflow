// ─── Invoice numbering (INV-YYYYMM-XXXX) ───────────────────────────
//
// Extracted from src/app/api/invoices/route.ts so the logic is unit-testable.

/**
 * Returns the invoice number prefix for the month containing `d`,
 * e.g. INV-202608 for August 2026.
 */
export function monthPrefix(d: Date): string {
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Given the most recent invoice number (e.g. "INV-202608-0009"), returns
 * the next sequence number (10). Returns 1 when `lastNumber` is null or
 * has no parseable trailing sequence.
 */
export function nextSequence(lastNumber: string | null): number {
  if (!lastNumber) return 1;
  const parsed = parseInt(lastNumber.split("-").pop() || "", 10);
  return Number.isNaN(parsed) ? 1 : parsed + 1;
}

// ─── Custom prefix scheme (user settings.invoicePrefix) ─────────────

export const INVOICE_PREFIX_MAX_LENGTH = 12;

/**
 * Sanitize a user-configured invoice prefix: trim, uppercase, strip any
 * characters outside [A-Z0-9-_], cap at INVOICE_PREFIX_MAX_LENGTH chars.
 * Returns null when nothing valid survives (empty / whitespace / all
 * stripped), signaling callers to fall back to the default INV-YYYYMM
 * scheme.
 */
export function sanitizeInvoicePrefix(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\-_]/g, "")
    .slice(0, INVOICE_PREFIX_MAX_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Compose the full invoice number for `seq` under a numbering scheme:
 * - custom prefix set → "PFX-0001" (no date component)
 * - null prefix       → default "INV-202608-0001"
 *
 * Sequence scoping decision: the caller looks up the latest invoice whose
 * invoiceNumber startsWith the SAME scheme's pattern ("${prefix}-" for a
 * custom scheme, "${monthPrefix(now)}" for the default one) and scoped to
 * that user's invoices — per-user prefixes require independent sequences
 * and must not leak counts across accounts. Caveat: Invoice.invoiceNumber
 * carries no @unique constraint in the Prisma schema, so two concurrent
 * POSTs can compute the same seq; acceptable for this single-user MVP,
 * documented rather than migrated here.
 */
export function nextInvoiceNumber(opts: {
  prefix: string | null | undefined;
  date: Date;
  lastNumber: string | null;
}): string {
  // Sanitize here too — callers may pass raw settings input; nothing
  // outside [A-Z0-9-_] can ever reach a generated invoice number.
  const prefix = sanitizeInvoicePrefix(opts.prefix);
  const paddedSeq = String(nextSequence(opts.lastNumber)).padStart(4, "0");
  if (!prefix) return `${monthPrefix(opts.date)}-${paddedSeq}`;
  return `${prefix}-${paddedSeq}`;
}
