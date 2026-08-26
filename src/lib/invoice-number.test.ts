import { describe, it, expect } from "vitest";
import {
  monthPrefix,
  nextSequence,
  sanitizeInvoicePrefix,
  nextInvoiceNumber,
} from "@/lib/invoice-number";

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

describe("sanitizeInvoicePrefix", () => {
  it("accepts a valid prefix unchanged", () => {
    expect(sanitizeInvoicePrefix("ACME")).toBe("ACME");
    expect(sanitizeInvoicePrefix("ACME-2026")).toBe("ACME-2026");
    expect(sanitizeInvoicePrefix("CO_1")).toBe("CO_1");
  });

  it("uppercases and strips lowercase input plus spaces", () => {
    expect(sanitizeInvoicePrefix("acme corp")).toBe("ACMECORP");
    expect(sanitizeInvoicePrefix("  law  firm ")).toBe("LAWFIRM");
  });

  it("strips characters outside [A-Z0-9-_]", () => {
    expect(sanitizeInvoicePrefix('Acme&Co!"§$')).toBe("ACMECO");
    expect(sanitizeInvoicePrefix("///")).toBeNull(); // nothing survives → default scheme
  });

  it("truncates a 20-char prefix to 12 chars", () => {
    expect(sanitizeInvoicePrefix("ABCDEFGHIJKLMNOPQR")).toBe("ABCDEFGHIJKL");
  });

  it("falls back to null (default scheme) for empty or whitespace-only", () => {
    expect(sanitizeInvoicePrefix(null)).toBeNull();
    expect(sanitizeInvoicePrefix(undefined)).toBeNull();
    expect(sanitizeInvoicePrefix("")).toBeNull();
    expect(sanitizeInvoicePrefix("   ")).toBeNull();
  });
});

describe("nextInvoiceNumber", () => {
  const AUG_2026 = new Date(2026, 7, 23);

  it("uses the custom prefix with zero-padded sequence (pad 4)", () => {
    expect(
      nextInvoiceNumber({ prefix: "ACME", date: AUG_2026, lastNumber: null })
    ).toBe("ACME-0001");
    expect(
      nextInvoiceNumber({
        prefix: "ACME",
        date: AUG_2026,
        lastNumber: "ACME-0009",
      })
    ).toBe("ACME-0010");
  });

  it("keeps the default INV-YYYYMM-XXXX scheme when no prefix", () => {
    expect(
      nextInvoiceNumber({ prefix: null, date: AUG_2026, lastNumber: null })
    ).toBe("INV-202608-0001");
    expect(
      nextInvoiceNumber({
        prefix: undefined,
        date: AUG_2026,
        lastNumber: "INV-202608-0009",
      })
    ).toBe("INV-202608-0010");
  });

  it("sanitizes before composing (lowercase/spaces never reach the number)", () => {
    expect(
      nextInvoiceNumber({
        prefix: "acme llc",
        date: AUG_2026,
        lastNumber: "ACMELLC-0041",
      })
    ).toBe("ACMELLC-0042");
  });

  it("mixed usage: same inputs under different schemes stay independent", () => {
    const custom = nextInvoiceNumber({
      prefix: "ACME",
      date: AUG_2026,
      lastNumber: "ACME-0003",
    });
    const deflt = nextInvoiceNumber({
      prefix: null,
      date: AUG_2026,
      lastNumber: "INV-202608-0007",
    });
    expect(custom).toBe("ACME-0004");
    expect(deflt).toBe("INV-202608-0008");
  });
});
