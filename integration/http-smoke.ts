/** Run against a locally started production build and the disposable test DB.
 * Provider traffic is not exercised; no email/payment requests are sent. */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { randomBytes } from "node:crypto";

async function main() {
  const database = new URL(process.env.DATABASE_URL || "http://missing");
  assert(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname === "/invoiceflow_test", "Use the disposable local test database");
  assert(process.env.AUTH_SECRET, "Load the same local AUTH_SECRET as the production server");
  const origin = "http://localhost:3000";
  const db = new PrismaClient();
  const user = await db.user.create({ data: { email: `smoke-${crypto.randomUUID()}@example.test`, name: "Release smoke" } });
  try {
    const client = await db.client.create({ data: { userId: user.id, email: "client@example.test", name: "Smoke Client" } });
    const invoice = await db.invoice.create({ data: { userId: user.id, clientId: client.id, invoiceNumber: "SMOKE-0001", status: "SENT", subtotal: 10, total: 11.25, tax: 12.5, currency: "USD", dueDate: new Date(), shareToken: randomBytes(16).toString("hex"), items: { create: [{ description: "Smoke service", quantity: 1, unitPrice: 10, total: 10 }] } } });
    const jwt = await encode({ token: { sub: user.id, name: user.name, email: user.email }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token" });
    const authenticated = { cookie: `authjs.session-token=${jwt}` };
    async function check(path: string, status: number, headers?: Record<string, string>, content?: string) {
      const response = await fetch(`${origin}${path}`, { headers, redirect: "manual" });
      assert.equal(response.status, status, `${path} returned ${response.status}`);
      if (content) assert((await response.text()).includes(content), `${path} is missing expected content`);
      console.log(`PASS ${path}: ${status}`);
      return response;
    }
    await check("/", 200, undefined, "InvoiceFlow");
    await check("/login", 200, undefined, "Google");
    await check("/api/invoices", 401);
    const gated = await check("/dashboard", 307);
    assert(gated.headers.get("location")?.includes("/login"));
    await check("/api/auth/session", 200, authenticated, user.id);
    await check("/dashboard", 200, authenticated, "SMOKE-0001");
    await check("/reports?currency=USD", 200, authenticated);
    await check(`/i/${invoice.shareToken}`, 200, undefined, "SMOKE-0001");
    await check("/i/invalid", 404);
    const pdf = await check(`/api/invoices/${invoice.id}/pdf`, 200, authenticated);
    assert(pdf.headers.get("content-type")?.includes("application/pdf"));
    const pdfBytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(pdfBytes.subarray(0, 4).toString(), "%PDF");
    await check("/api/export/invoices", 200, authenticated, "SMOKE-0001");
    await check("/api/cron/generate-recurring", 503);
    console.log("Production HTTP smoke checks passed (12 requests).");
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
