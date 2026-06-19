import { render } from "@react-email/components";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";
import InvoiceEmail from "@/emails/invoice-email";
import PaymentReminder, { type ReminderType } from "@/emails/payment-reminder";
import PaymentConfirmation from "@/emails/payment-confirmation";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://invoiceflow.app";

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

async function getInvoiceWithRelations(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: true,
      user: { select: { email: true, name: true } },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found`);
  }

  return invoice;
}

// ─── Send Invoice Email ────────────────────────────────────────────

export async function sendInvoiceEmail(invoiceId: string) {
  const invoice = await getInvoiceWithRelations(invoiceId);

  const invoiceUrl = `${BASE_URL}/invoices/${invoice.id}`;
  const businessName = invoice.user.name || "InvoiceFlow";

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
  });

  if (error) {
    console.error("[sendInvoiceEmail] Resend error:", error);
    throw new Error("Failed to send invoice email");
  }

  // Mark invoice as SENT
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  });

  return { emailId: data?.id };
}

// ─── Send Payment Reminder ─────────────────────────────────────────

export async function sendPaymentReminder(
  invoiceId: string,
  type: ReminderType,
) {
  const invoice = await getInvoiceWithRelations(invoiceId);

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

  const invoiceUrl = `${BASE_URL}/invoices/${invoice.id}`;
  const businessName = invoice.user.name || "InvoiceFlow";

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
  });

  if (error) {
    console.error("[sendPaymentReminder] Resend error:", error);
    throw new Error("Failed to send payment reminder");
  }

  // Update reminder tracking fields
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      lastReminderSentAt: new Date(),
      reminderCount: { increment: 1 },
    },
  });

  return { emailId: data?.id };
}

// ─── Send Payment Confirmation (to freelancer) ─────────────────────

export async function sendPaymentConfirmation(invoiceId: string) {
  const invoice = await getInvoiceWithRelations(invoiceId);

  if (invoice.status !== "PAID") {
    throw new Error(
      `Invoice ${invoiceId} is not marked as PAID (current: ${invoice.status})`,
    );
  }

  const freelancerEmail = FREELANCER_EMAIL || invoice.user.email;

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
  });

  if (error) {
    console.error("[sendPaymentConfirmation] Resend error:", error);
    throw new Error("Failed to send payment confirmation");
  }

  return { emailId: data?.id };
}
