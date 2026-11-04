import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { appUrl } from "@/lib/app-url";
import { emailConfigured, stripeConfigured } from "@/lib/integration-config";
import { supportEmail } from "@/lib/legal";

/**
 * Launch readiness as named booleans (spec D11). Never returns a secret or a
 * configured value — only whether each piece looks real rather than missing or
 * left at its .env.example placeholder.
 */

/** Must equal the newest directory in prisma/migrations (enforced by a unit test). */
export const LATEST_MIGRATION = "20261104000000_add_subscriptions";

export type HealthChecks = {
  database: boolean;
  migrations: boolean;
  appUrl: boolean;
  authSecret: boolean;
  googleSignIn: boolean;
  stripeLiveKey: boolean;
  stripeWebhook: boolean;
  stripeChargesEnabled: boolean;
  email: boolean;
  cron: boolean;
  supportEmail: boolean;
};

const PLACEHOLDER_SECRET = "generate-a-random-secret-here";
const env = (name: string) => process.env[name]?.trim() ?? "";

function appUrlIsHttps(): boolean {
  try {
    return appUrl().startsWith("https:");
  } catch {
    return false;
  }
}

export function configChecks(): Omit<HealthChecks, "database" | "migrations" | "stripeChargesEnabled"> {
  const sender = env("RESEND_FROM_EMAIL").toLowerCase();
  return {
    appUrl: appUrlIsHttps(),
    authSecret: env("AUTH_SECRET").length >= 32 && env("AUTH_SECRET") !== PLACEHOLDER_SECRET,
    googleSignIn: Boolean(env("AUTH_GOOGLE_ID") && env("AUTH_GOOGLE_SECRET")),
    stripeLiveKey: /^(sk|rk)_live_/.test(env("STRIPE_SECRET_KEY")),
    stripeWebhook: /^whsec_[A-Za-z0-9]{16,}$/.test(env("STRIPE_WEBHOOK_SECRET")),
    email: emailConfigured() && /^re_[A-Za-z0-9_]{16,}$/.test(env("RESEND_API_KEY")) &&
      sender.includes("@") && !sender.endsWith("@yourdomain.com"),
    cron: env("CRON_SECRET").length >= 16 && env("CRON_SECRET") !== PLACEHOLDER_SECRET,
    supportEmail: supportEmail() !== null,
  };
}

async function databaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function migrationsCurrent(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY migration_name DESC LIMIT 1`;
    return rows[0]?.migration_name === LATEST_MIGRATION;
  } catch {
    return false;
  }
}

async function stripeChargesEnabled(): Promise<boolean> {
  if (!stripeConfigured()) return false;
  try {
    return (await getStripe().accounts.retrieve()).charges_enabled === true;
  } catch {
    return false;
  }
}

export async function runHealthChecks(): Promise<{ ready: boolean; checks: HealthChecks }> {
  const [database, migrations, charges] = await Promise.all([databaseReachable(), migrationsCurrent(), stripeChargesEnabled()]);
  const checks: HealthChecks = { database, migrations, stripeChargesEnabled: charges, ...configChecks() };
  return { ready: Object.values(checks).every(Boolean), checks };
}
