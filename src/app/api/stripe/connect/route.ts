import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user already has a Stripe account
    let stripeAccount = await prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (stripeAccount?.stripeConnectOnboardingComplete) {
      return NextResponse.json(
        { error: "Stripe Connect already set up" },
        { status: 400 }
      );
    }

    // Create Stripe Connect account if not exists
    const stripe = getStripe();
    if (!stripeAccount) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: session.user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccount = await prisma.stripeAccount.create({
        data: {
          userId,
          stripeAccountId: account.id,
          stripeConnectOnboardingComplete: false,
        },
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccount.stripeAccountId,
      refresh_url: `${appUrl}/api/stripe/connect/callback?refresh=true`,
      return_url: `${appUrl}/api/stripe/connect/callback?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[STRIPE_CONNECT]", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect link" },
      { status: 500 }
    );
  }
}
