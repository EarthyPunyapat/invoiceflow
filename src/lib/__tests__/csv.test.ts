import { describe, it, expect } from "vitest";
import {
  toCsv,
  invoicesToCsv,
  clientsToCsv,
} from "@/lib/csv";

describe("toCsv", () => {
  it("serializes plain rows with a trailing CRLF", () => {
    const csv = toCsv(["A", "B"], [["1", "2"], ["3", "4"]]);
    expect(csv).toBe("A,B\r\n1,2\r\n3,4\r\n");
  });

  it("quotes fields containing commas", () => {
    const csv = toCsv(["Name"], [["Smith, John"]]);
    expect(csv).toBe(`Name\r\n"Smith, John"\r\n`);
  });

  it("doubles embedded double-quotes inside quoted fields", () => {
    const csv = toCsv(["Quote"], [['He said "hello"']]);
    expect(csv).toBe(`Quote\r\n"He said ""hello"""\r\n`);
  });

  it("leaves harmless quotes unquoted per RFC 4180", () => {
    // A field with no special chars does not need quoting even if it
    // contains no comma/newline — only [",\r\n] triggers quoting.
    const csv = toCsv(["Note"], [["plain"]]);
    expect(csv).toBe("Note\r\nplain\r\n");
  });

  it("quotes fields containing newlines (LF)", () => {
    const csv = toCsv(["Bio"], [["line1\nline2"]]);
    expect(csv).toBe(`Bio\r\n"line1\nline2"\r\n`);
  });

  it("quotes fields containing CRLF", () => {
    const csv = toCsv(["Bio"], [["line1\r\nline2"]]);
    expect(csv).toBe(`Bio\r\n"line1\r\nline2"\r\n`);
  });

  it("renders null cells as empty fields", () => {
    const csv = toCsv(["A", "B"], [[null, "x"]]);
    expect(csv).toBe("A,B\r\n,x\r\n");
  });

  it("renders numbers without decoration", () => {
    const csv = toCsv(["Total"], [[1500.5]]);
    expect(csv).toBe("Total\r\n1500.5\r\n");
  });

  it("emits headers only when rows is empty", () => {
    const csv = toCsv(["H1", "H2"], []);
    expect(csv).toBe("H1,H2\r\n");
  });
});

describe("invoicesToCsv", () => {
  const base = {
    invoiceNumber: "INV-2026-001",
    status: "PAID",
    total: 1200,
    currency: "USD",
  };

  it("produces the canonical 7-column header row", () => {
    const csv = invoicesToCsv([]);
    expect(csv).toBe(
      "Invoice,Client,Status,Total,Currency,Due Date,Paid Date\r\n"
    );
  });

  it("maps invoice fields to 7 columns with ISO dates", () => {
    const due = new Date("2026-01-31T00:00:00.000Z");
    const paid = new Date("2026-01-15T12:30:00.000Z");
    const csv = invoicesToCsv([
      { ...base, dueDate: due, paidAt: paid, clientName: "Acme Ltd" },
    ]);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[0].split(",")).toHaveLength(7);
    expect(lines[1].split(",")).toHaveLength(7);
    expect(lines[1]).toContain("INV-2026-001");
    expect(lines[1]).toContain("Acme Ltd");
    expect(lines[1]).toContain(due.toISOString());
    expect(lines[1]).toContain(paid.toISOString());
  });

  it("emits empty fields for null dates and client names", () => {
    const csv = invoicesToCsv([
      { ...base, dueDate: null, paidAt: null, clientName: null },
    ]);
    const dataRow = csv.split("\r\n")[1];
    // INV-2026-001,,PAID,1200,USD,,
    expect(dataRow).toBe("INV-2026-001,,PAID,1200,USD,,");
  });
});

describe("clientsToCsv", () => {
  it("produces the canonical 5-column header row", () => {
    const csv = clientsToCsv([]);
    expect(csv).toBe("Name,Email,Company,Phone,Created At\r\n");
  });

  it("maps client fields to 5 columns", () => {
    const created = new Date("2026-02-01T09:00:00.000Z");
    const csv = clientsToCsv([
      {
        name: "Acme Ltd",
        email: "billing@acme.test",
        company: "Acme",
        phone: "+64 9 555 0100",
        createdAt: created,
      },
    ]);
    const lines = csv.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[0].split(",")).toHaveLength(5);
    expect(lines[1].split(",")).toHaveLength(5);
    expect(lines[1]).toContain(created.toISOString());
  });

  it("escapes commas in client names", () => {
    const csv = clientsToCsv([
      {
        name: "Smith, John",
        email: "j@smith.test",
        company: null,
        phone: null,
        createdAt: new Date("2026-02-01T09:00:00.000Z"),
      },
    ]);
    expect(csv).toContain(`"Smith, John"`);
  });
});
