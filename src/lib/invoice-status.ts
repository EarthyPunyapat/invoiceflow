import type { InvoiceStatus } from "@prisma/client";

const transitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["OVERDUE", "PAID", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};
export function canTransition(from: InvoiceStatus, to: InvoiceStatus) {
  return from === to || transitions[from].includes(to);
}
