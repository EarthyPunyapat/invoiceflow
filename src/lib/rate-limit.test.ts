import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { take, resetRateLimitStore } from "./rate-limit";

describe("rate-limit token bucket", () => {
  beforeEach(() => {
    resetRateLimitStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", () => {
    const results = [take("ip1", 3, 60_000), take("ip1", 3, 60_000), take("ip1", 3, 60_000)];
    expect(results.map((r) => r.allowed)).toEqual([true, true, true]);
    expect(results[2].remaining).toBe(0);
  });

  it("blocks requests over the limit within the window", () => {
    take("ip1", 2, 60_000);
    take("ip1", 2, 60_000);
    const blocked = take("ip1", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    take("ip1", 1, 1_000);
    expect(take("ip1", 1, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    const fresh = take("ip1", 1, 1_000);
    expect(fresh.allowed).toBe(true);
    expect(fresh.remaining).toBe(0);
  });

  it("isolates keys independently", () => {
    expect(take("a", 1, 60_000).allowed).toBe(true);
    expect(take("b", 1, 60_000).allowed).toBe(true);
    expect(take("a", 1, 60_000).allowed).toBe(false);
    expect(take("b", 1, 60_000).allowed).toBe(false);
  });

  it("reports resetAt as a future epoch timestamp", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const result = take("c", 5, 30_000);
    expect(result.resetAt).toBe(now + 30_000);
  });
});
