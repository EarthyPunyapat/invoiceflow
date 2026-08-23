import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidShareToken } from "@/lib/token";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PayButton } from "./pay-button";

interface InvoicePublicPageProps {
  params: { token: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Public share links must never be indexed.
export async function generateMetadata({
  params,
}: InvoicePublicPageProps): Promise<Metadata> {
  const invoice = isValidShareToken(params.token)
    ? await prisma.invoice.findFirst({
        where: { shareToken: params.token },
        select: { invoiceNumber: true },
      })
    : null;

  return {
    title: invoice?.invoiceNumber ?? "Invoice",
    robots: { index: false, follow: false },
  };
}

/**
 * Public branded invoice view — reached via the unguessable /i/[token]
 * share link issued when an invoice is sent. No auth: the token is the
 * capability. Renders the issuer's branding (name/logo/accent color)
 * and shows the online-payment CTA only while the invoice is payable.
 */
export default async function InvoicePublicPage({
  params,
  searchParams,
}: InvoicePublicPageProps) {
  const { token } = params;
  if (!isValidShareToken(token)) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: { shareToken: token },
    include: {
      client: true,
      items: { orderBy: { createdAt: "asc" } },
      user: {
        select: {
          name: true,
          businessName: true,
          logoUrl: true,
          accentColor: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
        },
      },
    },
  });
  if (!invoice) notFound();

  // Branding with safe fallbacks; accent color only applied when it's a
  // well-formed hex value so arbitrary strings never reach inline styles.
  const businessName =
    invoice.user.businessName || invoice.user.name || "InvoiceFlow";
  const accent =
    invoice.user.accentColor && /^#[0-9a-fA-F]{3,8}$/.test(invoice.user.accentColor)
      ? invoice.user.accentColor
      : undefined;
  const currency = invoice.currency || "USD";
  const taxAmount = (invoice.subtotal * invoice.tax) / 100;
  const payable = invoice.status === "SENT" || invoice.status === "OVERDUE";
  const justPaid = searchParams.paid === "1";
  const addressParts = [
    invoice.user.addressLine1,
    invoice.user.addressLine2,
    [invoice.user.city, invoice.user.state, invoice.user.postalCode]
      .filter(Boolean)
      .join(" "),
    invoice.user.country,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Branded header card */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-5 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-4">
              {invoice.user.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- issuer-uploaded external logo URL; next/image would need remotePatterns config
                <img
                  src={invoice.user.logoUrl}
                  alt={businessName}
                  className="w-14 h-14 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {businessName}
                </h1>
                {addressParts.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                    {addressParts.join(", ")}
                  </p>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <p
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: accent }}
              >
                Invoice
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-5">
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
                Due Date
              </h3>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDate(invoice.dueDate)}
              </p>
              {invoice.sentAt && (
                <p className="mt-2 flex items-center gap-2">
                  <InvoiceStatusBadge status={invoice.status} />
                </p>
              )}
            </div>
          </div>

          {justPaid && !payable && invoice.status === "PAID" && (
            <div className="mt-5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
              Payment received — thank you!
            </div>
          )}
          {justPaid && payable && (
            <div className="mt-5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
              Payment submitted — it will be confirmed shortly. Thank you!
            </div>
          )}
        </div>

        {/* Line items */}
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
                      {formatCurrency(item.unitPrice, currency)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 dark:text-white text-right font-medium">
                      {formatCurrency(item.total, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals — total row carries the brand accent */}
          <div
            className="border-t-2 px-5 py-4 flex flex-col items-end space-y-1.5"
            style={{ borderTopColor: accent }}
          >
            <div className="flex justify-between w-56 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(invoice.subtotal, currency)}
              </span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between w-56 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Tax ({invoice.tax}%)
                </span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(taxAmount, currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between w-56 text-base font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span style={accent ? { color: accent } : undefined}>
                {formatCurrency(invoice.total, currency)}
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

        {/* Online payment CTA — only while the invoice is collectible */}
        {payable && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6">
            <PayButton token={token} />
          </div>
        )}

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          Powered by InvoiceFlow
        </p>
      </div>
    </main>
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
