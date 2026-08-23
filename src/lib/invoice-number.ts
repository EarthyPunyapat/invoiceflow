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
