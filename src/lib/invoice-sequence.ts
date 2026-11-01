import type { Prisma } from "@prisma/client";
import { monthPrefix, sanitizeInvoicePrefix, nextInvoiceNumber, nextSequence } from "./invoice-number";

/** Caller must hold lockOwner(tx, userId) until its invoice is inserted. */
export async function allocateInvoiceNumber(tx: Prisma.TransactionClient, userId: string, date: Date) {
  const owner = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { invoicePrefix: true } });
  const prefix = sanitizeInvoicePrefix(owner.invoicePrefix);
  const pattern = `${prefix || monthPrefix(date)}-`;
  const invoices = await tx.invoice.findMany({ where: { userId, invoiceNumber: { startsWith: pattern } }, select: { invoiceNumber: true } });
  // Numeric comparison handles sequences crossing 9999; lexical ordering cannot.
  const matches = invoices.filter(i => /^\d+$/.test(i.invoiceNumber.slice(pattern.length)));
  const last = matches.reduce<string | null>((best, i) => nextSequence(i.invoiceNumber) > nextSequence(best) ? i.invoiceNumber : best, null);
  return nextInvoiceNumber({ prefix, date, lastNumber: last });
}
