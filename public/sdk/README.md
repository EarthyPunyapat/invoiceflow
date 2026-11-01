# InvoiceFlow Agent SDK (zero dependencies)

Give an AI agent an economic identity: the ability to create, send, and collect on
invoices over plain HTTPS with one bearer key — no browser, no cookies, no session.

Verified against **production** (`https://invoiceflow-ten-azure.vercel.app`), not a mock.

## Install

No package manager. One file, Node 18+ (global `fetch`), no transitive deps, no build.

```bash
curl -O https://invoiceflow-ten-azure.vercel.app/sdk/invoiceflow-client.mjs
```

## Get a key

Settings -> API keys -> create. Shown **once**. Format `ifk_<64 hex>`.

Storage model (from `src/lib/api-key.ts`): plaintext is never persisted — only a
SHA-256 hash plus a non-secret 12-char `prefix`. A key is therefore **unrecoverable**,
only revocable. It is scoped to exactly one user and is a machine credential,
not a session.

## Use

```js
import { InvoiceFlowClient, InvoiceFlowError } from "./invoiceflow-client.mjs";
const iflow = new InvoiceFlowClient({ apiKey: process.env.INVOICEFLOW_API_KEY });

await iflow.me();                        // confirm key + account

const { client } = await iflow.createClient({ name: "Acme Robotics", email: "ap@acme.example" });
const { invoice } = await iflow.createInvoice({ clientId: client.id, /* ... */ });

await iflow.sendInvoice(invoice.id);                  // emails the client
const { url } = await iflow.shareInvoice(invoice.id); // hosted pay link
```

## Response shapes — important

The API wraps single resources and paginates collections. The SDK returns the
parsed body **as-is**; it does not silently unwrap, because unwrapping hides
`total`/`pagination` and makes failure modes ambiguous.

| Call | Body |
|---|---|
| `createClient` / `getClient` | `{ client: {...} }` |
| `createInvoice` / `getInvoice` | `{ invoice: {...} }` |
| `listInvoices` | `{ invoices: [...], total, page, pageSize, pagination }` |
| `me` | `{ data: { counts: { totalInvoices, totalClients, byStatus } } }` |

Destructure: `const { invoice } = await iflow.createInvoice(payload)`.

## Invoice payload

`POST /api/invoices` validates with `invoiceCreateSchema` (zod) in
`src/lib/validators.ts`. Missing **string** fields fail closed:
`400 {"error":"Invalid input: expected string, received undefined"}`.

The SDK does **not** guess this schema and you should not either. Create one
invoice in the web UI, then `GET /api/invoices?limit=1` — the returned object is
the authoritative shape for your account.

## Errors

Every non-2xx throws `InvoiceFlowError` with `.status` and `.body`. Failures are
never returned as values, so a caller cannot mistake a rejection for a success.

| Status | Meaning |
|---|---|
| 401 / 403 | key missing, malformed, revoked, or wrong prefix |
| 404 | does not exist **or** belongs to another tenant — deliberate: no existence leak |
| 400 / 422 | body failed schema validation |
| 429 | rate limited |

## Verified behaviour (production, bearer auth only)

Measured, not claimed:

- bad key -> `401`
- valid key -> `200` on `/api/dashboard/stats` (no cookie, no session)
- **cross-tenant read -> `404`**: requested another account's invoice id; the API
  refused rather than disclosed it
- `createClient` -> `{ client: { id, name, email, ... } }`
- incomplete invoice body -> `400`, schema enforced server-side
- an unauthenticated caller cannot mint a key (`POST /api/keys` -> `401`)
- malformed keys are rejected client-side, before any bytes leave the machine

Reproduce the whole list yourself, with **no credentials**:

```bash
node sdk/verify-no-key.mjs    # 8 passed, 0 failed
```

## Threat model

- A leaked key grants full CRUD on **one account's** invoices and clients. Treat it
  like a password; revoke in Settings.
- It is not an on-chain credential and cannot move funds. It can create a payable
  invoice; it cannot pay one.
- Tenant scope is enforced server-side per request, never by client-side filtering.

## Notes for autonomous agents

- **No idempotency key.** A retried `createInvoice` after a timeout can duplicate.
  Read back with `listInvoices({ q })` before retrying.
- `sendInvoice` has real-world side effects (email to a human). Do not retry blindly.
- Money is minor units (cents): `unitPrice: 25000` is $250.00.
