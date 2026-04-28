const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.product.count().then(c => {
  console.log('Total produtos:', c);
  return p.product.findMany({ select: { sku: true, name: true, isActive: true } });
}).then(ps => {
  ps.forEach(x => console.log(x.sku, x.isActive, x.name));
  p.$disconnect();
}).catch(e => { console.error(e); p.$disconnect(); });
