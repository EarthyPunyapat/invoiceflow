import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  userId: "",
  send: vi.fn(),
  checkoutCreate: vi.fn(),
  checkoutRetrieve: vi.fn(),
  accountRetrieve: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: mocks.userId, email: "owner@example.test" } }) }));
vi.mock("@/lib/resend", () => ({ getResend: () => ({ emails: { send: mocks.send } }) }));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    accounts: { retrieve: mocks.accountRetrieve },
    checkout: { sessions: { create: mocks.checkoutCreate, retrieve: mocks.checkoutRetrieve, expire: vi.fn() } },
    subscriptions: { retrieve: vi.fn(), list: vi.fn() },
  }),
}));

import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-key";
import { ensureShareToken } from "@/lib/invoice-share";
import { PAYMENT_FAILED_MESSAGE, TRIAL_ENDED_MESSAGE } from "@/lib/plan-guard";
import { POST as createInvoice } from "@/app/api/invoices/route";
import { PUT as editInvoice } from "@/app/api/invoices/[id]/route";
import { POST as sendInvoice } from "@/app/api/invoices/[id]/send/route";
import { GET as downloadPdf } from "@/app/api/invoices/[id]/pdf/route";
import { GET as exportInvoices } from "@/app/api/export/invoices/route";
import { POST as createEstimate } from "@/app/api/estimates/route";
import { POST as convertEstimate } from "@/app/api/estimates/[id]/convert/route";
import { POST as payPublicInvoice } from "@/app/api/i/[token]/pay/route";

const DAY = 86_400_000;
const owners: string[] = [];
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("https://invoiceflow.example/api/fixture", {
    method, headers: { "content-type": "application/json", ...headers }, ...(body ? { body: JSON.stringify(body) } : {}),
  });
const draft = (clientId: string) => ({
  clientId, status: "DRAFT", dueDate: "2027-01-01", currency: "USD", tax: 0,
  items: [{ description: "Design", quantity: 1, unitPrice: 100 }],
});

async function owner(data: Record<string, unknown> = {}) {
  const user = await prisma.user.create({ data: { email: `plan-${crypto.randomUUID()}@example.test`, ...data } });
  owners.push(user.id);
  const client = await prisma.client.create({ data: { userId: user.id, name: "Client", email: "client@example.test" } });
  mocks.userId = user.id;
  return { user, client };
}
async function existingInvoice(userId: string, clientId: string, status: "DRAFT" | "SENT" = "SENT") {
  return prisma.invoice.create({ data: {
    userId, clientId, invoiceNumber: `PLAN-${crypto.randomUUID()}`, status, subtotal: 100, total: 100,
    currency: "USD", dueDate: new Date("2027-01-01"),
    items: { create: [{ description: "Design", quantity: 1, unitPrice: 100, total: 100 }] },
  } });
}
const expired = { trialEndsAt: new Date(Date.now() - DAY) };

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") {
    throw new Error("Plan enforcement tests require the disposable local invoiceflow_test database");
  }
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.send.mockResolvedValue({ data: { id: "email_fixture" }, error: null });
  mocks.accountRetrieve.mockResolvedValue({ id: "acct_plan", charges_enabled: true, details_submitted: true, country: "NZ", requirements: { currently_due: [] } });
  mocks.checkoutCreate.mockResolvedValue({ id: "cs_plan", url: "https://checkout.stripe.com/plan" });
  mocks.checkoutRetrieve.mockResolvedValue({ id: "cs_plan", status: "open", url: "https://checkout.stripe.com/plan" });
});
afterAll(async () => {
  await prisma.stripeAccount.deleteMany({ where: { stripeAccountId: "acct_plan" } });
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
  await prisma.$disconnect();
});

describe("plan enforcement", () => {
  it("blocks an owner whose trial ended from creating, converting and sending", async () => {
    const { user, client } = await owner(expired);
    const invoice = await existingInvoice(user.id, client.id, "DRAFT");
    const estimate = await prisma.estimate.create({ data: {
      userId: user.id, clientId: client.id, estimateNumber: `EST-${crypto.randomUUID()}`, status: "ACCEPTED",
      subtotal: 100, total: 100, items: { create: [{ description: "Design", quantity: 1, unitPrice: 100, total: 100 }] },
    } });
    const responses = [
      await createInvoice(req("POST", draft(client.id))),
      await createEstimate(req("POST", { clientId: client.id, items: [{ description: "Design", quantity: 1, unitPrice: 100 }] })),
      await convertEstimate(req("POST", {}), ctx(estimate.id)),
      await sendInvoice(req("POST", {}), ctx(invoice.id)),
    ];
    for (const response of responses) {
      expect(response.status).toBe(402);
      expect(await response.json()).toEqual({ code: "subscription_required", error: TRIAL_ENDED_MESSAGE });
    }
    expect(await prisma.invoice.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.estimate.count({ where: { userId: user.id } })).toBe(1);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("tells a past_due owner their payment failed", async () => {
    const { client } = await owner({
      ...expired, stripeCustomerId: `cus_${crypto.randomUUID()}`, stripeSubscriptionId: `sub_${crypto.randomUUID()}`,
      subscriptionStatus: "past_due", subscriptionPeriodEnd: new Date(Date.now() + 5 * DAY),
    });
    const response = await createInvoice(req("POST", draft(client.id)));
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ code: "payment_failed", error: PAYMENT_FAILED_MESSAGE });
  });

  it("applies the same rule to API-key callers", async () => {
    const { user, client } = await owner(expired);
    const { key } = await createApiKey(user.id, "agent");
    mocks.userId = "";
    const response = await createInvoice(req("POST", draft(client.id), { authorization: `Bearer ${key}` }));
    expect(response.status).toBe(402);
  });

  it("leaves trial and Pro owners unaffected", async () => {
    const trial = await owner();
    expect((await createInvoice(req("POST", draft(trial.client.id)))).status).toBe(201);
    const pro = await owner({
      ...expired, stripeCustomerId: `cus_${crypto.randomUUID()}`, stripeSubscriptionId: `sub_${crypto.randomUUID()}`,
      subscriptionStatus: "active", subscriptionPeriodEnd: new Date(Date.now() + 20 * DAY),
    });
    expect((await createInvoice(req("POST", draft(pro.client.id)))).status).toBe(201);
  });

  it("keeps an expired owner's records and their clients' payments working", async () => {
    const { user, client } = await owner(expired);
    const invoice = await existingInvoice(user.id, client.id, "DRAFT");
    const edit = await editInvoice(req("PUT", { currency: "USD", tax: 0, items: [{ description: "Updated", quantity: 1, unitPrice: 120 }] }), ctx(invoice.id));
    expect(edit.status).toBe(200);
    expect((await downloadPdf(req("GET"), ctx(invoice.id))).status).toBe(200);
    expect((await exportInvoices(req("GET"))).status).toBe(200);

    const sent = await existingInvoice(user.id, client.id, "SENT");
    await prisma.stripeAccount.deleteMany({ where: { stripeAccountId: "acct_plan" } });
    await prisma.stripeAccount.create({ data: { userId: user.id, stripeAccountId: "acct_plan", stripeConnectOnboardingComplete: true } });
    const token = await ensureShareToken(sent.id);
    const pay = await payPublicInvoice(req("POST", {}), { params: Promise.resolve({ token }) });
    expect(pay.status).toBe(200);
    expect(await pay.json()).toMatchObject({ url: "https://checkout.stripe.com/plan" });
    expect(mocks.checkoutCreate).toHaveBeenCalledTimes(1);
  });
});
