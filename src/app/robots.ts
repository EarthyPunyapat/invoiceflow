import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

function sitemapUrl(): string | undefined {
  try {
    return `${appUrl()}/sitemap.xml`;
  } catch {
    return undefined; // unconfigured preview builds must not fail; see sitemap.ts
  }
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/invoices", "/clients", "/estimates", "/reports", "/settings", "/i/"],
    },
    sitemap: sitemapUrl(),
  };
}
