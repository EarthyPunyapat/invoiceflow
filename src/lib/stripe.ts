import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      timeout: 10_000,
      maxNetworkRetries: 1,
    });
  }
  return _stripe;
}
