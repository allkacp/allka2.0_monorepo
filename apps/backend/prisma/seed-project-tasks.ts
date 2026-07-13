/**
 * seed-project-tasks.ts
 * ================================================================
 * Popula projetos existentes com ProjectProduct (todos os status) e,
 * para projetos já em operação (planning/in-progress/completed), gera
 * tarefas reais via o fluxo oficial de pagamento
 * (confirmPaymentAndGenerateProjectTasks) — nunca cria ProjectTask
 * diretamente. draft/negotiation/awaiting-payment/cancelled recebem só
 * o vínculo de produto, sem tarefa (não haveria Payment PAGO real pra
 * justificar uma).
 *
 * IDEMPOTENTE:
 *   - ProjectProduct: upsert por (project_id, product_id)
 *   - Tarefas: confirmPaymentAndGenerateProjectTasks reaproveita um
 *     Payment PENDENTE/PAGO compatível existente em vez de duplicar
 *
 * Para rodar:
 *   cd apps/backend && npm run db:seed:qa-project-tasks
 * ================================================================
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { confirmPaymentAndGenerateProjectTasks, withIdempotentRetry } from "../src/lib/confirm-payment";

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

const STATUSES_WITH_CONFIRMED_PAYMENT = new Set(["planning", "in-progress", "completed"]);

function projectProductStatusFor(projectStatus: string) {
  if (projectStatus === "completed") return "CONCLUIDO";
  if (projectStatus === "cancelled") return "CANCELADO";
  if (STATUSES_WITH_CONFIRMED_PAYMENT.has(projectStatus)) return "EM_EXECUCAO";
  return "PENDENTE";
}

async function main() {
  console.log("=".repeat(65));
  console.log("  SEED: Projetos existentes → ProjectProduct (+ tarefas se pago)");
  console.log("=".repeat(65));

  const requester = await prisma.user.findFirst({
    where: { account_type: "admin" },
    select: { id: true, account_type: true, role: true },
  });
  if (!requester) {
    throw new Error("Nenhum usuário admin encontrado — necessário como requesterUser para confirmar pagamento.");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: ACTIVE_PRODUCT_IDS }, is_active: true },
    select: { id: true, name: true, category: true, base_price: true },
    orderBy: { id: "asc" },
  });

  if (products.length === 0) {
    console.error("\n❌  Nenhum produto ativo encontrado. Rode db:seed:products primeiro.");
    process.exit(1);
  }
  console.log(`\n✔  Produtos ativos disponíveis: ${products.length}`);

  const projects = await prisma.project.findMany({
    select: { id: true, title: true, status: true },
    orderBy: { created_at: "asc" },
  });
  console.log(`✔  Projetos encontrados: ${projects.length}`);

  let totalPPCreated = 0;
  let totalPPSkipped = 0;
  let paymentsConfirmed = 0;
  let tasksGenerated = 0;
  let stagesGenerated = 0;
  const skipped: Array<{ title: string; reason: string }> = [];
  const errors: string[] = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const productIds = Array.from({ length: PRODUCTS_PER_PROJECT }, (_, k) =>
      products[(i * PRODUCTS_PER_PROJECT + k) % products.length].id,
    );
    const uniqueProductIds = [...new Set(productIds)];

    console.log(`\n📁 [${i + 1}/${projects.length}] ${project.title} (${project.status})`);

    for (const productId of uniqueProductIds) {
      const prod = products.find((p) => p.id === productId);
      if (!prod) continue;

      const existing = await prisma.projectProduct.findUnique({
        where: { project_id_product_id: { project_id: project.id, product_id: productId } },
      });

      const desiredStatus = projectProductStatusFor(project.status);

      if (existing) {
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
          product_price_snapshot: prod.base_price ?? 0,
          preco_final_cliente_snapshot: prod.base_price ?? 0,
          pagador_snapshot: "CLIENTE",
          status: desiredStatus,
        },
      });
      totalPPCreated++;
    }

    if (!STATUSES_WITH_CONFIRMED_PAYMENT.has(project.status)) {
      skipped.push({ title: project.title, reason: `status "${project.status}" não gera tarefa (sem pagamento presumido)` });
      continue;
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
      // confirmPaymentAndGenerateProjectTasks força Project.status="in-progress"
      // como efeito colateral — restaura o status original do projeto
      // (planning/completed) já que este script só deveria popular tarefas,
      // não migrar o status de negócio do projeto.
      if (project.status !== "in-progress") {
        await prisma.project.update({ where: { id: project.id }, data: { status: project.status } });
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      skipped.push({ title: project.title, reason });
      errors.push(`${project.title}: ${reason}`);
      console.warn(`   ⚠️  Pagamento/tarefas ignorados: ${reason}`);
    }
  }

  const finalPP = await prisma.projectProduct.count();
  const finalPT = await prisma.projectTask.count();
  const finalStages = await prisma.projectTaskStage.count();

  console.log(`\n${"=".repeat(65)}`);
  console.log("  RELATÓRIO FINAL");
  console.log("=".repeat(65));
  console.log(`Projetos processados            : ${projects.length}`);
  console.log(`Vínculos novos (ProjectProduct)  : ${totalPPCreated}`);
  console.log(`Vínculos já existentes           : ${totalPPSkipped}`);
  console.log(`Pagamentos confirmados agora     : ${paymentsConfirmed}`);
  console.log(`Tarefas criadas agora            : ${tasksGenerated}`);
  console.log(`Etapas criadas agora             : ${stagesGenerated}`);
  console.log(`Projetos sem tarefa (por desenho): ${skipped.length}`);
  if (errors.length > 0) {
    console.log(`Erros                            : ${errors.length}`);
  }
  console.log(`\nTotais finais no banco:`);
  console.log(`  ProjectProduct total : ${finalPP}`);
  console.log(`  ProjectTask total    : ${finalPT}`);
  console.log(`  ProjectTaskStage total: ${finalStages}`);

  console.log(errors.length === 0 ? "\n✅  Seed concluído com sucesso!" : `\n⚠  Seed concluído com ${errors.length} erro(s) — ver acima.`);
}

main()
  .catch((e) => {
    console.error("\n❌  Erro fatal durante o seed:", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
