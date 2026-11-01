<div id="top"></div>

<!-- HEADER -->
<div align="center">

# ⚡ InvoiceFlow

**Automated Stripe invoicing, smart payment chasing, and cash-flow management for freelancers and agencies.**

[![Live Demo](https://img.shields.io/badge/Demo-invoiceflow--ten--azure.vercel.app-0080ff?style=flat-square&logo=vercel&logoColor=white)](https://invoiceflow-ten-azure.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14_(App_Router)-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Postgres](https://img.shields.io/badge/Database-Neon_Serverless_Postgres-00E599?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Stripe](https://img.shields.io/badge/Payments-Stripe_Connect-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com/)
[![Resend](https://img.shields.io/badge/Email-Resend-000000?style=flat-square&logo=resend&logoColor=white)](https://resend.com/)

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#environment-variables">Environment Variables</a> •
  <a href="#api-reference">API Reference</a>
</p>

---

</div>

## Overview

**InvoiceFlow** is a modern SaaS platform designed to eliminate unpaid invoices and manual payment tracking. Freelancers and client businesses can create branded invoices, generate unguessable public checkout links, automate escalating payment reminders, run recurring subscription-style invoicing, and convert estimates into active invoices with one click.

- 🌐 **Production Deployment:** [https://invoiceflow-ten-azure.vercel.app](https://invoiceflow-ten-azure.vercel.app)
- 🔒 **Database:** Neon Serverless PostgreSQL with connection pooling and scale-to-zero compute.
- 💳 **Billing Engine:** Powered by Stripe Connect and Checkout with cryptographically verified webhooks.
- 📬 **Notification Pipeline:** High-deliverability transactional emails and reminders rendered with React Email.

---

## Features

| Feature | Description |
|---|---|
| **Invoice Management** | Complete CRUD lifecycle (`DRAFT` → `SENT` → `PAID` / `OVERDUE` / `CANCELLED`), line-item tax calculation, custom currencies, and PDF generation. |
| **Public Share Link** | Secure unguessable token link (`/i/[token]`) featuring custom business branding (logo, accent colors, address), SEO indexing protection (`noindex`), and instant payment checkout. |
| **Stripe Connect & Checkout** | Direct Stripe integration with support for credit cards, Apple Pay, and Google Pay. Gracefully handles unconfigured test modes. |
| **Escalating Payment Chaser** | Autonomous reminder engine (`POST /api/cron/chase-invoices`) with automated intervals before and after invoice due dates. |
| **Recurring Billing** | Flexible templates (weekly, biweekly, monthly, yearly) with automated month-end clamping; automated draft materialization via `/api/cron/generate-recurring`. |
| **Estimates & Quotes** | Proposal lifecycle (`DRAFT` → `SENT` → `ACCEPTED` → `DECLINED`) with atomic 1-click **Convert to Invoice** pipeline. |
| **Money Safety Guarantee** | Strict integer-cent arithmetic (`src/lib/money.ts`) with `HALF-UP` rounding to eliminate floating-point precision drift. |
| **Executive Reports** | Live analytics dashboard featuring monthly revenue trends, top client breakdown, average collection periods, and A/R aging buckets (Current / 30 / 60 / 90+ days). |
| **Tenant Isolation** | Scoped ownership checks on every database operation, Zod schema validation on all inputs, and rate-limited public endpoints. |

---

## Architecture

```
                           ┌─────────────────────────────┐
                           │      Client / Browser       │
                           └──────────────┬──────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │   Next.js Middleware (Auth)     │
                         └──────────────┬──────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
 ┌──────────────┐             ┌──────────────────┐            ┌──────────────────┐
 │ Landing Page │             │ Dashboard (App)  │            │  Public Invoice  │
 │     `/`      │             │  `/(dashboard)`  │            │   `/i/[token]`   │
 └──────────────┘             └─────────┬────────┘            └────────┬─────────┘
                                        │                              │
                                        ▼                              ▼
                         ┌─────────────────────────────────────────────────┐
                         │               API Routes & Crons                │
                         │   • /api/invoices        • /api/estimates       │
                         │   • /api/clients         • /api/cron/*          │
                         │   • /api/i/[token]/pay   • /api/webhooks/stripe │
                         └──────────────────────┬──────────────────────────┘
                                                │
         ┌──────────────────────────────────────┼──────────────────────────────────────┐
         ▼                                      ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐                   ┌──────────────────┐
│  Neon Postgres   │                  │  Stripe Connect  │                   │      Resend      │
│  (Prisma Engine) │                  │ (Checkout & Web) │                   │  (React Emails)  │
└──────────────────┘                  └──────────────────┘                   └──────────────────┘
```

---

## Project Structure

```sh
└── invoiceflow/
    ├── .github/workflows/          # CI/CD pipeline (Vitest, lint, type check)
    ├── prisma/
    │   ├── schema.prisma           # Prisma database schema
    │   └── seed.ts                 # Demo dataset generator
    ├── public/                     # Static assets & generated guides
    ├── scripts/                    # Maintenance & utility scripts
    ├── src/
    │   ├── app/
    │   │   ├── (dashboard)/        # Authenticated dashboard views
    │   │   │   ├── clients/        # Client directory & profiles
    │   │   │   ├── dashboard/      # Overview metrics & quick actions
    │   │   │   ├── estimates/      # Proposal creation & conversion
    │   │   │   ├── invoices/       # Invoice builder, sender, & editor
    │   │   │   ├── reports/        # Financial charts & aging buckets
    │   │   │   └── settings/       # Branding & payment setup
    │   │   ├── api/                # REST endpoints, webhooks & crons
    │   │   │   ├── cron/           # Recurring generation & payment chaser
    │   │   │   ├── i/[token]/pay/  # Stripe checkout session generator
    │   │   │   └── webhooks/       # Stripe event handlers
    │   │   ├── i/[token]/          # Public branded invoice payment portal
    │   │   └── page.tsx            # High-conversion marketing landing page
    │   ├── components/             # Reusable UI components & dialogs
    │   ├── emails/                 # React Email transactional templates
    │   ├── lib/                    # Core utilities (money, auth, prisma, security)
    │   └── middleware.ts           # Route protection & session enforcement
    ├── docker-compose.yml          # Local PostgreSQL 16 container
    └── vitest.config.ts            # Unit & integration test configuration
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.17+` or `v20+`
- **Package Manager**: `pnpm` (recommended), `npm`, or `yarn`
- **Database**: Local PostgreSQL or [Neon](https://neon.tech/)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/EarthyPunyapat/invoiceflow.git
cd invoiceflow
pnpm install
```

### 2. Environment Configuration

Copy the example environment template:

```bash
cp .env.example .env.local
```

Fill in your configuration keys (see [Environment Variables](#environment-variables)).

### 3. Database Setup

Using Docker Compose for local PostgreSQL:
```bash
docker compose up -d
pnpm db:push
```

Or connect directly to Neon Serverless Postgres:
```bash
# Push schema directly to database
pnpm db:push

# (Optional) Seed realistic demo data
pnpm db:seed
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Tests

```bash
pnpm test
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | Pooled PostgreSQL connection string (Neon / local) |
| `DATABASE_URL_UNPOOLED` | Optional | Direct connection string for schema migrations |
| `AUTH_SECRET` | **Yes** | NextAuth JWT and session encryption secret |
| `AUTH_GOOGLE_ID` | **Yes** | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | **Yes** | Google OAuth Client Secret |
| `NEXTAUTH_URL` | **Yes** | Canonical app URL (e.g., `https://invoiceflow-ten-azure.vercel.app`) |
| `STRIPE_SECRET_KEY` | Optional | Stripe API secret key for payment processing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Client-side publishable key for Stripe Elements |
| `STRIPE_WEBHOOK_SECRET` | Optional | Webhook signing secret from Stripe Dashboard |
| `RESEND_API_KEY` | Optional | Resend API key for transactional emails |
| `RESEND_FROM_EMAIL` | Optional | Verified sender address (e.g. `billing@yourdomain.com`) |
| `CRON_SECRET` | **Yes** | Secret bearer token required to invoke scheduled cron tasks |
| `NEXT_PUBLIC_APP_URL` | Optional | Base URL used when building shareable invoice links |

---

## API Reference

### Public Routes
- `GET /i/[token]` — Render public invoice view.
- `POST /api/i/[token]/pay` — Initialize Stripe Checkout session (rate-limited).

### Dashboard APIs (Authenticated)
- `GET/POST /api/invoices` — List and create invoices.
- `GET/PATCH/DELETE /api/invoices/[id]` — Retrieve, update, or void invoices.
- `POST /api/invoices/[id]/send` — Dispatch invoice email with payment link.
- `GET/POST /api/estimates` — Proposal management.
- `POST /api/estimates/[id]/convert` — Atomically convert accepted estimate to invoice.

### Automated Cron Jobs
All cron endpoints require `Authorization: Bearer <CRON_SECRET>`:
- `POST /api/cron/chase-invoices` — Identify overdue invoices and trigger escalating email reminders.
- `GET /api/cron/generate-recurring` — Check recurring schedules and generate new draft invoices.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
