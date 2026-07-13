/**
 * restore-data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Script mestre de restauração de dados reais da plataforma Allka.
 *
 * Execute APÓS qualquer `prisma migrate dev` ou `prisma migrate reset` para
 * garantir que produtos, modelos de tarefas e tarefas operacionais estejam
 * presentes no banco.
 *
 * Uso:
 *   cd apps/backend && npx tsx restore-data.ts
 *
 * O que faz (em ordem):
 *   1. Restaura todos os produtos reais (seed-all-products.ts)
 *   2. Cria modelos de tarefas e vincula a produtos (migrate-tasks.ts)
 *   3. Vincula produtos a projetos em andamento e gera tarefas operacionais
 *      (src/scripts/seed-in-progress.ts) — apenas se não existirem tarefas ainda
 *
 * Todos os passos são idempotentes: podem ser executados múltiplas vezes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import path from "path";

const prisma = new PrismaClient();

function run(label: string, cmd: string): void {
  console.log(`\n▶  ${label}`);
  console.log(`   $ ${cmd}`);
  try {
    execSync(cmd, {
      cwd: path.resolve(__dirname),
      stdio: "inherit",
    });
    console.log(`✅  ${label} concluído`);
  } catch (err: any) {
    console.error(`❌  Falha em "${label}":`, err.message ?? err);
    process.exit(1);
  }
}

async function checkCounts() {
  const [products, catalogTasks, projectTasks, projects] = await Promise.all([
    prisma.product.count(),
    prisma.catalogTask.count(),
    prisma.projectTask.count(),
    prisma.project.count(),
  ]);
  return { products, catalogTasks, projectTasks, projects };
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🔄  Allka — Restauração de Dados Reais");
  console.log("═══════════════════════════════════════════════════");

  const before = await checkCounts();
  console.log("\n📊 Estado atual:");
  console.log(`   Produtos       : ${before.products}`);
  console.log(`   Modelos tarefa : ${before.catalogTasks}`);
  console.log(`   Tarefas operat.: ${before.projectTasks}`);
  console.log(`   Projetos       : ${before.projects}`);

  // ── Passo 1: Produtos ────────────────────────────────────────────────────
  if (before.products === 0) {
    run("Restaurar produtos reais", "npx tsx seed-all-products.ts");
  } else {
    // Roda mesmo assim para garantir sincronização de variações/addons
    run("Sincronizar produtos reais", "npx tsx seed-all-products.ts");
  }

  // ── Passo 2: Modelos de tarefas ──────────────────────────────────────────
  run("Restaurar modelos de tarefas", "npx tsx migrate-tasks.ts");

  // ── Passo 3: Tarefas operacionais ────────────────────────────────────────
  const afterStep2 = await checkCounts();
  if (afterStep2.projectTasks === 0 && afterStep2.projects > 0) {
    run(
      "Gerar tarefas operacionais (projetos em andamento)",
      "npx tsx src/scripts/seed-in-progress.ts",
    );
  } else if (afterStep2.projectTasks > 0) {
    console.log(
      `\n⏩  Tarefas operacionais já existem (${afterStep2.projectTasks}). Pulando geração.`,
    );
  }

  // ── Relatório final ──────────────────────────────────────────────────────
  const after = await checkCounts();
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  ✅  Restauração concluída — estado final:");
  console.log(`   Produtos       : ${after.products}`);
  console.log(`   Modelos tarefa : ${after.catalogTasks}`);
  console.log(`   Tarefas operat.: ${after.projectTasks}`);
  console.log(`   Projetos       : ${after.projects}`);

  const warnings: string[] = [];
  if (after.products === 0) warnings.push("Nenhum produto restaurado");
  if (after.catalogTasks === 0)
    warnings.push("Nenhum modelo de tarefa restaurado");

  if (warnings.length > 0) {
    console.log("\n⚠️  Avisos:");
    warnings.forEach((w) => console.log(`   - ${w}`));
  }
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .catch((err) => {
    console.error("❌ Erro fatal na restauração:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
