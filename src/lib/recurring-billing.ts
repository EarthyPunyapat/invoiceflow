import { prisma } from "./prisma";
import { lockOwner } from "./billing";
import { allocateInvoiceNumber } from "./invoice-sequence";
import { isDue, computeNextRunAt } from "./recurring";
import { applyTaxPercent, centsToDollars, dollarsToCents, sumCents } from "./money";

export async function generateRecurringInvoice(id: string, now: Date) {
  return prisma.$transaction(async tx => {
    const owner = await tx.recurringInvoice.findUnique({ where: { id }, select: { userId: true } });
    if (!owner) return null;
    await lockOwner(tx, owner.userId);
    // Re-read after acquiring the lock: concurrent cron runs see the advanced slot.
    const template = await tx.recurringInvoice.findUniqueOrThrow({ where: { id } });
    if (!isDue(template, now)) return null;
    const source = template.sourceInvoiceId ? await tx.invoice.findFirst({ where: { id: template.sourceInvoiceId, userId: template.userId }, include: { items: { orderBy: { createdAt: "asc" } } } }) : null;
    const client = await tx.client.findFirst({ where: { id: template.clientId, userId: template.userId } });
    if (!source || !client) throw new Error("Recurring invoice source/client is missing or belongs to another owner");
    const rawTerm = Math.round((source.dueDate.getTime() - source.createdAt.getTime()) / 86_400_000);
    const term = Number.isFinite(rawTerm) && rawTerm >= 0 ? rawTerm : 30;
    const amounts = source.items.map(i => dollarsToCents(i.quantity * i.unitPrice));
    const subtotal = sumCents(...amounts);
    const { totalCents } = applyTaxPercent(subtotal, source.tax);
    const invoice = await tx.invoice.create({ data: {
      userId: template.userId, clientId: template.clientId,
      invoiceNumber: await allocateInvoiceNumber(tx, template.userId, template.nextRunAt),
      status: "DRAFT", subtotal: centsToDollars(subtotal), total: centsToDollars(totalCents), tax: source.tax,
      currency: source.currency, dueDate: new Date(template.nextRunAt.getTime() + term * 86_400_000), notes: template.notes ?? source.notes,
      items: { create: source.items.map((item, i) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, total: centsToDollars(amounts[i]) })) },
    } });
    await tx.recurringInvoice.update({ where: { id }, data: { nextRunAt: computeNextRunAt(template.frequency, template.nextRunAt) } });
    return invoice;
  }, { timeout: 15_000, maxWait: 10_000 });
}
