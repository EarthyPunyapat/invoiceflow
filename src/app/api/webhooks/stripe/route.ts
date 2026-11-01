import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { lockOwner, recordCheckoutPayment } from "@/lib/billing";
import { sendInvoiceEmail, sendPaymentConfirmation } from "@/lib/email";

async function notifyPaid(invoiceId: string) {
  const owner = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { userId: true } });
  await prisma.$transaction(async tx => {
    await lockOwner(tx, owner.userId);
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (invoice.paymentNotifiedAt) return;
    // The provider idempotency key also covers a successful send followed by rollback.
    await sendPaymentConfirmation(invoiceId, tx);
    await tx.invoice.update({ where: { id: invoiceId }, data: { paymentNotifiedAt: new Date() } });
  }, { timeout: 30_000, maxWait: 10_000 });
}

/** Import Stripe Billing invoices only from a known connected account. Never
 * trust user IDs from metadata to select a tenant. Checkout uses its own path. */
async function syncStripeInvoice(remote: Stripe.Invoice, accountId?: string) {
  if (!accountId) return null;
  const account = await prisma.stripeAccount.findUnique({ where: { stripeAccountId: accountId } });
  if (!account) return null;
  if (!remote.customer_email) throw new Error("Stripe invoice has no customer email");
  // The app's stored money and tax helpers currently use two decimal places.
  // Reject unsupported imports rather than silently scaling JPY/KWD incorrectly.
  const digits = new Intl.NumberFormat("en", { style: "currency", currency: remote.currency }).resolvedOptions().maximumFractionDigits;
  if (digits !== 2) throw new Error("Stripe invoice currency is not supported");
  return prisma.$transaction(async (tx) => {
    await lockOwner(tx, account.userId);
    const existing = await tx.invoice.findFirst({ where: { userId: account.userId, OR: [{ stripeInvoiceId: remote.id }, { notes: remote.id }] } });
    if (existing) {
      if (remote.status === "paid") {
        await tx.invoice.updateMany({ where: { id: existing.id, status: { in: ["SENT", "OVERDUE"] } }, data: { status: "PAID", paidAt: new Date(), stripeInvoiceId: remote.id } });
      }
      return { id: existing.id, created: false, paid: remote.status === "paid" };
    }
    if (remote.lines.has_more) throw new Error("Stripe invoice requires paginated line import");
    let client = await tx.client.findFirst({ where: { userId: account.userId, email: remote.customer_email! } });
    if (!client) client = await tx.client.create({ data: { userId: account.userId, email: remote.customer_email!, name: remote.customer_name || remote.customer_email! } });
    const invoice = await tx.invoice.create({ data: {
      userId: account.userId, clientId: client.id, stripeInvoiceId: remote.id,
      // Stripe ID is stable and cannot collide with the local numbering scheme.
      invoiceNumber: remote.id, status: remote.status === "paid" ? "PAID" : "SENT",
      subtotal: remote.subtotal / 100, total: remote.total / 100,
      tax: remote.subtotal ? ((remote.tax || 0) / remote.subtotal) * 100 : 0,
      currency: remote.currency.toUpperCase(), dueDate: new Date((remote.due_date || remote.created) * 1000),
      sentAt: new Date(), paidAt: remote.status === "paid" ? new Date() : null,
      items: { create: remote.lines.data.map(line => ({ description: line.description || "Line item", quantity: line.quantity || 1, unitPrice: line.amount / (line.quantity || 1) / 100, total: line.amount / 100 })) },
    } });
    return { id: invoice.id, created: true, paid: remote.status === "paid" };
  });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe webhooks are not configured" }, { status: 503 });
  }
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const invoiceId = await recordCheckoutPayment(event.data.object as Stripe.Checkout.Session, event.account);
        if (invoiceId) await notifyPaid(invoiceId);
        break;
      }
      case "invoice.finalized":
      case "invoice.paid": {
        const synced = await syncStripeInvoice(event.data.object as Stripe.Invoice, event.account);
        if (synced?.paid) await notifyPaid(synced.id);
        else if (synced) await sendInvoiceEmail(synced.id, true);
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await prisma.stripeAccount.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeConnectOnboardingComplete: account.charges_enabled && account.details_submitted },
        });
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Return a non-2xx so Stripe retries DB/email failures rather than losing them.
    console.error("[STRIPE_WEBHOOK]", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
