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
