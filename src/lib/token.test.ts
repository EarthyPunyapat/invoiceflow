import { describe, it, expect } from "vitest";
import { generateShareToken, isValidShareToken } from "./token";

describe("generateShareToken", () => {
  it("produces 32 hex chars (128 bits)", () => {
    const t = generateShareToken();
    expect(t).toMatch(/^[a-f0-9]{32}$/);
  });

  it("is unique across generations", () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateShareToken()));
    expect(tokens.size).toBe(1000);
  });
});

describe("isValidShareToken", () => {
  it("accepts well-formed tokens", () => {
    expect(isValidShareToken(generateShareToken())).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isValidShareToken(null)).toBe(false);
    expect(isValidShareToken(undefined)).toBe(false);
    expect(isValidShareToken("")).toBe(false);
    expect(isValidShareToken("short")).toBe(false);
    // uppercase and non-hex are rejected
    expect(isValidShareToken("A".repeat(32))).toBe(false);
    expect(isValidShareToken("z".repeat(32))).toBe(false);
    // right charset, wrong length
    expect(isValidShareToken("a".repeat(31))).toBe(false);
  });
});
