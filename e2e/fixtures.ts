import { test as base } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

export const test = base.extend<{ ownerId: string; db: PrismaClient }>({
  db: async ({}, provide) => {
    const url = new URL(process.env.DATABASE_URL || "http://missing");
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/invoiceflow_test") {
      throw new Error("Browser tests require the disposable local invoiceflow_test database");
    }
    const db = new PrismaClient();
    try { await provide(db); } finally { await db.$disconnect(); }
  },
  ownerId: async ({ db, context }, provide) => {
    const owner = await db.user.create({ data: { name: "Browser Test", email: `browser-${crypto.randomUUID()}@example.test` } });
    const jwt = await encode({ token: { sub: owner.id, name: owner.name, email: owner.email }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token" });
    await context.addCookies([{ name: "authjs.session-token", value: jwt, url: "http://127.0.0.1:3100", httpOnly: true, sameSite: "Lax" }]);
    try { await provide(owner.id); } finally { await db.user.delete({ where: { id: owner.id } }); }
  },
});
export { expect } from "@playwright/test";
