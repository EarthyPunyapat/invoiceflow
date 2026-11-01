import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const exec = promisify(execFile);
const root = resolve(__dirname, "..");
const schemas: string[] = [];
const clients: PrismaClient[] = [];
let admin: PrismaClient;
let base: URL;

beforeAll(() => {
  base = new URL(process.env.DATABASE_URL || "http://missing");
  if (!["localhost", "127.0.0.1"].includes(base.hostname) || base.pathname !== "/invoiceflow_test") {
    throw new Error("Migration rollout tests require the disposable local invoiceflow_test database");
  }
  admin = new PrismaClient();
});
afterAll(async () => {
  await Promise.all(clients.map(client => client.$disconnect()));
  for (const schema of schemas) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  await admin.$disconnect();
});
async function fixture() {
  const schema = `rollout_${crypto.randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(base); url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  clients.push(db);
  return { db, url: url.toString(), schema };
}
async function command(file: string, args: string[], url: string, production = true, overrides: Partial<NodeJS.ProcessEnv> = {}) {
  const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url, VERCEL_ENV: production ? "production" : "preview", ...overrides };
  try {
    const result = await exec(file, args, { cwd: root, env, maxBuffer: 4 * 1024 * 1024 });
    return { ...result, code: 0, output: result.stdout + result.stderr };
  } catch (error) {
    const failed = error as { code: number; stdout: string; stderr: string };
    return { ...failed, output: failed.stdout + failed.stderr };
  }
}
const gate = (url: string, production = true) => command(process.execPath, ["scripts/prepare-production-db.mjs"], url, production);
async function legacy(url: string) {
  const result = await command("pnpm", ["exec", "prisma", "db", "execute", "--file", "prisma/migrations/202611010001_baseline/migration.sql", "--schema", "prisma/baseline.prisma"], url);
  expect(result.code, result.output).toBe(0);
}
async function oldInvoice(db: PrismaClient, number = "INV-OLD-0001", id = "old-invoice") {
  await db.$executeRaw`INSERT INTO "User" ("id", "email", "updatedAt") VALUES ('legacy-owner', 'legacy@example.test', NOW()) ON CONFLICT DO NOTHING`;
  await db.$executeRaw`INSERT INTO "Client" ("id", "userId", "name", "email", "updatedAt") VALUES ('legacy-client', 'legacy-owner', 'Existing client', 'client@example.test', NOW()) ON CONFLICT DO NOTHING`;
  await db.$executeRaw`INSERT INTO "Invoice" ("id", "userId", "clientId", "invoiceNumber", "subtotal", "total", "dueDate", "updatedAt") VALUES (${id}, 'legacy-owner', 'legacy-client', ${number}, 10, 10, NOW(), NOW())`;
}
async function historyCount(db: PrismaClient) {
  const tables = await db.$queryRaw<{ found: boolean }[]>`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = '_prisma_migrations') AS found`;
  if (!tables[0].found) return 0;
  return (await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "_prisma_migrations"`)[0].count;
}

describe("Vercel production schema rollout", () => {
  it("skips mutation outside the production environment", async () => {
    const { db, url } = await fixture();
    const result = await gate(url, false);
    expect(result.code, result.output).toBe(0);
    expect(result.output).toContain("Skipped outside Vercel production");
    expect(await historyCount(db)).toBe(0);
  });
  it("refuses to migrate a database different from the runtime target", async () => {
    const { db, url } = await fixture();
    const other = new URL(url); other.pathname = "/another_database";
    const result = await command(process.execPath, ["scripts/prepare-production-db.mjs"], url, true, { DATABASE_URL: other.toString() });
    expect(result.code).not.toBe(0); expect(result.output).toContain("identify different databases or schemas");
    expect(await historyCount(db)).toBe(0);
  });
  it("migrates an empty database schema before application deployment", async () => {
    const { db, url } = await fixture();
    const result = await gate(url);
    expect(result.code, result.output).toBe(0);
    expect(await historyCount(db)).toBe(BigInt(2));
    expect(await db.invoice.count()).toBe(0);
  }, 60_000);
  it("verifies and baselines the old schema, preserves data, and safely reruns", async () => {
    const { db, url } = await fixture(); await legacy(url); await oldInvoice(db);
    // This is the exact dashboard query failure reported after sign-in:
    // the newly generated client selects fields absent from the old schema.
    await expect(db.invoice.findMany()).rejects.toMatchObject({
      code: "P2022", meta: { column: "Invoice.checkoutSessionId" },
    });
    const first = await gate(url);
    expect(first.code, first.output).toBe(0);
    const invoice = await db.invoice.findUniqueOrThrow({ where: { id: "old-invoice" } });
    expect(invoice.total).toBe(10); expect(invoice.invoiceNumber).toBe("INV-OLD-0001");
    expect(invoice.checkoutSessionId).toBeNull(); expect(invoice.checkoutAttempt).toBe(0);
    expect((await db.invoice.findMany()).map(row => row.id)).toEqual(["old-invoice"]);
    const second = await gate(url);
    expect(second.code, second.output).toBe(0);
    expect(await historyCount(db)).toBe(BigInt(2));
    expect(await db.invoice.count()).toBe(1);
  }, 60_000);
  it("refuses drift before recording the baseline or changing invoice data", async () => {
    const { db, url } = await fixture(); await legacy(url); await oldInvoice(db);
    await db.$executeRawUnsafe('ALTER TABLE "Invoice" ADD COLUMN "unexpectedLegacyColumn" TEXT');
    const result = await gate(url);
    expect(result.code).not.toBe(0); expect(result.output).toContain("does not exactly match the legacy baseline");
    expect(await historyCount(db)).toBe(0);
    expect((await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "Invoice"`)[0].count).toBe(BigInt(1));
  }, 60_000);
  it("refuses duplicate owner invoice numbers without deleting or renumbering them", async () => {
    const { db, url } = await fixture(); await legacy(url); await oldInvoice(db); await oldInvoice(db, "INV-OLD-0001", "duplicate");
    const result = await gate(url);
    expect(result.code).not.toBe(0); expect(result.output).toContain("Duplicate invoice numbers");
    expect(await historyCount(db)).toBe(0);
    expect((await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "Invoice"`)[0].count).toBe(BigInt(2));
  }, 60_000);
  it("serializes simultaneous builds upgrading the same legacy database", async () => {
    const { db, url } = await fixture(); await legacy(url); await oldInvoice(db);
    const results = await Promise.all([gate(url), gate(url)]);
    for (const result of results) expect(result.code, result.output).toBe(0);
    expect(await historyCount(db)).toBe(BigInt(2));
    expect(await db.invoice.count()).toBe(1);
  }, 60_000);
  it("rejects unknown migration history instead of treating another app's database as its own", async () => {
    const { db, url } = await fixture();
    expect((await gate(url)).code).toBe(0);
    await db.$executeRaw`INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at") VALUES ('foreign-migration', 'fixture', '202610010001_another_app', NOW())`;
    const result = await gate(url);
    expect(result.code).not.toBe(0); expect(result.output).toContain("migration history not owned by this application");
  }, 60_000);
});
