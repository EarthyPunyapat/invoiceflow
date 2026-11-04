import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const stripe = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  sessionsCreate: vi.fn(),
  sessionsRetrieve: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  subscriptionsList: vi.fn(),
  portalConfigurationsList: vi.fn(),
  portalConfigurationsCreate: vi.fn(),
  portalSessionsCreate: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: { create: stripe.customersCreate },
    checkout: { sessions: { create: stripe.sessionsCreate, retrieve: stripe.sessionsRetrieve } },
    subscriptions: { retrieve: stripe.subscriptionsRetrieve, list: stripe.subscriptionsList },
    billingPortal: {
      configurations: { list: stripe.portalConfigurationsList, create: stripe.portalConfigurationsCreate },
      sessions: { create: stripe.portalSessionsCreate },
    },
  }),
}));

import { prisma } from "@/lib/prisma";
import { completeCheckout, getEntitlement, openBillingPortal, startCheckout } from "@/lib/subscription";

const DAY = 86_400_000;
const owners: string[] = [];
async function owner(data: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: { email: `subscription-${crypto.randomUUID()}@example.test`, name: "Owner", ...data },
  });
  owners.push(user.id);
  return user;
}
const subscription = (overrides: Record<string, unknown> = {}) => ({
  id: "sub_1", object: "subscription", status: "active", customer: "cus_1",
  current_period_end: 1767225600, cancel_at_period_end: false, ...overrides,
});
const uniqueCustomer = () => `cus_${crypto.randomUUID()}`;

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") {
    throw new Error("Subscription tests require the disposable local invoiceflow_test database");
  }
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
});
beforeEach(() => {
  vi.clearAllMocks();
  stripe.customersCreate.mockResolvedValue({ id: "cus_1" });
  stripe.sessionsCreate.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
  stripe.portalSessionsCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/session/1" });
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
  await prisma.$disconnect();
});

describe("InvoiceFlow Pro subscription sync", () => {
  it("starts a US$9 monthly subscription checkout and reuses one Stripe customer", async () => {
    const user = await owner();
    await prisma.user.updateMany({ where: { stripeCustomerId: "cus_1" }, data: { stripeCustomerId: null } });
    expect(await startCheckout(user.id)).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_1" });
    await startCheckout(user.id);
    expect(stripe.customersCreate).toHaveBeenCalledTimes(1);
    expect(stripe.customersCreate.mock.calls[0][1]).toEqual({ idempotencyKey: `invoiceflow-customer-${user.id}` });
    expect(stripe.sessionsCreate).toHaveBeenCalledTimes(2);
    expect(stripe.sessionsCreate.mock.calls[1][0]).toMatchObject({
      mode: "subscription",
      client_reference_id: user.id,
      customer: "cus_1",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 900, recurring: { interval: "month" }, product_data: { name: "InvoiceFlow Pro" } } }],
      success_url: "https://invoiceflow.example/settings?billing=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://invoiceflow.example/settings?billing=cancelled",
    });
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: null } });
  });

  it("refuses a second checkout while Pro is active", async () => {
    const user = await owner({
      stripeCustomerId: uniqueCustomer(), stripeSubscriptionId: `sub_${crypto.randomUUID()}`,
      subscriptionStatus: "active", subscriptionPeriodEnd: new Date(Date.now() + 10 * DAY),
    });
    expect(await startCheckout(user.id)).toEqual({ status: 409, error: "You already have InvoiceFlow Pro. Use Manage billing to change it." });
    expect(stripe.sessionsCreate).not.toHaveBeenCalled();
  });

  it("completes checkout only for the owner's own session", async () => {
    const customer = uniqueCustomer();
    const user = await owner({ stripeCustomerId: customer });
    const subscriptionId = `sub_${crypto.randomUUID()}`;
    stripe.sessionsRetrieve.mockResolvedValueOnce({
      id: "cs_other", mode: "subscription", client_reference_id: "someone-else", customer,
      subscription: subscription({ id: subscriptionId, customer }),
    });
    expect(await completeCheckout(user.id, "cs_other")).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).subscriptionStatus).toBeNull();

    stripe.sessionsRetrieve.mockResolvedValueOnce({
      id: "cs_own", mode: "subscription", client_reference_id: user.id, customer,
      subscription: subscription({ id: subscriptionId, customer }),
    });
    expect(await completeCheckout(user.id, "cs_own")).toBe(true);
    expect(stripe.sessionsRetrieve).toHaveBeenLastCalledWith("cs_own", { expand: ["subscription"] });
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved).toMatchObject({
      stripeSubscriptionId: subscriptionId, subscriptionStatus: "active",
      subscriptionPeriodEnd: new Date(1767225600 * 1000), subscriptionCancelAtPeriodEnd: false,
    });
  });

  it("picks up a subscription paid in a tab the owner closed", async () => {
    const customer = uniqueCustomer();
    const user = await owner({ stripeCustomerId: customer, trialEndsAt: new Date(Date.now() - DAY) });
    const future = Math.floor((Date.now() + 20 * DAY) / 1000);
    stripe.subscriptionsList.mockResolvedValue({ data: [subscription({ id: `sub_${crypto.randomUUID()}`, customer, current_period_end: future })] });
    const result = await getEntitlement(user.id);
    expect(stripe.subscriptionsList).toHaveBeenCalledWith({ customer, status: "all", limit: 1 });
    expect(result.state).toBe("pro");
  });

  it("keeps a paying user working through a Stripe outage at renewal", async () => {
    const user = await owner({
      stripeCustomerId: uniqueCustomer(), stripeSubscriptionId: `sub_${crypto.randomUUID()}`,
      subscriptionStatus: "active", subscriptionPeriodEnd: new Date(Date.now() - 60_000), trialEndsAt: new Date(Date.now() - 30 * DAY),
    });
    stripe.subscriptionsRetrieve.mockRejectedValue(new Error("Stripe is unavailable"));
    const result = await getEntitlement(user.id);
    expect(stripe.subscriptionsRetrieve).toHaveBeenCalled();
    expect(result.canCreate).toBe(true);
  });

  it("does not re-query an ended subscription", async () => {
    const user = await owner({
      stripeCustomerId: uniqueCustomer(), stripeSubscriptionId: `sub_${crypto.randomUUID()}`,
      subscriptionStatus: "canceled", subscriptionPeriodEnd: new Date(Date.now() - DAY), trialEndsAt: new Date(Date.now() - 30 * DAY),
    });
    expect((await getEntitlement(user.id)).state).toBe("ended");
    expect(stripe.subscriptionsRetrieve).not.toHaveBeenCalled();
    expect(stripe.subscriptionsList).not.toHaveBeenCalled();
  });

  it("opens the billing portal, creating a configuration that cancels at period end when none exists", async () => {
    const customer = uniqueCustomer();
    const user = await owner({ stripeCustomerId: customer });
    stripe.portalConfigurationsList.mockResolvedValue({ data: [] });
    stripe.portalConfigurationsCreate.mockResolvedValue({ id: "bpc_1" });
    expect(await openBillingPortal(user.id)).toEqual({ url: "https://billing.stripe.com/p/session/1" });
    expect(stripe.portalConfigurationsCreate.mock.calls[0][0]).toMatchObject({
      business_profile: { privacy_policy_url: "https://invoiceflow.example/privacy", terms_of_service_url: "https://invoiceflow.example/terms" },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
    expect(stripe.portalSessionsCreate).toHaveBeenCalledWith({
      customer, configuration: "bpc_1", return_url: "https://invoiceflow.example/settings?billing=portal",
    });

    const newcomer = await owner();
    expect(await openBillingPortal(newcomer.id)).toEqual({ status: 400, error: "No billing account yet. Subscribe first." });
  });
});
