import type Stripe from "stripe";
import { prisma } from "./prisma";
import { getStripe } from "./stripe";
import { stripeConfigured } from "./integration-config";
import { isUnknownToStripe } from "./stripe-errors";

export const canAcceptPayments = (
  account: Pick<Stripe.Account, "charges_enabled" | "details_submitted">,
) => account.charges_enabled && account.details_submitted;
export type PaymentReadiness = {
  state:
    | "not_configured"
    | "not_connected"
    | "onboarding"
    | "pending"
    | "ready"
    | "unavailable";
  message: string;
  country?: string;
};
export async function getPaymentReadiness(
  userId: string,
): Promise<PaymentReadiness> {
  if (!stripeConfigured())
    return {
      state: "not_configured",
      message:
        "Online payments are not configured for this deployment. The deployment administrator needs to configure Stripe.",
    };
  const saved = await prisma.stripeAccount.findUnique({ where: { userId } });
  if (!saved)
    return {
      state: "not_connected",
      message: "Connect your Stripe account to accept online invoice payments.",
    };
  try {
    const account = await getStripe().accounts.retrieve(saved.stripeAccountId);
    const ready = canAcceptPayments(account);
    if (saved.stripeConnectOnboardingComplete !== ready)
      await prisma.stripeAccount.update({
        where: { userId },
        data: { stripeConnectOnboardingComplete: ready },
      });
    if (ready)
      return {
        state: "ready",
        message: "Your Stripe account can accept invoice payments.",
        country: account.country,
      };
    const pending =
      account.details_submitted && !account.requirements?.currently_due?.length;
    return {
      state: pending ? "pending" : "onboarding",
      message: pending
        ? "Stripe is reviewing your account. Payments will be available when Stripe enables charges."
        : "Finish the required details in Stripe before clients can pay online.",
      country: account.country,
    };
  } catch (error) {
    if (isUnknownToStripe(error)) {
      // e.g. a test-mode account after live keys were configured: let the
      // owner connect a new account instead of being stuck on this one.
      await prisma.stripeAccount.deleteMany({ where: { userId, stripeAccountId: saved.stripeAccountId } });
      return {
        state: "not_connected",
        message: "Connect your Stripe account to accept online invoice payments.",
      };
    }
    return {
      state: "unavailable",
      message:
        "Stripe account status could not be checked. Confirm the configured Stripe key and account use the same test or live mode, then refresh.",
    };
  }
}
