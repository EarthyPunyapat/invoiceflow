import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { generateShareToken } from "./token";

export async function ensureShareToken(invoiceId: string, db: Prisma.TransactionClient = prisma): Promise<string> {
  // Compare-and-set, so concurrent sends/shares never invalidate an issued URL.
  await db.invoice.updateMany({
    where: { id: invoiceId, shareToken: null },
    data: { shareToken: generateShareToken() },
  });
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId }, select: { shareToken: true },
  });
  if (!invoice.shareToken) throw new Error("Unable to create invoice link");
  return invoice.shareToken;
}
