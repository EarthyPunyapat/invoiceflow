import { describe, it, expect } from "vitest";
import {
  buildInvoiceWhere,
  parseListParams,
  parseStatus,
} from "@/lib/invoice-filters";

describe("parseStatus", () => {
  it("accepts every valid enum value", () => {
    for (const s of ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]) {
      expect(parseStatus(s)).toBe(s);
    }
  });

  it("returns null for unknown, empty or absent values", () => {
    expect(parseStatus("bogus")).toBeNull();
    expect(parseStatus("")).toBeNull();
    expect(parseStatus(null)).toBeNull();
    expect(parseStatus(undefined)).toBeNull();
  });

  it("is case-sensitive (lowercase rejected)", () => {
    expect(parseStatus("paid")).toBeNull();
  });
});

describe("parseListParams", () => {
  it("defaults to page 1 / pageSize 10", () => {
    expect(parseListParams(null, null)).toEqual({ page: 1, pageSize: 10 });
    expect(parseListParams(undefined, undefined)).toEqual({
      page: 1,
      pageSize: 10,
    });
  });

  it("parses valid input", () => {
    expect(parseListParams("3", "25")).toEqual({ page: 3, pageSize: 25 });
  });

  it("clamps pageSize at the 50 ceiling", () => {
    expect(parseListParams("1", "999")).toEqual({ page: 1, pageSize: 50 });
  });

  it("falls back to defaults for zero/negative/garbage input", () => {
    expect(parseListParams("0", "-5")).toEqual({ page: 1, pageSize: 10 });
    expect(parseListParams("abc", "xyz")).toEqual({ page: 1, pageSize: 10 });
  });
});

describe("buildInvoiceWhere", () => {
  it("always scopes results to the owning user", () => {
    expect(buildInvoiceWhere("user_1")).toEqual({ userId: "user_1" });
  });

  it("applies valid status filters", () => {
    expect(buildInvoiceWhere("u", { status: "SENT" })).toMatchObject({
      status: "SENT",
    });
  });

  it("drops invalid and sentinel statuses instead of leaking them into the query", () => {
    const hacked = buildInvoiceWhere("u", { status: "'; DROP TABLE users;" });
    const all = buildInvoiceWhere("u", { status: "ALL" });
    expect(hacked).not.toHaveProperty("status");
    expect(all).not.toHaveProperty("status");
  });

  it("searches invoiceNumber + client name + client company, case-insensitively", () => {
    const where = buildInvoiceWhere("u", { q: "acme" });
    expect(where.OR).toEqual([
      { invoiceNumber: { contains: "acme", mode: "insensitive" } },
      { client: { name: { contains: "acme", mode: "insensitive" } } },
      { client: { company: { contains: "acme", mode: "insensitive" } } },
    ]);
  });

  it("supports the legacy `search` alias and trims whitespace", () => {
    const where = buildInvoiceWhere("u", { search: "  INV-2026  " });
    expect((where.OR as unknown[])[0]).toEqual({
      invoiceNumber: { contains: "INV-2026", mode: "insensitive" },
    });
  });

  it("prefers q over the legacy alias when both are present", () => {
    const where = buildInvoiceWhere("u", { q: "new", search: "old" });
    expect((where.OR as unknown[])[0]).toEqual({
      invoiceNumber: { contains: "new", mode: "insensitive" },
    });
  });

  it("omits OR entirely when the query is blank", () => {
    expect(buildInvoiceWhere("u", { q: "   " })).not.toHaveProperty("OR");
  });
});
