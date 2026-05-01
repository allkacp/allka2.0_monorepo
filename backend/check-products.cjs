require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const product = await p.product.findFirst({
    where: { id: 'PA0001' },
    select: { id: true, name: true, image: true, metadata: true, demonstrations: true, variations: true }
  });
  if (!product) { console.log('PA0001 not found'); return; }

  const meta = JSON.parse(product.metadata || '{}');
  console.log('=== PA0001 ===');
  console.log('name:', product.name);
  console.log('image:', product.image || '(none)');
  console.log('demonstrations:', product.demonstrations ? product.demonstrations.substring(0, 100) : '(none)');
  console.log('meta.productImagePreview:', meta.productImagePreview || '(none)');
  console.log('meta.portfolioImages count:', (meta.portfolioImages || []).length);
  console.log('meta.tasks count:', (meta.tasks || []).length);
  console.log('meta.finalPrice:', meta.finalPrice);
  console.log('variations count:', product.variations.length);

  // Check DC0001 too
  const dc = await p.product.findFirst({
    where: { id: 'DC0001' },
    select: { id: true, name: true, image: true, metadata: true, variations: true, addons: true }
  });
  if (dc) {
    const dcMeta = JSON.parse(dc.metadata || '{}');
    console.log('\n=== DC0001 ===');
    console.log('name:', dc.name);
    console.log('image:', dc.image || '(none)');
    console.log('meta.finalPrice:', dcMeta.finalPrice);
    console.log('meta.portfolioImages count:', (dcMeta.portfolioImages || []).length);
    console.log('meta.tasks count:', (dcMeta.tasks || []).length);
    console.log('variations count:', dc.variations.length);
    console.log('addons count:', dc.addons.length);
  }
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());
