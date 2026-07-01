/**
 * seed-project-tasks.ts
 * ================================================================
 * Popula TODOS os projetos existentes com ProductProduct + ProjectTask
 * + ProjectTaskStage usando produtos reais do catálogo.
 *
 * IDEMPOTENTE:
 *   - Usa upsert/findFirst antes de criar qualquer registro
 *   - Não apaga NADA — apenas insere o que falta
 *   - Seguro rodar múltiplas vezes
 *
 * Distribuição:
 *   - Cada projeto recebe 2 produtos, rotacionando pelos 11 produtos ativos
 *   - seed-product-perf-01 é ignorado (sem CatalogTask vinculados)
 *
 * Para rodar:
 *   cd apps/backend && npm run db:seed:qa-project-tasks
 * ================================================================
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { gerarTarefasDoProjeto } from "../src/lib/generate-tasks";

const prisma = new PrismaClient();

// Produtos com CatalogTask ativos — exclui seed-product-perf-01 (sem links)
const ACTIVE_PRODUCT_IDS = [
  "PA0001", // Gestão de Tráfego
  "PA0002", // SEO
  "PA0003", // Configuração de Google Negócios
  "PA0004", // Configuração de Data Analytics
  "PA0005", // Análise de Usabilidade UX
  "DC0001", // Layout de Redes Sociais
  "DC0002", // Criativos Mídia Display
  "DC0003", // Tratamento de até 10 Imagens
  "DC0004", // Papelaria (3 unidades)
  "DC0005", // Layout de Website
  "DC0006", // Template para Criativos
];

const PRODUCTS_PER_PROJECT = 2;

async function main() {
  console.log("=".repeat(65));
  console.log("  SEED: Todos os Projetos → ProjectProduct + ProjectTask + Stages");
  console.log("=".repeat(65));

  // 1. Verificar produtos ativos disponíveis
  const products = await prisma.product.findMany({
    where: { id: { in: ACTIVE_PRODUCT_IDS }, is_active: true },
    select: { id: true, name: true, category: true },
    orderBy: { id: "asc" },
  });

  if (products.length === 0) {
    console.error("\n❌  Nenhum produto ativo encontrado. Rode db:seed:products primeiro.");
    process.exit(1);
  }
  console.log(`\n✔  Produtos ativos disponíveis: ${products.length}`);
  products.forEach((p) => console.log(`    · ${p.id.padEnd(22)} ${p.name}`));

  // 2. Buscar todos os projetos
  const projects = await prisma.project.findMany({
    select: { id: true, title: true, status: true, agency: true, client_id: true },
    orderBy: { created_at: "asc" },
  });
  console.log(`\n✔  Projetos encontrados: ${projects.length}`);

  // 3. Para cada projeto, vincular 2 produtos (rotacionando) e gerar tarefas
  let totalPPCreated = 0;
  let totalPPSkipped = 0;
  let totalTasksGenerated = 0;
  let totalTasksSkipped = 0;
  let totalStagesGenerated = 0;
  const errors: string[] = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    // Selecionar 2 produtos desta rodada (rotação circular pelos disponíveis)
    const productIds = Array.from({ length: PRODUCTS_PER_PROJECT }, (_, k) => {
      return products[(i * PRODUCTS_PER_PROJECT + k) % products.length].id;
    });

    // Garantir que não há duplicata (pode ocorrer se PRODUCTS_PER_PROJECT >= products.length)
    const uniqueProductIds = [...new Set(productIds)];

    console.log(`\n${"─".repeat(60)}`);
    console.log(`📁 [${i + 1}/${projects.length}] ${project.title} (${project.status})`);
    console.log(`   Produtos: ${uniqueProductIds.join(", ")}`);

    // 3a. Criar ProjectProduct para cada produto (skip se já existir)
    for (const productId of uniqueProductIds) {
      const prod = products.find((p) => p.id === productId);
      if (!prod) continue;

      const existing = await prisma.projectProduct.findUnique({
        where: { project_id_product_id: { project_id: project.id, product_id: productId } },
      });

      if (existing) {
        console.log(`   → Já vinculado: ${prod.name}`);
        totalPPSkipped++;
        continue;
      }

      await prisma.projectProduct.create({
        data: {
          project_id: project.id,
          product_id: productId,
          product_name_snapshot: prod.name,
          product_code_snapshot: prod.id,
          product_category_snapshot: prod.category,
          status: "EM_EXECUCAO",
        },
      });
      console.log(`   ✓  Produto vinculado: ${prod.name}`);
      totalPPCreated++;
    }

    // 3b. Gerar tarefas + etapas via gerarTarefasDoProjeto (idempotente)
    try {
      const result = await gerarTarefasDoProjeto(project.id);
      totalTasksGenerated += result.generated;
      totalTasksSkipped += result.skipped;
      totalStagesGenerated += result.stages_generated;

      if (result.generated > 0 || result.stages_generated > 0) {
        console.log(
          `   ✓  Tarefas: +${result.generated} criadas, ${result.skipped} existentes | ` +
          `Etapas: +${result.stages_generated}`,
        );
      } else {
        console.log(`   →  Sem novas tarefas (tudo já existia)`);
      }

      if (result.produtos_sem_modelo.length > 0) {
        console.log(`   ⚠  Sem modelo: ${result.produtos_sem_modelo.join(", ")}`);
      }
    } catch (err: any) {
      const msg = `Erro ao gerar tarefas para "${project.title}": ${err?.message ?? err}`;
      console.error(`   ❌  ${msg}`);
      errors.push(msg);
    }
  }

  // 4. Contagens finais diretas do banco
  const finalPP = await prisma.projectProduct.count();
  const finalPT = await prisma.projectTask.count();
  const finalStages = await prisma.projectTaskStage.count();
  const byStatus = await prisma.projectTask.groupBy({
    by: ["status"],
    _count: { id: true },
    orderBy: { status: "asc" },
  });

  console.log(`\n${"=".repeat(65)}`);
  console.log("  RELATÓRIO FINAL");
  console.log("=".repeat(65));
  console.log(`Projetos processados           : ${projects.length}`);
  console.log(`Vínculos novos (ProjectProduct): ${totalPPCreated}`);
  console.log(`Vínculos já existentes         : ${totalPPSkipped}`);
  console.log(`Tarefas criadas agora          : ${totalTasksGenerated}`);
  console.log(`Tarefas já existentes          : ${totalTasksSkipped}`);
  console.log(`Etapas criadas agora           : ${totalStagesGenerated}`);
  if (errors.length > 0) {
    console.log(`Erros                          : ${errors.length}`);
    errors.forEach((e) => console.log(`  ❌  ${e}`));
  }
  console.log(`\nTotais finais no banco:`);
  console.log(`  ProjectProduct total : ${finalPP}`);
  console.log(`  ProjectTask total    : ${finalPT}`);
  console.log(`  ProjectTaskStage total: ${finalStages}`);
  console.log(`\n  Por status (ProjectTask):`);
  byStatus.forEach((s) =>
    console.log(`    ${s.status.padEnd(35)}: ${s._count.id}`),
  );

  if (errors.length === 0) {
    console.log("\n✅  Seed concluído com sucesso!");
  } else {
    console.log(`\n⚠   Seed concluído com ${errors.length} erro(s). Verifique acima.`);
  }
}

main()
  .catch((e) => {
    console.error("\n❌  Erro fatal durante o seed:", e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
