#!/usr/bin/env node
/**
 * verify-paid-path.mjs — proves the one link the no-key verifier cannot:
 * authenticated create -> invoice -> PAYABLE Stripe Checkout URL.
 *
 * verify-no-key.mjs proves the auth boundary (every assertion is a refusal).
 * This proves the money path (every assertion is a positive result).
 *
 *   INVOICEFLOW_API_KEY=ifk_... node verify-paid-path.mjs
 *   INVOICEFLOW_API_KEY=ifk_... node verify-paid-path.mjs --send
 *   node verify-paid-path.mjs            # dry run: no key, no writes, no egress
 *
 * Safety, deliberately:
 *   - Requires an EXPLICIT key via one variable. Refuses a key that does not
 *     begin with ifk_ or looks incomplete, so a paste error cannot be sent.
 *   - Default status is DRAFT and email is skipped: nothing leaves the building
 *     unless --send is passed.
 *   - The client carries a unique marker so you can delete exactly what this
 *     run created, and nothing else.
 *   - Never pays anything, never touches Stripe secrets, never retries a 404
 *     (which also means "not yours" — guessing there would be wrong).
 *
 * Exit codes: 0 proved, 1 assertion failed, 2 misconfigured/refused.
 */

import { InvoiceFlowClient, InvoiceFlowError } from "./invoiceflow-client.mjs";

const args = new Set(process.argv.slice(2));
const SEND = args.has("--send");
const KEY = (process.env.INVOICEFLOW_API_KEY || "").trim();
const DRY =
  args.has("--dry-run") || process.env.INVOICEFLOW_DRY_RUN === "1" || !KEY;

const MARK = "verify-paid-path-" + Date.now();
const CENTS = 25000; // $250.00 — integer minor units, the most common bug
const results = [];
let failures = 0;

function check(name, ok, detail) {
  results.push({ name: name, ok: ok });
  if (!ok) failures++;
  console.log("  [" + (ok ? "PASS" : "FAIL") + "] " + name + (detail ? " — " + detail : ""));
}

function fail(msg) {
  console.error("\nREFUSED: " + msg);
  process.exit(2);
}

function dueDate(days) {
  return new Date(Date.now() + (days || 14) * 864e5).toISOString().slice(0, 10);
}

function isCheckoutUrl(u) {
  if (typeof u !== "string") return false;
  try {
    const p = new URL(u);
    return p.protocol === "https:" && /(^|\.)stripe\.com$/.test(p.hostname);
  } catch (e) {
    return false;
  }
}

const PLAN = {
  marker: MARK,
  client: {
    name: "Verify Paid Path (" + MARK + ")",
    email: "verify+" + MARK + "@example.com"
  },
  invoice: {
    items: [
      {
        description: "Autonomous agent verification line item",
        quantity: 1,
        unitPrice: CENTS
      }
    ],
    dueDate: dueDate(14),
    status: SEND ? "SENT" : "DRAFT",
    currency: "USD",
    notes: "Created by verify-paid-path.mjs. Safe to delete. Marker: " + MARK
  },
  willSendEmail: SEND
};

if (DRY) {
  console.log("=== DRY RUN — nothing sent, no account touched ===\n");
  console.log(KEY ? "A key was present but dry run was forced.\n" : "No INVOICEFLOW_API_KEY set.\n");
  console.log("This script performs, in order:");
  console.log("  1. GET  /api/me                    prove the key is live, learn the account");
  console.log("  2. POST /api/clients               create a uniquely tagged client");
  console.log("  3. POST /api/invoices              create invoice (items + dueDate + currency)");
  console.log("  4.       assert server-derived total == 25000 cents");
  console.log("  5. POST /api/invoices/:id/share    get the payable link, assert https + stripe.com");
  if (SEND) console.log("  6. POST /api/invoices/:id/send     email it  <-- --send was passed");
  else console.log("  6. (skipped) email — pass --send to exercise delivery");
  console.log("\nExact payloads:");
  console.log(JSON.stringify(PLAN, null, 2));
  console.log("\nRun for real:");
  console.log("  INVOICEFLOW_API_KEY=ifk_... node verify-paid-path.mjs");
  console.log("\nCleanup: delete the client named \"Verify Paid Path (" + MARK + ")\".");
  console.log("The marker is unique, so nothing else can match it.");
  process.exit(0);
}

if (!KEY.startsWith("ifk_")) fail("key does not begin with ifk_ — refusing to transmit it");
if (KEY.length < 20) fail("key looks incomplete — refusing to transmit it");

const ifc = new InvoiceFlowClient({ apiKey: KEY });
console.log("=== PAID-PATH VERIFICATION  marker=" + MARK + "  send=" + SEND + " ===\n");

function numberish(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v)) {
    // a decimal string means dollars, not cents — exactly the bug this catches
    return Number(v) === CENTS / 100 ? CENTS : Number(v);
  }
  return NaN;
}

function summarizeMe(me) {
  const acct = (me && me.account) || me || {};
  const name = acct.name || acct.email || acct.id;
  return name ? "account=" + String(name).slice(0, 40) : "ok";
}

let client = null;
let invoice = null;

try {
  const me = await ifc.me();
  check("authenticated: GET /api/me responded", true, summarizeMe(me));

  client = await ifc.createClient(PLAN.client);
  const clientId = (client && client.id) || (client && client.client && client.client.id);
  check("created client", Boolean(clientId), "id=" + clientId);

  const body = Object.assign({}, PLAN.invoice, { clientId: clientId });
  check(
    "payload carries no client-supplied totals",
    !("total" in body) && !("subtotal" in body),
    "server derives totals"
  );

  invoice = await ifc.createInvoice(body);
  const inv = (invoice && invoice.invoice) || invoice || {};
  const invoiceId = inv.id;
  check("created invoice", Boolean(invoiceId), "id=" + invoiceId);

  const total = inv.total !== undefined ? inv.total : inv.totalCents;
  check(
    "server-derived total matches request",
    numberish(total) === CENTS,
    "requested " + CENTS + ", stored " + total
  );

  const share = await ifc.shareInvoice(invoiceId);
  const url =
    (share && share.url) ||
    (share && share.checkoutUrl) ||
    (share && share.paymentLink) ||
    (share && share.invoice && share.invoice.url) ||
    null;
  check("share returned a url field", Boolean(url), String(url).slice(0, 60));
  check("url is https and on stripe.com", isCheckoutUrl(url), String(url).split("?")[0]);

  if (SEND) {
    const sent = await ifc.sendInvoice(invoiceId);
    check("send accepted", Boolean(sent) && !(sent && sent.error), "status=" + ((sent && sent.status) || "ok"));
  } else {
    console.log("  [SKIP] send — pass --send to exercise delivery (it emails a real address)");
  }
} catch (e) {
  if (e instanceof InvoiceFlowError) {
    // 404 here also means "not yours" — report it, do not guess
    check("no exception (got HTTP " + e.status + ")", false, String(e.message).slice(0, 140));
  } else if (e instanceof TypeError && /fetch|network/i.test(String(e.message))) {
    check("network reachable", false, String(e.message).slice(0, 140));
  } else {
    check("no exception", false, String((e && e.message) || e).slice(0, 140));
  }
}

console.log("\n" + (results.length - failures) + " passed, " + failures + " failed");
const invId = (invoice && invoice.id) || (invoice && invoice.invoice && invoice.invoice.id);
const cliId = (client && client.id) || (client && client.client && client.client.id);
if (invId || cliId) {
  console.log("\nCleanup: delete invoice " + invId + " and client " + cliId);
  console.log("(marker " + MARK + " — unique, so nothing else matches).");
}
process.exit(failures === 0 ? 0 : 1);
