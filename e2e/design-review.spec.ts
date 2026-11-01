import { test, expect } from "./fixtures";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
const folder =
  process.env.DESIGN_CAPTURE_DIR || "/tmp/invoiceflow-design-after";
test("reviews the real workspace and public invoice at desktop, tablet and phone widths", async ({
  page,
  ownerId,
  db,
}) => {
  const client = await db.client.create({
    data: {
      userId: ownerId,
      name: "Northstar Studio",
      email: "hello@northstar.example",
    },
  });
  const shareToken = randomBytes(16).toString("hex");
  let invoiceId = "";
  for (const [index, status, total] of [
    [1, "PAID", 1680],
    [2, "SENT", 2420],
    [3, "OVERDUE", 860],
    [4, "DRAFT", 1250],
  ] as const) {
    const invoice = await db.invoice.create({
      data: {
        userId: ownerId,
        clientId: client.id,
        invoiceNumber: `INV-2026-00${index}`,
        status,
        shareToken: status === "SENT" ? shareToken : null,
        sentAt: status === "SENT" ? new Date() : null,
        subtotal: total,
        total,
        dueDate: new Date(
          Date.now() + (status === "OVERDUE" ? -20 : 14) * 86_400_000,
        ),
        paidAt: status === "PAID" ? new Date() : null,
        items: {
          create: [
            {
              description: "Brand and website design",
              quantity: 1,
              unitPrice: total,
              total,
            },
          ],
        },
      },
    });
    if (status === "SENT") invoiceId = invoice.id;
  }
  const estimate = await db.estimate.create({
    data: {
      userId: ownerId,
      clientId: client.id,
      estimateNumber: `EST-${randomBytes(6).toString("hex")}`,
      status: "DRAFT",
      subtotal: 1280,
      tax: 15,
      total: 1472,
      items: {
        create: [
          {
            description: "Website design",
            quantity: 1,
            unitPrice: 1280,
            total: 1280,
          },
        ],
      },
    },
  });
  await mkdir(folder, { recursive: true });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/dashboard",
      "/invoices",
      "/invoices/new",
      `/invoices/${invoiceId}`,
      "/estimates",
      "/estimates/new",
      `/estimates/${estimate.id}`,
      "/clients",
      "/reports",
      "/settings",
      `/i/${shareToken}`,
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      if (route === "/reports") {
        const bar = await page.locator('svg[aria-label="Revenue by month bar chart"] g:last-child rect').boundingBox();
        const label = await page.locator('svg[aria-label="Revenue by month bar chart"] + div span').last().boundingBox();
        expect(bar).not.toBeNull();
        expect(label).not.toBeNull();
        expect(Math.abs((bar!.x + bar!.width / 2) - (label!.x + label!.width / 2))).toBeLessThan(2);
      }
      expect(
        await page.evaluate(() =>
          Array.from(document.fonts).some(
            (font) =>
              font.family.includes("Manrope") && font.status === "loaded",
          ),
        ),
      ).toBe(true);
      if (route === "/dashboard" && width === 1440) {
        const html = await page.evaluate(() => {
          const clone = document.documentElement.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("script").forEach((script) => script.remove());
          clone
            .querySelectorAll<HTMLLinkElement>("link[href]")
            .forEach((link) => {
              link.href = new URL(
                link.getAttribute("href")!,
                location.origin,
              ).href;
            });
          return "<!doctype html>" + clone.outerHTML;
        });
        await writeFile("/tmp/invoiceflow-dashboard-render.html", html);
      }
      await page.screenshot({
        path: `${folder}/${route === `/invoices/${invoiceId}` ? "invoice-detail" : route === `/estimates/${estimate.id}` ? "estimate-detail" : route.startsWith("/i/") ? "public-invoice" : route.replaceAll("/", "-").slice(1)}-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${route} at ${width}px overflows`,
      ).toBe(true);
      expect(
        await page.locator("button:visible").evaluateAll(buttons => buttons.every(button => button.scrollHeight <= button.clientHeight + 1 && button.scrollWidth <= button.clientWidth + 1)),
        `${route} at ${width}px clips a button label`,
      ).toBe(true);
    }
  }
});
test("reviews the public site and login at desktop, tablet and phone widths", async ({
  page,
  ownerId,
}) => {
  expect(ownerId).toBeTruthy();
  await page.context().clearCookies();
  await mkdir(folder, { recursive: true });
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/login"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          Array.from(document.fonts).some(
            (font) =>
              font.family.includes("Manrope") && font.status === "loaded",
          ),
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${folder}/${route === "/" ? "landing" : "login"}-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  }
});

test("the invoice preview and FAQ respond to keyboard input with reduced motion", async ({
  page,
  ownerId,
}) => {
  expect(ownerId).toBeTruthy();
  await page.context().clearCookies();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Paid", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Paid", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Total paid", { exact: true })).toBeVisible();
  await expect(page.locator(".demo-grand-total")).toContainText("$1,472.00");
  await page.getByText("How do I get started?", { exact: true }).click();
  await expect(
    page.getByText(
      "Sign in with Google, add a client and create your first invoice.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Create your first invoice", exact: false })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});

test("mobile navigation opens, closes on Escape, routes to clients and signs out", async ({
  page,
  ownerId,
}) => {
  expect(ownerId).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation" }),
  ).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Clients", exact: true })
    .click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Make yourself at home." }),
  ).toBeVisible();
});
