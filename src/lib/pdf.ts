/**
 * Server-side invoice PDF builder (Node runtime only).
 *
 * Uses pdfkit exclusively with its BUILT-IN standard fonts (Helvetica /
 * Helvetica-Bold). The standard-14 fonts resolve from metrics shipped
 * inside the pdfkit package — no font file loading happens at render
 * time, which keeps this safe for serverless deployment.
 *
 * Typing note: pdfkit publishes no TypeScript types and adding
 * @types/pdfkit would change package.json, so the small API surface used
 * below is described locally and the module is pulled in via typed
 * require.
 */

interface PdfKitTextOptions {
  width?: number;
  align?: "left" | "center" | "right";
}

interface PdfKitDocument {
  on(event: "data", listener: (chunk: Buffer) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (err: Error) => void): void;
  fillColor(color: string): PdfKitDocument;
  strokeColor(color: string): PdfKitDocument;
  lineWidth(width: number): PdfKitDocument;
  moveTo(x: number, y: number): PdfKitDocument;
  lineTo(x: number, y: number): PdfKitDocument;
  stroke(): void;
  font(name: string, size?: number): PdfKitDocument;
  fontSize(size: number): PdfKitDocument;
  text(
    text: string,
    x?: number,
    y?: number,
    options?: PdfKitTextOptions
  ): void;
  heightOfString(text: string, options?: PdfKitTextOptions): number;
  end(): void;
}

interface PdfKitConstructor {
  new (options?: {
    size?: string;
    margin?: number;
    info?: { Title?: string };
  }): PdfKitDocument;
}

export interface InvoicePdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  dueDate: Date | string;
  currency: string;
  client: { name: string; email: string; company?: string | null };
  business: {
    name?: string | null;
    businessName?: string | null;
    address?: string | null;
    accentColor?: string | null;
  };
  items: InvoicePdfItem[];
  subtotal: number;
  tax: number;
  total: number;
}

// Only well-formed hex colors reach the pen — anything else falls back to
// the default ink rather than throwing mid-render.
const ACCENT_HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

const INK = "#111827";
const MUTED = "#6b7280";
const BODY = "#374151";

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    // Invalid currency code — degrade to a plain suffix instead of dying.
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const PDFDocument = require("pdfkit") as PdfKitConstructor;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: { Title: data.invoiceNumber },
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 50;
    const right = 545; // A4 width (595pt) − margin
    const currency = data.currency;
    const businessName =
      data.business.businessName || data.business.name || "InvoiceFlow";

    // ── Header ────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(18).fillColor(INK);
    doc.text(businessName, left, 60);

    let y = 88;
    if (data.business.address) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED);
      doc.text(data.business.address, left, y, { width: 260 });
      y += doc.heightOfString(data.business.address, { width: 260 }) + 6;
    }

    const accent = data.business.accentColor;
    if (accent && ACCENT_HEX_RE.test(accent)) {
      doc.strokeColor(accent).lineWidth(3);
      doc.moveTo(left, y).lineTo(right, y).stroke();
    } else {
      doc.strokeColor("#d1d5db").lineWidth(1);
      doc.moveTo(left, y).lineTo(right, y).stroke();
    }
    y += 24;

    // ── Invoice meta (top-right block) ───────────────────────────────
    const metaRight = 420;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK);
    doc.text(`INVOICE ${data.invoiceNumber}`, metaRight, 60, {
      width: right - metaRight,
      align: "right",
    });
    doc.font("Helvetica").fontSize(10).fillColor(BODY);
    doc.text(data.status, metaRight, 78, {
      width: right - metaRight,
      align: "right",
    });
    doc.text(`Due ${formatDate(data.dueDate)}`, metaRight, 92, {
      width: right - metaRight,
      align: "right",
    });

    // ── Bill-to ───────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
    doc.text("BILL TO", left, y);
    y += 13;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK);
    doc.text(data.client.name, left, y);
    y += 15;
    if (data.client.company) {
      doc.font("Helvetica").fontSize(10).fillColor(BODY);
      doc.text(data.client.company, left, y);
      y += 13;
    }
    doc.font("Helvetica").fontSize(10).fillColor(BODY);
    doc.text(data.client.email, left, y);
    y += 34;

    // ── Items table ───────────────────────────────────────────────────
    const colQtyRight = 340;
    const colUnitRight = 450;
    const colTotalRight = right;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
    doc.text("DESCRIPTION", left, y);
    doc.text("QTY", colQtyRight - 40, y, { width: 40, align: "right" });
    doc.text("UNIT PRICE", colUnitRight - 80, y, { width: 80, align: "right" });
    doc.text("TOTAL", colTotalRight - 90, y, { width: 90, align: "right" });
    y += 14;

    doc.strokeColor("#e5e7eb").lineWidth(1);
    doc.moveTo(left, y).lineTo(right, y).stroke();
    y += 8;

    doc.font("Helvetica").fontSize(10).fillColor(INK);
    for (const item of data.items) {
      const descHeight = doc.heightOfString(item.description, { width: 230 });
      doc.text(item.description, left, y, { width: 230 });
      doc.text(String(item.quantity), colQtyRight - 40, y, {
        width: 40,
        align: "right",
      });
      doc.text(formatMoney(item.unitPrice, currency), colUnitRight - 80, y, {
        width: 80,
        align: "right",
      });
      doc.text(formatMoney(item.total, currency), colTotalRight - 90, y, {
        width: 90,
        align: "right",
      });
      y += Math.max(descHeight, 14) + 8;
    }

    // ── Totals (right-aligned block) ──────────────────────────────────
    y += 6;
    doc.moveTo(right - 190, y).lineTo(right, y).stroke();
    y += 12;

    const totalsLabelX = right - 190;
    const totalsValueW = 110;
    doc.font("Helvetica").fontSize(10).fillColor(BODY);
    doc.text("Subtotal", totalsLabelX, y, { width: 70 });
    doc.text(formatMoney(data.subtotal, currency), right - totalsValueW, y, {
      width: totalsValueW,
      align: "right",
    });
    y += 16;
    doc.text(`Tax`, totalsLabelX, y, { width: 70 });
    doc.text(formatMoney(data.tax, currency), right - totalsValueW, y, {
      width: totalsValueW,
      align: "right",
    });
    y += 22;
    doc.font("Helvetica-Bold").fontSize(12).fillColor(INK);
    doc.text("Total Due", totalsLabelX, y, { width: 80 });
    doc.text(formatMoney(data.total, currency), right - totalsValueW, y, {
      width: totalsValueW,
      align: "right",
    });

    // ── Footer ────────────────────────────────────────────────────────
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(
      `Please pay by ${formatDate(data.dueDate)}. Thank you for your business!`,
      left,
      770,
      { width: right - left }
    );

    doc.end();
  });
}
