require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const products = await p.product.findMany({ select: { id: true, name: true, is_active: true } });
  const projCount = await p.project.count();
  const cats = await p.catalogTask.findMany({
    select: { id: true, name: true, is_active: true, _count: { select: { product_links: true } } }
  });
  const taskGroups = await p.projectTask.groupBy({ by: ['status'], _count: { status: true } });
  const ppCount = await p.projectProduct.count();

  console.log('\n=== PRODUTOS (' + products.length + ') ===');
  products.forEach(pr => console.log('  ' + pr.id + ' | ' + pr.name.substring(0, 40) + ' | ativo:' + pr.is_active));
  
  console.log('\n=== PROJETOS: ' + projCount);
  console.log('\n=== MODELOS DE TAREFAS (' + cats.length + ') ===');
  cats.slice(0, 5).forEach(c => console.log('  ' + c.id + ' | ' + c.name.substring(0, 35) + ' | links:' + c._count.product_links));
  
  console.log('\n=== TAREFAS OPERACIONAIS por status ===');
  taskGroups.forEach(g => console.log('  ' + g.status + ': ' + g._count.status));
  
  console.log('\n=== PROJECT_PRODUCTS: ' + ppCount);
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());
