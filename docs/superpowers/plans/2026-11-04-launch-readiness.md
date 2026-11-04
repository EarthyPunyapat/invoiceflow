# Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take InvoiceFlow from "works, earns nothing" to a live product that charges US$9/month after a 14-day trial, with legal pages, a checkable definition of "ready", and a release through `main`.

**Architecture:** The subscription is a Stripe Checkout subscription on the platform account. Its state is cached on `User` and refreshed lazily from Stripe, so no new webhook is needed. One pure module (`plan.ts`) decides entitlement, one Stripe module (`subscription.ts`) syncs it, and one guard (`plan-guard.ts`) is called by the four write routes. A public `/api/health` and `scripts/verify-live.mjs` define "live and ready".

**Tech Stack:** Next.js 15 App Router, Prisma 5 / PostgreSQL 16, Stripe SDK 17 (API `2025-02-24.acacia`), Auth.js v5, Vitest, Playwright with nock provider fixtures.

**Spec:** `docs/superpowers/specs/2026-11-04-launch-readiness.md` (decisions D1–D12, exact copy, legal facts, definition of done).

## Global Constraints

- Node 22, pnpm 10.34.9, `pnpm install --frozen-lockfile`. **No new dependencies.**
- Stripe API version stays `2025-02-24.acacia`; `subscription.current_period_end` (Unix seconds) lives on the subscription object.
- Database and browser tests use only local `invoiceflow_test`. `scripts/browser-providers.mjs` stays test-only and is never imported by app code.
- Every Prisma query on user data is scoped by `userId`. Billing routes are session-only (`auth()`), never API-key.
- Save & Send semantics are unchanged: never mark an email accepted without a provider receipt.
- Migrations are additive; never edit a published migration. The new one is `prisma/migrations/20261104000000_add_subscriptions/`.
- Price is displayed as exactly `US$9/month`; trial is exactly 14 days. Copy marked "exact" in the spec is used verbatim. Sentence case, existing design tokens (DESIGN.md), no fabricated statistics or endorsements.
- Production releases only by merging to `main`; never `vercel deploy` from a sandbox.
- Every commit message ends with the session's attribution lines.

## Commands used by every task

Prerequisite (once per container): `service postgresql start`, database `invoiceflow_test` exists with password `postgres`, then `pnpm run db:generate && pnpm run db:deploy` with ENV set.

- **ENV:** `export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoiceflow_test?schema=public" DATABASE_URL_UNPOOLED="$DATABASE_URL" NEXT_PUBLIC_APP_URL=https://invoiceflow.example.test NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium`
- **UNIT `<file>`:** `pnpm exec vitest run <file>`
- **INTEGRATION `<file>`:** `pnpm exec vitest run --config vitest.integration.config.ts <file>`
- **BROWSER `<spec>`:** `AUTH_SECRET=$(openssl rand -hex 32) pnpm run build && pnpm exec playwright test <spec>`
- **FULL:** `pnpm run lint && pnpm run typecheck && pnpm test && pnpm run test:integration && AUTH_SECRET=$(openssl rand -hex 32) pnpm run build && pnpm run test:browser && pnpm audit --prod --audit-level high`

## Review Focus

1. **A subscription Checkout event delivered to the existing payment webhook** (an "account"-type endpoint) must return 200 and change nothing. Today `recordCheckoutPayment` throws, and Stripe would retry and eventually disable the endpoint. Test in Task 4.
2. **A Stripe outage at the moment a paying user's period renews** must not block them (spec D6). Test in Task 4.
3. **The owner pays in Checkout but closes the tab** before the success redirect. The next gated action must find the subscription. Test in Task 4.
4. **A tampered `session_id` in the success URL** (someone else's session) must not grant Pro. Test in Task 4.
5. **When an owner's trial ends, their clients can still pay invoices already sent**, and the owner can still edit, download PDFs and export (spec D3). Test in Task 5.

---

### Task 1: Remove the Jeb memorial from the product (D8)

**Files:**
- Delete: `public/jeb/` (all), `public/app.js`, `public/style.css`, `public/assets/hero-zen-automaton.svg`, `public/assets/seal-hanko.svg`
- Modify: `src/app/page.tsx` (footer: remove the `/jeb/` link)
- Create: `e2e/launch.spec.ts`

**Interfaces:** Produces `e2e/launch.spec.ts`, which Tasks 2, 6 and 8 extend. It imports `test, expect` from `@playwright/test` and needs no signed-in fixture.

- [ ] **Step 1: Write the failing test** in `e2e/launch.spec.ts`

```ts
test("the product site carries no unrelated memorial pages", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).not.toContainText("Jeb");
  for (const path of ["/jeb/", "/app.js", "/style.css", "/assets/seal-hanko.svg"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});
```

- [ ] **Step 2:** ENV, then BROWSER `e2e/launch.spec.ts`. Expected: FAIL (footer contains "Jeb", `/jeb/` returns 200).
- [ ] **Step 3:** Delete the files and the footer link.
- [ ] **Step 4:** BROWSER `e2e/launch.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit:** `chore: move the Jeb memorial out of the InvoiceFlow site`

### Task 2: Legal pages, support address and sign-in consent (D7)

**Files:**
- Create: `src/lib/legal.ts`, `src/lib/legal.test.ts`, `src/app/(legal)/layout.tsx`, `src/app/(legal)/legal.css`, `src/app/(legal)/privacy/page.tsx`, `src/app/(legal)/terms/page.tsx`
- Modify: `src/app/page.tsx` (footer links "Privacy" → `/privacy`, "Terms" → `/terms`), `src/app/login/page.tsx:78-80` (spec's exact login copy with links), `.env.example` (add `SUPPORT_EMAIL=""` with comment "Public support inbox shown on legal pages"), `playwright.config.ts` (webServer env `SUPPORT_EMAIL: "support@example.test"`), `e2e/launch.spec.ts`

**Interfaces:**
- Produces: `supportEmail(): string | null` and `LEGAL = { operator: "InvoiceFlow", governingLaw: "New Zealand", effective: "4 November 2026" } as const` from `src/lib/legal.ts`. Routes `/privacy` and `/terms` are used by Tasks 4, 6 and 8.

- [ ] **Step 1: Write failing unit tests** in `src/lib/legal.test.ts` (use `vi.stubEnv`)

```ts
it("returns the trimmed configured support address", () => {
  vi.stubEnv("SUPPORT_EMAIL", "  help@invoiceflow.example ");
  expect(supportEmail()).toBe("help@invoiceflow.example");
});
it("treats unset, malformed and .env.example placeholder addresses as missing", () => {
  for (const value of ["", "not-an-email", "you@yourdomain.com"]) {
    vi.stubEnv("SUPPORT_EMAIL", value);
    expect(supportEmail()).toBeNull();
  }
});
```

- [ ] **Step 2: Write failing browser tests** in `e2e/launch.spec.ts`

```ts
test("legal pages are public, linked from the site and sign-in, and show the support address", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
  for (const processor of ["Vercel", "Neon", "Google", "Stripe", "Resend"]) await expect(page.getByText(processor).first()).toBeVisible();
  await expect(page.locator('a[href="mailto:support@example.test"]').first()).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of service");
  await expect(page.getByText("US$9").first()).toBeVisible();
  await expect(page.getByText("New Zealand").first()).toBeVisible();
  await page.goto("/login");
  await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
});
```

- [ ] **Step 3:** UNIT `src/lib/legal.test.ts` and BROWSER `e2e/launch.spec.ts`. Expected: FAIL (module missing; `/privacy` 404).
- [ ] **Step 4: Implement.** `supportEmail()` accepts `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` and rejects `*@yourdomain.com`. Both pages use `export const dynamic = "force-dynamic"` so `SUPPORT_EMAIL` is read at runtime. Both carry `metadata` titles "Privacy policy" and "Terms of service". The prose covers every fact in the spec's "Legal page facts" section, in plain language. The `(legal)` layout reuses the marketing header and footer styles from `src/app/marketing.css`. If `supportEmail()` is null, omit the mailto and say "through the contact details in your account settings". Task 8's health check fails in that case, so it can't launch unnoticed.
- [ ] **Step 5:** UNIT and BROWSER again. Expected: PASS. Then `pnpm run lint`.
- [ ] **Step 6: Commit:** `feat: add privacy policy, terms and sign-in consent`

### Task 3: Subscription fields and entitlement rules (D1, D2, D6)

**Files:**
- Modify: `prisma/schema.prisma` (model `User`)
- Create: `prisma/migrations/20261104000000_add_subscriptions/migration.sql`, `src/lib/plan.ts`, `src/lib/plan.test.ts`

**Interfaces:**
- Produces (in `src/lib/plan.ts`):
  - `TRIAL_DAYS = 14`
  - `PRO_PLAN = { name: "InvoiceFlow Pro", amountCents: 900, currency: "usd", interval: "month", label: "US$9/month" } as const`
  - `PLAN_USER_SELECT`, a Prisma `select` object for the seven `PlanUser` fields
  - `type PlanUser = { createdAt: Date; trialEndsAt: Date | null; stripeCustomerId: string | null; stripeSubscriptionId: string | null; subscriptionStatus: string | null; subscriptionPeriodEnd: Date | null; subscriptionCancelAtPeriodEnd: boolean }`
  - `type PlanState = "trial" | "pro" | "past_due" | "ended"`
  - `type Entitlement = { state: PlanState; canCreate: boolean; trialEndsAt: Date; trialDaysLeft: number; activeUntil: Date | null; cancelsAtPeriodEnd: boolean }`
  - `entitlement(user: PlanUser, now: Date): Entitlement`
  - `needsRefresh(user: PlanUser, now: Date): boolean`

- [ ] **Step 1: Schema and migration.** Add the `User` fields `trialEndsAt DateTime?`, `stripeCustomerId String? @unique`, `stripeSubscriptionId String? @unique`, `subscriptionStatus String?`, `subscriptionPeriodEnd DateTime?` and `subscriptionCancelAtPeriodEnd Boolean @default(false)`. Migration SQL:

```sql
ALTER TABLE "User" ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionStatus" TEXT,
  ADD COLUMN "subscriptionPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
-- Accounts that exist at launch get a full trial from today (spec D2).
UPDATE "User" SET "trialEndsAt" = CURRENT_TIMESTAMP + INTERVAL '14 days';
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");
```

- [ ] **Step 2:** ENV, `pnpm run db:generate && pnpm run db:deploy`, then INTEGRATION `integration/migration-rollout.test.ts`. Expected: 11 passed. The gate's post-migration diff proves the SQL matches `schema.prisma`, and the "previous release" case now applies this migration.
- [ ] **Step 3: Write failing unit tests** in `src/lib/plan.test.ts` (dates are UTC; `base` has trial null and no Stripe fields)

```ts
const base = { createdAt: new Date("2026-11-04T00:00:00Z"), trialEndsAt: null, stripeCustomerId: null, stripeSubscriptionId: null, subscriptionStatus: null, subscriptionPeriodEnd: null, subscriptionCancelAtPeriodEnd: false };
it("gives a new account 14 days of trial", () => {
  expect(entitlement(base, new Date("2026-11-10T00:00:00Z"))).toMatchObject({ state: "trial", canCreate: true, trialDaysLeft: 8, trialEndsAt: new Date("2026-11-18T00:00:00Z") });
});
it("prefers the launch backfill over sign-up date", () => {
  expect(entitlement({ ...base, createdAt: new Date("2026-01-01T00:00:00Z"), trialEndsAt: new Date("2026-11-18T00:00:00Z") }, new Date("2026-11-10T00:00:00Z")).state).toBe("trial");
});
it("ends the trial exactly at trialEndsAt", () => {
  expect(entitlement(base, new Date("2026-11-18T00:00:00Z"))).toMatchObject({ state: "ended", canCreate: false, trialDaysLeft: 0 });
});
it("treats active and trialing subscriptions with a future period end as Pro", () => {
  for (const subscriptionStatus of ["active", "trialing"]) {
    expect(entitlement({ ...base, subscriptionStatus, subscriptionPeriodEnd: new Date("2026-12-10T00:00:00Z") }, new Date("2026-12-01T00:00:00Z"))).toMatchObject({ state: "pro", canCreate: true, activeUntil: new Date("2026-12-10T00:00:00Z") });
  }
});
it("does not trust a cached active status after its period end", () => {
  expect(entitlement({ ...base, subscriptionStatus: "active", subscriptionPeriodEnd: new Date("2026-11-30T00:00:00Z") }, new Date("2026-12-01T00:00:00Z")).state).toBe("ended");
});
it("reports failed payments separately", () => {
  for (const subscriptionStatus of ["past_due", "unpaid"]) {
    expect(entitlement({ ...base, subscriptionStatus }, new Date("2026-12-01T00:00:00Z"))).toMatchObject({ state: "past_due", canCreate: false });
  }
});
it("keeps a cancelled subscription active until its period ends", () => {
  expect(entitlement({ ...base, subscriptionStatus: "active", subscriptionCancelAtPeriodEnd: true, subscriptionPeriodEnd: new Date("2026-12-10T00:00:00Z") }, new Date("2026-12-01T00:00:00Z"))).toMatchObject({ state: "pro", cancelsAtPeriodEnd: true });
});
it("refreshes only when Stripe could have something new", () => {
  const now = new Date("2026-12-01T00:00:00Z"), past = new Date("2026-11-30T00:00:00Z"), future = new Date("2026-12-10T00:00:00Z");
  const customer = { ...base, stripeCustomerId: "cus_1" };
  expect(needsRefresh(base, now)).toBe(false);
  expect(needsRefresh({ ...customer, stripeSubscriptionId: "sub_1", subscriptionStatus: "active", subscriptionPeriodEnd: future }, now)).toBe(false);
  expect(needsRefresh({ ...customer, stripeSubscriptionId: "sub_1", subscriptionStatus: "active", subscriptionPeriodEnd: past }, now)).toBe(true);
  expect(needsRefresh({ ...customer, stripeSubscriptionId: "sub_1", subscriptionStatus: "canceled", subscriptionPeriodEnd: past }, now)).toBe(false);
  expect(needsRefresh(customer, now)).toBe(true); // trial over, checkout may have completed in a closed tab
  expect(needsRefresh(customer, new Date("2026-11-10T00:00:00Z"))).toBe(false);
});
```

- [ ] **Step 4:** UNIT `src/lib/plan.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 5: Implement `src/lib/plan.ts`.** Evaluation order: pro, then trial, then past_due, then ended. `trialDaysLeft = max(0, ceil(ms / 86_400_000))`. `needsRefresh` is false without a customer. With a subscription, it is true only when the status is not `canceled` or `incomplete_expired` and the period end is missing or not after `now`. Without a subscription, it is true only when `entitlement(...).canCreate` is false.
- [ ] **Step 6:** UNIT `src/lib/plan.test.ts` and `pnpm test`. Expected: PASS, with no regressions.
- [ ] **Step 7: Commit:** `feat: add subscription fields and entitlement rules`

### Task 4: Sync subscriptions with Stripe (D4, D5, D6)

**Files:**
- Create: `src/lib/subscription.ts`, `integration/subscription.test.ts`
- Modify: `src/lib/billing.ts:160-168` (`recordCheckoutPayment` returns `null` when `session.mode === "subscription"`), `integration/billing.test.ts` (one webhook test)

**Interfaces:**
- Consumes: `PLAN_USER_SELECT`, `entitlement`, `needsRefresh`, `PRO_PLAN`, `Entitlement` (Task 3); `getStripe()`, `stripeConfigured()`, `appUrl()` (existing).
- Produces (in `src/lib/subscription.ts`):
  - `type BillingResult = { url: string } | { status: number; error: string }`
  - `getEntitlement(userId: string, options?: { refresh?: boolean }): Promise<Entitlement>`
  - `refreshSubscription(userId: string): Promise<void>`
  - `startCheckout(userId: string): Promise<BillingResult>`
  - `completeCheckout(userId: string, sessionId: string): Promise<boolean>`
  - `openBillingPortal(userId: string): Promise<BillingResult>`

- [ ] **Step 1: Write failing tests** in `integration/subscription.test.ts`. Use the same `vi.mock("@/lib/stripe")` pattern as `integration/billing.test.ts:31`, with `vi.fn()` for `customers.create`, `checkout.sessions.create/retrieve`, `subscriptions.retrieve/list`, `billingPortal.configurations.list/create` and `billingPortal.sessions.create`. Users are created directly in Prisma; a "trial over" user has `trialEndsAt` in the past.
  - `starts a US$9 monthly subscription checkout and reuses one Stripe customer`: calling `startCheckout` twice calls `customers.create` once, with `idempotencyKey: "invoiceflow-customer-<userId>"`. `sessions.create` receives `mode: "subscription"`, `client_reference_id: userId`, `customer: "cus_1"`, `line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 900, recurring: { interval: "month" }, product_data: { name: "InvoiceFlow Pro" } } }]`, `success_url: "https://invoiceflow.example/settings?billing=success&session_id={CHECKOUT_SESSION_ID}"` and `cancel_url: "https://invoiceflow.example/settings?billing=cancelled"`. The result is `{ url }`.
  - `refuses a second checkout while Pro is active`: the result is `{ status: 409, error: "You already have InvoiceFlow Pro. Use Manage billing to change it." }`.
  - `completes checkout only for the owner's own session` (Review Focus 4): a retrieved session with `client_reference_id: "someone-else"` returns `false` and leaves the user unchanged. The owner's own session (`mode: "subscription"`, matching customer, expanded subscription `{ id: "sub_1", status: "active", current_period_end: 1767225600, cancel_at_period_end: false, customer: "cus_1" }`) returns `true` and stores `subscriptionStatus: "active"` and `subscriptionPeriodEnd: new Date(1767225600 * 1000)`.
  - `picks up a subscription paid in a tab the owner closed` (Review Focus 3): a trial-over user with `stripeCustomerId` and no subscription calls `getEntitlement`. `subscriptions.list` is called with `{ customer: "cus_1", status: "all", limit: 1 }` and the state is `"pro"`.
  - `keeps a paying user working through a Stripe outage at renewal` (Review Focus 2): cached `active` with a past period end, `subscriptions.retrieve` rejects, and the result has `canCreate: true`.
  - `does not re-query an ended subscription`: a `canceled` status with a past period end means `subscriptions.retrieve` is not called.
  - `opens the billing portal, creating a configuration that cancels at period end when none exists`: `configurations.list` resolves `{ data: [] }`, so `configurations.create` receives `features.subscription_cancel: { enabled: true, mode: "at_period_end" }`, `payment_method_update` and `invoice_history` enabled, and `business_profile` URLs `https://invoiceflow.example/privacy` and `/terms`. `sessions.create` receives `return_url: "https://invoiceflow.example/settings?billing=portal"`. A user without a customer gets `{ status: 400, error: "No billing account yet. Subscribe first." }`.
- [ ] **Step 2: Add to `integration/billing.test.ts`** `ignores subscription Checkout events delivered to the payment webhook` (Review Focus 1). Build a `signedEvent` (the existing helper, `:86`) for `checkout.session.completed` with `{ mode: "subscription", payment_status: "paid", client_reference_id: <ownerId> }` and no `account`. The webhook responds 200 and no invoice changes.
- [ ] **Step 3:** ENV, INTEGRATION `integration/subscription.test.ts integration/billing.test.ts`. Expected: FAIL (module missing; webhook returns 500).
- [ ] **Step 4: Implement.**
  - `getEntitlement` reads `PLAN_USER_SELECT` and refreshes when `options.refresh` or `needsRefresh` is true. On a refresh error it logs `[subscription] refresh failed` and, if the cached status is `active` or `trialing`, returns `{ ...entitlement(cached, now), state: "pro", canCreate: true, activeUntil: cached.subscriptionPeriodEnd }`.
  - `refreshSubscription` retrieves by id, or lists by customer. It stores `stripeSubscriptionId`, `subscriptionStatus`, `subscriptionPeriodEnd` and `subscriptionCancelAtPeriodEnd` only when the subscription's customer equals the stored `stripeCustomerId`.
  - `startCheckout` returns `{ status: 503, error: "Billing is not configured yet." }` when Stripe is unconfigured. It saves a new customer with `updateMany({ where: { id, stripeCustomerId: null } })` and then re-reads.
  - `completeCheckout` uses `retrieve(sessionId, { expand: ["subscription"] })` and returns `false` on any Stripe error.
  - Add the one-line `mode === "subscription"` early return in `recordCheckoutPayment`.
- [ ] **Step 5:** INTEGRATION both files, then `pnpm run test:integration`. Expected: all pass.
- [ ] **Step 6: Commit:** `feat: sync InvoiceFlow Pro subscriptions with Stripe`

### Task 5: Enforce the plan on write routes (D3)

**Files:**
- Create: `src/lib/plan-guard.ts`, `integration/plan-enforcement.test.ts`
- Modify (call the guard immediately after the existing auth check): `src/app/api/invoices/route.ts` POST, `src/app/api/estimates/route.ts` POST, `src/app/api/estimates/[id]/convert/route.ts` POST, `src/app/api/invoices/[id]/send/route.ts` POST

**Interfaces:**
- Consumes: `getEntitlement` (Task 4).
- Produces: `requireActivePlan(userId: string): Promise<NextResponse | null>`, plus `TRIAL_ENDED_MESSAGE` and `PAYMENT_FAILED_MESSAGE` (the spec's exact gate copy) from `src/lib/plan-guard.ts`. It returns a 402 response `{ error, code }` with `code` `"subscription_required"` or `"payment_failed"`, or `null` when allowed.

- [ ] **Step 1: Write failing tests** in `integration/plan-enforcement.test.ts`. Mock `@/lib/auth` and `@/lib/stripe` as `integration/billing.test.ts` does.
  - `blocks an owner whose trial ended from creating, converting and sending`: invoice POST, estimate POST, convert and send each return 402 with `{ code: "subscription_required", error: TRIAL_ENDED_MESSAGE }`, and invoice and estimate counts are unchanged.
  - `tells a past_due owner their payment failed`: invoice POST returns 402 with `code: "payment_failed"`.
  - `applies the same rule to API-key callers`: `createApiKey(expiredOwner)` plus a `Bearer` invoice POST returns 402.
  - `leaves trial and Pro owners unaffected`: invoice POST returns 201 for a new account and for an `active` subscription with a future period end.
  - `keeps an expired owner's records and their clients' payments working` (Review Focus 5): for a SENT invoice owned by an expired owner, PUT edit, GET pdf and GET export invoices all return 200. `payPublicInvoice` (as `integration/billing.test.ts:62` uses it) reaches the mocked `checkout.sessions.create` and returns the Checkout URL.
- [ ] **Step 2:** ENV, INTEGRATION `integration/plan-enforcement.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `requireActivePlan` and the four call sites.
- [ ] **Step 4:** INTEGRATION the file, then `pnpm run test:integration` and BROWSER `e2e/clients.spec.ts e2e/delivery-payments.spec.ts`. Expected: all pass (fixture users are in trial).
- [ ] **Step 5: Commit:** `feat: require an active trial or subscription to create and send`

### Task 6: Billing routes, settings plan, banner and pricing copy (D1, D3, D5)

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`, `src/app/api/billing/portal/route.ts`, `src/app/(dashboard)/settings/plan-section.tsx`, `src/components/plan-banner.tsx`, `e2e/billing.spec.ts`
- Modify: `src/app/(dashboard)/settings/page.tsx`, `src/app/(dashboard)/layout.tsx` (banner above `{children}`), `src/app/page.tsx` (spec's exact hero line and FAQ 4), `scripts/browser-providers.mjs`, `e2e/launch.spec.ts`, `PRODUCT.md`, `DESIGN.md` (Settings component line), `README.md` (replace "Subscription purchases and plan enforcement are not implemented" with the plan and trial)

**Interfaces:**
- Consumes: `startCheckout`, `openBillingPortal`, `completeCheckout`, `getEntitlement` (Task 4); `PRO_PLAN` (Task 3); `TRIAL_ENDED_MESSAGE`, `PAYMENT_FAILED_MESSAGE` (Task 5); `formatDate` (`src/lib/utils.ts:14`).
- Produces: `POST /api/billing/checkout` and `POST /api/billing/portal`. Both are session-only; they return 401 without a session, otherwise `{ url }` or `{ error }` with the `BillingResult` status. Also `<PlanSection entitlement={...} billingReady={boolean} notice={"success" | "cancelled" | "portal" | null} />` with dates passed as ISO strings, and `<PlanBanner userId={string} />`, a server component.

- [ ] **Step 1: Extend provider fixtures** in `scripts/browser-providers.mjs`:
  - `POST /v1/customers` returns `{ id: "cus_browser_<n>", object: "customer" }`.
  - The existing `POST /v1/checkout/sessions` stores, for `mode=subscription`, `client_reference_id`, `customer`, `mode` and an expanded `subscription: { id: "sub_browser_<n>", object: "subscription", status: "active", customer, current_period_end: <now + 30 days>, cancel_at_period_end: false }`.
  - `GET /v1/subscriptions/sub_browser_*` returns it.
  - `GET /v1/billing_portal/configurations` returns `{ object: "list", data: [] }`; `POST` returns `{ id: "bpc_browser" }`.
  - `POST /v1/billing_portal/sessions` returns `{ url: "https://billing.stripe.com/p/session/browser" }`.
  - Every request is recorded with `record()`.
- [ ] **Step 2: Write failing browser tests** in `e2e/billing.spec.ts` (fixtures from `./fixtures`):
  - `a trial owner sees days left and subscribes through Stripe Checkout`: on `/settings` the "Plan" section shows "Free trial — 14 days left". Use `page.route("https://checkout.stripe.com/**", r => r.fulfill({ body: "checkout" }))` and click "Subscribe — US$9/month". The provider log has a `checkout` entry with `mode=subscription` and `line_items[0][price_data][unit_amount]=900`. Open `/settings?billing=success&session_id=<that id>`: the page shows "InvoiceFlow Pro", "Renews on" and "Thanks — your subscription is active.". "Manage billing" requests `billing.stripe.com`.
  - `an owner whose trial ended is told why and keeps their invoices`: `db.user.update({ trialEndsAt: <yesterday> })`. `/dashboard` shows "Your free trial has ended. Subscribe to create and send invoices.". Saving a new invoice on `/invoices/new` shows `TRIAL_ENDED_MESSAGE`. An existing invoice's page still opens.
  - In `e2e/launch.spec.ts`, `the landing page states the price`: the hero shows "Free for 14 days, then US$9/month.", and clicking "What does it cost?" reveals the spec's exact answer.
- [ ] **Step 3:** ENV, BROWSER `e2e/billing.spec.ts e2e/launch.spec.ts`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - The settings page takes `searchParams: Promise<{ billing?: string; session_id?: string }>`. For `billing=success` with a `session_id` it calls `completeCheckout`; for `billing=portal` it calls `getEntitlement(id, { refresh: true })`. `PlanSection` renders first, with `id="plan"`.
  - Copy (exact):
    - trial: "Free trial — {n} days left" ("1 day left"), then "Subscribe any time to keep creating and sending invoices after {date}.", button "Subscribe — US$9/month"
    - pro: "InvoiceFlow Pro", then "Renews on {date}." or "Ends on {date}. You won’t be charged again.", button "Manage billing"
    - past_due: "Payment failed", then `PAYMENT_FAILED_MESSAGE`, button "Update card"
    - ended: "Free trial ended", then `TRIAL_ENDED_MESSAGE`, button "Subscribe — US$9/month"
    - notices: "Thanks — your subscription is active." (only when the state is pro) and "Checkout was cancelled. You have not been charged."
    - When `!stripeConfigured()`: buttons disabled, with "Billing isn’t available yet."
    - Footnote links "Terms" and "Privacy Policy".
  - Banner (exact):
    - trial with 3 days or fewer: "Your free trial ends in {n} days. Subscribe to keep creating invoices." (singular "1 day")
    - ended: "Your free trial has ended. Subscribe to create and send invoices."
    - past_due: "Your last subscription payment failed."
    - Each links "Subscribe" or "Update card" to `/settings#plan`. Nothing renders otherwise.
  - Update PRODUCT.md "Capabilities and Constraints": subscriptions now exist as defined in the spec; endorsements and growth statistics are still never invented. Update DESIGN.md's Settings bullet, the README pricing line, and the FAQ.
- [ ] **Step 5:** BROWSER `e2e/billing.spec.ts e2e/launch.spec.ts e2e/design-review.spec.ts`. Expected: PASS.
- [ ] **Step 6: Commit:** `feat: let owners subscribe to InvoiceFlow Pro and see their plan`

### Task 7: Let API keys share invoices; describe the MCP tool truthfully (D9)

**Files:**
- Modify: `src/app/api/invoices/[id]/share/route.ts` (replace `auth()` with `requireUser(req)`), `src/app/api/mcp/route.ts` and `public/sdk/invoiceflow-mcp.mjs` (share tool description), `docs/AGENT_API.md:54`, `src/app/api-docs/page.tsx:35`
- Create: `integration/agent-share.test.ts`

**Interfaces:** Consumes `requireUser` and `createApiKey` (existing). The share tool description is exactly: "Get the public payment page link for an invoice that is SENT or OVERDUE (drafts cannot be shared). The page shows a Pay button when the account owner has connected Stripe. Does not email anyone."

- [ ] **Step 1: Write failing tests:** `an API key can share its owner's sent invoice` returns 200 with a URL containing `/i/`. `drafts are refused with an explanation` returns 400 with `{ error: "Only sent or overdue invoices can be shared" }`. `another owner's key gets 404`.
- [ ] **Step 2:** INTEGRATION `integration/agent-share.test.ts`. Expected: FAIL (401).
- [ ] **Step 3:** Make the route, description and docs changes. The docs list share as key-authorized; send stays session-only.
- [ ] **Step 4:** INTEGRATION the file, then UNIT `src/app/api/mcp/route.test.ts` and `node public/sdk/test-mcp.mjs`. Expected: PASS, "14 passed, 0 failed".
- [ ] **Step 5: Commit:** `fix(agent-api): let API keys share sent invoices`

### Task 8: Health check, sitemap, robots, live verifier and launch checklist (D11, D12)

**Files:**
- Create: `src/lib/health.ts`, `src/lib/health.test.ts`, `src/app/api/health/route.ts`, `integration/health.test.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `scripts/verify-live.mjs`, `docs/LAUNCH_CHECKLIST.md`
- Delete: `public/robots.txt`
- Modify: `e2e/launch.spec.ts`, `package.json` (lint list: add `scripts/verify-live.mjs`)

**Interfaces:**
- Consumes: `supportEmail` (Task 2), `appUrl`, `emailConfigured`, `getStripe`, `prisma`, `take` (existing).
- Produces (in `src/lib/health.ts`):
  - `LATEST_MIGRATION = "20261104000000_add_subscriptions"`
  - `type HealthChecks = { database; migrations; appUrl; authSecret; googleSignIn; stripeLiveKey; stripeWebhook; stripeChargesEnabled; email; cron; supportEmail }`, all `boolean`
  - `configChecks(): Omit<HealthChecks, "database" | "migrations" | "stripeChargesEnabled">`
  - `runHealthChecks(): Promise<{ ready: boolean; checks: HealthChecks }>`
- `GET /api/health` returns that JSON with `Cache-Control: no-store`, or 429 after 30 requests per minute per IP.

- [ ] **Step 1: Write failing tests.**
  - In `src/lib/health.test.ts`:
    - `LATEST_MIGRATION is the newest committed migration`: it equals the last sorted directory under `prisma/migrations`.
    - `.env.example placeholders never count as configured`: stub every variable to its `.env.example` value and every `configChecks()` value is `false`.
    - `live production values count as configured`: stub `AUTH_SECRET` (64 hex), `AUTH_GOOGLE_ID/SECRET`, `STRIPE_SECRET_KEY=sk_live_<24 chars>`, `STRIPE_WEBHOOK_SECRET=whsec_<24 chars>`, `RESEND_API_KEY=re_<24 chars>`, `RESEND_FROM_EMAIL=invoices@invoiceflow.example`, `CRON_SECRET` (32 chars), `SUPPORT_EMAIL` and `NEXT_PUBLIC_APP_URL=https://invoiceflow.example`. Every value is `true`.
  - In `integration/health.test.ts`, with `getStripe` mocked and `accounts.retrieve` resolving `{ charges_enabled: true }`: `database` and `migrations` are `true` against the migrated test database.
  - In `e2e/launch.spec.ts`:
    - `/sitemap.xml` contains `https://invoiceflow.example.test/privacy` and not `/dashboard`.
    - `/robots.txt` contains `Sitemap: https://invoiceflow.example.test/sitemap.xml` and `Disallow: /api/`.
    - `/api/health` returns 200 with a boolean `ready` and exactly the 11 `HealthChecks` keys.
- [ ] **Step 2:** UNIT, INTEGRATION, BROWSER as above. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Rules:
    - `authSecret`: at least 32 characters and not the placeholder
    - `googleSignIn`: both variables non-empty
    - `stripeLiveKey`: `/^(sk|rk)_live_/`
    - `stripeWebhook`: `/^whsec_[A-Za-z0-9]{16,}$/`
    - `email`: `emailConfigured()`, a key matching `/^re_[A-Za-z0-9_]{16,}$/`, and a sender not ending `@yourdomain.com`
    - `cron`: at least 16 characters and not the placeholder
    - `appUrl`: `appUrl()` does not throw and is `https:`
    - `database`: `SELECT 1`
    - `migrations`: the latest finished, non-rolled-back `_prisma_migrations.migration_name` equals `LATEST_MIGRATION`
    - `stripeChargesEnabled`: `(await getStripe().accounts.retrieve()).charges_enabled === true`, false on any error
  - Sitemap entries: `/`, `/login`, `/privacy`, `/terms`, `/api-docs`, `/sdk`. Robots disallows `/api/`, `/dashboard`, `/invoices`, `/clients`, `/estimates`, `/reports`, `/settings` and `/i/`.
  - `verify-live.mjs <origin>` prints `PASS`/`FAIL` per check and exits 0 only if all pass:
    - `/` returns 200 and contains "US$9"
    - `/login` returns 200
    - `/privacy` returns 200 and contains `mailto:`
    - `/terms` returns 200
    - `/sitemap.xml` returns 200 and contains `/privacy`
    - `/robots.txt` contains `Sitemap:`
    - `/jeb/` returns 404
    - GET `/api/invoices` returns 401
    - POST `/api/billing/checkout` returns 401
    - GET `/api/cron/chase-invoices` and `/api/cron/generate-recurring` return 401
    - `/api/health` reports `ready === true`, with each false check named
  - `docs/LAUNCH_CHECKLIST.md`: the owner steps, each with where to click, the value to enter, and the health check it turns green:
    - O1: allow `invoiceflow-ten-azure.vercel.app` in this cloud environment's network settings
    - O2: rotate the DeepSeek key
    - O3: revoke agent keys named "e2e-proof" and "proof" in Settings → API keys
    - O4: Vercel Production variables (`SUPPORT_EMAIL`, plus confirm `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, both database URLs and the Google variables)
    - O5: Stripe live activation, Connect, and a connected-accounts webhook to `/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.finalized`, `invoice.paid` and `account.updated`, then the live keys
    - O6: Google consent screen home, privacy and terms URLs, Publish app, and the redirect URI `…/api/auth/callback/google`
    - O7: buy a domain, verify it in Resend, set `RESEND_FROM_EMAIL`/`RESEND_API_KEY`
    - O8: the smoke test from the spec's definition of done
- [ ] **Step 4:** Rerun the tests. Expected: PASS. Then start the local production server (`pnpm run start --port 3100` with ENV, a test `AUTH_SECRET`, `CRON_SECRET=local-cron-secret-0123456789` and `SUPPORT_EMAIL=support@example.test`) and run `node scripts/verify-live.mjs http://127.0.0.1:3100`. Expected: every page and 401 check passes, and the health check FAILs naming at least `stripeLiveKey`, `stripeWebhook` and `googleSignIn`, with exit code 1. That shows the verifier catches a not-ready deployment.
- [ ] **Step 5: Commit:** `feat: add health check, sitemap and live launch verifier`

### Task 9: Release through `main`

**Files:** Modify `docs/RELEASE_VALIDATION.md` (new dated section with counts), `WORKLOG.md` (replace the "Deploy gotcha" sandbox-deploy instructions with "Production releases only through merge to `main`; see AGENTS.md").

- [ ] **Step 1:** ENV, then FULL. Expected: every command exits 0. Record the test counts.
- [ ] **Step 2:** Update the two docs and commit: `docs: record launch validation and release path`.
- [ ] **Step 3:** `git push -u origin claude/wonderful-allen-tuk3yg`, then open a PR to `main` titled "Launch: subscriptions, legal pages, release gate fix and health checks". The body summarises D1–D12 and links the spec and checklist. Subscribe to PR activity.
- [ ] **Step 4:** Wait for the CI `verify` job. Expected: success. Fix failures per the PR rules; never skip tests.
- [ ] **Step 5:** Merge the PR into `main` with a merge commit. This is authorized by the owner's approval of this plan.
- [ ] **Step 6:** Confirm the Vercel production status on the merge commit is success. The build's gate applies `20261104000000_add_subscriptions` to production. If the gate prints the "applied outside the release" message, give the owner its `migrate resolve` command.
- [ ] **Step 7:** `node scripts/verify-live.mjs https://invoiceflow-ten-azure.vercel.app` (needs O1). Expected: every page check passes; health lists only the checks the remaining owner steps will fix.

### Task 10: Owner steps and the final "live" report

- [ ] **Step 1:** Send the owner `docs/LAUNCH_CHECKLIST.md`, with the current failing health checks mapped to the O-steps that fix them.
- [ ] **Step 2:** After each step the owner reports done, rerun `verify-live.mjs` against production. Expected at the end: exit 0, `ready: true`.
- [ ] **Step 3:** The owner runs O8 (smoke test) and reports the result.
- [ ] **Step 4:** Only when Steps 2 and 3 both pass, report "InvoiceFlow is live and ready for customers", with the evidence: the merge commit, the CI run link, the `verify-live` output and the owner's smoke-test confirmation. If either has not passed, report exactly which check or step remains.
