/**
 * True when Stripe says an ID does not exist for the current keys: an object
 * from the other mode (test vs live) or another account. Unlike a network or
 * outage error, retrying can never succeed, so the stored ID must be replaced.
 */
export function isUnknownToStripe(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "resource_missing" || code === "account_invalid";
}
