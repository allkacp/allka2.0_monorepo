/**
 * PLANO DE VIRADA COMERCIAL do catalog2 (sprint de produtos, bloco 6/6) —
 * SOMENTE DRY-RUN. Distinto de catalog2-cutover-plan.ts (que audita só o
 * CATÁLOGO — publicação dos 36); este cobre os pré-requisitos do FLUXO
 * COMERCIAL (checkout → pedido → tarefas) antes de uma futura virada real.
 *
 *   npm run catalog2:commercial-cutover-plan
 *   npm run catalog2:commercial-cutover-plan -- --json
 *   npm run catalog2:commercial-cutover-plan -- --apply --confirm="SIM, EU CONFIRMO A VIRADA COMERCIAL DO CATALOGO2"
 *
 * Regras deste bloco (nunca flexibilizar):
 *   • NÃO desativa nenhum dos 162 produtos operacionais;
 *   • NÃO publica nenhum dos 36 produtos novos;
 *   • NÃO executa a virada — mesmo com --apply e a frase exata, a ação real
 *     de flip é NO-OP nesta versão do código (ver bloco final do main()).
 *     A decisão de negócio "publicar os 36 e desativar os 162 para novas
 *     vendas" fica para um bloco futuro, fora desta sessão.
 */
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";

const db = new PrismaClient();

const CONFIRM_PHRASE = "SIM, EU CONFIRMO A VIRADA COMERCIAL DO CATALOGO2";

function has(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}
function argValue(flag: string): string | null {
  const prefix = `--${flag}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function buildPlan() {
  const blockers: string[] = [];

  // ── 1. Os 36: prontos e publicados ───────────────────────────────────────
  const origins = await db.catalog2ProductImportOrigin.findMany({
    include: { product: { include: { versions: { orderBy: { version_number: "desc" }, take: 1 } } } },
  });
  const notReady = origins.filter((o) => o.review_state !== "ready_for_publication");
  const notPublished = origins.filter((o) => o.product.published_version_id == null);
  if (notReady.length > 0) blockers.push(`${notReady.length}/36 produtos ainda não estão "ready_for_publication".`);
  if (notPublished.length > 0) blockers.push(`${notPublished.length}/36 produtos ainda não têm versão publicada.`);

  // ── 2. Preço/prazo comercial completos nas versões publicadas ────────────
  const publishedVersionIds = origins
    .map((o) => o.product.published_version_id)
    .filter((id): id is string => !!id);
  const publishedVersions = publishedVersionIds.length
    ? await db.catalog2ProductVersion.findMany({
        where: { id: { in: publishedVersionIds } },
        select: { id: true, base_commercial_deadline_days: true, _count: { select: { tasks: true } } },
      })
    : [];
  const withoutDeadline = publishedVersions.filter((v) => v.base_commercial_deadline_days == null);
  const withoutTasks = publishedVersions.filter((v) => v._count.tasks === 0);
  if (withoutDeadline.length > 0) blockers.push(`${withoutDeadline.length} versão(ões) publicada(s) sem prazo comercial base definido.`);
  if (withoutTasks.length > 0) blockers.push(`${withoutTasks.length} versão(ões) publicada(s) sem nenhuma tarefa (checkout geraria pedido vazio).`);

  // ── 3. Configuração comercial completa ───────────────────────────────────
  const pricingSettings = await db.catalog2PricingSettings.findUnique({ where: { id: "default" } });
  const pricingComplete =
    !!pricingSettings &&
    pricingSettings.tax_percent != null &&
    pricingSettings.commission_percent != null &&
    pricingSettings.operational_fee_percent != null &&
    pricingSettings.profit_margin_percent != null &&
    !!pricingSettings.component_order_json;
  if (!pricingComplete) blockers.push("Configuração comercial (percentuais + ordem de incidência) incompleta.");

  // ── 4. Pendências obrigatórias resolvidas ────────────────────────────────
  const withPendency = origins.filter((o) => {
    if (!o.pendencies_json) return false;
    try {
      const arr = JSON.parse(o.pendencies_json);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return false;
    }
  });
  if (withPendency.length > 0) blockers.push(`${withPendency.length}/36 produtos ainda com pendência obrigatória aberta.`);

  // ── 5. Legacy intacto ─────────────────────────────────────────────────────
  const operationalTotal = await db.product.count();
  const legacyIntact = operationalTotal === 162;
  if (!legacyIntact) blockers.push(`Contagem de produtos operacionais é ${operationalTotal}, esperado 162 — Legacy pode ter sido alterado.`);

  // ── 6. Migrations verdes ─────────────────────────────────────────────────
  const pendingMigrations: Array<{ migration_name: string }> = await db.$queryRawUnsafe(
    `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL`,
  );
  if (pendingMigrations.length > 0) {
    blockers.push(`${pendingMigrations.length} migration(ões) não finalizada(s)/revertida(s) na árvore (ver _prisma_migrations).`);
  }

  // ── 7. Backup — não verificável por script; sempre exigido manualmente ──
  blockers.push("Confirmação de backup do banco: não verificável automaticamente — exige confirmação manual do operador.");

  // ── 8. Órfãs de cotação sem validade ─────────────────────────────────────
  const orphanQuotes = await db.catalog2Quote.count({ where: { status: "valida", valid_until: null } });
  if (orphanQuotes > 0) blockers.push(`${orphanQuotes} cotação(ões) "valida" sem valid_until definido (dado inconsistente).`);

  const can_apply = blockers.length === 1 && blockers[0].startsWith("Confirmação de backup");

  return {
    generated_at: new Date().toISOString(),
    can_apply,
    note: "Plano de virada COMERCIAL — SOMENTE leitura. Nada foi alterado. Mesmo com --apply e a frase exata, a ação real de flip é NO-OP nesta versão do código (ver seção 'apply' abaixo).",
    checks: {
      products_ready_and_published: notReady.length === 0 && notPublished.length === 0,
      pricing_complete: pricingComplete,
      no_open_pendencies: withPendency.length === 0,
      legacy_intact: legacyIntact,
      migrations_green: pendingMigrations.length === 0,
      no_orphan_quotes: orphanQuotes === 0,
    },
    blockers,
    legacy_side: { operational_products_total: operationalTotal, expected: 162, intact: legacyIntact },
    what_this_block_does_NOT_do: [
      "Não desativa os 162 produtos operacionais",
      "Não publica nenhum dos 36 produtos novos",
      "Não executa a virada comercial — mesmo com --apply, é NO-OP nesta versão",
      "Não altera o banco Legacy",
    ],
  };
}

async function main() {
  assertLocalDatabase(process.env.DATABASE_URL);
  const plan = await buildPlan();

  if (has("json")) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log("\n════════ PLANO DE VIRADA COMERCIAL DO CATALOGO2 (DRY-RUN) ════════\n");
    console.log(`  can_apply (pré-requisitos técnicos): ${plan.can_apply ? "SIM" : "NÃO"}`);
    console.log("\n  ── Bloqueadores ──");
    for (const b of plan.blockers) console.log(`   • ${b}`);
    console.log("\n  ── O que este script NÃO faz ──");
    for (const s of plan.what_this_block_does_NOT_do) console.log(`   • ${s}`);
    console.log("\n────────────────────────────────────────────\n");
  }

  if (has("apply")) {
    const confirm = argValue("confirm");
    if (confirm !== CONFIRM_PHRASE) {
      console.error(`\n❌ --apply recusado: frase de confirmação ausente ou incorreta. Esperado exatamente:\n   "${CONFIRM_PHRASE}"\n`);
      process.exit(1);
    }
    if (!plan.can_apply) {
      console.error("\n❌ --apply recusado: existem bloqueadores técnicos pendentes (ver lista acima).\n");
      process.exit(1);
    }
    // Mesmo com tudo aprovado e a frase exata: a ação real de virada
    // (publicar os 36, desativar os 162 para novas vendas) é uma decisão de
    // negócio que fica para um bloco futuro. Este script, nesta versão,
    // NUNCA aplica — é intencionalmente NO-OP mesmo aqui.
    console.log("\n⚠️  Pré-requisitos técnicos OK e frase confirmada — mas a aplicação real fica para um bloco futuro.");
    console.log("Nenhuma alteração foi feita ao banco. Este script nunca executa a virada nesta versão.\n");
  }
}

main()
  .catch((err) => {
    console.error("❌", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
