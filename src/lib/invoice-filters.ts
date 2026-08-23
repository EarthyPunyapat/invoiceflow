/**
 * Shared filtering/pagination primitives for invoice list endpoints
 * and pages. Pure functions — no DB imports — so list behavior is
 * identical between /api/invoices and server components.
 */

export const INVOICE_STATUSES = [
  "DRAFT",
  "SENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export type InvoiceStatusFilter = (typeof INVOICE_STATUSES)[number];

/** Parse a raw status value; case-sensitive enum check or null. */
export function parseStatus(
  status: string | null | undefined
): InvoiceStatusFilter | null {
  if (!status) return null;
  return (INVOICE_STATUSES as readonly string[]).includes(status)
    ? (status as InvoiceStatusFilter)
    : null;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

function parsePositiveInt(raw: string | null | undefined, fallback: number) {
  if (raw == null) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Parse pagination params with defaults, positivity guards and a size ceiling. */
export function parseListParams(
  page: string | null | undefined,
  pageSize: string | null | undefined
): ListParams {
  return {
    page: parsePositiveInt(page, DEFAULT_PAGE),
    pageSize: Math.min(
      parsePositiveInt(pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    ),
  };
}

export interface InvoiceFilterOptions {
  /** Raw status value — invalid/sentinel values are dropped silently. */
  status?: string | null;
  /** Primary search query. */
  q?: string | null;
  /** Legacy alias for q; ignored when both are present. */
  search?: string | null;
}

export interface InvoiceWhere {
  userId: string;
  status?: InvoiceStatusFilter;
  OR?: Array<{
    invoiceNumber?: { contains: string; mode: "insensitive" };
    client?: {
      name?: { contains: string; mode: "insensitive" };
      company?: { contains: string; mode: "insensitive" };
    };
  }>;
}

/**
 * Build a Prisma `where` clause scoped to the owning user, with an
 * allow-listed status filter and case-insensitive search across
 * invoice number + client name/company.
 */
export function buildInvoiceWhere(
  userId: string,
  opts: InvoiceFilterOptions = {}
): InvoiceWhere {
  const where: InvoiceWhere = { userId };

  // Only genuine enum values pass through — injection attempts and the
  // "ALL" sentinel never reach the query.
  const status = parseStatus(opts.status);
  if (status) where.status = status;

  const q = (opts.q ?? opts.search ?? "").trim();
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { client: { name: { contains: q, mode: "insensitive" } } },
      { client: { company: { contains: q, mode: "insensitive" } } },
    ];
  }

  return where;
}
