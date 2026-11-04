/** HTTP provider fixtures for browser tests. Never imported by application code. */
import nock from "nock";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const database = new URL(process.env.DATABASE_URL || "http://missing");
if (
  process.env.INVOICEFLOW_TEST_PROVIDERS !== "true" ||
  process.env.VERCEL ||
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.pathname !== "/invoiceflow_test"
) {
  throw new Error(
    "Provider fixtures require explicit test mode and a disposable local invoiceflow_test database",
  );
}
const output = process.env.INVOICEFLOW_PROVIDER_LOG;
if (!output) throw new Error("Provider fixture log path is required");
mkdirSync(dirname(output), { recursive: true });
const record = (entry) => appendFileSync(output, JSON.stringify(entry) + "\n");
const accepted = new Map();
const attempts = new Map();
const sessions = new Map();
const subscriptions = new Map();
let sequence = 0;

// Block unmatched provider calls so no test can send a real message or charge.
nock.disableNetConnect();
nock.enableNetConnect(/^(127\.0\.0\.1|localhost)(:\d+)?$/);
nock("https://api.resend.com")
  .persist()
  .post("/emails")
  .reply(async (request) => {
    const payload = await request.json();
    const recipient = payload.to[0];
    const attempt = (attempts.get(recipient) || 0) + 1;
    attempts.set(recipient, attempt);
    if (recipient === "retry-email@example.test" && attempt === 1)
      return [
        503,
        { name: "application_error", message: "Temporary provider failure" },
      ];
    if (recipient === "restricted-email@example.test")
      return [
        403,
        {
          name: "validation_error",
          message: "You can only send testing emails to your own email address",
        },
      ];
    const key = request.headers.get("idempotency-key");
    const previous = accepted.get(key);
    if (previous && previous.payload !== JSON.stringify(payload))
      return [
        409,
        {
          name: "invalid_idempotent_request",
          message: "Same idempotency key with different body",
        },
      ];
    const id = previous?.id || `email_browser_${++sequence}`;
    accepted.set(key, { id, payload: JSON.stringify(payload) });
    record({
      kind: "email",
      id,
      key,
      recipient,
      html: payload.html,
      deduplicated: Boolean(previous),
    });
    return [200, { id }];
  });
nock("https://api.stripe.com")
  .persist()
  .get(/^\/v1\/accounts\/acct_browser_/)
  .reply((request) => {
    const id = new URL(request.url).pathname.split("/").pop();
    const ready = id !== "acct_browser_pending";
    return [
      200,
      {
        id,
        object: "account",
        charges_enabled: ready,
        details_submitted: ready,
        country: "NZ",
        requirements: {
          currently_due: ready ? [] : ["individual.verification.document"],
        },
      },
    ];
  });
nock("https://api.stripe.com")
  .persist()
  .post("/v1/checkout/sessions")
  .reply(async (request) => {
    const values = Object.fromEntries(
      new URLSearchParams(await request.text()),
    );
    const session = {
      id: `cs_browser_${++sequence}`,
      object: "checkout.session",
      status: "open",
      payment_status: "unpaid",
      url: `https://checkout.stripe.com/c/pay/cs_browser_${sequence}`,
    };
    if (values.mode === "subscription") {
      // InvoiceFlow Pro: the fixture treats the subscription as paid at once,
      // so returning to the success URL completes it.
      const subscription = {
        id: `sub_browser_${sequence}`,
        object: "subscription",
        status: "active",
        customer: values.customer,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        cancel_at_period_end: false,
      };
      subscriptions.set(subscription.id, subscription);
      Object.assign(session, {
        mode: "subscription",
        status: "complete",
        payment_status: "paid",
        client_reference_id: values.client_reference_id,
        customer: values.customer,
        subscription,
      });
    }
    sessions.set(session.id, session);
    record({ kind: "checkout", id: session.id, values });
    return [200, session];
  });
nock("https://api.stripe.com")
  .persist()
  .get(/^\/v1\/checkout\/sessions\/cs_browser_/)
  .reply((request) => [
    200,
    sessions.get(new URL(request.url).pathname.split("/").pop()),
  ]);
nock("https://api.stripe.com")
  .persist()
  .post("/v1/customers")
  .reply(async (request) => {
    const values = Object.fromEntries(new URLSearchParams(await request.text()));
    const customer = { id: `cus_browser_${++sequence}`, object: "customer", email: values.email };
    record({ kind: "customer", id: customer.id, values });
    return [200, customer];
  });
nock("https://api.stripe.com")
  .persist()
  .get(/^\/v1\/subscriptions\/sub_browser_/)
  .reply((request) => [
    200,
    subscriptions.get(new URL(request.url).pathname.split("/").pop()),
  ]);
nock("https://api.stripe.com")
  .persist()
  .get(/^\/v1\/subscriptions\?/)
  .reply((request) => {
    const customer = new URL(request.url).searchParams.get("customer");
    const data = [...subscriptions.values()].filter((sub) => sub.customer === customer).reverse().slice(0, 1);
    return [200, { object: "list", data, has_more: false }];
  });
nock("https://api.stripe.com")
  .persist()
  .get(/^\/v1\/billing_portal\/configurations/)
  .reply(() => [200, { object: "list", data: [], has_more: false }]);
nock("https://api.stripe.com")
  .persist()
  .post("/v1/billing_portal/configurations")
  .reply(async (request) => {
    record({ kind: "portal_configuration", values: Object.fromEntries(new URLSearchParams(await request.text())) });
    return [200, { id: "bpc_browser", object: "billing_portal.configuration" }];
  });
nock("https://api.stripe.com")
  .persist()
  .post("/v1/billing_portal/sessions")
  .reply(async (request) => {
    const values = Object.fromEntries(new URLSearchParams(await request.text()));
    record({ kind: "portal", values });
    return [200, { id: "bps_browser", object: "billing_portal.session", url: "https://billing.stripe.com/p/session/browser" }];
  });
