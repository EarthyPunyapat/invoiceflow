import { test, expect } from "./fixtures";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
async function providerLog() {
  const text = await readFile(
    process.env.INVOICEFLOW_PROVIDER_LOG!,
    "utf8",
  ).catch(() => "");
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
async function enterInvoice(
  page: import("@playwright/test").Page,
  clientId: string,
) {
  await page.goto("/invoices/new");
  await page.getByLabel("Client", { exact: true }).selectOption(clientId);
  await page.getByPlaceholder("Item description").fill("Design work");
  await page
    .getByRole("spinbutton", { name: "Unit price", exact: true })
    .fill("60");
}

test("Save & Send reaches the actual email endpoint, persists acceptance and supports an explicit resend", async ({
  page,
  ownerId,
  db,
}) => {
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Email Client",
      email: `delivered-${randomBytes(6).toString("hex")}@example.test`,
    },
  });
  await enterInvoice(page, client.id);
  const delivered = page.waitForResponse(
    (response) =>
      response.url().endsWith("/send") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save & Send", exact: true }).click();
  expect((await delivered).status()).toBe(200);
  await expect(page).toHaveURL(/\/invoices\/(?!new)[^/?]+$/);
  await expect(
    page.getByText("Email submitted for delivery on", { exact: false }),
  ).toBeVisible();
  const invoice = await db.invoice.findFirstOrThrow({
    where: { userId: ownerId },
  });
  expect(invoice.status).toBe("SENT");
  expect(invoice.invoiceEmailedAt).not.toBeNull();
  const initial = (await providerLog()).filter(
    (event) => event.kind === "email" && event.recipient === client.email,
  );
  expect(initial).toHaveLength(1);
  expect(initial[0].html).toContain(`/i/${invoice.shareToken}`);
  await page.getByRole("button", { name: "Send again", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Email submitted for delivery.",
  );
  const receipts = (await providerLog()).filter(
    (event) => event.kind === "email" && event.recipient === client.email,
  );
  expect(receipts).toHaveLength(2);
  expect(receipts[0].key).not.toBe(receipts[1].key);
  expect(await db.invoice.count({ where: { userId: ownerId } })).toBe(1);
});

test("a rejected email leaves one saved draft and retries it successfully", async ({
  page,
  ownerId,
  db,
}) => {
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Retry Email",
      email: "retry-email@example.test",
    },
  });
  await enterInvoice(page, client.id);
  await page.getByRole("button", { name: "Save & Send", exact: true }).click();
  await expect(page).toHaveURL(/\?email=failed$/);
  await expect(
    page
      .getByRole("alert")
      .filter({
        hasText: "Your invoice was saved, but the email was not sent",
      }),
  ).toBeVisible();
  const draft = await db.invoice.findFirstOrThrow({
    where: { userId: ownerId },
  });
  expect(draft.status).toBe("DRAFT");
  expect(draft.invoiceEmailedAt).toBeNull();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/invoiceflow-email-retry-phone.png", fullPage: true });
  await page.getByRole("button", { name: "Send invoice", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Email submitted for delivery.",
  );
  expect(
    (await db.invoice.findUniqueOrThrow({ where: { id: draft.id } })).status,
  ).toBe("SENT");
  expect(await db.invoice.count({ where: { userId: ownerId } })).toBe(1);
});

test("Pay now refreshes a stale account flag and reaches Checkout", async ({
  page,
  ownerId,
  db,
}) => {
  await db.stripeAccount.create({
    data: {
      userId: ownerId,
      stripeAccountId: "acct_browser_ready",
      stripeConnectOnboardingComplete: false,
    },
  });
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Payment Client",
      email: "payment@example.test",
    },
  });
  const token = randomBytes(16).toString("hex");
  const invoice = await db.invoice.create({
    data: {
      userId: ownerId,
      clientId: client.id,
      invoiceNumber: "PAY-001",
      status: "SENT",
      shareToken: token,
      subtotal: 60,
      tax: 15,
      total: 69,
      dueDate: new Date(),
    },
  });
  await page.context().clearCookies();
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Checkout fixture</h1>",
    }),
  );
  await page.goto(`/i/${token}`);
  await page.getByRole("button", { name: "Pay now", exact: true }).click();
  await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);
  await expect(
    page.getByRole("heading", { name: "Checkout fixture" }),
  ).toBeVisible();
  expect(
    (await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } }))
      .checkoutSessionId,
  ).toMatch(/^cs_browser_/);
  expect(
    (await db.stripeAccount.findUniqueOrThrow({ where: { userId: ownerId } }))
      .stripeConnectOnboardingComplete,
  ).toBe(true);
});

test("an incomplete Stripe account gives actionable owner and recipient messages", async ({
  page,
  ownerId,
  db,
}) => {
  await db.stripeAccount.create({
    data: {
      userId: ownerId,
      stripeAccountId: "acct_browser_pending",
      stripeConnectOnboardingComplete: true,
    },
  });
  await page.goto("/settings");
  await expect(
    page.getByText("Finish the required details in Stripe", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue Stripe setup", exact: true }),
  ).toBeVisible();
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Pending Payment",
      email: "pending@example.test",
    },
  });
  const token = randomBytes(16).toString("hex");
  await db.invoice.create({
    data: {
      userId: ownerId,
      clientId: client.id,
      invoiceNumber: "PENDING-001",
      status: "SENT",
      shareToken: token,
      subtotal: 60,
      total: 60,
      dueDate: new Date(),
    },
  });
  await page.context().clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/i/${token}`);
  await page.getByRole("button", { name: "Pay now", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "payment account is not ready" }),
  ).toBeVisible();
  expect(
    (await db.stripeAccount.findUniqueOrThrow({ where: { userId: ownerId } }))
      .stripeConnectOnboardingComplete,
  ).toBe(false);
  await page.screenshot({ path: "/tmp/invoiceflow-payment-pending-phone.png", fullPage: true });
});

test("an existing issued invoice can attempt email and exposes a test-mode sender restriction", async ({
  page,
  ownerId,
  db,
}) => {
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Existing Client",
      email: "restricted-email@example.test",
    },
  });
  const invoice = await db.invoice.create({
    data: {
      userId: ownerId,
      clientId: client.id,
      invoiceNumber: "EXISTING-001",
      status: "SENT",
      subtotal: 60,
      total: 60,
      dueDate: new Date(),
    },
  });
  await page.goto(`/invoices/${invoice.id}`);
  await expect(
    page.getByText("This invoice has not been emailed.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Send invoice", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "email provider is in test mode" }),
  ).toBeVisible();
  expect(
    (await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } }))
      .invoiceEmailedAt,
  ).toBeNull();
  expect(await db.invoice.count({ where: { userId: ownerId } })).toBe(1);
});

test("a public invoice without a connected account explains how to arrange payment", async ({
  page,
  ownerId,
  db,
}) => {
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Offline Client",
      email: "offline@example.test",
    },
  });
  const token = randomBytes(16).toString("hex");
  await db.invoice.create({
    data: {
      userId: ownerId,
      clientId: client.id,
      invoiceNumber: "OFFLINE-001",
      status: "SENT",
      shareToken: token,
      subtotal: 60,
      total: 60,
      dueDate: new Date(),
    },
  });
  await page.context().clearCookies();
  await page.goto(`/i/${token}`);
  await expect(
    page.getByRole("button", { name: "Pay now", exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByText("Online payment is not enabled for this invoice.", {
      exact: false,
    }),
  ).toBeVisible();
});
