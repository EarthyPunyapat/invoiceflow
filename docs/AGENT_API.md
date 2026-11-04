# InvoiceFlow — Agent API (machine credentials)

InvoiceFlow accepts a **bearer API key** on its JSON API so autonomous agents and
scripts can operate without a browser session. Every key is scoped to exactly one
human account: the agent acts *as* that account, with that account's permissions.

## 1. Issue a key (human only, once)

Sign in at https://invoiceflow-ten-azure.vercel.app and call:

```
POST /api/keys          (session cookie required)
{ "name": "my-agent" }
```

Response `201` — the key is shown **exactly once**:

```json
{ "key": "ifk_<64 hex>", "id": "...", "prefix": "ifk_ab12cd34",
  "warning": "This key is shown once and cannot be recovered." }
```

Store it in your agent's secret store. Send it as:

```
Authorization: Bearer ifk_<64 hex>
```

**A key cannot mint another key.** `POST /api/keys` and `DELETE /api/keys/{id}`
are session-only by design, so a leaked key can never self-replicate
credentials — it can only do invoice work until a human revokes it.

Revoke: `DELETE /api/keys/{id}` (session) — revocation is immediate.

## 2. What a key can do

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/invoices` | list invoices (paginated) |
| `POST` | `/api/invoices` | **create an invoice** |
| `GET` | `/api/invoices/{id}` | read one |
| `PATCH` | `/api/invoices/{id}` | status transition (`DRAFT`→`SENT`, etc.) |
| `PUT` | `/api/invoices/{id}` | edit a draft |
| `GET` | `/api/invoices/{id}/pdf` | render PDF (`%PDF-` binary) |
| `GET` | `/api/clients`, `POST /api/clients` | client list / create |
| `GET` | `/api/estimates`, `POST /api/estimates` | estimates |
| `POST` | `/api/estimates/{id}/convert` | estimate → invoice |
| `GET` | `/api/dashboard/stats` | aggregates |
| `GET` | `/api/export/invoices`, `/api/export/clients` | CSV export |
| `POST` | `/api/invoices/{id}/share` | public payment link for a `SENT` or `OVERDUE` invoice (drafts return 400) |


**Session-only on purpose** — these send mail, bind accounts, buy plans or
mint credentials, so they stay behind a human session even when a key is present:
`/api/stripe/connect*`, `/api/settings/profile`, `/api/keys*`, `/api/billing/*`,
`/api/invoices/{id}/send`.

**Cron only** (secret header, not a key): `/api/cron/chase-invoices`,
`/api/cron/generate-recurring`. `/api/webhooks/stripe` is signed by Stripe.

This table is the complete route surface — verified against the filesystem on
2026-11-02. There is no `/api/me`; account identity comes from the invoice
payloads' `userId` or the session.

## 3. Create an invoice — working example

```bash
curl -X POST https://invoiceflow-ten-azure.vercel.app/api/invoices \
  -H "Authorization: Bearer $INVOICEFLOW_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "clx...",
    "dueDate": "2026-12-02",
    "currency": "USD",
    "tax": 0,
    "notes": "work performed by an autonomous agent",
    "items": [ { "description": "Agent integration work", "quantity": 2, "unitPrice": 150 } ]
  }'
```

`201` →
```json
{ "invoice": { "id": "cmvy...", "invoiceNumber": "INV-202611-0001",
               "subtotal": 300, "tax": 0, "total": 300, "status": "DRAFT" } }
```

### Payload rules (schema is `.strict()`)

- **Rejected** unknown keys → `400 {"error":"Unrecognized key: ..."}`.
  `issueDate` is **not accepted** — it is derived server-side. Only `dueDate`.
- Totals (`subtotal`, `tax`, `total`, `invoiceNumber`) are **always server-derived**
  in integer cents. A client-supplied total is rejected, not ignored.
- `items`: 1–500 entries; `quantity` × `unitPrice` rounded once per line, summed in cents.
- `currency` must be a supported ISO code; `status` is `DRAFT` (default) or `SENT`.

## 4. Errors an agent must handle

| Code | Meaning | Correct reaction |
|---|---|---|
| `400` | bad payload / unknown key | fix the body, do not retry blindly |
| `401` | missing, malformed, or revoked key | stop; ask the human for a new key |
| `404` | not found **in your account** (never leaks other tenants) | verify the id |
| `409` | state conflict (e.g. editing a non-draft) | re-read, then decide |
| `429` | rate limited | back off |

## 5. Verified end-to-end

Proven on 2026-11-02 against a live server with a real database row:

```
no auth        -> 401
bogus key      -> 401
valid key, POST /api/invoices  -> 201  INV-202611-0001  total 300  DRAFT
GET /api/invoices              -> 200
GET /api/invoices/{id}/pdf     -> 200  2388 bytes  %PDF-
GET /api/dashboard/stats       -> 200
key minting another key        -> 401   (by design)
```

## 6. Security notes

- Keys are stored **only** as SHA-256 hashes; the plaintext exists once, at creation.
- `prefix` is stored for display so a human can identify a key without revealing it.
- Lookup is by hash; `lastUsedAt` is updated on use for auditing.
- `revokedAt` set → key stops working immediately, no restart needed.
