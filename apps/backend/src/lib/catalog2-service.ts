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
import { CATALOG2_STATUSES, type Catalog2Status } from "./catalog2-foundation";
import {
  CONDITION_OPERATORS,
  CONDITION_TRIGGER_SOURCES,
  describeCondition,
  validateEffect,
  type EffectValidationCtx,
} from "./catalog2-effects";
import { computePricing, defaultSelection } from "./catalog2-pricing";

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
        requires_review: t.requires_review,
        requires_client_approval: t.requires_client_approval,
        is_conditional: t.is_conditional,
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
  pricing_pending: boolean;
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
  if (!v) return { ok: false, issues: ["Versão não encontrada."], pricing_pending: true };

  const issues: string[] = [];
  if (!v.title?.trim()) issues.push("Informe o título comercial.");
  if (!v.full_description?.trim()) issues.push("Informe a descrição completa.");
  if (!v.product.pillar_id) issues.push("Selecione um pilar.");
  if (!v.product.category_id) issues.push("Selecione uma categoria.");
  const fourF = await prisma.catalog2ProductFourF.count({ where: { product_id: v.product_id } });
  if (fourF === 0) issues.push("Selecione ao menos uma classificação 4F.");
  if (v.tasks.length === 0) issues.push("O produto precisa de ao menos uma tarefa.");

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

  return { ok: issues.length === 0, issues, pricing_pending: pricingPending };
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
  if (!validation.ok && !opts.force) {
    throw new Catalog2Error("A versão tem pendências e não pode ser publicada.", 422, "validation_failed");
  }
  // Mesmo com force, preço pendente é permitido só se marcado como
  // "pendência comercial" — o motor já sinaliza; publicamos assim mesmo
  // porque a ata prevê "situação comercial explicitamente pendente".

  return prisma.$transaction(async (tx) => {
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
    await tx.catalog2Product.update({
      where: { id: version.product_id },
      data: {
        published_version_id: published.id,
        status: product?.status === "em_preparacao" ? "disponivel" : product?.status,
      },
    });
    await logVersionEvent(tx, published.id, "published", actorUserId, opts.changeSummary ?? "Versão publicada.");
    return published;
  }).catch((err) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && opts.clientActionId) {
      // Corrida com outra publicação do mesmo clientActionId.
      return prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { publish_client_action_id: opts.clientActionId } });
    }
    throw err;
  });
}

export async function setProductStatus(productId: string, status: string) {
  if (!CATALOG2_STATUSES.includes(status as Catalog2Status)) {
    throw new Catalog2Error(`Situação inválida: ${status}`, 400, "invalid_status");
  }
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId }, select: { id: true, published_version_id: true } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if ((status === "disponivel" || status === "temporariamente_inativo") && !product.published_version_id) {
    throw new Catalog2Error("O produto precisa de uma versão publicada antes de ficar disponível.", 409, "needs_published_version");
  }
  return prisma.catalog2Product.update({ where: { id: productId }, data: { status } });
}

export async function archiveProduct(productId: string, actorUserId: string) {
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  return prisma.catalog2Product.update({
    where: { id: productId },
    data: { status: "arquivado", archived_at: new Date(), archived_by_user_id: actorUserId },
  });
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
            include: { steps: { orderBy: { sort_order: "asc" } }, specialty: true, ai: true, dependencies: true },
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
    internal_name: product.internal_name,
    status: product.status,
    origin: product.origin,
    archived_at: product.archived_at,
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
      published_at: v.published_at,
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
        specialty: t.specialty ? { id: t.specialty.id, key: t.specialty.key, name: t.specialty.name, max_hourly_rate: t.specialty.max_hourly_rate } : null,
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
        })),
      })),
    })),
  };
}

export { describeCondition, logVersionEvent };
