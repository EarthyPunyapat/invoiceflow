/**
 * Demo data seeder for InvoiceFlow.
 *
 * Creates one demo user with clients and invoices spanning EVERY
 * InvoiceStatus (DRAFT / SENT / PAID / OVERDUE / CANCELLED), including
 * share tokens on live invoices so the public /i/[token] page is
 * demoable end-to-end. No external services required.
 *
 * Usage:
 *   cp .env.example .env        # set DATABASE_URL
 *   npx prisma db push          # sync schema
 *   npx tsx prisma/seed.ts      # idempotent — safe to re-run
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

/** Demo account; override to seed data under your real login (see README). */
const DEMO_EMAIL =
  process.env.SEED_DEMO_EMAIL || "demo@invoiceflow.dev";

/** 32-hex URL-safe token, same shape as src/lib/token.ts. */
const shareToken = (): string => randomBytes(16).toString("hex");

const daysFromNow = (days: number): Date =>
  new Date(Date.now() + days * 86_400_000);

/**
 * Plain demo arithmetic — replicates the cents pipeline of src/lib/money
 * inline because the seed runs via tsx outside Next's "@/" path alias.
 */
const lineTotal = (quantity: number, unitPrice: number): number =>
  Math.round(quantity * unitPrice * 100) / 100;

const computeTotals = (items: SeedItem[], taxPercent: number) => {
  const subtotal = items.reduce(
    (sum, it) => sum + lineTotal(it.quantity, it.unitPrice),
    0
  );
  const total = Math.round(subtotal * (1 + taxPercent / 100) * 100) / 100;
  return { subtotal, total };
};

interface SeedItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Copy .env.example to .env and run `npx prisma db push` first."
    );
    process.exit(1);
  }

  // ─── Idempotency: wipe any previous demo namespace (items cascade) ───
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });
  if (existing) {
    await prisma.invoice.deleteMany({ where: { userId: existing.id } });
    await prisma.estimate.deleteMany({ where: { userId: existing.id } });
    await prisma.client.deleteMany({ where: { userId: existing.id } });
    await prisma.stripeAccount.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
    console.log("Removed previous demo user.");
  }

  // ─── Demo user (NextAuth Google OAuth shape — no credentials) ───
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      emailVerified: new Date(),
      businessName: "Acme Studio",
      accentColor: "#4f46e5",
      invoicePrefix: "INV",
    },
  });

  // ─── Clients ───
  const [acme, globex, initech] = await Promise.all([
    prisma.client.create({
      data: {
        userId: user.id,
        name: "Acme Corporation",
        company: "Acme Corp",
        email: "billing@acme.test",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        name: "Globex",
        company: "Globex Industries",
        email: "accounts@globex.test",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        name: "Initech",
        company: "Initech LLC",
        email: "ap@initech.test",
      },
    }),
  ]);

  // ─── Invoices across every status ───
  const prefix = `INV-${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  interface SeedInvoice {
    clientId: string;
    seq: number;
    status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
    dueInDays: number;
    sentDaysAgo?: number;
    paidDaysAgo?: number;
    taxPercent?: number;
    items: SeedItem[];
    shared?: boolean;
  }

  const plan: SeedInvoice[] = [
    {
      clientId: acme.id,
      seq: 1,
      status: "PAID",
      dueInDays: -5,
      sentDaysAgo: 25,
      paidDaysAgo: 6,
      taxPercent: 10,
      items: [
        { description: "Brand identity design", quantity: 1, unitPrice: 2400 },
        { description: "Landing page build", quantity: 8, unitPrice: 150 },
      ],
    },
    {
      clientId: globex.id,
      seq: 2,
      status: "SENT",
      dueInDays: 10,
      sentDaysAgo: 4,
      taxPercent: 8.5,
      items: [
        { description: "Monthly retainer", quantity: 1, unitPrice: 950 },
        { description: "Hosting & infrastructure", quantity: 1, unitPrice: 120 },
      ],
      shared: true,
    },
    {
      clientId: initech.id,
      seq: 3,
      status: "OVERDUE",
      dueInDays: -12,
      sentDaysAgo: 42,
      taxPercent: 0,
      items: [
        { description: "API integration", quantity: 12, unitPrice: 125 },
        { description: "On-call support", quantity: 3, unitPrice: 90 },
      ],
      shared: true,
    },
    {
      clientId: acme.id,
      seq: 4,
      status: "DRAFT",
      dueInDays: 21,
      taxPercent: 10,
      items: [{ description: "Q3 audit prep (draft)", quantity: 5, unitPrice: 180 }],
    },
    {
      clientId: globex.id,
      seq: 5,
      status: "CANCELLED",
      dueInDays: 30,
      taxPercent: 0,
      items: [
        { description: "Cancelled pilot", quantity: 1, unitPrice: 500 },
        { description: "Kickoff workshop", quantity: 2, unitPrice: 250 },
      ],
    },
    {
      clientId: acme.id,
      seq: 6,
      status: "OVERDUE",
      dueInDays: -30,
      sentDaysAgo: 65,
      taxPercent: 10,
      items: [
        { description: "Legacy migration scripts", quantity: 4, unitPrice: 180 },
        { description: "Data import & validation", quantity: 6, unitPrice: 140 },
      ],
    },
    {
      clientId: initech.id,
      seq: 7,
      status: "SENT",
      dueInDays: 14,
      sentDaysAgo: 2,
      taxPercent: 0,
      items: [
        { description: "Security audit", quantity: 1, unitPrice: 3200 },
        { description: "Pen-test remediation", quantity: 2, unitPrice: 450 },
      ],
    },
    {
      clientId: globex.id,
      seq: 8,
      status: "DRAFT",
      dueInDays: 45,
      taxPercent: 8.5,
      items: [
        { description: "Q4 roadmap planning", quantity: 6, unitPrice: 160 },
        { description: "Design system refresh", quantity: 10, unitPrice: 120 },
        { description: "Analytics setup", quantity: 1, unitPrice: 800 },
      ],
    },
  ];

  for (const inv of plan) {
    const taxPercent = inv.taxPercent ?? 0;
    const { subtotal, total } = computeTotals(inv.items, taxPercent);

    const created = await prisma.invoice.create({
      data: {
        userId: user.id,
        clientId: inv.clientId,
        invoiceNumber: `${prefix}-${String(inv.seq).padStart(4, "0")}`,
        status: inv.status,
        subtotal,
        tax: taxPercent,
        total,
        currency: "USD",
        dueDate: daysFromNow(inv.dueInDays),
        notes: `Seeded ${inv.status} demo invoice.`,
        sentAt: inv.sentDaysAgo ? daysFromNow(-inv.sentDaysAgo) : null,
        paidAt: inv.paidDaysAgo ? daysFromNow(-inv.paidDaysAgo) : null,
        shareToken: inv.shared ? shareToken() : null,
        items: {
          create: inv.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: lineTotal(it.quantity, it.unitPrice),
          })),
        },
      },
    });

    console.log(
      `Created ${created.invoiceNumber} [${created.status}] total=$${total.toFixed(2)}`
    );
  }

  // ─── Estimates (one DRAFT, one ACCEPTED) ──────────────────────────
  const estPrefix = `EST-${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  interface SeedEstimate {
    clientId: string;
    seq: number;
    status: "DRAFT" | "ACCEPTED";
    issueDaysAgo: number;
    expiryInDays: number;
    taxPercent: number;
    items: SeedItem[];
  }

  const estimatePlan: SeedEstimate[] = [
    {
      clientId: acme.id,
      seq: 1,
      status: "DRAFT",
      issueDaysAgo: 1,
      expiryInDays: 29,
      taxPercent: 10,
      items: [
        { description: "Website redesign concept", quantity: 1, unitPrice: 1800 },
        { description: "Mobile mockups", quantity: 4, unitPrice: 220 },
      ],
    },
    {
      clientId: initech.id,
      seq: 2,
      status: "ACCEPTED",
      issueDaysAgo: 20,
      expiryInDays: 10,
      taxPercent: 0,
      items: [
        { description: "ERP integration phase 1", quantity: 1, unitPrice: 5400 },
        { description: "Training sessions", quantity: 3, unitPrice: 350 },
      ],
    },
  ];

  for (const est of estimatePlan) {
    const { subtotal, total } = computeTotals(est.items, est.taxPercent);

    const created = await prisma.estimate.create({
      data: {
        userId: user.id,
        clientId: est.clientId,
        estimateNumber: `${estPrefix}-${String(est.seq).padStart(4, "0")}`,
        status: est.status,
        issueDate: daysFromNow(-est.issueDaysAgo),
        expiryDate: daysFromNow(est.expiryInDays),
        subtotal,
        tax: est.taxPercent,
        total,
        currency: "USD",
        notes: `Seeded ${est.status} demo estimate.`,
        items: {
          create: est.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: lineTotal(it.quantity, it.unitPrice),
          })),
        },
      },
    });

    console.log(
      `Created ${created.estimateNumber} [${created.status}] total=$${total.toFixed(2)}`
    );
  }

  console.log(`\nDone. Log in as ${DEMO_EMAIL} via Google OAuth.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
