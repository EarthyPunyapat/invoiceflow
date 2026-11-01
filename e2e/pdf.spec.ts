import { test, expect } from "./fixtures";
import { readPdf } from "../test-support/read-pdf";

test("downloads the saved invoice with readable metadata, correct tax and payment notes", async ({
  page,
  ownerId,
  db,
}) => {
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Morgan Smith",
      email: "morgan@example.test",
    },
  });
  const invoice = await db.invoice.create({
    data: {
      userId: ownerId,
      clientId: client.id,
      invoiceNumber: "INV-202611-0001",
      status: "SENT",
      currency: "NZD",
      subtotal: 60,
      tax: 15,
      total: 69,
      createdAt: new Date("2026-11-01T00:00:00Z"),
      dueDate: new Date("2026-12-01T00:00:00Z"),
      notes:
        "Billing period: November 2026\nAccount name: Example Studio\nPayment reference: INV-202611-0001",
      items: {
        create: [
          {
            description: "Design services",
            quantity: 1,
            unitPrice: 60,
            total: 60,
          },
        ],
      },
    },
  });
  await page.goto(`/invoices/${invoice.id}`);
  // Observe the real button's request; PDF viewer navigation differs between
  // system Chromium and CI's headless shell. Parse the same authenticated URL.
  const requestPromise = page.context().waitForEvent("request", {
    predicate: request => request.url().endsWith(`/api/invoices/${invoice.id}/pdf`),
  });
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  const request = await requestPromise;
  expect(request.method()).toBe("GET");
  const response = await page.request.get(request.url());
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  expect(response.headers()["content-disposition"]).toContain(
    "invoice-INV-202611-0001.pdf",
  );
  const pdf = await readPdf(await response.body());
  expect(pdf.pages).toHaveLength(1);
  for (const text of [
    "INV-202611-0001",
    "01 Nov 2026",
    "01 Dec 2026",
    "NZD",
    "Morgan Smith",
    "Tax (15%)",
    "$9.00",
    "$69.00",
    "Account name: Example Studio",
    "Payment reference: INV-202611-0001",
  ])
    expect(pdf.text).toContain(text);
  expect(pdf.text).not.toContain("$15.00");
});

test("PDF downloads reject another owner's invoice and expired sessions", async ({
  page,
  ownerId,
  db,
}) => {
  expect(ownerId).toBeTruthy();
  const other = await db.user.create({
    data: { email: `pdf-other-${crypto.randomUUID()}@example.test` },
  });
  try {
    const client = await db.client.create({
      data: {
        userId: other.id,
        name: "Private Client",
        email: "private@example.test",
      },
    });
    const invoice = await db.invoice.create({
      data: {
        userId: other.id,
        clientId: client.id,
        invoiceNumber: "PRIVATE-001",
        subtotal: 10,
        total: 10,
        dueDate: new Date(),
        notes: "Private payment information",
      },
    });
    expect(
      (await page.request.get(`/api/invoices/${invoice.id}/pdf`)).status(),
    ).toBe(404);
    await page.context().clearCookies();
    expect(
      (await page.request.get(`/api/invoices/${invoice.id}/pdf`)).status(),
    ).toBe(401);
  } finally {
    await db.user.delete({ where: { id: other.id } });
  }
});
