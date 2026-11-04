import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/app-url";

/**
 * Remote MCP server — Streamable HTTP transport, JSON responses only.
 *
 * Why this exists: every MCP directory (Smithery, Glama, the official registry)
 * wants a publicly reachable server, and the ones that accept remote servers
 * avoid the npm-publishing account I do not have. More importantly a URL beats
 * an install for adoption: a URL is one field a human pastes, whereas a stdio
 * package is a config block, a runtime, and a path they must get right.
 *
 * The critical safety property: this route holds NO business logic and never
 * touches Prisma. It is a translator. Every tool call becomes a real HTTP
 * request to this same app's authenticated API, forwarding the caller's own
 * `Authorization` header. So the tool surface can never drift from the REST
 * surface, and it can never be a privilege escalation: the caller's key scopes
 * every query exactly as it would from curl. If the REST layer enforces tenant
 * isolation, this inherits it; re-implementing it here would only add a second
 * place to get it wrong.
 *
 * Deliberate omissions, same as the stdio server: no tool sends email, deletes,
 * refunds, or pays. An agent that creates a draft invoice can be cleaned up by a
 * human; an agent that emails a customer on every retry cannot be un-sent.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "2025-06-18";

type Json = Record<string, unknown>;

const str = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });

const TOOLS = [
  {
    name: "invoiceflow_whoami",
    description:
      "Check which InvoiceFlow account this key belongs to and that the key works. Call this first; it is the cheapest way to fail early.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "invoiceflow_create_client",
    description:
      "Create a customer record. A client is required before an invoice can be created. Returns the new client id.",
    inputSchema: {
      type: "object",
      properties: {
        name: str("Customer or company name. Required."),
        email: str("Billing email. Required in practice - it is where the invoice goes if a human later sends it."),
        company: str("Optional company name if it differs from name."),
        notes: str("Optional internal note. Never shown to the customer."),
      },
      required: ["name", "email"],
      additionalProperties: false,
    },
  },
  {
    name: "invoiceflow_list_clients",
    description:
      "List existing clients. Use this before create_client to avoid making duplicate customer records.",
    inputSchema: {
      type: "object",
      properties: { query: str("Optional search term matched against name or email.") },
      additionalProperties: false,
    },
  },
  {
    name: "invoiceflow_create_invoice",
    description:
      "Create a DRAFT invoice for an existing client. Amounts are INTEGER CENTS: unitPrice 25000 means $250.00, not $25,000. Do not send totals - the server derives subtotal and total from the line items. Does not email anyone.",
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
              description: str("What is being billed. Be specific - this appears on the customer's invoice."),
              quantity: int("Whole units. Must be a positive integer. Defaults to 1."),
              unitPrice: int("Price per unit in INTEGER CENTS. $250.00 is 25000."),
            },
            required: ["description", "unitPrice"],
            additionalProperties: false,
          },
        },
        dueDate: str("Due date, ISO yyyy-mm-dd. If omitted, 14 days from today is used."),
        currency: str("3-letter ISO code. Defaults to USD."),
        notes: str("Optional note printed on the invoice."),
        tax: int("Optional total tax in INTEGER CENTS. Defaults to 0."),
      },
      required: ["clientId", "items"],
      additionalProperties: false,
    },
  },
  {
    name: "invoiceflow_list_invoices",
    description:
      "List invoices with their status and totals. Invoices belonging to other accounts are not visible and return as absent, not as errors.",
    inputSchema: {
      type: "object",
      properties: {
        status: str("Optional filter: DRAFT, SENT, PAID, OVERDUE, or CANCELLED."),
        limit: int("Optional maximum number of results."),
      },
      additionalProperties: false,
    },
  },
  {
    name: "invoiceflow_get_invoice",
    description: "Fetch one invoice by id, including line items and derived totals.",
    inputSchema: {
      type: "object",
      properties: { id: str("Invoice id.") },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "invoiceflow_share_invoice",
    description:
      "Get the payable Stripe Checkout link for an invoice. This is what you give a human so they can actually pay. Does not email anyone.",
    inputSchema: {
      type: "object",
      properties: { id: str("Invoice id.") },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

function isoDays(n: number): string {
  return new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
}

// A configured origin only. Request headers (Host, X-Forwarded-*) are caller
// controlled and must never choose where this server sends a bearer key.
function selfBase(): string {
  return process.env.INVOICEFLOW_PUBLIC_URL?.replace(/\/+$/, "") || appUrl();
}

class ToolError extends Error {}

async function api(
  req: NextRequest,
  method: string,
  path: string,
  opts: { body?: Json; query?: Record<string, string | number | undefined> } = {}
): Promise<unknown> {
  const url = new URL(selfBase() + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const authz = req.headers.get("authorization");
  if (!authz) {
    throw new ToolError(
      "Missing Authorization header. This server needs an InvoiceFlow API key as " +
        "Authorization: Bearer ifk_... Create one in InvoiceFlow Settings -> API keys."
    );
  }

  const headers: Record<string, string> = { Authorization: authz };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    throw new ToolError(`Could not reach the InvoiceFlow API at ${url.origin}.`);
  }

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON stays a string */
  }

  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object"
        ? ((parsed as Json).error as string) || JSON.stringify(parsed)
        : String(parsed || res.statusText);
    throw new ToolError(`InvoiceFlow API returned ${res.status}: ${msg}`);
  }
  return parsed;
}

async function callTool(req: NextRequest, name: string, raw: Json): Promise<unknown> {
  const a: Json = raw ?? {};

  switch (name) {
    case "invoiceflow_whoami":
      return await api(req, "GET", "/api/dashboard/stats");

    case "invoiceflow_create_client": {
      if (typeof a.name !== "string" || !a.name.trim()) throw new ToolError("name is required");
      if (typeof a.email !== "string" || !a.email.includes("@"))
        throw new ToolError("email is required and must look like an email address");
      return await api(req, "POST", "/api/clients", {
        body: {
          name: a.name,
          email: a.email,
          ...(a.company ? { company: a.company } : {}),
          ...(a.notes ? { notes: a.notes } : {}),
        },
      });
    }

    case "invoiceflow_list_clients":
      return await api(req, "GET", "/api/clients", {
        query: a.query ? { query: String(a.query) } : undefined,
      });

    case "invoiceflow_create_invoice": {
      if (typeof a.clientId !== "string" || !a.clientId)
        throw new ToolError("clientId is required - create a client first");
      const items = a.items;
      if (!Array.isArray(items) || items.length === 0)
        throw new ToolError("items is required and must contain at least one line item");
      const cleaned = items.map((it: Json, i: number) => {
        if (!it || typeof it.description !== "string" || !it.description.trim())
          throw new ToolError(`items[${i}].description is required - an unnamed line item is unauditable`);
        if (typeof it.unitPrice !== "number" || !Number.isInteger(it.unitPrice) || it.unitPrice < 0)
          throw new ToolError(
            `items[${i}].unitPrice must be a non-negative INTEGER in cents (${String(it.unitPrice)} received). $250.00 is 25000, not 250.`
          );
        return {
          description: it.description,
          quantity:
            typeof it.quantity === "number" && Number.isInteger(it.quantity) && it.quantity > 0
              ? it.quantity
              : 1,
          unitPrice: it.unitPrice,
        };
      });

      return await api(req, "POST", "/api/invoices", {
        body: {
          clientId: a.clientId,
          items: cleaned,
          dueDate: typeof a.dueDate === "string" && a.dueDate ? a.dueDate : isoDays(14),
          currency: typeof a.currency === "string" && a.currency ? a.currency : "USD",
          status: "DRAFT",
          ...(a.notes ? { notes: a.notes } : {}),
          ...(typeof a.tax === "number" && Number.isInteger(a.tax) ? { tax: a.tax } : {}),
        },
      });
    }

    case "invoiceflow_list_invoices": {
      const query: Record<string, string | number | undefined> = {};
      if (typeof a.status === "string" && a.status) query.status = a.status;
      if (typeof a.limit === "number" && Number.isInteger(a.limit) && a.limit > 0)
        query.pageSize = Math.min(a.limit, 50);
      return await api(req, "GET", "/api/invoices", { query });
    }

    case "invoiceflow_get_invoice": {
      if (typeof a.id !== "string" || !a.id) throw new ToolError("id is required");
      return await api(req, "GET", `/api/invoices/${encodeURIComponent(a.id)}`);
    }

    case "invoiceflow_share_invoice": {
      if (typeof a.id !== "string" || !a.id) throw new ToolError("id is required");
      return await api(req, "POST", `/api/invoices/${encodeURIComponent(a.id)}/share`, { body: {} });
    }

    default:
      throw new ToolError(`Unknown tool: ${name}`);
  }
}

async function handleOne(req: NextRequest, msg: Json): Promise<Json | null> {
  const id = msg.id ?? null;
  const method = typeof msg.method === "string" ? msg.method : "";
  const params = (msg.params ?? {}) as Json;
  const isNotification = msg.id === undefined;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion:
            typeof params.protocolVersion === "string" ? params.protocolVersion : PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "invoiceflow", version: "1.0.0" },
          instructions:
            "InvoiceFlow creates invoices and payable Stripe links. Amounts are integer cents. " +
            "Creating an invoice is additive and reversible; no tool sends email, deletes, refunds, or pays.",
        },
      };

    case "ping":
      return { jsonrpc: "2.0", id, result: {} };

    case "tools/list":
      return { jsonrpc: "2.0", id, result: { tools: TOOLS } };

    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments ?? {}) as Json;
      try {
        const out = await callTool(req, name, args);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(out ?? null, null, 2) }],
            isError: false,
          },
        };
      } catch (e) {
        // Tool failures are results, not protocol errors: the model must be able
        // to read the reason and correct itself instead of the host aborting.
        const message = e instanceof Error ? e.message : String(e);
        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: message }], isError: true },
        };
      }
    }

    default:
      if (isNotification) return null;
      return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: body must be JSON" } },
      { status: 200 }
    );
  }

  if (Array.isArray(body)) {
    const out: Json[] = [];
    for (const m of body) {
      if (!m || typeof m !== "object") {
        out.push({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } });
        continue;
      }
      const r = await handleOne(req, m as Json);
      if (r) out.push(r);
    }
    if (out.length === 0) return new NextResponse(null, { status: 202 });
    return NextResponse.json(out);
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid Request" } },
      { status: 200 }
    );
  }

  const r = await handleOne(req, body as Json);
  if (!r) return new NextResponse(null, { status: 202 });
  return NextResponse.json(r);
}

/**
 * Streamable HTTP clients may probe with GET for a server-initiated stream.
 * We never push unsolicited messages, so answer honestly with 405 rather than
 * holding the connection open and pretending to be a stream.
 */
export async function GET() {
  return NextResponse.json(
    { error: "This MCP endpoint is request/response only. Use POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "POST, GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    },
  });
}
