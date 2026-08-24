/**
 * CSV serialization helpers — RFC 4180 compliant.
 *
 * Pure functions only: no prisma, no next imports. This keeps them trivially
 * unit-testable and lets any route (or future worker) reuse them without
 * pulling in server machinery.
 *
 * RFC 4180 rules implemented:
 * - Fields containing a comma, double-quote, CR, or LF MUST be enclosed in
 *   double quotes.
 * - A double-quote inside a quoted field is escaped by doubling it.
 * - Records are separated by CRLF ("\r\n").
 */

/** A single CSV cell value. null renders as an empty field. */
export type CsvCellValue = string | number | null;

/**
 * Escape one CSV field per RFC 4180. Fields with special characters get
 * wrapped in quotes; embedded quotes are doubled.
 */
function escapeField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Serialize a table as CSV text (with a trailing CRLF).
 *
 * @param headers Column names — always emitted as the first row.
 * @param rows    Data rows; every row must align with `headers`.
 */
export function toCsv(headers: string[], rows: CsvCellValue[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeField(cell === null ? "" : String(cell))).join(",")
  );
  return lines.join("\r\n") + "\r\n";
}

// ─── Invoice export ──────────────────────────────────────────────────

export interface InvoiceCsvRow {
  invoiceNumber: string;
  status: string;
  total: number;
  currency: string;
  dueDate: Date | null;
  paidAt: Date | null;
  clientName: string | null;
}

const INVOICE_HEADERS = [
  "Invoice",
  "Client",
  "Status",
  "Total",
  "Currency",
  "Due Date",
  "Paid Date",
];

function isoOrEmpty(date: Date | null): string {
  return date ? date.toISOString() : "";
}

/** Typed wrapper: invoices → CSV with the canonical column set. */
export function invoicesToCsv(invoices: InvoiceCsvRow[]): string {
  return toCsv(
    INVOICE_HEADERS,
    invoices.map((inv) => [
      inv.invoiceNumber,
      inv.clientName ?? "",
      inv.status,
      inv.total,
      inv.currency,
      isoOrEmpty(inv.dueDate),
      isoOrEmpty(inv.paidAt),
    ])
  );
}

// ─── Client export ───────────────────────────────────────────────────

export interface ClientCsvRow {
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  createdAt: Date;
}

const CLIENT_HEADERS = ["Name", "Email", "Company", "Phone", "Created At"];

/** Typed wrapper: clients → CSV with the canonical column set. */
export function clientsToCsv(clients: ClientCsvRow[]): string {
  return toCsv(
    CLIENT_HEADERS,
    clients.map((client) => [
      client.name,
      client.email,
      client.company ?? "",
      client.phone ?? "",
      client.createdAt.toISOString(),
    ])
  );
}
