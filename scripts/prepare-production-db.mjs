import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baseline = "202611010001_baseline";
const migrations = readdirSync(resolve(root, "prisma/migrations"), { withFileTypes: true })
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
let redact = value => String(value);

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("[database release] Skipped outside Vercel production; run db:deploy explicitly for other environments.");
    return;
  }
  const direct = process.env.DATABASE_URL_UNPOOLED;
  if (!direct) throw new Error("DATABASE_URL_UNPOOLED is required for the production database release. Add the direct database URL in Vercel production settings.");
  const parsed = new URL(direct);
  if (!["postgresql:", "postgres:"].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)) {
    throw new Error("DATABASE_URL_UNPOOLED must be a valid direct PostgreSQL database URL.");
  }
  if (parsed.hostname.includes("-pooler.")) throw new Error("DATABASE_URL_UNPOOLED points to a Neon pooler. Use the provider's direct connection URL for migrations.");
  const schema = parsed.searchParams.get("schema") || "public";
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for production. The runtime and migration URLs must identify the same database.");
  const runtime = new URL(process.env.DATABASE_URL);
  const hostname = url => url.hostname.toLowerCase().replace("-pooler.", ".").replace(/\.$/, "");
  if (!["postgresql:", "postgres:"].includes(runtime.protocol) || hostname(runtime) !== hostname(parsed) ||
      runtime.pathname !== parsed.pathname || (runtime.searchParams.get("schema") || "public") !== schema) {
    throw new Error("DATABASE_URL and DATABASE_URL_UNPOOLED identify different databases or schemas. Correct the Vercel production settings before deployment; no migration was attempted.");
  }
  redact = value => String(value).replaceAll(direct, "[database URL redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[database URL redacted]");
  const env = { ...process.env, DATABASE_URL: direct, DATABASE_URL_UNPOOLED: direct };
  // A dedicated session keeps our release lock while Prisma CLI uses its own
  // migration-engine lock. Do not use a transaction here: it would retain table
  // read locks and block the migration's ALTER TABLE statements.
  parsed.searchParams.set("connection_limit", "1");
  const db = new PrismaClient({ datasources: { db: { url: parsed.toString() } } });
  const cli = (...args) => {
    const result = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "prisma", ...args], {
      cwd: root, env, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
    });
    if (result.error) throw new Error(`Could not run Prisma CLI: ${result.error.message}`);
    if (result.stdout) process.stdout.write(redact(result.stdout));
    if (result.stderr) process.stderr.write(redact(result.stderr));
    return result.status;
  };
  const verify = (model, message) => {
    const code = cli("migrate", "diff", "--from-schema-datasource", "prisma/baseline.prisma", "--to-schema-datamodel", model, "--exit-code");
    if (code !== 0) throw new Error(code === 2 ? message : "Could not verify database schema. No baseline was marked; inspect the Prisma error above.");
  };
  try {
    await db.$executeRaw`SELECT set_config('lock_timeout', '30000', false)`;
    // Two-key advisory locks are a separate namespace from Prisma Migrate's
    // single-bigint advisory lock, so the external CLI cannot deadlock on ours.
    await db.$executeRaw`SELECT pg_advisory_lock(1964247056, hashtext(${schema}))`;
    const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'`;
    const names = tables.map(row => row.table_name);
    const history = names.includes("_prisma_migrations")
      ? await db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`
      : [];
    if (history.some(row => !migrations.includes(row.migration_name))) {
      throw new Error("Database has migration history not owned by this application. Stop and review the target database before deployment.");
    }
    if (history.some(row => !row.finished_at && !row.rolled_back_at)) {
      throw new Error("Database contains an unfinished or failed migration. Review and resolve it explicitly before deployment; no automatic repair was attempted.");
    }
    const applied = history.filter(row => row.finished_at && !row.rolled_back_at).map(row => row.migration_name);
    if (names.includes("Invoice")) {
      const result = await db.$queryRaw`SELECT EXISTS (SELECT 1 FROM "Invoice" GROUP BY "userId", "invoiceNumber" HAVING COUNT(*) > 1) AS duplicate`;
      if (result[0].duplicate) throw new Error("Duplicate invoice numbers exist for an owner. Resolve them through a reviewed business decision before deployment; no data was changed.");
    }
    const userTables = names.filter(name => name !== "_prisma_migrations");
    if (!applied.length && userTables.length) {
      verify("prisma/baseline.prisma", "Existing database does not exactly match the legacy baseline. No migration was marked or applied. Review schema drift before deployment.");
      console.log("[database release] Legacy schema verified; recording its existing baseline without modifying application data.");
      if (cli("migrate", "resolve", "--applied", baseline) !== 0) throw new Error("Could not record the verified baseline. Deployment stopped.");
    } else if (applied.length) {
      if (!applied.includes(baseline)) throw new Error("Database migration history is missing the required baseline. Review it before deployment.");
      if (applied.length === migrations.length) {
        verify("prisma/schema.prisma", "Database schema differs from its applied migration history. Review drift before deployment.");
      } else if (applied.length === 1 && applied[0] === baseline) {
        verify("prisma/baseline.prisma", "Database schema differs from its recorded baseline. Review drift before deployment.");
      } else {
        throw new Error("Database is at an unsupported intermediate migration state. Apply reviewed migrations explicitly before deployment.");
      }
    }
    console.log("[database release] Applying committed migrations.");
    if (cli("migrate", "deploy") !== 0) throw new Error("Production database migration failed. The application build was stopped; inspect the migration error above.");
    verify("prisma/schema.prisma", "Database does not match the application schema after migration. Deployment stopped.");
    console.log("[database release] Database matches the application schema.");
  } finally {
    // Closing the dedicated session releases its advisory lock even on failure.
    await db.$disconnect();
  }
}

main().catch(error => {
  console.error(`[database release] ${redact(error.message)}`);
  process.exitCode = 1;
});
