import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        `${appUrl}/login?error=unauthorized`
      );
    }

    const userId = session.user.id;
    const searchParams = req.nextUrl.searchParams;
    const success = searchParams.get("success") === "true";

    const stripeAccount = await prisma.stripeAccount.findUnique({
      where: { userId },
    });

    if (!stripeAccount) {
      return NextResponse.redirect(
        `${appUrl}/settings?error=no_stripe_account`
      );
    }

    if (success) {
      // Verify the account is fully onboarded
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(
        stripeAccount.stripeAccountId
      );

      if (account.charges_enabled) {
        await prisma.stripeAccount.update({
          where: { userId },
          data: { stripeConnectOnboardingComplete: true },
        });

        return NextResponse.redirect(
          `${appUrl}/settings?stripe=connected`
        );
      }
    }

    // Refresh or incomplete — redirect accordingly
    return NextResponse.redirect(
      `${appUrl}/settings?stripe=pending`
    );
  } catch (error) {
    console.error("[STRIPE_CONNECT_CALLBACK]", error);
    return NextResponse.redirect(
      `${appUrl}/settings?error=stripe_callback_failed`
    );
  }
}
