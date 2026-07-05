/**
 * DIAGNOSTIC SCRIPT — READ ONLY — NO WRITES — TEMPORÁRIO
 * Finalidade: contar dados existentes por projeto para identificar gaps de cobertura QA.
 * Remover após o diagnóstico.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

async function main() {
  console.log("\n========== DIAGNÓSTICO DO BANCO (SOMENTE LEITURA) ==========\n");

  const [
    totalProjects,
    totalProducts,
    totalProjectProducts,
    totalProjectTasks,
    totalStages,
    totalBriefingAnswers,
    totalAttachments,
    totalInvoices,
    totalPayments,
    totalCompanies,
    totalUsers,
    totalNomades,
    totalCatalogTasks,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.product.count(),
    prisma.projectProduct.count(),
    prisma.projectTask.count(),
    prisma.projectTaskStage.count(),
    prisma.taskBriefingAnswer.count(),
    prisma.taskAttachment.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.company.count(),
    prisma.user.count(),
    prisma.nomade.count(),
    prisma.catalogTask.count(),
  ]);

  console.log("── Contagens Globais ─────────────────────────────────────────");
  console.log(`  Projects:            ${totalProjects}`);
  console.log(`  Products (catálogo): ${totalProducts}`);
  console.log(`  ProjectProducts:     ${totalProjectProducts}`);
  console.log(`  ProjectTasks:        ${totalProjectTasks}`);
  console.log(`  ProjectTaskStages:   ${totalStages}`);
  console.log(`  BriefingAnswers:     ${totalBriefingAnswers}`);
  console.log(`  TaskAttachments:     ${totalAttachments}`);
  console.log(`  Invoices:            ${totalInvoices}`);
  console.log(`  Payments:            ${totalPayments}`);
  console.log(`  Companies:           ${totalCompanies}`);
  console.log(`  Users:               ${totalUsers}`);
  console.log(`  Nomades:             ${totalNomades}`);
  console.log(`  CatalogTasks:        ${totalCatalogTasks}`);

  const byStatus = await prisma.project.groupBy({ by: ["status"], _count: true, orderBy: { _count: { status: "desc" } } });
  console.log("\n── Projetos por Status ───────────────────────────────────────");
  for (const row of byStatus) console.log(`  ${row.status.padEnd(25)} ${row._count}`);

  const byLifecycle = await prisma.project.groupBy({ by: ["lifecycle"], _count: true });
  console.log("\n── Projetos por Lifecycle ────────────────────────────────────");
  for (const row of byLifecycle) console.log(`  ${String(row.lifecycle ?? "null").padEnd(25)} ${row._count}`);

  const projects = await prisma.project.findMany({
    select: {
      id: true, title: true, status: true, lifecycle: true,
      agency: true, client_id: true, value: true, start_date: true, end_date: true,
      _count: { select: { products: true, task_executions: true, invoices: true } },
    },
    orderBy: { created_at: "asc" },
    take: 50,
  });

  console.log("\n── Detalhe por Projeto (até 50) ──────────────────────────────");
  console.log("  # | Status                   | LC      | Prod | Task | Inv | Título");
  console.log("  --+-------------------------+---------+------+------+-----+-------");
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const idx = String(i + 1).padStart(3);
    const status = p.status.padEnd(25);
    const lc = (p.lifecycle ?? "—").padEnd(9);
    const prod = String(p._count.products).padStart(4);
    const tasks = String(p._count.task_executions).padStart(5);
    const inv = String(p._count.invoices).padStart(4);
    const title = (p.title ?? "").substring(0, 42);
    console.log(`  ${idx}| ${status}| ${lc}| ${prod}| ${tasks}| ${inv}| ${title}`);
  }

  const tasksByStatus = await prisma.projectTask.groupBy({ by: ["status"], _count: true, orderBy: { _count: { status: "desc" } } });
  console.log("\n── ProjectTasks por Status ───────────────────────────────────");
  for (const row of tasksByStatus) console.log(`  ${row.status.padEnd(38)} ${row._count}`);

  const attByType = await prisma.taskAttachment.groupBy({ by: ["type"], _count: true }).catch(() => []);
  console.log("\n── Attachments por Tipo ──────────────────────────────────────");
  for (const row of attByType) console.log(`  ${String(row.type ?? "null").padEnd(20)} ${row._count}`);

  const invByStatus = await prisma.invoice.groupBy({ by: ["status"], _count: true, _sum: { amount: true } }).catch(() => []);
  console.log("\n── Invoices por Status ───────────────────────────────────────");
  for (const row of invByStatus) {
    const total = (row._sum?.amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    console.log(`  ${String(row.status).padEnd(15)} count=${row._count}  total=${total}`);
  }

  const payByStatus = await prisma.payment.groupBy({ by: ["status"], _count: true }).catch(() => []);
  console.log("\n── Payments por Status ───────────────────────────────────────");
  for (const row of payByStatus) console.log(`  ${String(row.status ?? "null").padEnd(20)} ${row._count}`);

  const projWithoutProducts = await prisma.project.count({ where: { products: { none: {} } } });
  const projWithoutTasks    = await prisma.project.count({ where: { task_executions: { none: {} } } });
  const projWithoutInvoices = await prisma.project.count({ where: { invoices: { none: {} } } });
  const tasksWithoutBriefing    = await prisma.projectTask.count({ where: { briefing_answers: { none: {} } } });
  const tasksWithoutAttachments = await prisma.projectTask.count({ where: { attachments: { none: {} } } });
  const companiesWithProjects   = await prisma.company.count({ where: { projects: { some: {} } } });

  console.log("\n── Lacunas de Dados ──────────────────────────────────────────");
  console.log(`  Projetos SEM produtos vinculados:       ${projWithoutProducts}`);
  console.log(`  Projetos SEM tarefas geradas:           ${projWithoutTasks}`);
  console.log(`  Projetos SEM faturas (invoices):        ${projWithoutInvoices}`);
  console.log(`  Tarefas SEM briefing respondido:        ${tasksWithoutBriefing}`);
  console.log(`  Tarefas SEM anexos:                     ${tasksWithoutAttachments}`);
  console.log(`  Empresas COM projetos: ${companiesWithProjects} / ${totalCompanies}`);

  console.log("\n=============================================================\n");
  console.log("✅  Script finalizado. Nenhum dado foi alterado.\n");
}

main()
  .catch((e) => { console.error("❌  Erro:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
