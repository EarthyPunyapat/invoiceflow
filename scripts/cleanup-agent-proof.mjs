import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const u = await prisma.user.findUnique({ where: { email: 'agent-proof@invoiceflow.test' }, select: { id: true } });
if (!u) { console.log('nothing to clean'); await prisma.$disconnect(); process.exit(0); }
const inv = await prisma.invoice.deleteMany({ where: { userId: u.id } });
const cli = await prisma.client.deleteMany({ where: { userId: u.id } });
const key = await prisma.apiKey.deleteMany({ where: { userId: u.id } });
await prisma.user.delete({ where: { id: u.id } });
console.log(`removed invoices=${inv.count} clients=${cli.count} keys=${key.count} user=1`);
await prisma.$disconnect();
