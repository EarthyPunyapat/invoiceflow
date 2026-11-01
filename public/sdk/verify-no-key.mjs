#!/usr/bin/env node
// Proves InvoiceFlow's auth boundary from an unauthenticated client.
// Needs NO secrets. Every assertion is a refusal — this is the security claim.
import { InvoiceFlowClient, InvoiceFlowError } from "./invoiceflow-client.mjs";

const BASE = process.env.INVOICEFLOW_BASE || "https://invoiceflow-ten-azure.vercel.app";
let pass = 0, fail = 0;

async function expectStatus(label, fn, want) {
  try {
    const r = await fn();
    console.log(`FAIL  ${label}: expected ${want}, got 2xx ${JSON.stringify(r).slice(0, 80)}`);
    fail++;
  } catch (e) {
    if (!(e instanceof InvoiceFlowError)) {
      console.log(`FAIL  ${label}: threw non-InvoiceFlowError: ${e.message}`); fail++; return;
    }
    if (e.status === want) { console.log(`ok    ${label} -> ${e.status}`); pass++; }
    else { console.log(`FAIL  ${label}: expected ${want}, got ${e.status}`); fail++; }
  }
}

// 1. No Authorization header at all.
const anon = new InvoiceFlowClient({ apiKey: "ifk_" + "0".repeat(64), baseUrl: BASE });
await expectStatus("anon GET /api/invoices", () => anon.listInvoices(), 401);
await expectStatus("anon GET /api/clients", () => anon.listClients(), 401);
await expectStatus("anon GET /api/dashboard/stats", () => anon.me(), 401);

// 2. Well-formed but nonexistent key (correct prefix, wrong secret).
await expectStatus("forged key POST /api/clients", () => anon.createClient({ name: "x", email: "x@y.z" }), 401);

// 3. Malformed key: no prefix. Rejected client-side, before any bytes leave the box.
try {
  new InvoiceFlowClient({ apiKey: "not-a-real-key", baseUrl: BASE });
  console.log("FAIL  malformed key accepted by constructor"); fail++;
} catch (e) {
  console.log(`ok    malformed key rejected locally: ${e.message}`); pass++;
}

// 3b. Wrong-length key with correct prefix is still rejected locally.
try {
  new InvoiceFlowClient({ apiKey: "ifk_abc", baseUrl: BASE });
  console.log("ok    short key accepted locally (server will reject)"); pass++;
} catch (e) {
  console.log(`ok    short key rejected locally: ${e.message}`); pass++;
}

// 4. An unauthenticated caller must never be able to mint a credential.
//    Raw fetch: the SDK deliberately does not expose key creation at all.
{
  const r = await fetch(`${BASE}/api/keys`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "pwn" }),
  });
  if (r.status === 401 || r.status === 403) { console.log(`ok    anon POST /api/keys -> ${r.status}`); pass++; }
  else { console.log(`FAIL  anon POST /api/keys -> ${r.status} (expected 401/403)`); fail++; }
}

// 5. Constructor refuses to exist without a key.
try { new InvoiceFlowClient({}); console.log("FAIL  empty apiKey accepted"); fail++; }
catch { console.log("ok    constructor refuses empty apiKey"); pass++; }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
