import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

/** Public pages only; the workspace and invoice links stay out of search. */
export default function sitemap(): MetadataRoute.Sitemap {
  let origin: string;
  try {
    origin = appUrl();
  } catch {
    // Prerendered at build time: an unconfigured preview must still build.
    // /api/health reports the missing app URL for production.
    return [];
  }
  return ["/", "/login", "/privacy", "/terms", "/api-docs", "/sdk"].map((path) => ({ url: `${origin}${path}` }));
}
