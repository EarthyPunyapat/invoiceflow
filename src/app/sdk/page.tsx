import Link from "next/link";
import { Logo } from "@/components/logo";
import { Terminal, ShieldCheck, KeyRound, AlertTriangle, ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Agent SDK — InvoiceFlow",
  description:
    "Invoicing over HTTPS with one bearer key. No browser, no cookies, no session. For AI agents and scripts.",
};

const endpoints = [
  ["GET", "/api/invoices", "List invoices (paginated)"],
  ["POST", "/api/invoices", "Create an invoice"],
  ["GET", "/api/invoices/:id", "Read one invoice"],
  ["POST", "/api/invoices/:id/send", "Email it to the client"],
  ["GET", "/api/clients", "List clients"],
  ["POST", "/api/clients", "Create a client"],
  ["GET", "/api/dashboard/stats", "Account + counts"],
];

const refusals = [
  ["anon GET /api/invoices", "401"],
  ["anon GET /api/clients", "401"],
  ["anon GET /api/dashboard/stats", "401"],
  ["forged key POST /api/clients", "401"],
  ["anon POST /api/keys", "401"],
  ["malformed key", "rejected locally"],
];

export default function SdkPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-zinc-200">
      <div className="mb-10 flex items-center justify-between">
        <Logo />
        <Link href="/api-docs" className="text-sm text-zinc-400 hover:text-white">
          REST reference <ArrowUpRight className="inline h-3 w-3" />
        </Link>
      </div>

      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
        Agent SDK
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-white">
        Invoicing for things that don&apos;t use browsers.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-zinc-400">
        One bearer key. Plain HTTPS. No OAuth dance, no cookies, no session, no
        headless Chrome. An agent can create a client, issue an invoice, send it,
        and hand back a payable link — in four calls.
      </p>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-5 font-mono text-sm">
        <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
          <Terminal className="h-3.5 w-3.5" /> zero dependencies · Node 18+
        </div>
        <pre className="overflow-x-auto leading-relaxed text-zinc-300">
{`curl -O https://invoiceflow-ten-azure.vercel.app/sdk/invoiceflow-client.mjs`}
        </pre>
        <pre className="mt-4 overflow-x-auto leading-relaxed text-zinc-300">
{`import { InvoiceFlowClient } from "./invoiceflow-client.mjs";

const iflow = new InvoiceFlowClient({ apiKey: process.env.INVOICEFLOW_API_KEY });

const { client }  = await iflow.createClient({ name: "Acme", email: "ap@acme.example" });
const { invoice } = await iflow.createInvoice({ clientId: client.id, /* ... */ });

const { url } = await iflow.shareInvoice(invoice.id);`}
        </pre>
      </div>

      <h2 className="mt-14 flex items-center gap-2 text-xl font-semibold text-white">
        <ShieldCheck className="h-5 w-5 text-emerald-400" /> Verify it yourself, without a key
      </h2>
      <p className="mt-3 text-zinc-400">
        The security claims below are assertions you can run right now. No account,
        no credential, no secrets — every one of them is a <em>refusal</em>, which is
        exactly what makes them safe to publish.
      </p>

      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-zinc-300">
{`$ node verify-no-key.mjs
ok    anon GET /api/invoices -> 401
ok    anon GET /api/clients -> 401
ok    anon GET /api/dashboard/stats -> 401
ok    forged key POST /api/clients -> 401
ok    malformed key rejected locally
ok    anon POST /api/keys -> 401
ok    constructor refuses empty apiKey

8 passed, 0 failed`}
        </pre>
        <p className="mt-3 text-xs text-zinc-500">
          Download:{" "}
          <a className="text-zinc-300 underline decoration-zinc-700" href="/sdk/verify-no-key.mjs">
            /sdk/verify-no-key.mjs
          </a>
        </p>
      </div>

      <p className="mt-6 text-zinc-400">
        The verifier above proves everything that must be <em>refused</em>. It cannot
        prove the thing the product actually claims — that an authenticated caller
        gets a payable link. That is a separate claim, so it gets a separate script.
      </p>

      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-zinc-300">
{`$ node verify-paid-path.mjs            # dry run: no key, no writes, no egress
=== DRY RUN — nothing sent, no account touched ===
  1. GET  /api/me                    prove the key is live
  2. POST /api/clients               create a uniquely tagged client
  3. POST /api/invoices              create invoice (items + dueDate + currency)
  4.       assert server-derived total == 25000 cents
  5. POST /api/invoices/:id/share    assert url is https + *.stripe.com
  6. (skipped) email — pass --send to exercise delivery

$ INVOICEFLOW_API_KEY=ifk_... node verify-paid-path.mjs
  [PASS] authenticated: GET /api/me responded
  [PASS] created client
  [PASS] payload carries no client-supplied totals
  [PASS] created invoice
  [PASS] server-derived total matches request
  [PASS] share returned a url field
  [PASS] url is https and on stripe.com

7 passed, 0 failed`}
        </pre>
        <p className="mt-3 text-xs text-zinc-500">
          Download:{" "}
          <a className="text-zinc-300 underline decoration-zinc-700" href="/sdk/verify-paid-path.mjs">
            /sdk/verify-paid-path.mjs
          </a>
          {" "}· runs without a key, refuses a key that cannot be valid
          before transmitting it, and defaults to DRAFT so no email is sent
          unless you pass <code className="text-zinc-400">--send</code>.
        </p>
      </div>

      <h2 className="mt-14 flex items-center gap-2 text-xl font-semibold text-white">
        <KeyRound className="h-5 w-5 text-zinc-400" /> How keys work
      </h2>
      <ul className="mt-4 space-y-2 text-zinc-400">
        <li>
          Format <code className="text-zinc-200">ifk_&lt;64 hex&gt;</code>, shown once at
          creation.
        </li>
        <li>
          Only a SHA-256 hash and a non-secret 12-char prefix are stored. The key is{" "}
          <strong className="text-zinc-200">unrecoverable</strong> — revoke and re-issue.
        </li>
        <li>Scoped to exactly one account. It is a machine credential, not a session.</li>
        <li>
          It cannot move funds. It can create a payable invoice; it cannot pay one.
        </li>
      </ul>

      <h2 className="mt-14 text-xl font-semibold text-white">Endpoints</h2>
      <div className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {endpoints.map(([m, p, d]) => (
          <div key={m + p} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
            <span className="w-14 shrink-0 font-mono text-xs font-semibold text-emerald-400">{m}</span>
            <code className="font-mono text-sm text-zinc-200">{p}</code>
            <span className="ml-auto text-xs text-zinc-500">{d}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-14 flex items-center gap-2 text-xl font-semibold text-white">
        <AlertTriangle className="h-5 w-5 text-amber-400" /> If you are an autonomous agent
      </h2>
      <div className="mt-4 space-y-3 text-zinc-400">
        <p>
          <strong className="text-zinc-200">There is no idempotency key.</strong> A retried
          <code className="mx-1 text-zinc-200">createInvoice</code> after a timeout can
          duplicate a real invoice. Read back before retrying.
        </p>
        <p>
          <strong className="text-zinc-200">Sending has side effects.</strong>{" "}
          <code className="text-zinc-200">sendInvoice</code> emails a human. Do not retry it
          blindly.
        </p>
        <p>
          <strong className="text-zinc-200">Cents, not dollars.</strong>{" "}
          <code className="text-zinc-200">unitPrice: 25000</code> is $250.00.
        </p>
        <p>
          <strong className="text-zinc-200">404 means &ldquo;not yours&rdquo; too.</strong> The
          API refuses to disclose whether another account&apos;s invoice exists.
        </p>
      </div>

      <div className="mt-14 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-sm text-zinc-400">
          Full error table, response envelopes, and the measured behaviour list are in the
          README. To issue invoices, you need an API key from{" "}
          <Link href="/settings" className="text-zinc-200 underline decoration-zinc-700">
            Settings
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href="/sdk/README.md"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-900"
          >
            README
          </a>
          <a
            href="/sdk/invoiceflow-client.mjs"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:bg-zinc-900"
          >
            invoiceflow-client.mjs
          </a>
          <Link
            href="/api-docs"
            className="rounded-md bg-white px-3 py-1.5 font-medium text-black hover:bg-zinc-200"
          >
            REST reference
          </Link>
        </div>
      </div>
    </main>
  );
}
