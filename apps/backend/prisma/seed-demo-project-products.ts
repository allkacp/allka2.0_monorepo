/**
 * seed-demo-project-products.ts
 * Atualiza os 90 ProjectProducts existentes com dados realistas de demonstração.
 *
 * IDEMPOTENTE: rodar N vezes produz o mesmo resultado.
 * NÃO cria ProjectProducts, NÃO apaga ProjectProducts, NÃO cria vínculos novos.
 * NÃO altera: Project, ProjectTask, ProjectTaskStage, BriefingAnswers, Attachments,
 *             Invoices, Payments, Cofre, Log, Dashboard, Dados do Projeto.
 *
 * Uso:
 *   npm --workspace apps/backend run db:seed:demo-project-products -- --dry-run
 *   npm --workspace apps/backend run db:seed:demo-project-products
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["error"] });
const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

// ── Hash determinístico (sem Math.random — garante idempotência) ───────────────
function dh(idx: number, seed: number = 1): number {
  return ((idx * 2654435761 + seed * 40503) >>> 0);
}

function inRange(idx: number, min: number, max: number, seed: number = 1): number {
  if (min >= max) return min;
  return min + (dh(idx, seed) % (max - min + 1));
}

// ── Status do ProjectProduct por status do projeto ────────────────────────────
// draft / negotiation / awaiting-payment / planning → PENDENTE
// in-progress → produto 0 = EM_EXECUCAO, produto 1 = pode ser PENDENTE ou EM_EXECUCAO
// paused → EM_EXECUCAO (estava executando, agora pausado)
// completed → CONCLUIDO
function ppStatusForProject(
  projectStatus: string,
  productIdx: number, // 0 = primeiro produto, 1 = segundo
  projectProgress: number,
): "PENDENTE" | "EM_EXECUCAO" | "CONCLUIDO" | "CANCELADO" {
  switch (projectStatus) {
    case "draft":
    case "negotiation":
    case "awaiting-payment":
    case "planning":
      return "PENDENTE";
    case "in-progress": {
      // Primeiro produto sempre em execução
      if (productIdx === 0) return "EM_EXECUCAO";
      // Segundo produto: em execução se progresso > 40%, senão pendente
      return projectProgress > 40 ? "EM_EXECUCAO" : "PENDENTE";
    }
    case "paused":
      return "EM_EXECUCAO";
    case "completed":
      return "CONCLUIDO";
    default:
      return "PENDENTE";
  }
}

// ── Datas do ProductProduct coerentes com as datas do projeto ──────────────────
function datesForProduct(
  ppStatus: "PENDENTE" | "EM_EXECUCAO" | "CONCLUIDO" | "CANCELADO",
  projectStartDate: Date | null,
  projectEndDate: Date | null,
  productIdx: number,
  projectIdx: number,
): { start_date: Date | null; expected_end_date: Date | null } {
  if (ppStatus === "PENDENTE") {
    return { start_date: null, expected_end_date: null };
  }

  const baseStart = projectStartDate ?? new Date("2025-01-15");

  // Segundo produto começa um pouco depois do primeiro
  const startOffsetDays = productIdx === 0 ? 0 : inRange(projectIdx, 5, 20, 7);
  const start = new Date(baseStart);
  start.setDate(start.getDate() + startOffsetDays);

  if (ppStatus === "CONCLUIDO") {
    // Produto concluído: data de entrega = data de fim do projeto ou próxima dela
    const end = projectEndDate ?? new Date(start);
    if (!projectEndDate) end.setDate(end.getDate() + inRange(projectIdx, 30, 90, 11));
    return { start_date: start, expected_end_date: end };
  }

  // EM_EXECUCAO: entrega esperada no futuro
  const durationDays = inRange(projectIdx * 3 + productIdx, 45, 120, 13);
  const expectedEnd = new Date(start);
  expectedEnd.setDate(expectedEnd.getDate() + durationDays);
  return { start_date: start, expected_end_date: expectedEnd };
}

// ── Divisão de valor entre 2 produtos (soma ≈ project.value) ─────────────────
// Produto 0 = parte maior (55–65%), produto 1 = parte menor (35–45%)
// Arredonda para centena mais próxima
function priceForProduct(
  projectValue: number,
  productIdx: number,
  projectIdx: number,
): number {
  if (projectValue <= 0) return 0;
  const splitPct = inRange(projectIdx, 55, 65, 17); // 55-65 para produto 0
  const pct = productIdx === 0 ? splitPct / 100 : (100 - splitPct) / 100;
  const raw = projectValue * pct;
  // Arredonda para centena mais próxima (mínimo R$100)
  return Math.max(100, Math.round(raw / 100) * 100);
}

// ── Recurrence snapshot ────────────────────────────────────────────────────────
function recurrenceForProject(lifecycle: string): "avulso" | "mensal" {
  return lifecycle === "mensal" ? "mensal" : "avulso";
}

// ── Comissão determinística ────────────────────────────────────────────────────
// Pequeno valor percentual sobre o preço do produto (5–15%)
function comissaoForProduct(preco: number, projectIdx: number): number {
  if (preco <= 0) return 0;
  const pct = inRange(projectIdx, 5, 15, 19) / 100;
  return Math.round(preco * pct / 10) * 10; // arredonda para R$10
}

// ── Guard: não sobrescrever preço já populado ──────────────────────────────────
function hasPrice(v: number): boolean {
  return v > 0;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n========== SEED: Demo Project Products (${DRY_RUN ? "DRY-RUN" : "APPLY"}) ==========\n`,
  );

  // Busca todos os projetos com seus produtos, ordenados por created_at
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      lifecycle: true,
      value: true,
      progress: true,
      start_date: true,
      end_date: true,
      products: {
        select: {
          id: true,
          status: true,
          preco_final_cliente_snapshot: true,
          comissao_snapshot: true,
          pagador_snapshot: true,
          recurrence_snapshot: true,
          product_price_snapshot: true,
          start_date: true,
          expected_end_date: true,
        },
        orderBy: { created_at: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`Projetos encontrados: ${projects.length}`);
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let pi = 0; pi < projects.length; pi++) {
    const project = projects[pi];
    const recurrence = recurrenceForProject(project.lifecycle ?? "avulso");

    for (let di = 0; di < project.products.length; di++) {
      const pp = project.products[di];

      // Status coerente com o projeto
      const newStatus = ppStatusForProject(project.status, di, project.progress);

      // Preço: guarda atual se já populado (não sobrescreve valor bom)
      const newPreco = hasPrice(pp.preco_final_cliente_snapshot)
        ? pp.preco_final_cliente_snapshot
        : priceForProduct(project.value, di, pi);

      // Snapshot de preço base (igual ao preco_final quando nunca foi populado)
      const newPriceSnapshot = hasPrice(pp.product_price_snapshot)
        ? pp.product_price_snapshot
        : newPreco;

      // Comissão
      const newComissao = pp.comissao_snapshot > 0
        ? pp.comissao_snapshot
        : comissaoForProduct(newPreco, pi);

      // Recurrence
      const newRecurrence = pp.recurrence_snapshot ?? recurrence;

      // Datas
      const { start_date, expected_end_date } = datesForProduct(
        newStatus,
        project.start_date,
        project.end_date,
        di,
        pi,
      );

      // Verifica o que mudará
      const statusChanged = pp.status !== newStatus;
      const precoChanged = pp.preco_final_cliente_snapshot !== newPreco;
      const priceSnapChanged = pp.product_price_snapshot !== newPriceSnapshot;
      const comissaoChanged = pp.comissao_snapshot !== newComissao;
      const recurrenceChanged = pp.recurrence_snapshot !== newRecurrence;
      const startChanged =
        (pp.start_date?.getTime() ?? null) !== (start_date?.getTime() ?? null);
      const endChanged =
        (pp.expected_end_date?.getTime() ?? null) !==
        (expected_end_date?.getTime() ?? null);

      const anyChange =
        statusChanged ||
        precoChanged ||
        priceSnapChanged ||
        comissaoChanged ||
        recurrenceChanged ||
        startChanged ||
        endChanged;

      if (!anyChange) {
        totalSkipped++;
        continue;
      }

      const changes: string[] = [];
      if (statusChanged) changes.push(`status ${pp.status}→${newStatus}`);
      if (precoChanged) changes.push(`preco ${pp.preco_final_cliente_snapshot}→${newPreco}`);
      if (priceSnapChanged) changes.push(`priceSnap ${pp.product_price_snapshot}→${newPriceSnapshot}`);
      if (comissaoChanged) changes.push(`comissao ${pp.comissao_snapshot}→${newComissao}`);
      if (recurrenceChanged) changes.push(`recurrence ${pp.recurrence_snapshot}→${newRecurrence}`);
      if (startChanged) changes.push(`start_date →${start_date?.toISOString().slice(0, 10) ?? "null"}`);
      if (endChanged) changes.push(`end_date →${expected_end_date?.toISOString().slice(0, 10) ?? "null"}`);

      console.log(
        `  [${String(pi + 1).padStart(2)}.${di + 1}] ${project.title.substring(0, 35).padEnd(35)} | ${changes.join(" | ")}`,
      );

      if (!DRY_RUN) {
        await prisma.projectProduct.update({
          where: { id: pp.id },
          data: {
            status: newStatus,
            preco_final_cliente_snapshot: newPreco,
            product_price_snapshot: newPriceSnapshot,
            comissao_snapshot: newComissao,
            recurrence_snapshot: newRecurrence,
            start_date,
            expected_end_date,
          },
        });
      }

      totalUpdated++;
    }
  }

  console.log(`\n── Resumo ────────────────────────────────────────────────────`);
  console.log(`  Registros atualizados: ${totalUpdated}`);
  console.log(`  Registros sem mudança: ${totalSkipped}`);

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY-RUN: nenhuma escrita realizada.`);
    console.log(`  Remova --dry-run para aplicar.\n`);
    return;
  }

  // ── Validação pós-seed ─────────────────────────────────────────────────────
  const counts = await prisma.projectProduct.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log(`\n── ProjectProducts por status (pós-seed) ────────────────────`);
  for (const row of counts) {
    console.log(`  ${String(row.status).padEnd(15)} ${row._count}`);
  }

  const withPreco = await prisma.projectProduct.count({
    where: { preco_final_cliente_snapshot: { gt: 0 } },
  });
  const withRecurrence = await prisma.projectProduct.count({
    where: { recurrence_snapshot: { not: null } },
  });
  const withStartDate = await prisma.projectProduct.count({
    where: { start_date: { not: null } },
  });

  const total = await prisma.projectProduct.count();
  console.log(`\n── Cobertura de campos (total ${total} produtos) ─────────────`);
  console.log(`  Com preco_final > 0:      ${withPreco}/${total}`);
  console.log(`  Com recurrence_snapshot:  ${withRecurrence}/${total}`);
  console.log(`  Com start_date:           ${withStartDate}/${total}`);

  console.log(`\n✅  Seed concluído. Nenhum projeto/tarefa foi alterado.\n`);
}

main()
  .catch((e) => {
    console.error("❌  Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
