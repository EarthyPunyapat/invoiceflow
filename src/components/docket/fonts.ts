import { Archivo, Courier_Prime } from "next/font/google";

/** Pre-printed form lettering: headings, labels and serial numbers. */
export const formFace = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-form",
  display: "swap",
});

/** Typed entries on the docket: names, line items and amounts. */
export const typeFace = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-typed",
  display: "swap",
});

/** Class names that expose both faces as CSS variables on a public page. */
export const docketFonts = `${formFace.variable} ${typeFace.variable}`;
