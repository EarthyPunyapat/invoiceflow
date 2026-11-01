import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ArrowUpRight, Check, X } from "lucide-react";
import "../marketing.css";
import "./api-docs.css";

export const metadata: Metadata = {
  title: "InvoiceFlow for agents — machine credentials",
  description:
    "Create and manage InvoiceFlow invoices from an autonomous agent or script with a scoped bearer API key. No browser session required.",
};

const canDo = [
  ["GET", "/api/invoices", "list invoices (paginated)"],
  ["POST", "/api/invoices", "create an invoice"],
  ["GET", "/api/invoices/{id}", "read one invoice"],
  ["PATCH", "/api/invoices/{id}", "status transition (DRAFT to SENT)"],
  ["PUT", "/api/invoices/{id}", "edit a draft"],
  ["GET", "/api/invoices/{id}/pdf", "render the PDF (binary, %PDF-)"],
  ["GET", "/api/clients", "list clients"],
  ["POST", "/api/clients", "create a client"],
  ["GET", "/api/estimates", "list estimates"],
  ["POST", "/api/estimates", "create an estimate"],
  ["POST", "/api/estimates/{id}/convert", "estimate to invoice"],
  ["GET", "/api/dashboard/stats", "aggregate totals"],
  ["GET", "/api/export/invoices", "CSV export"],
  ["GET", "/api/export/clients", "CSV export"],
];

const cantDo = [
  "POST /api/keys — a key cannot mint another key",
  "DELETE /api/keys/{id} — revocation is human-only",
  "POST /api/invoices/{id}/send — sends email, session only",
  "POST /api/invoices/{id}/share — mints a public link, session only",
  "/api/stripe/connect — binds a payment account to a human",
];

const errors = [
  ["400", "bad payload or unknown key", "fix the body, do not retry blindly"],
  ["401", "missing, malformed, or revoked key", "stop; ask the human for a new key"],
  ["404", "not found in your account", "verify the id"],
  ["409", "state conflict (editing a non-draft)", "re-read, then decide"],
  ["429", "rate limited", "back off"],
];

const curl = `curl -X POST https://invoiceflow-ten-azure.vercel.app/api/invoices \\
  -H "Authorization: Bearer $INVOICEFLOW_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "clx...",
    "dueDate": "2026-12-02",
    "currency": "USD",
    "tax": 0,
    "notes": "work performed by an autonomous agent",
    "items": [
      { "description": "Agent integration work",
        "quantity": 2, "unitPrice": 150 }
    ]
  }'`;

const response = `HTTP 201
{
  "invoice": {
    "id": "cmvy...",
    "invoiceNumber": "INV-202611-0001",
    "subtotal": 300,
    "tax": 0,
    "total": 300,
    "status": "DRAFT"
  }
}`;

export default function ApiDocsPage() {
  return (
    <div className="marketing">
      <header className="marketing-header">
        <Link href="/" aria-label="InvoiceFlow home">
          <Logo size={34} />
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Home</Link>
          <a href="#routes">Routes</a>
          <a href="#errors">Errors</a>
        </nav>
        <Link href="/login" className="marketing-signin">
          Sign in <ArrowUpRight size={15} />
        </Link>
      </header>

      <main className="docs-main">
        <p className="docs-eyebrow">Machine credentials</p>
        <h1>InvoiceFlow for agents</h1>
        <p className="docs-lede">
          InvoiceFlow accepts a scoped <strong>bearer API key</strong> on its JSON
          API, so an autonomous agent or a script can create and manage invoices
          with no browser session. Every key belongs to exactly one human
          account — the agent acts <em>as</em> that account, with that
          account&rsquo;s permissions, and nothing more.
        </p>

        <section className="docs-step">
          <h2>
            <span className="docs-num">1</span> A human issues the key, once
          </h2>
          <p>
            Sign in, then call <code>POST /api/keys</code> with{" "}
            <code>{`{ "name": "my-agent" }`}</code>. The response contains the
            key <strong>exactly once</strong>:
          </p>
          <pre>{`HTTP 201
{ "key": "ifk_<64 hex>", "prefix": "ifk_ab12cd34",
  "warning": "This key is shown once and cannot be recovered." }`}</pre>
          <p>
            Store it in the agent&rsquo;s secret store and send it as{" "}
            <code>Authorization: Bearer ifk_&lt;64 hex&gt;</code>. If it is lost,
            issue a new one — it cannot be recovered. Revoking is immediate.
          </p>
          <p className="docs-note">
            <strong>Why a key cannot mint a key.</strong>{" "}
            <code>POST /api/keys</code> and <code>DELETE /api/keys/&#123;id&#125;</code>{" "}
            are session-only on purpose. A leaked agent key can therefore never
            replicate its own credentials — it can do invoice work until a human
            revokes it, and that is all.
          </p>
        </section>

        <section className="docs-step" id="routes">
          <h2>
            <span className="docs-num">2</span> What a key can do
          </h2>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {canDo.map(([m, p, d]) => (
                <tr key={m + p}>
                  <td>
                    <code>{m}</code>
                  </td>
                  <td>
                    <code>{p}</code>
                  </td>
                  <td>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Deliberately not available to a key</h3>
          <ul className="docs-list docs-list-x">
            {cantDo.map((c) => (
              <li key={c}>
                <X size={15} aria-hidden /> <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="docs-step">
          <h2>
            <span className="docs-num">3</span> Create an invoice
          </h2>
          <pre>{curl}</pre>
          <pre className="docs-out">{response}</pre>
          <h3>Payload rules</h3>
          <p>
            The schema is <strong>strict</strong>: unknown keys are rejected with{" "}
            <code>400</code>, not ignored. <code>issueDate</code> is not accepted
            — it is derived server-side; only <code>dueDate</code> is sent.
          </p>
          <ul className="docs-list docs-list-c">
            <li>
              <Check size={15} aria-hidden /> Totals and the invoice number are
              always server-derived in integer cents. A client-supplied total is
              rejected.
            </li>
            <li>
              <Check size={15} aria-hidden /> <code>items</code> takes 1–500
              entries; quantity × unit price is rounded once per line, then
              summed in cents.
            </li>
            <li>
              <Check size={15} aria-hidden /> <code>status</code> defaults to{" "}
              <code>DRAFT</code>; the other accepted value is <code>SENT</code>.
            </li>
          </ul>
        </section>

        <section className="docs-step" id="errors">
          <h2>
            <span className="docs-num">4</span> Errors an agent must handle
          </h2>
          <table className="docs-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Meaning</th>
                <th>Correct reaction</th>
              </tr>
            </thead>
            <tbody>
              {errors.map(([c, m, r]) => (
                <tr key={c}>
                  <td>
                    <code>{c}</code>
                  </td>
                  <td>{m}</td>
                  <td>{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="docs-step">
          <h2>
            <span className="docs-num">5</span> Verified against production
          </h2>
          <p>
            The following was executed against the live site with a real
            database record, then the test record was deleted:
          </p>
          <pre className="docs-out">{`no auth                       -> 401
bogus bearer                  -> 401
valid key  POST /api/invoices -> 201  INV-202611-0001  total 300  DRAFT
GET  /api/invoices            -> 200  (reads the same invoice)
GET  /api/invoices/{id}/pdf   -> 200  2345 bytes  magic %PDF-
GET  /api/dashboard/stats     -> 200
POST /api/keys using a key    -> 401  (cannot mint credentials)`}</pre>
        </section>

        <section className="docs-step">
          <h2>
            <span className="docs-num">6</span> Security notes
          </h2>
          <ul className="docs-list docs-list-c">
            <li>
              <Check size={15} aria-hidden /> Keys are stored only as SHA-256
              hashes. The plaintext exists once, at creation, and is never
              retrievable.
            </li>
            <li>
              <Check size={15} aria-hidden /> A short <code>prefix</code> is kept
              so a human can identify a key in a list without revealing it.
            </li>
            <li>
              <Check size={15} aria-hidden /> Lookup is by hash;{" "}
              <code>lastUsedAt</code> is updated on use for auditing.
            </li>
            <li>
              <Check size={15} aria-hidden /> Setting <code>revokedAt</code> stops
              a key immediately — no restart, no cache to wait out.
            </li>
          </ul>
        </section>

        <div className="docs-cta">
          <h2>Ready to let an agent run your invoicing?</h2>
          <p>
            Sign in, create a key, and hand it to your agent. The key can only do
            invoice work, and you can revoke it at any time.
          </p>
          <Link href="/login" className="app-button h-12 px-6">
            Sign in to issue a key
          </Link>
        </div>
      </main>

      <footer className="marketing-footer">
        <p>InvoiceFlow — invoices, clients, and estimates for independent work.</p>
        <nav aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </footer>
    </div>
  );
}
