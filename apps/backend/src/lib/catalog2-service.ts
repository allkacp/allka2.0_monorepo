// Serviço do novo catálogo — construtor, versões e publicação (bloco 3/6).
//
// Regras que o schema sozinho não garante e ficam AQUI (revalidadas no
// servidor, nunca no navegador):
//  - versão "publicada" é IMUTÁVEL (edição direta → 409);
//  - publicar cria/usa uma versão NOVA e NUNCA apaga a anterior;
//  - publicação é transacional e idempotente (publish_client_action_id);
//  - antes de publicar, uma bateria de validações (Parte 8 do lote);
//  - efeitos e condições só usam vocabulário FECHADO e referências válidas.

import { providerProblem } from "./catalog2-ai-providers";
import { parseOptions, parseValidation } from "./catalog2-question-types";
import { runCost } from "./catalog2-ai";
import { commercialCloneData, serializeCommercialFields } from "./catalog2-commercial-fields";
import { Prisma } from "@prisma/client";
import { copyTaskDeliverables } from "./task-deliverables";
import { aiCopyData, AI_EXECUTION_MODES } from "./catalog2-ai";
import { blockersOf, commercialConsistency, loadConsistency, saleLabel, RESOLUTION_EFFECTS } from "./catalog2-commercial";
import { prisma } from "./prisma";
import { taskDivergesFromModel, stepDivergesFromModel } from "./catalog2-models";
import { CATALOG2_STATUSES, CATALOG2_CLIENT_VISIBLE_STATUSES, type Catalog2Status } from "./catalog2-foundation";
import {
  CONDITION_OPERATORS,
  CONDITION_TRIGGER_SOURCES,
  describeCondition,
  validateEffect,
  type EffectValidationCtx,
} from "./catalog2-effects";
import { computePricing, defaultSelection, PRICING_MODES, type PricingMode } from "./catalog2-pricing";
import { logCommercialChangeEvent } from "./catalog2-commercial-change-log";
import { recordCatalog2ProductHistory } from "./catalog2-product-history";
import { maybeCreateCatalog2ActivationJobOnStatusTransition, notifyValidQuoteOwnersOfCommercialChange, createCatalog2NotificationJob, type Catalog2NotificationRecipientInput } from "./catalog2-notifications";
import type { DbClient } from "./project-scope";
import { cloneConnections, serializeRequirement, validateConnectionConfig } from "./connections/requirements";
import { validateUniversalV2 } from "./catalog2-universal-validate";

/** Escopo de cobrança exposto pela API (adicionais, efeitos de variação e condições). */
export function chargeOut(x: { charge_scope: string; charge_start_cycle: number; charge_end_cycle: number | null; charge_quantity: number | null; source_task_key: string | null; source_step_key: string | null; effort_scale_by_quantity?: boolean }) {
  return { charge_scope: x.charge_scope, charge_start_cycle: x.charge_start_cycle, charge_end_cycle: x.charge_end_cycle, charge_quantity: x.charge_quantity, source_task_key: x.source_task_key, source_step_key: x.source_step_key, effort_scale_by_quantity: !!x.effort_scale_by_quantity };
}

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

export function slugify(input: string): string {
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

/**
 * Nome interno EDITÁVEL (rota oficial): só administrador (guarda do router), com histórico antes/depois, autor e data.
 * Não mexe no título comercial. O slug só muda com confirmação explícita (ele é o endereço do produto e a identidade nos pacotes de transferência).
 */
export async function renameProductInternalName(
  productId: string,
  input: { internal_name: string; slug?: string | null; confirm_slug_change?: boolean },
  actorUserId: string,
) {
  const name = input.internal_name.trim();
  if (!name || name.length > 200) throw new Catalog2Error("Informe o nome interno (até 200 caracteres).", 422, "invalid_internal_name");
  const product = await prisma.catalog2Product.findUnique({ where: { id: productId } });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  if (await prisma.catalog2Product.findFirst({ where: { internal_name: name, id: { not: productId } }, select: { id: true } })) {
    throw new Catalog2Error("Já existe outro produto com este nome interno.", 409, "duplicate_internal_name");
  }
  let newSlug: string | null = null;
  if (input.slug != null && input.slug !== product.slug) {
    if (!input.confirm_slug_change) {
      throw new Catalog2Error("Alterar o slug muda o endereço do produto e a identidade nos pacotes de transferência. Confirme enviando confirm_slug_change=true.", 422, "slug_change_not_confirmed");
    }
    newSlug = slugify(input.slug);
    if (!newSlug) throw new Catalog2Error("Slug inválido.", 422, "invalid_slug");
    if (await prisma.catalog2Product.findFirst({ where: { slug: newSlug, id: { not: productId } }, select: { id: true } })) throw new Catalog2Error("Já existe outro produto com este slug.", 409, "duplicate_slug");
  }
  if (name === product.internal_name && !newSlug) return { changed: false, internal_name: product.internal_name, slug: product.slug };
  await prisma.$transaction(async (tx) => {
    await tx.catalog2Product.update({ where: { id: productId }, data: { internal_name: name, ...(newSlug ? { slug: newSlug } : {}) } });
    await recordCatalog2ProductHistory(tx, {
      productId, eventType: "internal_name_updated",
      description: `Nome interno alterado de "${product.internal_name}" para "${name}"${newSlug ? ` (slug de "${product.slug}" para "${newSlug}")` : ""}.`,
      before: { internal_name: product.internal_name, slug: product.slug }, after: { internal_name: name, slug: newSlug ?? product.slug },
      actorUserId,
    });
  });
  return { changed: true, internal_name: name, slug: newSlug ?? product.slug };
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
        sale_modes_enforced: true,
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
            addons: { include: { effects: true, choices: true } },
            conditions: true,
            access_requirements: true,
            approval_gates: true,
            sla_rules: true,
            tasks: { include: { steps: true, ai: true, dependencies: true, deliverables: true } },
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
        ...commercialCloneData(last as unknown as Record<string, unknown> | null),
        // O prazo comercial base acompanha a versão (senão a nova versão "perde" o prazo).
        base_commercial_deadline_days: last?.base_commercial_deadline_days ?? null,
        pricing_mode: last?.pricing_mode ?? undefined,
        manual_price: last?.manual_price ?? undefined,
        manual_deadline_days: last?.manual_deadline_days ?? undefined,
        accepts_one_time: last?.accepts_one_time ?? undefined,
        accepts_recurring: last?.accepts_recurring ?? undefined,
        has_initial_implementation: last?.has_initial_implementation ?? undefined,
        implementation_rule: last?.implementation_rule ?? undefined,
        implementation_blocks_operation: last?.implementation_blocks_operation ?? undefined,
        sell_mode: last?.sell_mode ?? undefined,
        sale_modes_enforced: true,
        created_by_user_id: actorUserId,
      },
    });

    // Copia a ESTRUTURA da última versão para o novo rascunho (deep clone
    // por key), para o admin partir do que estava publicado.
    if (last) await cloneVersionStructure(tx, last, nv.id);
    if (last) await cloneConnections(tx, last.id, nv.id);
    await logVersionEvent(tx, nv.id, "new_version", actorUserId, `Rascunho v${nextNumber} criado a partir da v${last?.version_number ?? "-"}.`);
    return nv;
  });
}

type FullVersion = Prisma.Catalog2ProductVersionGetPayload<{
  include: {
    variations: { include: { options: { include: { effects: true } } } };
    addons: { include: { effects: true; choices: true } };
    conditions: true;
    access_requirements: true;
    approval_gates: true;
    sla_rules: true;
    tasks: { include: { steps: true; ai: true; dependencies: true; deliverables: true } };
  };
}>;

async function cloneVersionStructure(db: Prisma.TransactionClient, src: FullVersion, destId: string) {
  for (const a of src.access_requirements) {
    await db.catalog2VersionAccess.create({ data: { version_id: destId, access_type: a.access_type, label: a.label, is_required: a.is_required, notes: a.notes, sort_order: a.sort_order } });
  }
  const taskIdByKey = new Map<string, string>();
  const stepIdByRef = new Map<string, string>();
  for (const t of src.tasks) {
    const nt = await db.catalog2Task.create({
      data: {
        task_model_id: t.task_model_id,
        task_model_revision: t.task_model_revision,
        requires_qualification: t.requires_qualification,
        cycle_type: t.cycle_type,
        repeat_rule: t.repeat_rule,
        repeat_every_cycles: t.repeat_every_cycles,
        executor_continuity: t.executor_continuity,
        asset_rule: t.asset_rule,
        asset_revalidate_days: t.asset_revalidate_days,
        // Qualificador designado e campos operacionais seguem para a versão nova.
        qualifier_user_id: t.qualifier_user_id,
        qualification_mode: t.qualification_mode,
        qualification_min_approvals: t.qualification_min_approvals,
        qualification_cost_mode: t.qualification_cost_mode,
        qualification_specialty_id: t.qualification_specialty_id,
        qualification_hourly_rate: t.qualification_hourly_rate,
        qualification_minutes: t.qualification_minutes,
        qualification_percent: t.qualification_percent,
        qualification_fixed_amount: t.qualification_fixed_amount,
        qualifier_kind: t.qualifier_kind,
        reviewer_user_id: t.reviewer_user_id,
        review_minutes: t.review_minutes,
        review_specialty_id: t.review_specialty_id,
        ops: (t.ops ?? undefined) as Prisma.InputJsonValue | undefined,
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
          step_model_id: s.step_model_id,
          step_model_revision: s.step_model_revision,
          purpose: s.purpose,
          execution_mode: s.execution_mode,
          completion_criteria: s.completion_criteria,
          first_execution_only: s.first_execution_only,
          skip_when_same_executor: s.skip_when_same_executor,
          ops: (s.ops ?? undefined) as Prisma.InputJsonValue | undefined,
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
    await copyTaskDeliverables(db, t, nt.id);
    if (t.ai) {
      await db.catalog2TaskAI.create({
        data: { task_id: nt.id, ...aiCopyData(t.ai) },
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
        is_active: va.is_active,
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
          is_active: opt.is_active,
          availability: opt.availability,
          availability_note: opt.availability_note,
          effects: { create: opt.effects.map((e) => ({ effect_type: e.effect_type, effect_value: e.effect_value, sort_order: e.sort_order, charge_scope: e.charge_scope, charge_start_cycle: e.charge_start_cycle, charge_end_cycle: e.charge_end_cycle, charge_quantity: e.charge_quantity, source_task_key: e.source_task_key, source_step_key: e.source_step_key, effort_scale_by_quantity: e.effort_scale_by_quantity })) },
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
        addon_type: ad.addon_type, qty_min: ad.qty_min, qty_max: ad.qty_max, qty_step: ad.qty_step, unit_label: ad.unit_label, unit_base_cost: ad.unit_base_cost,
        unit_minutes: ad.unit_minutes, unit_deadline_days: ad.unit_deadline_days, auto_quote_limit: ad.auto_quote_limit,
        choices: { create: ad.choices.map((c) => ({ key: c.key, label: c.label, sort_order: c.sort_order, is_default: c.is_default, is_active: c.is_active, base_cost: c.base_cost, minutes: c.minutes, deadline_days: c.deadline_days, qty_from: c.qty_from, qty_to: c.qty_to, requires_quote: c.requires_quote })) },
        charge_scope: ad.charge_scope, charge_start_cycle: ad.charge_start_cycle, charge_end_cycle: ad.charge_end_cycle, charge_quantity: ad.charge_quantity, source_task_key: ad.source_task_key, source_step_key: ad.source_step_key,
        target_task_id: ad.target_task_id ? taskIdByKey.get(src.tasks.find((x) => x.id === ad.target_task_id)?.key ?? "") ?? null : null,
        target_step_id: ad.target_step_id ? stepIdByRef.get(refForStepId(src, ad.target_step_id) ?? "") ?? null : null,
        effects: { create: ad.effects.map((e) => ({ effect_type: e.effect_type, effect_value: e.effect_value, sort_order: e.sort_order, charge_scope: e.charge_scope, charge_start_cycle: e.charge_start_cycle, charge_end_cycle: e.charge_end_cycle, charge_quantity: e.charge_quantity, source_task_key: e.source_task_key, source_step_key: e.source_step_key, effort_scale_by_quantity: e.effort_scale_by_quantity })) },
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
        charge_scope: c.charge_scope, charge_start_cycle: c.charge_start_cycle, charge_end_cycle: c.charge_end_cycle, charge_quantity: c.charge_quantity, source_task_key: c.source_task_key, source_step_key: c.source_step_key,
        effort_scale_by_quantity: c.effort_scale_by_quantity,
      },
    });
  }
  // Portões de aprovação e regras de prazo/SLA (estrutura universal v2) seguem para a versão nova.
  for (const g of src.approval_gates) {
    await db.catalog2ApprovalGate.create({ data: { version_id: destId, key: g.key, name: g.name, description: g.description, anchor_task_key: g.anchor_task_key, anchor_step_key: g.anchor_step_key, position: g.position, approver_kind: g.approver_kind, group_key: g.group_key, sequence_no: g.sequence_no, group_mode: g.group_mode, rejection_return_step_key: g.rejection_return_step_key, requires_comment: g.requires_comment, is_required: g.is_required, is_active: g.is_active, sort_order: g.sort_order } });
  }
  for (const r of src.sla_rules) {
    await db.catalog2SlaRule.create({ data: { version_id: destId, key: r.key, name: r.name, scope_kind: r.scope_kind, target_key: r.target_key, modality: r.modality, amount: r.amount, unit: r.unit, anchor: r.anchor, description: r.description, is_active: r.is_active, sort_order: r.sort_order } });
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
  const variations = await prisma.catalog2Variation.findMany({ where: { version_id: versionId }, include: { options: true } });
  const optionKeys = new Set<string>();
  const inactiveOptionKeys = new Set<string>();
  for (const va of variations)
    for (const o of va.options) {
      optionKeys.add(o.key);
      if (!o.is_active || !va.is_active) inactiveOptionKeys.add(o.key);
    }
  const addons = await prisma.catalog2Addon.findMany({ where: { version_id: versionId }, select: { key: true, is_active: true } });
  const addonKeys = new Set(addons.map((a) => a.key));
  const inactiveAddonKeys = new Set(addons.filter((a) => !a.is_active).map((a) => a.key));
  return { taskKeys, conditionalTaskKeys, stepRefs, conditionalStepRefs, optionKeys, inactiveOptionKeys, addonKeys, inactiveAddonKeys };
}

export function validateConditionShape(c: {
  trigger_source: string;
  trigger_ref?: string | null;
  comparison_value?: string | null;
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
  const refErr = validateConditionReference(c, ctx);
  if (refErr) return refErr;
  return validateEffect(c.effect_type, c.effect_value, ctx);
}

// Referências do GATILHO: chave inexistente ou inativa nunca pode ser publicada (a condição
// simplesmente nunca dispararia, sem ninguém perceber).
export function validateConditionReference(c: { trigger_source: string; trigger_ref?: string | null; comparison_value?: string | null; operator: string }, ctx: EffectValidationCtx): string | null {
  const ref = (c.trigger_ref ?? "").trim();
  const cmp = (c.comparison_value ?? "").trim();
  switch (c.trigger_source) {
    case "variation_option": {
      if (!ctx.optionKeys) return null;
      if (c.operator === "selected" || c.operator === "not_selected") {
        if (!ref) return "Informe a opção de variação do gatilho.";
        if (!ctx.optionKeys.has(ref)) return `O gatilho aponta para a opção "${ref}", que não existe nesta versão.`;
        if (ctx.inactiveOptionKeys?.has(ref)) return `O gatilho aponta para a opção "${ref}", que está inativa.`;
        return null;
      }
      if (c.operator === "eq" || c.operator === "neq") {
        if (!cmp) return "Informe a opção de variação a comparar.";
        if (!ctx.optionKeys.has(cmp)) return `A condição compara com a opção "${cmp}", que não existe nesta versão.`;
        return null;
      }
      if (c.operator === "contains") return cmp ? null : "Informe o texto a procurar na opção escolhida.";
      return `O operador "${c.operator}" não se aplica a opções de variação.`;
    }
    case "addon_selected": {
      if (!ctx.addonKeys) return null;
      if (c.operator !== "selected" && c.operator !== "not_selected") return "Para adicionais use \"está selecionado\" ou \"não está selecionado\".";
      if (!ref) return "Informe o adicional do gatilho.";
      if (!ctx.addonKeys.has(ref)) return `O gatilho aponta para o adicional "${ref}", que não existe nesta versão.`;
      if (ctx.inactiveAddonKeys?.has(ref)) return `O gatilho aponta para o adicional "${ref}", que está inativo.`;
      return null;
    }
    case "quantity": {
      if (!["eq", "neq", "gte", "lte"].includes(c.operator)) return "Para quantidade use igual, diferente, maior ou igual, ou menor ou igual.";
      if (!cmp || !Number.isFinite(Number(cmp))) return "Informe um número para comparar com a quantidade.";
      return null;
    }
    case "client_answer":
    case "contract_attribute": {
      if (!ref) return "Informe a chave da resposta/atributo do gatilho.";
      if (!["selected", "not_selected"].includes(c.operator) && !cmp && c.operator !== "contains") return "Informe o valor de comparação.";
      return null;
    }
    default:
      return null;
  }
}

// ── Publicação ─────────────────────────────────────────────────────────
export interface PublishValidation {
  ok: boolean;
  issues: string[];
  // Metadados para a interface levar o administrador ao campo exato. O
  // texto continua por compatibilidade, mas a UI não precisa mais adivinhar
  // qual parte de uma tarefa está pendente pelo texto da mensagem.
  issue_details: Array<{ message: string; target: string; task_ids?: string[]; code?: string }>;
  pricing_pending: boolean;
  pricing_mode?: PricingMode;
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
  // Toda tarefa precisa de ao menos uma ETAPA: é a etapa que carrega especialidade,
  // horas e o pagamento do nômade (ou o custo interno).
  for (const t of v.tasks) {
    // IA (Pedido 3, fase 5): tarefa feita por IA (ou humano+IA) precisa de um perfil de IA ativo e autorizado.
    if (AI_EXECUTION_MODES.includes(t.execution_mode)) {
      const prof = t.ai?.profile_id ? await prisma.catalog2AIProfile.findUnique({ where: { id: t.ai.profile_id }, select: { is_active: true } }) : null;
      if (!prof?.is_active) issues.push(`A tarefa "${t.name}" usa IA e precisa de um perfil de IA ativo e autorizado.`);
      else {
        const full = await prisma.catalog2AIProfile.findUniqueOrThrow({ where: { id: t.ai!.profile_id! } });
        const prov = providerProblem(full.provider, full.model);
        if (prov) issues.push(`A tarefa "${t.name}": ${prov}`);
        if (!(t.ai!.instructions?.trim() || full.base_instructions?.trim())) issues.push(`A tarefa "${t.name}" usa IA e precisa de instruções (na tarefa ou no perfil).`);
        if (full.requires_human_review && !t.ai!.human_review_required) issues.push(`A tarefa "${t.name}": o perfil de IA "${full.name}" exige revisão humana, mas a tarefa não a configura.`);
        if (runCost(full, 1000, 1000) === null) issues.push(`A tarefa "${t.name}": o custo da IA não pode ser calculado (defina o custo por 1.000 tokens ou um custo fixo no perfil "${full.name}").`);
      }
    }
    if (t.steps.length === 0) issues.push(`A tarefa "${t.name}" precisa de ao menos uma etapa.`);
    for (const st of t.steps) {
      if (!(st.estimated_minutes && st.estimated_minutes > 0) || !(st.specialty_id ?? t.specialty_id)) {
        issues.push(`A etapa "${st.name}" da tarefa "${t.name}" precisa de especialidade e horas.`);
      }
    }
  }

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
    const activeOptions = va.options.filter((o) => o.is_active);
    if (va.is_active && va.is_required && activeOptions.length === 0) issues.push(`A variação "${va.name}" é obrigatória mas não tem opções ativas.`);
    if (va.is_active && (va.selection_type ?? "single") === "quantity" && activeOptions.length === 0) issues.push(`A variação por quantidade "${va.name}" precisa de ao menos uma opção ativa (ela guarda o efeito por unidade).`);
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

  // Integridade estrutural (universal): ciclos de dependência, modelo global inativo e cobrança apontando para tarefa inexistente.
  {
    const taskIds = v.tasks.map((t) => t.id);
    const deps = taskIds.length ? await prisma.catalog2TaskDependency.findMany({ where: { task_id: { in: taskIds } } }) : [];
    const nameById = new Map(v.tasks.map((t) => [t.id, t.name]));
    const graph = new Map<string, string[]>();
    for (const d of deps) graph.set(d.task_id, [...(graph.get(d.task_id) ?? []), d.depends_on_task_id]);
    const state = new Map<string, number>();
    const reported = new Set<string>();
    const visit = (n: string, path: string[]) => {
      if (state.get(n) === 2) return;
      if (state.get(n) === 1) { const key = [...path.slice(path.indexOf(n))].sort().join(","); if (!reported.has(key)) { reported.add(key); issues.push(`Dependência circular entre tarefas: ${[...path.slice(path.indexOf(n)), n].map((x) => `"${nameById.get(x) ?? x}"`).join(" → ")}.`); } return; }
      state.set(n, 1);
      for (const m of graph.get(n) ?? []) visit(m, [...path, n]);
      state.set(n, 2);
    };
    for (const t of v.tasks) visit(t.id, []);
    for (const d of deps) if (d.task_id === d.depends_on_task_id) issues.push(`A tarefa "${nameById.get(d.task_id)}" depende de si mesma.`);
    const modelIds = [...new Set(v.tasks.map((t) => t.task_model_id).filter((x): x is number => x != null))];
    if (modelIds.length) {
      const inactive = await prisma.catalog2TaskModel.findMany({ where: { id: { in: modelIds }, is_active: false }, select: { id: true } });
      const inactiveIds = new Set(inactive.map((m) => m.id));
      for (const t of v.tasks) if (t.task_model_id != null && inactiveIds.has(t.task_model_id)) issues.push(`A tarefa "${t.name}" usa o modelo Tarefa #${t.task_model_id}, que está inativo — troque por um modelo ativo.`);
    }
    const stepModelIds = [...new Set(v.tasks.flatMap((t) => t.steps.map((s) => s.step_model_id)).filter((x): x is number => x != null))];
    if (stepModelIds.length) {
      const inactive = await prisma.catalog2StepModel.findMany({ where: { id: { in: stepModelIds }, is_active: false }, select: { id: true } });
      const inactiveIds = new Set(inactive.map((m) => m.id));
      for (const t of v.tasks) for (const s of t.steps) if (s.step_model_id != null && inactiveIds.has(s.step_model_id)) issues.push(`A etapa "${s.name}" da tarefa "${t.name}" usa o modelo Etapa #${s.step_model_id}, que está inativo — troque por um modelo ativo.`);
    }
    const taskKeys = new Set(v.tasks.map((t) => t.key));
    const chargeRefs: { label: string; key: string | null }[] = [
      ...v.addons.map((a) => ({ label: `Adicional "${a.name}"`, key: a.source_task_key })),
      ...v.addons.flatMap((a) => a.effects.map((e) => ({ label: `Adicional "${a.name}"`, key: e.source_task_key }))),
      ...v.variations.flatMap((va) => va.options.flatMap((o) => o.effects.map((e) => ({ label: `Opção "${va.name} / ${o.label}"`, key: e.source_task_key })))),
      ...v.conditions.map((c) => ({ label: `Condição "${c.name}"`, key: c.source_task_key })),
    ];
    for (const r of chargeRefs) if (r.key && !taskKeys.has(r.key)) issues.push(`${r.label}: a cobrança aponta para a tarefa "${r.key}", que não existe nesta versão.`);
  }

  // Referências quebradas: tarefa condicional nunca incluída por nenhum efeito.
  const includedTaskKeys = new Set<string>();
  for (const c of v.conditions) if (c.effect_type === "add_task") includedTaskKeys.add(c.effect_value);
  for (const va of v.variations) for (const o of va.options) for (const e of o.effects) if (e.effect_type === "add_task") includedTaskKeys.add(e.effect_value);
  for (const ad of v.addons) for (const e of ad.effects) if (e.effect_type === "add_task") includedTaskKeys.add(e.effect_value);
  // Modalidades de compra x entrega recorrente x períodos precisam contar a mesma história.
  for (const c of blockersOf(await loadConsistency(prisma, v.product_id, v))) issues.push(c.message);
  for (const t of v.tasks) if (t.is_conditional && !includedTaskKeys.has(t.key)) issues.push(`A tarefa condicional "${t.name}" nunca é incluída por nenhum efeito.`);

  // Conexões e acessos necessários (módulo opcional: desativado = nenhuma pendência).
  for (const m of await validateConnectionConfig(prisma, versionId)) issues.push(m);
  for (const m of await validateUniversalV2(prisma, versionId)) issues.push(m);

  // Tudo que veio antes daqui é estrutural. A opção de publicar com
  // pendência comercial nunca pode mascarar uma dessas falhas.
  const hasStructuralIssues = issues.length > 0;

  // Preço e prazo: NUNCA se publica com custo, preço ou prazo indefinido em produto contratável.
  // Única exceção explícita: pricing_mode "on_request" (sob consulta — sem preço público e sem cotação automática).
  const mode = (PRICING_MODES as readonly string[]).includes(v.pricing_mode) ? (v.pricing_mode as PricingMode) : "calculated";
  const pricingIssues: { code: string; message: string }[] = [];
  let pricingPending = false;
  if (mode === "on_request") {
    // sob consulta: publica sem preço público; não gera cotação nem contratação (garantido em computePricing/client).
  } else if (mode === "manual_fixed") {
    if (!(v.manual_price != null && v.manual_price > 0)) pricingIssues.push({ code: "manual_price_missing", message: "Modo preço fixo: informe o preço." });
    if (!(v.manual_deadline_days != null && v.manual_deadline_days >= 1)) pricingIssues.push({ code: "manual_deadline_missing", message: "Modo preço fixo: informe o prazo em dias." });
    if (!v.accepts_one_time && !v.accepts_recurring) pricingIssues.push({ code: "no_modality", message: "Nenhuma modalidade de compra está habilitada." });
  } else {
    try {
      const sel = await defaultSelection(versionId);
      const pricing = await computePricing(versionId, sel);
      pricingPending = pricing.pricing_pending;
      for (const p of pricing.pending_info) pricingIssues.push({ code: "pricing_pending", message: `Custo/preço indefinido: falta ${p}.` });
      if (pricing.lines.human_cost.amount == null && !pricing.pending_info.length) pricingIssues.push({ code: "human_cost_undefined", message: "Custo humano indeterminado." });
      if (pricing.lines.ia_cost.amount == null && !pricing.pending_info.length) pricingIssues.push({ code: "ia_cost_undefined", message: "Custo de IA indeterminado." });
      if (pricing.lines.commercial_final_price.amount == null && !pricing.pending_info.length) pricingIssues.push({ code: "price_not_calculable", message: "O preço comercial não é calculável." });
      if (pricing.deadline.commercial_deadline_days == null) pricingIssues.push({ code: "deadline_undefined", message: "Prazo comercial indefinido: informe o prazo comercial base da versão." });
      if (pricing.estimated_deadline_days == null) pricingIssues.push({ code: "deadline_not_calculable", message: "O prazo não é calculável — nenhuma tarefa tem duração estimada." });
      if (v.accepts_one_time && pricing.split.avulso_total == null) pricingIssues.push({ code: "modality_without_price", message: "A modalidade avulsa está habilitada, mas não tem preço calculável." });
      if (v.accepts_recurring && (pricing.split.first_charge == null || pricing.split.renewal == null)) pricingIssues.push({ code: "modality_without_price", message: "A assinatura mensal está habilitada, mas a primeira cobrança ou a renovação não tem preço calculável." });
      const dup = new Set<string>();
      for (const w of pricing.quote_blockers) if (!/simula/i.test(w) && !dup.has(w)) { dup.add(w); if (!pricingIssues.some((i) => i.message.toLowerCase().includes(w.toLowerCase().slice(0, 12)))) pricingIssues.push({ code: "quote_blocker", message: `Bloqueador comercial: ${w}.` }); }
    } catch {
      pricingIssues.push({ code: "pricing_error", message: "Não foi possível calcular o preço/prazo desta versão." });
    }
  }
  for (const p of pricingIssues) issues.push(p.message);
  const codeByMessage = new Map(pricingIssues.map((p) => [p.message, p.code]));

  const issue_details = issues.map((message) => {
    if (message.startsWith("Conexões:")) return { message, target: "connections" };
    if (message.includes("título comercial")) return { message, target: "title" };
    if (message.includes("descrição completa")) return { message, target: "full_description" };
    if (message.includes("um pilar")) return { message, target: "pillar" };
    if (message.includes("uma categoria")) return { message, target: "category" };
    if (message.includes("classificação 4F")) return { message, target: "four_f" };
    if (message.includes("ao menos uma tarefa")) return { message, target: "task_create" };
    if (message.includes("ao menos uma etapa") || message.includes("precisa de especialidade e horas")) return { message, target: "task_create" };
    if (message.includes("especialidade/tempo PROVISÓRIOS")) {
      return { message, target: "task_effort", task_ids: v.tasks.filter((t) => t.effort_is_provisional).map((t) => t.id) };
    }
    if (message.includes("nenhuma tarefa tem duração estimada")) {
      return { message, target: "task_duration", task_ids: v.tasks.filter((t) => t.estimated_minutes == null).map((t) => t.id) };
    }
    if (message.startsWith("Dependência circular") || message.includes("depende de si mesma")) return { message, target: "task_create" };
    if (message.includes("que está inativo")) return { message, target: "task_create" };
    if (message.startsWith("Condição")) return { message, target: "conditions" };
    if (message.startsWith("Opção") || message.startsWith("Adicional") || message.startsWith("A variação")) return { message, target: "options" };
    return { message, target: "pricing", code: codeByMessage.get(message) ?? "pricing" };
  });

  return {
    ok: issues.length === 0,
    issues,
    issue_details,
    pricing_pending: pricingPending,
    // `force` NÃO ignora mais preço ou prazo indefinido em produto contratável (use pricing_mode "on_request" para "sob consulta").
    force_allowed: false,
    pricing_mode: mode,
    has_provisional_effort: hasProvisionalEffort,
  };
}

export async function publishVersion(
  versionId: string,
  actorUserId: string,
  /** `activate`: só "Publicar e ativar" muda o produto de em_preparacao para disponivel. Publicar sozinho NUNCA ativa. */
  opts: { clientActionId?: string; changeSummary?: string; force?: boolean; activate?: boolean } = {},
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
  if (!validation.ok) {
    // Erro estruturado: cada pendência volta com texto, destino na tela e código. `force` não ignora nenhuma delas.
    const err = new Catalog2Error(`A versão tem ${validation.issues.length} pendência(s) e não pode ser publicada.`, 422, opts.force ? "validation_force_not_allowed" : "validation_failed");
    (err as Catalog2Error & { details?: unknown }).details = { issues: validation.issues, issue_details: validation.issue_details, pricing_mode: validation.pricing_mode };
    throw err;
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
        sale_modes_enforced: true,
        published_at: now,
        published_by_user_id: actorUserId,
        publish_client_action_id: opts.clientActionId ?? null,
        change_summary: opts.changeSummary ?? version.change_summary,
        updated_by_user_id: actorUserId,
      },
    });
    const product = await tx.catalog2Product.findUnique({ where: { id: version.product_id } });
    const beforeStatus = product?.status ?? "em_preparacao";
    const afterStatus = opts.activate && beforeStatus === "em_preparacao" ? "disponivel" : beforeStatus;
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
    // Histórico: PUBLICAÇÃO e ATIVAÇÃO são eventos diferentes (publicar não ativa).
    await recordCatalog2ProductHistory(tx, {
      productId: version.product_id, versionId: published.id, eventType: "version_published",
      description: `Versão v${published.version_number} publicada${afterStatus === beforeStatus ? " (o status do produto não mudou)" : ""}.`,
      after: { version_number: published.version_number, product_status: afterStatus }, actorUserId: actorUserId === "system" ? null : actorUserId, actorKind: actorUserId === "system" ? "system" : "user",
    });
    if (afterStatus !== beforeStatus) {
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: published.id, eventType: "status_changed",
        description: `Produto ativado ao publicar (de "${beforeStatus}" para "${afterStatus}"), com confirmação explícita.`,
        before: { status: beforeStatus }, after: { status: afterStatus }, actorUserId: actorUserId === "system" ? null : actorUserId, actorKind: actorUserId === "system" ? "system" : "user",
      });
    }
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
      userId, type, title, message, severity: "warning", category: "alerta", actionUrl: `/admin/cadastro-produtos?produto=${product.id}`,
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
          addons: { orderBy: { sort_order: "asc" }, include: { effects: { orderBy: { sort_order: "asc" } }, choices: { orderBy: { sort_order: "asc" } } } },
          conditions: { orderBy: { sort_order: "asc" } },
          access_requirements: { orderBy: { sort_order: "asc" } },
          approval_gates: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
          sla_rules: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] },
          connection_requirements: { orderBy: { sort_order: "asc" }, include: { connection_type: true, dependencies: { orderBy: { dep_key: "asc" } }, triggers: { orderBy: { sort_order: "asc" } } } },
          tasks: {
            orderBy: { sort_order: "asc" },
            include: { deliverables: { orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] }, steps: { orderBy: { sort_order: "asc" }, include: { step_model: true } }, task_model: true, specialty: true, ai: true, dependencies: true, questionnaire: { include: { questions: { orderBy: { sort_order: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
  const publishedVersion = product.versions.find((v) => v.id === product.published_version_id) ?? null;
  const periodRows = await prisma.catalog2ProductPeriod.findMany({ where: { product_id: product.id }, select: { period: true, is_active: true } });

  return {
    id: product.id,
    delivery_recurrence: product.delivery_recurrence,
    slug: product.slug,
    sequence_number: product.sequence_number,
    internal_name: product.internal_name,
    status: product.status,
    // Cabeçalho: status do produto, versão, publicação e ativação são coisas DIFERENTES (Publicado ≠ Ativo; Em preparação ≠ Rascunho).
    header: (() => { const latest = product.versions[0] ?? null; return { product_status: product.status, current_version_number: latest?.version_number ?? null, current_version_state: latest?.state ?? null, published: !!publishedVersion, published_version_number: publishedVersion?.version_number ?? null, published_at: publishedVersion?.published_at ?? null, activated: product.status === "disponivel", awaiting_activation: !!publishedVersion && product.status === "em_preparacao" }; })(),
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
      ...serializeCommercialFields(v as unknown as Record<string, unknown>),
      change_summary: v.change_summary,
      base_commercial_deadline_days: v.base_commercial_deadline_days ?? null,
      accepts_one_time: v.accepts_one_time,
      accepts_recurring: v.accepts_recurring,
      has_initial_implementation: v.has_initial_implementation,
      implementation_rule: v.implementation_rule,
      implementation_blocks_operation: v.implementation_blocks_operation,
      sell_mode: v.sell_mode,
      pricing_mode: v.pricing_mode,
      manual_price: v.manual_price,
      manual_deadline_days: v.manual_deadline_days,
      show_executor_name: v.show_executor_name,
      sale_modes_enforced: v.sale_modes_enforced,
      // Diagnóstico interno (nunca vai ao cliente): o que está em conflito entre modalidade, entrega recorrente e períodos.
      sale_label: saleLabel(v),
      commercial_consistency: commercialConsistency({ version: v, product: { delivery_recurrence: product.delivery_recurrence }, periods: periodRows }),
      published_at: v.published_at,
      updated_at: v.updated_at,
      is_published_current: v.id === product.published_version_id,
      history: v.events.map((e) => ({ event_type: e.event_type, actor_user_id: e.actor_user_id, note: e.note, at: e.created_at })),
      access_requirements: v.access_requirements.map((a) => ({ id: a.id, access_type: a.access_type, label: a.label, is_required: a.is_required, notes: a.notes })),
      requires_connections: v.requires_connections,
      connection_requirements: v.connection_requirements.map(serializeRequirement),
      approval_gates: v.approval_gates.map((g) => ({ id: g.id, key: g.key, name: g.name, description: g.description, anchor_task_key: g.anchor_task_key, anchor_step_key: g.anchor_step_key, position: g.position, approver_kind: g.approver_kind, group_key: g.group_key, sequence_no: g.sequence_no, group_mode: g.group_mode, rejection_return_step_key: g.rejection_return_step_key, requires_comment: g.requires_comment, is_required: g.is_required, is_active: g.is_active, sort_order: g.sort_order })),
      sla_rules: v.sla_rules.map((r) => ({ id: r.id, key: r.key, name: r.name, scope_kind: r.scope_kind, target_key: r.target_key, modality: r.modality, amount: r.amount, unit: r.unit, anchor: r.anchor, description: r.description, is_active: r.is_active, sort_order: r.sort_order })),
      // Contagem clara: o que é BASE (sempre existe) x CONDICIONAL (só entra quando o cenário liga). Total possível = base + condicionais.
      counts: {
        tasks_base: v.tasks.filter((t) => !t.is_conditional).length,
        tasks_conditional: v.tasks.filter((t) => t.is_conditional).length,
        tasks_total: v.tasks.length,
        steps_base: v.tasks.reduce((a, t) => a + t.steps.filter((s) => !s.is_conditional).length, 0),
        steps_conditional: v.tasks.reduce((a, t) => a + t.steps.filter((s) => s.is_conditional).length, 0),
        steps_total: v.tasks.reduce((a, t) => a + t.steps.length, 0),
      },
      variations: v.variations.map((va) => ({
        id: va.id,
        key: va.key,
        name: va.name,
        is_required: va.is_required,
        selection_type: va.selection_type,
        sort_order: va.sort_order,
        notes: va.notes,
        is_active: va.is_active,
        options: va.options.map((o) => ({
          id: o.id,
          key: o.key,
          label: o.label,
          sort_order: o.sort_order,
          is_default: o.is_default,
          is_active: o.is_active,
          availability: o.availability,
          availability_note: o.availability_note,
          effects: o.effects.map((e) => ({ id: e.id, effect_type: e.effect_type, effect_value: e.effect_value, ...chargeOut(e) })),
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
        addon_type: a.addon_type, qty_min: a.qty_min, qty_max: a.qty_max, qty_step: a.qty_step, unit_label: a.unit_label, unit_base_cost: a.unit_base_cost,
        unit_minutes: a.unit_minutes, unit_deadline_days: a.unit_deadline_days, auto_quote_limit: a.auto_quote_limit,
        choices: a.choices.map((c) => ({ id: c.id, key: c.key, label: c.label, sort_order: c.sort_order, is_default: c.is_default, is_active: c.is_active, base_cost: c.base_cost, minutes: c.minutes, deadline_days: c.deadline_days, qty_from: c.qty_from, qty_to: c.qty_to, requires_quote: c.requires_quote })),
        ...chargeOut(a),
        target_task_id: a.target_task_id,
        target_step_id: a.target_step_id,
        effects: a.effects.map((e) => ({ id: e.id, effect_type: e.effect_type, effect_value: e.effect_value, ...chargeOut(e) })),
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
        ...chargeOut(c),
        explanation: c.explanation || describeCondition(c),
      })),
      tasks: v.tasks.map((t) => ({
        id: t.id,
        key: t.key,
        // Catálogo global: "Tarefa #ID" e a revisão do modelo usada por esta linha.
        task_model_id: t.task_model_id,
        task_model_revision: t.task_model_revision,
        requires_qualification: t.requires_qualification,
        cycle_type: t.cycle_type,
        repeat_rule: t.repeat_rule,
        repeat_every_cycles: t.repeat_every_cycles,
        executor_continuity: t.executor_continuity,
        asset_rule: t.asset_rule,
        asset_revalidate_days: t.asset_revalidate_days,
        qualifier_user_id: t.qualifier_user_id,
        qualification_cost_mode: t.qualification_cost_mode,
        qualification_specialty_id: t.qualification_specialty_id,
        qualification_hourly_rate: t.qualification_hourly_rate,
        qualification_minutes: t.qualification_minutes,
        qualification_percent: t.qualification_percent,
        qualification_fixed_amount: t.qualification_fixed_amount,
        qualifier_kind: t.qualifier_kind,
        reviewer_user_id: t.reviewer_user_id,
        review_minutes: t.review_minutes,
        review_specialty_id: t.review_specialty_id,
        deliverables: t.deliverables.map((d) => ({ id: d.id, key: d.key, name: d.name, description: d.description, type: d.type, responsible: d.responsible, is_required: d.is_required, requires_approval: d.requires_approval, visibility: d.visibility, step_id: d.step_id, sort_order: d.sort_order })),
        ops: t.ops ?? null,
        // "Modelo global" x "Configuração específica deste produto" (+ modelo mudou depois?)
        model: t.task_model
          ? {
              id: t.task_model.id, revision: t.task_model.revision, is_active: t.task_model.is_active,
              customized: taskDivergesFromModel(t, t.task_model),
              outdated: t.task_model.revision > (t.task_model_revision ?? 0),
            }
          : null,
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
              // Configuração COMPLETA da pergunta (tipo, ajuda, opções, padrão, validação, visibilidade, uso): sem isto a tela reabre tudo como texto longo e regrava errado.
              questions: t.questionnaire.questions.map((q) => ({ id: q.id, key: q.key, label: q.label, is_required: q.is_required, sort_order: q.sort_order, question_type: q.question_type, help_text: q.help_text, options: parseOptions(q.options_json), default_value: q.default_value, validation: parseValidation(q.validation_json), visibility: q.visibility, answer_usage: q.answer_usage })),
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
              est_runs: t.ai.est_runs,
              human_review_required: t.ai.human_review_required,
              profile_id: t.ai.profile_id,
              ai_mode: t.ai.ai_mode,
              ai_trigger: t.ai.ai_trigger,
              instructions: t.ai.instructions,
              prompt_version: t.ai.prompt_version,
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
          step_model_id: s.step_model_id,
          step_model_revision: s.step_model_revision,
          // valores efetivos (ajuste do produto, senão o do modelo global)
          purpose: s.purpose ?? s.step_model?.purpose ?? "execucao",
          execution_mode: s.execution_mode ?? s.step_model?.execution_mode ?? "humano",
          completion_criteria: s.completion_criteria ?? s.step_model?.completion_criteria ?? null,
          is_access_validation: s.step_model?.is_access_validation ?? false,
          first_execution_only: s.first_execution_only,
          skip_when_same_executor: s.skip_when_same_executor,
          ops: s.ops ?? null,
          model: s.step_model
            ? {
                id: s.step_model.id, revision: s.step_model.revision, is_active: s.step_model.is_active,
                customized: stepDivergesFromModel(s, s.step_model),
                outdated: s.step_model.revision > (s.step_model_revision ?? 0),
              }
            : null,
        })),
      })),
    })),
  };
}

export { describeCondition, logVersionEvent };
