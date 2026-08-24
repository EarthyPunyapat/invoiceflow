import { describe, expect, it } from "vitest";
import { buildInvoicePdf, type InvoicePdfData } from "@/lib/pdf";

const fixture: InvoicePdfData = {
  invoiceNumber: "INV-0042",
  status: "SENT",
  dueDate: "2026-09-01T00:00:00.000Z",
  currency: "USD",
  client: {
    name: "Acme Corp",
    email: "billing@acme.test",
    company: "Acme Corp Ltd",
  },
  business: {
    name: "Jane Doe",
    businessName: "Doe Studio",
    address: "123 Kernel St\nSpringfield, IL",
    accentColor: "#4f46e5",
  },
  items: [
    {
      description: "Landing page redesign",
      quantity: 1,
      unitPrice: 1200,
      total: 1200,
    },
    {
      description: "API integration work",
      quantity: 8,
      unitPrice: 150,
      total: 1200,
    },
    {
      description: "Final QA pass",
      quantity: 2,
      unitPrice: 100,
      total: 200,
    },
  ],
  subtotal: 2600,
  tax: 208,
  total: 2808,
};

describe("buildInvoicePdf", () => {
  it("resolves to a non-trivial Buffer carrying the %PDF magic bytes", async () => {
    const buffer = await buildInvoicePdf(fixture);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("falls back gracefully without optional branding fields", async () => {
    const buffer = await buildInvoicePdf({
      ...fixture,
      client: { name: "Solo Client", email: "solo@example.test" },
      business: {},
      items: fixture.items.slice(0, 1),
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });

  it("survives a malformed accent color and unknown currency", async () => {
    const buffer = await buildInvoicePdf({
      ...fixture,
      currency: "FAKE",
      business: { ...fixture.business, accentColor: "javascript:red" },
    });

    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});
