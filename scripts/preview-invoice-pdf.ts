/** Synthetic fixtures only; no database or provider access. Run with pnpm exec tsx. */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildInvoicePdf, type InvoicePdfData } from "../src/lib/pdf";

const directory = process.argv[2] || "/tmp/invoiceflow-pdf-review";
const sample: InvoicePdfData = {
  invoiceNumber: "INV-202611-0001",
  status: "SENT",
  issueDate: "2026-11-01",
  dueDate: "2026-12-01",
  currency: "NZD",
  business: {
    businessName: "Harbor Studio",
    address: "123 Example Street\nChristchurch 8011, New Zealand",
  },
  client: { name: "Morgan Smith", email: "morgan@example.test" },
  items: [
    {
      description:
        "Brand identity and design direction\nIncludes project review and final files",
      quantity: 1,
      unitPrice: 1280,
      total: 1280,
    },
    {
      description: "Website implementation",
      quantity: 8,
      unitPrice: 150,
      total: 1200,
    },
    {
      description: "Quality review and handover",
      quantity: 2,
      unitPrice: 100,
      total: 200,
    },
  ],
  subtotal: 2680,
  tax: 15,
  total: 3082,
  notes:
    "Example invoice — no payment is due.\nBilling period: November 2026\nAccount name: Harbor Studio (example)\nPayment reference: INV-202611-0001",
};
async function main() {
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "invoice-preview.pdf"),
    await buildInvoicePdf(sample),
  );
  await writeFile(
    join(directory, "short.pdf"),
    await buildInvoicePdf({
      ...sample,
      business: { name: "Harbor Studio" },
      items: [
        {
          description: "Design consultation",
          quantity: 1,
          unitPrice: 60,
          total: 60,
        },
      ],
      subtotal: 60,
      tax: 0,
      total: 60,
      notes: null,
    }),
  );
  const items = Array.from({ length: 70 }, (_, i) => ({
    description: `ITEM-${String(i + 1).padStart(3, "0")} — Design and implementation for the next phase.\nIncludes testing and documentation.`,
    quantity: 1,
    unitPrice: 10,
    total: 10,
  }));
  await writeFile(
    join(directory, "long.pdf"),
    await buildInvoicePdf({
      ...sample,
      items,
      subtotal: 700,
      tax: 15,
      total: 805,
      notes:
        "Example only.\n" +
        "Please include the invoice reference with the payment. ".repeat(60) +
        "\nEND OF NOTES",
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
