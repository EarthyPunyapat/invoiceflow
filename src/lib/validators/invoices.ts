import { z } from "zod";
import {
  currencySchema,
  invoiceStatusSchema,
  isoDateSchema,
  lineItemSchema,
  notesSchema,
} from "./shared";

/** POST /api/invoices — mirrors existing required-field contract:
 * clientId, items (≥1), dueDate. Totals are derived server-side via
 * @/lib/money; clients must never send subtotal/total. */
export const invoiceCreateSchema = z
  .object({
    clientId: z.string().min(1),
    items: z.array(lineItemSchema).min(1).max(500),
    dueDate: isoDateSchema,
    status: invoiceStatusSchema.default("DRAFT"),
    currency: currencySchema,
    tax: z.number().min(0).max(1_000_000).default(0),
    notes: notesSchema,
  })
  .strict(); // reject unknown keys — esp. client-supplied total/subtotal

/** PATCH /api/invoices/[id] — status-only transition endpoint today;
 * explicit enum instead of pass-through keeps bad states out. */
export const invoiceStatusUpdateSchema = z
  .object({
    status: invoiceStatusSchema,
  })
  .strict();

/** PUT /api/invoices/[id] — draft-only full edit. Items are required
 * (same bar as create); clientId and dueDate are optional and fall back
 * to the stored values inside the route. Totals stay server-derived. */
export const invoiceUpdateSchema = z
  .object({
    clientId: z.string().min(1).optional(),
    items: z.array(lineItemSchema).min(1).max(500),
    dueDate: isoDateSchema.optional(),
    tax: z.number().min(0).max(1_000_000).default(0),
    currency: currencySchema,
    notes: notesSchema,
  })
  .strict();

export type InvoiceCreatePayload = z.infer<typeof invoiceCreateSchema>;
export type InvoiceStatusUpdatePayload = z.infer<
  typeof invoiceStatusUpdateSchema
>;
