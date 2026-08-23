import { z } from "zod";

const emailSchema = z.string().trim().email().max(320);
const shortText = (max: number) => z.string().trim().min(1).max(max);

/** POST /api/clients — name and email are required (existing contract). */
export const clientCreateSchema = z.object({
  name: shortText(200),
  email: emailSchema,
  company: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
});

/** PATCH /api/clients/[id] — partial update; must touch ≥1 field,
 * matching the existing "No fields to update" 400 behaviour. */
export const clientUpdateSchema = z
  .object({
    name: shortText(200).optional(),
    email: emailSchema.optional(),
    company: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(50).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

export type ClientCreatePayload = z.infer<typeof clientCreateSchema>;
export type ClientUpdatePayload = z.infer<typeof clientUpdateSchema>;
