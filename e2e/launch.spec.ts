import { test, expect } from "@playwright/test";

test("the product site carries no unrelated memorial pages", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).not.toContainText("Jeb");
  for (const path of ["/jeb/", "/app.js", "/style.css", "/assets/seal-hanko.svg"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test("legal pages are public, linked from the site and sign-in, and show the support address", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
  for (const processor of ["Vercel", "Neon", "Google", "Stripe", "Resend"]) {
    await expect(page.getByText(processor).first()).toBeVisible();
  }
  await expect(page.locator('a[href="mailto:support@example.test"]').first()).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of service");
  await expect(page.getByText("US$9").first()).toBeVisible();
  await expect(page.getByText("New Zealand").first()).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Terms", exact: true })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
});

test("the landing page states the price", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Free for 14 days, then US$9/month.")).toBeVisible();
  await page.getByText("What does it cost?").click();
  await expect(
    page.getByText(
      "Every account starts with a 14-day free trial, no card needed. After that, InvoiceFlow Pro is US$9 a month and you can cancel at any time. Stripe’s own processing fees apply when you accept a payment. Your existing invoices stay available and payable even if you stop subscribing.",
    ),
  ).toBeVisible();
});

test("search engines get a sitemap of public pages and stay out of the workspace", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://invoiceflow.example.test/privacy");
  expect(sitemap).not.toContain("/dashboard");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://invoiceflow.example.test/sitemap.xml");
  expect(robots).toContain("Disallow: /api/");
});

test("the health endpoint reports readiness as named booleans only", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(typeof body.ready).toBe("boolean");
  expect(Object.keys(body.checks).sort()).toEqual([
    "appUrl", "authSecret", "cron", "database", "email", "googleSignIn", "migrations",
    "stripeChargesEnabled", "stripeLiveKey", "stripeWebhook", "supportEmail",
  ]);
  for (const value of Object.values(body.checks)) expect(typeof value).toBe("boolean");
});
