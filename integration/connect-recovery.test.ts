import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  userId: "",
  accountsCreate: vi.fn(),
  accountsRetrieve: vi.fn(),
  accountLinksCreate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: mocks.userId, email: "owner@example.test" } }) }));
vi.mock("@/lib/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe")>()),
  getStripe: () => ({
    accounts: { create: mocks.accountsCreate, retrieve: mocks.accountsRetrieve },
    accountLinks: { create: mocks.accountLinksCreate },
  }),
}));

import { prisma } from "@/lib/prisma";
import { getPaymentReadiness } from "@/lib/stripe-account";
import { GET as connectStripe } from "@/app/api/stripe/connect/route";

// What Stripe returns for an account ID the current keys cannot see, e.g. a
// test-mode account after production switched to live keys.
const otherMode = () =>
  new Stripe.errors.StripePermissionError({
    type: "invalid_request_error",
    code: "account_invalid",
    message: "The provided key does not have access to account 'acct_test_old' (or that account does not exist).",
  });
const owners: string[] = [];
const connect = () => connectStripe(new NextRequest("https://invoiceflow.example/api/stripe/connect"));

async function owner(stripeAccountId?: string, complete = true) {
  const user = await prisma.user.create({ data: { email: `connect-${crypto.randomUUID()}@example.test` } });
  owners.push(user.id);
  mocks.userId = user.id;
  if (stripeAccountId) {
    await prisma.stripeAccount.create({ data: { userId: user.id, stripeAccountId, stripeConnectOnboardingComplete: complete } });
  }
  return user;
}

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") {
    throw new Error("Connect tests require the disposable local invoiceflow_test database");
  }
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_CONNECT_COUNTRY", "");
  mocks.accountsCreate.mockImplementation(async () => ({ id: `acct_${crypto.randomUUID().slice(0, 12)}` }));
  mocks.accountLinksCreate.mockResolvedValue({ url: "https://connect.stripe.com/setup/e/fixture" });
});
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
  await prisma.$disconnect();
});

describe("Stripe Connect onboarding", () => {
  it("creates Express accounts in the platform's own country unless one is configured", async () => {
    await owner();
    expect((await connect()).status).toBe(200);
    expect(mocks.accountsCreate.mock.calls[0][0]).not.toHaveProperty("country");

    vi.stubEnv("STRIPE_CONNECT_COUNTRY", "AU");
    await owner();
    await connect();
    expect(mocks.accountsCreate.mock.calls[1][0]).toMatchObject({ country: "AU" });
  });

  it("replaces a connected account left over from another Stripe mode", async () => {
    const user = await owner(`acct_test_${crypto.randomUUID().slice(0, 8)}`, true);
    mocks.accountsRetrieve.mockRejectedValue(otherMode());
    const response = await connect();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://connect.stripe.com/setup/e/fixture" });
    const fresh = await prisma.stripeAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(fresh.stripeAccountId).toBe((await mocks.accountsCreate.mock.results[0].value).id);
    expect(fresh.stripeConnectOnboardingComplete).toBe(false);
    expect(mocks.accountLinksCreate).toHaveBeenCalledWith(expect.objectContaining({ account: fresh.stripeAccountId }));
  });

  it("replaces an unfinished account from another mode when its onboarding link fails", async () => {
    const user = await owner(`acct_test_${crypto.randomUUID().slice(0, 8)}`, false);
    mocks.accountLinksCreate.mockRejectedValueOnce(otherMode());
    expect((await connect()).status).toBe(200);
    expect(mocks.accountsCreate).toHaveBeenCalledTimes(1);
    const fresh = await prisma.stripeAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(mocks.accountLinksCreate).toHaveBeenLastCalledWith(expect.objectContaining({ account: fresh.stripeAccountId }));
  });
});

describe("payment readiness", () => {
  it("shows a leftover account from another mode as not connected, so the owner can reconnect", async () => {
    const user = await owner(`acct_test_${crypto.randomUUID().slice(0, 8)}`);
    mocks.accountsRetrieve.mockRejectedValue(otherMode());
    expect((await getPaymentReadiness(user.id)).state).toBe("not_connected");
    expect(await prisma.stripeAccount.findUnique({ where: { userId: user.id } })).toBeNull();
  });

  it("keeps the saved account when Stripe is merely unreachable", async () => {
    const user = await owner(`acct_${crypto.randomUUID().slice(0, 8)}`);
    mocks.accountsRetrieve.mockRejectedValue(new Error("connect ETIMEDOUT"));
    expect((await getPaymentReadiness(user.id)).state).toBe("unavailable");
    expect(await prisma.stripeAccount.findUnique({ where: { userId: user.id } })).not.toBeNull();
  });
});
