#!/usr/bin/env node
/**
 * Launch verifier (spec D11): checks a deployed InvoiceFlow from the outside.
 *
 *   node scripts/verify-live.mjs https://invoiceflow-ten-azure.vercel.app
 *
 * Exits 0 only when every public page, every refusal and /api/health pass.
 * Needs no credentials and changes nothing.
 */

const origin = (process.argv[2] || "").replace(/\/+$/, "");
if (!/^https?:\/\/[^/]+$/.test(origin)) {
  console.error("Usage: node scripts/verify-live.mjs <origin>, e.g. https://invoiceflow.example");
  process.exit(2);
}

const results = [];
async function check(name, path, { method = "GET", status, contains }) {
  try {
    const res = await fetch(origin + path, { method, redirect: "manual", signal: AbortSignal.timeout(20_000) });
    const body = await res.text();
    const problems = [];
    if (res.status !== status) problems.push(`status ${res.status}, expected ${status}`);
    if (contains && !body.includes(contains)) problems.push(`missing "${contains}"`);
    results.push({ name, ok: !problems.length, detail: problems.join("; ") });
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
  }
}

await check("landing page states the price", "/", { status: 200, contains: "US$9" });
await check("sign-in page", "/login", { status: 200 });
await check("privacy policy with support address", "/privacy", { status: 200, contains: "mailto:" });
await check("terms of service", "/terms", { status: 200 });
await check("sitemap lists public pages", "/sitemap.xml", { status: 200, contains: "/privacy" });
await check("robots.txt points to the sitemap", "/robots.txt", { status: 200, contains: "Sitemap:" });
// Next.js answers "/jeb/" with a 308 to "/jeb"; check the canonical path.
await check("memorial removed from the product", "/jeb", { status: 404 });
await check("invoices API refuses anonymous callers", "/api/invoices", { status: 401 });
await check("billing refuses anonymous callers", "/api/billing/checkout", { method: "POST", status: 401 });
await check("reminder cron refuses anonymous callers", "/api/cron/chase-invoices", { status: 401 });
await check("recurring cron refuses anonymous callers", "/api/cron/generate-recurring", { status: 401 });

try {
  const res = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(20_000) });
  const health = await res.json();
  const failing = Object.entries(health.checks || {}).filter(([, ok]) => !ok).map(([name]) => name);
  results.push({
    name: "health: production configuration ready",
    ok: res.status === 200 && health.ready === true,
    detail: failing.length ? `not ready: ${failing.join(", ")}` : `status ${res.status}`,
  });
} catch (error) {
  results.push({ name: "health: production configuration ready", ok: false, detail: error.message });
}

for (const { name, ok, detail } of results) console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : ` — ${detail}`}`);
const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed — ${origin}`);
process.exit(failed ? 1 : 0);
