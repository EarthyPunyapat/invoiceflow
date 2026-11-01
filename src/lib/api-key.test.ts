import { describe, expect, it } from "vitest";
import {
  API_KEY_PREFIX,
  bearerFrom,
  hashApiKey,
  looksLikeApiKey,
  publicPrefix,
} from "./api-key";

describe("api keys", () => {
  it("hashes deterministically and with full entropy", () => {
    const k = API_KEY_PREFIX + "a".repeat(64);
    expect(hashApiKey(k)).toBe(hashApiKey(k));
    expect(hashApiKey(k)).toHaveLength(64);
    // hash must not contain the secret
    expect(hashApiKey(k)).not.toContain("aaaa");
  });

  it("rejects malformed keys", () => {
    expect(looksLikeApiKey("")).toBe(false);
    expect(looksLikeApiKey("ifk_")).toBe(false);
    expect(looksLikeApiKey("sk_live_" + "a".repeat(64))).toBe(false);
    expect(looksLikeApiKey(API_KEY_PREFIX + "short")).toBe(false);
    expect(looksLikeApiKey(API_KEY_PREFIX + "a".repeat(60) + "!")).toBe(false);
  });

  it("accepts a well-formed key", () => {
    expect(looksLikeApiKey(API_KEY_PREFIX + "a".repeat(64))).toBe(true);
  });

  it("derives a non-secret prefix that never spans the whole key", () => {
    const raw = API_KEY_PREFIX + "0123456789abcdef".repeat(4);
    const p = publicPrefix(raw);
    expect(p).toBe(API_KEY_PREFIX + "01234567");
    expect(raw.startsWith(p)).toBe(true);
    expect(p.length).toBeLessThan(raw.length);
  });

  it("parses bearer headers case-insensitively and rejects others", () => {
    expect(bearerFrom("Bearer ifk_abc")).toBe("ifk_abc");
    expect(bearerFrom("bearer ifk_abc")).toBe("ifk_abc");
    expect(bearerFrom("  Bearer   ifk_abc  ")).toBe("ifk_abc");
    expect(bearerFrom("Basic abc")).toBeNull();
    expect(bearerFrom(null)).toBeNull();
    expect(bearerFrom("")).toBeNull();
  });
});
