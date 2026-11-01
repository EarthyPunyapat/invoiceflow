# Invoice delivery and payment correction

The reported symptoms were a public Pay now action returning “Online payment
unavailable” and invoices marked Sent without email arriving.

## Corrected behavior

| Before | After |
| --- | --- |
| Save & Send only created an invoice with status SENT | Save one DRAFT, call the actual send endpoint, then mark SENT after provider acceptance |
| Failed sending had no clear recovery action | Keep the same saved draft, show the failure and offer Send invoice; no duplicate creation |
| Previously issued invoices had no email action | Send an existing SENT/OVERDUE invoice; Send again explicitly requests another email |
| Any non-error provider response could count as success | Require a provider message ID before recording acceptance |
| A retry could generate a different, previously uncommitted share URL | Commit the stable share token before contacting the provider; retries retain the same payload/key |
| Public payment 503 responses were replaced by one generic notice | Preserve the useful public reason and show a contact/payment-instructions fallback |
| Checkout trusted a cached onboarding flag | Retrieve Stripe account readiness, reconcile the cache and require charges enabled plus details submitted |
| Settings showed the cached Connected label | Fresh account readiness, country, setup/review state, refresh and resume-onboarding actions |

A SENT record can still represent an invoice issued outside the app. “Mark sent
manually” is separate from sending email. `invoiceEmailedAt` records that the
provider accepted a message, which is separate from SMTP delivery, inbox
placement or reading the email. Failed or unconfirmed acceptance does not set
that timestamp. Invoice totals, payment matching and account ownership checks
remain enforced.

The initial email request uses an invoice-specific idempotency key. Explicit
resends accept a validated request UUID, allowing a retry of that operation
within the provider's idempotency retention window. The sender must be configured rather than
falling back to an unverified InvoiceFlow domain. Provider responses explain
unverified senders, testing-recipient restrictions and rejected credentials.

## Production setup and diagnosis

In the deployed Settings page:

- Invoice email reports whether both service credentials and a sender are
  configured. The Deployment setup disclosure names RESEND_API_KEY and
  RESEND_FROM_EMAIL; set them in Vercel Production and use a verified Resend
  sender domain. The testing sender is restricted to its authorized recipient.
- Stripe Connect checks the current account rather than trusting the database
  flag. Connect or continue setup when requested, or wait for Stripe verification
  when charges are pending. Refresh status after changing details.
- A Stripe status lookup failure calls out credentials/test-live mode as things
  to check. STRIPE_SECRET_KEY must belong to the platform/mode that owns the
  connected account. Enable Connect on that platform. STRIPE_CONNECT_COUNTRY
  selects the country for newly created accounts; existing accounts retain theirs.
- NEXT_PUBLIC_APP_URL must be the actual HTTPS deployment origin at build time.
  Rebuild after environment changes so email and Checkout return links use it.

For the previously affected invoice, open its detail page and select Send invoice
after setup is ready. Existing records are not automatically emailed by this
release. Check the provider's delivery log and the destination inbox to verify
real delivery. Completing Stripe onboarding or verifying a sender domain still
requires the account owner's provider setup; application code cannot enable
charges or verify a domain on the provider's behalf.

## Verification

The production build, lint, TypeScript, 165 unit tests, 66 PostgreSQL integration
tests and 20 Chromium tests passed. The billing suite also runs with one database
connection to check transaction/connection reuse.

Browser tests exercise real pages, signed sessions, actual APIs and PostgreSQL.
A Node preload intercepts provider HTTP in the disposable local test server,
covering actual Resend/Stripe SDK requests and provider receipts. It is excluded
from application imports, refuses Vercel/remote/non-test databases and blocks
unmatched external HTTP. Tests verify successful email and resend, failed send
and retry with one invoice, an existing issued invoice with sender restrictions,
readiness repair, the Checkout redirect, incomplete accounts and an offline
payment fallback. Checkout's final hosted page is a browser fixture.

These checks do not establish live Resend delivery, Stripe onboarding completion
or a real payment. Those require the deployed test-mode journey in
[DEPLOYMENT.md](DEPLOYMENT.md). No production customer was emailed or charged by
these local checks.
