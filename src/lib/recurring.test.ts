import { describe, it, expect } from "vitest";
import {
  addInterval,
  computeNextRunAt,
  isDue,
  FREQUENCIES,
} from "@/lib/recurring";

const utc = (iso: string) => new Date(iso);
const iso = (d: Date) => d.toISOString();

describe("addInterval", () => {
  it("WEEKLY adds exactly 7 days", () => {
    expect(iso(addInterval(utc("2026-01-05T09:00:00Z"), "WEEKLY"))).toBe(
      "2026-01-12T09:00:00.000Z"
    );
  });

  it("BIWEEKLY adds exactly 14 days", () => {
    expect(iso(addInterval(utc("2026-01-05T09:00:00Z"), "BIWEEKLY"))).toBe(
      "2026-01-19T09:00:00.000Z"
    );
  });

  it("MONTHLY keeps day-of-month", () => {
    expect(
      iso(addInterval(utc("2026-01-15T10:30:00Z"), "MONTHLY"))
    ).toBe("2026-02-15T10:30:00.000Z");
  });

  it("MONTHLY clamps Jan 31 → Feb 28 (non-leap)", () => {
    expect(
      iso(addInterval(utc("2026-01-31T12:00:00Z"), "MONTHLY"))
    ).toBe("2026-02-28T12:00:00.000Z");
  });

  it("MONTHLY clamps Jan 31 → Feb 29 in leap years", () => {
    expect(
      iso(addInterval(utc("2024-01-31T12:00:00Z"), "MONTHLY"))
    ).toBe("2024-02-29T12:00:00.000Z");
  });

  it("YEARLY clamps Feb 29 → Feb 28 next year", () => {
    expect(
      iso(addInterval(utc("2024-02-29T08:00:00Z"), "YEARLY"))
    ).toBe("2025-02-28T08:00:00.000Z");
  });

  it("YEARLY keeps month and day across year boundary", () => {
    expect(
      iso(addInterval(utc("2026-12-15T00:30:00Z"), "YEARLY"))
    ).toBe("2027-12-15T00:30:00.000Z");
  });
});

describe("computeNextRunAt", () => {
  it("matches addInterval for every frequency", () => {
    for (const freq of FREQUENCIES) {
      const from = utc("2026-03-01T06:00:00Z");
      expect(computeNextRunAt(freq, from).getTime()).toBe(
        addInterval(from, freq).getTime()
      );
    }
  });
});

describe("isDue", () => {
  const now = utc("2026-06-15T12:00:00Z");

  it("is due when nextRunAt is past and not paused", () => {
    expect(
      isDue({ nextRunAt: utc("2026-06-14T00:00:00Z") }, now)
    ).toBe(true);
  });

  it("is not due before nextRunAt", () => {
    expect(
      isDue({ nextRunAt: utc("2026-06-16T00:00:00Z") }, now)
    ).toBe(false);
  });

  it("paused templates never run", () => {
    expect(
      isDue({ paused: true, nextRunAt: utc("2020-01-01T00:00:00Z") }, now)
    ).toBe(false);
  });

  it("endDate in the past blocks generation", () => {
    expect(
      isDue(
        { nextRunAt: utc("2026-06-01T00:00:00Z"), endDate: utc("2026-06-10T00:00:00Z") },
        now
      )
    ).toBe(false);
  });

  it("endDate in the future still allows generation", () => {
    expect(
      isDue(
        { nextRunAt: utc("2026-06-14T00:00:00Z"), endDate: utc("2026-07-01T00:00:00Z") },
        now
      )
    ).toBe(true);
  });

  it("accepts ISO strings as well as Dates", () => {
    expect(isDue({ nextRunAt: "2026-06-14T00:00:00Z" }, now)).toBe(true);
  });
});
