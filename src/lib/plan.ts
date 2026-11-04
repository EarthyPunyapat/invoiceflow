/**
 * InvoiceFlow Pro entitlement rules (spec D1, D2, D6). Pure: no database or
 * Stripe access, so every rule is unit-tested with fixed dates.
 */

export const TRIAL_DAYS = 14;

export const PRO_PLAN = {
  name: "InvoiceFlow Pro",
  amountCents: 900,
  currency: "usd",
  interval: "month",
  label: "US$9/month",
} as const;

export type PlanUser = {
  createdAt: Date;
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: Date | null;
  subscriptionCancelAtPeriodEnd: boolean;
};

/** Prisma `select` for exactly the fields a PlanUser needs. */
export const PLAN_USER_SELECT = {
  createdAt: true,
  trialEndsAt: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  subscriptionStatus: true,
  subscriptionPeriodEnd: true,
  subscriptionCancelAtPeriodEnd: true,
} as const;

export type PlanState = "trial" | "pro" | "past_due" | "ended";

export type Entitlement = {
  state: PlanState;
  canCreate: boolean;
  trialEndsAt: Date;
  trialDaysLeft: number;
  activeUntil: Date | null;
  cancelsAtPeriodEnd: boolean;
};

const DAY_MS = 86_400_000;
const ENTITLED = new Set(["active", "trialing"]);
const PAYMENT_FAILED = new Set(["past_due", "unpaid"]);
const TERMINAL = new Set(["canceled", "incomplete_expired"]);

function trialEnd(user: PlanUser): Date {
  return user.trialEndsAt ?? new Date(user.createdAt.getTime() + TRIAL_DAYS * DAY_MS);
}

export function entitlement(user: PlanUser, now: Date): Entitlement {
  const trialEndsAt = trialEnd(user);
  const trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY_MS));
  const shared = { trialEndsAt, trialDaysLeft, cancelsAtPeriodEnd: user.subscriptionCancelAtPeriodEnd };
  const periodEnd = user.subscriptionPeriodEnd;

  if (user.subscriptionStatus && ENTITLED.has(user.subscriptionStatus) && periodEnd && periodEnd > now) {
    return { ...shared, state: "pro", canCreate: true, activeUntil: periodEnd };
  }
  if (now < trialEndsAt) return { ...shared, state: "trial", canCreate: true, activeUntil: null };
  if (user.subscriptionStatus && PAYMENT_FAILED.has(user.subscriptionStatus)) {
    return { ...shared, state: "past_due", canCreate: false, activeUntil: null };
  }
  return { ...shared, state: "ended", canCreate: false, activeUntil: null };
}

/** Whether Stripe could know something the cached fields do not (spec D4). */
export function needsRefresh(user: PlanUser, now: Date): boolean {
  if (!user.stripeCustomerId) return false;
  if (user.stripeSubscriptionId) {
    if (user.subscriptionStatus && TERMINAL.has(user.subscriptionStatus)) return false;
    return !user.subscriptionPeriodEnd || user.subscriptionPeriodEnd <= now;
  }
  return !entitlement(user, now).canCreate;
}
