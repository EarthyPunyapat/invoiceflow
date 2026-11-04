import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  userId: "",
  send: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  expire: vi.fn(),
  remoteInvoice: vi.fn(),
  accountRetrieve: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({
    user: { id: mocks.userId, email: "owner@example.test" },
  }),
}));
vi.mock("@/lib/resend", () => ({
  getResend: () => ({ emails: { send: mocks.send } }),
}));
vi.mock("@/lib/stripe", async () => {
  const { default: Stripe } = await import("stripe");
  const sdk = new Stripe("sk_test_fixture");
  return {
    getStripe: () => ({
      accounts: { retrieve: mocks.accountRetrieve },
      webhooks: sdk.webhooks,
      invoices: { retrieve: mocks.remoteInvoice },
      checkout: {
        sessions: {
          create: mocks.create,
          retrieve: mocks.retrieve,
          expire: mocks.expire,
        },
      },
    }),
  };
});
import { prisma } from "@/lib/prisma";
import { POST as createEstimate } from "@/app/api/estimates/route";
import { POST as createInvoice } from "@/app/api/invoices/route";
import { POST as sendInvoice } from "@/app/api/invoices/[id]/send/route";
import { POST as webhook } from "@/app/api/webhooks/stripe/route";
import { POST as convertEstimate } from "@/app/api/estimates/[id]/convert/route";
import { PATCH as changeStatus } from "@/app/api/invoices/[id]/route";
import { createInvoiceCheckout } from "@/lib/billing";
import { generateRecurringInvoice } from "@/lib/recurring-billing";
import { sendPaymentReminder } from "@/lib/email";
import { getPaymentReadiness } from "@/lib/stripe-account";
import { POST as payPublicInvoice } from "@/app/api/i/[token]/pay/route";
import { ensureShareToken } from "@/lib/invoice-share";

const sdk = new Stripe("sk_test_fixture");
let clientId: string;
const owners: string[] = [];
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const request = (path: string, body?: unknown) =>
  new NextRequest(`https://invoiceflow.example${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  });
async function invoice(status: "DRAFT" | "SENT" = "SENT") {
  const res = await createInvoice(
    request("/api/invoices", {
      clientId,
      status,
      dueDate: "2027-01-01",
      tax: 12.5,
      items: [{ description: "Design", quantity: 2, unitPrice: 5 }],
    }),
  );
  expect(res.status).toBe(201);
  return (await res.json()).invoice;
}
async function signedEvent(
  type: string,
  object: unknown,
  account = "acct_fixture",
) {
  const payload = JSON.stringify({
    id: "evt_fixture",
    object: "event",
    type,
    account,
    data: { object },
  });
  const signature = sdk.webhooks.generateTestHeaderString({
    payload,
    secret: "whsec_fixture",
  });
  return webhook(
    new NextRequest("https://invoiceflow.example/api/webhooks/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": signature },
    }),
  );
}
async function paidEvent(
  id: string,
  overrides: Record<string, unknown> = {},
  account = "acct_fixture",
) {
  return signedEvent(
    "checkout.session.completed",
    {
      id: "cs_fixture",
      client_reference_id: id,
      amount_total: 1125,
      currency: "usd",
      payment_status: "paid",
      ...overrides,
    },
    account,
  );
}

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/invoiceflow_test"
  )
    throw new Error(
      "Integration tests require the disposable local invoiceflow_test database",
    );
});
beforeEach(async () => {
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
  vi.clearAllMocks();
  mocks.accountRetrieve.mockResolvedValue({
    id: "acct_fixture",
    charges_enabled: true,
    details_submitted: true,
    country: "NZ",
    requirements: { currently_due: [] },
  });
  mocks.send.mockResolvedValue({ data: { id: "email_fixture" }, error: null });
  mocks.create.mockResolvedValue({
    id: "cs_fixture",
    url: "https://checkout.stripe.com/fixture",
  });
  mocks.retrieve.mockResolvedValue({
    id: "cs_fixture",
    status: "open",
    url: "https://checkout.stripe.com/fixture",
  });
  const user = await prisma.user.create({
    data: { email: `release-${crypto.randomUUID()}@example.test` },
  });
  owners.push(user.id);
  mocks.userId = user.id;
  const client = await prisma.client.create({
    data: { userId: user.id, name: "Client", email: "client@example.test" },
  });
  clientId = client.id;
  // Connected account IDs are unique per test; the previous fixture is removed.
  await prisma.stripeAccount.deleteMany({
    where: { stripeAccountId: "acct_fixture" },
  });
  await prisma.stripeAccount.create({
    data: {
      userId: user.id,
      stripeAccountId: "acct_fixture",
      stripeConnectOnboardingComplete: true,
    },
  });
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
  await prisma.$disconnect();
});

describe("invoice billing journey", () => {
  it("creates rounded tax totals and emails a stable public link", async () => {
    const draft = await invoice("DRAFT");
    expect(draft.total).toBe(11.25);
    const res = await sendInvoice(
      request(`/api/invoices/${draft.id}/send`),
      ctx(draft.id),
    );
    expect(res.status).toBe(200);
    const { shareUrl } = await res.json();
    expect(mocks.send.mock.calls[0][0].html).toContain(shareUrl);
    expect(shareUrl).toMatch(
      /^https:\/\/invoiceflow.example\/i\/[a-f0-9]{32}$/,
    );
    const stored = await prisma.invoice.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(stored.status).toBe("SENT");
    const tokens = await Promise.all([
      ensureShareToken(draft.id),
      ensureShareToken(draft.id),
    ]);
    expect(new Set(tokens).size).toBe(1);
  });
  it("charges the tax-inclusive total and reuses checkout on concurrent clicks", async () => {
    const inv = await invoice();
    const token = await ensureShareToken(inv.id);
    const results = await Promise.all([
      createInvoiceCheckout(token),
      createInvoiceCheckout(token),
    ]);
    expect(results.every((r) => r.url)).toBe(true);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(
      mocks.create.mock.calls[0][0].line_items[0].price_data.unit_amount,
    ).toBe(1125);
    expect(mocks.create.mock.calls[0][0].metadata.invoiceFlowId).toBe(inv.id);
    expect(mocks.create.mock.calls[0][1].stripeAccount).toBe("acct_fixture");
  });
  it("reconciles a signed checkout and deduplicates repeated confirmations", async () => {
    const inv = await invoice();
    await createInvoiceCheckout(await ensureShareToken(inv.id));
    expect((await paidEvent(inv.id)).status).toBe(200);
    expect((await paidEvent(inv.id)).status).toBe(200);
    const stored = await prisma.invoice.findUniqueOrThrow({
      where: { id: inv.id },
    });
    expect(stored.status).toBe("PAID");
    expect(stored.paidAt).not.toBeNull();
    expect(stored.paymentNotifiedAt).not.toBeNull();
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("retries a failed payment notification without losing the recorded payment", async () => {
    const inv = await invoice();
    await createInvoiceCheckout(await ensureShareToken(inv.id));
    mocks.send.mockRejectedValueOnce(new Error("temporary email outage"));
    expect((await paidEvent(inv.id)).status).toBe(500);
    expect(
      (await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } }))
        .status,
    ).toBe("PAID");
    expect((await paidEvent(inv.id)).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it.each([{ amount_total: 1000 }, { currency: "eur" }, { id: "cs_other" }])(
    "rejects mismatched payment %j",
    async (mismatch) => {
      const inv = await invoice();
      await createInvoiceCheckout(await ensureShareToken(inv.id));
      expect((await paidEvent(inv.id, mismatch)).status).toBe(500);
      expect(
        (await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } }))
          .status,
      ).toBe("SENT");
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );
  it("rejects another connected account and ignores unpaid checkout completion", async () => {
    const inv = await invoice();
    await createInvoiceCheckout(await ensureShareToken(inv.id));
    expect((await paidEvent(inv.id, {}, "acct_other")).status).toBe(500);
    expect((await paidEvent(inv.id, { payment_status: "unpaid" })).status).toBe(
      200,
    );
    expect(
      (await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } }))
        .status,
    ).toBe("SENT");
  });
  it("rejects invalid webhook signatures before changing records", async () => {
    const res = await webhook(
      new NextRequest("https://invoiceflow.example/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "bad" },
      }),
    );
    expect(res.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("ignores subscription Checkout events delivered to the payment webhook", async () => {
    // An "account"-type endpoint also receives the platform's own InvoiceFlow
    // Pro checkouts. Failing them would make Stripe retry and disable the endpoint.
    const inv = await invoice();
    const res = await signedEvent(
      "checkout.session.completed",
      { id: "cs_subscription", mode: "subscription", payment_status: "paid", client_reference_id: mocks.userId, customer: "cus_fixture" },
      null as unknown as string,
    );
    expect(res.status).toBe(200);
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } })).status).toBe("SENT");
  });
  it("allocates unique estimate numbers under concurrent creation", async () => {
    const body = {
      clientId,
      issueDate: "2027-01-01",
      expiryDate: "2027-02-01",
      items: [{ description: "Design", quantity: 1, unitPrice: 10 }],
    };
    const responses = await Promise.all([
      createEstimate(request("/api/estimates", body)),
      createEstimate(request("/api/estimates", body)),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    const estimates = await Promise.all(responses.map((r) => r.json()));
    expect(estimates[0].estimate.estimateNumber).not.toBe(
      estimates[1].estimate.estimateNumber,
    );
  });
  it("continues invoice numbering numerically after 9999", async () => {
    await prisma.user.update({
      where: { id: mocks.userId },
      data: { invoicePrefix: "ACME" },
    });
    await prisma.invoice.create({
      data: {
        userId: mocks.userId,
        clientId,
        invoiceNumber: "ACME-9999",
        subtotal: 10,
        total: 10,
        dueDate: new Date(),
      },
    });
    expect((await invoice()).invoiceNumber).toBe("ACME-10000");
    expect((await invoice()).invoiceNumber).toBe("ACME-10001");
  });
  it("allocates unique invoice numbers under concurrent creation", async () => {
    const invoices = await Promise.all([invoice(), invoice(), invoice()]);
    expect(new Set(invoices.map((i) => i.invoiceNumber)).size).toBe(3);
  });
  it("expires open checkout before manual settlement and prevents reopening paid invoices", async () => {
    const inv = await invoice();
    await createInvoiceCheckout(await ensureShareToken(inv.id));
    let res = await changeStatus(
      request(`/api/invoices/${inv.id}`, { status: "PAID" }),
      ctx(inv.id),
    );
    expect(res.status).toBe(200);
    expect(mocks.expire).toHaveBeenCalledTimes(1);
    res = await changeStatus(
      request(`/api/invoices/${inv.id}`, { status: "DRAFT" }),
      ctx(inv.id),
    );
    expect(res.status).toBe(409);
  });
  it("converts an estimate at most once during concurrent requests", async () => {
    const estimate = await prisma.estimate.create({
      data: {
        userId: mocks.userId,
        clientId,
        estimateNumber: `EST-${crypto.randomUUID()}`,
        subtotal: 10,
        total: 10,
        status: "ACCEPTED",
      },
    });
    const responses = await Promise.all([
      convertEstimate(request("/convert"), ctx(estimate.id)),
      convertEstimate(request("/convert"), ctx(estimate.id)),
    ]);
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(
      await prisma.invoice.count({ where: { userId: mocks.userId } }),
    ).toBe(1);
  });
});

describe("provider retries and collection safety", () => {
  it("sends one notification for concurrent duplicate payment events", async () => {
    const inv = await invoice();
    await createInvoiceCheckout(await ensureShareToken(inv.id));
    const results = await Promise.all([paidEvent(inv.id), paidEvent(inv.id)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("counts concurrent reminders once", async () => {
    const inv = await invoice();
    const results = await Promise.all([
      sendPaymentReminder(inv.id, "friendly", 0),
      sendPaymentReminder(inv.id, "friendly", 0),
    ]);
    expect(results.filter((r) => r.skipped)).toHaveLength(1);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(
      (await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } }))
        .reminderCount,
    ).toBe(1);
  });
  it("creates the same share token during concurrent first issuance", async () => {
    const inv = await invoice();
    const tokens = await Promise.all([
      ensureShareToken(inv.id),
      ensureShareToken(inv.id),
    ]);
    expect(tokens[0]).toEqual(tokens[1]);
  });
  it("does not create another checkout while the first payment is processing", async () => {
    const inv = await invoice();
    const token = await ensureShareToken(inv.id);
    await createInvoiceCheckout(token);
    mocks.retrieve.mockResolvedValueOnce({
      id: "cs_fixture",
      status: "complete",
    });
    expect((await createInvoiceCheckout(token)).status).toBe(409);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("uses Stripe Billing's hosted invoice instead of creating a second collection path", async () => {
    const inv = await invoice();
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { stripeInvoiceId: "in_remote" },
    });
    mocks.remoteInvoice.mockResolvedValue({
      status: "open",
      amount_remaining: 1125,
      currency: "usd",
      hosted_invoice_url: "https://invoice.stripe.com/fixture",
    });
    expect(
      (await createInvoiceCheckout(await ensureShareToken(inv.id))).url,
    ).toBe("https://invoice.stripe.com/fixture");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("retries imported invoice delivery after a temporary email outage", async () => {
    const remote = {
      id: "in_fixture",
      customer_email: "client@example.test",
      customer_name: "Client",
      status: "open",
      subtotal: 1000,
      total: 1125,
      tax: 125,
      currency: "usd",
      created: 1793520000,
      lines: {
        has_more: false,
        data: [{ description: "Design", quantity: 1, amount: 1000 }],
      },
    };
    mocks.send.mockRejectedValueOnce(new Error("temporary email outage"));
    expect((await signedEvent("invoice.finalized", remote)).status).toBe(500);
    expect((await signedEvent("invoice.finalized", remote)).status).toBe(200);
    expect((await signedEvent("invoice.finalized", remote)).status).toBe(200);
    expect(
      await prisma.invoice.count({ where: { stripeInvoiceId: "in_fixture" } }),
    ).toBe(1);
    const stored = await prisma.invoice.findUniqueOrThrow({
      where: { stripeInvoiceId: "in_fixture" },
    });
    expect(stored.invoiceEmailedAt).not.toBeNull();
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
});

describe("recurring invoice transactions", () => {
  it("generates a scheduled slot once with concurrent cron runs", async () => {
    const source = await invoice();
    const now = new Date();
    const template = await prisma.recurringInvoice.create({
      data: {
        userId: mocks.userId,
        clientId,
        sourceInvoiceId: source.id,
        name: "Monthly",
        frequency: "MONTHLY",
        nextRunAt: now,
      },
    });
    const generated = await Promise.all([
      generateRecurringInvoice(template.id, now),
      generateRecurringInvoice(template.id, now),
    ]);
    expect(generated.filter(Boolean)).toHaveLength(1);
    expect(generated.find(Boolean)?.total).toBe(11.25);
    expect(
      (
        await prisma.recurringInvoice.findUniqueOrThrow({
          where: { id: template.id },
        })
      ).nextRunAt.getTime(),
    ).toBeGreaterThan(now.getTime());
  });
  it("rejects a source invoice owned by another account", async () => {
    const source = await invoice();
    const other = await prisma.user.create({
      data: { email: `other-${crypto.randomUUID()}@example.test` },
    });
    owners.push(other.id);
    const template = await prisma.recurringInvoice.create({
      data: {
        userId: other.id,
        clientId,
        sourceInvoiceId: source.id,
        name: "Bad template",
        frequency: "MONTHLY",
        nextRunAt: new Date(),
      },
    });
    await expect(
      generateRecurringInvoice(template.id, new Date()),
    ).rejects.toThrow("another owner");
    expect(await prisma.invoice.count({ where: { userId: other.id } })).toBe(0);
  });
  it("rolls back the new invoice if advancing the schedule fails", async () => {
    const source = await invoice();
    const now = new Date();
    const template = await prisma.recurringInvoice.create({
      data: {
        userId: mocks.userId,
        clientId,
        sourceInvoiceId: source.id,
        name: "Rollback",
        frequency: "MONTHLY",
        nextRunAt: now,
      },
    });
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION test_reject_schedule() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture schedule write failure'; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER test_reject_schedule BEFORE UPDATE ON "RecurringInvoice" FOR EACH ROW EXECUTE FUNCTION test_reject_schedule()`,
    );
    try {
      await expect(
        generateRecurringInvoice(template.id, now),
      ).rejects.toThrow();
      expect(
        await prisma.invoice.count({ where: { userId: mocks.userId } }),
      ).toBe(1);
      expect(
        (
          await prisma.recurringInvoice.findUniqueOrThrow({
            where: { id: template.id },
          })
        ).nextRunAt,
      ).toEqual(now);
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER test_reject_schedule ON "RecurringInvoice"',
      );
      await prisma.$executeRawUnsafe("DROP FUNCTION test_reject_schedule()");
    }
  });
});

describe("delivery and payment readiness regressions", () => {
  it("keeps a failed initial delivery as a draft and retries the same invoice and URL", async () => {
    const draft = await invoice("DRAFT");
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: {
        name: "validation_error",
        message: "You can only send testing emails to your own email address",
      },
    });
    const failed = await sendInvoice(request("/send"), ctx(draft.id));
    expect(failed.status).toBe(502);
    expect((await failed.json()).code).toBe("EMAIL_TEST_MODE");
    const unsent = await prisma.invoice.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(unsent.status).toBe("DRAFT");
    expect(unsent.sentAt).toBeNull();
    expect(unsent.invoiceEmailedAt).toBeNull();
    expect((await sendInvoice(request("/send"), ctx(draft.id))).status).toBe(
      200,
    );
    expect(mocks.send.mock.calls[0][0].html).toEqual(
      mocks.send.mock.calls[1][0].html,
    );
    expect(mocks.send.mock.calls[0][1].idempotencyKey).toEqual(
      mocks.send.mock.calls[1][1].idempotencyKey,
    );
    expect(
      await prisma.invoice.count({ where: { userId: mocks.userId } }),
    ).toBe(1);
    expect(
      (await prisma.invoice.findUniqueOrThrow({ where: { id: draft.id } }))
        .status,
    ).toBe("SENT");
  });
  it.each([
    ["The example.test domain is not verified", "EMAIL_SENDER_UNVERIFIED"],
    ["API key is invalid", "EMAIL_CREDENTIALS_INVALID"],
  ])("explains the email provider rejection: %s", async (message, code) => {
    const draft = await invoice("DRAFT");
    mocks.send.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message },
    });
    const response = await sendInvoice(request("/send"), ctx(draft.id));
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe(code);
    expect(
      (await prisma.invoice.findUniqueOrThrow({ where: { id: draft.id } }))
        .invoiceEmailedAt,
    ).toBeNull();
  });
  it("does not mark delivery successful without a provider receipt", async () => {
    const draft = await invoice("DRAFT");
    mocks.send.mockResolvedValueOnce({ data: null, error: null });
    const response = await sendInvoice(request("/send"), ctx(draft.id));
    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe("EMAIL_NOT_ACCEPTED");
    const stored = await prisma.invoice.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(stored.status).toBe("DRAFT");
    expect(stored.invoiceEmailedAt).toBeNull();
  });
  it("reports missing email setup and never calls a provider", async () => {
    const draft = await invoice("DRAFT");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const response = await sendInvoice(request("/send"), ctx(draft.id));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("EMAIL_NOT_CONFIGURED");
    expect(mocks.send).not.toHaveBeenCalled();
    expect(
      (await prisma.invoice.findUniqueOrThrow({ where: { id: draft.id } }))
        .status,
    ).toBe("DRAFT");
  });
  it("emails an existing manually issued invoice without creating a duplicate", async () => {
    const issued = await invoice("SENT");
    expect((await sendInvoice(request("/send"), ctx(issued.id))).status).toBe(
      200,
    );
    expect(
      (await prisma.invoice.findUniqueOrThrow({ where: { id: issued.id } }))
        .invoiceEmailedAt,
    ).not.toBeNull();
    expect(
      await prisma.invoice.count({ where: { userId: mocks.userId } }),
    ).toBe(1);
  });
  it("does not email twice on a repeated initial delivery request", async () => {
    const draft = await invoice("DRAFT");
    await Promise.all([
      sendInvoice(request("/send"), ctx(draft.id)),
      sendInvoice(request("/send"), ctx(draft.id)),
    ]);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("supports explicit resend requests with stable retry keys", async () => {
    const draft = await invoice("DRAFT");
    await sendInvoice(request("/send"), ctx(draft.id));
    const requestId = crypto.randomUUID();
    await sendInvoice(request("/send", { requestId }), ctx(draft.id));
    await sendInvoice(request("/send", { requestId }), ctx(draft.id));
    expect(mocks.send).toHaveBeenCalledTimes(3);
    expect(mocks.send.mock.calls[1][1].idempotencyKey).toEqual(
      mocks.send.mock.calls[2][1].idempotencyKey,
    );
    expect(mocks.send.mock.calls[0][1].idempotencyKey).not.toEqual(
      mocks.send.mock.calls[1][1].idempotencyKey,
    );
  });
  it("repairs a stale incomplete account flag before creating Checkout", async () => {
    const inv = await invoice();
    await prisma.stripeAccount.update({
      where: { userId: mocks.userId },
      data: { stripeConnectOnboardingComplete: false },
    });
    const result = await createInvoiceCheckout(await ensureShareToken(inv.id));
    expect(result.url).toBeTruthy();
    expect(
      (
        await prisma.stripeAccount.findUniqueOrThrow({
          where: { userId: mocks.userId },
        })
      ).stripeConnectOnboardingComplete,
    ).toBe(true);
  });
  it("blocks charges when Stripe revokes readiness despite a cached connected flag", async () => {
    const inv = await invoice();
    mocks.accountRetrieve.mockResolvedValueOnce({
      id: "acct_fixture",
      charges_enabled: false,
      details_submitted: true,
    });
    const result = await createInvoiceCheckout(await ensureShareToken(inv.id));
    expect(result.status).toBe(503);
    expect(result.code).toBe("STRIPE_ONBOARDING_INCOMPLETE");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(
      (
        await prisma.stripeAccount.findUniqueOrThrow({
          where: { userId: mocks.userId },
        })
      ).stripeConnectOnboardingComplete,
    ).toBe(false);
  });
  it("reports a missing connected account before creating Checkout", async () => {
    const inv = await invoice();
    await prisma.stripeAccount.delete({ where: { userId: mocks.userId } });
    const result = await createInvoiceCheckout(await ensureShareToken(inv.id));
    expect(result.status).toBe(503);
    expect(result.code).toBe("STRIPE_NOT_CONNECTED");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("explains that online payment is unavailable while the issuer's saved account belongs to another Stripe mode", async () => {
    const inv = await invoice();
    mocks.accountRetrieve.mockRejectedValueOnce(
      new Stripe.errors.StripePermissionError({ type: "invalid_request_error", code: "account_invalid", message: "No access to account" }),
    );
    const result = await createInvoiceCheckout(await ensureShareToken(inv.id));
    expect(result.status).toBe(503);
    expect(result.code).toBe("STRIPE_NOT_CONNECTED");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("starts a new Checkout when the saved session belongs to another Stripe mode", async () => {
    const inv = await invoice();
    await prisma.invoice.update({ where: { id: inv.id }, data: { checkoutSessionId: "cs_test_old", checkoutAttempt: 1 } });
    mocks.retrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", code: "resource_missing", message: "No such checkout.session" }),
    );
    const result = await createInvoiceCheckout(await ensureShareToken(inv.id));
    expect(result).toEqual({ url: "https://checkout.stripe.com/fixture" });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
  it("reports missing deployment Stripe configuration through the public API", async () => {
    const inv = await invoice();
    const token = await ensureShareToken(inv.id);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const response = await payPublicInvoice(request("/pay"), {
      params: Promise.resolve({ token }),
    });
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("STRIPE_NOT_CONFIGURED");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refreshes owner setup status from Stripe rather than just the database", async () => {
    await prisma.stripeAccount.update({
      where: { userId: mocks.userId },
      data: { stripeConnectOnboardingComplete: false },
    });
    expect((await getPaymentReadiness(mocks.userId)).state).toBe("ready");
    mocks.accountRetrieve.mockRejectedValueOnce(
      new Error("wrong account or API mode"),
    );
    expect((await getPaymentReadiness(mocks.userId)).state).toBe("unavailable");
  });
});
