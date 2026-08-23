import { z } from "zod";
import {
  currencySchema,
  estimateStatusSchema,
  isoDateSchema,
  lineItemSchema,
  notesSchema,
} from "./shared";

/** POST /api/estimates — clientId, items, issueDate and expiryDate required.
 * Cross-field rule (expiry after issue) enforced with a superRefine so the
 * error lands on `expiryDate`. */
export const estimateCreateSchema = z
  .object({
    clientId: z.string().min(1),
    items: z.array(lineItemSchema).min(1).max(500),
    issueDate: isoDateSchema,
    expiryDate: isoDateSchema,
    status: estimateStatusSchema.default("DRAFT"),
    currency: currencySchema,
    tax: z.number().min(0).max(1_000_000).default(0),
    notes: notesSchema,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.expiryDate.getTime() < data.issueDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiryDate"],
        message: "expiryDate must be on or after issueDate",
      });
    }
  });

/** PATCH /api/estimates/[id] — status transition endpoint. */
export const estimateStatusUpdateSchema = z
  .object({
    status: estimateStatusSchema,
  })
  .strict();

export type EstimateCreatePayload = z.infer<typeof estimateCreateSchema>;
export type EstimateStatusUpdatePayload = z.infer<
  typeof estimateStatusUpdateSchema
>;
