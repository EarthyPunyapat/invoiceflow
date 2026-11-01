import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PdfText {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Inspect the actual PDF operators with an independent parser, not renderer mocks. */
export async function readPdf(buffer: Buffer) {
  const task = getDocument({
    data: Uint8Array.from(buffer),
    useSystemFonts: true,
    verbosity: 0,
  });
  const document = await task.promise;
  try {
    const pages = [];
    for (let n = 1; n <= document.numPages; n++) {
      const page = await document.getPage(n);
      const content = await page.getTextContent();
      const text: PdfText[] = content.items.flatMap((item) =>
        "str" in item && item.str.trim()
          ? [
              {
                text: item.str,
                x: item.transform[4],
                y: page.view[3] - item.transform[5],
                width: item.width,
                height: item.height,
              },
            ]
          : [],
      );
      pages.push({ width: page.view[2], height: page.view[3], text });
    }
    return {
      pages,
      text: pages
        .flatMap((page) => page.text.map((item) => item.text))
        .join("\n"),
    };
  } finally {
    await task.destroy();
  }
}
