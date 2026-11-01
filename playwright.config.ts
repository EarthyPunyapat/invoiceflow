import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

// The browser and production server use the same ephemeral, local test secret.
process.env.AUTH_SECRET ||= randomBytes(32).toString("hex");
const origin = "http://127.0.0.1:3100";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
  },
  webServer: {
    command: "pnpm run start --hostname 127.0.0.1 --port 3100",
    url: `${origin}/login`,
    reuseExistingServer: false,
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET,
      NEXTAUTH_URL: origin,
      AUTH_URL: origin,
      NEXT_PUBLIC_APP_URL: origin,
      AUTH_TRUST_HOST: "true",
    },
  },
});
