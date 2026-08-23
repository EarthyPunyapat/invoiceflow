import { describe, it, expect } from "vitest";
import { monthPrefix, nextSequence } from "@/lib/invoice-number";

describe("monthPrefix", () => {
  it("formats INV-YYYYMM for a mid-year date", () => {
    expect(monthPrefix(new Date(2026, 7, 23))).toBe("INV-202608"); // Aug 2026
  });

  it("zero-pads single-digit months", () => {
    expect(monthPrefix(new Date(2026, 0, 5))).toBe("INV-202601"); // Jan
    expect(monthPrefix(new Date(2026, 2, 15))).toBe("INV-202603"); // Mar
  });

  it("rolls over correctly at year boundaries", () => {
    expect(monthPrefix(new Date(2027, 0, 1))).toBe("INV-202701");
    expect(monthPrefix(new Date(2026, 11, 31))).toBe("INV-202612");
  });
});

describe("nextSequence", () => {
  it("returns 1 when there is no previous invoice", () => {
    expect(nextSequence(null)).toBe(1);
    expect(nextSequence("")).toBe(1); // no parseable trailing segment
  });

  it("increments the trailing sequence (0009 → 0010 rollover)", () => {
    expect(nextSequence("INV-202608-0009")).toBe(10);
    expect(nextSequence("INV-202608-0001")).toBe(2);
  });

  it("returns 1 when the trailing segment is not numeric", () => {
    expect(nextSequence("INV-202608-ABCD")).toBe(1);
  });
});
