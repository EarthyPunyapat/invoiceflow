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

The code and reusable environment instructions were prepared locally. No GitHub
push, Vercel deployment or environment publication was performed by this task.
