import type { Prisma } from "@prisma/client";
import { lockOwner } from "./billing";
import { ensureShareToken } from "./invoice-share";
import { appUrl } from "./app-url";
import { render } from "@react-email/components";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import InvoiceEmail from "@/emails/invoice-email";
import PaymentReminder, { type ReminderType } from "@/emails/payment-reminder";
import PaymentConfirmation from "@/emails/payment-confirmation";


const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "InvoiceFlow <invoices@invoiceflow.app>";

const FREELANCER_EMAIL = process.env.FREELANCER_NOTIFY_EMAIL;

// ─── Helpers ───────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

async function getInvoiceWithRelations(invoiceId: string, db: Prisma.TransactionClient = prisma) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      user: { select: { email: true, name: true, businessName: true } },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  return invoice;
}

// ─── Send Invoice Email ────────────────────────────────────────────

export async function sendInvoiceEmail(invoiceId: string, onlyIfUnsent = false) {
  const owner = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { userId: true } });
  return prisma.$transaction(async tx => {
  await lockOwner(tx, owner.userId);
  const invoice = await getInvoiceWithRelations(invoiceId, tx);
  if (onlyIfUnsent && (invoice.invoiceEmailedAt || !["DRAFT", "SENT", "OVERDUE"].includes(invoice.status))) return { emailId: undefined };
  if (!["DRAFT", "SENT", "OVERDUE"].includes(invoice.status)) {
    throw new Error("This invoice cannot be sent");
  }

  const invoiceUrl = `${appUrl()}/i/${await ensureShareToken(invoice.id, tx)}`;
  const businessName =
    invoice.user.businessName || invoice.user.name || "InvoiceFlow";

  const html = await render(
    InvoiceEmail({
      clientName: invoice.client.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(invoice.total, invoice.currency),
      dueDate: new Date(invoice.dueDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      invoiceUrl,
      businessName,
    }),
  );

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [invoice.client.email],
    subject: `Invoice ${invoice.invoiceNumber} from ${businessName}`,
    html,
  }, { idempotencyKey: `invoice-send:${invoice.id}` });

  if (error) {
    console.error("[sendInvoiceEmail] Resend error:", error);
    throw new Error("Failed to send invoice email");
  }

  // Mark invoice as SENT
  await tx.invoice.updateMany({
    where: { id: invoiceId, status: "DRAFT" },
    data: { status: "SENT", sentAt: new Date() },
  });

  await tx.invoice.update({ where: { id: invoiceId }, data: { invoiceEmailedAt: new Date() } });
  return { emailId: data?.id };
  }, { timeout: 30_000, maxWait: 10_000 });
}

// ─── Send Payment Reminder ─────────────────────────────────────────

export async function sendPaymentReminder(
  invoiceId: string,
  type: ReminderType,
  expectedCount?: number,
) {
  const owner = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { userId: true } });
  return prisma.$transaction(async tx => {
  await lockOwner(tx, owner.userId);
  const invoice = await getInvoiceWithRelations(invoiceId, tx);
  if (expectedCount !== undefined && invoice.reminderCount !== expectedCount) return { emailId: undefined, skipped: true };

  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    throw new Error(
      `Cannot send reminder for invoice with status: ${invoice.status}`,
    );
  }

  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const daysOverdue = Math.max(
    1,
    Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const invoiceUrl = `${appUrl()}/i/${await ensureShareToken(invoice.id, tx)}`;
  const businessName =
    invoice.user.businessName || invoice.user.name || "InvoiceFlow";

  const html = await render(
    PaymentReminder({
      clientName: invoice.client.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(invoice.total, invoice.currency),
      dueDate: dueDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      daysOverdue,
      invoiceUrl,
      businessName,
      type,
    }),
  );

  const subjectPrefix =
    type === "final"
      ? "FINAL NOTICE: "
      : type === "firm"
        ? "Reminder: "
        : "Friendly reminder: ";

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [invoice.client.email],
    subject: `${subjectPrefix}Invoice ${invoice.invoiceNumber} (${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} past due)`,
    html,
  }, { idempotencyKey: `invoice-reminder:${invoice.id}:${invoice.reminderCount}` });

  if (error) {
    console.error("[sendPaymentReminder] Resend error:", error);
    throw new Error("Failed to send payment reminder");
  }

  // Update reminder tracking fields
  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      lastReminderSentAt: new Date(),
      reminderCount: { increment: 1 },
    },
  });

  return { emailId: data?.id, skipped: false };
  }, { timeout: 30_000, maxWait: 10_000 });
}

// ─── Send Payment Confirmation (to freelancer) ─────────────────────

export async function sendPaymentConfirmation(invoiceId: string, db: Prisma.TransactionClient = prisma) {
  const invoice = await getInvoiceWithRelations(invoiceId, db);

  if (invoice.status !== "PAID") {
    throw new Error(
      `Invoice ${invoiceId} is not marked as PAID (current: ${invoice.status})`,
    );
  }

  const freelancerEmail = invoice.user.email || FREELANCER_EMAIL;

  if (!freelancerEmail) {
    throw new Error("No freelancer email configured");
  }

  const paidAt = invoice.paidAt
    ? new Date(invoice.paidAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

  const html = await render(
    PaymentConfirmation({
      clientName: invoice.client.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: formatCurrency(invoice.total, invoice.currency),
      paidAt,
    }),
  );

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [freelancerEmail],
    subject: `💰 Payment received! ${invoice.client.name} paid ${formatCurrency(invoice.total, invoice.currency)}`,
    html,
  }, { idempotencyKey: `invoice-paid:${invoice.id}` });

  if (error) {
    console.error("[sendPaymentConfirmation] Resend error:", error);
    throw new Error("Failed to send payment confirmation");
  }

  return { emailId: data?.id };
}
