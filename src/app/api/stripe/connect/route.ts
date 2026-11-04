import { canAcceptPayments } from "@/lib/stripe-account";
import { stripeConfigured } from "@/lib/integration-config";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { isUnknownToStripe } from "@/lib/stripe-errors";

export const dynamic = "force-dynamic";

import { appUrl } from "@/lib/app-url";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!stripeConfigured())
      return NextResponse.json(
        {
          error:
            "Online payments are not configured for this deployment. Configure Stripe before connecting an account.",
        },
        { status: 503 },
      );

    const stripe = getStripe();
    // Replaces the saved account when `replacing` is given: an account Stripe
    // does not know under the current keys (e.g. created with test keys).
    const createAccount = async (replacing?: string) => {
      const country = process.env.STRIPE_CONNECT_COUNTRY?.trim();
      const account = await stripe.accounts.create(
        {
          type: "express",
          // Without a configured country Stripe uses the platform's own.
          ...(country ? { country } : {}),
          metadata: { invoiceFlowUserId: userId },
          email: session.user!.email ?? undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        },
        { idempotencyKey: replacing ? `connect-account:${userId}:after:${replacing}` : `connect-account:${userId}` },
      );
      return prisma.stripeAccount.upsert({
        where: { userId },
        // A concurrent first request keeps whichever account was saved first.
        update: replacing ? { stripeAccountId: account.id, stripeConnectOnboardingComplete: false } : {},
        create: { userId, stripeAccountId: account.id, stripeConnectOnboardingComplete: false },
      });
    };
    const onboardingLink = (account: string) =>
      stripe.accountLinks.create({
        account,
        refresh_url: `${appUrl()}/api/stripe/connect/callback?refresh=true`,
        return_url: `${appUrl()}/api/stripe/connect/callback?success=true`,
        type: "account_onboarding",
      });

    let stripeAccount = await prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (stripeAccount?.stripeConnectOnboardingComplete) {
      const current = await stripe.accounts
        .retrieve(stripeAccount.stripeAccountId)
        .catch((error: unknown) => {
          if (isUnknownToStripe(error)) return null;
          throw error;
        });
      if (!current) {
        stripeAccount = await createAccount(stripeAccount.stripeAccountId);
      } else if (canAcceptPayments(current)) {
        return NextResponse.json(
          {
            error:
              "Stripe Connect is already ready. Refresh your payment status.",
          },
          { status: 409 },
        );
      } else {
        await prisma.stripeAccount.update({
          where: { userId },
          data: { stripeConnectOnboardingComplete: false },
        });
      }
    }

    if (!stripeAccount) stripeAccount = await createAccount();

    let accountLink;
    try {
      accountLink = await onboardingLink(stripeAccount.stripeAccountId);
    } catch (error) {
      if (!isUnknownToStripe(error)) throw error;
      stripeAccount = await createAccount(stripeAccount.stripeAccountId);
      accountLink = await onboardingLink(stripeAccount.stripeAccountId);
    }

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[STRIPE_CONNECT]", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect link" },
      { status: 500 },
    );
  }
}
