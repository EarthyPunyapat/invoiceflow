import { canAcceptPayments } from "@/lib/stripe-account";
import { stripeConfigured } from "@/lib/integration-config";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

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

    // Check if user already has a Stripe account
    let stripeAccount = await prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (stripeAccount?.stripeConnectOnboardingComplete) {
      const current = await getStripe().accounts.retrieve(
        stripeAccount.stripeAccountId,
      );
      if (canAcceptPayments(current))
        return NextResponse.json(
          {
            error:
              "Stripe Connect is already ready. Refresh your payment status.",
          },
          { status: 409 },
        );
      await prisma.stripeAccount.update({
        where: { userId },
        data: { stripeConnectOnboardingComplete: false },
      });
    }

    // Create Stripe Connect account if not exists
    const stripe = getStripe();
    if (!stripeAccount) {
      const account = await stripe.accounts.create(
        {
          type: "express",
          country: process.env.STRIPE_CONNECT_COUNTRY || "US",
          metadata: { invoiceFlowUserId: userId },
          email: session.user.email ?? undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        },
        { idempotencyKey: `connect-account:${userId}` },
      );

      stripeAccount = await prisma.stripeAccount.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          stripeAccountId: account.id,
          stripeConnectOnboardingComplete: false,
        },
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.stripeAccountId,
      refresh_url: `${appUrl()}/api/stripe/connect/callback?refresh=true`,
      return_url: `${appUrl()}/api/stripe/connect/callback?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[STRIPE_CONNECT]", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect link" },
      { status: 500 },
    );
  }
}
