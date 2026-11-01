/** Server-side PDFKit renderer. Standard fonts keep downloads self-contained on Vercel. */
import { centsToDollars, dollarsToCents } from "@/lib/money";

interface PdfKitTextOptions {
  width?: number;
  align?: "left" | "center" | "right";
  lineBreak?: boolean;
}
interface PdfKitDocument {
  page: { width: number; height: number };
  on(event: "data", listener: (chunk: Buffer) => void): void;
  on(event: "end", listener: () => void): void;
  on(event: "error", listener: (err: Error) => void): void;
  fillColor(color: string): PdfKitDocument;
  strokeColor(color: string): PdfKitDocument;
  lineWidth(width: number): PdfKitDocument;
  moveTo(x: number, y: number): PdfKitDocument;
  lineTo(x: number, y: number): PdfKitDocument;
  stroke(): void;
  font(name: string): PdfKitDocument;
  fontSize(size: number): PdfKitDocument;
  widthOfString(text: string): number;
  text(text: string, x: number, y: number, options?: PdfKitTextOptions): void;
  addPage(): void;
  bufferedPageRange(): { start: number; count: number };
  switchToPage(page: number): void;
  end(): void;
}
interface PdfKitConstructor {
  new (options: {
    size: string;
    margin: number;
    bufferPages: boolean;
    info: { Title: string };
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
  issueDate?: Date | string;
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
  /** Percentage rate, matching Invoice.tax. Monetary tax comes from the saved totals. */
  tax: number;
  total: number;
  notes?: string | null;
}
const INK = "#1c2923";
const BODY = "#3d4b41";
const MUTED = "#59645d";
const RULE = "#dce1d9";
const ACCENT_HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function formatMoney(amount: number, currency: string): string {
  try {
    const options: Intl.NumberFormatOptions = {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    };
    const result = new Intl.NumberFormat("en-US", options).format(amount);
    // Standard PDF fonts have no glyphs for symbols such as the rupee. Print the code instead.
    return /[^\u0020-\u00ff\u20ac]/.test(result)
      ? new Intl.NumberFormat("en-US", {
          ...options,
          currencyDisplay: "code",
        }).format(amount)
      : result;
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
function formatDate(value?: Date | string): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const PDFDocument = require("pdfkit") as PdfKitConstructor;
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: { Title: data.invoiceNumber },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = 48;
    const right = doc.page.width - left;
    const width = right - left;
    const bottom = doc.page.height - 100; // Reserved footer area on every page.
    const accent =
      data.business.accentColor && ACCENT_HEX_RE.test(data.business.accentColor)
        ? data.business.accentColor
        : INK;
    const lineHeight = (size: number) => size * 1.4;
    const setFont = (size: number, bold = false, color = INK) =>
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(size)
        .fillColor(color);

    // Wrap using the actual font metrics. Explicit lines let us paginate a row or notes
    // before PDFKit can move only one column to a new page and overwrite other content.
    function wrap(
      text: string,
      columnWidth: number,
      size = 11,
      bold = false,
    ): string[] {
      setFont(size, bold);
      return text
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .flatMap((paragraph) => {
          const lines: string[] = [];
          let remaining = paragraph;
          while (doc.widthOfString(remaining) > columnWidth) {
            let low = 1;
            let high = remaining.length;
            while (low < high) {
              const mid = Math.ceil((low + high) / 2);
              if (doc.widthOfString(remaining.slice(0, mid)) <= columnWidth)
                low = mid;
              else high = mid - 1;
            }
            const space = remaining.lastIndexOf(" ", low);
            const end = space > 0 ? space : low;
            lines.push(remaining.slice(0, end).trimEnd());
            remaining = remaining.slice(end).trimStart();
          }
          lines.push(remaining);
          return lines;
        });
    }
    function lines(
      text: string[],
      x: number,
      y: number,
      columnWidth: number,
      size = 11,
      bold = false,
      color = INK,
      align: "left" | "right" = "left",
    ) {
      setFont(size, bold, color);
      for (const [index, line] of text.entries()) {
        doc.text(line, x, y + index * lineHeight(size), {
          width: columnWidth,
          align,
          lineBreak: false,
        });
      }
      return text.length * lineHeight(size);
    }
    function text(
      value: string,
      x: number,
      y: number,
      columnWidth: number,
      size = 11,
      bold = false,
      color = INK,
      align: "left" | "right" = "left",
    ) {
      return lines(
        wrap(value, columnWidth, size, bold),
        x,
        y,
        columnWidth,
        size,
        bold,
        color,
        align,
      );
    }
    function rule(y: number, from = left, color = RULE) {
      doc
        .strokeColor(color)
        .lineWidth(0.6)
        .moveTo(from, y)
        .lineTo(right, y)
        .stroke();
    }

    // The invoice title and number have independent, bounded columns. All following
    // sections start after their measured height, even when the number wraps.
    text("INVOICE", left, 48, width / 2, 28, true);
    const numberWidth = width / 2 - 16;
    const numberX = right - numberWidth;
    text("Invoice no.", numberX, 49, numberWidth, 9, false, MUTED, "right");
    const numberHeight = text(
      data.invoiceNumber,
      numberX,
      66,
      numberWidth,
      14,
      true,
      INK,
      "right",
    );
    let y = Math.max(86, 66 + numberHeight) + 18;
    rule(y, left, accent);
    y += 26;

    const partyWidth = (width - 40) / 2;
    const billX = right - partyWidth;
    text("From", left, y, partyWidth, 9, true, MUTED);
    text("Bill to", billX, y, partyWidth, 9, true, MUTED);
    y += 20;
    let fromEnd =
      y +
      text(
        data.business.businessName || data.business.name || "InvoiceFlow",
        left,
        y,
        partyWidth,
        12,
        true,
      );
    if (data.business.address?.trim())
      fromEnd +=
        5 +
        text(
          data.business.address.trim(),
          left,
          fromEnd + 5,
          partyWidth,
          11,
          false,
          BODY,
        );
    let billEnd = y + text(data.client.name, billX, y, partyWidth, 12, true);
    if (data.client.company?.trim() && data.client.company !== data.client.name)
      billEnd +=
        5 +
        text(
          data.client.company,
          billX,
          billEnd + 5,
          partyWidth,
          11,
          false,
          BODY,
        );
    billEnd +=
      5 +
      text(data.client.email, billX, billEnd + 5, partyWidth, 11, false, BODY);
    y = Math.max(fromEnd, billEnd) + 24;
    rule(y);
    y += 16;

    const metadata = [
      { label: "Issue date", value: formatDate(data.issueDate) },
      { label: "Due date", value: formatDate(data.dueDate) },
      { label: "Currency", value: data.currency },
      {
        label: "Status",
        value: data.status.charAt(0) + data.status.slice(1).toLowerCase(),
      },
    ];
    let metaHeight = 0;
    metadata.forEach((field, index) => {
      const x = left + (index * width) / metadata.length;
      const w = width / metadata.length - 12;
      text(field.label, x, y, w, 9, true, MUTED);
      metaHeight = Math.max(metaHeight, text(field.value, x, y + 18, w, 11));
    });
    y += 18 + metaHeight + 18;
    rule(y);
    y += 20;

    const columns = [
      {
        label: "Description",
        x: left,
        width: width - 276,
        align: "left" as const,
      },
      { label: "Qty", x: right - 264, width: 42, align: "right" as const },
      {
        label: "Unit price",
        x: right - 210,
        width: 94,
        align: "right" as const,
      },
      { label: "Amount", x: right - 104, width: 104, align: "right" as const },
    ];
    function tableHeader() {
      columns.forEach((col) =>
        text(col.label, col.x, y, col.width, 9, true, MUTED, col.align),
      );
      y += 22;
      rule(y);
      y += 12;
    }
    function nextPage(withTable = false) {
      doc.addPage();
      y = 48;
      y +=
        text(
          `Invoice ${data.invoiceNumber} · Continued`,
          left,
          y,
          width,
          12,
          true,
        ) + 16;
      rule(y);
      y += 22;
      if (withTable) tableHeader();
    }
    tableHeader();
    for (const item of data.items) {
      const cells = [
        item.description,
        String(item.quantity),
        formatMoney(item.unitPrice, data.currency),
        formatMoney(item.total, data.currency),
      ].map((value, i) => wrap(value, columns[i].width));
      const count = Math.max(...cells.map((cell) => cell.length));
      const rowHeight = count * lineHeight(11) + 20;
      // Keep a normal row together. Unusually tall rows are split by complete lines.
      if (y + rowHeight > bottom && rowHeight <= bottom - 140) nextPage(true);
      let offset = 0;
      while (offset < count) {
        let fit = Math.floor((bottom - y - 20) / lineHeight(11));
        if (fit < 1) {
          nextPage(true);
          fit = Math.floor((bottom - y - 20) / lineHeight(11));
        }
        const take = Math.min(count - offset, fit);
        cells.forEach((cell, i) =>
          lines(
            cell.slice(offset, offset + take),
            columns[i].x,
            y,
            columns[i].width,
            11,
            false,
            INK,
            columns[i].align,
          ),
        );
        y += take * lineHeight(11) + 10;
        rule(y);
        y += 10;
        offset += take;
        if (offset < count) nextPage(true);
      }
    }

    // The stored total is authoritative. Subtract in integer cents so the PDF's
    // tax amount agrees exactly with the invoice and Checkout after rounding.
    const taxAmount = centsToDollars(
      dollarsToCents(data.total) - dollarsToCents(data.subtotal),
    );
    const totals = [
      {
        label: "Subtotal",
        value: formatMoney(data.subtotal, data.currency),
        size: 11,
        bold: false,
      },
      {
        label: `Tax (${data.tax}%)`,
        value: formatMoney(taxAmount, data.currency),
        size: 11,
        bold: false,
      },
      {
        label:
          data.status === "PAID"
            ? "Total paid"
            : ["DRAFT", "CANCELLED"].includes(data.status)
              ? "Total"
              : "Total due",
        value: formatMoney(data.total, data.currency),
        size: 14,
        bold: true,
      },
    ].map((row) => ({
      ...row,
      labelLines: wrap(row.label, 124, row.size, row.bold),
      valueLines: wrap(row.value, 116, row.size, row.bold),
    }));
    const totalsHeight =
      24 +
      totals.reduce(
        (sum, row) =>
          sum +
          Math.max(row.labelLines.length, row.valueLines.length) *
            lineHeight(row.size) +
          14,
        0,
      );
    if (y + totalsHeight > bottom) nextPage();
    y += 16;
    totals.forEach((row, index) => {
      if (index === 2) {
        rule(y, right - 252);
        y += 12;
      }
      lines(
        row.labelLines,
        right - 252,
        y,
        124,
        row.size,
        row.bold,
        row.bold ? INK : BODY,
      );
      lines(
        row.valueLines,
        right - 116,
        y,
        116,
        row.size,
        row.bold,
        INK,
        "right",
      );
      y +=
        Math.max(row.labelLines.length, row.valueLines.length) *
          lineHeight(row.size) +
        8;
    });

    if (data.notes?.trim()) {
      y += 24;
      if (y + 65 > bottom) nextPage();
      rule(y);
      y += 20;
      y +=
        text("Notes & payment instructions", left, y, width, 9, true, MUTED) +
        10;
      const noteLines = wrap(data.notes.trim(), width);
      let offset = 0;
      while (offset < noteLines.length) {
        const fit = Math.floor((bottom - y) / lineHeight(11));
        const take = Math.min(noteLines.length - offset, fit);
        y += lines(
          noteLines.slice(offset, offset + take),
          left,
          y,
          width,
          11,
          false,
          BODY,
        );
        offset += take;
        if (offset < noteLines.length) {
          nextPage();
          y +=
            text(
              "Notes & payment instructions (continued)",
              left,
              y,
              width,
              9,
              true,
              MUTED,
            ) + 12;
        }
      }
    }
    if (!data.notes?.trim()) {
      const closing =
        data.status === "PAID"
          ? "Payment received. Thank you for your business."
          : data.status === "CANCELLED"
            ? "Cancelled invoice — no payment is due."
            : data.status === "DRAFT"
              ? "Draft invoice — not a request for payment."
              : `Please pay by ${formatDate(data.dueDate)}. Thank you for your business.`;
      y += 28;
      if (y + 30 > bottom) nextPage();
      text(closing, left, y, width, 10, false, MUTED);
    }

    const pages = doc.bufferedPageRange();
    for (let page = pages.start; page < pages.start + pages.count; page++) {
      doc.switchToPage(page);
      text("InvoiceFlow", left, doc.page.height - 62, 200, 9, false, MUTED);
      text(
        `Page ${page + 1} of ${pages.count}`,
        right - 100,
        doc.page.height - 62,
        100,
        9,
        false,
        MUTED,
        "right",
      );
    }
    doc.end();
  });
}
