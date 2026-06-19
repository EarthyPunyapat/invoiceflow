# InvoiceFlow

**Automated Stripe invoicing for freelancers.** Connects to Stripe via OAuth and auto-generates branded invoices for every payment, with smart reminders and a dashboard.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (dark mode supported)
- **Animation:** Framer Motion
- **Auth:** NextAuth v5 (Google OAuth)
- **Database:** PostgreSQL via Prisma
- **Payments:** Stripe (OAuth connect, webhooks)
- **Email:** Resend
- **Background Jobs:** Inngest

## Getting Started

```bash
npm install
# Copy .env.example → .env and fill in your keys
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

Opens at `http://localhost:3000`

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Landing page (hero, features, pricing, FAQ, CTA)
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Design system tokens + glass panel styles
│   ├── login/            # Sign-in page
│   ├── (dashboard)/      # Authenticated app (invoices, clients, dashboard, settings)
│   └── api/              # API routes (Stripe webhooks, dashboard stats, etc.)
├── components/
│   ├── video-lightbox.tsx          # Animated product demo modal (framer-motion)
│   ├── interactive-cost-calculator.tsx  # Animated cost calculator with sliders
│   ├── exit-intent-popup.tsx        # Conversion popup on exit
│   ├── comparison-table.tsx         # InvoiceFlow vs Manual vs FreshBooks
│   ├── pricing-toggle-section.tsx   # Monthly/annual toggle
│   ├── live-social-proof.tsx        # Rotating social proof counter
│   └── ui/                          # Base UI components (button, input, select, badge)
├── lib/                # Prisma client, auth config, Stripe helpers, email
├── emails/             # React Email templates
└── middleware.ts       # Auth middleware (protects dashboard routes)
```

## Key Conversions Features

- **Loss aversion:** Interactive cost calculator showing real dollar loss from manual invoicing
- **Social proof:** Live rotating counter ("X freelancers joined this week")
- **Decoy pricing:** Three-tier pricing with asymmetric dominance
- **Exit intent:** Desktop exit-intent popup (once per session)
- **Reciprocity:** Free downloadable guide (no email required)
- **Urgency:** "Early adopter pricing — lock in $19/mo forever"

## Recent Fixes (June 2026)

1. **VideoLightbox** — Replaced static text step-through with an animated 4-screen product demo using framer-motion (Stripe connect mockup, invoice card with staggered line items, notification with ringing bell, dashboard with animated bars and mini-chart). Auto-advances every 4.8s.
2. **InteractiveCostCalculator** — Added animated counters, custom animated range sliders with gradient fills, animated comparison bar chart, pulsing savings badge.
3. **Modal sizing** — VideoLightbox modal now scales from `max-w-sm` (mobile) to `max-w-xl` (desktop) instead of staying phone-sized on monitors.
