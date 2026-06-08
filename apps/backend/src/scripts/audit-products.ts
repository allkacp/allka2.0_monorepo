import { prisma } from "../lib/prisma";
import { getProductContractability } from "../lib/product-contractability";

export async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  AUDITORIA: Produtos × Modelos de Tarefas × Etapas");
  console.log("═══════════════════════════════════════════════════════════\n");

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      task_links: {
        include: {
          catalog_task: true,
        },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  const allCatalogTasks = await prisma.catalogTask.findMany({
    orderBy: { code: "asc" },
  });

  console.log(`Total de produtos: ${products.length}`);
  console.log(`Total de modelos (CatalogTask): ${allCatalogTasks.length}`);

  let problemCount = 0;

  for (const p of products) {
    const contractability = await getProductContractability(p.id);
    const activeLinks = p.task_links.filter((l) => l.catalog_task.is_active);
    const inactiveLinks = p.task_links.filter((l) => !l.catalog_task.is_active);
    const totalLinks = p.task_links.length;
    const productCode = p.metadata ? JSON.parse(p.metadata)?.code ?? "?" : "?";

    console.log(
      `─── ${p.name} (code=${productCode}, active=${p.is_active}, contractable=${contractability.isContractable})`,
    );
    console.log(`    id=${p.id}`);
    console.log(
      `    Vínculos totais: ${totalLinks} | ativos: ${activeLinks.length} | inativos: ${inactiveLinks.length} | modelos ativos: ${contractability.activeTaskTemplates}`,
    );

    if (activeLinks.length === 0 && p.is_active) {
      console.log(`    ⚠️  PROBLEMA: produto ativo sem modelos ativos!`);
      problemCount++;
    }

    for (const link of p.task_links) {
      const ct = link.catalog_task;
      let stepsCount = 0;
      let stepsValid = false;
      if (ct.steps) {
        try {
          const parsed = JSON.parse(ct.steps);
          stepsCount = Array.isArray(parsed) ? parsed.length : 0;
          stepsValid = stepsCount > 0;
        } catch {
          stepsValid = false;
        }
      }

      const flag = !ct.is_active ? "❌ INATIVO" : stepsCount === 0 ? "⚠️  SEM ETAPAS" : "✅";
      console.log(
        `      ${flag} [${ct.code}] ${ct.name} | ativo=${ct.is_active} | etapas=${stepsCount}`,
      );

      if (ct.is_active && stepsCount === 0) {
        console.log(`         ⚠️  PROBLEMA: modelo ativo sem etapas!`);
        problemCount++;
      }
    }

    if (p.is_active && !contractability.isContractable) {
      console.log(`    ⚠️  PROBLEMA: produto ativo não contratável segundo a regra central.`);
      problemCount++;
    }
    console.log("");
  }

  // Summary of CatalogTasks with no product link
  const linkedTaskIds = new Set(
    products.flatMap((p) => p.task_links.map((l) => l.catalog_task_id)),
  );
  const orphanTasks = allCatalogTasks.filter((ct) => !linkedTaskIds.has(ct.id));
  if (orphanTasks.length > 0) {
    console.log("─── Modelos sem produto vinculado (orphans):");
    for (const ct of orphanTasks) {
      console.log(`    [${ct.code}] ${ct.name} | ativo=${ct.is_active}`);
    }
    console.log("");
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  Total de problemas encontrados: ${problemCount}`);
  console.log(`═══════════════════════════════════════════════════════════`);

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(console.error);
}
