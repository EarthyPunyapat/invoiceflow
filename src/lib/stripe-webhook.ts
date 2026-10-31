/**
 * Pure decision logic extracted from the Stripe webhook route
 * (src/app/api/webhooks/stripe/route.ts).
 *
 * Rules for this module (enforced by review):
 * - NO Prisma calls, NO Stripe client calls, NO env reads.
 * - Every function mirrors the exact branching/defaults the inline
 *   code had before extraction — behavior must stay byte-identical.
 * - Side effects (console.*, emails, DB writes) remain in the route.
 */

import type Stripe from "stripe";
import { centsToDollars } from "@/lib/money";

/** Mirrors the Prisma `InvoiceStatus` enum values (schema.prisma L98-104). */
export type WebhookInvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

/**
 * Only invoices currently SENT or OVERDUE may transition to PAID.
 * Shared by every mark-paid updateMany where-clause in the route
 * (invoice.paid + payment_intent.succeeded branches).
 */
export const MARKABLE_AS_PAID_STATUSES = ["SENT", "OVERDUE"] as const;

// ─── invoice.finalized ──────────────────────────────────────────────

/**
 * Fallback user-id resolution when event.account lookup missed:
 * metadata.invoiceFlowUserId first, then metadata.userId (route L62).
 */
export function resolveUserIdFromInvoiceMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  return (
    (metadata?.invoiceFlowUserId as string | undefined) ||
    (metadata?.userId as string | undefined) ||
    null
  );
}

/**
 * Map a Stripe invoice's status onto our InvoiceStatus + paidAt
 * (route L137-148, preserved verbatim):
 *   paid           → PAID   (+ status_transitions.paid_at, else now)
 *   uncollectible
 *   void           → CANCELLED
 *   draft          → DRAFT
 *   anything else  → SENT, paidAt stays null
 */
export function mapStripeInvoiceToStatus(
  stripeInvoice: Pick<Stripe.Invoice, "status" | "status_transitions">
): { status: WebhookInvoiceStatus; paidAt: Date | null } {
  let status: WebhookInvoiceStatus = "SENT";
  let paidAt: Date | null = null;
  if (stripeInvoice.status === "paid") {
    status = "PAID";
    paidAt = stripeInvoice.status_transitions?.paid_at
      ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
      : new Date();
  } else if (
    stripeInvoice.status === "uncollectible" ||
    stripeInvoice.status === "void"
  ) {
    status = "CANCELLED";
  } else if (stripeInvoice.status === "draft") {
    status = "DRAFT";
  }
  return { status, paidAt };
}

/** Shape of one nested InvoiceItem row created alongside the invoice. */
export interface StripeLineItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Full data argument for prisma.invoice.create in the finalized branch. */
export interface InvoiceCreatePayload {
  userId: string;
  clientId: string;
  invoiceNumber: string;
  status: WebhookInvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  dueDate: Date;
  /** Stores the raw Stripe Invoice ID (route convention, L161). */
  notes: string;
  paidAt: Date | null;
  items: StripeLineItemPayload[];
}

/**
 * Build the complete invoice-create payload from a finalized Stripe
 * invoice (route L110-166 data shaping, preserved verbatim including
 * defaults and falsiness checks):
 * - money: Stripe amounts are integer cents → centsToDollars (= cents/100,
 *   identical to the previous bare division); nullish → 0.
 * - currency uppercased, defaulting to "USD".
 * - dueDate: epoch seconds → Date, else now.
 * - invoiceNumber: Stripe number, falling back to the Stripe invoice id.
 * - line items: qty defaults to 1; unitPrice uses price.unit_amount when
 *   truthy (note: 0 is falsy and intentionally divides total by qty,
 *   matching the original ternary), otherwise derives from line total.
 * - status/paidAt via mapStripeInvoiceToStatus.
 */
export function buildInvoiceCreatePayload(
  stripeInvoice: Stripe.Invoice,
  ctx: { userId: string; clientId: string }
): InvoiceCreatePayload {
  const subtotal = centsToDollars(stripeInvoice.subtotal || 0);
  const tax = centsToDollars(stripeInvoice.tax || 0);
  const total = centsToDollars(stripeInvoice.total || 0);
  const currency = (stripeInvoice.currency || "USD").toUpperCase();

  const dueDate = stripeInvoice.due_date
    ? new Date(stripeInvoice.due_date * 1000)
    : new Date();

  const invoiceNumber = stripeInvoice.number || stripeInvoice.id;

  const items: StripeLineItemPayload[] =
    stripeInvoice.lines?.data?.map((line) => {
      const qty = line.quantity || 1;
      const lineTotal = centsToDollars(line.amount || 0);
      const unitPrice = line.price?.unit_amount
        ? centsToDollars(line.price.unit_amount)
        : lineTotal / qty;

      return {
        description: line.description || "Line Item",
        quantity: qty,
        unitPrice: unitPrice,
        total: lineTotal,
      };
    }) || [];

  const { status, paidAt } = mapStripeInvoiceToStatus(stripeInvoice);

  return {
    userId: ctx.userId,
    clientId: ctx.clientId,
    invoiceNumber,
    status,
    subtotal,
    tax,
    total,
    currency,
    dueDate,
    notes: stripeInvoice.id,
    paidAt,
    items,
  };
}

// ─── payment_intent.succeeded ───────────────────────────────────────

/**
 * Extract the linked Stripe Invoice ID from a PaymentIntent's `invoice`
 * field, which arrives as a string id OR an expanded Invoice object
 * (route L247-252, preserved verbatim).
 */
export function extractStripeInvoiceId(
  invoice: Stripe.PaymentIntent["invoice"]
): string | null {
  if (typeof invoice === "string") {
    return invoice;
  }
  if (invoice && typeof invoice === "object") {
    return (invoice as { id?: string }).id || null;
  }
  return null;
}

// ─── mark-paid target resolution (invoice.paid + payment_intent) ────

/**
 * Which lookup strategy marks an invoice paid (route order preserved:
 * metadata wins first, Stripe invoice id in `notes` second, neither → null):
 * - { source: "metadata", invoiceFlowId }  → where: { id: invoiceFlowId }
 * - { source: "notes", stripeInvoiceId }   → where: { notes: stripeInvoiceId }
 *
 * Note: `notes` holds the raw Stripe invoice ID (set at creation),
 * there is no parsing involved.
 */
export function resolveInvoiceFlowTarget(
  invoiceFlowId: string | null | undefined,
  stripeInvoiceId: string | null | undefined
): { source: "metadata"; invoiceFlowId: string } | { source: "notes"; stripeInvoiceId: string } | null {
  if (invoiceFlowId) {
    return { source: "metadata", invoiceFlowId };
  }
  if (stripeInvoiceId) {
    return { source: "notes", stripeInvoiceId };
  }
  return null;
}
