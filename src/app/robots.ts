import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/invoices", "/clients", "/estimates", "/reports", "/settings", "/i/"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
