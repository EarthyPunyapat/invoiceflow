import { describe, expect, it } from "vitest";
import { buildInvoicePdf, type InvoicePdfData } from "@/lib/pdf";
import { readPdf, type PdfText } from "../../../test-support/read-pdf";

const fixture: InvoicePdfData = {
  invoiceNumber: "INV-0042",
  status: "SENT",
  issueDate: "2026-08-15T00:00:00.000Z",
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
  tax: 8,
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

function assertNoOverlap(items: PdfText[]) {
  for (const [i, a] of items.entries()) {
    for (const b of items.slice(i + 1)) {
      const horizontal =
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const vertical = Math.abs(a.y - b.y);
      expect(
        horizontal > 1 && vertical < Math.min(a.height, b.height) * 0.8,
        `Overlapping PDF text: "${a.text}" / "${b.text}"`,
      ).toBe(false);
    }
  }
}

describe("printed invoice layout and values", () => {
  it("separates long invoice numbers, status, dates, names and addresses", async () => {
    const pdf = await readPdf(
      await buildInvoicePdf({
        ...fixture,
        invoiceNumber: "INV-202611-0001-CLIENT-PROJECT-2026",
        business: {
          businessName: "An Independent Design and Development Consultancy",
          address:
            "Suite 105, 123 Example Street\nChristchurch 8011\nNew Zealand",
        },
        client: {
          name: "A Client With a Longer Company and Contact Name",
          company: "An Equally Long Registered Company Name Limited",
          email: "billing.department@example.test",
        },
      }),
    );
    expect(pdf.pages).toHaveLength(1);
    expect(pdf.text).toContain("INV-202611-0001-CLIENT-");
    expect(pdf.text).toContain("15 Aug 2026");
    expect(pdf.text).toContain("01 Sept 2026");
    expect(pdf.text).toContain("Sent");
    assertNoOverlap(pdf.pages[0].text);
  });

  it("prints monetary tax rather than interpreting the percentage as dollars", async () => {
    const pdf = await readPdf(
      await buildInvoicePdf({
        ...fixture,
        subtotal: 60,
        tax: 15,
        total: 69,
        items: [
          { description: "Design", quantity: 1, unitPrice: 60, total: 60 },
        ],
      }),
    );
    expect(pdf.text).toContain("Tax (15%)");
    expect(pdf.text).toContain("$9.00");
    expect(pdf.text).not.toContain("$15.00");
    expect(pdf.text).toContain("$69.00");
  });

  it("uses the saved rounded totals for a one-cent tax breakdown", async () => {
    const pdf = await readPdf(
      await buildInvoicePdf({
        ...fixture,
        subtotal: 0.1,
        tax: 5,
        total: 0.11,
        items: [
          {
            description: "Rounding fixture",
            quantity: 1,
            unitPrice: 0.1,
            total: 0.1,
          },
        ],
      }),
    );
    expect(pdf.text).toContain("$0.01");
    expect(pdf.text).toContain("$0.11");
  });

  it("includes saved multiline payment instructions and an explicit currency", async () => {
    const pdf = await readPdf(
      await buildInvoicePdf({
        ...fixture,
        currency: "NZD",
        notes:
          "Billing period: October–November 2026\nAccount holder: Example Studio\nReference: INV-0042",
      }),
    );
    expect(pdf.text).toContain("NZD");
    expect(pdf.text).toContain("Billing period: October–November 2026");
    expect(pdf.text).toContain("Account holder: Example Studio");
    expect(pdf.text).toContain("Reference: INV-0042");
    assertNoOverlap(pdf.pages[0].text);
  });

  it.each(["PAID", "CANCELLED", "DRAFT"])(
    "does not request payment for a %s invoice",
    async (status) => {
      const pdf = await readPdf(await buildInvoicePdf({ ...fixture, status }));
      expect(pdf.text).not.toContain("Please pay by");
      expect(pdf.text).not.toContain("Total due");
      if (status === "PAID") expect(pdf.text).toContain("Total paid");
    },
  );

  it("keeps a typical three-item invoice with payment details on one A4 page", async () => {
    const pdf = await readPdf(
      await buildInvoicePdf({
        ...fixture,
        notes:
          "Billing period: October–November 2026\nAccount holder: Example Studio\nBank: Example Bank\nPayment reference: INV-0042",
      }),
    );
    expect(pdf.pages).toHaveLength(1);
    expect(pdf.text).toContain("Payment reference: INV-0042");
    assertNoOverlap(pdf.pages[0].text);
  });

  it("paginates long invoices, repeating table headings and preserving every item and note", async () => {
    const items = Array.from({ length: 70 }, (_, i) => ({
      description: `ITEM-${String(i + 1).padStart(3, "0")} — detailed design and implementation work for the next project phase.\nIncludes testing and documentation.`,
      quantity: 1,
      unitPrice: 10,
      total: 10,
    }));
    const pdf = await readPdf(
      await buildInvoicePdf({
        ...fixture,
        items,
        subtotal: 700,
        tax: 15,
        total: 805,
        notes:
          "Payment instructions\n" +
          "Please include the invoice reference when transferring payment. ".repeat(
            65,
          ) +
          "\nEND-OF-NOTES",
      }),
    );
    expect(pdf.pages.length).toBeGreaterThan(3);
    for (const item of items)
      expect(pdf.text).toContain(item.description.split(" —")[0]);
    expect(pdf.text).toContain("$805.00");
    expect(pdf.text).toContain("END-OF-NOTES");
    for (const [index, page] of pdf.pages.entries()) {
      assertNoOverlap(page.text);
      expect(
        page.text.some(
          (span) => span.text === `Page ${index + 1} of ${pdf.pages.length}`,
        ),
      ).toBe(true);
      for (const span of page.text) {
        expect(span.x).toBeGreaterThanOrEqual(47);
        expect(span.x + span.width).toBeLessThanOrEqual(page.width - 47);
        expect(span.y).toBeLessThan(page.height - 47);
      }
      if (page.text.some((span) => span.text.includes("ITEM-")))
        expect(page.text.some((span) => span.text === "Description")).toBe(
          true,
        );
    }
  });
});
