import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isValidShareToken } from "@/lib/token";
import { take } from "@/lib/rate-limit";
import { dollarsToCents } from "@/lib/money";

// ─── POST /api/i/[token]/pay ────────────────────────────────────────
//
// Public endpoint reached from /i/[token]: creates a Stripe Checkout
// Session (destination charge to the issuer's connected account).
// Gracefully degrades to 503 when Stripe is unconfigured so the public
// page never hard-fails for recipients of unconfigured issuers.

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // The token is the capability — reject malformed shapes before any DB hit.
  if (!isValidShareToken(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Rate-limit abusive hammering of this unauthenticated endpoint.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = take(`pay:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { shareToken: token },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        client: { select: { email: true } },
        user: { include: { stripeAccount: true } },
      },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const payable = invoice.status === "SENT" || invoice.status === "OVERDUE";
    if (!payable) {
      return NextResponse.json(
        { error: "This invoice is not payable online." },
        { status: 400 }
      );
    }

    // Graceful degradation: issuer hasn't finished (or started) Stripe
    // Connect onboarding, or the platform key is missing entirely.
    const account = invoice.user.stripeAccount;
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !account?.stripeConnectOnboardingComplete
    ) {
      return NextResponse.json(
        {
          error:
            "Online payments are not available for this invoice yet. Please contact the issuer.",
        },
        { status: 503 }
      );
    }

    if (invoice.items.length === 0) {
      return NextResponse.json(
        { error: "This invoice has no payable items." },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: invoice.id,
        customer_email: invoice.client.email || undefined,
        line_items: invoice.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: invoice.currency.toLowerCase(),
            unit_amount: dollarsToCents(item.unitPrice),
            // Stripe requires product_data.name; description goes to
            // the checkout line item display via name + description pair.
            product_data: {
              name:
                item.description || `Invoice ${invoice.invoiceNumber}`,
              description: item.description || undefined,
            },
          },
        })),
        success_url: `${origin}/i/${token}?paid=1`,
        cancel_url: `${origin}/i/${token}`,
      },
      { stripeAccount: account.stripeAccountId }
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[pay]", message);
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 }
    );
  }
}
