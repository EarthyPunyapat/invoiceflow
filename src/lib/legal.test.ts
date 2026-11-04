import { afterEach, describe, expect, it, vi } from "vitest";
import { supportEmail } from "./legal";

describe("supportEmail", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the trimmed configured support address", () => {
    vi.stubEnv("SUPPORT_EMAIL", "  help@invoiceflow.example ");
    expect(supportEmail()).toBe("help@invoiceflow.example");
  });

  it("treats unset, malformed and .env.example placeholder addresses as missing", () => {
    for (const value of ["", "not-an-email", "you@yourdomain.com"]) {
      vi.stubEnv("SUPPORT_EMAIL", value);
      expect(supportEmail(), value).toBeNull();
    }
  });
});
