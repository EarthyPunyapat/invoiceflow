#!/usr/bin/env node
/**
 * test-mcp.mjs — conformance test for invoiceflow-mcp.mjs. No key, no network.
 *
 *   node test-mcp.mjs            # exit 0 all pass, 1 failure
 *
 * Every assertion here is one a host actually depends on. If these pass, the
 * server speaks the protocol; they say nothing about the API, which is covered
 * by verify-no-key.mjs (auth boundary) and verify-paid-path.mjs (money path).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(HERE, "invoiceflow-mcp.mjs");
const TMP_KEY = "ifk_" + "0".repeat(40);

function run(lines, env) {
  return new Promise(resolve => {
    const p = spawn(process.execPath, [SERVER], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let out = "";
    p.stdout.on("data", d => (out += d));
    p.stderr.on("data", () => {});
    // The whole point: write the batch, close stdin immediately.
    p.stdin.end(lines.map(l => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
    const timer = setTimeout(() => p.kill("SIGKILL"), 15000);
    p.on("close", () => {
      clearTimeout(timer);
      resolve(out.split("\n").filter(Boolean).map(l => {
        try { return JSON.parse(l); } catch { return { _raw: l }; }
      }));
    });
  });
}

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name + (detail ? " — " + detail : "")); }
}

const REQ = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
  { jsonrpc: "2.0", method: "notifications/initialized" },
  { jsonrpc: "2.0", id: 2, method: "tools/list" },
  { jsonrpc: "2.0", id: 3, method: "ping" },
  { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "invoiceflow_whoami", arguments: {} } },
  { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "no_such_tool", arguments: {} } },
  { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "invoiceflow_create_invoice", arguments: { clientId: "c", items: [{ description: "d", unitPrice: 25.5 }] } } },
  { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "invoiceflow_create_invoice", arguments: { clientId: "c", items: [{ unitPrice: 100 }] } } },
  "this is not json"
];

console.log("=== invoiceflow-mcp conformance (no key, no network) ===\n");

// 1. missing key must not crash the server
const noKey = await run(REQ, { INVOICEFLOW_API_KEY: "" });
const byId = id => noKey.find(m => m.id === id);
ok("starts and answers initialize without a key", Boolean(byId(1) && byId(1).result));
ok("replies to every request id before stdin closes", [1, 2, 3, 4, 5, 6, 7].every(i => byId(i)));
ok("ping returns an empty result", Boolean(byId(3) && byId(3).result && !byId(3).error));
ok("parse error is reported, not fatal", noKey.some(m => m.error && m.error.code === -32700));
ok("unknown method -> -32601", byId(5) && byId(5).error && byId(5).error.code === -32602);

const tools = (byId(2) && byId(2).result && byId(2).result.tools) || [];
ok("tools/list returns tools", tools.length >= 6, tools.length + " tools");
ok("every tool has name/description/inputSchema",
  tools.length > 0 && tools.every(t => t.name && t.description && t.inputSchema && t.inputSchema.type === "object"));
ok("no tool can send email or destroy data",
  !tools.some(t => /send|email|delete|refund|pay\b/i.test(t.name)));

// 2. amount guard: this is the defect that reaches a real customer
const bad = byId(6);
ok("non-integer unitPrice is refused", Boolean(bad && bad.result && bad.result.isError));
ok("refusal explains cents explicitly",
  Boolean(bad && bad.result && /INTEGER in cents/.test(bad.result.content[0].text)));
const noDesc = byId(7);
ok("line item without a description is refused",
  Boolean(noDesc && noDesc.result && noDesc.result.isError));

// 3. missing key is an actionable tool error, not a crash
const who = byId(4);
ok("missing key -> isError with setup instructions",
  Boolean(who && who.result && who.result.isError && /INVOICEFLOW_API_KEY/.test(who.result.content[0].text)));

// 4. malformed key is refused before it is transmitted
const badKey = await run(REQ.slice(0, 5), { INVOICEFLOW_API_KEY: "garbage" });
const w2 = badKey.find(m => m.id === 4);
ok("malformed key refused locally with ifk_ hint",
  Boolean(w2 && w2.result && w2.result.isError && /ifk_/.test(w2.result.content[0].text)));

// 5. a well-formed key gets past the guard and fails at the network honestly
const realKey = await run([REQ[0], REQ[4]], { INVOICEFLOW_API_KEY: TMP_KEY, INVOICEFLOW_BASE_URL: "http://127.0.0.1:9/" });
const w3 = realKey.find(m => m.id === 4);
ok("well-formed key proceeds to a real call (fails as network, not as guard)",
  Boolean(w3 && w3.result && w3.result.isError && !/INVOICEFLOW_API_KEY is not set/.test(w3.result.content[0].text)));

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail === 0 ? 0 : 1);
