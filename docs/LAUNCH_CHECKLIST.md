# Launch checklist

These are the steps only the owner can do, because they need the owner's
accounts, identity, card or DNS. Everything else is done in code.

**How you know it worked:** after each step, run (or ask Claude to run):

```bash
node scripts/verify-live.mjs https://invoiceflow-ten-azure.vercel.app
```

The last line names any health checks that are still failing. Each step below
says which check it turns green. Launch is done when the script prints
`0 failed` **and** the smoke test (O8) passes.

Production URL used below: `https://invoiceflow-ten-azure.vercel.app`. If you
later add a custom domain, use it everywhere instead and update
`NEXT_PUBLIC_APP_URL`.

---

## O1. Let Claude reach the live site — done 4 Nov 2026

The cloud environment now allows all domains.

## O2. Rotate the leaked DeepSeek key

The key was published in git history (commits `cd0bfad`, `96899a5`).

1. Sign in at the DeepSeek platform → API keys.
2. Delete the key that starts `sk-c8d8`. Create a new one only if something still needs it.

Turns green: nothing (no health check), but this closes a real leak.

## O3. Revoke API keys created by the agent

1. Sign in to InvoiceFlow → Settings → API keys.
2. Revoke any key named `e2e-proof`, `proof` or `agent` that you did not create.

## O4. Vercel production settings

Vercel → the InvoiceFlow project → Settings → Environment Variables. Set each
of these for **Production**:

| Variable | Value | Health check |
|---|---|---|
| `SUPPORT_EMAIL` | the inbox you will answer customers from | `supportEmail` |
| `NEXT_PUBLIC_APP_URL` | `https://invoiceflow-ten-azure.vercel.app` | `appUrl` |
| `AUTH_SECRET` | 64 random hex characters (`openssl rand -hex 32`); keep the existing one if set | `authSecret` |
| `CRON_SECRET` | 64 random hex characters; keep the existing one if set | `cron` |
| `DATABASE_URL` | Neon **pooled** connection string | `database` |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string, same database | `migrations` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | from O6 | `googleSignIn` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | from O5 | `stripeLiveKey`, `stripeWebhook`, `stripeChargesEnabled` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | from O7 | `email` |

Environment variables apply to new deployments only: after changing them, open
Deployments → the latest production deployment → ⋯ → **Redeploy**.

## O5. Stripe live mode

In the Stripe Dashboard, with **Test mode switched off**:

1. **Activate the account.** Complete business details, identity verification and the payout bank account when Stripe asks.
2. **Enable Connect.** Connect → Get started. Choose a platform where sellers use **Express** accounts. Complete the platform profile.
3. **Add the webhook.** Developers → Webhooks → Add endpoint.
   - Endpoint URL: `https://invoiceflow-ten-azure.vercel.app/api/webhooks/stripe`
   - Listen to: **Events on Connected accounts**
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.finalized`, `invoice.paid`, `account.updated`
   - Copy the signing secret (`whsec_…`) into Vercel as `STRIPE_WEBHOOK_SECRET`.
4. **Copy the live secret key.** Developers → API keys → Secret key (`sk_live_…`) into Vercel as `STRIPE_SECRET_KEY`.
5. Redeploy (see O4).

You don't need to create a product or price for InvoiceFlow Pro. Checkout
creates the US$9/month price itself, and the billing portal configuration is
created on first use.

Turns green: `stripeLiveKey`, `stripeWebhook`, `stripeChargesEnabled`.

## O6. Google sign-in for everyone

Google Cloud Console → APIs & Services:

1. **Credentials** → your OAuth 2.0 Client → Authorized redirect URIs must include
   `https://invoiceflow-ten-azure.vercel.app/api/auth/callback/google`.
   The client ID and secret go into Vercel as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
2. **OAuth consent screen** (Branding):
   - App home page: `https://invoiceflow-ten-azure.vercel.app`
   - Privacy policy: `https://invoiceflow-ten-azure.vercel.app/privacy`
   - Terms of service: `https://invoiceflow-ten-azure.vercel.app/terms`
   - Support email: the same inbox as `SUPPORT_EMAIL`
3. **Audience / Publishing status** → **Publish app** so it reads *In production*.
   Until you do, only listed test users can sign in. InvoiceFlow asks only for
   name, email and profile picture, which need no Google verification.

Turns green: `googleSignIn` (configuration). Real sign-in is confirmed in O8.

## O7. Email to your customers' clients (needs a domain)

Resend only delivers to arbitrary recipients from a domain you have verified.
Its shared testing sender (`onboarding@resend.dev`) only reaches your own Resend
account address, so the `email` health check stays red until the sender is on
your own domain.
Until this step is done, invoices can still be shared by link, and the app
explains why email is unavailable.

1. Buy a domain (about US$10–15/year), e.g. through Vercel → Domains.
2. Resend → Domains → Add domain → add the DNS records it shows → wait for *Verified*.
3. Resend → API keys → create a key with sending access.
4. In Vercel set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (e.g. `invoices@yourdomain`), then redeploy.
5. Optional: attach the domain to the Vercel project, then update `NEXT_PUBLIC_APP_URL`, the Google redirect URI, the Stripe webhook URL and the consent-screen links to the new domain.

Turns green: `email`.

## O8. Ten-minute smoke test

With everything above green, in a private browser window:

1. Sign in with a Google account that was **not** a test user. You land on the dashboard and Settings shows *Free trial — 14 days left*.
2. Settings → Connect Stripe → finish Express onboarding with your own details.
3. Add a client with **your own** email address, then create a US$1.00 invoice and choose **Save & Send**.
4. Open the email, click through to the invoice and pay it with your own card.
5. Within a minute the invoice shows **Paid**. Refund the payment in the Stripe Dashboard.
6. Settings → **Subscribe — US$9/month** → pay → you return to *InvoiceFlow Pro, Renews on …*.
7. **Manage billing** → cancel. Settings shows *Ends on …*. Refund the US$9 in Stripe if you like.

Tell Claude "smoke test passed", or describe the step that failed.
