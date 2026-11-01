import { stripeConfigured } from "@/lib/integration-config";
import { NextRequest, NextResponse } from "next/server";
import { createInvoiceCheckout } from "@/lib/billing";
import { isValidShareToken } from "@/lib/token";
import { take } from "@/lib/rate-limit";

// ─── POST /api/i/[token]/pay ────────────────────────────────────────
//
// Public endpoint reached from /i/[token]: creates a Stripe Checkout
// Session (direct charge on the issuer's connected account).
// Gracefully degrades to 503 when Stripe is unconfigured so the public
// page never hard-fails for recipients of unconfigured issuers.

export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ token: string }> },
) {
  const params = await paramsPromise;
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
            Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)),
          ),
        },
      },
    );
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Online payment is not enabled for this invoice. Contact the issuer for payment instructions.",
        code: "STRIPE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }
  try {
    const result = await createInvoiceCheckout(token);
    if (result.error)
      return NextResponse.json(
        {
          error: result.error,
          code: "code" in result ? result.code : undefined,
        },
        { status: result.status },
      );
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("[pay]", error);
    return NextResponse.json(
      {
        error:
          "The payment service could not start checkout. Please try again or contact the issuer.",
        code: "CHECKOUT_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
}
