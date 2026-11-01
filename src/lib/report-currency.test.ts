import { describe, expect, it } from "vitest";
import { normalizeReportCurrency, reportCurrencyOptions, selectReportCurrency } from "./report-currency";

describe("report currency selection", () => {
  it("normalizes recognized currencies and rejects invalid or ambiguous requests", () => {
    expect(normalizeReportCurrency(" eur ")).toBe("EUR");
    for (const invalid of ["US", "USD<script>", "ZZZ", ["USD", "EUR"], null]) {
      expect(normalizeReportCurrency(invalid)).toBeNull();
    }
  });
  it("only offers distinct valid currencies from existing invoices", () => {
    expect(reportCurrencyOptions(["EUR", "usd", "EUR", "ZZZ", "GBP"])).toEqual(["EUR", "GBP", "USD"]);
  });
  it("selects an existing requested currency with deterministic defaults", () => {
    expect(selectReportCurrency("eur", ["USD", "EUR"])).toBe("EUR");
    expect(selectReportCurrency("GBP", ["USD", "EUR"])).toBe("USD");
    expect(selectReportCurrency(undefined, ["GBP", "EUR"])).toBe("EUR");
    expect(selectReportCurrency(undefined, [])).toBe("USD");
  });
});
