import { describe, expect, it } from "vitest";
import { currencySchema } from "./shared";
import { invoiceCreateSchema } from "./invoices";
import { estimateCreateSchema } from "./estimates";

describe("financial document currencies", () => {
  it("normalizes recognized codes and keeps the USD default", () => {
    expect(currencySchema.parse(" eur ")).toBe("EUR");
    expect(currencySchema.parse("JPY")).toBe("JPY");
    expect(currencySchema.parse(undefined)).toBe("USD");
  });
  it("rejects unrecognized three-letter codes before they can disappear from reporting", () => {
    for (const code of ["ZZZ", "ABC", "bad", "US", "USD<script>"]) expect(currencySchema.safeParse(code).success).toBe(false);
    const common = { clientId: "fixture", currency: "ZZZ", items: [{ description: "Design", quantity: 1, unitPrice: 10 }] };
    expect(invoiceCreateSchema.safeParse({ ...common, dueDate: "2027-01-01" }).success).toBe(false);
    expect(estimateCreateSchema.safeParse({ ...common, issueDate: "2027-01-01", expiryDate: "2027-02-01" }).success).toBe(false);
  });
});
