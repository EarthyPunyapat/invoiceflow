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
