import { z } from "zod";

/**
 * PATCH /api/settings/profile — business profile / branding.
 *
 * All fields are optional: Prisma ignores `undefined` (omitted keys
 * leave the stored value untouched) while "" is normalised to null
 * (explicitly clears the column).
 */

/**
 * Optional short-text column: trims whitespace, maps "" → null
 * (clears the field) and caps length. Null/undefined input passes
 * through untouched thanks to `.nullish()`.
 */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((v) => (v === "" ? null : v))
    .nullish();
}

// Logo renders inside <img src>: restrict to absolute http(s) URLs —
// stricter than zod's generic .url() (which allows javascript:, ftp:…)
// so arbitrary schemes never reach the DOM.
const logoUrlSchema = z
  .string()
  .trim()
  .max(2048, "Logo URL must be 2048 characters or fewer")
  .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), {
    message: "Logo must be a valid http(s) URL",
  })
  .transform((v) => (v === "" ? null : v))
  .nullish();

const accentColorSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), {
    message: "Accent color must be a 6-digit hex value (e.g. #2563EB)",
  })
  .transform((v) => (v === "" ? null : v))
  .nullish();

// Empty submission stores null — render sites fall back to "INV"
// (matches the nullable column; avoids forcing a value on every save).
const invoicePrefixSchema = z
  .string()
  .trim()
  .max(10, "Invoice prefix must be 10 characters or fewer")
  .refine((v) => v === "" || /^[A-Z0-9]+$/.test(v), {
    message: "Invoice prefix may only contain uppercase letters and digits",
  })
  .transform((v) => (v === "" ? null : v))
  .nullish();

export const profileSchema = z.object({
  businessName: optionalText(120, "Business name"),
  addressLine1: optionalText(200, "Address line 1"),
  addressLine2: optionalText(200, "Address line 2"),
  city: optionalText(200, "City"),
  state: optionalText(200, "State"),
  postalCode: optionalText(200, "Postal code"),
  country: optionalText(200, "Country"),
  logoUrl: logoUrlSchema,
  accentColor: accentColorSchema,
  invoicePrefix: invoicePrefixSchema,
});

export type ProfilePayload = z.infer<typeof profileSchema>;
