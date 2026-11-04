import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { stripeConfigured } from "@/lib/integration-config";
import { appUrl } from "@/lib/app-url";
import { entitlement, needsRefresh, PLAN_USER_SELECT, PRO_PLAN, type Entitlement, type PlanUser } from "@/lib/plan";

/**
 * InvoiceFlow Pro billing against the platform's own Stripe account (spec D4,
 * D5). There is no subscription webhook: Stripe is read on return from
 * Checkout or the portal, and lazily when the cached period has ended.
 */

export type BillingResult = { url: string } | { status: number; error: string };

const NOT_CONFIGURED = { status: 503, error: "Billing is not configured yet." };

async function planUser(userId: string): Promise<PlanUser> {
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: PLAN_USER_SELECT });
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Store a subscription only if it belongs to the customer we created for this user. */
async function storeSubscription(userId: string, expectedCustomer: string, sub: Stripe.Subscription) {
  if (customerId(sub.customer) !== expectedCustomer) return false;
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionPeriodEnd: new Date(sub.current_period_end * 1000),
      subscriptionCancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
  return true;
}

export async function refreshSubscription(userId: string): Promise<void> {
  const user = await planUser(userId);
  if (!user.stripeCustomerId) return;
  const stripe = getStripe();
  const sub = user.stripeSubscriptionId
    ? await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
    : (await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 1 })).data[0];
  if (sub) await storeSubscription(userId, user.stripeCustomerId, sub);
}

export async function getEntitlement(userId: string, options: { refresh?: boolean } = {}): Promise<Entitlement> {
  const cached = await planUser(userId);
  const now = new Date();
  if (!options.refresh && !needsRefresh(cached, now)) return entitlement(cached, now);
  try {
    await refreshSubscription(userId);
    return entitlement(await planUser(userId), now);
  } catch (error) {
    console.error("[subscription] refresh failed", error instanceof Error ? error.message : error);
    // Spec D6: a provider outage never blocks someone whose last known status was paid.
    if (cached.subscriptionStatus === "active" || cached.subscriptionStatus === "trialing") {
      return { ...entitlement(cached, now), state: "pro", canCreate: true, activeUntil: cached.subscriptionPeriodEnd };
    }
    return entitlement(cached, now);
  }
}

async function ensureCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, name: true, stripeCustomerId: true },
  });
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await getStripe().customers.create(
    { email: user.email ?? undefined, name: user.name ?? undefined, metadata: { userId } },
    { idempotencyKey: `invoiceflow-customer-${userId}` },
  );
  // Only the first concurrent request records its customer; everyone re-reads.
  await prisma.user.updateMany({ where: { id: userId, stripeCustomerId: null }, data: { stripeCustomerId: customer.id } });
  const saved = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { stripeCustomerId: true } });
  return saved.stripeCustomerId!;
}

export async function startCheckout(userId: string): Promise<BillingResult> {
  if (!stripeConfigured()) return NOT_CONFIGURED;
  if ((await getEntitlement(userId)).state === "pro") {
    return { status: 409, error: "You already have InvoiceFlow Pro. Use Manage billing to change it." };
  }
  const customer = await ensureCustomer(userId);
  const origin = appUrl();
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: userId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: PRO_PLAN.currency,
        unit_amount: PRO_PLAN.amountCents,
        recurring: { interval: PRO_PLAN.interval },
        product_data: { name: PRO_PLAN.name },
      },
    }],
    success_url: `${origin}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/settings?billing=cancelled`,
  });
  if (!session.url) return { status: 502, error: "Stripe did not return a checkout link. Try again." };
  return { url: session.url };
}

export async function completeCheckout(userId: string, sessionId: string): Promise<boolean> {
  try {
    const user = await planUser(userId);
    if (!user.stripeCustomerId) return false;
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    const sub = session.subscription;
    if (session.mode !== "subscription" || session.client_reference_id !== userId ||
        customerId(session.customer) !== user.stripeCustomerId || !sub || typeof sub === "string") {
      return false;
    }
    return await storeSubscription(userId, user.stripeCustomerId, sub);
  } catch (error) {
    console.error("[subscription] checkout completion failed", error instanceof Error ? error.message : error);
    return false;
  }
}

async function portalConfiguration(origin: string): Promise<string> {
  const stripe = getStripe();
  const existing = (await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 })).data[0];
  if (existing) return existing.id;
  const created = await stripe.billingPortal.configurations.create({
    business_profile: { privacy_policy_url: `${origin}/privacy`, terms_of_service_url: `${origin}/terms` },
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
    },
  });
  return created.id;
}

export async function openBillingPortal(userId: string): Promise<BillingResult> {
  if (!stripeConfigured()) return NOT_CONFIGURED;
  const user = await planUser(userId);
  if (!user.stripeCustomerId) return { status: 400, error: "No billing account yet. Subscribe first." };
  const origin = appUrl();
  const session = await getStripe().billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    configuration: await portalConfiguration(origin),
    return_url: `${origin}/settings?billing=portal`,
  });
  return { url: session.url };
}
