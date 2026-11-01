import { test, expect } from "./fixtures";

// Actual browser pages, production server, session handling, APIs and PostgreSQL.
// Only provider sign-in is replaced with a locally signed test session.
test("creates a client from the Clients page and selects it on a new invoice", async ({ page, ownerId, db }) => {
  await page.goto("/clients/new");
  await page.getByLabel("Name", { exact: false }).fill("First Browser Client");
  await page.getByLabel("Email", { exact: false }).fill("first-client@example.test");
  const creation = page.waitForResponse(r => r.url().endsWith("/api/clients") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Save Client" }).click();
  expect((await creation).status()).toBe(201);
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByRole("link", { name: "First Browser Client" })).toBeVisible();
  const stored = await db.client.findFirstOrThrow({ where: { userId: ownerId, email: "first-client@example.test" } });
  await page.goto("/invoices/new");
  await expect(page.getByLabel("Client", { exact: true }).locator("option", { hasText: "First Browser Client" })).toHaveCount(1);
  await page.getByLabel("Client", { exact: true }).selectOption(stored.id);
  await expect(page.getByLabel("Client", { exact: true })).toHaveValue(stored.id);
});

test("adds the first client inside a populated invoice draft, selects it, and saves the invoice", async ({ page, ownerId, db }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  await page.goto("/invoices/new");
  await expect(page.getByText("No clients yet. Add your first client to continue.")).toBeVisible();
  await page.getByPlaceholder("Item description").fill("Website redesign");
  await page.getByRole("spinbutton", { name: "Unit price", exact: true }).fill("125");
  await page.getByRole("button", { name: "Add new client", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await page.getByLabel("Name", { exact: true }).fill("Inline Invoice Client");
  await page.getByLabel("Email", { exact: true }).fill("inline-invoice@example.test");
  await page.getByRole("button", { name: "Save client", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("was added and selected");
  const stored = await db.client.findFirstOrThrow({ where: { userId: ownerId, email: "inline-invoice@example.test" } });
  await expect(page.getByLabel("Client", { exact: true })).toHaveValue(stored.id);
  await expect(page.getByLabel("Client", { exact: true })).toBeFocused();
  await expect(page.getByPlaceholder("Item description")).toHaveValue("Website redesign");
  await expect(page.getByRole("spinbutton", { name: "Unit price", exact: true })).toHaveValue("125");
  await page.getByRole("button", { name: "Save as Draft" }).click();
  await expect(page).toHaveURL(/\/invoices\/(?!new$)[^/]+$/);
  await expect(page.getByText("Inline Invoice Client", { exact: true })).toBeVisible();
  const invoice = await db.invoice.findFirstOrThrow({ where: { userId: ownerId }, include: { items: true } });
  expect(invoice.clientId).toBe(stored.id);
  expect(invoice.total).toBe(125);
  expect(invoice.items[0].description).toBe("Website redesign");
  expect(browserErrors).toEqual([]);
});

test("adds and selects a client inside an estimate without submitting or clearing its form", async ({ page, ownerId, db }) => {
  await page.goto("/estimates/new");
  await page.getByPlaceholder("Description", { exact: true }).fill("Consulting estimate");
  await page.getByRole("spinbutton", { name: "Unit price", exact: true }).fill("250");
  await page.getByRole("button", { name: "Add new client", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Inline Estimate Client");
  await page.getByLabel("Email", { exact: true }).fill("inline-estimate@example.test");
  await page.getByRole("button", { name: "Save client", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("was added and selected");
  const stored = await db.client.findFirstOrThrow({ where: { userId: ownerId, email: "inline-estimate@example.test" } });
  await expect(page).toHaveURL(/\/estimates\/new$/);
  await expect(page.getByLabel("Client", { exact: true })).toHaveValue(stored.id);
  await expect(page.getByPlaceholder("Description", { exact: true })).toHaveValue("Consulting estimate");
  await page.getByRole("button", { name: "Create estimate", exact: true }).click();
  await expect(page).toHaveURL(/\/estimates\/(?!new$)[^/]+$/);
  expect((await db.estimate.findFirstOrThrow({ where: { userId: ownerId } })).clientId).toBe(stored.id);
});

test("shows list failures and lets the user retry instead of showing an empty client list", async ({ page, ownerId, db }) => {
  const client = await db.client.create({ data: { userId: ownerId, name: "Recovered Client", email: "recovered@example.test" } });
  let failed = false;
  await page.route("**/api/clients?view=options", async route => {
    if (!failed) { failed = true; await route.fulfill({ status: 503, json: { error: "Temporary outage" } }); }
    else await route.continue();
  });
  await page.goto("/invoices/new");
  await expect(page.getByRole("alert").filter({ hasText: "couldn't load your clients" })).toBeVisible();
  await expect(page.getByText("No clients yet. Add your first client to continue.")).not.toBeVisible();
  await page.getByRole("button", { name: "Retry loading clients" }).click();
  await expect(page.getByLabel("Client", { exact: true }).locator("option", { hasText: "Recovered Client" })).toHaveCount(1);
  await page.getByLabel("Client", { exact: true }).selectOption(client.id);
});

test("keeps the invoice and client details when a save fails, then retries successfully", async ({ page, ownerId, db }) => {
  await page.goto("/invoices/new");
  await page.getByPlaceholder("Item description").fill("Keep this draft");
  await page.getByRole("button", { name: "Add new client", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Retry Client");
  await page.getByLabel("Email", { exact: true }).fill("retry-client@example.test");
  let failed = false;
  await page.route("**/api/clients", async route => {
    if (route.request().method() === "POST" && !failed) { failed = true; await route.fulfill({ status: 500, json: { error: "Couldn't save this client. Please retry." } }); }
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save client", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't save this client" })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Retry Client");
  await expect(page.getByPlaceholder("Item description")).toHaveValue("Keep this draft");
  await page.getByRole("button", { name: "Save client", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("was added and selected");
  expect(await db.client.count({ where: { userId: ownerId } })).toBe(1);
});

test("shows a session-expired error rather than pretending there are no clients", async ({ page, ownerId }) => {
  expect(ownerId).toBeTruthy();
  await page.route("**/api/clients?view=options", route => route.fulfill({ status: 401, json: { error: "Unauthorized" } }));
  await page.goto("/invoices/new");
  await expect(page.getByRole("alert").filter({ hasText: "session has expired" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  await expect(page.getByText("No clients yet. Add your first client to continue.")).not.toBeVisible();
});

test("validates inline client fields and lets the user cancel without losing the invoice", async ({ page, ownerId, db }) => {
  await page.goto("/invoices/new");
  await page.getByPlaceholder("Item description").fill("Unsaved invoice item");
  await page.getByRole("button", { name: "Add new client", exact: true }).click();
  await page.getByRole("button", { name: "Save client", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "client's name" })).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Invalid Email Client");
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await page.getByRole("button", { name: "Save client", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "valid email address" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add new client", exact: true })).toBeFocused();
  await expect(page.getByPlaceholder("Item description")).toHaveValue("Unsaved invoice item");
  expect(await db.client.count({ where: { userId: ownerId } })).toBe(0);
});

test("adds a client from the mobile invoice page", async ({ page, ownerId, db }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/invoices/new");
  await page.getByRole("button", { name: "Add new client", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Mobile Client");
  await page.getByLabel("Email", { exact: true }).fill("mobile-client@example.test");
  await page.getByRole("button", { name: "Save client", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("was added and selected");
  const client = await db.client.findFirstOrThrow({ where: { userId: ownerId, email: "mobile-client@example.test" } });
  await expect(page.getByLabel("Client", { exact: true })).toHaveValue(client.id);
});
