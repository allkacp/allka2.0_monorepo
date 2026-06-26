const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86400000);
  const oldest = await prisma.invoice.findFirst({ orderBy: { created_at: 'asc' }, select: { created_at: true, paid_at: true, status: true, amount: true } });
  const newest = await prisma.invoice.findFirst({ orderBy: { created_at: 'desc' }, select: { created_at: true, paid_at: true, status: true, amount: true } });
  const paidAll = await prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: 'paid' } });
  const recentPaid = await prisma.invoice.aggregate({ _sum: { amount: true }, _count: true, where: { status: 'paid', OR: [{ paid_at: { gte: from, lte: now } }, { paid_at: null, created_at: { gte: from, lte: now } }] } });
  console.log('from:', from.toISOString(), 'to:', now.toISOString());
  console.log('oldest:', JSON.stringify(oldest));
  console.log('newest:', JSON.stringify(newest));
  console.log('all paid sum:', paidAll._sum.amount);
  console.log('recent paid (last 30d):', JSON.stringify(recentPaid));
}
main().catch(console.error).finally(() => process.exit(0));
