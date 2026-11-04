import { stripeConfigured } from "@/lib/integration-config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidShareToken } from "@/lib/token";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PayButton } from "./pay-button";
import { docketFonts } from "@/components/docket/fonts";
import "../../docket.css";

interface InvoicePublicPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Public share links must never be indexed.
export async function generateMetadata({
  params: paramsPromise,
}: InvoicePublicPageProps): Promise<Metadata> {
  const params = await paramsPromise;
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
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: InvoicePublicPageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
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
          stripeAccount: { select: { id: true } },
        },
      },
    },
  });
  if (!invoice || invoice.status === "DRAFT" || invoice.status === "CANCELLED")
    notFound();

  // Branding with safe fallbacks; accent color only applied when it's a
  // well-formed hex value so arbitrary strings never reach inline styles.
  const businessName =
    invoice.user.businessName || invoice.user.name || "InvoiceFlow";
  const accent =
    invoice.user.accentColor &&
    /^#[0-9a-fA-F]{3,8}$/.test(invoice.user.accentColor)
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

  const statusWord = invoice.status.charAt(0) + invoice.status.slice(1).toLowerCase();
  const sheetStyle = accent ? ({ "--accent": accent } as React.CSSProperties) : undefined;

  return (
    <div className={`docket-site ${docketFonts}`}>
      <main className="invoice-public">
        <div className="inv-shadow">
        <article className="invoice-sheet" style={sheetStyle}>
          <header className="inv-head">
            <div className="inv-from">
              {invoice.user.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- issuer-uploaded external logo URL; next/image would need remotePatterns config
                <img src={invoice.user.logoUrl} alt={businessName} className="inv-logo" />
              )}
              <div>
                <h1>{businessName}</h1>
                {addressParts.length > 0 && <p className="inv-address">{addressParts.join(", ")}</p>}
              </div>
            </div>
            <div className="inv-number">
              <span className="ply-title">Invoice</span>
              <span className="ply-serial">{invoice.invoiceNumber}</span>
            </div>
          </header>

          <dl className="inv-meta">
            <div>
              <dt>Bill to</dt>
              <dd>
                <strong>{invoice.client.name}</strong>
                {invoice.client.company && <span>{invoice.client.company}</span>}
                <span className="break-all">{invoice.client.email}</span>
              </dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>
                <strong>{formatDate(invoice.dueDate)}</strong>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <strong>{statusWord}</strong>
              </dd>
            </div>
          </dl>

          {(invoice.status === "PAID" || invoice.status === "OVERDUE") && (
            <span className={`stamp inv-stamp is-${invoice.status.toLowerCase()}`} aria-hidden="true">
              {statusWord}
            </span>
          )}

          {justPaid && !payable && invoice.status === "PAID" && (
            <p role="status" className="inv-notice is-paid">
              Payment received — thank you!
            </p>
          )}
          {justPaid && payable && (
            <p role="status" className="inv-notice">
              Payment submitted — it will be confirmed shortly. Thank you!
            </p>
          )}

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th scope="col">Description</th>
                  <th scope="col" className="is-num is-detail">Qty</th>
                  <th scope="col" className="is-num is-detail">Price</th>
                  <th scope="col" className="is-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.description}
                      <span className="inv-item-calc">
                        {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                      </span>
                    </td>
                    <td className="is-num is-detail">{item.quantity}</td>
                    <td className="is-num is-detail">{formatCurrency(item.unitPrice, currency)}</td>
                    <td className="is-num">{formatCurrency(item.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ply-totals inv-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(invoice.subtotal, currency)}</dd>
            </div>
            {invoice.tax > 0 && (
              <div>
                <dt>Tax ({invoice.tax}%)</dt>
                <dd>{formatCurrency(taxAmount, currency)}</dd>
              </div>
            )}
            <div className="docket-total">
              <dt>{invoice.status === "PAID" ? "Total paid" : "Total"}</dt>
              <dd>{formatCurrency(invoice.total, currency)}</dd>
            </div>
          </dl>

          {invoice.notes && (
            <section className="inv-notes" aria-labelledby="inv-notes-heading">
              <h2 id="inv-notes-heading">Notes</h2>
              <p>{invoice.notes}</p>
            </section>
          )}

          {payable && (
            <div className="inv-pay">
              {stripeConfigured() && invoice.user.stripeAccount ? (
                <PayButton token={token} />
              ) : (
                <p role="status">
                  Online payment is not enabled for this invoice. Contact {businessName} for payment
                  instructions.
                </p>
              )}
            </div>
          )}
        </article>
        </div>
        <p className="inv-powered">Powered by InvoiceFlow</p>
      </main>
    </div>
  );
}
