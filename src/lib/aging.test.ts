import { describe, it, expect } from "vitest";
import { bucketOutstanding, daysOverdue } from "./aging";

const NOW = new Date("2026-08-23T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("daysOverdue", () => {
  it("computes positive days past due", () => {
    expect(daysOverdue(daysAgo(45), NOW)).toBe(45);
  });

  it("returns negative for future due dates", () => {
    expect(daysOverdue(daysAhead(5), NOW)).toBe(-5);
  });
});

describe("bucketOutstanding", () => {
  it("puts future-due and <30d overdue into current", () => {
    const b = bucketOutstanding(
      [
        { total: 100, dueDate: daysAhead(10) },
        { total: 200, dueDate: daysAgo(29) },
      ],
      NOW
    );
    expect(b).toEqual({ current: 300, d30: 0, d60: 0, d90plus: 0 });
  });

  it("respects bucket boundaries 30/60/90", () => {
    const b = bucketOutstanding(
      [
        { total: 100, dueDate: daysAgo(30) },
        { total: 200, dueDate: daysAgo(59) },
        { total: 400, dueDate: daysAgo(60) },
        { total: 800, dueDate: daysAgo(89) },
        { total: 1600, dueDate: daysAgo(90) },
        { total: 3200, dueDate: daysAgo(120) },
      ],
      NOW
    );
    expect(b).toEqual({ current: 0, d30: 300, d60: 1200, d90plus: 4800 });
  });

  it("excludes PAID and CANCELLED invoices", () => {
    const b = bucketOutstanding(
      [
        { total: 100, dueDate: daysAgo(100), status: "PAID" },
        { total: 200, dueDate: daysAgo(5), status: "CANCELLED" },
        { total: 400, dueDate: daysAgo(5), status: "OVERDUE" },
      ],
      NOW
    );
    expect(b.current).toBe(400);
    expect(b.d90plus).toBe(0);
  });

  it("accepts ISO date strings", () => {
    const b = bucketOutstanding([{ total: 50, dueDate: "2026-08-20T00:00:00Z" }], NOW);
    expect(b.current).toBe(50);
  });

  it("returns zeros for empty input", () => {
    expect(bucketOutstanding([], NOW)).toEqual({
      current: 0,
      d30: 0,
      d60: 0,
      d90plus: 0,
    });
  });
});
