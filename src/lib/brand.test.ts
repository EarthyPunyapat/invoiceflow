/**
 * Unit tests for src/lib/brand.ts
 * brand.ts exports pure constant objects only (BRAND, METADATA) —
 * tests assert structural integrity and cross-references.
 */
import { describe, it, expect } from "vitest";
import { BRAND, METADATA } from "@/lib/brand";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("BRAND", () => {
  it("has core identity strings", () => {
    expect(BRAND.name).toBe("InvoiceFlow");
    expect(typeof BRAND.tagline).toBe("string");
    expect(BRAND.tagline.length).toBeGreaterThan(0);
    expect(BRAND.url).toMatch(/^https:\/\//);
  });

  it("defines every color as a valid 6-digit hex code", () => {
    for (const [key, value] of Object.entries(BRAND.colors)) {
      expect(value, `color "${key}"`).toMatch(HEX);
    }
  });

  it("keeps primary/accent/success/warning/danger palette slots present", () => {
    for (const key of [
      "primary",
      "accent",
      "success",
      "warning",
      "danger",
    ] as const) {
      expect(BRAND.colors[key]).toBeDefined();
    }
  });
});

describe("METADATA", () => {
  it("derives title default and template from BRAND.name", () => {
    expect(METADATA.title.default).toBe(BRAND.name);
    expect(METADATA.title.template.endsWith(`| ${BRAND.name}`)).toBe(true);
  });

  it("mirrors BRAND description and url into SEO fields", () => {
    expect(METADATA.description).toBe(BRAND.description);
    expect(METADATA.openGraph.siteName).toBe(BRAND.name);
    expect(METADATA.openGraph.url).toBe(BRAND.url);
  });

  it("exposes a non-empty keyword list", () => {
    expect(Array.isArray(METADATA.keywords)).toBe(true);
    expect(METADATA.keywords.length).toBeGreaterThan(0);
  });
});
