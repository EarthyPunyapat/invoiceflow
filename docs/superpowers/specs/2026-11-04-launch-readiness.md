# Launch readiness — decisions and requirements

Date: 4 November 2026. The owner asked for a finished, live product and
delegated every product decision. This file records those decisions so they can
be changed later in one place. Code facts were checked against commit `9c156a4`.

## Decisions made on the owner's behalf

| # | Decision | Why |
|---|---|---|
| D1 | One paid plan, **InvoiceFlow Pro, US$9/month**, billed monthly by the platform's Stripe account. | The app currently has no way to earn. Free competitors exist, so the price is low and simple. |
| D2 | **14-day free trial, no card.** New accounts: trial ends 14 days after sign-up. Accounts that exist at launch: trial ends 14 days after the migration runs. | No friction to start; nobody already using it is locked out on launch day. |
| D3 | When the trial has ended and there is no active subscription, the owner **cannot** create invoices, create estimates, convert estimates or send invoice emails. They **can** view, edit, delete, download PDFs, export CSV and share links, and their clients can still open and pay invoices already sent. | Never hold a user's records or their clients' payments hostage. |
| D4 | Subscription state is synced **without a new webhook endpoint**: refreshed from Stripe on return from Checkout, on return from the billing portal, and lazily when a gated action finds the cached period has ended (or a customer has no recorded subscription). | Avoids an extra owner setup step and a second webhook secret. Stripe stays the source of truth. |
| D5 | Customers manage card, invoices and cancellation in the **Stripe billing portal**. Cancellation takes effect **at period end**. If no default portal configuration exists, the app creates one through the API. | No custom billing UI to build; live mode requires a saved portal configuration. |
| D6 | Entitled statuses are Stripe `active` and `trialing` with a period end in the future. `past_due` and `unpaid` are not entitled. A Stripe error during a lazy refresh never blocks a user whose cached status is `active` or `trialing`. | Strict but safe during provider outages. |
| D7 | Add **/privacy** and **/terms**. Operator: "InvoiceFlow". Governing law: **New Zealand** (the owner's commits are timestamped +13:00). Support contact comes from a new `SUPPORT_EMAIL` environment variable; the owner's personal address is never hard-coded. | Google sign-in for the public and Stripe both expect these pages. |
| D8 | **Remove the Jeb memorial from the product** (footer link, `public/jeb/`, root mirrors `public/app.js`, `public/style.css`, `public/assets/`). It stays in git history at `1ea6fb0` and can be deployed as its own project. | Unrelated agent logs on the page paying customers see. |
| D9 | **Allow API keys on `POST /api/invoices/{id}/share`** and describe the MCP share tool truthfully (SENT/OVERDUE only). | The advertised MCP flow currently always returns 401. |
| D10 | Launch on **https://invoiceflow-ten-azure.vercel.app**. A custom domain is needed for one reason: Resend will only email arbitrary recipients from a verified domain. The owner buys it (about US$10–15/year). Until then, invoices are shared by link, which already works and is explained in the UI. | A purchase can only be made by the owner. |
| D11 | Add a public **`GET /api/health`** that reports configuration readiness as booleans only, plus `scripts/verify-live.mjs`. "Live and ready" means that script passes against production and the owner's 10-minute signed-in smoke test passes. | A checkable definition of done. |
| D12 | Generate `sitemap.xml` and `robots.txt` from the configured app URL. | `robots.txt` currently advertises a sitemap that returns 404. |

## Exact copy

- Landing hero line, replacing "For independent people and small teams.": **"Free for 14 days, then US$9/month."**
- Landing FAQ 4 question **"What does it cost?"**, answer: **"Every account starts with a 14-day free trial, no card needed. After that, InvoiceFlow Pro is US$9 a month and you can cancel at any time. Stripe’s own processing fees apply when you accept a payment. Your existing invoices stay available and payable even if you stop subscribing."**
- Gate error, trial ended (HTTP 402, `code: "subscription_required"`): **"Your free trial has ended. Subscribe in Settings to create and send invoices. Existing invoices stay available and can still be paid."**
- Gate error, payment failed (HTTP 402, `code: "payment_failed"`): **"Your last subscription payment failed. Update your card in Settings to keep creating and sending invoices."**
- Login page, below the sign-in button, replacing "New here? Your workspace is created when you sign in.": **"New here? Your workspace is created when you sign in, with 14 days free. By continuing you agree to the Terms and Privacy Policy."** ("Terms" and "Privacy Policy" link to /terms and /privacy.)

## Legal page facts (prose is plain language; these facts are fixed)

Privacy policy: data collected (Google name, email and avatar; business profile; the user's clients' names, emails and addresses; invoices and estimates; hashed API keys; Stripe account and subscription identifiers; server logs). Purposes: providing the service, sending invoices and reminders when the user asks, billing the subscription. Processors: Vercel (hosting), Neon (database), Google (sign-in), Stripe (payments and subscription billing), Resend (email delivery). No selling of data, no advertising or analytics trackers. Deletion within 30 days of a verified request to the support address, except records the law requires us to keep. Rights: access, correction and deletion through the support address. The user is responsible for having a lawful basis for their clients' data. New Zealand Privacy Act 2020. Effective 4 November 2026.

Terms: service description; Google sign-in; 14-day trial; Pro US$9/month billed in advance through Stripe, renews automatically, cancel at any time effective at period end, no refunds for partial months except where the law requires; 30 days' notice of price changes; invoice payments go straight to the user's own Stripe account and InvoiceFlow is not a party to them, with Stripe fees applying; the user is responsible for invoice content, taxes and lawful use; no fraud or spam; the user is responsible for their API keys; service provided as is; liability capped at fees paid in the previous 12 months; either side may end the agreement; data export through CSV and PDF; New Zealand law; contact through the support address. Effective 4 November 2026.

## Launch definition of done

1. CI is green on `main` and Vercel has deployed it.
2. `node scripts/verify-live.mjs https://invoiceflow-ten-azure.vercel.app` exits 0, including `/api/health` reporting `ready: true`.
3. The owner reports that the smoke test in `docs/LAUNCH_CHECKLIST.md` passed: sign-in with a non-test Google account, a US$1 invoice emailed, paid and refunded, Pro subscribed and cancelled.

Steps only the owner can perform (accounts, identity, payment, DNS) are listed in `docs/LAUNCH_CHECKLIST.md`. They are actions, not decisions.
