# InvoiceFlow

InvoiceFlow is an invoicing app for freelancers. Manage clients, create branded invoices and estimates, share public payment links, collect payments through Stripe Connect, and automate overdue reminders.

## Stack

- Node.js 22 and pnpm 10.34.9 (`packageManager` in `package.json`)
- Next.js 15 App Router, React 18, TypeScript, Tailwind CSS and Framer Motion
- NextAuth v5 with Google OAuth and JWT sessions
- Prisma 5 and PostgreSQL 16; Docker Compose locally, Neon for deployment
- Stripe Connect Express and Checkout; Resend and React Email
- Vitest unit and PostgreSQL integration tests; ESLint and GitHub Actions

## Implemented workflows

| Area | Behavior |
|---|---|
| Clients and invoices | Owner-scoped management, line items, percentage tax, draft editing and controlled status changes |
| Invoice delivery | Resend email containing a stable public `/i/[token]` link |
| Public invoices | Branded view, PDF export from the authenticated app, unguessable share tokens and `noindex` metadata |
| Online payments | Tax-inclusive grand total, reuse of open Checkout sessions, signed webhook reconciliation |
| Reminders | Escalating email reminders for sent and overdue invoices |
| Recurring invoices | Scheduled draft generation and schedule advancement in one database transaction |
| Estimates | Create and manage estimates; convert an estimate to an invoice once |
| Reports and exports | Revenue, outstanding balances, aging, client reports and CSV export |
| Business profile | Name, address, logo, accent color and invoice numbering prefix |

The app offers early access. Subscription purchases and plan enforcement are not implemented. Invoice payments are separate from billing users for access to InvoiceFlow.

## Local development

Install Node.js 22 and the pinned pnpm version first. Keep existing local configuration rather than replacing it.

```bash
pnpm install --frozen-lockfile
test -e .env || cp .env.example .env
# Configure .env before continuing.
docker compose up -d --wait
pnpm run db:generate
pnpm run db:deploy
pnpm run dev
```

Use the local PostgreSQL URL from `.env.example` for both `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Generate an `AUTH_SECRET`, add Google OAuth credentials, and use `http://localhost:3000` for `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`. Register `http://localhost:3000/api/auth/callback/google` in the Google OAuth client.

Leave optional Stripe and Resend keys empty until you have valid credentials; the example strings are placeholders. Unconfigured integrations return an unavailable response. Google sign-in and the full send/pay workflow require their actual service configuration.

`pnpm run db:deploy` applies committed migrations to a new development database. If an existing database was created using `prisma db push`, follow the [baseline procedure](docs/DEPLOYMENT.md#existing-database-without-migration-history) before applying migrations. Never use `db push` or `migrate reset` to deploy production schema changes.

The Compose database uses a persistent named volume. `docker compose down` stops it without deleting that volume.

Optional demo data:

```bash
# Only against a disposable development database.
pnpm run db:seed
```

The seed replaces the account selected by `SEED_DEMO_EMAIL` (default `demo@invoiceflow.dev`) and its related data. Do not target a real customer account or production database.

## Configuration

| Variable | Use |
|---|---|
| `DATABASE_URL` | Prisma runtime PostgreSQL connection; use Neon's pooled URL in deployment |
| `DATABASE_URL_UNPOOLED` | Direct database connection for Prisma migrations |
| `AUTH_SECRET` | Stable, private NextAuth signing/encryption secret |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google web OAuth client credentials |
| `NEXTAUTH_URL` | Canonical auth origin; HTTPS in production |
| `AUTH_TRUST_HOST` | Set to `true` only behind the trusted deployment proxy, such as Vercel |
| `NEXT_PUBLIC_APP_URL` | Canonical public HTTPS origin for invoice, payment and email URLs |
| `STRIPE_SECRET_KEY` | Stripe platform API key for Connect and Checkout |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this deployment's connected-account webhook endpoint |
| `STRIPE_CONNECT_COUNTRY` | Supported Connect country for newly created accounts; defaults to `US` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email API key and a sender on a verified Resend domain |
| `FREELANCER_NOTIFY_EMAIL` | Fallback only when the invoice owner has no email address |
| `CRON_SECRET` | Bearer secret for scheduled invoice generation and reminders |
| `SEED_DEMO_EMAIL` | Disposable account targeted by the destructive demo seed |

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is reserved in the example configuration; the current hosted Checkout redirect does not use a browser Stripe SDK. The `INNGEST_*` variables are also unused.

Keep secrets in ignored local environment files or the hosting provider's secure settings. Preview and production deployments should use separate databases and service keys.

## Validation

```bash
pnpm test
pnpm run lint
pnpm run build
pnpm run typecheck
pnpm audit --prod --audit-level high
```

The build generates Prisma Client, compiles all routes, and produces the production application. Google Fonts access is needed for the configured `next/font` loader. Prisma downloads must retain TLS and checksum verification.

Integration tests use a separate disposable **local** database named `invoiceflow_test`. Create it once:

```bash
docker compose exec -T db createdb -U postgres invoiceflow_test
```

Then run:

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/invoiceflow_test?schema=public'
export DATABASE_URL_UNPOOLED="$DATABASE_URL"
pnpm run db:deploy
pnpm run test:integration
```

Run these exports in a separate shell from the development server. The suite rejects remote databases and other database names. It uses real PostgreSQL transactions and signed Stripe fixtures, with external Stripe/Resend requests mocked. It covers invoice totals, public links, checkout reuse, webhook verification and retries, concurrent numbering/conversion, and recurring transaction rollback. It does not establish that live OAuth, payment or email credentials work.

GitHub Actions runs frozen installation, Prisma generation, migrations, lint, unit and integration tests, production build, typechecking and a production dependency audit using PostgreSQL 16 and Node.js 22.

## Deployment

Use [the Vercel and Neon release guide](docs/DEPLOYMENT.md) for migration handling, service configuration, scheduled jobs and the required test-mode release smoke test. Passing local checks is separate from validating a deployed application.

## Scheduled jobs

Both jobs use `GET` and require `Authorization: Bearer <CRON_SECRET>`:

- `/api/cron/generate-recurring` creates due draft invoices and advances their schedules.
- `/api/cron/chase-invoices` sends due reminders.

`vercel.json` schedules generation at 00:00 UTC and reminders at 09:00 UTC each day. Vercel sends the bearer header when `CRON_SECRET` is configured. Check the plan's scheduling and function-duration limits before enabling a larger workload.

## Current product boundaries

- Online Checkout supports currencies with two decimal places and positive totals within its validated amount limit. It charges one tax-inclusive invoice total; the public invoice supplies the breakdown.
- Dashboard and reports show monetary totals for the selected currency. They do not convert currencies or provide a consolidated foreign-exchange total. Recent invoices display their own currency.
- Public payment IP throttling is in memory and therefore best effort across Vercel instances. A distributed rate limiter is needed for a larger deployment.
- Payment confirmation email currently goes to the invoice owner, not a separate customer receipt workflow.
- Recurring jobs create drafts; they do not automatically send them or charge stored payment methods.
- Invoice/subscription accounting, refunds, partial payments and SaaS plan billing require separate product work.

## Structure

```text
prisma/             Schema, migrations and disposable demo seed
src/app/            Marketing, authenticated app, public invoices and API routes
src/lib/            Billing, auth, money, reporting, validation and integrations
src/emails/         React Email templates
src/components/     UI, reports and marketing components
integration/        PostgreSQL-backed billing regression tests
.github/workflows/  CI
```
