#!/usr/bin/env node
/**
 * invoiceflow-mcp.mjs — InvoiceFlow as Model Context Protocol tools.
 *
 * This is the difference between "an agent could call our API" and "an agent
 * in Claude Desktop or Cursor can invoice someone during a conversation."
 * Any MCP host gains invoicing by adding six lines of config.
 *
 *   { "mcpServers": { "invoiceflow": {
 *       "command": "node",
 *       "args": ["/abs/path/invoiceflow-mcp.mjs"],
 *       "env": { "INVOICEFLOW_API_KEY": "ifk_..." }
 *   }}}
 *
 * Transport: stdio, newline-delimited JSON-RPC 2.0. Zero dependencies.
 *
 * Deliberate design choices, because an LLM is the caller:
 *   - No tool sends email. Sending is a human act; an agent that emails on a
 *     retry loop sends a customer five invoices. "send" is absent on purpose.
 *   - No tool pays, refunds, or deletes. Creation is additive and reversible
 *     by a human in the dashboard; destruction is not.
 *   - Amounts are integer cents, named `unitPrice`, and the description says so,
 *     because "25.00" meaning 25 cents is the defect most likely to reach a
 *     real customer.
 *   - Every mutating tool requires an explicit description string, so an
 *     agent cannot create an unnamed line item that nobody can audit later.
 *   - Errors are returned as tool results with isError, never thrown into the
 *     transport, so one bad call cannot kill the agent's session.
 */

import { InvoiceFlowClient, InvoiceFlowError } from "./invoiceflow-client.mjs";

const SERVER = { name: "invoiceflow", version: "1.0.0" };
const API_KEY = (process.env.INVOICEFLOW_API_KEY || "").trim();
const BASE_URL = process.env.INVOICEFLOW_BASE_URL || undefined;

// Built lazily. The client constructor throws on a missing or malformed key,
// and a server that cannot answer `initialize` is useless: the host shows a
// crash instead of telling the user what to fix. So start unconditionally and
// surface a bad key as a tool-level error with an actionable message.
let _client = null;
function client() {
  if (_client) return _client;
  if (!API_KEY) {
    throw new Error(
      "INVOICEFLOW_API_KEY is not set. Add it to this server's env block in your " +
      "MCP host config. Create a key in InvoiceFlow -> Settings -> API keys."
    );
  }
  if (!/^ifk_/.test(API_KEY)) {
    throw new Error(
      'INVOICEFLOW_API_KEY must start with "ifk_". The value provided does not, ' +
      "so it was not transmitted anywhere."
    );
  }
  _client = new InvoiceFlowClient({ apiKey: API_KEY, baseUrl: BASE_URL });
  return _client;
}

const str = (description, extra) => Object.assign({ type: "string", description }, extra || {});
const int = (description, extra) => Object.assign({ type: "integer", description }, extra || {});

const TOOLS = [
  {
    name: "invoiceflow_whoami",
    description:
      "Check which InvoiceFlow account this key belongs to and that the key works. Call this first; it is the cheapest way to fail early.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "invoiceflow_create_client",
    description:
      "Create a customer record. A client is required before an invoice can be created. Returns the new client id.",
    inputSchema: {
      type: "object",
      properties: {
        name: str("Customer or company name. Required."),
        email: str("Billing email. Required in practice — it is where the invoice goes if a human later sends it."),
        company: str("Optional company name if it differs from name."),
        notes: str("Optional internal note. Never shown to the customer.")
      },
      required: ["name", "email"],
      additionalProperties: false
    }
  },
  {
    name: "invoiceflow_list_clients",
    description: "List existing clients. Use this before create_client to avoid making duplicate customer records.",
    inputSchema: {
      type: "object",
      properties: { query: str("Optional search term matched against name or email.") },
      additionalProperties: false
    }
  },
  {
    name: "invoiceflow_create_invoice",
    description:
      "Create a DRAFT invoice for an existing client. Amounts are INTEGER CENTS: unitPrice 25000 means $250.00, not $25,000. Do not send totals — the server derives subtotal and total from the line items. Does not email anyone.",
    inputSchema: {
      type: "object",
      properties: {
        clientId: str("id of an existing client, from list_clients or create_client. Required."),
        items: {
          type: "array",
          minItems: 1,
          description: "One or more line items. At least one is required.",
          items: {
            type: "object",
            properties: {
              description: str("What is being billed. Be specific — this appears on the customer's invoice."),
              quantity: int("Whole units. Must be a positive integer. Defaults to 1."),
              unitPrice: int("Price per unit in INTEGER CENTS. $250.00 is 25000.")
            },
            required: ["description", "unitPrice"],
            additionalProperties: false
          }
        },
        dueDate: str("Due date, ISO yyyy-mm-dd. If omitted, 14 days from today is used."),
        currency: str("3-letter ISO code. Defaults to USD."),
        notes: str("Optional note printed on the invoice."),
        tax: int("Optional total tax in INTEGER CENTS. Defaults to 0.")
      },
      required: ["clientId", "items"],
      additionalProperties: false
    }
  },
  {
    name: "invoiceflow_list_invoices",
    description: "List invoices with their status and totals. Invoices belonging to other accounts are not visible and return as absent, not as errors.",
    inputSchema: {
      type: "object",
      properties: {
        status: str("Optional filter: DRAFT, SENT, PAID, OVERDUE, or CANCELLED."),
        limit: int("Optional maximum number of results.")
      },
      additionalProperties: false
    }
  },
  {
    name: "invoiceflow_get_invoice",
    description: "Fetch one invoice by id, including line items and derived totals.",
    inputSchema: {
      type: "object",
      properties: { id: str("Invoice id.") },
      required: ["id"],
      additionalProperties: false
    }
  },
  {
    name: "invoiceflow_share_invoice",
    description:
      "Get the payable Stripe Checkout link for an invoice. This is what you give a human so they can actually pay. Does not email anyone.",
    inputSchema: {
      type: "object",
      properties: { id: str("Invoice id.") },
      required: ["id"],
      additionalProperties: false
    }
  }
];

function isoDays(n) {
  return new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
}

async function callTool(name, a) {
  a = a || {};
  switch (name) {
    case "invoiceflow_whoami":
      return await client().me();

    case "invoiceflow_create_client":
      return await client().createClient({
        name: a.name,
        email: a.email,
        ...(a.company ? { company: a.company } : {}),
        ...(a.notes ? { notes: a.notes } : {})
      });

    case "invoiceflow_list_clients":
      return await client().listClients(a.query ? { query: a.query } : undefined);

    case "invoiceflow_create_invoice": {
      if (!Array.isArray(a.items) || a.items.length === 0) {
        throw new Error("items is required and must contain at least one line item");
      }
      for (const [i, it] of a.items.entries()) {
        if (!it || typeof it.description !== "string" || !it.description.trim()) {
          throw new Error(`items[${i}].description is required — an unnamed line item is unauditable`);
        }
        if (!Number.isInteger(it.unitPrice) || it.unitPrice < 0) {
          throw new Error(
            `items[${i}].unitPrice must be a non-negative INTEGER in cents ` +
            `(${it.unitPrice} received). $250.00 is 25000, not 250.`
          );
        }
      }
      const body = {
        clientId: a.clientId,
        items: a.items.map(it => ({
          description: it.description,
          quantity: Number.isInteger(it.quantity) && it.quantity > 0 ? it.quantity : 1,
          unitPrice: it.unitPrice
        })),
        dueDate: a.dueDate || isoDays(14),
        currency: a.currency || "USD",
        status: "DRAFT",
        ...(a.notes ? { notes: a.notes } : {}),
        ...(Number.isInteger(a.tax) ? { tax: a.tax } : {})
      };
      return await client().createInvoice(body);
    }

    case "invoiceflow_list_invoices": {
      const q = {};
      if (a.status) q.status = a.status;
      if (Number.isInteger(a.limit)) q.limit = a.limit;
      return await client().listInvoices(Object.keys(q).length ? q : undefined);
    }

    case "invoiceflow_get_invoice":
      return await client().getInvoice(a.id);

    case "invoiceflow_share_invoice":
      return await client().shareInvoice(a.id);

    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}
function replyErr(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

async function handle(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    return reply(id, {
      protocolVersion: (params && params.protocolVersion) || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER
    });
  }
  if (method === "notifications/initialized" || method === "initialized") return;
  if (method === "ping") return reply(id, {});

  if (method === "tools/list") return reply(id, { tools: TOOLS });

  if (method === "tools/call") {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    if (!TOOLS.some(t => t.name === name)) return replyErr(id, -32602, `unknown tool: ${name}`);
    try {
      const out = await callTool(name, args);
      return reply(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
    } catch (e) {
      const text =
        e instanceof InvoiceFlowError
          ? `InvoiceFlow API error ${e.status}: ${e.message}`
          : String((e && e.message) || e);
      // isError keeps a failed call inside the conversation instead of killing it
      return reply(id, { content: [{ type: "text", text }], isError: true });
    }
  }

  if (id !== undefined) replyErr(id, -32601, `method not found: ${method}`);
}

if (!API_KEY) {
  console.error(
    "invoiceflow-mcp: INVOICEFLOW_API_KEY is not set. Starting anyway so the " +
    "host can list tools; calls will return an actionable error."
  );
}

let buf = "";
let pending = 0;
let ended = false;

// Exit only once stdin is closed AND every in-flight call has replied.
// Exiting on "end" alone loses responses when a caller pipes a batch of
// requests and closes the pipe immediately -- which is what every conformance
// test does, and what some hosts do too.
function maybeExit() {
  if (ended && pending === 0) {
    process.stdout.write("", () => process.exit(0));
  }
}

function dispatch(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    replyErr(null, -32700, "parse error");
    return;
  }
  pending++;
  handle(msg)
    .catch(e => {
      if (msg && msg.id !== undefined) replyErr(msg.id, -32603, String((e && e.message) || e));
    })
    .finally(() => {
      pending--;
      maybeExit();
    });
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (line) dispatch(line);
  }
});
process.stdin.on("end", () => {
  const rest = buf.trim();
  buf = "";
  ended = true;
  if (rest) {
    dispatch(rest);
  } else {
    maybeExit();
  }
});
