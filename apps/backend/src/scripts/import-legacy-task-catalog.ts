/**
 * import-legacy-task-catalog.ts — Importa os MODELOS DE TAREFA da plataforma
 * antiga (`task_template`) como CatalogTask e os vincula aos produtos.
 *
 * É o que faltava para o catálogo importado ser contratável: sem CatalogTask
 * vinculada, o produto aparece na vitrine mas não gera tarefa no pagamento
 * confirmado (ver src/lib/product-contractability.ts).
 *
 * O que entra em cada CatalogTask:
 *   - identidade e regras (nome, código, descrição, regras de execução)
 *   - prazos/horas/complexidade derivados dos campos antigos
 *   - `steps` ← task_template_stage, com a CONFIGURAÇÃO DE EXECUÇÃO por etapa
 *     (executor, manter nômade, prazos, pagamento, flags de prazo do produto).
 *     É o material da Fase 3 descrito em docs/motor-tarefas-legado.md: fica
 *     gravado agora, mesmo que o motor novo ainda não o execute.
 *   - `checklist` ← task_template_qualification_checklist_item
 *   - `briefing_questions` ← questionnaire → questionnaire_question → question
 *
 * Vínculo com produto: `product_task_template` mapeia produto antigo → modelo.
 * Como os produtos foram consolidados (várias entradas antigas viraram um só),
 * vários templates podem cair no mesmo produto — o unique do vínculo cuida de
 * não duplicar, e a ordem vem do próprio agrupamento.
 *
 * Idempotente (upsert por legacy_id). Dry-run por padrão.
 *   npx tsx src/scripts/import-legacy-task-catalog.ts [--apply]
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");

const CAT = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../../produtos-modelos-questionarios.json"),
    "utf8",
  ),
);

// ── Helpers ─────────────────────────────────────────────────────────────────

function htmlToText(html: unknown): string {
  if (!html) return "";
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/﻿/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function complexidade(horas: number, valor: number): string {
  if (horas >= 20 || valor >= 500) return "premium";
  if (horas >= 8 || valor >= 200) return "advanced";
  if (horas >= 3 || valor >= 80) return "intermediate";
  return "basic";
}

// Tipo de pergunta do sistema antigo → tipo do briefing novo.
const TIPO_PERGUNTA: Record<number, string> = {
  1: "text",
  2: "textarea",
  3: "select",
  4: "multiselect",
  5: "file",
  6: "date",
  7: "number",
};

async function main() {
  console.log(`▶ Modelos de tarefa da plataforma antiga — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const categorias = new Map<number, string>(
    CAT.task_category.map((c: any) => [c.id, c.name]),
  );

  // ── Índices de apoio ──────────────────────────────────────────────────────
  const etapasPorTemplate = new Map<number, any[]>();
  for (const s of CAT.task_template_stage) {
    etapasPorTemplate.set(s.taskTemplateId, [...(etapasPorTemplate.get(s.taskTemplateId) ?? []), s]);
  }
  const checklistPorTemplate = new Map<number, string[]>();
  for (const c of CAT.task_template_qualification_checklist_item) {
    if (c.status !== 1) continue;
    const texto = htmlToText(c.description);
    if (!texto) continue;
    checklistPorTemplate.set(c.taskTemplateId, [
      ...(checklistPorTemplate.get(c.taskTemplateId) ?? []),
      texto,
    ]);
  }

  const perguntas = new Map<number, any>(CAT.question.map((q: any) => [q.id, q]));
  const perguntasPorQuestionario = new Map<number, any[]>();
  for (const qq of CAT.questionnaire_question) {
    perguntasPorQuestionario.set(qq.questionnaireId, [
      ...(perguntasPorQuestionario.get(qq.questionnaireId) ?? []),
      qq,
    ]);
  }
  const questionariosPorTemplate = new Map<number, number[]>();
  for (const tq of CAT.task_template_questionnaire) {
    if (tq.status !== 1) continue;
    questionariosPorTemplate.set(tq.taskTemplateId, [
      ...(questionariosPorTemplate.get(tq.taskTemplateId) ?? []),
      tq.questionnaireId,
    ]);
  }

  /** Perguntas de briefing do modelo, na ordem em que apareciam. */
  function briefingDo(templateId: number) {
    const saida: any[] = [];
    for (const qid of questionariosPorTemplate.get(templateId) ?? []) {
      const lista = (perguntasPorQuestionario.get(qid) ?? []).sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );
      for (const item of lista) {
        const q = perguntas.get(item.questionId);
        if (!q || q.status !== 1) continue;
        const texto = htmlToText(q.name);
        if (!texto) continue;
        saida.push({
          question: texto,
          instructions: htmlToText(q.instructions) || undefined,
          type: TIPO_PERGUNTA[q.type] ?? "text",
          required: q.required === 1,
          attachmentEnabled: q.attachmentEnabled === 1,
          legacyQuestionId: q.id,
        });
      }
    }
    return saida;
  }

  /**
   * Etapas com a configuração de execução do motor antigo. Os nomes dos campos
   * seguem a proposta da Fase 3 (docs/motor-tarefas-legado.md), não os do dump,
   * pra que o motor novo possa consumi-los sem tradutor.
   */
  function stepsDo(templateId: number) {
    const etapas = (etapasPorTemplate.get(templateId) ?? []).sort(
      (a, b) => (a.number ?? 0) - (b.number ?? 0),
    );
    return etapas.map((e, i) => ({
      name: htmlToText(e.name) || `Etapa ${i + 1}`,
      title: htmlToText(e.name) || `Etapa ${i + 1}`,
      order: e.number ?? i + 1,
      description: [
        e.deadlineDays ? `Prazo: ${e.deadlineDays}d` : null,
        e.executionHours ? `Execução: ${e.executionHours}h` : null,
        e.internalExecution ? "execução interna" : null,
        e.delegateToLeader ? "delegada ao líder" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      // ── configuração de execução (Fase 3) ──
      categoryName: categorias.get(e.taskCategoryId) ?? null,
      executorType: e.internalExecution ? "internal" : e.delegateToLeader ? "leader" : "nomad",
      keepSameNomad: Boolean(e.keepNomadOnNextStage),
      deadlineDays: e.deadlineDays ?? null,
      executionDeadlineHours: e.executionDeadlineHours ?? null,
      executionHours: e.executionHours ?? null,
      nomadAmount: e.nomadAmount ?? null,
      maxDeliveredItems: e.maxDeliveredItems ?? null,
      requiresConclusionAttachment: Boolean(e.requiresConclusionAttachment),
      allowViewCredentials: Boolean(e.allowVisualizePassword),
      hideOnProductDeadline: Boolean(e.hideOnProductDeadline),
      countsForProductDeadline: !e.dontCountForProductDeadline,
      mandatory: true,
      requires_briefing: i === 0,
      legacyStageId: e.id,
    }));
  }

  // ── 1. CatalogTask ────────────────────────────────────────────────────────
  // Além dos modelos ativos, entram os que estão vinculados a algum produto —
  // há produto que já era ativo na base antiga apontando para modelo desativado
  // (ex.: "Gerenciamento e Hospedagem de Website"). Trazê-los inativos deixa o
  // problema visível na tela ("modelo inativo") em vez de o produto aparecer
  // misteriosamente sem modelo nenhum.
  const referenciados = new Set<number>(
    CAT.product_task_template
      .filter((pt: any) => pt.status === 1)
      .map((pt: any) => pt.taskTemplateId as number),
  );
  const ativos = CAT.task_template.filter(
    (t: any) => t.status === 1 || referenciados.has(t.id),
  );
  let criados = 0;
  let atualizados = 0;
  const mapTemplate = new Map<number, string>();
  const codigosUsados = new Set<string>(
    (await prisma.catalogTask.findMany({ select: { code: true } })).map((c) => c.code),
  );

  for (const t of ativos) {
    const existente = await prisma.catalogTask.findFirst({ where: { legacy_id: t.id } });
    const steps = stepsDo(t.id);
    const briefing = briefingDo(t.id);
    const checklist = checklistPorTemplate.get(t.id) ?? [];
    const horas = Number(t.executionHours) || 0;

    // O código antigo (ex.: "A0003") é reaproveitado quando está livre; senão
    // cai para um código derivado do id de origem, que nunca colide.
    let code = String(t.taskCode || "").trim() || `LEG-${t.id}`;
    if (!existente && codigosUsados.has(code)) code = `${code}-L${t.id}`;
    codigosUsados.add(code);

    const dados = {
      name: htmlToText(t.taskName) || `Modelo ${t.id}`,
      category: categorias.get(t.taskCategoryId) ?? "Geral",
      task_type: "execution",
      description: htmlToText(t.taskDescription) || null,
      objective: null as string | null,
      default_deadline_days: t.deadlineDays ?? null,
      complexity: complexidade(horas, Number(t.nomadAmount) || 0),
      estimated_hours: horas || null,
      responsible_type: steps.some((s) => s.executorType === "leader") ? "leader" : "nomad",
      requires_access: t.requiresPreviusAccess === 1,
      requires_briefing: briefing.length > 0,
      requires_files: t.requiresConclusionAttachment === 1,
      steps: steps.length ? JSON.stringify(steps) : null,
      checklist: checklist.length ? JSON.stringify(checklist) : null,
      briefing_questions: briefing.length ? JSON.stringify(briefing) : null,
      execution_rules: htmlToText(t.executionRules) || null,
      internal_guidance: htmlToText(t.nomadTaskWarning) || null,
      notes: htmlToText(t.accountPermissionsInstructions) || null,
      // Modelo desativado na base antiga entra desativado aqui também: quem
      // decide reativar é a operação, não a importação.
      status: t.status === 1 ? "ativa" : "inativa",
      is_active: t.status === 1,
      legacy_id: t.id,
    };

    if (existente) {
      // is_active/status são decisão operacional: se alguém ativou aqui um
      // modelo que estava desativado na base antiga, reimportar não pode
      // desfazer isso (foi o que aconteceu com SW0022 e SW0336).
      const { is_active: _a, status: _s, ...semEstado } = dados;
      if (APPLY) await prisma.catalogTask.update({ where: { id: existente.id }, data: semEstado });
      mapTemplate.set(t.id, existente.id);
      atualizados++;
    } else {
      const id = APPLY
        ? (await prisma.catalogTask.create({ data: { ...dados, code } })).id
        : `dry_ct_${t.id}`;
      mapTemplate.set(t.id, id);
      criados++;
    }
  }

  console.log(
    `modelos: ${criados} criados · ${atualizados} atualizados (de ${ativos.length} ativos na base antiga)`,
  );
  const comEtapas = ativos.filter((t: any) => (etapasPorTemplate.get(t.id) ?? []).length > 0).length;
  const comBriefing = ativos.filter((t: any) => briefingDo(t.id).length > 0).length;
  console.log(`  com etapas configuradas: ${comEtapas} · com briefing: ${comBriefing}`);

  // ── 2. Vínculo produto ↔ modelo ───────────────────────────────────────────
  // O produto novo guarda no metadata os ids antigos que absorveu.
  const produtos = await prisma.product.findMany({
    select: { id: true, metadata: true, legacy_id: true, is_active: true },
  });
  const produtoPorLegacy = new Map<number, string>();
  // Produto consolidado tem uma variação por produto antigo absorvido, e cada
  // um trazia o SEU modelo de tarefa. Sem amarrar o vínculo à variação,
  // contratar uma faixa geraria as tarefas de todas — ver o filtro em
  // src/lib/generate-tasks.ts.
  const variacaoPorLegacy = new Map<number, string>();
  for (const p of produtos) {
    if (p.legacy_id != null) produtoPorLegacy.set(p.legacy_id, p.id);
    try {
      const meta = JSON.parse(p.metadata || "{}");
      for (const lid of meta.legacyIds ?? []) produtoPorLegacy.set(lid, p.id);
      // variationsInternal: { [variationId]: { legacyProductId, ... } }
      const temVariasFaixas = (meta.legacyIds ?? []).length > 1;
      if (temVariasFaixas) {
        for (const [variationId, info] of Object.entries<any>(meta.variationsInternal ?? {})) {
          if (info?.legacyProductId != null) {
            variacaoPorLegacy.set(info.legacyProductId, variationId);
          }
        }
      }
    } catch {
      /* ignora */
    }
  }

  let vinculos = 0;
  let semProduto = 0;
  const ordemPorProduto = new Map<string, number>();

  for (const pt of CAT.product_task_template) {
    if (pt.status !== 1) continue;
    const productId = produtoPorLegacy.get(pt.productId);
    const catalogTaskId = mapTemplate.get(pt.taskTemplateId);
    if (!productId || !catalogTaskId) {
      semProduto++;
      continue;
    }
    const ordem = (ordemPorProduto.get(productId) ?? 0) + 1;
    ordemPorProduto.set(productId, ordem);

    // O vínculo pertence à variação que veio daquele produto antigo; quando o
    // produto não foi consolidado, fica nulo = vale para o produto inteiro.
    const variationId = variacaoPorLegacy.get(pt.productId) ?? null;

    if (APPLY) {
      const ja = await prisma.productCatalogTask.findFirst({
        where: { product_id: productId, catalog_task_id: catalogTaskId },
      });
      if (ja) {
        // Reexecução: garante a amarração da variação em vínculo já existente.
        if (ja.variation_id !== variationId) {
          await prisma.productCatalogTask.update({
            where: { id: ja.id },
            data: { variation_id: variationId },
          });
        }
      } else {
        await prisma.productCatalogTask.create({
          data: {
            product_id: productId,
            catalog_task_id: catalogTaskId,
            variation_id: variationId,
            sort_order: ordem,
            is_mandatory: true,
          },
        });
        vinculos++;
      }
    } else {
      vinculos++;
    }
  }

  console.log(`\nvínculos produto ↔ modelo: ${vinculos} criados · ${semProduto} sem correspondência`);

  // ── 3. Contratabilidade resultante ────────────────────────────────────────
  const ativosDepois = await prisma.product.findMany({
    where: { is_active: true },
    select: { id: true, task_links: { select: { catalog_task: { select: { is_active: true } } } } },
  });
  const contratáveis = ativosDepois.filter((p) =>
    p.task_links.some((l) => l.catalog_task.is_active),
  ).length;
  console.log(
    `\n${APPLY ? "✅" : "◻"} produtos ativos contratáveis: ${contratáveis} de ${ativosDepois.length}`,
  );
  if (!APPLY) console.log("(dry-run — nada foi escrito. Rode com --apply.)");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
