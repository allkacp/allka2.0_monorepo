/**
 * VIRADA COMERCIAL do catalog2 (sprint de produtos, fechamento técnico) —
 * dry-run por padrão; `--apply` está REALMENTE implementado (não é mais
 * NO-OP), mas só roda quando TODAS as condições abaixo forem verdadeiras ao
 * mesmo tempo. Distinto de catalog2-cutover-plan.ts (que audita só o
 * CATÁLOGO — publicação dos 36); este cobre o fluxo COMERCIAL inteiro.
 *
 *   npm run catalog2:commercial-cutover-plan
 *   npm run catalog2:commercial-cutover-plan -- --json
 *   npm run catalog2:commercial-cutover-plan -- --apply --confirm="SIM, EU CONFIRMO A VIRADA COMERCIAL DO CATALOGO2" --actor=<email> --backup-confirmed
 *   npm run catalog2:commercial-cutover-plan -- --reverse=<batchId> --actor=<email> --reason="..."
 *
 * O que --apply faz de verdade quando permitido:
 *   • desativa (Product.is_active=false) os produtos operacionais então
 *     ativos — NUNCA exclui nenhum; Legacy continua consultável sem mudança;
 *   • registra um Catalog2CutoverBatch (autor, data, contagens, checksum dos
 *     ids afetados) — é o próprio "feature flag": a EXISTÊNCIA de um lote
 *     sem `reversed_at` é o que sinaliza "catalog2 é o catálogo principal";
 *   • é idempotente — rodar de novo com um lote já ativo não desativa nada
 *     de novo, só informa o lote existente.
 * O que --apply NUNCA faz: publicar os 36 (decisão de conteúdo/comercial
 * fora deste script), mexer no banco Legacy, ou prometer reverter pedidos
 * já criados.
 *
 * Barreira de ambiente (independente da frase de confirmação): exige a
 * variável de ambiente ALLOW_CATALOG2_CUTOVER_APPLY com o valor exato
 * "yes-i-know-this-is-disposable" — nunca definida em .env/.env.example
 * deste repo. Sem ela, --apply é recusado mesmo com tudo mais correto.
 */
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { assertLocalDatabase } from "../lib/assert-local-database";

const db = new PrismaClient();

const CONFIRM_PHRASE = "SIM, EU CONFIRMO A VIRADA COMERCIAL DO CATALOGO2";
const ENV_GATE_VALUE = "yes-i-know-this-is-disposable";

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
  const operationalProducts = await db.product.findMany({ select: { id: true, is_active: true } });
  const operationalTotal = operationalProducts.length;
  const operationalActive = operationalProducts.filter((p) => p.is_active).map((p) => p.id);
  const legacyIntact = operationalTotal === 162;
  if (!legacyIntact) blockers.push(`Contagem de produtos operacionais é ${operationalTotal}, esperado 162 — Legacy pode ter sido alterado.`);

  // ── 6. Migrations verdes ─────────────────────────────────────────────────
  // Conta por NOME de migration, não por linha: uma migration que falhou
  // numa tentativa e foi corretamente resolvida numa segunda (padrão já
  // usado neste repo — ver docs/migrations-baseline-gap.md) tem 2 linhas,
  // uma delas sempre com finished_at NULL; isso não é mais um bloqueador.
  let pendingMigrations: Array<{ migration_name: string }> = [];
  try {
    pendingMigrations = await db.$queryRawUnsafe(
      `SELECT migration_name FROM _prisma_migrations GROUP BY migration_name HAVING SUM(CASE WHEN finished_at IS NOT NULL THEN 1 ELSE 0 END) = 0`,
    );
  } catch {
    // Banco provisionado via `prisma db push` (típico de banco descartável
    // de teste) nunca cria `_prisma_migrations` — não é um bloqueador real,
    // só não há histórico de migration pra checar nesta forma de banco.
  }
  if (pendingMigrations.length > 0) {
    blockers.push(`${pendingMigrations.length} migration(ões) sem NENHUMA execução bem-sucedida na árvore (ver _prisma_migrations): ${pendingMigrations.map((m) => m.migration_name).join(", ")}.`);
  }

  // ── 7. Backup — não verificável por script; sempre exigido manualmente ──
  blockers.push("Confirmação de backup do banco: não verificável automaticamente — exige a flag --backup-confirmed do operador.");

  // ── 8. Órfãs de cotação sem validade ─────────────────────────────────────
  const orphanQuotes = await db.catalog2Quote.count({ where: { status: "valida", valid_until: null } });
  if (orphanQuotes > 0) blockers.push(`${orphanQuotes} cotação(ões) "valida" sem valid_until definido (dado inconsistente).`);

  // ── 9. Já existe um lote ativo? ──────────────────────────────────────────
  const activeBatch = await db.catalog2CutoverBatch.findFirst({
    where: { reversed_at: null },
    orderBy: { applied_at: "desc" },
  });

  const publishedCatalog2Count = await db.catalog2Product.count({ where: { published_version_id: { not: null } } });

  const backupBlockerOnly = blockers.length === 1 && blockers[0].startsWith("Confirmação de backup");
  const can_apply = backupBlockerOnly && !activeBatch;

  return {
    generated_at: new Date().toISOString(),
    can_apply,
    already_applied: !!activeBatch,
    active_batch: activeBatch,
    note: "Plano de virada COMERCIAL. --apply está implementado de verdade, mas só roda com TODAS as condições da seção 'Aplicação' satisfeitas simultaneamente.",
    checks: {
      products_ready_and_published: notReady.length === 0 && notPublished.length === 0,
      pricing_complete: pricingComplete,
      no_open_pendencies: withPendency.length === 0,
      legacy_intact: legacyIntact,
      migrations_green: pendingMigrations.length === 0,
      no_orphan_quotes: orphanQuotes === 0,
      no_active_batch_yet: !activeBatch,
    },
    blockers,
    legacy_side: {
      operational_products_total: operationalTotal,
      operational_products_active: operationalActive.length,
      expected: 162,
      intact: legacyIntact,
      would_be_deactivated_for_new_sales: activeBatch ? 0 : operationalActive.length,
      note: "Desativação = Product.is_active=false. NUNCA exclusão. Consulta permanece disponível via Legacy (banco separado, intocado) e via histórico do próprio produto.",
    },
    new_catalog_side: {
      published_now: publishedCatalog2Count,
      would_be_activated_as_primary: publishedCatalog2Count,
    },
    routes_that_would_change: [
      "/company/produtos, /agency/catalogo (catálogo operacional legado) — passariam a mostrar aviso 'produto novo? veja o Catálogo 2.0' em vez de sumir (produtos já contratados continuam geridos normalmente)",
      "/company/catalog2, /agency/catalog2 — passariam a ser o destino padrão dos links de 'novo pedido' no menu (hoje coexistem sem prioridade)",
    ],
    feature_flag: {
      mechanism: "Catalog2CutoverBatch sem reversed_at = catalog2 é o catálogo principal. Nenhuma variável de ambiente nem arquivo de config — o próprio registro no banco é o flag, auditável e reversível.",
    },
    reversal: {
      how: "npm run catalog2:commercial-cutover-plan -- --reverse=<batchId> --actor=<email> --reason=\"...\"",
      what_it_does: "Reativa (is_active=true) exatamente os produtos que este lote desativou (lista congelada em affected_product_ids_json) e marca reversed_at/reversed_by/reversal_note.",
      what_it_never_promises: "Nunca reverte pedidos, projetos, tarefas ou pagamentos já criados enquanto a virada estava em vigor — reversão é só do estado do catálogo.",
    },
    what_this_block_does_NOT_do: [
      "Não desativa os 162 produtos operacionais SEM --apply explícito e todas as condições satisfeitas",
      "Não publica nenhum dos 36 produtos novos (decisão de conteúdo/comercial, fora deste script)",
      "Não altera o banco Legacy",
      "Não promete reverter pedidos já criados durante a virada",
    ],
  };
}

async function applyPlan(plan: Awaited<ReturnType<typeof buildPlan>>) {
  const confirm = argValue("confirm");
  if (confirm !== CONFIRM_PHRASE) {
    console.error(`\n❌ --apply recusado: frase de confirmação ausente ou incorreta. Esperado exatamente:\n   "${CONFIRM_PHRASE}"\n`);
    process.exitCode = 1;
    return;
  }
  if (process.env.ALLOW_CATALOG2_CUTOVER_APPLY !== ENV_GATE_VALUE) {
    console.error(
      `\n❌ --apply recusado: ambiente não permitido explicitamente. Defina ALLOW_CATALOG2_CUTOVER_APPLY=${ENV_GATE_VALUE} (nunca em .env versionado) antes de rodar — proteção extra além da frase de confirmação.\n`,
    );
    process.exitCode = 1;
    return;
  }
  if (!has("backup-confirmed")) {
    console.error("\n❌ --apply recusado: falta a flag --backup-confirmed (o script não verifica backup real — só exige que o operador atteste explicitamente).\n");
    process.exitCode = 1;
    return;
  }
  const actor = argValue("actor");
  if (!actor) {
    console.error("\n❌ --apply recusado: --actor=<email ou identificador> é obrigatório para o registro de auditoria.\n");
    process.exitCode = 1;
    return;
  }
  if (plan.already_applied) {
    console.log(`\nℹ️  Já existe um lote ativo (${plan.active_batch?.id}) — --apply é idempotente, nada foi alterado de novo.\n`);
    return;
  }
  if (!plan.can_apply) {
    console.error("\n❌ --apply recusado: existem bloqueadores técnicos pendentes (ver lista acima).\n");
    process.exitCode = 1;
    return;
  }

  const batch = await db.$transaction(async (tx) => {
    const activeProducts = await tx.product.findMany({ where: { is_active: true }, select: { id: true } });
    const ids = activeProducts.map((p) => p.id).sort();
    const checksum = crypto.createHash("sha256").update(ids.join(",")).digest("hex");

    if (ids.length > 0) {
      await tx.product.updateMany({ where: { id: { in: ids } }, data: { is_active: false } });
    }
    const publishedCount = await tx.catalog2Product.count({ where: { published_version_id: { not: null } } });

    return tx.catalog2CutoverBatch.create({
      data: {
        actor,
        operational_products_deactivated: ids.length,
        catalog2_products_published: publishedCount,
        affected_products_checksum: checksum,
        affected_product_ids_json: JSON.stringify(ids),
      },
    });
  });

  console.log(`\n✅ Virada aplicada. Lote ${batch.id} — ${batch.operational_products_deactivated} produto(s) operacional(is) desativado(s) para novas vendas, ${batch.catalog2_products_published} produto(s) do catalog2 agora principal(is).`);
  console.log(`   Reverter: npm run catalog2:commercial-cutover-plan -- --reverse=${batch.id} --actor=<email> --reason="..."\n`);
}

async function reversePlan() {
  const batchId = argValue("reverse");
  const actor = argValue("actor");
  const reason = argValue("reason");
  if (!batchId || !actor || !reason) {
    console.error("\n❌ --reverse recusado: use --reverse=<batchId> --actor=<email> --reason=\"motivo\" (todos obrigatórios).\n");
    process.exitCode = 1;
    return;
  }
  const batch = await db.catalog2CutoverBatch.findUnique({ where: { id: batchId } });
  if (!batch) {
    console.error(`\n❌ Lote ${batchId} não encontrado.\n`);
    process.exitCode = 1;
    return;
  }
  if (batch.reversed_at) {
    console.log(`\nℹ️  Lote ${batchId} já estava revertido em ${batch.reversed_at.toISOString()} — nada a fazer (idempotente).\n`);
    return;
  }

  const ids: string[] = JSON.parse(batch.affected_product_ids_json);
  await db.$transaction(async (tx) => {
    if (ids.length > 0) {
      await tx.product.updateMany({ where: { id: { in: ids } }, data: { is_active: true } });
    }
    await tx.catalog2CutoverBatch.update({
      where: { id: batchId },
      data: { reversed_at: new Date(), reversed_by: actor, reversal_note: reason },
    });
  });

  console.log(`\n✅ Lote ${batchId} revertido — ${ids.length} produto(s) reativado(s). Pedidos/projetos/tarefas criados durante a virada NÃO foram desfeitos (nunca prometido).\n`);
}

async function main() {
  assertLocalDatabase(process.env.DATABASE_URL);

  if (has("reverse") || argValue("reverse")) {
    await reversePlan();
    return;
  }

  const plan = await buildPlan();

  if (has("json")) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log("\n════════ PLANO DE VIRADA COMERCIAL DO CATALOGO2 (DRY-RUN) ════════\n");
    console.log(`  can_apply (pré-requisitos técnicos, exceto backup): ${plan.can_apply ? "SIM" : "NÃO"}`);
    console.log(`  já existe lote ativo: ${plan.already_applied ? `SIM (${plan.active_batch?.id})` : "não"}`);
    console.log("\n  ── Bloqueadores ──");
    for (const b of plan.blockers) console.log(`   • ${b}`);
    console.log("\n  ── Lado operacional (162) ──");
    console.log(`   • Ativos hoje: ${plan.legacy_side.operational_products_active} / ${plan.legacy_side.operational_products_total}`);
    console.log(`   • Seriam desativados para novas vendas num --apply real: ${plan.legacy_side.would_be_deactivated_for_new_sales}`);
    console.log("\n  ── Lado novo catálogo ──");
    console.log(`   • Publicados hoje: ${plan.new_catalog_side.published_now}`);
    console.log("\n  ── Rotas que mudariam ──");
    for (const r of plan.routes_that_would_change) console.log(`   • ${r}`);
    console.log("\n  ── Feature flag ──");
    console.log(`   • ${plan.feature_flag.mechanism}`);
    console.log("\n  ── Reversão ──");
    console.log(`   • ${plan.reversal.how}`);
    console.log("\n  ── O que este script NÃO faz sem --apply completo ──");
    for (const s of plan.what_this_block_does_NOT_do) console.log(`   • ${s}`);
    console.log("\n────────────────────────────────────────────\n");
  }

  if (has("apply")) {
    await applyPlan(plan);
  }
}

main()
  .catch((err) => {
    console.error("❌", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
