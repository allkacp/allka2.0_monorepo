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

export interface DeadlineResult {
  // Esforço estimado (planejamento INTERNO) — nunca é promessa ao cliente.
  effort_minutes: number;
  effort_days: number;
  // Estimativa interna total = esforço + dias de efeitos. Também interna.
  internal_estimate_days: number;
  // Prazo comercial: base (da versão) + dias adicionais por origem.
  base_commercial_deadline_days: number | null;
  days_from_variations: number;
  days_from_conditions: number;
  days_from_addons: number;
  commercial_deadline_days: number | null;
  commercial_deadline_pending: boolean;
  detail: string;
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
    // custo direto (humano + IA), sem revisão/adicionais/taxas.
    direct_cost: PricingLine;
    // preço mínimo permitido = custo direto (nunca vender abaixo).
    minimum_price: PricingLine;
    subtotal_cost: PricingLine;
    taxes_and_margins: PricingLine[];
    // preço comercial final (só quando taxas/ordem definidas e sem pendência).
    commercial_final_price: PricingLine;
    // mantido por compat — igual a commercial_final_price.
    final_price: PricingLine;
  };
  // Ordem de incidência declarada? Se não, o motor não fecha o preço final.
  order_defined: boolean;
  applied_order: string[];
  // Simulação ilustrativa (ordem-padrão) — nunca autoriza publicação/cotação.
  simulation: {
    total: number;
    label: string;
    authorizes_publish: boolean;
    authorizes_quote: boolean;
    authorizes_contract: boolean;
  };
  // Preço comercial completo E prazo comercial completo (exigido p/ cotar).
  commercial_ready: boolean;
  quote_blockers: string[];
  deadline: DeadlineResult;
  // compat: agora aponta para o PRAZO COMERCIAL (null se pendente), não o esforço.
  estimated_deadline_days: number | null;
  deadline_detail: string;
  pricing_pending: boolean;
  pending_info: string[];
  warnings: PricingWarning[];
  applied_conditions: Array<{ key: string; explanation: string }>;
  human_cost_breakdown: Array<{ task_key: string; specialty: string | null; minutes: number; rate: number | null; cost: number | null }>;
  ia_cost_breakdown: Array<{ task_key: string; tokens_in: number; tokens_out: number; review_rounds: number; cost: number | null }>;
}

const DEFAULT_COMPONENT_ORDER = ["tax", "commission", "operational", "margin"] as const;

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

  // ── Impactos fixos/percentuais + DIAS por origem ────────────────────
  let fixedImpacts = 0;
  let percentImpacts = 0;
  let daysFromVariations = 0;
  let daysFromConditions = 0;
  let daysFromAddons = 0;
  const requiredInfos: string[] = [];
  const extraDeliverables: string[] = [];
  for (const e of effects) {
    if (e.type === "add_fixed_amount") fixedImpacts += num(e.value);
    else if (e.type === "add_percent") percentImpacts += num(e.value);
    else if (e.type === "add_deadline_days") {
      const d = num(e.value);
      if (e.from.startsWith("condição")) daysFromConditions += d;
      else if (e.from.startsWith("adicional")) daysFromAddons += d;
      else daysFromVariations += d;
    } else if (e.type === "require_info") requiredInfos.push(e.value);
    else if (e.type === "add_deliverable") extraDeliverables.push(e.value);
  }

  const variationImpacts = round2(fixedImpacts);
  const conditionImpactsNote = appliedConditions.length ? `${appliedConditions.length} condição(ões) aplicada(s)` : "nenhuma";

  const directCost = humanCost + iaCost; // sem revisão/adicionais/taxas
  const subtotalCost = directCost + (humanReviewCost ?? 0) + addonsCost + fixedImpacts;
  const subtotalWithPercent = subtotalCost * (1 + percentImpacts / 100);

  // ── Taxas e margens — ORDEM e BASE configuráveis (reparo 2.2) ───────
  const orderCfg = parseJsonArray(settings?.component_order_json);
  const orderDefined = orderCfg.length > 0;
  const appliedOrder = orderDefined ? orderCfg : [...DEFAULT_COMPONENT_ORDER];
  const baseCfg = parseJsonObject(settings?.component_base_json); // { comp: "running"|"subtotal"|"direct_cost" }
  const COMP: Record<string, { label: string; pct: number | null }> = {
    tax: { label: "Impostos (Simples Nacional)", pct: settings?.tax_percent ?? null },
    commission: { label: "Comissão", pct: settings?.commission_percent ?? null },
    operational: { label: "Taxa operacional", pct: settings?.operational_fee_percent ?? null },
    margin: { label: "Margem de lucro", pct: settings?.profit_margin_percent ?? null },
  };
  let running = subtotalWithPercent;
  const taxesAndMargins: PricingLine[] = [];
  let anyRatePending = false;
  for (const key of appliedOrder) {
    const comp = COMP[key];
    if (!comp) continue;
    if (comp.pct == null) {
      anyRatePending = true;
      taxesAndMargins.push({ label: comp.label, amount: null, detail: "aguardando definição comercial" });
      continue;
    }
    const baseKind = baseCfg[key] ?? "running";
    const base = baseKind === "subtotal" ? subtotalWithPercent : baseKind === "direct_cost" ? directCost : running;
    const add = base * (comp.pct / 100);
    running += add;
    taxesAndMargins.push({
      label: `${comp.label} (${comp.pct}% sobre ${baseKind === "running" ? "acumulado" : baseKind === "subtotal" ? "subtotal" : "custo direto"})`,
      amount: round2(add),
      detail: baseCfg[key] ? undefined : "base não definida explicitamente — usando 'acumulado'",
    });
  }

  // `pending_info` é SÓ sobre PREÇO (reparo 2.2). O prazo comercial tem
  // pendência PRÓPRIA (`deadline.commercial_deadline_pending`).
  const pendingInfo: string[] = [];
  if (humanPending) pendingInfo.push("valor/hora de especialidade");
  if (iaPending) pendingInfo.push("custo por token de IA");
  if (reviewPct == null) pendingInfo.push("percentual de revisão humana");
  if (anyRatePending) pendingInfo.push("percentual de imposto/comissão/taxa/margem");
  // Bloco 5, correção 1: sem ORDEM confirmada o preço comercial NÃO fecha.
  // A ordem-padrão só serve para a "Simulação interna não comercial".
  if (!orderDefined) {
    pendingInfo.push("ordem de incidência das taxas");
    warnings.push({ code: "tax_order_not_confirmed", message: `Ordem de incidência de taxas não confirmada — o preço comercial fica "A definir". A ordem-padrão (${DEFAULT_COMPONENT_ORDER.join(" → ")}) é usada apenas na simulação interna não comercial.` });
  }

  const pricingPending = pendingInfo.length > 0;
  // Total ILUSTRATIVO (ordem-padrão + percentuais disponíveis). NUNCA é o
  // preço comercial: não autoriza publicação, cotação nem contratação.
  const simulationTotal = round2(running);
  // O preço comercial só existe quando percentuais + base + ORDEM estão
  // confirmados e não há pendência de custo (correção 1 do bloco 5).
  const commercialFinal = pricingPending ? null : simulationTotal;
  const minimumPrice = round2(directCost); // nunca vender abaixo do custo direto

  // ── ESFORÇO (planejamento interno) × PRAZO COMERCIAL (reparo 2.1) ───
  // `estimated_deadline_days` é a ESTIMATIVA INTERNA (esforço + dias de
  // efeitos) — nunca é promessa ao cliente. O PRAZO COMERCIAL é separado:
  // base da versão + dias de efeitos, e fica `null` (aguardando definição)
  // enquanto a base não for informada.
  const effortMinutes = humanBreakdown.reduce((a, b) => a + b.minutes, 0) * quantity;
  const effortDays = effortMinutes > 0 ? Math.ceil(effortMinutes / WORKDAY_MINUTES) : 0;
  const daysFromEffects = daysFromVariations + daysFromConditions + daysFromAddons;
  const internalEstimateDays = effortDays + daysFromEffects;
  const baseCommercial = version.base_commercial_deadline_days;
  const commercialDeadline = baseCommercial != null ? baseCommercial + daysFromEffects : null;
  const commercialPending = baseCommercial == null;
  if (commercialPending) {
    warnings.push({ code: "commercial_deadline_pending", message: "Prazo comercial base não definido — a estimativa interna NÃO vira promessa de entrega. Defina o prazo comercial na aba de prazos." });
  }
  const deadline: DeadlineResult = {
    effort_minutes: effortMinutes,
    effort_days: effortDays,
    internal_estimate_days: internalEstimateDays,
    base_commercial_deadline_days: baseCommercial,
    days_from_variations: daysFromVariations,
    days_from_conditions: daysFromConditions,
    days_from_addons: daysFromAddons,
    commercial_deadline_days: commercialDeadline,
    commercial_deadline_pending: commercialPending,
    detail: commercialPending
      ? `Esforço interno estimado: ${effortDays} dia(s) útil(eis) (${effortMinutes} min ÷ ${WORKDAY_MINUTES}). Prazo comercial: AGUARDANDO DEFINIÇÃO — esforço não é promessa ao cliente. Dias adicionais de variações/condições/adicionais: ${daysFromEffects}.`
      : `Prazo comercial: ${commercialDeadline} dia(s) = base ${baseCommercial} + ${daysFromVariations} (variações) + ${daysFromConditions} (condições) + ${daysFromAddons} (adicionais). Esforço interno: ${effortDays} dia(s).`,
  };

  if (requiredInfos.length) warnings.push({ code: "extra_info_required", message: `Informações extras exigidas: ${requiredInfos.join("; ")}` });
  if (extraDeliverables.length) warnings.push({ code: "extra_deliverables", message: `Entregáveis extras: ${extraDeliverables.join("; ")}` });

  const finalLine: PricingLine = {
    label: "Preço comercial final",
    amount: commercialFinal,
    detail: commercialFinal == null ? "A definir" : undefined,
  };

  // Uma COTAÇÃO VÁLIDA exige preço comercial completo E prazo comercial
  // completo. Sem isso, só existe simulação interna.
  const quoteBlockers: string[] = [];
  if (pricingPending) quoteBlockers.push("preço comercial incompleto");
  if (commercialPending) quoteBlockers.push("prazo comercial não definido");
  const commercialReady = quoteBlockers.length === 0;

  return {
    currency,
    quantity,
    active_task_keys: [...activeTaskKeys],
    active_step_refs: activeStepRefs,
    lines: {
      human_cost: {
        label: "Custo humano",
        amount: humanPending ? null : round2(humanCost),
        detail: humanPending ? "aguardando valor/hora de alguma especialidade" : `${effortMinutes} min no total`,
      },
      ia_cost: { label: "Custo de IA (tokens + revisões)", amount: iaPending ? null : round2(iaCost), detail: iaPending ? "aguardando custo por token" : undefined },
      human_review_cost: { label: "Revisão humana", amount: humanReviewCost != null ? round2(humanReviewCost) : null, detail: reviewPct == null ? "aguardando definição comercial" : `${reviewPct}% do custo humano` },
      addons: { label: "Adicionais selecionados", amount: round2(addonsCost) },
      variation_impacts: { label: "Impactos de variações", amount: variationImpacts, detail: percentImpacts ? `+ ${percentImpacts}% sobre o subtotal` : undefined },
      condition_impacts: { label: "Impactos de condições", amount: null, detail: conditionImpactsNote },
      direct_cost: { label: "Custo direto (humano + IA)", amount: humanPending || iaPending ? null : round2(directCost) },
      minimum_price: { label: "Preço mínimo permitido (= custo direto)", amount: humanPending || iaPending ? null : minimumPrice },
      subtotal_cost: { label: "Subtotal (custo acumulado)", amount: round2(subtotalWithPercent) },
      taxes_and_margins: taxesAndMargins,
      commercial_final_price: finalLine,
      final_price: finalLine,
    },
    order_defined: orderDefined,
    applied_order: appliedOrder,
    // Bloco 5, correção 1: número ilustrativo, explicitamente NÃO comercial.
    simulation: {
      total: simulationTotal,
      label: "Simulação interna não comercial",
      authorizes_publish: false,
      authorizes_quote: false,
      authorizes_contract: false,
    },
    // Preço comercial completo + prazo comercial completo?
    commercial_ready: commercialReady,
    quote_blockers: quoteBlockers,
    deadline,
    // compat: ESTIMATIVA INTERNA (esforço + dias de efeitos). NÃO é o prazo
    // comercial nem promessa ao cliente — esse fica em `deadline`.
    estimated_deadline_days: internalEstimateDays,
    deadline_detail: deadline.detail,
    pricing_pending: pricingPending,
    pending_info: [...new Set(pendingInfo)],
    warnings,
    applied_conditions: appliedConditions,
    human_cost_breakdown: humanBreakdown,
    ia_cost_breakdown: iaBreakdown,
  };
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
function parseJsonObject(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
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
