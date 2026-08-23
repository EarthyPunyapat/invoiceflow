// ─── In-memory token bucket rate limiter ──────────────────────────
//
// Simple fixed-window bucket keyed by arbitrary string (e.g. IP or
// route+ip). Suitable for single-instance deployments; swap for a
// distributed store (Redis) when running multi-instance.

interface Bucket {
  count: number;
  windowStart: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when the current window resets */
  resetAt: number;
}

/**
 * Consume one token for `key`. Allows at most `limit` requests per
 * `windowMs`. Expired buckets are reset lazily on access.
 */
export function take(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return {
      allowed: true,
      remaining: limit - bucket.count,
      resetAt: bucket.windowStart + windowMs,
    };
  }

  return { allowed: false, remaining: 0, resetAt: bucket.windowStart + windowMs };
}

/** Test helper: clear all buckets. */
export function resetRateLimitStore(): void {
  store.clear();
}
