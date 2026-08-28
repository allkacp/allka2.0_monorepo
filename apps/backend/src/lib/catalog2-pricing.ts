// Motor de PRECIFICAÇÃO E PRAZO do novo catálogo (sprint de produtos, bloco
// 3/6). Determinístico e explicável. NENHUMA chamada externa, NENHUM token
// real consumido. As regras confirmadas na ata 2026-08-26:
//
//   • custo base de tarefa = tempo estimado × valor da hora da especialidade
//     (sempre pela REFERÊNCIA MÁXIMA — o redutor por nível do nômade é
//      aplicado na execução, não no catálogo);
//   • custo de IA = tokens (entrada + saída) + rodadas de revisão previstas
//     — nunca por horas;
//   • sobre o custo acumulado a plataforma soma impostos, comissões, taxas
//     operacionais e margem "definidas no módulo de precificação".
//
// A ata NÃO informa os percentuais → cada taxa/margem ausente aparece como
// "aguardando definição comercial" e NÃO é aplicada; o resultado é marcado
// `pricing_pending`. O motor nunca inventa valor.

import { prisma } from "./prisma";
import type { Catalog2EffectType } from "./catalog2-effects";

// Minutos úteis por dia — constante de conversão de capacidade (esforço →
// prazo). Não é regra comercial: é aritmética explícita e configurável aqui.
export const WORKDAY_MINUTES = 480;

export interface PricingSelection {
  variation_option_keys?: string[];
  addon_keys?: string[];
  quantity?: number;
  answers?: Record<string, string>;
}

export interface PricingWarning {
  code: string;
  message: string;
}

export interface PricingLine {
  label: string;
  amount: number | null; // null = aguardando definição comercial
  detail?: string;
}

export interface PricingResult {
  currency: string;
  quantity: number;
  active_task_keys: string[];
  active_step_refs: string[];
  lines: {
    human_cost: PricingLine;
    ia_cost: PricingLine;
    human_review_cost: PricingLine;
    addons: PricingLine;
    variation_impacts: PricingLine;
    condition_impacts: PricingLine;
    subtotal_cost: PricingLine;
    taxes_and_margins: PricingLine[];
    final_price: PricingLine;
    minimum_price: PricingLine;
  };
  estimated_deadline_days: number | null;
  deadline_detail: string;
  pricing_pending: boolean;
  warnings: PricingWarning[];
  applied_conditions: Array<{ key: string; explanation: string }>;
  human_cost_breakdown: Array<{ task_key: string; specialty: string | null; minutes: number; rate: number | null; cost: number | null }>;
  ia_cost_breakdown: Array<{ task_key: string; tokens_in: number; tokens_out: number; review_rounds: number; cost: number | null }>;
}

type LoadedVersion = NonNullable<Awaited<ReturnType<typeof loadVersion>>>;

async function loadVersion(versionId: string) {
  return prisma.catalog2ProductVersion.findUnique({
    where: { id: versionId },
    include: {
      variations: { include: { options: { include: { effects: true } } } },
      addons: { include: { effects: true } },
      conditions: true,
      tasks: { include: { steps: true, ai: true, specialty: true } },
    },
  });
}

function num(v: string | null | undefined): number {
  const n = Number((v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function evalCondition(c: LoadedVersion["conditions"][number], sel: PricingSelection): boolean {
  const optSet = new Set(sel.variation_option_keys ?? []);
  const addonSet = new Set(sel.addon_keys ?? []);
  const answers = sel.answers ?? {};
  const qty = sel.quantity ?? 1;

  const cmp = (left: string | number, op: string, right: string): boolean => {
    switch (op) {
      case "eq":
        return String(left) === right;
      case "neq":
        return String(left) !== right;
      case "gte":
        return Number(left) >= Number(right);
      case "lte":
        return Number(left) <= Number(right);
      case "contains":
        return String(left).toLowerCase().includes(right.toLowerCase());
      default:
        return false;
    }
  };

  switch (c.trigger_source) {
    case "variation_option": {
      if (c.operator === "selected") return optSet.has(c.trigger_ref ?? "");
      if (c.operator === "not_selected") return !optSet.has(c.trigger_ref ?? "");
      // eq/neq/contains sobre a lista de opções escolhidas
      const anyMatch = [...optSet].some((k) => cmp(k, c.operator, c.comparison_value ?? ""));
      return c.operator === "neq" ? !anyMatch && optSet.size > 0 : anyMatch;
    }
    case "addon_selected":
      if (c.operator === "not_selected") return !addonSet.has(c.trigger_ref ?? "");
      return addonSet.has(c.trigger_ref ?? "");
    case "quantity":
      return cmp(qty, c.operator, c.comparison_value ?? "0");
    case "client_answer":
    case "contract_attribute": {
      const v = answers[c.trigger_ref ?? ""] ?? "";
      if (c.operator === "selected") return v.length > 0;
      if (c.operator === "not_selected") return v.length === 0;
      return cmp(v, c.operator, c.comparison_value ?? "");
    }
    default:
      return false;
  }
}

/** Efeitos ativos vindos de opções de variação escolhidas + adicionais + condições. */
function collectEffects(version: LoadedVersion, sel: PricingSelection) {
  const optSet = new Set(sel.variation_option_keys ?? []);
  const addonSet = new Set(sel.addon_keys ?? []);
  const effects: Array<{ from: string; type: Catalog2EffectType; value: string }> = [];
  const appliedConditions: Array<{ key: string; explanation: string }> = [];

  for (const va of version.variations) {
    for (const opt of va.options) {
      if (!optSet.has(opt.key)) continue;
      for (const e of opt.effects) effects.push({ from: `variação:${va.key}/${opt.key}`, type: e.effect_type as Catalog2EffectType, value: e.effect_value });
    }
  }
  for (const ad of version.addons) {
    if (!addonSet.has(ad.key)) continue;
    for (const e of ad.effects) effects.push({ from: `adicional:${ad.key}`, type: e.effect_type as Catalog2EffectType, value: e.effect_value });
  }
  for (const c of version.conditions) {
    if (!c.is_active) continue;
    if (!evalCondition(c, sel)) continue;
    effects.push({ from: `condição:${c.key}`, type: c.effect_type as Catalog2EffectType, value: c.effect_value });
    appliedConditions.push({ key: c.key, explanation: c.explanation });
  }
  return { effects, appliedConditions };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function computePricing(versionId: string, selection: PricingSelection): Promise<PricingResult> {
  const version = await loadVersion(versionId);
  if (!version) throw Object.assign(new Error("Versão não encontrada."), { httpStatus: 404 });

  const settings = (await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } })) ?? null;
  const currency = settings?.currency ?? "BRL";
  const quantity = Math.max(1, Math.floor(selection.quantity ?? 1));
  const warnings: PricingWarning[] = [];

  const { effects, appliedConditions } = collectEffects(version, selection);

  // Tarefas/etapas ativas: fixas + add_task/add_step, menos remove_task.
  const addedTasks = new Set(effects.filter((e) => e.type === "add_task").map((e) => e.value));
  const removedTasks = new Set(effects.filter((e) => e.type === "remove_task").map((e) => e.value));
  const addedSteps = new Set(effects.filter((e) => e.type === "add_step").map((e) => e.value)); // "taskKey:stepKey"

  const activeTasks = version.tasks.filter((t) => {
    if (removedTasks.has(t.key)) return false;
    if (t.is_conditional) return addedTasks.has(t.key);
    return true;
  });
  const activeTaskKeys = new Set(activeTasks.map((t) => t.key));

  const activeStepRefs: string[] = [];
  for (const t of activeTasks) {
    for (const s of t.steps) {
      const ref = `${t.key}:${s.key}`;
      if (s.is_conditional && !addedSteps.has(ref)) continue;
      activeStepRefs.push(ref);
    }
  }
  const activeStepSet = new Set(activeStepRefs);

  // ── Custo humano ──────────────────────────────────────────────────────
  let humanCost = 0;
  let humanPending = false;
  const humanBreakdown: PricingResult["human_cost_breakdown"] = [];
  for (const t of activeTasks) {
    if (t.execution_mode === "ia") continue;
    const stepMinutes = t.steps
      .filter((s) => activeStepSet.has(`${t.key}:${s.key}`))
      .reduce((a, s) => a + (s.estimated_minutes ?? 0), 0);
    const minutes = stepMinutes > 0 ? stepMinutes : t.estimated_minutes ?? 0;
    const rate = t.specialty?.max_hourly_rate ?? null;
    if (minutes === 0) warnings.push({ code: "task_without_time", message: `A tarefa "${t.name}" não tem duração estimada.` });
    if (rate == null && t.specialty) {
      humanPending = true;
      warnings.push({ code: "specialty_without_rate", message: `A especialidade "${t.specialty.name}" não tem valor/hora definido.` });
    }
    const cost = rate != null ? (minutes / 60) * rate : null;
    if (cost != null) humanCost += cost;
    humanBreakdown.push({ task_key: t.key, specialty: t.specialty?.name ?? null, minutes, rate, cost: cost != null ? round2(cost) : null });
  }
  humanCost *= quantity;

  // ── Custo de IA (tokens + rodadas de revisão) ────────────────────────
  let iaCost = 0;
  let iaPending = false;
  const iaBreakdown: PricingResult["ia_cost_breakdown"] = [];
  for (const t of activeTasks) {
    if (t.execution_mode === "humano" || !t.ai) continue;
    const tin = t.ai.est_input_tokens ?? 0;
    const tout = t.ai.est_output_tokens ?? 0;
    const rounds = t.ai.est_review_rounds ?? 0;
    const cin = t.ai.unit_cost_input_per_1k;
    const cout = t.ai.unit_cost_output_per_1k;
    if (cin == null || cout == null) {
      iaPending = true;
      warnings.push({ code: "ia_cost_not_configured", message: `A tarefa de IA "${t.name}" não tem custo por token configurado.` });
      iaBreakdown.push({ task_key: t.key, tokens_in: tin, tokens_out: tout, review_rounds: rounds, cost: null });
      continue;
    }
    // Passo inicial + 1 passo por rodada de revisão (limite superior explícito).
    const perPass = (tin / 1000) * cin + (tout / 1000) * cout;
    const cost = perPass * (1 + rounds);
    iaCost += cost;
    iaBreakdown.push({ task_key: t.key, tokens_in: tin, tokens_out: tout, review_rounds: rounds, cost: round2(cost) });
  }
  iaCost *= quantity;

  // ── Revisão humana ──────────────────────────────────────────────────
  const reviewPct = settings?.human_review_percent ?? null;
  const humanReviewCost = reviewPct != null ? humanCost * (reviewPct / 100) : null;

  // ── Adicionais (custo direto) ───────────────────────────────────────
  const addonSet = new Set(selection.addon_keys ?? []);
  let addonsCost = 0;
  for (const ad of version.addons) {
    if (!addonSet.has(ad.key)) continue;
    if (ad.base_cost != null) addonsCost += ad.base_cost;
  }

  // ── Impactos fixos e percentuais (variações + condições) ─────────────
  let fixedImpacts = 0;
  let percentImpacts = 0; // aplicado sobre o subtotal
  let deadlineDaysFromEffects = 0;
  const requiredInfos: string[] = [];
  const extraDeliverables: string[] = [];
  for (const e of effects) {
    if (e.type === "add_fixed_amount") fixedImpacts += num(e.value);
    else if (e.type === "add_percent") percentImpacts += num(e.value);
    else if (e.type === "add_deadline_days") deadlineDaysFromEffects += num(e.value);
    else if (e.type === "require_info") requiredInfos.push(e.value);
    else if (e.type === "add_deliverable") extraDeliverables.push(e.value);
  }

  const variationImpacts = round2(fixedImpacts);
  const conditionImpactsNote = appliedConditions.length ? `${appliedConditions.length} condição(ões) aplicada(s)` : "nenhuma";

  const subtotalCost =
    humanCost + iaCost + (humanReviewCost ?? 0) + addonsCost + fixedImpacts;
  const subtotalWithPercent = subtotalCost * (1 + percentImpacts / 100);

  // ── Taxas e margens ────────────────────────────────────────────────
  const rateChain: Array<{ key: string; label: string; pct: number | null }> = [
    { key: "tax", label: "Impostos (Simples Nacional)", pct: settings?.tax_percent ?? null },
    { key: "commission", label: "Comissão", pct: settings?.commission_percent ?? null },
    { key: "operational", label: "Taxa operacional", pct: settings?.operational_fee_percent ?? null },
    { key: "margin", label: "Margem de lucro", pct: settings?.profit_margin_percent ?? null },
  ];
  let running = subtotalWithPercent;
  const taxesAndMargins: PricingLine[] = [];
  let anyRatePending = false;
  for (const r of rateChain) {
    if (r.pct == null) {
      anyRatePending = true;
      taxesAndMargins.push({ label: r.label, amount: null, detail: "aguardando definição comercial" });
      continue;
    }
    const add = running * (r.pct / 100);
    running += add;
    taxesAndMargins.push({ label: `${r.label} (${r.pct}%)`, amount: round2(add) });
  }

  const pricingPending = humanPending || iaPending || anyRatePending || reviewPct == null;
  const finalPrice = pricingPending ? null : round2(running);
  const minimumPrice = round2(humanCost + iaCost); // nunca vender abaixo do custo direto

  // ── Prazo ─────────────────────────────────────────────────────────
  const totalHumanMinutes = humanBreakdown.reduce((a, b) => a + b.minutes, 0) * quantity;
  let estimatedDeadlineDays: number | null = null;
  let deadlineDetail: string;
  if (totalHumanMinutes > 0) {
    estimatedDeadlineDays = Math.ceil(totalHumanMinutes / WORKDAY_MINUTES) + deadlineDaysFromEffects;
    deadlineDetail = `${Math.ceil(totalHumanMinutes / WORKDAY_MINUTES)} dia(s) de esforço (${totalHumanMinutes} min ÷ ${WORKDAY_MINUTES}) + ${deadlineDaysFromEffects} dia(s) de condições/variações.`;
  } else if (deadlineDaysFromEffects > 0) {
    estimatedDeadlineDays = deadlineDaysFromEffects;
    deadlineDetail = `Sem durações nas tarefas; ${deadlineDaysFromEffects} dia(s) vindos de condições/variações.`;
  } else {
    deadlineDetail = "Prazo não calculável — nenhuma tarefa tem duração estimada.";
    warnings.push({ code: "deadline_not_calculable", message: deadlineDetail });
  }

  if (requiredInfos.length) warnings.push({ code: "extra_info_required", message: `Informações extras exigidas: ${requiredInfos.join("; ")}` });
  if (extraDeliverables.length) warnings.push({ code: "extra_deliverables", message: `Entregáveis extras: ${extraDeliverables.join("; ")}` });

  return {
    currency,
    quantity,
    active_task_keys: [...activeTaskKeys],
    active_step_refs: activeStepRefs,
    lines: {
      human_cost: {
        label: "Custo humano",
        amount: humanPending ? null : round2(humanCost),
        detail: humanPending ? "aguardando valor/hora de alguma especialidade" : `${round2(totalHumanMinutes)} min no total`,
      },
      ia_cost: {
        label: "Custo de IA (tokens + revisões)",
        amount: iaPending ? null : round2(iaCost),
        detail: iaPending ? "aguardando custo por token" : undefined,
      },
      human_review_cost: {
        label: "Revisão humana",
        amount: humanReviewCost != null ? round2(humanReviewCost) : null,
        detail: reviewPct == null ? "aguardando definição comercial" : `${reviewPct}% do custo humano`,
      },
      addons: { label: "Adicionais selecionados", amount: round2(addonsCost) },
      variation_impacts: { label: "Impactos de variações", amount: variationImpacts, detail: percentImpacts ? `+ ${percentImpacts}% sobre o subtotal` : undefined },
      condition_impacts: { label: "Impactos de condições", amount: null, detail: conditionImpactsNote },
      subtotal_cost: { label: "Subtotal (custo acumulado)", amount: round2(subtotalWithPercent) },
      taxes_and_margins: taxesAndMargins,
      final_price: {
        label: "Preço final",
        amount: finalPrice,
        detail: pricingPending ? "aguardando definição comercial de taxas/margens ou valores de custo" : undefined,
      },
      minimum_price: { label: "Preço mínimo permitido (custo direto)", amount: minimumPrice },
    },
    estimated_deadline_days: estimatedDeadlineDays,
    deadline_detail: deadlineDetail,
    pricing_pending: pricingPending,
    warnings,
    applied_conditions: appliedConditions,
    human_cost_breakdown: humanBreakdown,
    ia_cost_breakdown: iaBreakdown,
  };
}

/** Seleção "padrão": 1ª opção de cada variação + adicionais default, quantidade 1. */
export async function defaultSelection(versionId: string): Promise<PricingSelection> {
  const version = await prisma.catalog2ProductVersion.findUnique({
    where: { id: versionId },
    include: { variations: { include: { options: true } }, addons: true },
  });
  if (!version) return {};
  const variation_option_keys: string[] = [];
  for (const va of version.variations) {
    const ordered = [...va.options].sort((a, b) => a.sort_order - b.sort_order);
    const def = ordered.find((o) => o.is_default) ?? ordered[0];
    if (def) variation_option_keys.push(def.key);
  }
  const addon_keys = version.addons.filter((a) => a.is_default_selected).map((a) => a.key);
  return { variation_option_keys, addon_keys, quantity: 1, answers: {} };
}
