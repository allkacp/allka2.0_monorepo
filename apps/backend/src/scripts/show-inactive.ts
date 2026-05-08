import { prisma } from "../lib/prisma";

async function main() {
  // Show details of all inactive models to inform seed decisions
  const inactive = await prisma.catalogTask.findMany({
    where: { is_active: false },
    orderBy: { code: "asc" },
    include: {
      product_links: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });

  console.log(`Inactive CatalogTasks: ${inactive.length}\n`);
  for (const ct of inactive) {
    console.log(`[${ct.code}] ${ct.name}`);
    console.log(`  id: ${ct.id}`);
    console.log(`  category: ${ct.category}`);
    console.log(`  description: ${ct.description ?? "(none)"}`);
    let stepsCount = 0;
    if (ct.steps) {
      try {
        const s = JSON.parse(ct.steps);
        stepsCount = Array.isArray(s) ? s.length : 0;
        console.log(`  steps (${stepsCount}):`);
        if (Array.isArray(s)) {
          for (const step of s) {
            console.log(`    - ${step.title ?? step.label ?? "(no title)"}`);
          }
        }
      } catch { /* ignore */ }
    }
    for (const link of ct.product_links) {
      console.log(`  linked product: ${link.product.name} (${link.product.id})`);
    }
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
