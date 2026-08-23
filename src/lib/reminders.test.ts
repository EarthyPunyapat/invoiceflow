import { describe, it, expect } from "vitest";
import { daysBetween, SCHEDULE, getNextReminderType } from "@/lib/reminders";

describe("daysBetween", () => {
  it("computes whole-day differences", () => {
    expect(daysBetween(new Date("2026-08-10"), new Date("2026-08-03"))).toBe(7);
  });

  it("returns negative when b is after a", () => {
    expect(daysBetween(new Date("2026-08-03"), new Date("2026-08-10"))).toBe(-7);
  });

  it("floors partial days", () => {
    const a = new Date("2026-08-10T12:00:00Z");
    const b = new Date("2026-08-09T18:00:00Z"); // 18h earlier
    expect(daysBetween(a, b)).toBe(0);
  });
});

describe("SCHEDULE", () => {
  it("escalates friendly → firm → final", () => {
    expect(SCHEDULE.map((s) => s.type)).toEqual(["friendly", "firm", "final"]);
    expect(SCHEDULE.map((s) => s.minDays)).toEqual([3, 7, 14]);
  });
});

describe("getNextReminderType", () => {
  it("returns null before any tier applies (day 1)", () => {
    expect(getNextReminderType(1, 0)).toBeNull();
  });

  it("sends friendly at day 3", () => {
    expect(getNextReminderType(3, 0)).toBe("friendly");
    expect(getNextReminderType(5, 0)).toBe("friendly");
  });

  it("does not resend friendly once already sent (count=1, day 5)", () => {
    expect(getNextReminderType(5, 1)).toBeNull();
  });

  it("escalates to firm at day 7", () => {
    expect(getNextReminderType(7, 0)).toBe("firm");
    expect(getNextReminderType(7, 1)).toBe("firm");
  });

  it("escalates to final at day 14 with two prior reminders", () => {
    expect(getNextReminderType(14, 2)).toBe("final");
  });

  it("stays quiet just below the final threshold (day 13, both tiers sent)", () => {
    expect(getNextReminderType(13, 2)).toBeNull();
  });

  it("repeats final for count >= 3 (cooldown handled by caller)", () => {
    expect(getNextReminderType(20, 3)).toBe("final");
    expect(getNextReminderType(30, 5)).toBe("final");
  });
});
