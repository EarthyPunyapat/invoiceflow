import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    include: ["integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
    env: { NEXT_PUBLIC_APP_URL: "https://invoiceflow.example", RESEND_FROM_EMAIL: "billing@example.test", RESEND_API_KEY: "fixture-only", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture" },
  },
});
