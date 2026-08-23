import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
} from "lucide-react";
import { InvoiceActions } from "./invoice-actions";

interface InvoiceDetailPageProps {
  params: { id: string };
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Invoice + issuer branding fetched together; the From block renders
  // the saved business profile so it matches emails & share pages.
  const [invoice, viewer] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        client: true,
        items: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        businessName: true,
        logoUrl: true,
        accentColor: true,
      },
    }),
  ]);

  if (!invoice) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Invoice not found
        </h2>
        <Link
          href="/invoices"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to invoices
        </Link>
      </div>
    );
  }

  const taxAmount = (invoice.subtotal * invoice.tax) / 100;
  const canSend = invoice.status === "DRAFT";
  const canMarkPaid = invoice.status === "SENT" || invoice.status === "OVERDUE";

  // Issuer branding with safe fallbacks; accent color only applied when
  // it's a well-formed hex value so arbitrary strings never reach inline styles.
  const issuerName =
    viewer?.businessName || viewer?.name || "InvoiceFlow";
  const accent =
    viewer?.accentColor && /^#[0-9a-fA-F]{6}$/.test(viewer.accentColor)
      ? viewer.accentColor
      : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/invoices"
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {invoice.invoiceNumber}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Created {formatDate(invoice.createdAt)}
              {invoice.sentAt && ` · Sent ${formatDate(invoice.sentAt)}`}
              {invoice.paidAt && ` · Paid ${formatDate(invoice.paidAt)}`}
            </p>
          </div>
        </div>

        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          canSend={canSend}
          canMarkPaid={canMarkPaid}
        />
      </div>

      {/* Invoice Details Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              From
            </h3>
            <div className="flex items-center gap-2.5">
              {viewer?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- issuer-uploaded external logo URL; next/image would need remotePatterns config
                <img
                  src={viewer.logoUrl}
                  alt={issuerName}
                  className="w-8 h-8 rounded-md object-cover border border-gray-200 dark:border-gray-700"
                />
              ) : null}
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {issuerName}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Bill To
            </h3>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {invoice.client.name}
            </p>
            {invoice.client.company && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {invoice.client.company}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {invoice.client.email}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Invoice Number
            </h3>
            <p className="text-sm text-gray-900 dark:text-white">
              {invoice.invoiceNumber}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Due Date
            </h3>
            <p className="text-sm text-gray-900 dark:text-white">
              {formatDate(invoice.dueDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                  Qty
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                  Price
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-white">
                    {item.description}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-white text-center">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-white text-right">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 dark:text-white text-right font-medium">
                    {formatCurrency(item.total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals — total row carries the brand accent when set */}
        <div
          className="border-t-2 border-gray-200 dark:border-gray-700 px-5 py-4 flex flex-col items-end space-y-1.5"
          style={accent ? { borderTopColor: accent } : undefined}
        >
          <div className="flex justify-between w-56 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">
              {formatCurrency(invoice.subtotal, invoice.currency)}
            </span>
          </div>
          {invoice.tax > 0 && (
            <div className="flex justify-between w-56 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Tax ({invoice.tax}%)
              </span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(taxAmount, invoice.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between w-56 text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span style={accent ? { color: accent } : undefined}>
              {formatCurrency(invoice.total, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Notes
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {invoice.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        variants[status] || variants.DRAFT
      }`}
    >
      {status}
    </span>
  );
}
