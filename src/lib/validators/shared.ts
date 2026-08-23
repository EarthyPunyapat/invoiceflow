import { z } from "zod";

/** Prisma InvoiceStatus enum mirror. */
export const invoiceStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

/** Prisma EstimateStatus enum mirror. */
export const estimateStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "CONVERTED",
]);

/** ISO-4217 alpha-3 currency code, normalised to uppercase. */
export const currencySchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/, "currency must be a 3-letter code")
  .transform((s) => s.toUpperCase())
  .default("USD");

/** Accepts ISO strings (and Date instances) → real Date for Prisma. */
export const isoDateSchema = z.coerce.date();

/** Invoice/estimate line item — money math happens server-side in cents. */
export const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(1_000_000),
  unitPrice: z.number().min(0).max(1e13),
});

/** Optional free-text notes; null clears the column. */
export const notesSchema = z.string().max(5_000).nullable().optional();
