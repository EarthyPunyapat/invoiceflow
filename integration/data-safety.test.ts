import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceStatus } from "@prisma/client";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: session.userId } }) }));
import { prisma } from "@/lib/prisma";
import { lockOwner } from "@/lib/billing";
import { PUT as editInvoice, DELETE as deleteInvoice } from "@/app/api/invoices/[id]/route";
import { GET as listClients } from "@/app/api/clients/route";
import { DELETE as deleteClient } from "@/app/api/clients/[id]/route";
import { PATCH as changeEstimate, DELETE as deleteEstimate } from "@/app/api/estimates/[id]/route";

const owners: string[] = [];
let clientId: string;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown) => new NextRequest("https://invoiceflow.example/api/fixture", {
  method, headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}),
});
const replacement = { currency: "USD", tax: 0, items: [{ description: "Updated", quantity: 1, unitPrice: 99 }] };
async function invoice(status: InvoiceStatus = "DRAFT") {
  return prisma.invoice.create({ data: {
    userId: session.userId, clientId, invoiceNumber: `SAFE-${crypto.randomUUID()}`,
    status, subtotal: 10, total: 10, dueDate: new Date("2027-01-01"),
    items: { create: [{ description: "Original", quantity: 1, unitPrice: 10, total: 10 }] },
  } });
}
async function waitForAdvisoryWaiter() {
  // Observe the route actually waiting for our owner lock, rather than relying
  // on timing alone to exercise the concurrent state change.
  for (let attempt = 0; attempt < 100; attempt++) {
    const waiting = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity WHERE wait_event = 'advisory'`;
    if (waiting[0].count > BigInt(0)) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("Expected the route to wait for the financial-record lock");
}

beforeAll(() => {
  const database = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/invoiceflow_test") {
    throw new Error("Data safety tests require the disposable local invoiceflow_test database");
  }
});
beforeEach(async () => {
  const user = await prisma.user.create({ data: { email: `safety-${crypto.randomUUID()}@example.test` } });
  owners.push(user.id); session.userId = user.id;
  const client = await prisma.client.create({ data: { userId: user.id, name: "Data safety client", email: "client@example.test" } });
  clientId = client.id;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
  await prisma.$disconnect();
});

describe("financial record safety", () => {
  it.each<InvoiceStatus>(["SENT", "PAID", "OVERDUE", "CANCELLED"])("refuses to edit or delete %s invoices", async status => {
    const stored = await invoice(status);
    expect((await editInvoice(req("PUT", replacement), ctx(stored.id))).status).toBe(409);
    expect((await deleteInvoice(req("DELETE"), ctx(stored.id))).status).toBe(409);
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: stored.id } })).total).toBe(10);
  });
  it("allows draft edits and draft deletion", async () => {
    const stored = await invoice();
    expect((await editInvoice(req("PUT", replacement), ctx(stored.id))).status).toBe(200);
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: stored.id } })).total).toBe(99);
    expect((await deleteInvoice(req("DELETE"), ctx(stored.id))).status).toBe(200);
    expect(await prisma.invoice.findUnique({ where: { id: stored.id } })).toBeNull();
  });
  it.each(["edit", "delete"])("rechecks draft state after concurrent settlement before %s", async action => {
    const stored = await invoice();
    let pending: Promise<Response> | undefined;
    await prisma.$transaction(async tx => {
      await lockOwner(tx, session.userId);
      pending = action === "edit" ? editInvoice(req("PUT", replacement), ctx(stored.id)) : deleteInvoice(req("DELETE"), ctx(stored.id));
      await waitForAdvisoryWaiter();
      await tx.invoice.update({ where: { id: stored.id }, data: { status: "SENT" } });
    }, { timeout: 10_000 });
    expect((await pending!).status).toBe(409);
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: stored.id } })).total).toBe(10);
  });
  it.each(["invoice", "estimate", "recurring"])("preserves clients with an associated %s", async document => {
    if (document === "invoice") await invoice("PAID");
    if (document === "estimate") await prisma.estimate.create({ data: { userId: session.userId, clientId, estimateNumber: `SAFE-${crypto.randomUUID()}`, subtotal: 10, total: 10 } });
    if (document === "recurring") await prisma.recurringInvoice.create({ data: { userId: session.userId, clientId, name: "Keep schedule", frequency: "MONTHLY", nextRunAt: new Date() } });
    expect((await deleteClient(req("DELETE"), ctx(clientId))).status).toBe(409);
    expect(await prisma.client.findUnique({ where: { id: clientId } })).not.toBeNull();
  });
  it("preserves an invoice inserted while client deletion waits for its FK lock", async () => {
    let pending: Promise<Response> | undefined;
    await prisma.$transaction(async tx => {
      await tx.invoice.create({ data: { userId: session.userId, clientId, invoiceNumber: `SAFE-${crypto.randomUUID()}`, status: "PAID", subtotal: 10, total: 10, dueDate: new Date() } });
      pending = deleteClient(req("DELETE"), ctx(clientId));
      let waiting = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const locks = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE '%FOR UPDATE%'`;
        if (locks[0].count > BigInt(0)) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true);
    }, { timeout: 10_000 });
    expect((await pending!).status).toBe(409);
    expect(await prisma.invoice.count({ where: { clientId } })).toBe(1);
  });
  it("keeps client summary totals in the requested currency", async () => {
    await invoice("PAID");
    await prisma.invoice.create({ data: { userId: session.userId, clientId, invoiceNumber: `SAFE-${crypto.randomUUID()}`, status: "SENT", currency: "EUR", subtotal: 20, total: 20, dueDate: new Date() } });
    const usd = await (await listClients(new NextRequest("https://invoiceflow.example/api/clients"))).json();
    expect(usd.currency).toBe("USD"); expect(usd.clients[0].invoiceCount).toBe(2);
    expect(usd.clients[0].totalBilled).toBe(10); expect(usd.clients[0].outstanding).toBe(0);
    const eur = await (await listClients(new NextRequest("https://invoiceflow.example/api/clients?currency=eur"))).json();
    expect(eur.currency).toBe("EUR"); expect(eur.clients[0].totalBilled).toBe(20); expect(eur.clients[0].outstanding).toBe(20);
    expect(eur.clients[0].invoices.every((inv: { currency: string }) => !!inv.currency)).toBe(true);
    expect((await listClients(new NextRequest("https://invoiceflow.example/api/clients?currency=bad"))).status).toBe(400);
  });
  it("deletes a client with no documents", async () => {
    expect((await deleteClient(req("DELETE"), ctx(clientId))).status).toBe(200);
    expect(await prisma.client.findUnique({ where: { id: clientId } })).toBeNull();
  });
  it("hides another owner's invoices and clients", async () => {
    const stored = await invoice(); const previousOwner = session.userId;
    const other = await prisma.user.create({ data: { email: `other-safety-${crypto.randomUUID()}@example.test` } }); owners.push(other.id);
    session.userId = other.id;
    expect((await editInvoice(req("PUT", replacement), ctx(stored.id))).status).toBe(404);
    expect((await deleteInvoice(req("DELETE"), ctx(stored.id))).status).toBe(404);
    expect((await deleteClient(req("DELETE"), ctx(clientId))).status).toBe(404);
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: stored.id } })).userId).toBe(previousOwner);
  });
});

describe("estimate lifecycle", () => {
  it("keeps converted estimates terminal and refuses direct conversion via PATCH", async () => {
    const converted = await prisma.estimate.create({ data: { userId: session.userId, clientId, estimateNumber: `SAFE-${crypto.randomUUID()}`, subtotal: 10, total: 10, status: "CONVERTED" } });
    expect((await changeEstimate(req("PATCH", { status: "DRAFT" }), ctx(converted.id))).status).toBe(409);
    expect((await deleteEstimate(req("DELETE"), ctx(converted.id))).status).toBe(409);
    const draft = await prisma.estimate.create({ data: { userId: session.userId, clientId, estimateNumber: `SAFE-${crypto.randomUUID()}`, subtotal: 10, total: 10 } });
    expect((await changeEstimate(req("PATCH", { status: "CONVERTED" }), ctx(draft.id))).status).toBe(409);
  });
  it("allows the draft to sent to accepted lifecycle", async () => {
    const estimate = await prisma.estimate.create({ data: { userId: session.userId, clientId, estimateNumber: `SAFE-${crypto.randomUUID()}`, subtotal: 10, total: 10 } });
    expect((await changeEstimate(req("PATCH", { status: "SENT" }), ctx(estimate.id))).status).toBe(200);
    expect((await changeEstimate(req("PATCH", { status: "ACCEPTED" }), ctx(estimate.id))).status).toBe(200);
    expect((await changeEstimate(req("PATCH", { status: "DRAFT" }), ctx(estimate.id))).status).toBe(409);
  });
});
