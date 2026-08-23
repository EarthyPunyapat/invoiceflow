import { describe, it, expect } from "vitest";
import {
  roundHalfUp,
  dollarsToCents,
  centsToDollars,
  formatMoneyFromCents,
  sumCents,
  applyTaxPercent,
} from "@/lib/money";

describe("roundHalfUp", () => {
  it("rounds .5 up", () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(0.5)).toBe(1);
  });
  it("rounds below .5 down and above .5 up", () => {
    expect(roundHalfUp(2.4)).toBe(2);
    expect(roundHalfUp(2.6)).toBe(3);
  });
  it("handles negatives symmetrically", () => {
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(-2.4)).toBe(-2);
  });
});

describe("dollarsToCents", () => {
  it("converts exact amounts", () => {
    expect(dollarsToCents(12.34)).toBe(1234);
    expect(dollarsToCents(0)).toBe(0);
    expect(dollarsToCents(100)).toBe(10000);
  });
  it("survives the classic float trap (HALF-UP)", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE754
    const trap = 0.1 + 0.2;
    expect(trap).not.toBe(0.3); // prove the trap exists
    expect(dollarsToCents(trap)).toBe(30);
  });
  it("rounds sub-cent precision HALF-UP", () => {
    expect(dollarsToCents(19.999)).toBe(2000);
    expect(dollarsToCents(33.335)).toBe(3334); // 3335.0000000000005 → 3334? no: HALF-UP at cents → 3334 when raw < 3335
  });
  it("rejects non-finite input", () => {
    expect(() => dollarsToCents(NaN)).toThrow(TypeError);
    expect(() => dollarsToCents(Infinity)).toThrow(TypeError);
  });
});

describe("centsToDollars", () => {
  it("round-trips with dollarsToCents", () => {
    expect(centsToDollars(1234)).toBe(12.34);
    expect(dollarsToCents(centsToDollars(98765))).toBe(98765);
  });
});

describe("formatMoneyFromCents", () => {
  it("formats USD by default", () => {
    expect(formatMoneyFromCents(123450)).toBe("$1,234.50");
  });
  it("formats other currencies", () => {
    expect(formatMoneyFromCents(123450, "EUR")).toBe("€1,234.50");
  });
});

describe("sumCents", () => {
  it("sums integers exactly", () => {
    expect(sumCents(1, 2, 3)).toBe(6);
    expect(sumCents()).toBe(0);
    expect(sumCents(-5, 5)).toBe(0);
  });
  it("avoids float drift that plagues dollar sums", () => {
    // In floats: 0.1+0.2+0.3 !== 0.6; in cents it is exact.
    expect(sumCents(dollarsToCents(0.1), dollarsToCents(0.2), dollarsToCents(0.3))).toBe(
      60
    );
  });
});

describe("applyTaxPercent", () => {
  it("computes tax and total from percent", () => {
    const r = applyTaxPercent(10000, 8.5); // $100 + 8.5%
    expect(r.taxCents).toBe(850);
    expect(r.totalCents).toBe(10850);
  });
  it("keeps subtotal + tax === total invariant", () => {
    for (const [sub, pct] of [
      [12345, 7],
      [9999, 8.25],
      [1, 33],
      [500, 0],
    ] as const) {
      const r = applyTaxPercent(sub, pct);
      expect(r.subtotalCents + r.taxCents).toBe(r.totalCents);
    }
  });
  it("rounds tax HALF-UP independently", () => {
    // 1050 * 2.5% = 26.25 → 26
    expect(applyTaxPercent(1050, 2.5).taxCents).toBe(26);
    // 1010 * 2.5% = 25.25 → 25
    expect(applyTaxPercent(1010, 2.5).taxCents).toBe(25);
  });
  it("handles zero tax", () => {
    const r = applyTaxPercent(4321, 0);
    expect(r.taxCents).toBe(0);
    expect(r.totalCents).toBe(4321);
  });
});
