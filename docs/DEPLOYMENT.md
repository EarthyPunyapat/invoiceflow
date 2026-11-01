# Release on Vercel with Neon

Vercel and Neon fit the current Next.js application. Keep this arrangement for the first pilot; assess separate workers or a different hosting platform when job duration, traffic or operating costs provide a concrete reason.

This guide prepares a deployment. Local tests and signed fixtures do not prove that a live deployment, Google sign-in, Resend delivery, or Stripe account configuration works. Complete the smoke test below on the actual deployment before accepting real payments.

## 1. Separate environments

Create separate Neon databases or branches for development, preview and production. Keep preview deployments in Stripe test mode and point them to a nonproduction database. Do not let preview branches run migrations against production.

In Vercel, import the repository, select the Next.js preset and Node.js 22, and keep the install/build commands from `vercel.json`. The repository pins pnpm in `package.json`.

The build command generates Prisma Client and builds Next.js. It intentionally does not migrate a production database. Apply reviewed migrations once as a separate release step before routing traffic to code that requires them.

## 2. Configure variables securely

Set the following in the appropriate Vercel environment scopes. Do not commit values or place secret values in `NEXT_PUBLIC_*` variables.

| Variable | Production value |
|---|---|
| `DATABASE_URL` | Neon pooled PostgreSQL URL with the provider's TLS settings |
| `DATABASE_URL_UNPOOLED` | Neon direct URL for migrations, with TLS preserved |
| `AUTH_SECRET` | A generated private secret, kept stable across deployments |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Credentials for the intended Google web OAuth application |
| `NEXTAUTH_URL` | The actual canonical `https://…` deployment origin |
| `NEXT_PUBLIC_APP_URL` | The same canonical HTTPS origin |
| `AUTH_TRUST_HOST` | `true` behind Vercel's trusted proxy |
| `STRIPE_SECRET_KEY` | Test key for rehearsal; matching live platform key only for production release |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the exact webhook endpoint and mode |
| `STRIPE_CONNECT_COUNTRY` | The supported country for new Connect accounts; defaults to `US` |
| `RESEND_API_KEY` | A key authorized to send from the verified sender domain |
| `RESEND_FROM_EMAIL` | Sender address on the verified Resend domain |
| `CRON_SECRET` | A generated private bearer secret |

`FREELANCER_NOTIFY_EMAIL` is an optional fallback only when an invoice owner has no email address. Owners with account email addresses receive their own payment notifications.

Changing Vercel variables requires a deployment that receives those settings. Recheck the running deployment after changing them; settings in another cloud environment do not establish that Vercel has the same values.

## 3. Migrate the database

Take and verify a recoverable backup or Neon recovery point before changing an existing production database. Review both SQL files in `prisma/migrations` and rehearse the procedure on an isolated copy first.

### Empty database

Supply `DATABASE_URL` and `DATABASE_URL_UNPOOLED` securely for the target environment, then run from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run db:generate
pnpm run db:deploy
pnpm exec prisma migrate status
```

This applies the baseline followed by the billing-safety migration. Both connection strings must identify the intended database; do not rely on a shell left over from a different environment.

### Existing database without migration history

An existing database created with `prisma db push` already contains baseline tables. Running the baseline's `CREATE TABLE` statements again is not an upgrade procedure.

1. Back up the database and test restoration or the provider's recovery process.
2. Compare the actual schema with `prisma/migrations/202611010001_baseline/migration.sql`. Confirm tables, columns, enums, indexes and foreign keys match. Resolve drift through a reviewed migration; do not mark a mismatching schema as migrated.
3. Check for invoice-number conflicts before adding the new per-owner unique constraint:

   ```sql
   SELECT "userId", "invoiceNumber", COUNT(*)
   FROM "Invoice"
   GROUP BY "userId", "invoiceNumber"
   HAVING COUNT(*) > 1;
   ```

   If this returns rows, stop and resolve duplicates with a reviewed business decision. Do not silently rename financial records or delete invoices to make a migration pass.
4. Only after confirming the baseline is already represented, register it without executing its SQL:

   ```bash
   pnpm exec prisma migrate resolve --applied 202611010001_baseline
   pnpm run db:deploy
   pnpm exec prisma migrate status
   ```

The second migration adds checkout tracking, Stripe invoice linkage, notification delivery tracking and invoice-number uniqueness. An interrupted migration needs diagnosis through Prisma's supported migration-resolution workflow. Never use `migrate reset`, `db push --accept-data-loss`, or manual migration-history edits on production.

Do not run the demo seed on production. It deletes and recreates the selected demo user and related records.

## 4. Register Google OAuth

In the Google Cloud OAuth web client, configure:

- Authorized JavaScript origin: the canonical deployment origin.
- Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`.
- Appropriate consent-screen publication or test-user access for the pilot.

Use the exact scheme, domain and callback path. Register localhost separately for local development. Preview URLs need their own permitted configuration if they are used for sign-in testing.

After deployment, sign in using Google, verify that a user/account is stored, and confirm that the dashboard loads with the signed-in user's data. Sign out and verify that protected pages return to login and unauthenticated APIs return 401.

## 5. Configure Resend

Verify the sender domain in Resend using its required DNS records. Configure `RESEND_FROM_EMAIL` using that domain and a key with the needed sending permission.

Send a test invoice to an address you control. Confirm that it arrives, the sender is correct, the amount/currency are correct, and the public invoice link works in a signed-out browser. A successful API call alone is not proof of inbox delivery; check the provider's delivery status too.

The current payment-confirmation email notifies the freelancer. A separate customer receipt, refund or partial-payment workflow is not implemented.

## 6. Configure Stripe Connect and webhooks

Enable Stripe Connect for the intended platform and supported account country. Onboard a test connected account through the app's settings and confirm that it can accept charges.

Register `https://<your-domain>/api/webhooks/stripe` for **events on connected accounts**, with these event types:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `invoice.finalized`
- `invoice.paid`
- `account.updated`

Checkout uses direct charges on the connected account, so platform-only webhook delivery is insufficient. Configure the endpoint to use the API version expected by the installed Stripe integration (`2025-02-24.acacia`) and use its own signing secret. Test and live endpoints have separate secrets and account data.

The handler checks Stripe signatures. Checkout settlement also requires the persisted session, invoice owner, connected account, amount and currency to match. Successful payment recording is independent of the browser's return URL. Failed processing returns a non-2xx response so Stripe can retry; monitor and investigate failures rather than marking them delivered manually.

Rehearse with Stripe test cards and test connected accounts. Confirm that replaying an event does not create another invoice or send another already-recorded payment notification. Only switch to live mode after the test-mode journey passes. Existing test connected accounts cannot be reused as live accounts.

## 7. Enable scheduled jobs

`vercel.json` registers two daily UTC schedules:

| Route | Schedule |
|---|---|
| `GET /api/cron/generate-recurring` | 00:00 UTC |
| `GET /api/cron/chase-invoices` | 09:00 UTC |

Vercel sends `Authorization: Bearer <CRON_SECRET>` when that variable is configured. The routes reject unauthenticated requests. Check your Vercel plan's cron availability, scheduling precision and function-duration limits.

Run each job once against test data and inspect its response and logs. Recurring generation creates drafts and advances schedules transactionally. It does not automatically email or charge those drafts. Repeated runs may process additional overdue schedule slots; monitor catch-up behavior when enabling a previously paused deployment.

## 8. Validate the release

Run the repository checks:

```bash
pnpm test
pnpm run lint
pnpm run build
pnpm run typecheck
pnpm audit --prod --audit-level high
```

Run `pnpm run test:integration` only with the disposable local `invoiceflow_test` database described in the README. The suite tests real PostgreSQL behavior with external Stripe/Resend calls mocked. Never point it at Neon production.

On the deployed test environment, verify this complete journey:

1. Sign in with Google and create a client.
2. Create an invoice with multiple line items and a nonzero tax rate; verify the stored total and PDF.
3. Send it through Resend and open the emailed public link while signed out.
4. Open Checkout and verify the charged amount equals the tax-inclusive invoice total.
5. Complete a Stripe test payment and verify webhook delivery, `PAID` status, payment timestamp and the owner's confirmation email.
6. Retry the same webhook and try concurrent payment clicks; verify no duplicate invoice or repeated settled notification.
7. Exercise overdue reminders and a due recurring template on test data.
8. Sign in as a second user and confirm that the first user's clients, invoices, PDFs and exports remain inaccessible.

Record the deployment URL, commit, migration status and these results in the release record. None of the above should be described as a verified live integration until exercised on the target deployment.

The production dependency audit currently reports one low-severity upstream
`deepmerge` advisory in the email rendering chain, with no patched version
available. No high or critical advisories remain in the tested lockfile. Monitor
updates rather than suppressing audit findings.

## Operating boundaries for the pilot

- Dashboard and reports scope monetary totals to the selected currency. They do not convert currencies; do not treat one currency's total as a consolidated account balance.
- Hosted Checkout currently supports two-decimal currencies and validated positive totals. It shows a single invoice grand total, including tax.
- The IP payment limiter uses process memory. Across Vercel instances it is best effort; use a shared rate limiter or an appropriate edge control before wider traffic.
- Cron work is synchronous. Monitor duration and backlog; move long-running jobs to a durable queue/worker when needed.
- Early access does not include subscriptions or plan enforcement. Do not sell a self-serve plan until that flow is implemented and tested.
- Keep database recovery enabled and monitor Stripe webhook failures, Resend delivery failures, cron errors and server errors. Test recovery before relying on it.

For rollback, keep the previous successful Vercel deployment available. These migrations add columns and indexes; roll back application traffic separately from schema changes. Preserve data and diagnose forward rather than dropping billing columns in response to an incident.
