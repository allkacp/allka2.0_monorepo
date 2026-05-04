/**
 * Validation seed: proves that 1 ProjectTask + 7 ProjectTaskStages
 * are correctly created for a PA0001 "Gestão de Tráfego" project.
 *
 * Usage: npx tsx backend/seed-validate-gestao-trafego.ts
 */
import { PrismaClient } from "@prisma/client";
import { gerarTarefasDoProjeto } from "./src/lib/generate-tasks";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Validação: Gestão de Tráfego (PA0001) ===\n");

  // 1. Verify the CatalogTask PA0001-T01 has the steps JSON
  const ct = await prisma.catalogTask.findUnique({ where: { code: "PA0001-T01" } });
  if (!ct) {
    console.error("❌ CatalogTask PA0001-T01 não encontrado. Execute migrate-tasks.ts primeiro.");
    return;
  }
  let steps = [];
  try {
    steps = ct.steps ? JSON.parse(ct.steps) : [];
  } catch { steps = []; }
  console.log(`CatalogTask: ${ct.code} — "${ct.name}"`);
  console.log(`  steps no DB: ${steps.length} etapas`);
  if (steps.length === 0) {
    console.error("❌ steps está vazio! Execute migrate-tasks.ts para popular o campo steps.");
    return;
  }
  steps.forEach((s, i) => console.log(`  E${String(i+1).padStart(2,'0')}: ${s.name} [${s.responsibleType}]`));

  // 2. Find an agency user for the test project owner
  const agencyUser = await prisma.user.findFirst({
    where: { role: { in: ["agency_admin", "agency_user"] } },
  });
  if (!agencyUser) {
    console.error("❌ Nenhum usuário de agência encontrado para criar o projeto de teste.");
    return;
  }

  // 3. Find or create a test company
  let company = await prisma.company.findFirst({ where: { name: { contains: "Teste Validação" } } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Empresa Teste Validação",
        email: "teste@validacao.com",
        status: "ativo",
      },
    });
    console.log(`\n✅ Company criada: ${company.name} (${company.id})`);
  } else {
    console.log(`\n♻️  Company reutilizada: ${company.name} (${company.id})`);
  }

  // 4. Create a fresh test project
  const project = await prisma.project.create({
    data: {
      title: `Validação Gestão de Tráfego ${Date.now()}`,
      status: "planning",
      client_id: company.id,
    },
  });
  console.log(`✅ Projeto criado: "${project.title}" (id=${project.id})`);

  // 5. Link PA0001 product to the project
  const product = await prisma.product.findUnique({ where: { id: "PA0001" } });
  if (!product) {
    console.error("❌ Produto PA0001 não encontrado. Execute seed-all-products primeiro.");
    return;
  }

  const pp = await prisma.projectProduct.create({
    data: {
      project_id: project.id,
      product_id: "PA0001",
      product_name_snapshot: product.name,
      product_category_snapshot: product.category,
      status: "PENDENTE",
    },
  });
  console.log(`✅ ProjectProduct criado: PA0001 → projeto (pp.id=${pp.id})`);

  // 6. Run generate-tasks (same logic as payment trigger)
  console.log("\n--- Executando gerarTarefasDoProjeto ---");
  const result = await gerarTarefasDoProjeto(project.id);
  console.log(`  generated: ${result.generated} tarefas`);
  console.log(`  skipped:   ${result.skipped} tarefas`);
  console.log(`  stages:    ${result.stages_generated} etapas`);
  if (result.warnings.length > 0) result.warnings.forEach((w) => console.warn("  AVISO:", w));

  // 7. Load and display the task + stages
  const tasks = await prisma.projectTask.findMany({
    where: { project_id: project.id },
    include: {
      stages: { orderBy: { ordem: "asc" } },
    },
  });

  console.log(`\n=== RESULTADO ===`);
  console.log(`Tarefas criadas: ${tasks.length} (esperado: 1)`);
  if (tasks.length !== 1) console.error("❌ Deveria haver exatamente 1 tarefa!");
  else console.log("✅ 1 tarefa criada corretamente");

  for (const task of tasks) {
    console.log(`\nTarefa: "${task.title}" (status=${task.status})`);
    console.log(`  task_code:         ${task.task_code}`);
    console.log(`  catalog_task_id:   ${task.catalog_task_id}`);
    console.log(`  category_snapshot: ${task.category_snapshot}`);
    console.log(`  Etapas: ${task.stages.length} (esperado: 7)`);
    if (task.stages.length !== 7) console.error("❌ Deveria haver exatamente 7 etapas!");
    else console.log("✅ 7 etapas criadas corretamente");

    task.stages.forEach((s, i) => {
      console.log(`    ${i+1}. [${s.status}] ${s.titulo} (ref=${s.catalog_step_ref})`);
    });
  }

  // 8. Cleanup: delete the test project and related data
  await prisma.project.delete({ where: { id: project.id } });
  console.log(`\n🧹 Projeto de teste removido (cascade delete).`);
  console.log("\n=== Validação concluída ===");
}

main()
  .catch((err) => { console.error("ERRO:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
