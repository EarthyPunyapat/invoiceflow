import { test, expect } from "@playwright/test";

test("the product site carries no unrelated memorial pages", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).not.toContainText("Jeb");
  for (const path of ["/jeb/", "/app.js", "/style.css", "/assets/seal-hanko.svg"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
