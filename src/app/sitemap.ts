import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

/** Public pages only; the workspace and invoice links stay out of search. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = appUrl();
  return ["/", "/login", "/privacy", "/terms", "/api-docs", "/sdk"].map((path) => ({ url: `${origin}${path}` }));
}
