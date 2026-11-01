import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";

const fixture = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: fixture.userId } }) }));
import { prisma } from "@/lib/prisma";
import { GET as dashboardStats } from "@/app/api/dashboard/stats/route";
import ReportsPage from "@/app/(dashboard)/reports/page";

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") {
    throw new Error("Integration tests require the disposable local invoiceflow_test database");
  }
  const user = await prisma.user.create({ data: { email: `currency-report-${crypto.randomUUID()}@example.test` } });
  fixture.userId = user.id;
  const client = await prisma.client.create({ data: { userId: user.id, name: "Multi-currency client", email: "currency-client@example.test" } });
  for (const [currency, total] of [["USD", 100], ["EUR", 250]] as const) {
    await prisma.invoice.create({ data: { userId: user.id, clientId: client.id, invoiceNumber: `CURRENCY-${currency}`, status: "PAID", currency, subtotal: total, total, dueDate: new Date(), paidAt: new Date() } });
  }
});
afterAll(async () => {
  if (fixture.userId) await prisma.user.delete({ where: { id: fixture.userId } });
  await prisma.$disconnect();
});

describe("dashboard revenue by currency", () => {
  it("keeps USD and EUR revenue separate while retaining global counts", async () => {
    for (const [currency, expected] of [["USD", 100], ["EUR", 250]] as const) {
      const response = await dashboardStats(new NextRequest(`https://invoiceflow.example/api/dashboard/stats?currency=${currency}`));
      expect(response.status).toBe(200);
      const { data } = await response.json();
      expect(data.revenue.currency).toBe(currency);
      expect(data.revenue.total).toBe(expected);
      expect(data.revenue.thisMonth).toBe(expected);
      expect(data.counts.totalInvoices).toBe(2);
      expect(data.counts.totalClients).toBe(1);
      expect(data.recentInvoices.map((invoice: { currency: string }) => invoice.currency).sort()).toEqual(["EUR", "USD"]);
      expect(data.recentInvoices.every((invoice: { total: number }) => typeof invoice.total === "number")).toBe(true);
    }
  });
  it("renders report totals and charts in only the selected currency", async () => {
    const page = await ReportsPage({ searchParams: Promise.resolve({ currency: "EUR" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain("€250.00");
    expect(html).not.toContain("$100.00");
    expect(html).not.toContain("€350.00");
    expect(html).toContain('value="EUR" selected=""');
  });
  it("defaults revenue to USD and normalizes a valid requested code", async () => {
    let response = await dashboardStats(new NextRequest("https://invoiceflow.example/api/dashboard/stats"));
    expect((await response.json()).data.revenue).toMatchObject({ currency: "USD", total: 100 });
    response = await dashboardStats(new NextRequest("https://invoiceflow.example/api/dashboard/stats?currency=eur"));
    expect((await response.json()).data.revenue).toMatchObject({ currency: "EUR", total: 250 });
  });
  it("rejects an invalid currency instead of producing a mixed total", async () => {
    const response = await dashboardStats(new NextRequest("https://invoiceflow.example/api/dashboard/stats?currency=ZZZ"));
    expect(response.status).toBe(400);
  });
});
