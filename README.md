# InvoiceFlow

**Automated Stripe invoicing for freelancers.** Create branded invoices, send them with a public payment link, chase overdue payments automatically, run recurring billing, convert estimates to invoices — and watch it all on a reports dashboard.

## Tech Stack

- **Framework:** Next.js 14 (App Router) · TypeScript
- **Styling:** Tailwind CSS (dark mode supported) · Framer Motion
- **Auth:** NextAuth v5 (Google OAuth)
- **Database:** PostgreSQL 16 via Prisma · Docker Compose for local dev
- **Payments:** Stripe Connect (OAuth + webhooks) & Stripe Checkout
- **Email:** Resend + React Email templates
- **Background Jobs:** Cron-triggered API routes (`CRON_SECRET` bearer auth)
- **Testing:** Vitest · ESLint (next/core-web-vitals) · GitHub Actions CI

## Features

| Area | What you get |
|---|---|
| Invoices | CRUD, line items, tax, per-invoice currency, send-by-email, status lifecycle (DRAFT → SENT → PAID/OVERDUE/CANCELLED) |
| Public share page | Unguessable token URL `/i/[token]`, branded card (logo, accent color, business address), `noindex`, pay CTA |
| Online payment | Stripe Checkout session per invoice; graceful "not configured" state when keys are absent |
| Automated reminders | `POST /api/cron/chase-invoices`: escalating reminder cadence for SENT/OVERDUE invoices |
| Recurring invoices | Weekly/biweekly/monthly/yearly templates with month-end clamping; `GET /api/cron/generate-recurring` materializes drafts |
| Estimates | Full CRUD, status flow (DRAFT/SENT/ACCEPTED/DECLINED), one-click **convert to invoice** |
| Money safety | All arithmetic in integer cents (`src/lib/money.ts`) with HALF-UP rounding — no float drift |
| Reports | Revenue by month (SVG chart), top clients, average days-to-pay, A/R aging buckets (current/30/60/90+) |
| Branding | Business profile (name, logo, accent color, address) applied to shared invoices |
| Safety | Rate-limited public pay endpoint, Zod-validated request schemas (`src/lib/validators`), ownership checks on every query |

## Getting Started

```bash
npm install
# Copy .env.example → .env and fill in your keys
cp .env.example .env
# Start the local PostgreSQL 16 database via Docker Compose
docker compose up -d
npx prisma generate
npx prisma db push
# Optional: load demo data (clients/invoices across every status)
npm run db:seed
npm run dev
```

Opens at `http://localhost:3000`.

> Docker Compose provides the local Postgres database; its data persists in the named `invoiceflow-pgdata` volume; stop it with `docker compose down`.
>
> Seeded demo data lives under one user account. After signing in with Google, re-run the seed with your own email to see the dashboard populated:
> `SEED_DEMO_EMAIL="you@gmail.com" npm run db:seed`

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth encryption secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ✅ | Google OAuth credentials |
| `NEXTAUTH_URL` | ✅ | Canonical app URL for auth callbacks |
| `STRIPE_SECRET_KEY` | For payments | Enables Stripe Connect + Checkout (pay endpoint returns 503 without it) |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Verifies `POST /api/webhooks/stripe` signatures |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | For payments | Client-side Stripe |
| `RESEND_API_KEY` | For email | Invoice delivery + reminders (send fails gracefully when unset) |
| `RESEND_FROM_EMAIL` | For email | From address on outgoing invoice/reminder emails |
| `FREELANCER_NOTIFY_EMAIL` | Recommended | Your inbox for payment/activity notifications |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Optional | Reserved for future background-job integration — not read by current code |
| `NEXT_PUBLIC_APP_URL` | Recommended | Absolute URLs in emails / share links |
| `CRON_SECRET` | For cron | Bearer token required by both `/api/cron/*` routes |
| `SEED_DEMO_EMAIL` | Optional | Target account for demo seed data |

The app boots without Stripe/Resend keys — those features degrade gracefully instead of crashing.

## Architecture

```
Browser ──► middleware.ts (session gate)
   │
   ├─► /            Landing page (marketing)
   ├─► /(dashboard) Server components: dashboard, invoices, clients,
   │                estimates, reports, settings — auth() + prisma direct
   ├─► /i/[token]   PUBLIC branded invoice view + Stripe Checkout CTA
   │
   └─► /api/* ────► Prisma Client ────► PostgreSQL
         ├── auth/[...nextauth]     Google OAuth
         ├── clients[/id]           CRUD
         ├── invoices[/id][/send]   CRUD, status transitions, email+share token
         ├── estimates[/id][/convert] CRUD + atomic estimate→invoice handoff
         ├── i/[token]/pay          Rate-limited Checkout session minting
         ├── cron/chase-invoices    Reminder escalation (bearer CRON_SECRET)
         ├── cron/generate-recurring Materializes due recurring drafts
         └── webhooks/stripe        Signature-verified payment events

Side services: Stripe (Checkout + Connect + webhooks) · Resend (invoice,
reminder & receipt emails via React Email templates) · external cron hitting
/api/cron/* with `Authorization: Bearer $CRON_SECRET`.
```

**Conventions**

- Every mutating route: `auth()` guard → ownership via `findFirst({ id, userId })` → validate → cents-math → Prisma write.
- Money never floats through math: inputs go through `dollarsToCents()` (string-slicing + HALF-UP), sums/tax happen on integers (`sumCents`, `applyTaxPercent`), storage converts back once via `centsToDollars()`.
- Pure logic (money, aging, reminders cadence, invoice numbering, recurring date math, rate limiter) lives in `src/lib/*.ts` as unit-tested functions; API routes stay thin.
- Public endpoints defense: 128-bit hex share tokens, regex shape validation, fixed-window rate limit (`src/lib/rate-limit.ts`).

## Testing

```bash
npm test         # vitest, single pass (118 tests across 12 files)
npm run test:watch
npm run lint     # eslint next/core-web-vitals
npx tsc --noEmit # full typecheck incl. prisma/seed.ts
npm run build    # production build
```

Unit tests cover the pure libraries: money rounding/conversion, tax breakdowns, invoice number sequencing, reminder scheduling, aging buckets, recurring date clamping (leap years, month ends), token generation/validation, and the rate limiter.

CI (`.github/workflows/ci.yml`) runs on pushes/PRs to `main` (Node 20): `npm ci → prisma generate → tsc --noEmit → lint → test`. It intentionally skips `next build` and provisions no database service — compile safety is covered by typecheck, and nothing in CI connects to Postgres.

## Recurring Invoices API

A `RecurringInvoice` template clones itself into fresh DRAFT invoices each time
its schedule comes due. Schedules are `WEEKLY`, `BIWEEKLY`, `MONTHLY` or
`YEARLY`; all math is UTC and month-end dates clamp safely (Jan 31 → Feb 28 on
non-leap years, Feb 29 → Feb 28 after a leap year). Each generated invoice gets
the next `INV-YYYYMM-NNNN` number and line items/tax recomputed through the
integer-cents pipeline — never copied as floats.

Trigger it from any external scheduler:

```bash
curl -X GET "$NEXT_PUBLIC_APP_URL/api/cron/generate-recurring" \
  -H "Authorization: Bearer $CRON_SECRET"
```

- Missing `CRON_SECRET` on the server → `503 {"error": "CRON_SECRET not configured"}`
- Wrong/absent bearer token → `401`
- Success → `{ ok, processed, generated, skipped, details, durationMs }`

The sibling `POST /api/cron/chase-invoices` uses the same bearer guard for its
escalating friendly → firm → final reminder cadence.

## Project Structure

```
prisma/
├── schema.prisma        # User/Client/Invoice(+Item)/Estimate(+Item)/RecurringInvoice/StripeAccount
└── seed.ts              # Demo data (npm run db:seed)
src/
├── app/
│   ├── page.tsx             # Landing page (hero, features, pricing, FAQ, CTA)
│   ├── i/[token]/           # Public branded invoice view (+ pay button)
│   ├── (dashboard)/         # Authenticated app: dashboard, invoices, clients,
│   │                        # estimates, reports, settings
│   └── api/                 # See architecture map above
├── components/
│   ├── ui/                  # Button, input, select, badge primitives
│   ├── aging-report.tsx     # A/R aging widget (dashboard + reports)
│   ├── video-lightbox.tsx, interactive-cost-calculator.tsx, …  # Marketing widgets
│   └── reports/             # SVG bar chart (revenue by month)
├── lib/
│   ├── money.ts, invoice-number.ts, reminders.ts, aging.ts,
│   │                        # Pure logic — unit-tested, no I/O
│   ├── recurring.ts, rate-limit.ts, token.ts, invoice-filters.ts, reports.ts
│   ├── validators/          # Zod schemas for every mutating API route
│   └── stripe.ts, resend.ts, prisma.ts, auth.ts, brand.ts  # Integrations
├── emails/                  # React Email templates
└── middleware.ts            # Auth middleware (protects dashboard routes)
```

## Key Conversion Features

- **Loss aversion:** Interactive cost calculator showing real dollar loss from manual invoicing
- **Social proof:** Live rotating counter ("X freelancers joined this week")
- **Decoy pricing:** Three-tier pricing with asymmetric dominance
- **Exit intent:** Desktop exit-intent popup (once per session)
- **Reciprocity:** Free downloadable guide (no email required)
- **Urgency:** "Early adopter pricing — lock in $19/mo forever"
