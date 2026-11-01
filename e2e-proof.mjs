import { createHash, randomBytes } from "crypto";

const out = (s) => process.stdout.write(s + "\n");
process.on("uncaughtException", (e) => { out("FATAL: " + (e?.message ?? e).slice(0, 300)); process.exit(1); });

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ log: [] });
const PREFIX = "ifk_";
const hash = (r) => createHash("sha256").update(r, "utf8").digest("hex");

try {
  const user = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!user) { out("NO USER"); process.exit(1); }
  out("user: " + user.email);

  // Probe the invoice model safely
  let invId = "";
  try {
    const inv = await prisma.invoice.findFirst({ select: { id: true } });
    if (inv) { invId = inv.id; out("invoice id available: yes"); }
    else out("invoice table empty");
  } catch (e) { out("invoice probe failed: " + String(e.message).slice(0, 120)); }

  const raw = PREFIX + randomBytes(32).toString("hex");
  const row = await prisma.apiKey.create({
    data: { userId: user.id, name: "e2e-proof", prefix: raw.slice(0, PREFIX.length + 8), hash: hash(raw) },
    select: { id: true, prefix: true },
  });
  out("MINTED " + row.id + " " + row.prefix);
  out("RAWKEY " + raw);
  out("INVOICEID " + invId);
} catch (e) {
  out("ERROR: " + String(e.message).slice(0, 400));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
