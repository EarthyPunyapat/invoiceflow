import { describe, it, expect } from "vitest";
import {
  clientCreateSchema,
  clientUpdateSchema,
  invoiceCreateSchema,
  invoiceStatusUpdateSchema,
  estimateCreateSchema,
  estimateStatusUpdateSchema,
} from "@/lib/validators";

const validInvoice = {
  clientId: "clx_123",
  items: [{ description: "Design", quantity: 2, unitPrice: 75 }],
  dueDate: "2026-09-30T00:00:00.000Z",
};

describe("clientCreateSchema", () => {
  it("accepts a minimal client and normalises whitespace", () => {
    const parsed = clientCreateSchema.parse({
      name: "  Acme Co  ",
      email: " billing@acme.io ",
    });
    expect(parsed.name).toBe("Acme Co");
    expect(parsed.email).toBe("billing@acme.io");
  });

  it("rejects missing name or bad email", () => {
    expect(clientCreateSchema.safeParse({ email: "x@y.z" }).success).toBe(false);
    expect(
      clientCreateSchema.safeParse({ name: "A", email: "not-an-email" }).success
    ).toBe(false);
  });
});

describe("clientUpdateSchema", () => {
  it("accepts any non-empty partial", () => {
    expect(clientUpdateSchema.safeParse({ phone: "+1 555 0100" }).success).toBe(
      true
    );
    expect(clientUpdateSchema.safeParse({ company: null }).success).toBe(true);
  });

  it("rejects an empty patch with the route's legacy message", () => {
    const result = clientUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("No fields to update");
    }
  });
});

describe("invoiceCreateSchema", () => {
  it("applies defaults (status DRAFT, currency USD, tax 0)", () => {
    const parsed = invoiceCreateSchema.parse(validInvoice);
    expect(parsed.status).toBe("DRAFT");
    expect(parsed.currency).toBe("USD");
    expect(parsed.tax).toBe(0);
    expect(parsed.dueDate).toBeInstanceOf(Date);
  });

  it("uppercases 3-letter currency codes", () => {
    expect(invoiceCreateSchema.parse({ ...validInvoice, currency: "eur" }).currency).toBe(
      "EUR"
    );
  });

  it("rejects empty items, bad enums and unknown keys", () => {
    expect(
      invoiceCreateSchema
        .safeParse({ ...validInvoice, items: [] })
        .success
    ).toBe(false);
    expect(
      invoiceCreateSchema.safeParse({ ...validInvoice, status: "WEIRD" }).success
    ).toBe(false);
    // client-supplied totals must never pass
    expect(
      invoiceCreateSchema.safeParse({ ...validInvoice, total: 999 }).success
    ).toBe(false);
    expect(
      invoiceCreateSchema
        .safeParse({ ...validInvoice, items: [{ description: "", quantity: 1, unitPrice: 1 }] })
        .success
    ).toBe(false);
  });
});

describe("invoiceStatusUpdateSchema", () => {
  it("accepts legal statuses only", () => {
    expect(invoiceStatusUpdateSchema.safeParse({ status: "PAID" }).success).toBe(true);
    expect(invoiceStatusUpdateSchema.safeParse({ status: "sent" }).success).toBe(false);
    expect(invoiceStatusUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("estimateCreateSchema", () => {
  const base = {
    clientId: "clx_9",
    items: [{ description: "Prototype", quantity: 1, unitPrice: 1200 }],
    issueDate: "2026-08-01T00:00:00.000Z",
    expiryDate: "2026-08-31T00:00:00.000Z",
  };

  it("accepts a well-formed estimate with defaults", () => {
    const parsed = estimateCreateSchema.parse(base);
    expect(parsed.status).toBe("DRAFT");
    expect(parsed.currency).toBe("USD");
    expect(parsed.issueDate).toBeInstanceOf(Date);
  });

  it("rejects expiry before issue, pointing at expiryDate", () => {
    const result = estimateCreateSchema.safeParse({
      ...base,
      expiryDate: "2026-07-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["expiryDate"]);
    }
  });

  it("allows same-day expiry", () => {
    expect(
      estimateCreateSchema.safeParse({ ...base, expiryDate: base.issueDate }).success
    ).toBe(true);
  });
});

describe("estimateStatusUpdateSchema", () => {
  it("accepts legal statuses only", () => {
    expect(estimateStatusUpdateSchema.safeParse({ status: "ACCEPTED" }).success).toBe(true);
    expect(estimateStatusUpdateSchema.safeParse({ status: "PAID" }).success).toBe(false);
  });
});
