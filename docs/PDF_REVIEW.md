# Invoice PDF correction

The supplied single-page invoice informed the printable structure: a clear title
and invoice number, separate From/Bill to columns, dates/currency, itemized
charges, totals and a payment-details area. The uploaded reference and its
personal/payment data are not included in the repository. The committed
[example PDF](examples/invoice-preview.pdf) and [render](examples/invoice-preview.png)
use synthetic data and are explicitly labeled as examples.

| Before | After | Why |
| --- | --- | --- |
| A long invoice number wrapped into the status and due date | Independent measured number/title columns; dates and status in a separate metadata row | Prevent overlapping financial identifiers |
| Sections advanced by fixed offsets after unbounded text | Font-metric wrapping and measured row heights | Accommodate longer names, addresses, amounts and descriptions |
| Tax percentage printed as a currency amount | Rate labeled as a percentage; tax amount computed from saved total/subtotal in integer cents | Match the persisted invoice and Checkout to the cent |
| Invoice date, currency label and saved notes were absent | Issue/due dates, explicit currency and Notes & payment instructions | Preserve the information needed to identify and pay an invoice |
| Long invoices could flow into the footer or split columns independently | Page-aware rows, repeated table headings, continued notes and page counts | Preserve every item and keep pages readable |
| Paid, cancelled and draft exports always requested payment | State-appropriate total labels and default closing text | Avoid requesting an already settled or cancelled payment |
| Tests checked only that bytes began with `%PDF` | Independent PDF parsing checks content, text positions, boundaries and pagination | Catch the visible failure the original tests missed |

## Data mapping

Issue date comes from the saved invoice creation date, matching the existing
application's date display. Tax is a percentage in the invoice model. The PDF's
monetary tax amount is the saved total minus saved subtotal, calculated in cents
so it agrees with rounded persisted amounts. No financial records are mutated.

Payment details and billing periods use the existing free-text invoice Notes
field. There is no new bank-account or billing-period database field, and the
reference's bank details are never inserted into an invoice. Sender branding and
address remain sourced from the owner's saved profile. Downloads retain the
existing owner-scoped access checks.

## Verification

- Reproduced the original overlapping number/status in a generated PDF.
- Rendered and visually inspected a short invoice, a three-item one-page invoice,
  and continued item/notes pages from a ten-page stress sample.
- Twelve PDF unit tests cover actual PDF bytes, long metadata, monetary tax,
  cent rounding, currency/payment notes, invoice states, one-page layout and
  multi-page preservation. Parsed text bounding positions are checked for
  overlaps and printable page boundaries.
- Two production-server Chromium checks exercise the Download PDF button,
  dates/tax/notes in the response, content headers and rejection of foreign-owner
  and unauthenticated requests. All 14 browser tests passed.
- Full unit suite: 165 passed. PostgreSQL integration suite: 53 passed. Lint,
  typecheck, frozen installation and production build passed.
- PDF.js is a development-only parser used to inspect generated output. Runtime
  rendering continues to use PDFKit's standard fonts without network font loads.

Generate review fixtures with `pnpm exec tsx scripts/preview-invoice-pdf.ts`.
The default output is `/tmp/invoiceflow-pdf-review`; a directory can be supplied
as the first argument. The script uses synthetic data and does not access a
user account, database or external payment/email provider.
