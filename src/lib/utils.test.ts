/**
 * Unit tests for src/lib/utils.ts
 * Pure-logic coverage only: cn(), formatCurrency(), formatDate().
 */
import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
  });

  it("drops falsy values (conditional classes)", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("passes through a single class unchanged", () => {
    expect(cn("solo")).toBe("solo");
  });

  it("returns empty string when given nothing truthy", () => {
    expect(cn(false, undefined)).toBe("");
  });
});

describe("formatCurrency", () => {
  it("formats USD by default in en-US style", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats other currencies via their symbol", () => {
    expect(formatCurrency(1234.5, "EUR")).toBe("€1,234.50");
  });

  it("handles zero and negative amounts", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(-42)).toBe("-$42.00");
  });
});

describe("formatDate", () => {
  // Constructed with local-time args so the assertion is timezone-safe.
  const expected = { month: "Aug", year: "2026" };

  it("accepts a Date instance", () => {
    const out = formatDate(new Date(2026, 7, 15));
    expect(out).toContain(expected.month);
    expect(out).toContain(expected.year);
  });

  it("accepts an ISO date string", () => {
    const out = formatDate("2026-08-15T12:00:00Z");
    expect(out).toContain(expected.month);
    expect(out).toContain(expected.year);
  });

  it("includes the day number", () => {
    expect(formatDate(new Date(2026, 7, 15))).toMatch(/\b15\b/);
  });
});
