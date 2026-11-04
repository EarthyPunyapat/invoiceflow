import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// No browser session: every request below authenticates with an API key only.
vi.mock("@/lib/auth", () => ({ auth: async () => null }));

import { prisma } from "@/lib/prisma";
import { createApiKey } from "@/lib/api-key";
import { POST as shareInvoice } from "@/app/api/invoices/[id]/share/route";

const owners: string[] = [];
const share = (id: string, key: string) =>
  shareInvoice(
    new NextRequest(`https://invoiceflow.example/api/invoices/${id}/share`, {
      method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: "{}",
    }),
    { params: Promise.resolve({ id }) },
  );
async function ownerWithInvoice(status: "DRAFT" | "SENT") {
  const user = await prisma.user.create({ data: { email: `share-${crypto.randomUUID()}@example.test` } });
  owners.push(user.id);
  const client = await prisma.client.create({ data: { userId: user.id, name: "Client", email: "client@example.test" } });
  const invoice = await prisma.invoice.create({ data: {
    userId: user.id, clientId: client.id, invoiceNumber: `SHARE-${crypto.randomUUID()}`, status,
    subtotal: 10, total: 10, dueDate: new Date("2027-01-01"),
    items: { create: [{ description: "Work", quantity: 1, unitPrice: 10, total: 10 }] },
  } });
  const { key } = await createApiKey(user.id, "agent");
  return { invoice, key };
}

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") {
    throw new Error("Agent share tests require the disposable local invoiceflow_test database");
  }
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: owners } } });
  await prisma.$disconnect();
});

describe("sharing invoices with an API key", () => {
  it("an API key can share its owner's sent invoice", async () => {
    const { invoice, key } = await ownerWithInvoice("SENT");
    const response = await share(invoice.id, key);
    expect(response.status).toBe(200);
    expect((await response.json()).url).toMatch(/^https:\/\/invoiceflow\.example\/i\/[0-9a-f]{32}$/);
  });

  it("drafts are refused with an explanation", async () => {
    const { invoice, key } = await ownerWithInvoice("DRAFT");
    const response = await share(invoice.id, key);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Only sent or overdue invoices can be shared" });
  });

  it("another owner's key gets 404", async () => {
    const { invoice } = await ownerWithInvoice("SENT");
    const { key: otherKey } = await ownerWithInvoice("SENT");
    expect((await share(invoice.id, otherKey)).status).toBe(404);
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).shareToken).toBeNull();
  });
});
