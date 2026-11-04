/** Facts shared by the privacy policy and terms (spec D7). */
export const LEGAL = {
  operator: "InvoiceFlow",
  governingLaw: "New Zealand",
  effective: "4 November 2026",
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The public support inbox, from SUPPORT_EMAIL. Returns null when unset,
 * malformed or still the .env.example placeholder, so a page never shows
 * an address nobody reads.
 */
export function supportEmail(): string | null {
  const value = process.env.SUPPORT_EMAIL?.trim() ?? "";
  if (!EMAIL.test(value) || value.toLowerCase().endsWith("@yourdomain.com")) return null;
  return value;
}
