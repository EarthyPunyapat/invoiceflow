/** Configuration presence only; provider acceptance is checked when sending/charging. */
export function emailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
  );
}
export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
