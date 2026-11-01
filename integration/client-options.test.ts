import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth", () => ({ auth: async () => state.userId ? { user: { id: state.userId } } : null }));
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/clients/route";
const owners: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") throw new Error("Use the disposable local invoiceflow_test database");
  for (const name of ["Picker Owner", "Other Owner"]) {
    const user = await prisma.user.create({ data: { name, email: `picker-${crypto.randomUUID()}@example.test` } });
    owners.push(user.id);
    await prisma.client.create({ data: { userId: user.id, name, email: "client@example.test" } });
  }
});
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: owners } } }); await prisma.$disconnect(); });
it("returns only the signed-in owner's picker fields without invoice history", async () => {
  state.userId = owners[0];
  const response = await GET(new NextRequest("https://invoiceflow.example/api/clients?view=options"));
  expect(response.status).toBe(200);
  const { clients } = await response.json();
  expect(clients).toHaveLength(1);
  expect(clients[0]).toEqual({ id: expect.any(String), name: "Picker Owner", email: "client@example.test", company: null });
});
it("requires a session for the lightweight picker endpoint", async () => {
  state.userId = "";
  expect((await GET(new NextRequest("https://invoiceflow.example/api/clients?view=options"))).status).toBe(401);
});
