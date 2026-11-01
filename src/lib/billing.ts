import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "./prisma";
import { getStripe } from "./stripe";
import { appUrl } from "./app-url";
import { dollarsToCents } from "./money";

export async function lockOwner(tx: Prisma.TransactionClient, userId: string) {
  // Shared by invoice writers; PostgreSQL releases this lock on commit/rollback.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`invoice-owner:${userId}`}))`;
}

export function checkoutAmount(total: number, currency: string): number {
  const digits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  if (digits !== 2) throw new Error("Online payment currently supports currencies with two decimal places only");
  const amount = dollarsToCents(total);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 99_999_999) {
    throw new Error("Invoice amount is outside the online payment limits");
  }
  return amount;
}

export async function createInvoiceCheckout(token: string) {
  const stripe = getStripe();
  return prisma.$transaction(async (tx) => {
    const owner = await tx.invoice.findUnique({ where: { shareToken: token }, select: { userId: true } });
    if (!owner) return { status: 404, error: "Not found" };
    await lockOwner(tx, owner.userId);
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { shareToken: token },
      include: { client: true, user: { include: { stripeAccount: true } } },
    });
    if (!["SENT", "OVERDUE"].includes(invoice.status)) return { status: 400, error: "This invoice is not payable online" };
    const account = invoice.user.stripeAccount;
    if (!account?.stripeConnectOnboardingComplete) return { status: 503, error: "Online payments are not configured for this business" };
    let amount: number;
    try { amount = checkoutAmount(invoice.total, invoice.currency); }
    catch (error) { return { status: 400, error: (error as Error).message }; }
    if (invoice.stripeInvoiceId) {
      // Stripe Billing remains the payment authority for imported invoices.
      // A separate Checkout payment would leave Billing's collection active.
      const remote = await stripe.invoices.retrieve(invoice.stripeInvoiceId, { stripeAccount: account.stripeAccountId });
      if (remote.status === "paid") return { status: 409, error: "Payment is processing. Please refresh the invoice shortly" };
      if (remote.status !== "open" || !remote.hosted_invoice_url) return { status: 400, error: "This invoice is not payable online" };
      if (remote.amount_remaining !== amount || remote.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
        return { status: 409, error: "This invoice has changed. Please contact the issuer" };
      }
      return { url: remote.hosted_invoice_url };
    }
    if (invoice.checkoutSessionId) {
      const existing = await stripe.checkout.sessions.retrieve(invoice.checkoutSessionId, { stripeAccount: account.stripeAccountId });
      if (existing.status === "open" && existing.url) return { url: existing.url };
      if (existing.status === "complete") return { status: 409, error: "Payment is processing. Please refresh the invoice shortly" };
    }
    const attempt = invoice.checkoutAttempt + 1;
    const metadata = { invoiceFlowId: invoice.id, invoiceFlowUserId: invoice.userId };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: invoice.id,
      customer_email: invoice.client.email,
      metadata,
      payment_intent_data: { metadata },
      // Charge the stored grand total once, including the rounded tax. The
      // public invoice/PDF provides the full itemized breakdown.
      line_items: [{ quantity: 1, price_data: {
        currency: invoice.currency.toLowerCase(), unit_amount: amount,
        product_data: { name: `Invoice ${invoice.invoiceNumber}`, description: "Invoice total including applicable tax" },
      } }],
      success_url: `${appUrl()}/i/${token}?paid=1`,
      cancel_url: `${appUrl()}/i/${token}`,
    }, { stripeAccount: account.stripeAccountId, idempotencyKey: `invoice-checkout:${invoice.id}:${attempt}` });
    await tx.invoice.update({ where: { id: invoice.id }, data: { checkoutSessionId: session.id, checkoutAttempt: attempt } });
    return { url: session.url };
  }, { timeout: 30_000, maxWait: 10_000 });
}

/** The account, amount, currency and persisted session must all match. */
export async function recordCheckoutPayment(session: Stripe.Checkout.Session, accountId?: string) {
  if (session.payment_status !== "paid") return null;
  const invoiceId = session.client_reference_id;
  if (!accountId || !invoiceId) throw new Error("Checkout payment is missing its account or invoice reference");
  return prisma.$transaction(async (tx) => {
    const account = await tx.stripeAccount.findUnique({ where: { stripeAccountId: accountId } });
    if (!account) throw new Error("Unknown connected account");
    await lockOwner(tx, account.userId);
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, userId: account.userId } });
    if (!invoice || invoice.checkoutSessionId !== session.id ||
        session.amount_total !== checkoutAmount(invoice.total, invoice.currency) ||
        session.currency?.toUpperCase() !== invoice.currency.toUpperCase()) {
      throw new Error("Checkout payment does not match the invoice");
    }
    if (!["SENT", "OVERDUE", "PAID"].includes(invoice.status)) throw new Error("Payment received for a non-payable invoice");
    await tx.invoice.updateMany({ where: { id: invoice.id, status: { in: ["SENT", "OVERDUE"] } }, data: { status: "PAID", paidAt: new Date() } });
    return invoice.id;
  });
}
