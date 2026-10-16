// Normaliza os valores TÉCNICOS do Produto ID 1 (Gestão de Tráfego Pago) para a regra de 16/10, SEM preencher o produto:
//   • avulso + assinatura mensal; venda independente; entrega mensal ativa; período mensal ativo;
//   • continuidade do executor "recomendada" (aceite 2 h; indisponível → distribuição normal; conexões só no mesmo projeto);
//   • regra de acessos "só na primeira execução" (revalidação quando necessário);
//   • neutraliza o valor antigo implementation_rule=on_revalidation (sem função hoje) → first_only.
// NÃO publica, NÃO mexe em textos do Passo 1, NÃO cria preço fixo, NÃO cadastra etapas, NÃO apaga a tarefa "Teste" nem suas etapas.
// Cada mudança fica no histórico do produto (event_type "legacy_normalized"). Idempotente.
//
// Uso:  npx tsx src/scripts/catalog2-normalize-product-1.ts            (simulação: só mostra o que mudaria)
//       npx tsx src/scripts/catalog2-normalize-product-1.ts --apply    (grava)
import { prisma } from "../lib/prisma";
import { recordCatalog2ProductHistory } from "../lib/catalog2-product-history";

const APPLY = process.argv.includes("--apply");
const SEQUENCE = Number((process.argv.find((a) => a.startsWith("--product=")) ?? "--product=1").split("=")[1]);

const VERSION_TARGET = {
  accepts_one_time: true, accepts_recurring: true, has_initial_implementation: false, implementation_rule: "first_only", sell_mode: "standalone",
} as const;
const TASK_TARGET = {
  executor_continuity: "recommended", continuity_accept_hours: 2, continuity_if_unavailable: "normal_queue", continuity_after_deadline: "normal_queue",
  reuse_connections_same_project: true, asset_rule: "first_only",
} as const;

function guardLocal() {
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => { try { return new URL(url).hostname; } catch { return ""; } })();
  if ((process.env.NODE_ENV ?? "") === "production") throw new Error("Recusado: NODE_ENV=production. Este script é só para o ambiente LOCAL.");
  if (!["localhost", "127.0.0.1", "mysql", "::1"].includes(host)) throw new Error(`Recusado: o banco (${host || "?"}) não parece local.`);
}

async function main() {
  guardLocal();
  const product = await prisma.catalog2Product.findFirst({ where: { sequence_number: SEQUENCE }, include: { versions: { orderBy: { version_number: "desc" } } } });
  if (!product) throw new Error(`Produto número ${SEQUENCE} não encontrado.`);
  const draft = product.versions.find((v) => v.state === "rascunho");
  if (!draft) throw new Error("Sem versão em rascunho: nada a normalizar (este script nunca mexe em versão publicada).");
  if (product.published_version_id) console.log("Aviso: o produto tem versão publicada; só o rascunho será ajustado.");
  const tasks = await prisma.catalog2Task.findMany({ where: { version_id: draft.id }, orderBy: { sort_order: "asc" } });
  const periods = await prisma.catalog2ProductPeriod.findMany({ where: { product_id: product.id } });
  const monthly = periods.find((p) => p.period === "mensal");

  const vBefore: Record<string, unknown> = {}; const vAfter: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(VERSION_TARGET)) { const cur = (draft as Record<string, unknown>)[k]; if (cur !== v) { vBefore[k] = cur; vAfter[k] = v; } }
  const pBefore: Record<string, unknown> = {}; const pAfter: Record<string, unknown> = {};
  if (product.delivery_recurrence !== "mensal") { pBefore.delivery_recurrence = product.delivery_recurrence; pAfter.delivery_recurrence = "mensal"; }
  if (product.task_structure !== "single") { pBefore.task_structure = product.task_structure; pAfter.task_structure = "single"; }
  const periodNeeds = !monthly || !monthly.is_active;
  const taskChanges = tasks.map((t) => {
    const b: Record<string, unknown> = {}; const a: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(TASK_TARGET)) { const cur = (t as Record<string, unknown>)[k]; if (cur !== v) { b[k] = cur; a[k] = v; } }
    return { id: t.id, name: t.name, before: b, after: a };
  });

  console.log(`Produto #${product.sequence_number} “${product.internal_name}” — rascunho v${draft.version_number}`);
  console.log("Versão (antes → depois):", JSON.stringify({ antes: vBefore, depois: vAfter }));
  console.log("Produto (antes → depois):", JSON.stringify({ antes: pBefore, depois: pAfter }));
  console.log("Período mensal:", periodNeeds ? "será ativado (0% de desconto)" : "já ativo");
  for (const t of taskChanges) console.log(`Tarefa “${t.name}”:`, JSON.stringify({ antes: t.before, depois: t.after }));
  const changes = Object.keys(vAfter).length + Object.keys(pAfter).length + (periodNeeds ? 1 : 0) + taskChanges.filter((t) => Object.keys(t.after).length).length;
  if (changes === 0) { console.log("Nada a fazer: já normalizado."); return; }
  if (!APPLY) { console.log("\nSIMULAÇÃO — nada foi gravado. Rode com --apply para gravar."); return; }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(vAfter).length) await tx.catalog2ProductVersion.update({ where: { id: draft.id }, data: vAfter });
    if (Object.keys(pAfter).length) await tx.catalog2Product.update({ where: { id: product.id }, data: pAfter });
    if (periodNeeds) await tx.catalog2ProductPeriod.upsert({ where: { product_id_period: { product_id: product.id, period: "mensal" } }, create: { product_id: product.id, period: "mensal", months: 1, discount_percent: 0, is_active: true }, update: { is_active: true } });
    for (const t of taskChanges) if (Object.keys(t.after).length) await tx.catalog2Task.update({ where: { id: t.id }, data: t.after });
    await recordCatalog2ProductHistory(tx, {
      productId: product.id, versionId: draft.id, eventType: "legacy_normalized",
      description: "Valores técnicos normalizados para a regra de 16/10 (avulso + assinatura mensal, entrega mensal, período mensal ativo, continuidade recomendada, acessos só na primeira execução; valor antigo de implantação neutralizado). Textos e etapas não foram alterados.",
      before: { version: vBefore, product: pBefore, tasks: taskChanges.map((t) => ({ name: t.name, ...t.before })), monthly_period: monthly ? { is_active: monthly.is_active, discount_percent: monthly.discount_percent } : null },
      after: { version: vAfter, product: pAfter, tasks: taskChanges.map((t) => ({ name: t.name, ...t.after })), monthly_period: { is_active: true } },
      actorKind: "system",
    });
  });
  console.log("\nGravado. O produto continua em rascunho (nada foi publicado).");
}

main().catch((e) => { console.error("Erro:", e.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
