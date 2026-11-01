import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
const prisma = new PrismaClient();
const email = 'agent-proof@invoiceflow.test';
const user = await prisma.user.upsert({
  where: { email },
  update: {},
  create: { email, name: 'Agent Proof', emailVerified: new Date() },
  select: { id: true },
});
const raw = 'ifk_' + randomBytes(32).toString('hex');
const hash = createHash('sha256').update(raw, 'utf8').digest('hex');
await prisma.apiKey.deleteMany({ where: { userId: user.id, name: 'proof' } });
await prisma.apiKey.create({ data: { userId: user.id, name: 'proof', prefix: raw.slice(0,12), hash } });
await prisma.client.deleteMany({ where: { userId: user.id, name: 'Acme Proof Co' } });
const client = await prisma.client.create({
  data: { userId: user.id, name: 'Acme Proof Co', email: 'billing@acme-proof.test' },
  select: { id: true },
});
console.log(JSON.stringify({ key: raw, clientId: client.id }));
await prisma.$disconnect();
