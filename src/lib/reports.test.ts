import { describe, it, expect } from "vitest";
import {
  revenueByMonth,
  topClients,
  avgDaysToPay,
} from "@/lib/reports";

describe("revenueByMonth", () => {
  const now = new Date("2026-08-15T12:00:00Z");

  it("returns 6 zero-filled buckets for empty input", () => {
    const out = revenueByMonth([], 6, now);
    expect(out).toHaveLength(6);
    expect(out.every((b) => b.revenue === 0)).toBe(true);
  });

  it("ends at the current month and runs chronologically", () => {
    const out = revenueByMonth([], 3, now);
    expect(out.map((b) => b.label)).toEqual([
      "Jun 2026",
      "Jul 2026",
      "Aug 2026",
    ]);
  });

  it("buckets PAID invoices by their date month", () => {
    const out = revenueByMonth(
      [
        { total: 100, status: "PAID", date: "2026-07-10T00:00:00Z" },
        { total: 250, status: "PAID", date: "2026-07-28T00:00:00Z" },
        { total: 40, status: "PAID", date: "2026-08-02T00:00:00Z" },
      ],
      3,
      now
    );
    expect(out.find((b) => b.label === "Jul 2026")?.revenue).toBe(350);
    expect(out.find((b) => b.label === "Aug 2026")?.revenue).toBe(40);
  });

  it("ignores non-PAID invoices and months outside the window", () => {
    const out = revenueByMonth(
      [
        { total: 999, status: "SENT", date: "2026-07-01T00:00:00Z" },
        { total: 999, status: "OVERDUE", date: "2026-08-01T00:00:00Z" },
        { total: 999, status: "PAID", date: "2025-01-01T00:00:00Z" },
      ],
      3,
      now
    );
    expect(out.every((b) => b.revenue === 0)).toBe(true);
  });

  it("honours a custom month count", () => {
    expect(revenueByMonth([], 12, now)).toHaveLength(12);
    expect(revenueByMonth([], 1, now)).toEqual([{ label: "Aug 2026", revenue: 0 }]);
    expect(revenueByMonth([], 0, now)).toEqual([]);
  });
});

describe("topClients", () => {
  const rows = [
    { clientName: "Acme", total: 500, status: "PAID" },
    { clientName: "Globex", total: 900, status: "PAID" },
    { clientName: "Acme", total: 300, status: "PAID" },
    { clientName: "Initech", total: 700, status: "SENT" }, // excluded
  ];

  it("aggregates PAID totals and counts per client, sorted desc", () => {
    const out = topClients(rows, 5);
    expect(out).toEqual([
      { clientName: "Globex", total: 900, count: 1 },
      { clientName: "Acme", total: 800, count: 2 },
    ]);
  });

  it("respects the limit", () => {
    const many = ["A", "B", "C"].map((c, i) => ({
      clientName: c,
      total: i,
      status: "PAID",
    }));
    expect(topClients(many, 2)).toHaveLength(2);
    expect(topClients(many, 2)[0].clientName).toBe("C");
  });

  it("breaks ties alphabetically for deterministic output", () => {
    const tied = [
      { clientName: "Zeta", total: 100, status: "PAID" },
      { clientName: "Alpha", total: 100, status: "PAID" },
    ];
    expect(topClients(tied, 5).map((c) => c.clientName)).toEqual([
      "Alpha",
      "Zeta",
    ]);
  });

  it("returns an empty array for empty or unpaid input", () => {
    expect(topClients([], 5)).toEqual([]);
    expect(topClients([{ clientName: "X", total: 1, status: "DRAFT" }], 5)).toEqual([]);
  });
});

describe("avgDaysToPay", () => {
  const d = (iso: string) => new Date(iso);

  it("returns null when there is no usable data", () => {
    expect(avgDaysToPay([])).toBeNull();
    expect(avgDaysToPay([{ sentAt: null, paidAt: d("2026-01-10T00:00:00Z") }])).toBeNull();
    expect(avgDaysToPay([{ sentAt: d("2026-01-05T00:00:00Z"), paidAt: null }])).toBeNull();
  });

  it("averages whole days between sent and paid", () => {
    const rows = [
      { sentAt: d("2026-01-01T00:00:00Z"), paidAt: d("2026-01-06T00:00:00Z") }, // 5 days
      { sentAt: d("2026-02-01T00:00:00Z"), paidAt: d("2026-02-11T00:00:00Z") }, // 10 days
    ];
    expect(avgDaysToPay(rows)).toBe(8); // (5 + 10) / 2 = 7.5 → rounds to 8
  });

  it("skips inverted spans (paid before sent) instead of skewing the mean", () => {
    const rows = [
      { sentAt: d("2026-03-10T00:00:00Z"), paidAt: d("2026-03-01T00:00:00Z") }, // invalid
      { sentAt: d("2026-03-01T00:00:00Z"), paidAt: d("2026-03-11T00:00:00Z") }, // 10 days
    ];
    expect(avgDaysToPay(rows)).toBe(10);
  });

  it("accepts ISO strings as well as Dates", () => {
    expect(
      avgDaysToPay([{ sentAt: "2026-01-01T00:00:00Z", paidAt: "2026-01-04T00:00:00Z" }])
    ).toBe(3);
  });
});
