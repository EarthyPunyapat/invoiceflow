import { describe, expect, it } from "vitest";
import { entitlement, needsRefresh, type PlanUser } from "./plan";

const base: PlanUser = {
  createdAt: new Date("2026-11-04T00:00:00Z"),
  trialEndsAt: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionStatus: null,
  subscriptionPeriodEnd: null,
  subscriptionCancelAtPeriodEnd: false,
};

describe("entitlement", () => {
  it("gives a new account 14 days of trial", () => {
    expect(entitlement(base, new Date("2026-11-10T00:00:00Z"))).toMatchObject({
      state: "trial", canCreate: true, trialDaysLeft: 8, trialEndsAt: new Date("2026-11-18T00:00:00Z"),
    });
  });

  it("prefers the launch backfill over sign-up date", () => {
    const user = { ...base, createdAt: new Date("2026-01-01T00:00:00Z"), trialEndsAt: new Date("2026-11-18T00:00:00Z") };
    expect(entitlement(user, new Date("2026-11-10T00:00:00Z")).state).toBe("trial");
  });

  it("ends the trial exactly at trialEndsAt", () => {
    expect(entitlement(base, new Date("2026-11-18T00:00:00Z"))).toMatchObject({ state: "ended", canCreate: false, trialDaysLeft: 0 });
  });

  it("treats active and trialing subscriptions with a future period end as Pro", () => {
    for (const subscriptionStatus of ["active", "trialing"]) {
      const user = { ...base, subscriptionStatus, subscriptionPeriodEnd: new Date("2026-12-10T00:00:00Z") };
      expect(entitlement(user, new Date("2026-12-01T00:00:00Z")), subscriptionStatus).toMatchObject({
        state: "pro", canCreate: true, activeUntil: new Date("2026-12-10T00:00:00Z"),
      });
    }
  });

  it("does not trust a cached active status after its period end", () => {
    const user = { ...base, subscriptionStatus: "active", subscriptionPeriodEnd: new Date("2026-11-30T00:00:00Z") };
    expect(entitlement(user, new Date("2026-12-01T00:00:00Z")).state).toBe("ended");
  });

  it("reports failed payments separately", () => {
    for (const subscriptionStatus of ["past_due", "unpaid"]) {
      expect(entitlement({ ...base, subscriptionStatus }, new Date("2026-12-01T00:00:00Z")), subscriptionStatus)
        .toMatchObject({ state: "past_due", canCreate: false });
    }
  });

  it("keeps a cancelled subscription active until its period ends", () => {
    const user = { ...base, subscriptionStatus: "active", subscriptionCancelAtPeriodEnd: true, subscriptionPeriodEnd: new Date("2026-12-10T00:00:00Z") };
    expect(entitlement(user, new Date("2026-12-01T00:00:00Z"))).toMatchObject({ state: "pro", cancelsAtPeriodEnd: true });
  });
});

describe("needsRefresh", () => {
  it("refreshes only when Stripe could have something new", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    const past = new Date("2026-11-30T00:00:00Z");
    const future = new Date("2026-12-10T00:00:00Z");
    const customer = { ...base, stripeCustomerId: "cus_1" };
    expect(needsRefresh(base, now)).toBe(false);
    expect(needsRefresh({ ...customer, stripeSubscriptionId: "sub_1", subscriptionStatus: "active", subscriptionPeriodEnd: future }, now)).toBe(false);
    expect(needsRefresh({ ...customer, stripeSubscriptionId: "sub_1", subscriptionStatus: "active", subscriptionPeriodEnd: past }, now)).toBe(true);
    expect(needsRefresh({ ...customer, stripeSubscriptionId: "sub_1", subscriptionStatus: "canceled", subscriptionPeriodEnd: past }, now)).toBe(false);
    expect(needsRefresh(customer, now)).toBe(true); // trial over; checkout may have completed in a closed tab
    expect(needsRefresh(customer, new Date("2026-11-10T00:00:00Z"))).toBe(false);
  });
});
