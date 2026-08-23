/**
 * Money safety layer — all arithmetic happens on INTEGER CENTS.
 *
 * Why: IEEE-754 floats make dollar math lossy (0.1 + 0.2 !== 0.3).
 * Every helper below converts to integer cents as early as possible,
 * does exact integer arithmetic, and only converts back at the edge.
 */

/** Round half away from zero ("half-up" for positives), unlike Math.round(-2.5) === -2. */
export function roundHalfUp(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x));
}

/**
 * Convert dollars (float from user input / API payloads) to integer cents.
 *
 * Two-step defence against IEEE-754 drift:
 *   1. Snap to 6 decimals — kills accumulated noise (0.1+0.2 → "0.300000").
 *   2. Convert via STRING slicing, never `dollars * 100`: float multiplication
 *      itself is lossy (33.335 * 100 === 3333.499999…, which would misplace
 *      a cent). Sub-cent digits round HALF-UP (third decimal ≥ 5 ⇒ +1¢).
 */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) {
    throw new TypeError(
      `dollarsToCents expects a finite number, received: ${dollars}`
    );
  }
  if (Math.abs(dollars) >= 1e15) {
    throw new RangeError(
      `dollarsToCents supports amounts below 1e15, received: ${dollars}`
    );
  }

  const fixed = dollars.toFixed(6); // always plain decimal notation below 1e21
  const negative = fixed.startsWith("-");
  const [intPart = "0", decPart = ""] = (
    negative ? fixed.slice(1) : fixed
  ).split(".");
  // decPart is exactly 6 digits here; first two are whole cents,
  // decPart[2] decides HALF-UP rounding of the remainder.
  const cents =
    parseInt(intPart, 10) * 100 + parseInt(decPart.slice(0, 2), 10);
  const roundUp = (decPart[2] ?? "0") >= "5";
  const magnitude = cents + (roundUp ? 1 : 0);
  return negative ? -magnitude : magnitude;
}

/** Convert integer cents back to a dollar float (exact for |cents| < 2^53). */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/** Format integer cents as a currency string without leaving cent-space until format time. */
export function formatMoneyFromCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(centsToDollars(cents));
}

/** Exact sum of any number of cent amounts (integers never drift). */
export function sumCents(...amounts: number[]): number {
  return amounts.reduce((sum, c) => sum + c, 0);
}

export interface TaxBreakdown {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Apply a percentage tax to a subtotal in cents.
 * Tax rounds HALF-UP independently; total = subtotal + roundedTax
 * (invariant guaranteed by construction).
 */
export function applyTaxPercent(
  subtotalCents: number,
  taxPercent: number
): TaxBreakdown {
  const taxCents = roundHalfUp((subtotalCents * taxPercent) / 100);
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}
