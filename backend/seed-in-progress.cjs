/**
 * seed-in-progress.cjs
 * =============================================================
 * Popula projetos "in-progress" com produtos reais já cadastrados.
 * Gera ProjectTasks reais a partir dos CatalogTasks de cada produto.
 *
 * IDEMPOTENTE:
 *  - Verifica ProjectProduct(project_id, product_id) antes de criar
 *  - Verifica ProjectTask(project_product_id, catalog_task_id) antes de criar
 *  - Não apaga NADA — só insere o que falta
 *
 * Distribuição (2 projetos in-progress → grupos proporcionais):
 *
 *  Site Institucional + SEO  → Grupos 1 + 3
 *    PA0001 Gestão de Tráfego          (já pode ter DC0005 + PA0002 — idempotente)
 *    PA0004 Configuração de Data Analytics
 *    DC0005 Layout de Website          (já existe → pulado)
 *    PA0002 SEO                        (já existe → pulado)
 *
 *  Identidade Visual & Branding → Grupos 2 + 4 + 5
 *    DC0001 Layout de Redes Sociais
 *    DC0002 Criativos Mídia Display    (já existe → pulado)
 *    PA0003 Configuração de Google Negócios
 *    PA0005 Análise de Usabilidade UX
 *    DC0003 Tratamento de até 10 Imagens
 *    DC0004 Papelaria (3 unidades)     (já existe → pulado)
 * =============================================================
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// Distribuição: status alvo do vínculo para projetos in-progress = EM_EXECUCAO
// Status inicial das tarefas: primeiro tarefa EM_EXECUCAO, restantes A_FAZER
const DISTRIBUTION = {
  "Site Institucional + SEO": ["PA0001", "PA0004", "DC0005", "PA0002"],
  "Identidade Visual & Branding": ["DC0001", "DC0002", "PA0003", "PA0005", "DC0003", "DC0004"],
};

async function linkProductToProject({ project, product, allTasks }) {
  // 1. Verificar se vínculo já existe (idempotência)
  const existing = await p.projectProduct.findUnique({
    where: { project_id_product_id: { project_id: project.id, product_id: product.id } },
  });

  let pp;
  let tasksGenerated = 0;
  let tasksSkipped = 0;
  let ppCreated = false;

  if (existing) {
    pp = existing;
  } else {
    pp = await p.projectProduct.create({
      data: {
        project_id: project.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_code_snapshot: product.id,
        product_category_snapshot: product.category,
        product_price_snapshot: product.base_price ?? null,
        recurrence_snapshot: product.recurrence ?? null,
        status: "EM_EXECUCAO",
      },
    });
    ppCreated = true;
  }

  // 2. Gerar tarefas para cada modelo de tarefa do produto
  // Ordenados por sort_order
  const taskLinks = allTasks
    .filter((tl) => tl.product_id === product.id)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (let i = 0; i < taskLinks.length; i++) {
    const link = taskLinks[i];
    const ct = link.catalog_task;

    // Verificar se a tarefa já existe para este vínculo + modelo (idempotência)
    const existingTask = await p.projectTask.findFirst({
      where: { project_product_id: pp.id, catalog_task_id: ct.id },
    });

    if (existingTask) {
      tasksSkipped++;
      continue;
    }

    // Primeira tarefa do projeto in-progress entra como EM_EXECUCAO, restantes A_FAZER
    const taskStatus = i === 0 ? "EM_EXECUCAO" : "A_FAZER";

    await p.projectTask.create({
      data: {
        project_id: project.id,
        project_product_id: pp.id,
        product_id: product.id,
        catalog_task_id: ct.id,
        code_snapshot: ct.code ?? null,
        name_snapshot: ct.name,
        category_snapshot: ct.category ?? null,
        title: ct.name,
        description: ct.description ?? null,
        status: taskStatus,
        priority: ct.default_priority ?? "medium",
        sort_order: link.sort_order,
        phase: link.phase ?? null,
        checklist_snapshot: ct.checklist ?? null,
        steps_snapshot: ct.steps ?? null,
        briefing_snapshot: ct.briefing_questions ?? null,
      },
    });
    tasksGenerated++;
  }

  return { pp, ppCreated, tasksGenerated, tasksSkipped };
}

async function main() {
  console.log("=".repeat(60));
  console.log("  SEED: Projetos em Andamento → Produtos Reais + Tarefas");
  console.log("=".repeat(60));

  // 1. Buscar projetos in-progress
  const inProgressProjects = await p.project.findMany({
    where: { status: "in-progress" },
    orderBy: { created_at: "asc" },
  });
  console.log(`\n✔ Projetos com status "in-progress" encontrados: ${inProgressProjects.length}`);
  inProgressProjects.forEach((pr) => console.log(`  · ${pr.title} (${pr.id})`));

  if (inProgressProjects.length === 0) {
    console.log("\nNenhum projeto em andamento. Nada a fazer.");
    return;
  }

  // 2. Buscar todos os produtos ativos com seus modelos de tarefas
  const products = await p.product.findMany({
    where: { is_active: true },
    include: {
      task_links: {
        include: { catalog_task: true },
        orderBy: { sort_order: "asc" },
      },
    },
  });

  // Flat list de task_links com product_id embutido
  const allTaskLinks = products.flatMap((pr) =>
    pr.task_links.map((tl) => ({ ...tl, product_id: pr.id }))
  );

  // Mapa id → produto
  const productMap = new Map(products.map((pr) => [pr.id, pr]));
  console.log(`\n✔ Produtos ativos no banco: ${products.length}`);
  products.forEach((pr) =>
    console.log(`  · ${pr.id.padEnd(8)} ${pr.name} (${pr.task_links.length} modelos de tarefa)`)
  );

  // 3. Processar cada projeto in-progress com sua distribuição
  let totalPPCreated = 0;
  let totalPPSkipped = 0;
  let totalTasksGenerated = 0;
  let totalTasksSkipped = 0;
  const ignoredProjects = [];

  for (const project of inProgressProjects) {
    console.log(`\n${"─".repeat(55)}`);
    console.log(`📁 Projeto: ${project.title}`);

    // Buscar distribuição para este projeto pelo nome (match parcial)
    const distKey = Object.keys(DISTRIBUTION).find((key) =>
      project.title.toLowerCase().includes(key.toLowerCase())
    );

    let productCodes;
    if (distKey) {
      productCodes = DISTRIBUTION[distKey];
    } else {
      // Projeto in-progress não mapeado: usar todos os produtos ainda não vinculados
      const existing = await p.projectProduct.findMany({
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

      const { ppCreated, tasksGenerated, tasksSkipped } = await linkProductToProject({
        project,
        product,
        allTasks: allTaskLinks,
      });

      if (ppCreated) {
        console.log(`  ✓  NOVO vínculo: ${product.name}`);
        console.log(`       → Tarefas criadas: ${tasksGenerated} | já existiam: ${tasksSkipped}`);
        totalPPCreated++;
        totalTasksGenerated += tasksGenerated;
        totalTasksSkipped += tasksSkipped;
      } else {
        console.log(`  →   Já vinculado: ${product.name} (${tasksSkipped} tarefa(s) existentes; ${tasksGenerated} criadas agora)`);
        totalPPSkipped++;
        totalTasksGenerated += tasksGenerated;
        totalTasksSkipped += tasksSkipped;
      }
    }
  }

  // 4. Relatório final
  console.log(`\n${"=".repeat(60)}`);
  console.log("  RELATÓRIO FINAL");
  console.log(`${"=".repeat(60)}`);

  // Contagens finais diretas do banco
  const finalPP = await p.projectProduct.count();
  const finalTasks = await p.projectTask.count();
  const finalByStatus = await p.projectTask.groupBy({
    by: ["status"],
    _count: { id: true },
    orderBy: { status: "asc" },
  });

  console.log(`\nProjetos in-progress encontrados  : ${inProgressProjects.length}`);
  console.log(`Projetos que receberam produtos    : ${inProgressProjects.length - ignoredProjects.length}`);
  console.log(`Vínculos novos criados             : ${totalPPCreated}`);
  console.log(`Vínculos já existentes (pulados)   : ${totalPPSkipped}`);
  console.log(`Tarefas em execução criadas agora  : ${totalTasksGenerated}`);
  console.log(`Tarefas já existentes (puladas)    : ${totalTasksSkipped}`);
  if (ignoredProjects.length > 0) {
    console.log(`Projetos ignorados: ${ignoredProjects.join(", ")}`);
  }
  console.log(`\nTotais finais no banco:`);
  console.log(`  ProjectProducts total : ${finalPP}`);
  console.log(`  ProjectTasks total    : ${finalTasks}`);
  console.log(`  Por status:`);
  finalByStatus.forEach((s) =>
    console.log(`    ${s.status.padEnd(22)} : ${s._count.id}`)
  );
  console.log(`\n✅  Seed concluído com sucesso!`);
}

main()
  .catch((e) => {
    console.error("\n❌  Erro durante o seed:", e.message || e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
