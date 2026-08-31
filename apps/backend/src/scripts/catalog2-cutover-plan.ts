/**
 * PLANO DE VIRADA do catálogo (sprint de produtos, bloco 4/6) — SOMENTE
 * DRY-RUN. Descreve o que uma futura virada faria; NÃO altera nada.
 *
 *   npm run catalog2:cutover-plan
 *   npm run catalog2:cutover-plan -- --json
 *
 * Regras deste bloco:
 *   • NÃO desativa nenhum dos 162 produtos operacionais;
 *   • NÃO publica nenhum dos 36 produtos novos;
 *   • NÃO executa a virada — só imprime o plano.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function has(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

async function main() {
  // ── Lado OPERACIONAL (os 162) ────────────────────────────────────────
  const [operationalTotal, operationalActive] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { is_active: true } }).catch(() => db.product.count()),
  ]);
  const operationalSample = await db.product.findMany({
    take: 10,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // ── Lado NOVO CATÁLOGO (os 36 importados) ────────────────────────────
  const importOrigins = await db.catalog2ProductImportOrigin.findMany({
    include: { product: { include: { versions: { select: { state: true } } } } },
  });
  const imported = importOrigins.length;
  const ready = importOrigins.filter(
    (o) => o.review_state === "ready_for_final_review" || o.review_state === "ready_for_publication",
  );
  const withPendency = importOrigins.filter(
    (o) => o.review_state !== "ready_for_final_review" && o.review_state !== "ready_for_publication",
  );
  const published = importOrigins.filter((o) => o.product.versions.some((v) => v.state === "publicada"));

  const byState: Record<string, number> = {};
  for (const o of importOrigins) byState[o.review_state] = (byState[o.review_state] ?? 0) + 1;

  const plan = {
    generated_at: new Date().toISOString(),
    can_apply: false,
    note: "Plano de virada — SOMENTE leitura. Nada foi alterado. A virada não é executada neste bloco.",
    legacy_side: {
      operational_products_total: operationalTotal,
      operational_products_active: operationalActive,
      would_stay_consultable_in_legacy: operationalTotal,
      would_be_deactivated_operationally: operationalActive,
      explanation:
        "Na virada, os produtos operacionais deixariam de ser vendáveis, mas continuariam consultáveis em Legacy (histórico preservado). Este bloco NÃO faz isso.",
      sample: operationalSample,
    },
    new_catalog_side: {
      imported_products: imported,
      expected: 36,
      count_matches_expected: imported === 36,
      ready_for_final_review: ready.length,
      with_open_pendency: withPendency.length,
      already_published: published.length,
      by_review_state: byState,
      would_be_published_on_cutover: 0,
      explanation:
        "Nenhum dos 36 é publicado nesta fase. Uma futura virada publicaria apenas os que estivessem prontos (sem pendência obrigatória) e após revisão final humana.",
      pending_list: withPendency
        .sort((a, b) => a.source_index - b.source_index)
        .map((o) => ({ source_index: o.source_index, name: o.source_name, review_state: o.review_state })),
    },
    what_stays_in_legacy: [
      `${operationalTotal} produtos operacionais (consulta histórica read-only)`,
      "Snapshots da plataforma anterior (924 registros de produto + relacionados) — inalterados",
    ],
    what_this_block_does_NOT_do: [
      "Não desativa os 162 produtos operacionais",
      "Não publica nenhum dos 36 produtos novos",
      "Não executa a virada do catálogo",
      "Não altera o banco Legacy",
    ],
  };

  if (has("json")) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  console.log("\n════════ PLANO DE VIRADA DO CATÁLOGO (DRY-RUN) ════════\n");
  console.log("  ⚠  Somente leitura. Nada foi alterado. A virada NÃO é executada aqui.\n");
  console.log("  ── Lado operacional (os 162) ──");
  console.log(`   • Produtos operacionais: ${operationalTotal} (ativos: ${operationalActive})`);
  console.log(`   • Ficariam consultáveis em Legacy: ${operationalTotal}`);
  console.log(`   • Seriam desativados para venda numa virada: ${operationalActive}  (NÃO agora)`);
  console.log("\n  ── Lado novo catálogo (os 36) ──");
  console.log(`   • Importados: ${imported} / 36  ${imported === 36 ? "✓" : "✗"}`);
  console.log(`   • Prontos para revisão final: ${ready.length}`);
  console.log(`   • Com pendência aberta: ${withPendency.length}`);
  console.log(`   • Já publicados: ${published.length}  (esperado: 0)`);
  console.log(`   • Seriam publicados na virada: 0 (só após revisão final humana)`);
  console.log("\n   Por estado de preparo:");
  for (const [k, v] of Object.entries(byState)) console.log(`     - ${k}: ${v}`);
  if (withPendency.length) {
    console.log("\n   Produtos com pendência (não subiriam na virada):");
    for (const o of plan.new_catalog_side.pending_list) console.log(`     #${o.source_index} ${o.name} — ${o.review_state}`);
  }
  console.log("\n  ── O que permanece em Legacy ──");
  for (const s of plan.what_stays_in_legacy) console.log(`   • ${s}`);
  console.log("\n  ── O que este bloco NÃO faz ──");
  for (const s of plan.what_this_block_does_NOT_do) console.log(`   • ${s}`);
  console.log("\n────────────────────────────────────────────");
  console.log("Plano apenas. Rode nada mais — a virada é de um bloco futuro.\n");
}

main()
  .catch((err) => {
    console.error("❌", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
