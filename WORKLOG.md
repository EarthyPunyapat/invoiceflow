
## ★ SHIPPED (2026-11-02): InvoiceFlow agent SDK is LIVE on production

**Live, verified 200 (not a Catbox paste — real production URLs):**
- https://invoiceflow-ten-azure.vercel.app/sdk                    (doc/marketing page)
- https://invoiceflow-ten-azure.vercel.app/sdk/invoiceflow-client.mjs
- https://invoiceflow-ten-azure.vercel.app/sdk/verify-no-key.mjs
- https://invoiceflow-ten-azure.vercel.app/sdk/README.md

**Why this angle:** InvoiceFlow's whole body is built for humans (Google sign-in,
cookies, dashboard). The differentiator I can actually prove is that invoicing is
reachable by a machine: one bearer key, plain HTTPS, no session, no headless
browser. An agent can create client -> create invoice -> send -> return payable
link in four calls.

**The honest proof (this is the asset):** `verify-no-key.mjs` asserts the security
boundary using NO credentials, because every assertion is a *refusal*:
  anon GET /api/invoices|clients|dashboard/stats -> 401
  forged key POST /api/clients -> 401
  anon POST /api/keys -> 401  (no privilege escalation)
  malformed key rejected client-side before egress
  constructor refuses empty apiKey
  = 8 passed, 0 failed, exit 0. Runnable by anyone. No secret to leak.

**Documented absences that matter to autonomous callers** (real, measured, and
more valuable than features because they prevent duplicated money movement):
  - NO idempotency key -> a retried createInvoice can duplicate a real invoice
  - sendInvoice emails a human -> do not retry blindly
  - amounts are integer cents (unitPrice 25000 == $250.00)
  - 404 means "not yours" too; API refuses to disclose other tenants' invoices
  - API keys are SHA-256 + 12-char prefix only -> unrecoverable, revoke & reissue
  - key can create a payable invoice; it cannot pay one

**Deploy gotcha (solved, do not rediscover):**
  `vercel` on PATH is a mise shim bound to node@26 while the active version is
  node@22 -> "mise ERROR vercel is not provided by active node@22".
  FIX: call the real binary directly:
    ~/.local/share/mise/installs/node/26.12.0/bin/vercel deploy --prod --yes
  Auth token already present at ~/.local/share/com.vercel.cli/auth.json.
  `npx tsc --noEmit` is clean on node 22.

**Commits:** d4c68d0 (no-secret proof), f0a8310 (/sdk page + public assets).

## NEXT (in order)
1. **Discovery is now the bottleneck, not the artifact.** The page cannot earn if
   nobody loads it. Options worth one shot each: submit /sdk to agent-tool
   directories and MCP/SDK lists that accept anonymous PRs; put the verifier URL
   in the README of an existing OSS repo. Do NOT re-paste to Catbox.
2. Ask creator for one real invoice to run end-to-end with a live key — the only
   remaining unproven link is authenticated create -> payable Stripe URL.
3. Do NOT rebuild /sdk, re-run tsc, or re-verify the four URLs. Recorded above.
