import { beforeAll, describe, expect, it, vi } from "vitest";

const stripe = vi.hoisted(() => ({ accountsRetrieve: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ accounts: { retrieve: stripe.accountsRetrieve } }) }));

import { runHealthChecks } from "@/lib/health";

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") {
    throw new Error("Health tests require the disposable local invoiceflow_test database");
  }
});

describe("runHealthChecks", () => {
  it("reports the migrated test database and the platform's Stripe charge status", async () => {
    stripe.accountsRetrieve.mockResolvedValue({ id: "acct_platform", charges_enabled: true });
    const { ready, checks } = await runHealthChecks();
    expect(checks.database).toBe(true);
    expect(checks.migrations).toBe(true);
    expect(checks.stripeChargesEnabled).toBe(true);
    expect(ready).toBe(false); // the test environment has no live keys
  });

  it("treats a Stripe error as not ready rather than failing the check", async () => {
    stripe.accountsRetrieve.mockRejectedValue(new Error("Invalid API Key"));
    expect((await runHealthChecks()).checks.stripeChargesEnabled).toBe(false);
  });
});
