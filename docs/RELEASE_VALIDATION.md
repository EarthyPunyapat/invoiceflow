# Release validation — 1 November 2026

The local release candidate was validated on Node 22.23.4, pnpm 10.34.9,
Next.js 15.5.28, Prisma 5.22 and PostgreSQL 16.

| Check | Result |
|---|---|
| Frozen pnpm installation | Passed |
| TypeScript and ESLint | Passed |
| Unit tests | 156 passed across 17 files |
| Database integration tests | 43 passed across 3 files |
| Billing suite with connection_limit=1 | All 23 tests passed |
| Production build | Passed |
| Applied migrations versus Prisma schema | No drift |
| Local production HTTP smoke | 12 requests passed |
| Production dependency audit | No high/critical findings; one low upstream deepmerge advisory |

The integration suite uses a disposable local database and mocked provider calls.
It exercises signed Stripe webhook fixtures, payment/account/amount matching,
retry and concurrency behavior, email rendering, numbering, recurring rollback,
financial-record protection and currency-safe reporting.

HTTP smoke covered the landing/login pages, a locally encoded auth session,
unauthenticated API rejection and dashboard redirect, authenticated dashboard and
reports, public invoice and malformed-token handling, PDF generation, CSV export,
and rejection of an unconfigured cron job. It did not complete Google's external
OAuth exchange.

## Remaining release gates

- Configure the actual Vercel origin, Neon URLs, Google application, Stripe
  Connect endpoint/mode, verified Resend sender and cron secret in Vercel.
- Back up and safely baseline any existing database before applying migrations.
- Complete the deployed test-mode journey in [DEPLOYMENT.md](DEPLOYMENT.md).
  Real Google sign-in, Stripe payments/webhook delivery and Resend delivery have
  not been verified from this cloud task.
- Approve support contact, privacy/terms and commercial launch pricing before
  a public commercial launch. The UI currently describes early access, without
  subscription billing or fabricated customer endorsements.

The original validation was local. The code was subsequently pushed to GitHub
as `7b4a189`, triggering the linked Vercel deployment.

## Production incident and release correction

The reported production digest `3455935868` was confirmed by Vercel logs as
Prisma `P2022`: `Invoice.checkoutSessionId` was missing. Authentication reached
the dashboard, but the database had not received the billing-safety migration.
The release pipeline had generated Prisma Client without applying its schema.

The follow-up production build now includes a guarded migration step. It verifies
legacy schema before baselining, refuses drift or duplicate invoice numbers,
serializes releases and applies committed migrations before building. It does
not use `db push`, resets or delete application data. External verification of
the completed follow-up deployment remains required.

The follow-up passed 156 unit tests, all 51 database integration tests (including
8 production rollout cases), ESLint, TypeScript and the production build.
The rollout regression reproduced `P2022 Invoice.checkoutSessionId` before the
gate, then read the original invoice successfully afterward with its data
preserved. Empty databases, repeat/concurrent builds and refusal of drift,
duplicates, unknown migration history and mismatched targets were also tested.
Published migration SQL and checksums were left unchanged.

## Client creation browser regression — 2 November 2026

The invoice/estimate client selector now includes inline client creation,
automatically selects the saved client, preserves the parent draft and displays
loading/retry/session-expiry errors. Its lightweight options API is owner-scoped.

Eight Chromium tests against the local production server cover standalone client
creation and selection, first-client creation during invoice/estimate entry,
saving the resulting invoice/estimate, failed list/save retries, expired sessions,
validation/cancel and mobile entry. These browser checks now run in GitHub CI.
External production verification remains separate from these local results.


## Visual rework — 2 November 2026

The landing, login, application shell and shared controls now follow the approved
warm-white/ink/evergreen design system. Overview and Reports use aligned summary
figures; document statuses, branding, navigation and responsive spacing are
consistent across the application. Settings no longer exposes a dead Pro upgrade.
The prior inline client-creation fix remains covered by real browser workflows.

| Check | Result |
| --- | --- |
| Node / pnpm | 22.23.4 / 10.34.9 |
| Frozen lockfile install | Passed using this environment's existing pnpm store |
| ESLint / TypeScript | Passed |
| Unit tests | 156 passed across 17 files |
| PostgreSQL integration tests | 53 passed across 5 files |
| Production build | Passed |
| Chromium browser suite | 12 passed, including 13 routes at 3 viewport widths |
| Production dependency audit | No high/critical findings; one low advisory |

See [DESIGN_REVIEW.md](DESIGN_REVIEW.md) for screenshots, behavior checks and
explicit design-meter tradeoffs. These results are local; Vercel build status,
real OAuth, live provider delivery and production payment behavior are not
established by this review. Releases continue through GitHub main and the linked
Vercel integration, without deploying from the cloud sandbox.


## PDF correction — 2 November 2026

Invoice exports now follow a measured A4 layout with separate metadata, correct
monetary tax, saved payment notes and safe multi-page flow. See [PDF_REVIEW.md](PDF_REVIEW.md)
for the reproduced overlap, rendered example and regression coverage.

Validation: 165 unit tests, 53 PostgreSQL integration tests, 14 production-server
Chromium checks, ESLint, TypeScript, frozen installation and production build
passed. The two additional browser checks cover real PDF downloads and access
controls. No schema migration or provider configuration change is needed.


## Email and online payments correction — 2 November 2026

Save & Send now uses the delivery endpoint after persisting one draft. Provider
acceptance is recorded explicitly, failed sends are retryable without duplicate
invoices, existing issued invoices can be emailed, and explicit resends have
retry keys. Checkout now refreshes Stripe readiness; owner settings and public
payment errors identify setup/account blockers.

Validation: production build, ESLint, TypeScript, 165 unit tests, 66 database
integration tests and 20 Chromium checks passed. The 36 billing tests also pass
with one database connection. Browser provider HTTP is simulated at the SDK
boundary; live delivery, real onboarding and payment completion remain separate
production checks. See [DELIVERY_PAYMENTS.md](DELIVERY_PAYMENTS.md).

## Launch readiness — 4 November 2026

Branch `claude/wonderful-allen-tuk3yg` adds the InvoiceFlow Pro subscription
(US$9/month after a 14-day trial), plan enforcement on create/send, privacy
and terms pages, the release-gate fix for pending migrations, API-key invoice
sharing, `/api/health`, generated sitemap/robots and `scripts/verify-live.mjs`.

| Check | Result |
|---|---|
| ESLint and TypeScript | Passed |
| Unit tests | 187 passed across 22 files |
| Database integration tests | 91 passed across 9 files (local `invoiceflow_test`) |
| Production build | Passed |
| Chromium workflows | 27 passed |
| Production dependency audit | No high/critical findings; one low advisory |
| `verify-live.mjs` against the local production server | 11 checks passed; health correctly not ready without live Stripe, Google and email configuration |

Stripe, Resend and Google are simulated at the HTTP boundary in tests. Live
subscription checkout, Connect payments, email delivery and Google sign-in are
verified by the owner's smoke test in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

