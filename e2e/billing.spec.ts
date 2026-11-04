import { test, expect } from "./fixtures";
import { readFile } from "node:fs/promises";

const TRIAL_ENDED_MESSAGE =
  "Your free trial has ended. Subscribe in Settings to create and send invoices. Existing invoices stay available and can still be paid.";

async function providerLog() {
  const text = await readFile(process.env.INVOICEFLOW_PROVIDER_LOG!, "utf8").catch(() => "");
  return text.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

test("a trial owner sees days left and subscribes through Stripe Checkout", async ({ page, ownerId }) => {
  await page.goto("/settings");
  const plan = page.getByRole("region", { name: "Plan" });
  await expect(plan).toContainText("Free trial — 14 days left");

  await page.route("https://checkout.stripe.com/**", (route) => route.fulfill({ body: "checkout" }));
  await plan.getByRole("button", { name: "Subscribe — US$9/month" }).click();
  await page.waitForURL(/checkout\.stripe\.com/);
  const checkout = (await providerLog()).filter(
    (event) => event.kind === "checkout" && event.values.client_reference_id === ownerId,
  );
  expect(checkout).toHaveLength(1);
  expect(checkout[0].values).toMatchObject({ mode: "subscription", "line_items[0][price_data][unit_amount]": "900" });

  await page.goto(`/settings?billing=success&session_id=${checkout[0].id}`);
  await expect(plan).toContainText("InvoiceFlow Pro");
  await expect(plan).toContainText("Renews on");
  await expect(plan).toContainText("Thanks — your subscription is active.");

  await page.route("https://billing.stripe.com/**", (route) => route.fulfill({ body: "portal" }));
  await plan.getByRole("button", { name: "Manage billing" }).click();
  await page.waitForURL(/billing\.stripe\.com/);
});

test("an owner whose trial ended is told why and keeps their invoices", async ({ page, ownerId, db }) => {
  await db.user.update({ where: { id: ownerId }, data: { trialEndsAt: new Date(Date.now() - 86_400_000) } });
  const client = await db.client.create({ data: { userId: ownerId, name: "Kept Client", email: "kept@example.test" } });
  const existing = await db.invoice.create({ data: {
    userId: ownerId, clientId: client.id, invoiceNumber: "INV-KEPT-0001", status: "SENT", subtotal: 50, total: 50,
    dueDate: new Date("2027-01-01"), items: { create: [{ description: "Kept work", quantity: 1, unitPrice: 50, total: 50 }] },
  } });

  await page.goto("/dashboard");
  await expect(page.getByText("Your free trial has ended. Subscribe to create and send invoices.")).toBeVisible();

  await page.goto("/invoices/new");
  await page.getByLabel("Client", { exact: true }).selectOption(client.id);
  await page.getByPlaceholder("Item description").fill("New work");
  await page.getByRole("spinbutton", { name: "Unit price", exact: true }).fill("80");
  await page.getByRole("button", { name: "Save as Draft" }).click();
  await expect(page.getByText(TRIAL_ENDED_MESSAGE)).toBeVisible();
  expect(await db.invoice.count({ where: { userId: ownerId } })).toBe(1);

  await page.goto(`/invoices/${existing.id}`);
  await expect(page.getByText("INV-KEPT-0001").first()).toBeVisible();
});
