import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import robots from "./robots";

describe("sitemap and robots", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("list public pages under the configured origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://invoiceflow.example");
    expect(sitemap().map((entry) => entry.url)).toContain("https://invoiceflow.example/privacy");
    expect(robots().sitemap).toBe("https://invoiceflow.example/sitemap.xml");
  });

  it("never fail a production build that has no app URL configured", () => {
    // Vercel preview environments may not define NEXT_PUBLIC_APP_URL; both
    // routes are prerendered at build time, so throwing would fail the build.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    expect(sitemap()).toEqual([]);
    expect(robots().sitemap).toBeUndefined();
    expect(robots().rules).toMatchObject({ disallow: expect.arrayContaining(["/api/"]) });
  });
});
