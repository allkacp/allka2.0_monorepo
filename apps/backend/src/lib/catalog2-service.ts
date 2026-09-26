// Serviço do novo catálogo — construtor, versões e publicação (bloco 3/6).
//
// Regras que o schema sozinho não garante e ficam AQUI (revalidadas no
// servidor, nunca no navegador):
//  - versão "publicada" é IMUTÁVEL (edição direta → 409);
//  - publicar cria/usa uma versão NOVA e NUNCA apaga a anterior;
//  - publicação é transacional e idempotente (publish_client_action_id);
//  - antes de publicar, uma bateria de validações (Parte 8 do lote);
//  - efeitos e condições só usam vocabulário FECHADO e referências válidas.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { CATALOG2_STATUSES, CATALOG2_CLIENT_VISIBLE_STATUSES, type Catalog2Status } from "./catalog2-foundation";
import {
  CONDITION_OPERATORS,
  CONDITION_TRIGGER_SOURCES,
  describeCondition,
  validateEffect,
  type EffectValidationCtx,
} from "./catalog2-effects";
import { computePricing, defaultSelection } from "./catalog2-pricing";
import { logCommercialChangeEvent } from "./catalog2-commercial-change-log";
import { recordCatalog2ProductHistory } from "./catalog2-product-history";
import { maybeCreateCatalog2ActivationJobOnStatusTransition, notifyValidQuoteOwnersOfCommercialChange, createCatalog2NotificationJob, type Catalog2NotificationRecipientInput } from "./catalog2-notifications";
import type { DbClient } from "./project-scope";

export class Catalog2Error extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public code?: string,
  ) {
    super(message);
  }
}

export function assertVersionEditable(version: { state: string }): void {
  if (version.state === "publicada") {
    throw new Catalog2Error(
      "Esta versão está publicada e não pode ser alterada. Crie uma nova versão para mudar o produto.",
      409,
      "version_published_immutable",
    );
  }
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function logVersionEvent(
  db: Prisma.TransactionClient | typeof prisma,
  versionId: string,
  eventType: string,
  actorUserId: string | null,
  note?: string | null,
) {
  await db.catalog2VersionEvent.create({
    data: { version_id: versionId, event_type: eventType, actor_user_id: actorUserId, note: note ?? null },
  });
}

export async function createProduct(
  input: {
    internal_name: string;
    slug?: string | null;
    pillar_id?: string | null;
    category_id?: string | null;
    origin?: string | null;
    four_f_ids?: string[];
    version_title?: string;
  },
  actorUserId: string,
) {
  let base = (input.slug ? slugify(input.slug) : slugify(input.internal_name)) || "produto";
  let slug = base;
  for (let i = 2; await prisma.catalog2Product.findUnique({ where: { slug }, select: { id: true } }); i++) {
    slug = `${base}-${i}`;
  }
  return prisma.$transaction(async (tx) => {
    const product = await tx.catalog2Product.create({
      data: {
        slug,
        internal_name: input.internal_name,
        pillar_id: input.pillar_id ?? null,
        category_id: input.category_id ?? null,
        origin: input.origin ?? null,
        status: "em_preparacao",
        created_by_user_id: actorUserId,
        four_f: input.four_f_ids?.length ? { create: input.four_f_ids.map((four_f_id) => ({ four_f_id })) } : undefined,
      },
    });
    const v1 = await tx.catalog2ProductVersion.create({
      data: {
        product_id: product.id,
        version_number: 1,
        state: "rascunho",
        title: input.version_title ?? input.internal_name,
        created_by_user_id: actorUserId,
      },
    });
    await logVersionEvent(tx, v1.id, "created", actorUserId, "Produto e versão 1 criados.");
    return product;
  });
}

export async function newDraftVersion(productId: string, actorUserId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.catalog2Product.findUnique({
      where: { id: productId },
      include: {
        versions: {
          orderBy: { version_number: "desc" },
          take: 1,
          include: {
            variations: { include: { options: { include: { effects: true } } } },
            addons: { include: { effects: true } },
            conditions: true,
            tasks: { include: { steps: true, ai: true, dependencies: true } },
          },
        },
      },
    });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const last = product.versions[0];
    if (last && last.state === "rascunho") {
      throw new Catalog2Error("Já existe uma versão em rascunho para este produto.", 409, "draft_exists");
    }
    const nextNumber = (last?.version_number ?? 0) + 1;
    const nv = await tx.catalog2ProductVersion.create({
      data: {
        product_id: productId,
        version_number: nextNumber,
        state: "rascunho",
        title: last?.title ?? product.internal_name,
        summary: last?.summary ?? null,
        full_description: last?.full_description ?? null,
        // O prazo comercial base acompanha a versão (senão a nova versão "perde" o prazo).
        base_commercial_deadline_days: last?.base_commercial_deadline_days ?? null,
        created_by_user_id: actorUserId,
      },
    });

    // Copia a ESTRUTURA da última versão para o novo rascunho (deep clone
    // por key), para o admin partir do que estava publicado.
    if (last) await cloneVersionStructure(tx, last, nv.id);
    await logVersionEvent(tx, nv.id, "new_version", actorUserId, `Rascunho v${nextNumber} criado a partir da v${last?.version_number ?? "-"}.`);
    return nv;
  });
}

type FullVersion = Prisma.Catalog2ProductVersionGetPayload<{
  include: {
    variations: { include: { options: { include: { effects: true } } } };
    addons: { include: { effects: true } };
    conditions: true;
    tasks: { include: { steps: true; ai: true; dependencies: true } };
  };
}>;

async function cloneVersionStructure(db: Prisma.TransactionClient, src: FullVersion, destId: string) {
  const taskIdByKey = new Map<string, string>();
  const stepIdByRef = new Map<string, string>();
  for (const t of src.tasks) {
    const nt = await db.catalog2Task.create({
      data: {
        version_id: destId,
        key: t.key,
        name: t.name,
        description: t.description,
        objective: t.objective,
        sort_order: t.sort_order,
        specialty_id: t.specialty_id,
        execution_mode: t.execution_mode,
        estimated_minutes: t.estimated_minutes,
        effort_is_provisional: t.effort_is_provisional,
        effort_provisional_reason: t.effort_provisional_reason,
        effort_source: t.effort_source,
        requires_review: t.requires_review,
        requires_client_approval: t.requires_client_approval,
        is_conditional: t.is_conditional,
        // Vínculo de questionário (reunião 2026-09-14, Item 3) segue pra
        // versão nova igual especialidade — é referência à biblioteca
        // compartilhada, não dado próprio da versão.
        questionnaire_id: t.questionnaire_id,
      },
    });
    taskIdByKey.set(t.key, nt.id);
    for (const s of t.steps) {
      const ns = await db.catalog2TaskStep.create({
        data: {
          task_id: nt.id,
          key: s.key,
          name: s.name,
          description: s.description,
          sort_order: s.sort_order,
          estimated_minutes: s.estimated_minutes,
          is_conditional: s.is_conditional,
          specialty_id: s.specialty_id,
        },
      });
      stepIdByRef.set(`${t.key}:${s.key}`, ns.id);
    }
    if (t.ai) {
      await db.catalog2TaskAI.create({
        data: {
          task_id: nt.id,
          provider: t.ai.provider,
          model: t.ai.model,
          est_input_tokens: t.ai.est_input_tokens,
          est_output_tokens: t.ai.est_output_tokens,
          unit_cost_input_per_1k: t.ai.unit_cost_input_per_1k,
          unit_cost_output_per_1k: t.ai.unit_cost_output_per_1k,
          currency: t.ai.currency,
          est_review_rounds: t.ai.est_review_rounds,
          cost_note: t.ai.cost_note,
          human_review_required: t.ai.human_review_required,
        },
      });
    }
  }
  for (const t of src.tasks) {
    for (const dep of t.dependencies) {
      const depSrc = src.tasks.find((x) => x.id === dep.depends_on_task_id);
      if (!depSrc) continue;
      await db.catalog2TaskDependency.create({
        data: { task_id: taskIdByKey.get(t.key)!, depends_on_task_id: taskIdByKey.get(depSrc.key)! },
      });
    }
  }
  for (const va of src.variations) {
    const nva = await db.catalog2Variation.create({
      data: {
        version_id: destId,
        key: va.key,
        name: va.name,
        selection_type: va.selection_type,
        is_required: va.is_required,
        sort_order: va.sort_order,
        notes: va.notes,
      },
    });
    for (const opt of va.options) {
      await db.catalog2VariationOption.create({
        data: {
          variation_id: nva.id,
          key: opt.key,
          label: opt.label,
          sort_order: opt.sort_order,
          is_default: opt.is_default,
          effects: { create: opt.effects.map((e) => ({ effect_type: e.effect_type, effect_value: e.effect_value, sort_order: e.sort_order })) },
        },
      });
    }
  }
  for (const ad of src.addons) {
    await db.catalog2Addon.create({
      data: {
        version_id: destId,
        key: ad.key,
        name: ad.name,
        description: ad.description,
        sort_order: ad.sort_order,
        is_default_selected: ad.is_default_selected,
        is_active: ad.is_active,
        base_cost: ad.base_cost,
        target_task_id: ad.target_task_id ? taskIdByKey.get(src.tasks.find((x) => x.id === ad.target_task_id)?.key ?? "") ?? null : null,
        target_step_id: ad.target_step_id ? stepIdByRef.get(refForStepId(src, ad.target_step_id) ?? "") ?? null : null,
        effects: { create: ad.effects.map((e) => ({ effect_type: e.effect_type, effect_value: e.effect_value, sort_order: e.sort_order })) },
      },
    });
  }
  for (const c of src.conditions) {
    await db.catalog2Condition.create({
      data: {
        version_id: destId,
        key: c.key,
        name: c.name,
        description: c.description,
        is_active: c.is_active,
        sort_order: c.sort_order,
        trigger_source: c.trigger_source,
        trigger_ref: c.trigger_ref,
        operator: c.operator,
        comparison_value: c.comparison_value,
        effect_type: c.effect_type,
        effect_value: c.effect_value,
        explanation: c.explanation,
      },
    });
  }
}

function refForStepId(src: FullVersion, stepId: string): string | null {
  for (const t of src.tasks) for (const s of t.steps) if (s.id === stepId) return `${t.key}:${s.key}`;
  return null;
}

// ── Validação de efeitos/condições de uma versão ─────────────────────────
export async function buildEffectCtx(versionId: string): Promise<EffectValidationCtx> {
  const tasks = await prisma.catalog2Task.findMany({ where: { version_id: versionId }, include: { steps: true } });
  const taskKeys = new Set(tasks.map((t) => t.key));
  const conditionalTaskKeys = new Set(tasks.filter((t) => t.is_conditional).map((t) => t.key));
  const stepRefs = new Set<string>();
  const conditionalStepRefs = new Set<string>();
  for (const t of tasks)
    for (const s of t.steps) {
      const ref = `${t.key}:${s.key}`;
      stepRefs.add(ref);
      if (s.is_conditional) conditionalStepRefs.add(ref);
    }
  return { taskKeys, conditionalTaskKeys, stepRefs, conditionalStepRefs };
}

export function validateConditionShape(c: {
  trigger_source: string;
  operator: string;
  effect_type: string;
  effect_value: string;
}, ctx: EffectValidationCtx): string | null {
  if (!(CONDITION_TRIGGER_SOURCES as readonly string[]).includes(c.trigger_source)) {
    return `Origem de gatilho inválida: "${c.trigger_source}".`;
  }
  if (!(CONDITION_OPERATORS as readonly string[]).includes(c.operator)) {
    return `Operador inválido: "${c.operator}".`;
  }
  return validateEffect(c.effect_type, c.effect_value, ctx);
}

// ── Publicação ─────────────────────────────────────────────────────────
export interface PublishValidation {
  ok: boolean;
  issues: string[];
  // Metadados para a interface levar o administrador ao campo exato. O
  // texto continua por compatibilidade, mas a UI não precisa mais adivinhar
  // qual parte de uma tarefa está pendente pelo texto da mensagem.
  issue_details: Array<{ message: string; target: string; task_ids?: string[] }>;
  pricing_pending: boolean;
  // Só pendências estritamente comerciais (preço/prazo) podem ser
  // publicadas como "situação comercial pendente". Campos estruturais,
  // classificações, tarefas e regras inválidas nunca podem ser ignorados.
  force_allowed: boolean;
  // Reunião 10/09 ("36 produtos funcionalmente completos para teste"):
  // alguma tarefa tem specialty_id/estimated_minutes preenchidos só como
  // dado PROVISÓRIO (effort_is_provisional=true) — bloqueia a publicação
  // SEMPRE, mesmo com force (ver publishVersion), pra nunca deixar dado de
  // teste virar decisão comercial.
  has_provisional_effort: boolean;
}

export async function validateVersionForPublish(versionId: string): Promise<PublishValidation> {
  const v = await prisma.catalog2ProductVersion.findUnique({
    where: { id: versionId },
    include: {
      product: true,
      variations: { include: { options: { include: { effects: true } } } },
      addons: { include: { effects: true } },
      conditions: true,
      tasks: { include: { steps: true, ai: true } },
    },
  });
  if (!v) return { ok: false, issues: ["Versão não encontrada."], issue_details: [{ message: "Versão não encontrada.", target: "version" }], pricing_pending: true, force_allowed: false, has_provisional_effort: false };

  const issues: string[] = [];
  if (!v.title?.trim()) issues.push("Informe o título comercial.");
  if (!v.full_description?.trim()) issues.push("Informe a descrição completa.");
  if (!v.product.pillar_id) issues.push("Selecione um pilar.");
  if (!v.product.category_id) issues.push("Selecione uma categoria.");
  const fourF = await prisma.catalog2ProductFourF.count({ where: { product_id: v.product_id } });
  if (fourF === 0) issues.push("Selecione ao menos uma classificação 4F.");
  if (v.tasks.length === 0) issues.push("O produto precisa de ao menos uma tarefa.");

  // Reunião 10/09: dado de esforço PROVISÓRIO (teste) nunca vira decisão
  // comercial — bloqueia a publicação incondicionalmente (ver publishVersion,
  // que NÃO aceita force para esta pendência específica).
  const hasProvisionalEffort = v.tasks.some((t) => t.effort_is_provisional);
  if (hasProvisionalEffort) {
    issues.push("Há tarefa(s) com especialidade/tempo PROVISÓRIOS (dado de teste) — revise e confirme os dados reais antes de publicar.");
  }

  const ctx = await buildEffectCtx(versionId);
  for (const c of v.conditions) {
    const err = validateConditionShape(c, ctx);
    if (err) issues.push(`Condição "${c.name}": ${err}`);
  }
  for (const va of v.variations) {
    if (va.is_required && va.options.length === 0) issues.push(`A variação "${va.name}" é obrigatória mas não tem opções.`);
    for (const opt of va.options)
      for (const e of opt.effects) {
        const err = validateEffect(e.effect_type, e.effect_value, ctx);
        if (err) issues.push(`Opção "${va.name} / ${opt.label}": ${err}`);
      }
  }
  for (const ad of v.addons)
    for (const e of ad.effects) {
      const err = validateEffect(e.effect_type, e.effect_value, ctx);
      if (err) issues.push(`Adicional "${ad.name}": ${err}`);
    }

  // Referências quebradas: tarefa condicional nunca incluída por nenhum efeito.
  const includedTaskKeys = new Set<string>();
  for (const c of v.conditions) if (c.effect_type === "add_task") includedTaskKeys.add(c.effect_value);
  for (const va of v.variations) for (const o of va.options) for (const e of o.effects) if (e.effect_type === "add_task") includedTaskKeys.add(e.effect_value);
  for (const ad of v.addons) for (const e of ad.effects) if (e.effect_type === "add_task") includedTaskKeys.add(e.effect_value);
  for (const t of v.tasks) if (t.is_conditional && !includedTaskKeys.has(t.key)) issues.push(`A tarefa condicional "${t.name}" nunca é incluída por nenhum efeito.`);

  // Tudo que veio antes daqui é estrutural. A opção de publicar com
  // pendência comercial nunca pode mascarar uma dessas falhas.
  const hasStructuralIssues = issues.length > 0;

  // Prazo e preço calculáveis (ou pendência comercial explícita).
  let pricingPending = true;
  try {
    const sel = await defaultSelection(versionId);
    const pricing = await computePricing(versionId, sel);
    pricingPending = pricing.pricing_pending;
    if (pricing.estimated_deadline_days == null) issues.push("O prazo não é calculável — nenhuma tarefa tem duração estimada.");
  } catch {
    issues.push("Não foi possível calcular o preço/prazo desta versão.");
  }

  const issue_details = issues.map((message) => {
    if (message.includes("título comercial")) return { message, target: "title" };
    if (message.includes("descrição completa")) return { message, target: "full_description" };
    if (message.includes("um pilar")) return { message, target: "pillar" };
    if (message.includes("uma categoria")) return { message, target: "category" };
    if (message.includes("classificação 4F")) return { message, target: "four_f" };
    if (message.includes("ao menos uma tarefa")) return { message, target: "task_create" };
    if (message.includes("especialidade/tempo PROVISÓRIOS")) {
      return { message, target: "task_effort", task_ids: v.tasks.filter((t) => t.effort_is_provisional).map((t) => t.id) };
    }
    if (message.includes("nenhuma tarefa tem duração estimada")) {
      return { message, target: "task_duration", task_ids: v.tasks.filter((t) => t.estimated_minutes == null).map((t) => t.id) };
    }
    if (message.startsWith("Condição")) return { message, target: "conditions" };
    if (message.startsWith("Opção") || message.startsWith("Adicional") || message.startsWith("A variação")) return { message, target: "options" };
    return { message, target: "pricing" };
  });

  return {
    ok: issues.length === 0,
    issues,
    issue_details,
    pricing_pending: pricingPending,
    force_allowed: !hasStructuralIssues && !hasProvisionalEffort && pricingPending,
    has_provisional_effort: hasProvisionalEffort,
  };
}

export async function publishVersion(
  versionId: string,
  actorUserId: string,
  opts: { clientActionId?: string; changeSummary?: string; force?: boolean } = {},
) {
  // Idempotência: se já existe uma versão publicada com este clientActionId,
  // devolve-a (retry / clique duplo não publica de novo).
  if (opts.clientActionId) {
    const dup = await prisma.catalog2ProductVersion.findUnique({ where: { publish_client_action_id: opts.clientActionId } });
    if (dup) return dup;
  }

  const validation = await validateVersionForPublish(versionId);
  // Dado de esforço PROVISÓRIO (teste) bloqueia SEMPRE — nem force passa
  // por cima disso (diferente das outras pendências abaixo, que a ata
  // permite publicar com force). Nunca deixa dado de teste virar produto
  // comercialmente aprovado/publicável.
  if (validation.has_provisional_effort) {
    throw new Catalog2Error(
      "Esta versão tem tarefa(s) com especialidade/tempo PROVISÓRIOS (dado de teste) — publique só depois de revisar e confirmar os dados reais. Não é possível publicar nem com force.",
      422,
      "provisional_effort_blocks_publish",
    );
  }
  if (!validation.ok && !opts.force) {
    throw new Catalog2Error("A versão tem pendências e não pode ser publicada.", 422, "validation_failed");
  }
  if (!validation.ok && opts.force && !validation.force_allowed) {
    throw new Catalog2Error("A publicação forçada só é permitida quando restam exclusivamente pendências comerciais de preço ou prazo.", 422, "validation_force_not_allowed");
  }

  const result = await prisma.$transaction(async (tx) => {
    const version = await tx.catalog2ProductVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Catalog2Error("Versão não encontrada.", 404);
    if (version.state === "publicada") throw new Catalog2Error("Esta versão já está publicada.", 409, "already_published");

    const now = new Date();
    const published = await tx.catalog2ProductVersion.update({
      where: { id: versionId },
      data: {
        state: "publicada",
        published_at: now,
        published_by_user_id: actorUserId,
        publish_client_action_id: opts.clientActionId ?? null,
        change_summary: opts.changeSummary ?? version.change_summary,
        updated_by_user_id: actorUserId,
      },
    });
    const product = await tx.catalog2Product.findUnique({ where: { id: version.product_id } });
    const beforeStatus = product?.status ?? "em_preparacao";
    const afterStatus = beforeStatus === "em_preparacao" ? "disponivel" : beforeStatus;
    await tx.catalog2Product.update({
      where: { id: version.product_id },
      data: {
        published_version_id: published.id,
        status: afterStatus,
      },
    });
    // Item 8/8.1 (reunião 2026-09-14, "Notificações dos produtos"): a 1ª
    // publicação de um produto "em_preparacao" é uma das 2 transições reais
    // pra "disponivel" (a outra é PATCH /products/:id/status) — registra a
    // INTENÇÃO de anunciar (Job na mesma transação; o envio em si é
    // assíncrono/resumível — ver catalog2-notifications.ts).
    await maybeCreateCatalog2ActivationJobOnStatusTransition(tx, {
      productId: version.product_id, beforeStatus, afterStatus, publishedVersionId: published.id,
    });
    await logVersionEvent(tx, published.id, "published", actorUserId, opts.changeSummary ?? "Versão publicada.");
    // Item 4.1 (reunião 2026-09-14, "Ajustar a proteção comercial"): só
    // conta como ALTERAÇÃO COMERCIAL (e portanto pode ancorar a proteção de
    // 30 dias de cotações já geradas) quando esta publicação SUBSTITUI uma
    // versão já publicada antes — a primeira publicação de um produto nunca
    // é uma "alteração" (não havia nada cotado ainda pra proteger).
    if (product?.published_version_id) {
      await logCommercialChangeEvent(tx, {
        scope: "product_version",
        product_id: version.product_id,
        version_id: published.id,
        actor_user_id: actorUserId,
        note: "nova versão publicada substituindo a anterior",
      });
      // Item 8.1: a INTENÇÃO de avisar donos de propostas vigentes fica
      // gravada NA MESMA transação da repúblicação — o envio em si é
      // assíncrono/resumível (worker), nunca bloqueia esta requisição.
      await notifyValidQuoteOwnersOfCommercialChange(tx, { scope: "product_version", productId: version.product_id });
    }
    return published;
  }).catch((err) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && opts.clientActionId) {
      // Corrida com outra publicação do mesmo clientActionId.
      return prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { publish_client_action_id: opts.clientActionId } });
    }
    throw err;
  });

  return result;
}

// Vínculo comercial ATIVO: pedidos/projetos em andamento nascidos deste
// produto (ProjectProduct.status PENDENTE/EM_EXECUCAO — CONCLUIDO/CANCELADO/
// TRANSFERIDO não contam, já não representam compromisso em aberto). Item 2
// (reunião 2026-09-14), limite comercial: inativar (arquivar) um produto com
// vínculo ativo depende do aviso de 30 dias — outro item, ainda não
// implementado — então até lá essa transição fica bloqueada aqui, com o
// motivo explícito.
const ACTIVE_PROJECT_PRODUCT_STATUSES = ["PENDENTE", "EM_EXECUCAO"];

async function assertNoActiveProjectLinks(productId: string) {
  const count = await prisma.projectProduct.count({
    where: { catalog2_product_id: productId, status: { in: ACTIVE_PROJECT_PRODUCT_STATUSES } },
  });
  if (count > 0) {
    throw new Catalog2Error(
      `Este produto está vinculado a ${count} projeto(s)/pedido(s) em andamento — arquivamento direto bloqueado. Use "Programar inativação" (Item 5) para avisar os responsáveis e agendar a inativação em 30 dias.`,
      409,
      "active_project_links",
    );
  }
}

// Item 2.1 (reunião 2026-09-14, "fechar as lacunas de disponibilidade") —
// "proposta vigente": a estrutura real mais próxima de uma proposta
// comercial ligada a um produto catalog2 é a Catalog2Quote (pré-cotação:
// preço/prazo comerciais congelados, com prazo de validade e status
// valida/expirada/cancelada/convertida). Não existe um modelo "Proposta"
// dedicado no catalog2 — Catalog2Quote É a proposta real do sistema; a
// cesta (Catalog2CartItem) NUNCA conta aqui, porque não tem preço
// congelado nem prazo de validade — é só uma lista de intenção, não uma
// proposta. Uma quote "valida" mas já expirada por tempo (valid_until no
// passado) não é mais vigente, mesmo que ninguém tenha chamado
// /revalidate ainda para atualizar o campo no banco — por isso o corte é
// por tempo, não só pelo literal salvo.
async function assertNoActiveQuotes(productId: string) {
  const now = new Date();
  const quotes = await prisma.catalog2Quote.findMany({
    where: { product_id: productId, status: "valida" },
    select: { id: true, valid_until: true },
  });
  const vigentes = quotes.filter((q) => q.valid_until == null || q.valid_until >= now);
  if (vigentes.length > 0) {
    throw new Catalog2Error(
      `Este produto tem ${vigentes.length} proposta(s) (pré-cotação) vigente(s) — arquivamento direto bloqueado. Use "Programar inativação" (Item 5) para avisar os responsáveis e agendar a inativação em 30 dias.`,
      409,
      "active_quotes",
    );
  }
}

async function assertNoActiveCommercialLinks(productId: string) {
  await assertNoActiveProjectLinks(productId);
  await assertNoActiveQuotes(productId);
}

// Item 7.1: `db` é opcional (default `prisma`) — quando o chamador precisa
// gravar o evento de histórico ATOMICAMENTE junto desta alteração, passa o
// `tx` da MESMA transação; o padrão continua funcionando sem transação pra
// quem não precisa disso.
export async function setProductStatus(productId: string, status: string, db: DbClient = prisma) {
  if (!CATALOG2_STATUSES.includes(status as Catalog2Status)) {
    throw new Catalog2Error(`Status inválido: ${status}`, 400, "invalid_status");
  }
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId }, select: { id: true, published_version_id: true } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  // Todo status visível no catálogo do cliente (disponível/pausado/
  // pré-lançamento/esgotado) exige versão publicada — não há o que mostrar
  // sem isso. em_preparacao e arquivado não exigem.
  if (CATALOG2_CLIENT_VISIBLE_STATUSES.includes(status as Catalog2Status) && !product.published_version_id) {
    throw new Catalog2Error("O produto precisa de uma versão publicada antes de ficar visível no catálogo.", 409, "needs_published_version");
  }
  if (status === "arquivado") {
    await assertNoActiveCommercialLinks(productId);
  }
  return db.catalog2Product.update({ where: { id: productId }, data: { status } });
}

export async function archiveProduct(productId: string, actorUserId: string, db: DbClient = prisma) {
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  await assertNoActiveCommercialLinks(productId);
  return db.catalog2Product.update({
    where: { id: productId },
    data: { status: "arquivado", archived_at: new Date(), archived_by_user_id: actorUserId },
  });
}

// ── Item 5 (reunião 2026-09-14, "Inativação programada de produtos") ────
//
// Substitui, para quem tem vínculo ativo, o bloqueio direto acima (que
// continua existindo — arquivar direto sem nenhum vínculo ativo continua
// instantâneo) por um fluxo de AVISO + PRAZO: o admin agenda agora,
// clientes/responsáveis são notificados, e só depois de 30 dias o produto
// vira "arquivado" de verdade. Nunca mexe em ProjectProduct/Payment/
// ProjectTask — só no PRÓPRIO Catalog2Product e nas notificações.

export const CATALOG2_INACTIVATION_NOTICE_DAYS = 30;

export interface InactivationState {
  isScheduled: boolean;
  isEffective: boolean;
  scheduledAt: Date | null;
  effectiveAt: Date | null;
}

/**
 * Estado da inativação programada, calculado AO VIVO contra a data atual —
 * nunca depende do agendador já ter processado. É isto que garante a regra
 * "mesmo se o agendador atrasar, a validação da contratação respeita a data
 * já vencida" (Item 5, regra 4): `isEffective` vira `true` no instante exato
 * em que `now >= effectiveAt`, com ou sem o job ter rodado.
 */
export function computeInactivationState(product: { inactivation_scheduled_at: Date | null; inactivation_effective_at: Date | null }): InactivationState {
  const scheduledAt = product.inactivation_scheduled_at ?? null;
  const effectiveAt = product.inactivation_effective_at ?? null;
  const isEffective = !!effectiveAt && new Date() >= effectiveAt;
  return { isScheduled: !!scheduledAt, isEffective, scheduledAt, effectiveAt };
}

async function affectedProjectsForInactivation(productId: string) {
  const rows = await prisma.projectProduct.findMany({
    where: { catalog2_product_id: productId, status: { in: ACTIVE_PROJECT_PRODUCT_STATUSES } },
    select: {
      id: true,
      status: true,
      product_name_snapshot: true,
      preco_final_cliente_snapshot: true,
      // Item 8 (reunião 2026-09-14, "Notificações dos produtos"):
      // `admin_responsible_user_id` é o admin INTERNO responsável pelo
      // projeto — avisar só ele pode não alcançar quem de fato contratou.
      // `created_by_user_id` é a autoria real (sempre resolvida do token
      // autenticado, nunca aceita do payload — ver comentário do campo em
      // schema.prisma) — o cliente/agência real por trás do projeto.
      project: { select: { id: true, title: true, project_code: true, admin_responsible_user_id: true, created_by_user_id: true } },
    },
  });
  const byProject = new Map<string, { project_id: string; title: string; project_code: string | null; admin_responsible_user_id: string | null; created_by_user_id: string | null; items: Array<{ project_product_id: string; name: string; price: number | null; status: string }> }>();
  for (const pp of rows) {
    if (!byProject.has(pp.project.id)) {
      byProject.set(pp.project.id, {
        project_id: pp.project.id,
        title: pp.project.title,
        project_code: pp.project.project_code,
        admin_responsible_user_id: pp.project.admin_responsible_user_id,
        created_by_user_id: pp.project.created_by_user_id,
        items: [],
      });
    }
    byProject.get(pp.project.id)!.items.push({
      project_product_id: pp.id,
      name: pp.product_name_snapshot,
      price: pp.preco_final_cliente_snapshot,
      status: pp.status,
    });
  }
  return [...byProject.values()];
}

async function affectedQuotesForInactivation(productId: string) {
  const now = new Date();
  const quotes = await prisma.catalog2Quote.findMany({
    where: { product_id: productId, status: "valida" },
    select: { id: true, user_id: true, account_kind: true, account_id: true, commercial_price: true, currency: true, valid_until: true },
  });
  return quotes.filter((q) => q.valid_until == null || q.valid_until >= now);
}

/** Prévia (somente leitura) do que a ação de inativar afetaria — usada pela
 * tela de confirmação no Cadastro de Produtos antes de o admin confirmar. */
export async function previewInactivation(productId: string) {
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (product.status === "arquivado") throw new Catalog2Error("Este produto já está inativo.", 409, "already_archived");

  const [affectedProjects, affectedQuotes] = await Promise.all([
    affectedProjectsForInactivation(productId),
    affectedQuotesForInactivation(productId),
  ]);

  const state = computeInactivationState(product);
  const noticeDate = state.scheduledAt ?? new Date();
  const effectiveDate = state.effectiveAt ?? new Date(noticeDate.getTime() + CATALOG2_INACTIVATION_NOTICE_DAYS * 24 * 3600 * 1000);

  return {
    product_id: product.id,
    already_scheduled: state.isScheduled,
    notice_date: noticeDate,
    effective_date: effectiveDate,
    affected_projects: affectedProjects,
    affected_quotes: affectedQuotes.map((q) => ({ id: q.id, commercial_price: q.commercial_price, currency: q.currency, valid_until: q.valid_until, account_kind: q.account_kind })),
    consequences: [
      "A partir da confirmação, novas cotações e novos aditivos deste produto ficam bloqueados imediatamente — mesmo antes da data efetiva.",
      "Propostas (cotações) já vigentes continuam válidas — respeitando sua própria validade e a proteção de preço de 30 dias — até a data efetiva da inativação, nunca depois.",
      `Em ${CATALOG2_INACTIVATION_NOTICE_DAYS} dias (na data efetiva), o produto fica "Inativo": some do catálogo e nenhuma cotação, aditivo ou proposta antiga pode mais virar contratação, mesmo que o processamento automático atrase.`,
      "Projetos, tarefas e pagamentos já contratados não são alterados por esta ação.",
    ],
  };
}

// Item 8 (reunião 2026-09-14, "Notificações dos produtos"): 3 fases —
// "scheduled"/"processed" já existiam (Item 5); "cancelled" é nova (o
// agendamento nunca avisava ninguém ao ser cancelado). Nenhuma fase promete
// desconto/compensação — a compensação financeira do Item 5 continua
// pendente, e o texto nunca sugere o contrário.
// Item 8.1: a INTENÇÃO (Job + destinatários já resolvidos e renderizados)
// é gravada dentro do `db` (tx) do chamador — SEMPRE a mesma transação da
// alteração real (agendar/cancelar/efetivar) — nunca um efeito colateral
// solto depois do commit. O envio em si é assíncrono/resumível (worker).
async function notifyInactivationRecipients(
  db: DbClient,
  product: { id: string; internal_name: string },
  opts: { effectiveAt: Date | null; phase: "scheduled" | "processed" | "cancelled" },
) {
  const [affectedProjects, affectedQuotes] = await Promise.all([
    affectedProjectsForInactivation(product.id),
    affectedQuotesForInactivation(product.id),
  ]);
  // Item 8: dois públicos DISTINTOS, cada um com seu próprio destino —
  // nunca manda um cliente pra uma tela administrativa (e vice-versa),
  // corrigindo uma lacuna do Item 5 (o `action_url` era sempre `/admin/...`
  // mesmo pra destinatários clientes).
  const adminRecipients = new Set<string>();
  const clientRecipients = new Set<string>();
  for (const p of affectedProjects) {
    if (p.admin_responsible_user_id) adminRecipients.add(p.admin_responsible_user_id);
    if (p.created_by_user_id) clientRecipients.add(p.created_by_user_id);
  }
  for (const q of affectedQuotes) clientRecipients.add(q.user_id);
  // Nunca notifica a mesma pessoa duas vezes com destinos diferentes — se
  // por acaso o mesmo user_id aparecer nos dois papéis (ex.: admin que
  // também é dono de uma cotação de teste), o link administrativo prevalece.
  for (const id of adminRecipients) clientRecipients.delete(id);

  const dateLabel = opts.effectiveAt ? opts.effectiveAt.toISOString().slice(0, 10) : null;
  const eventType =
    opts.phase === "scheduled" ? ("inactivation_scheduled" as const)
    : opts.phase === "processed" ? ("inactivation_processed" as const)
    : ("inactivation_cancelled" as const);
  const type =
    opts.phase === "scheduled" ? "catalog2.product_inactivation_scheduled"
    : opts.phase === "processed" ? "catalog2.product_inactivation_processed"
    : "catalog2.product_inactivation_cancelled";
  const title =
    opts.phase === "scheduled" ? "Inativação programada — Catálogo 2.0"
    : opts.phase === "processed" ? "Produto inativado — Catálogo 2.0"
    : "Inativação cancelada — Catálogo 2.0";
  const message =
    opts.phase === "scheduled"
      ? `O produto "${product.internal_name}" foi programado para inativação em ${dateLabel}. Propostas e projetos já vinculados continuam válidos até essa data.`
      : opts.phase === "processed"
      ? `O produto "${product.internal_name}" foi inativado em ${dateLabel} — não pode mais ser contratado (cotações, aditivos ou propostas antigas incluídos).`
      : `A inativação programada do produto "${product.internal_name}" foi cancelada — o produto volta a ficar contratável normalmente.`;

  const recipients: Catalog2NotificationRecipientInput[] = [
    ...[...adminRecipients].map((userId): Catalog2NotificationRecipientInput => ({
      userId, type, title, message, severity: "warning", category: "alerta", actionUrl: `/admin/produtos?produto=${product.id}`,
    })),
    ...[...clientRecipients].map((userId): Catalog2NotificationRecipientInput => ({
      userId, type, title, message, severity: "warning", category: "alerta", actionUrl: "/dashboard",
    })),
  ];
  if (recipients.length === 0) return 0;
  await createCatalog2NotificationJob(db, { eventType, entityType: "catalog2_product", entityId: product.id, recipients });
  return recipients.length;
}

/**
 * Confirma o agendamento — idempotente: reexecutar (duplo clique, retry)
 * NUNCA reancora o prazo nem renotifica; devolve o agendamento já existente.
 * A intenção de notificar os responsáveis pelos projetos e cotações
 * afetados é gravada aqui mesmo (Job, ver catalog2-notifications.ts),
 * dentro da mesma transação — reaproveitando o SystemAlert já usado em
 * todo o resto do catalog2, nunca um canal novo; o envio em si é
 * assíncrono (worker).
 */
export async function scheduleInactivation(productId: string, actorUserId: string, note?: string, db: DbClient = prisma) {
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (product.status === "arquivado") throw new Catalog2Error("Este produto já está inativo.", 409, "already_archived");

  if (product.inactivation_scheduled_at) {
    return { already_scheduled: true, product };
  }

  const scheduledAt = new Date();
  const effectiveAt = new Date(scheduledAt.getTime() + CATALOG2_INACTIVATION_NOTICE_DAYS * 24 * 3600 * 1000);
  const updated = await db.catalog2Product.update({
    where: { id: productId },
    data: {
      inactivation_scheduled_at: scheduledAt,
      inactivation_effective_at: effectiveAt,
      inactivation_scheduled_by_user_id: actorUserId,
      inactivation_note: note ?? null,
      inactivation_cancelled_at: null,
    },
  });

  // Item 8.1: a INTENÇÃO de notificar (Job + destinatários) é gravada no
  // MESMO `db` (tx do chamador, quando houver) da alteração real — uma
  // operação revertida nunca deixa um Job pra trás. O ENVIO em si continua
  // assíncrono (worker), nunca bloqueia esta chamada.
  await notifyInactivationRecipients(db, updated, { effectiveAt, phase: "scheduled" });

  return { already_scheduled: false, product: updated };
}

/** Cancela um agendamento AINDA NÃO efetivado — nunca depois que o job já processou. */
export async function cancelScheduledInactivation(productId: string, db: DbClient = prisma) {
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (!product.inactivation_scheduled_at) throw new Catalog2Error("Este produto não tem inativação agendada.", 409, "not_scheduled");
  if (product.inactivation_processed_at) throw new Catalog2Error("A inativação já foi efetivada — não é mais possível cancelar.", 409, "already_processed");
  const updated = await db.catalog2Product.update({
    where: { id: productId },
    data: {
      inactivation_scheduled_at: null,
      inactivation_effective_at: null,
      inactivation_scheduled_by_user_id: null,
      inactivation_note: null,
      inactivation_cancelled_at: new Date(),
    },
  });
  // Item 8/8.1: "ao efetivar OU CANCELAR o agendamento, atualize os
  // interessados" — o Item 5 nunca avisava ninguém no cancelamento;
  // fechado aqui, mesmos destinatários (responsável interno + cliente/
  // agência do projeto + donos de cotações vigentes). Intenção gravada no
  // MESMO `db` (tx do chamador) desta alteração.
  await notifyInactivationRecipients(db, updated, { effectiveAt: null, phase: "cancelled" });
  return updated;
}

/**
 * Processa TODOS os produtos com inativação vencida — chamado pelo job
 * agendado (ver catalog2-inactivation-scheduler.ts). Idempotente por
 * produto: guarda de corrida dentro da transação (releitura +
 * `inactivation_processed_at` nulo) garante que reprocessar (reexecução do
 * job, atraso, restart) nunca vira o status duas vezes nem renotifica.
 */
export async function processDueInactivations(): Promise<{ processed: string[] }> {
  const due = await prisma.catalog2Product.findMany({
    where: { inactivation_effective_at: { lte: new Date() }, inactivation_processed_at: null, status: { not: "arquivado" } },
    select: { id: true },
  });
  const processed: string[] = [];
  for (const row of due) {
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.catalog2Product.findUnique({ where: { id: row.id } });
      if (!fresh || fresh.inactivation_processed_at || fresh.status === "arquivado" || !fresh.inactivation_effective_at || fresh.inactivation_effective_at > new Date()) {
        return null; // já processado por outra corrida, ou não está mais devido
      }
      const now = new Date();
      const updated = await tx.catalog2Product.update({
        where: { id: row.id },
        data: { status: "arquivado", archived_at: now, inactivation_processed_at: now },
      });
      await recordCatalog2ProductHistory(tx, {
        productId: updated.id,
        eventType: "inactivation_processed",
        description: "Produto inativado — data efetiva alcançada, contratação bloqueada.",
        actorUserId: null,
        actorKind: "system",
      });
      // Item 8.1: intenção gravada NA MESMA transação que efetiva a
      // inativação — nunca um efeito colateral solto depois do commit.
      await notifyInactivationRecipients(tx, updated, { effectiveAt: updated.inactivation_effective_at ?? new Date(), phase: "processed" });
      return updated;
    });
    if (result) {
      processed.push(result.id);
    }
  }
  return { processed };
}

// ── "Novo por 3 meses" — DERIVADO da publicação ─────────────────────────
const NEW_LABEL_WINDOW_DAYS = 90;
export function isNewByPublicationDate(publishedAt: Date | null | undefined, now = new Date()): boolean {
  if (!publishedAt) return false;
  return now.getTime() - publishedAt.getTime() <= NEW_LABEL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

// ── Serialização do detalhe ────────────────────────────────────────────
export async function getProductDetail(productId: string) {
  const product = await prisma.catalog2Product.findUnique({
    where: { id: productId },
    include: {
      pillar: true,
      category: true,
      four_f: { include: { four_f: true } },
      versions: {
        orderBy: { version_number: "desc" },
        include: {
          events: { orderBy: { created_at: "asc" } },
          variations: { orderBy: { sort_order: "asc" }, include: { options: { orderBy: { sort_order: "asc" }, include: { effects: { orderBy: { sort_order: "asc" } } } } } },
          addons: { orderBy: { sort_order: "asc" }, include: { effects: { orderBy: { sort_order: "asc" } } } },
          conditions: { orderBy: { sort_order: "asc" } },
          tasks: {
            orderBy: { sort_order: "asc" },
            include: { steps: { orderBy: { sort_order: "asc" } }, specialty: true, ai: true, dependencies: true, questionnaire: { include: { questions: { orderBy: { sort_order: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  const publishedVersion = product.versions.find((v) => v.id === product.published_version_id) ?? null;

  return {
    id: product.id,
    slug: product.slug,
    sequence_number: product.sequence_number,
    internal_name: product.internal_name,
    status: product.status,
    origin: product.origin,
    archived_at: product.archived_at,
    updated_at: product.updated_at,
    pillar: product.pillar ? { id: product.pillar.id, key: product.pillar.key, name: product.pillar.name } : null,
    category: product.category ? { id: product.category.id, key: product.category.key, name: product.category.name } : null,
    four_f: product.four_f.map((l) => ({ id: l.four_f.id, key: l.four_f.key, name: l.four_f.name })).sort((a, b) => a.key.localeCompare(b.key)),
    published_version_id: product.published_version_id,
    is_new: isNewByPublicationDate(publishedVersion?.published_at),
    published_at: publishedVersion?.published_at ?? null,
    versions: product.versions.map((v) => ({
      id: v.id,
      version_number: v.version_number,
      state: v.state,
      title: v.title,
      summary: v.summary,
      full_description: v.full_description,
      change_summary: v.change_summary,
      base_commercial_deadline_days: v.base_commercial_deadline_days ?? null,
      published_at: v.published_at,
      updated_at: v.updated_at,
      is_published_current: v.id === product.published_version_id,
      history: v.events.map((e) => ({ event_type: e.event_type, actor_user_id: e.actor_user_id, note: e.note, at: e.created_at })),
      variations: v.variations.map((va) => ({
        id: va.id,
        key: va.key,
        name: va.name,
        is_required: va.is_required,
        selection_type: va.selection_type,
        sort_order: va.sort_order,
        notes: va.notes,
        options: va.options.map((o) => ({
          id: o.id,
          key: o.key,
          label: o.label,
          sort_order: o.sort_order,
          is_default: o.is_default,
          effects: o.effects.map((e) => ({ id: e.id, effect_type: e.effect_type, effect_value: e.effect_value })),
        })),
      })),
      addons: v.addons.map((a) => ({
        id: a.id,
        key: a.key,
        name: a.name,
        description: a.description,
        sort_order: a.sort_order,
        is_default_selected: a.is_default_selected,
        is_active: a.is_active,
        base_cost: a.base_cost,
        target_task_id: a.target_task_id,
        target_step_id: a.target_step_id,
        effects: a.effects.map((e) => ({ id: e.id, effect_type: e.effect_type, effect_value: e.effect_value })),
      })),
      conditions: v.conditions.map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        is_active: c.is_active,
        sort_order: c.sort_order,
        trigger_source: c.trigger_source,
        trigger_ref: c.trigger_ref,
        operator: c.operator,
        comparison_value: c.comparison_value,
        effect_type: c.effect_type,
        effect_value: c.effect_value,
        explanation: c.explanation || describeCondition(c),
      })),
      tasks: v.tasks.map((t) => ({
        id: t.id,
        key: t.key,
        name: t.name,
        description: t.description,
        objective: t.objective,
        sort_order: t.sort_order,
        execution_mode: t.execution_mode,
        estimated_minutes: t.estimated_minutes,
        requires_review: t.requires_review,
        requires_client_approval: t.requires_client_approval,
        is_conditional: t.is_conditional,
        // Reunião 10/09 ("36 produtos funcionalmente completos para
        // teste"): o detalhe administrativo precisa mostrar quando
        // especialidade/tempo são dado de teste, nunca real.
        effort_is_provisional: t.effort_is_provisional,
        effort_source: t.effort_source,
        specialty: t.specialty ? { id: t.specialty.id, key: t.specialty.key, name: t.specialty.name, max_hourly_rate: t.specialty.max_hourly_rate } : null,
        // Vínculo de questionário (reunião 2026-09-14, Item 3) — referência à
        // biblioteca compartilhada, nunca uma cópia das perguntas.
        questionnaire: t.questionnaire
          ? {
              id: t.questionnaire.id,
              name: t.questionnaire.name,
              description: t.questionnaire.description,
              questions: t.questionnaire.questions.map((q) => ({ id: q.id, key: q.key, label: q.label, is_required: q.is_required, sort_order: q.sort_order })),
            }
          : null,
        depends_on: t.dependencies.map((d) => d.depends_on_task_id),
        ai: t.ai
          ? {
              provider: t.ai.provider,
              model: t.ai.model,
              est_input_tokens: t.ai.est_input_tokens,
              est_output_tokens: t.ai.est_output_tokens,
              unit_cost_input_per_1k: t.ai.unit_cost_input_per_1k,
              unit_cost_output_per_1k: t.ai.unit_cost_output_per_1k,
              currency: t.ai.currency,
              est_review_rounds: t.ai.est_review_rounds,
              human_review_required: t.ai.human_review_required,
            }
          : null,
        steps: t.steps.map((s) => ({
          id: s.id,
          key: s.key,
          name: s.name,
          description: s.description,
          sort_order: s.sort_order,
          estimated_minutes: s.estimated_minutes,
          is_conditional: s.is_conditional,
          specialty_id: s.specialty_id,
        })),
      })),
    })),
  };
}

export { describeCondition, logVersionEvent };
