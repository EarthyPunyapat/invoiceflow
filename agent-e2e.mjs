import { InvoiceFlowClient } from "./sdk/invoiceflow-client.mjs";
const KEY = process.argv[2];
const B = "https://invoiceflow-ten-azure.vercel.app";
let pass = 0, fail = 0;
const ok  = (l, v) => { pass++; console.log(`  PASS  ${l}: ${v}`); };
const bad = (l, v) => { fail++; console.log(`  FAIL  ${l}: ${v}`); };

const c = new InvoiceFlowClient({ apiKey: KEY, baseUrl: B });

// 0. bad key refused
try { await new InvoiceFlowClient({ apiKey: "ifk_" + "0".repeat(64), baseUrl: B }).me(); bad("bad key refused", "SUCCEEDED"); }
catch (e) { (e.status === 401 || e.status === 403) ? ok("bad key refused", e.status) : bad("bad key refused", e.message); }

// 1. authenticate
await c.me(); ok("bearer-only auth", "200");

// 2. tenant isolation
try { await c.getInvoice("cmvxrig50000437vu7dkdqayr"); bad("cross-tenant invoice refused", "LEAKED"); }
catch (e) { e.status === 404 ? ok("cross-tenant invoice refused", "404") : bad("cross-tenant", e.status); }

// 3. create a client
const client = await c.createClient({ name: "Agent E2E Co", email: "agent-e2e@example.com" });
const cid = client?.data?.id ?? client?.id;
cid ? ok("createClient", cid) : bad("createClient", JSON.stringify(client).slice(0, 120));

// 4. create an invoice for it
const due = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
const inv = await c.createInvoice({
  clientId: cid,
  dueDate: due,
  items: [{ description: "Autonomous agent integration proof", quantity: 1, unitPrice: 25000 }],
});
const iid = inv?.data?.id ?? inv?.id;
const num = inv?.data?.number ?? inv?.number;
iid ? ok("createInvoice", `${num ?? "?"} / ${iid}`) : bad("createInvoice", JSON.stringify(inv).slice(0, 200));

if (iid) {
  // 5. read it back
  const back = await c.getInvoice(iid);
  const d = back?.data ?? back;
  (d?.id === iid) ? ok("getInvoice round-trip", `${d.number} total=${d.total ?? d.totalAmount ?? "?"}`)
                  : bad("getInvoice", JSON.stringify(back).slice(0, 150));

  // 6. share -> payment link (the thing that actually gets the agent paid)
  try { const s = await c.shareInvoice(iid); const sd = s?.data ?? s;
    (sd?.url || sd?.shareUrl || sd?.token) ? ok("shareInvoice -> payment link", String(sd.url ?? sd.shareUrl ?? sd.token).slice(0, 70))
                                           : bad("shareInvoice", JSON.stringify(s).slice(0, 150));
  } catch (e) { bad("shareInvoice", e.status + " " + e.message); }

  // 7. PDF
  try { const r = await c.invoicePdf(iid); const b = Buffer.from(await r.arrayBuffer());
    b.subarray(0,4).toString() === "%PDF" ? ok("invoicePdf", `${b.length} bytes, %PDF magic`) : bad("invoicePdf", b.subarray(0,8).toString());
  } catch (e) { bad("invoicePdf", e.status + " " + e.message); }

  // 8. update
  try { await c.updateInvoice(iid, { notes: "updated by agent" }); ok("updateInvoice", "200"); }
  catch (e) { bad("updateInvoice", e.status + " " + e.message); }
}

// 9. privilege escalation must be impossible
const esc = await fetch(B + "/api/keys", { method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: '{"name":"escalate"}' });
(!esc.ok) ? ok("key cannot mint keys", esc.status) : bad("key cannot mint keys", "ESCALATED " + esc.status);

// 10. validation is enforced
try { await c.createInvoice({}); bad("empty invoice refused", "ACCEPTED"); }
catch (e) { [400, 422].includes(e.status) ? ok("empty invoice refused", e.status) : bad("empty invoice refused", e.status); }

// cleanup so production stays clean
try { if (iid) await c.deleteInvoice(iid); if (cid) await c.deleteClient(cid); ok("cleanup", "deleted test rows"); }
catch (e) { console.log("  note  cleanup partial: " + e.message); }

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
