import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configChecks, LATEST_MIGRATION } from "./health";

const root = resolve(__dirname, "../..");
const CONFIG_VARS = [
  "AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY", "RESEND_FROM_EMAIL", "CRON_SECRET", "SUPPORT_EMAIL", "NEXT_PUBLIC_APP_URL",
];

describe("health configuration checks", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("LATEST_MIGRATION is the newest committed migration", () => {
    const migrations = readdirSync(resolve(root, "prisma/migrations"), { withFileTypes: true })
      .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
    expect(LATEST_MIGRATION).toBe(migrations.at(-1));
  });

  it(".env.example placeholders never count as configured", () => {
    const example = readFileSync(resolve(root, ".env.example"), "utf8");
    for (const name of CONFIG_VARS) {
      const match = new RegExp(`^${name}="([^"]*)"`, "m").exec(example);
      expect(match, `${name} missing from .env.example`).not.toBeNull();
      vi.stubEnv(name, match![1]);
    }
    expect(configChecks()).toEqual({
      appUrl: false, authSecret: false, googleSignIn: false, stripeLiveKey: false,
      stripeWebhook: false, email: false, cron: false, supportEmail: false,
    });
  });

  it("live production values count as configured", () => {
    // Fake credentials are assembled at runtime so no literal in the source
    // resembles a real key (GitHub push protection scans for them).
    const fake = (prefix: string) => prefix + "x".repeat(24);
    const values: Record<string, string> = {
      AUTH_SECRET: "a".repeat(64),
      AUTH_GOOGLE_ID: "1234-abc.apps.googleusercontent.com",
      AUTH_GOOGLE_SECRET: fake("GOCSPX-"),
      STRIPE_SECRET_KEY: fake(["sk", "live", ""].join("_")),
      STRIPE_WEBHOOK_SECRET: fake("whsec_"),
      RESEND_API_KEY: fake("re_"),
      RESEND_FROM_EMAIL: "invoices@invoiceflow.example",
      CRON_SECRET: "c".repeat(32),
      SUPPORT_EMAIL: "help@invoiceflow.example",
      NEXT_PUBLIC_APP_URL: "https://invoiceflow.example",
    };
    for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
    expect(configChecks()).toEqual({
      appUrl: true, authSecret: true, googleSignIn: true, stripeLiveKey: true,
      stripeWebhook: true, email: true, cron: true, supportEmail: true,
    });
  });
});
