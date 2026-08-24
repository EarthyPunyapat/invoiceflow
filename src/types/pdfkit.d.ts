// ─── Minimal ambient typings for `pdfkit` (@types/pdfkit not installed) ────
//
// Covers only the API surface used by src/lib/pdf.ts so the project can
// typecheck without adding a devDependency. If PDF rendering grows beyond
// these capabilities, prefer installing @types/pdfkit and deleting this file.

declare module "pdfkit" {
  import type { Readable } from "stream";

  namespace PDFKit {
    interface DocumentOptions {
      size?: string;
      layout?: "portrait" | "landscape";
      margins?: { top?: number; bottom?: number; left?: number; right?: number };
      autoFirstPage?: boolean;
      info?: {
        Title?: string;
        Author?: string;
        Subject?: string;
        Keywords?: string;
        Creator?: string;
      };
    }

    interface TextOptions {
      width?: number;
      height?: number;
      align?: "left" | "center" | "right" | "justify";
      lineBreak?: boolean;
      characterSpacing?: number;
      ellipsis?: boolean;
      continued?: boolean;
      indent?: number;
    }

    interface Page {
      width: number;
      height: number;
      margins: { top: number; bottom: number; left: number; right: number };
    }

    interface Document extends Readable {
      readonly page: Page;
      x: number;
      y: number;

      // Styling (chainable)
      font(name: string, size?: number): Document;
      fontSize(size: number): Document;
      fillColor(color: string, opacity?: number): Document;
      strokeColor(color: string, opacity?: number): Document;
      lineWidth(width: number): Document;
      opacity(opacity: number): Document;

      // Text
      text(
        text: string | string[],
        x?: number,
        y?: number,
        options?: TextOptions
      ): Document;
      moveDown(lines?: number): Document;

      // Vector paths
      moveTo(x: number, y: number): Document;
      lineTo(x: number, y: number): Document;
      closePath(): Document;
      stroke(color?: string): Document;
      rect(x: number, y: number, width: number, height: number): Document;
      roundedRect(
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ): Document;
      fill(color?: string): Document;

      // Measurement & state
      widthOfString(text: string, options?: TextOptions): number;
      heightOfString(text: string, options?: TextOptions): number;
      addPage(): Document;

      // Finalize output stream
      end(): void;
    }
  }

  class PDFDocument extends Readable implements PDFKit.Document {
    constructor(options?: PDFKit.DocumentOptions);
    // Re-declare members so class + namespace merge cleanly for consumers.
    font(name: string, size?: number): PDFDocument;
    fontSize(size: number): PDFDocument;
    fillColor(color: string, opacity?: number): PDFDocument;
    strokeColor(color: string, opacity?: number): PDFDocument;
    lineWidth(width: number): PDFDocument;
    opacity(opacity: number): PDFDocument;
    text(
      text: string | string[],
      x?: number,
      y?: number,
      options?: PDFKit.TextOptions
    ): PDFDocument;
    moveDown(lines?: number): PDFDocument;
    moveTo(x: number, y: number): PDFDocument;
    lineTo(x: number, y: number): PDFDocument;
    closePath(): PDFDocument;
    stroke(color?: string): PDFDocument;
    rect(x: number, y: number, width: number, height: number): PDFDocument;
    roundedRect(
      x: number,
      y: number,
      width: number,
      height: number,
      radius: number
    ): PDFDocument;
    fill(color?: string): PDFDocument;
    widthOfString(text: string, options?: PDFKit.TextOptions): number;
    heightOfString(text: string, options?: PDFKit.TextOptions): number;
    addPage(): PDFDocument;
    end(): void;
  }

  export = PDFDocument;
}
