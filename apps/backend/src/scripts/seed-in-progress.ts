/**
 * seed-in-progress.ts (antes seed-in-progress.cjs)
 * =============================================================
 * Popula projetos "in-progress" com produtos reais já cadastrados e
 * confirma pagamento pelo serviço oficial para gerar as tarefas —
 * nunca cria ProjectTask diretamente (a versão .cjs anterior criava
 * tarefas na mão, incompatível com a exigência de Payment PAGO +
 * PaymentItems desta fase da arquitetura).
 *
 * IDEMPOTENTE:
 *  - ProjectProduct: verifica (project_id, product_id) antes de criar
 *  - Payment/tarefas: confirmPaymentAndGenerateProjectTasks reaproveita
 *    um Payment PENDENTE/PAGO compatível em vez de duplicar
 *  - Não apaga NADA — só insere o que falta
 *
 * Para rodar:
 *   cd apps/backend && npm run db:seed:project-tasks
 * =============================================================
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { confirmPaymentAndGenerateProjectTasks, withIdempotentRetry } from "../lib/confirm-payment";

const DISTRIBUTION: Record<string, string[]> = {
  "Site Institucional + SEO": ["PA0001", "PA0004", "DC0005", "PA0002"],
  "Identidade Visual & Branding": ["DC0001", "DC0002", "PA0003", "PA0005", "DC0003", "DC0004"],
};

async function main() {
  console.log("=".repeat(60));
  console.log("  SEED: Projetos em Andamento → Produtos Reais + Pagamento + Tarefas");
  console.log("=".repeat(60));

  const requester = await prisma.user.findFirst({
    where: { account_type: "admin" },
    select: { id: true, account_type: true, role: true },
  });
  if (!requester) {
    throw new Error("Nenhum usuário admin encontrado — necessário como requesterUser para confirmar pagamento.");
  }

  const inProgressProjects = await prisma.project.findMany({
    where: { status: "in-progress" },
    orderBy: { created_at: "asc" },
  });
  console.log(`\n✔ Projetos com status "in-progress" encontrados: ${inProgressProjects.length}`);
  inProgressProjects.forEach((pr) => console.log(`  · ${pr.title} (${pr.id})`));

  if (inProgressProjects.length === 0) {
    console.log("\nNenhum projeto em andamento. Nada a fazer.");
    return;
  }

  const products = await prisma.product.findMany({ where: { is_active: true } });
  console.log(`\n✔ Produtos ativos no banco: ${products.length}`);

  let totalPPCreated = 0;
  let totalPPSkipped = 0;
  let paymentsConfirmed = 0;
  let tasksGenerated = 0;
  let stagesGenerated = 0;
  const errors: string[] = [];

  for (const project of inProgressProjects) {
    console.log(`\n${"─".repeat(55)}`);
    console.log(`📁 Projeto: ${project.title}`);

    const distKey = Object.keys(DISTRIBUTION).find((key) => project.title.toLowerCase().includes(key.toLowerCase()));

    let productCodes: string[];
    if (distKey) {
      productCodes = DISTRIBUTION[distKey];
    } else {
      const existing = await prisma.projectProduct.findMany({
        where: { project_id: project.id },
        select: { product_id: true },
      });
      const existingIds = new Set(existing.map((e) => e.product_id));
      productCodes = products.map((pr) => pr.id).filter((id) => !existingIds.has(id));
      console.log(`  ⚠ Não está no mapa de distribuição → usando todos produtos faltantes`);
    }

    console.log(`  Produtos definidos para este projeto: ${productCodes.join(", ")}`);

    for (const code of productCodes) {
      const product = products.find((pr) => pr.id === code || pr.id.startsWith(code));
      if (!product) {
        console.log(`  ⚠ Produto "${code}" não encontrado no banco — pulado.`);
        continue;
      }

      const existing = await prisma.projectProduct.findUnique({
        where: { project_id_product_id: { project_id: project.id, product_id: product.id } },
      });
      if (existing) {
        totalPPSkipped++;
        console.log(`  →   Já vinculado: ${product.name}`);
        continue;
      }

      await prisma.projectProduct.create({
        data: {
          project_id: project.id,
          product_id: product.id,
          product_name_snapshot: product.name,
          product_code_snapshot: product.id,
          product_category_snapshot: product.category,
          product_price_snapshot: product.base_price ?? 0,
          preco_final_cliente_snapshot: product.base_price ?? 0,
          pagador_snapshot: "CLIENTE",
          status: "EM_EXECUCAO",
        },
      });
      totalPPCreated++;
      console.log(`  ✓  NOVO vínculo: ${product.name}`);
    }

    try {
      const result = await withIdempotentRetry(() =>
        prisma.$transaction((tx) =>
          confirmPaymentAndGenerateProjectTasks(tx, {
            projectId: project.id,
            requesterUser: requester,
            notes: "Seed de manutenção — confirmação de pagamento de teste",
          }),
        ),
      );
      if (result.tasksResult) {
        paymentsConfirmed++;
        tasksGenerated += result.tasksResult.generated;
        stagesGenerated += result.tasksResult.stages_generated;
        console.log(`   ✓ Payment confirmado + ${result.tasksResult.generated} tarefa(s) / ${result.tasksResult.stages_generated} etapa(s)`);
      } else if (result.alreadyProcessed) {
        console.log(`   → Payment já confirmado anteriormente (idempotente)`);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push(`${project.title}: ${reason}`);
      console.warn(`   ⚠️  Pagamento/tarefas ignorados: ${reason}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("  RELATÓRIO FINAL");
  console.log(`${"=".repeat(60)}`);

  const finalPP = await prisma.projectProduct.count();
  const finalTasks = await prisma.projectTask.count();

  console.log(`\nProjetos in-progress encontrados  : ${inProgressProjects.length}`);
  console.log(`Vínculos novos criados             : ${totalPPCreated}`);
  console.log(`Vínculos já existentes (pulados)   : ${totalPPSkipped}`);
  console.log(`Pagamentos confirmados agora       : ${paymentsConfirmed}`);
  console.log(`Tarefas criadas agora              : ${tasksGenerated}`);
  console.log(`Etapas criadas agora               : ${stagesGenerated}`);
  if (errors.length > 0) {
    console.log(`Erros                              : ${errors.length}`);
  }
  console.log(`\nTotais finais no banco:`);
  console.log(`  ProjectProducts total : ${finalPP}`);
  console.log(`  ProjectTasks total    : ${finalTasks}`);
  console.log(`\n${errors.length === 0 ? "✅  Seed concluído com sucesso!" : `⚠  Seed concluído com ${errors.length} erro(s).`}`);
}

main()
  .catch((e) => {
    console.error("\n❌  Erro durante o seed:", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
