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
  /** Lotes da execução: [5] gera uma tarefa de 5; [1,1,3], três tarefas. */
  delivery_groups?: number[];
  answers?: Record<string, string>;
  /** Variações do tipo "quantidade": chave da variação → quantidade escolhida pelo cliente. */
  variation_quantities?: Record<string, number>;
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
  /** Como o preço da versão é definido: calculado pelas tarefas, fixo informado à mão ou sob consulta (sem preço público, sem cotação automática). */
  pricing_mode: PricingMode;
  /** Separação implantação × ciclo recorrente × avulso (preço comercial de cada componente). */
  split: PricingSplit;
  deadline: DeadlineResult;
  // compat: agora aponta para o PRAZO COMERCIAL (null se pendente), não o esforço.
  estimated_deadline_days: number | null;
  deadline_detail: string;
  pricing_pending: boolean;
  pending_info: string[];
  warnings: PricingWarning[];
  applied_conditions: Array<{ key: string; explanation: string }>;
  human_cost_breakdown: Array<{ task_key: string; specialty: string | null; minutes: number; rate: number | null; cost: number | null; effort_is_provisional: boolean; rate_is_provisional: boolean }>;
  ia_cost_breakdown: Array<{ task_key: string; tokens_in: number; tokens_out: number; review_rounds: number; cost: number | null; profile?: string | null; fixed_cost_per_pass?: number }>;
  // Revisão humana por tarefa (Pedido 3, fase 7): tempo específico × valor/hora da especialidade de revisão, ou percentual do custo humano.
  review_breakdown: Array<{ task_key: string; task_name: string; source: "tempo" | "percentual"; minutes: number; specialty: string | null; rate: number | null; cost: number | null }>;
  // Demonstrativo completo por tarefa (quem executa, custo humano, custo de IA, tempo e custo de revisão).
  cost_statement: Array<{ task_key: string; task_name: string; executor: string; human_cost: number | null; ia_cost: number | null; review_minutes: number; review_cost: number | null; total: number | null }>;
  // Reunião 10/09 ("precificação dos 36 produtos funcional para teste") —
  // true só quando computePricing foi chamado com { simulateProvisional:
  // true }. NUNCA no fluxo de cliente/checkout/cotação — só rotas
  // admin-only explícitas (memória de cálculo em modo "Simulação para
  // teste", IAllka). Quando true, commercial_ready é SEMPRE false, não
  // importa o que os campos abaixo contenham.
  is_simulation: boolean;
  simulation_provenance: {
    commercial_config: "real" | "provisional" | "missing";
    deadline: "real" | "provisional" | "missing";
  };
}

/** Escopo de cobrança de um valor (adicional, efeito de variação ou condição). Padrão histórico = "recurring". */
export const CHARGE_SCOPES = ["one_time", "first_cycle", "recurring", "per_cycle", "per_quantity"] as const;
export type ChargeScope = (typeof CHARGE_SCOPES)[number];
export const CHARGE_SCOPE_LABEL: Record<ChargeScope, string> = {
  one_time: "Uma única vez (só na contratação)",
  first_cycle: "Só no primeiro ciclo",
  recurring: "Recorrente (todas as mensalidades)",
  per_cycle: "A cada ciclo",
  per_quantity: "Por quantidade (multiplica)",
};
interface ChargeMeta { scope: ChargeScope; start: number; end: number | null; qty: number | null; task: string | null }
const chargeMeta = (x: { charge_scope?: string | null; charge_start_cycle?: number | null; charge_end_cycle?: number | null; charge_quantity?: number | null; source_task_key?: string | null }): ChargeMeta => ({
  scope: (CHARGE_SCOPES as readonly string[]).includes(x.charge_scope ?? "") ? (x.charge_scope as ChargeScope) : "recurring",
  start: x.charge_start_cycle ?? 0, end: x.charge_end_cycle ?? null, qty: x.charge_quantity ?? null, task: x.source_task_key ?? null,
});
/** O item é cobrado no ciclo k (0 = primeira cobrança)? */
export function chargeActiveAt(m: { scope: ChargeScope; start: number; end: number | null }, k: number): boolean {
  if (k < m.start) return false;
  if (m.end != null && k > m.end) return false;
  if (m.scope === "one_time" || m.scope === "first_cycle") return k === Math.max(0, m.start);
  return true;
}

export interface PricingSplitComponent { cost: number; price: number; tasks: string[]; taxes_and_margins: PricingLine[] }
/** Valor a cobrar no ciclo k (0 = primeira cobrança), a partir do cronograma guardado. Desconto só incide sobre o recorrente. */
export function cycleAmount(schedule: { tasks: { price: number; kind: string; every_n: number | null }[]; items: { price: number; scope: string; start: number; end: number | null }[] }, k: number, discountPercent = 0): number {
  const f = 1 - discountPercent / 100;
  let total = 0;
  for (const st of schedule.tasks) {
    if (st.kind === "implementation" || st.kind === "one_time") { if (k === 0) total += st.price; continue; }
    if (st.every_n && k % st.every_n !== 0) continue;
    total += st.price * f;
  }
  for (const it of schedule.items) {
    if (!chargeActiveAt({ scope: it.scope as ChargeScope, start: it.start, end: it.end }, k)) continue;
    total += (it.scope === "one_time" || it.scope === "first_cycle") ? it.price : it.price * f;
  }
  return Math.round(total * 100) / 100;
}

export interface PricingSplit {
  /** Composição da primeira cobrança: implantação + cobranças únicas + parte recorrente do 1º ciclo. */
  first_charge_parts: { implementation: number; one_time: number; recurring: number } | null;
  /** Implantação: cobrada só na 1ª cobrança (e quando aplicável pela regra + histórico do cliente). */
  implementation: PricingSplitComponent & { applicable: boolean; rule: string; reason: string };
  /** Tarefas de operação geradas no 1º ciclo (recorrentes + "só na 1ª vez"/avulsas). */
  first_cycle_operation: PricingSplitComponent;
  /** Tarefas recorrentes de cada renovação (ciclo 1 em diante, sem as de "só na 1ª vez"). */
  recurring: PricingSplitComponent & { every_n_tasks: { key: string; every: number }[] };
  revalidation: { cost: number; price: number; tasks: string[]; charged: false; note: string };
  one_time_items: { label: string; scope: ChargeScope; cost: number; price: number; task: string | null }[];
  recurring_items: { label: string; scope: ChargeScope; cost: number; price: number; start_cycle: number; end_cycle: number | null; task: string | null }[];
  avulso_total: number | null;
  first_charge: number | null;
  renewal: number | null;
  cycle_prices: { cycle: number; price: number | null }[];
  /** Componentes de cada tarefa e item para o cálculo exato de qualquer ciclo (guardado na assinatura). */
  schedule: { tasks: { key: string; name: string; price: number; kind: "implementation" | "one_time" | "recurring"; every_n: number | null }[]; items: { label: string; price: number; scope: ChargeScope; start: number; end: number | null }[] };
  not_charged: { key: string; reason: string }[];
}

export interface PricingOptions {
  /** Implantações que o cliente JÁ concluiu antes (por modelo global ou chave da tarefa) — decide se a implantação é cobrada de novo. */
  implementationDone?: { modelIds: Set<number>; keys: Set<string> };
  /** Reunião 10/09: usa Catalog2PricingSimulationSettings (estrutura
   * PROVISÓRIA e SEPARADA do singleton comercial real) e o prazo comercial
   * provisório da versão em vez do real quando o real não estiver
   * definido — nunca sobrescreve/mistura com o real, que sempre vence
   * quando presente. Força commercial_ready=false incondicionalmente. Só
   * deve ser passado por rotas admin-only explícitas — nunca por
   * catalog2-client.ts (checkout/cotação/catálogo do cliente) nem por
   * validateVersionForPublish/publishVersion. */
  simulateProvisional?: boolean;
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
      tasks: { include: { steps: { include: { specialty: true } }, ai: true, specialty: true } },
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
  const effects: Array<{ from: string; type: Catalog2EffectType; value: string; meta: ChargeMeta }> = [];
  const appliedConditions: Array<{ key: string; explanation: string }> = [];

  for (const va of version.variations) {
    if (va.is_active === false) continue;
    if ((va.selection_type ?? "single") === "quantity") {
      // Variação por QUANTIDADE: os efeitos numéricos das opções ativas valem "por unidade"
      // (dias, valor fixo, percentual) e são multiplicados pela quantidade escolhida.
      const q = Math.max(0, Math.floor(Number(sel.variation_quantities?.[va.key] ?? 0)) || 0);
      if (q === 0) continue;
      for (const opt of va.options) {
        if (opt.is_active === false) continue;
        for (const e of opt.effects) {
          const scaled = ["add_deadline_days", "add_fixed_amount", "add_percent"].includes(e.effect_type) ? String(num(e.effect_value) * q) : e.effect_value;
          effects.push({ from: `variação:${va.key}/${opt.key}`, type: e.effect_type as Catalog2EffectType, value: scaled, meta: chargeMeta(e as never) });
        }
      }
      continue;
    }
    for (const opt of va.options) {
      if (opt.is_active === false) continue;
      if (!optSet.has(opt.key)) continue;
      for (const e of opt.effects) effects.push({ from: `variação:${va.key}/${opt.key}`, type: e.effect_type as Catalog2EffectType, value: e.effect_value, meta: chargeMeta(e as never) });
    }
  }
  for (const ad of version.addons) {
    if (!addonSet.has(ad.key)) continue;
    for (const e of ad.effects) effects.push({ from: `adicional:${ad.key}`, type: e.effect_type as Catalog2EffectType, value: e.effect_value, meta: chargeMeta(e as never) });
  }
  for (const c of version.conditions) {
    if (!c.is_active) continue;
    if (!evalCondition(c, sel)) continue;
    effects.push({ from: `condição:${c.key}`, type: c.effect_type as Catalog2EffectType, value: c.effect_value, meta: chargeMeta(c as never) });
    appliedConditions.push({ key: c.key, explanation: c.explanation });
  }
  return { effects, appliedConditions };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const PRICING_MODES = ["calculated", "manual_fixed", "on_request"] as const;
export type PricingMode = (typeof PRICING_MODES)[number];
export const PRICING_MODE_LABEL: Record<PricingMode, string> = { calculated: "Calculado pelas tarefas", manual_fixed: "Preço fixo informado", on_request: "Sob consulta" };

/**
 * Preço da versão segundo o modo escolhido:
 *  • calculated  — custo, preço e prazo vêm das tarefas (qualquer lacuna = pendência que BLOQUEIA a publicação);
 *  • manual_fixed — preço e prazo informados pela administração (valem para avulso, 1ª cobrança e renovação);
 *  • on_request  — "sob consulta": pode ser publicado sem preço público, mas NUNCA gera cotação ou contratação automática.
 */
export async function computePricing(versionId: string, selection: PricingSelection, opts: PricingOptions = {}): Promise<PricingResult> {
  const r = await computePricingCore(versionId, selection, opts);
  const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: versionId }, select: { pricing_mode: true, manual_price: true, manual_deadline_days: true } });
  const mode = ((PRICING_MODES as readonly string[]).includes(v?.pricing_mode ?? "") ? v!.pricing_mode : "calculated") as PricingMode;
  r.pricing_mode = mode;
  if (mode === "calculated") return r;
  if (mode === "on_request") {
    const msg = "Produto sob consulta: não gera cotação nem contratação automática.";
    r.commercial_ready = false;
    r.quote_blockers = [msg];
    r.lines.commercial_final_price = { label: "Preço comercial final", amount: null, detail: "Sob consulta" };
    r.lines.final_price = r.lines.commercial_final_price;
    r.split.first_charge = null; r.split.renewal = null; r.split.avulso_total = null;
    r.split.cycle_prices = r.split.cycle_prices.map((c) => ({ cycle: c.cycle, price: null }));
    return r;
  }
  // manual_fixed
  const price = v?.manual_price ?? null;
  const days = v?.manual_deadline_days ?? null;
  if (price == null || price <= 0 || days == null || days < 1) {
    r.commercial_ready = false;
    r.quote_blockers = ["preço fixo ou prazo fixo não informado"];
    r.pricing_pending = true;
    r.pending_info = ["preço fixo informado"];
    return r;
  }
  const extraDays = r.deadline.days_from_variations + r.deadline.days_from_conditions + r.deadline.days_from_addons;
  r.pricing_pending = false;
  r.pending_info = [];
  r.lines.commercial_final_price = { label: "Preço comercial final (fixo)", amount: price };
  r.lines.final_price = r.lines.commercial_final_price;
  r.deadline = { ...r.deadline, base_commercial_deadline_days: days, commercial_deadline_days: days + extraDays, commercial_deadline_pending: false, detail: `Prazo fixo informado: ${days} dia(s) + ${extraDays} de variações/condições/adicionais.` };
  r.estimated_deadline_days = days + extraDays;
  r.deadline_detail = r.deadline.detail;
  r.split = {
    ...r.split,
    implementation: { ...r.split.implementation, applicable: false, price: 0, reason: "Preço fixo informado: sem cobrança separada de implantação." },
    first_charge_parts: { implementation: 0, one_time: 0, recurring: price },
    avulso_total: price, first_charge: price, renewal: price,
    cycle_prices: r.split.cycle_prices.map((c) => ({ cycle: c.cycle, price })),
    schedule: { tasks: [{ key: "preco_fixo", name: "Preço fixo informado", price, kind: "recurring", every_n: null }], items: [] },
  };
  if (!opts.simulateProvisional) { r.quote_blockers = []; r.commercial_ready = true; }
  return r;
}

async function computePricingCore(versionId: string, selection: PricingSelection, opts: PricingOptions = {}): Promise<PricingResult> {
  const version = await loadVersion(versionId);
  if (!version) throw Object.assign(new Error("Versão não encontrada."), { httpStatus: 404 });

  const settings = (await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } })) ?? null;
  // Estrutura de simulação PROVISÓRIA — só carregada quando pedido
  // explicitamente, e usada como fonte ÚNICA de percentuais/ordem neste
  // modo (nunca misturada campo-a-campo com o real; "separada" de
  // propósito). O singleton real nunca é lido nem alterado por este modo.
  const simSettings = opts.simulateProvisional
    ? (await prisma.catalog2PricingSimulationSettings.findUnique({ where: { id: "default" } })) ?? null
    : null;
  const activeSettings = opts.simulateProvisional ? simSettings : settings;
  const simulationRates = opts.simulateProvisional
    ? await prisma.catalog2PricingSimulationSpecialtyRate.findMany()
    : [];
  const simulationRateBySpecialty = new Map(simulationRates.map((r) => [r.specialty_id, r.hourly_rate]));
  const commercialConfigProvenance: "real" | "provisional" | "missing" = !opts.simulateProvisional
    ? settings ? "real" : "missing"
    : simSettings
      ? "provisional"
      : "missing";
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

  // Quais tarefas entram no PREÇO: implantação só quando aplicável (regra + histórico do cliente) e revalidação nunca
  // (só se cobra quando acontece). A geração de tarefas continua usando TODAS as ativas (activeTaskKeys acima).
  const implRule = (version as { implementation_rule?: string }).implementation_rule ?? "first_only";
  const notCharged: { key: string; reason: string }[] = [];
  let implementationApplicable = false;
  const implAlreadyDone = (t: { key: string; task_model_id: number | null }) => !!opts.implementationDone && ((t.task_model_id != null && opts.implementationDone.modelIds.has(t.task_model_id)) || opts.implementationDone.keys.has(t.key));
  const activeTasksAll = activeTasks;
  const chargedTasks = activeTasksAll.filter((t) => {
    if (t.cycle_type === "revalidacao") { notCharged.push({ key: t.key, reason: "Revalidação: só é cobrada/gerada quando houver mudança ou expiração de acesso." }); return false; }
    if (t.cycle_type === "implementacao") {
      const applies = implRule === "always" || !implAlreadyDone(t);
      if (!applies) { notCharged.push({ key: t.key, reason: "Implantação já concluída por este cliente — não é cobrada novamente (regra da versão: primeira vez)." }); return false; }
      implementationApplicable = true;
    }
    return true;
  });

  // ── Custo humano ──────────────────────────────────────────────────────
  let humanCost = 0;
  let humanPending = false;
  let anySpecialtyRateMissing = false;
  // Reunião 10/09 ("36 produtos funcionalmente completos para teste"):
  // tarefa com effort_is_provisional=true tem specialty_id/estimated_minutes
  // preenchidos só como DADO DE TESTE (nunca decisão comercial real) — o
  // custo AINDA é calculado (alimenta a memória de cálculo administrativa,
  // regra 7), mas força humanPending=true incondicionalmente, garantindo
  // que commercial_ready NUNCA feche com dado provisório (regra 8),
  // independente de a especialidade já ter valor/hora configurado.
  let anyProvisionalEffort = false;
  const humanBreakdown: PricingResult["human_cost_breakdown"] = [];
  const rateOf = (spec: { id: string; max_hourly_rate: number | null } | null | undefined): { rate: number | null; provisional: boolean } => {
    if (!spec) return { rate: null, provisional: false };
    if (!opts.simulateProvisional) return { rate: spec.max_hourly_rate ?? null, provisional: false };
    const r = simulationRateBySpecialty.get(spec.id) ?? null;
    return { rate: r, provisional: r != null };
  };
  const priceLine = (label: string, key: string, minutes: number, spec: { id: string; name: string; max_hourly_rate: number | null } | null | undefined, effortProvisional: boolean) => {
    const { rate, provisional } = rateOf(spec);
    if (minutes === 0) warnings.push({ code: "task_without_time", message: `${label} não tem duração estimada.` });
    if (rate == null && spec) {
      humanPending = true;
      anySpecialtyRateMissing = true;
      warnings.push({ code: "specialty_without_rate", message: `A especialidade "${spec.name}" não tem valor/hora definido.` });
    }
    const cost = rate != null ? (minutes / 60) * rate : null;
    if (cost != null) humanCost += cost;
    humanBreakdown.push({ task_key: key, specialty: spec?.name ?? null, minutes, rate, cost: cost != null ? round2(cost) : null, effort_is_provisional: effortProvisional, rate_is_provisional: provisional });
  };
  for (const t of chargedTasks) {
    if (t.execution_mode === "ia") continue;
    if (t.effort_is_provisional) {
      anyProvisionalEffort = true;
      humanPending = true;
      warnings.push({ code: "effort_provisional", message: `A tarefa "${t.name}" tem especialidade/tempo PROVISÓRIOS (dado de teste) — não pode fechar o preço comercial.` });
    }
    // Etapas com horas: cada etapa usa a SUA especialidade (ou a da tarefa).
    const pricedSteps = t.steps.filter((s) => activeStepSet.has(`${t.key}:${s.key}`) && (s.estimated_minutes ?? 0) > 0);
    if (pricedSteps.length > 0) {
      for (const s of pricedSteps) priceLine(`A etapa "${s.name}" da tarefa "${t.name}"`, `${t.key}:${s.key}`, s.estimated_minutes ?? 0, s.specialty ?? t.specialty, !!t.effort_is_provisional);
    } else {
      priceLine(`A tarefa "${t.name}"`, t.key, t.estimated_minutes ?? 0, t.specialty, !!t.effort_is_provisional);
    }
  }
  humanCost *= quantity;

  // custo humano de UMA unidade por tarefa (etapas somadas) — base da revisão por percentual e do demonstrativo
  const humanByTask = new Map<string, number>();
  for (const b of humanBreakdown) {
    const k = b.task_key.split(":")[0];
    humanByTask.set(k, (humanByTask.get(k) ?? 0) + (b.cost ?? 0));
  }

  // ── Custo de IA (tokens + rodadas de revisão) ────────────────────────
  // Perfil de IA autorizado (Pedido 3, fase 5/7): quando a tarefa tem perfil, o preço por token e o custo fixo vêm DELE;
  // sem perfil, vale o preço informado na própria tarefa (comportamento de sempre).
  const profileIds = [...new Set(chargedTasks.map((t) => t.ai?.profile_id).filter((x): x is string => !!x))];
  const profiles = profileIds.length ? await prisma.catalog2AIProfile.findMany({ where: { id: { in: profileIds } } }) : [];
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  let iaCost = 0;
  let iaPending = false;
  const iaBreakdown: PricingResult["ia_cost_breakdown"] = [];
  const iaByTask = new Map<string, number | null>();
  for (const t of chargedTasks) {
    if (t.execution_mode === "humano" || !t.ai) continue;
    const tin = t.ai.est_input_tokens ?? 0;
    const tout = t.ai.est_output_tokens ?? 0;
    const rounds = t.ai.est_review_rounds ?? 0;
    const prof = t.ai.profile_id ? profileById.get(t.ai.profile_id) ?? null : null;
    const cin = prof ? prof.unit_cost_input_per_1k : t.ai.unit_cost_input_per_1k;
    const cout = prof ? prof.unit_cost_output_per_1k : t.ai.unit_cost_output_per_1k;
    const fixed = prof?.fixed_cost_per_run ?? 0;
    if ((cin == null || cout == null) && !(prof && fixed > 0)) {
      iaPending = true;
      warnings.push({ code: "ia_cost_not_configured", message: prof ? `O perfil de IA "${prof.name}" (tarefa "${t.name}") não tem custo por token configurado.` : `A tarefa de IA "${t.name}" não tem custo por token configurado.` });
      iaBreakdown.push({ task_key: t.key, tokens_in: tin, tokens_out: tout, review_rounds: rounds, cost: null, profile: prof?.name ?? null, fixed_cost_per_pass: fixed });
      iaByTask.set(t.key, null);
      continue;
    }
    // Passo inicial + 1 passo por rodada de revisão (limite superior explícito).
    const perPass = (tin / 1000) * (cin ?? 0) + (tout / 1000) * (cout ?? 0) + fixed;
    const cost = perPass * (1 + rounds);
    iaCost += cost;
    iaByTask.set(t.key, cost * quantity);
    iaBreakdown.push({ task_key: t.key, tokens_in: tin, tokens_out: tout, review_rounds: rounds, cost: round2(cost), profile: prof?.name ?? null, fixed_cost_per_pass: fixed });
  }
  iaCost *= quantity;

  // ── Revisão humana ──────────────────────────────────────────────────
  // Tarefa com revisão obrigatória E tempo de revisão informado: custo = minutos × valor/hora da especialidade de revisão
  // (ou da própria tarefa). As demais seguem o percentual de sempre sobre o custo humano da tarefa.
  const reviewPct = activeSettings?.human_review_percent ?? null;
  const reviewSpecIds = [...new Set(chargedTasks.map((t) => t.review_specialty_id).filter((x): x is string => !!x))];
  const reviewSpecs = reviewSpecIds.length ? await prisma.catalog2Specialty.findMany({ where: { id: { in: reviewSpecIds } } }) : [];
  const reviewSpecById = new Map(reviewSpecs.map((sp) => [sp.id, sp]));
  const reviewBreakdown: PricingResult["review_breakdown"] = [];
  const reviewByTask = new Map<string, number | null>();
  let reviewTotal = 0;
  let reviewNeedsPct = false;
  let reviewRatePending = false;
  for (const t of chargedTasks) {
    const explicit = t.requires_review && (t.review_minutes ?? 0) > 0;
    if (explicit) {
      const spec = (t.review_specialty_id ? reviewSpecById.get(t.review_specialty_id) : null) ?? t.specialty ?? null;
      const { rate } = rateOf(spec);
      const minutes = (t.review_minutes ?? 0) * quantity;
      if (rate == null) {
        reviewRatePending = true;
        warnings.push({ code: "review_rate_missing", message: `A revisão da tarefa "${t.name}" não tem especialidade com valor/hora definido.` });
        reviewBreakdown.push({ task_key: t.key, task_name: t.name, source: "tempo", minutes, specialty: spec?.name ?? null, rate: null, cost: null });
        reviewByTask.set(t.key, null);
        continue;
      }
      const cost = (minutes / 60) * rate;
      reviewTotal += cost;
      reviewByTask.set(t.key, cost);
      reviewBreakdown.push({ task_key: t.key, task_name: t.name, source: "tempo", minutes, specialty: spec?.name ?? null, rate, cost: round2(cost) });
    } else {
      reviewNeedsPct = true;
      const base = (humanByTask.get(t.key) ?? 0) * quantity;
      const cost = reviewPct != null ? base * (reviewPct / 100) : null;
      if (cost != null) reviewTotal += cost;
      reviewByTask.set(t.key, cost);
      if (base > 0 || t.execution_mode !== "ia") reviewBreakdown.push({ task_key: t.key, task_name: t.name, source: "percentual", minutes: 0, specialty: null, rate: null, cost: cost != null ? round2(cost) : null });
    }
  }
  const humanReviewCost = (reviewNeedsPct && reviewPct == null) || reviewRatePending ? null : reviewTotal;
  // demonstrativo por tarefa
  const costStatement: PricingResult["cost_statement"] = chargedTasks.map((t) => {
    const h = t.execution_mode === "ia" ? 0 : (humanByTask.get(t.key) ?? 0) * quantity;
    const ia = t.execution_mode === "humano" || !t.ai ? 0 : iaByTask.get(t.key) ?? null;
    const rv = reviewByTask.get(t.key) ?? null;
    const explicit = t.requires_review && (t.review_minutes ?? 0) > 0;
    const parts = [h, ia, rv];
    return {
      task_key: t.key, task_name: t.name, executor: t.execution_mode ?? "humano", human_cost: round2(h), ia_cost: ia == null ? null : round2(ia),
      review_minutes: explicit ? (t.review_minutes ?? 0) * quantity : 0, review_cost: rv == null ? null : round2(rv),
      total: parts.some((x) => x == null) ? null : round2(parts.reduce<number>((a, x) => a + (x ?? 0), 0)),
    };
  });

  // ── Adicionais (custo direto) ───────────────────────────────────────
  const addonSet = new Set(selection.addon_keys ?? []);
  // Cada valor vira um ITEM com escopo de cobrança (padrão "recorrente" = comportamento histórico: entra em todo ciclo).
  interface ChargeItem { label: string; cost: number; scope: ChargeScope; start: number; end: number | null; task: string | null }
  const chargeItems: ChargeItem[] = [];
  for (const ad of version.addons) {
    if (!addonSet.has(ad.key)) continue;
    if (ad.base_cost == null) continue;
    const m = chargeMeta(ad as never);
    const mult = m.scope === "per_quantity" ? (m.qty ?? quantity) : 1;
    chargeItems.push({ label: `adicional:${ad.key}`, cost: ad.base_cost * mult, scope: m.scope, start: m.start, end: m.end, task: m.task });
  }
  const addonsCost = chargeItems.filter((i) => chargeActiveAt(i, 0)).reduce((a, i) => a + i.cost, 0);

  // ── Impactos fixos/percentuais + DIAS por origem ────────────────────
  let fixedImpacts = 0;
  const effectItems: ChargeItem[] = [];
  let percentImpacts = 0;
  let daysFromVariations = 0;
  let daysFromConditions = 0;
  let daysFromAddons = 0;
  const requiredInfos: string[] = [];
  const extraDeliverables: string[] = [];
  for (const e of effects) {
    if (e.type === "add_fixed_amount") {
      const mult = e.meta.scope === "per_quantity" ? (e.meta.qty ?? quantity) : 1;
      effectItems.push({ label: e.from, cost: num(e.value) * mult, scope: e.meta.scope, start: e.meta.start, end: e.meta.end, task: e.meta.task });
    } else if (e.type === "add_percent") percentImpacts += num(e.value);
    else if (e.type === "add_deadline_days") {
      const d = num(e.value);
      if (e.from.startsWith("condição")) daysFromConditions += d;
      else if (e.from.startsWith("adicional")) daysFromAddons += d;
      else daysFromVariations += d;
    } else if (e.type === "require_info") requiredInfos.push(e.value);
    else if (e.type === "add_deliverable") extraDeliverables.push(e.value);
  }

  fixedImpacts = effectItems.filter((i) => chargeActiveAt(i, 0)).reduce((a, i) => a + i.cost, 0);
  const variationImpacts = round2(fixedImpacts);
  const conditionImpactsNote = appliedConditions.length ? `${appliedConditions.length} condição(ões) aplicada(s)` : "nenhuma";

  const directCost = humanCost + iaCost; // sem revisão/adicionais/taxas
  const subtotalCost = directCost + (humanReviewCost ?? 0) + addonsCost + fixedImpacts;
  const subtotalWithPercent = subtotalCost * (1 + percentImpacts / 100);

  // ── Taxas e margens — ORDEM e BASE configuráveis (reparo 2.2) ───────
  const disabledComponents = new Set(parseJsonArray(settings?.disabled_components_json));
  const customComponents = await prisma.catalog2PricingComponent.findMany({ where: { is_active: true }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
  const customKeys = customComponents.map((c) => `custom:${c.key}`).filter((k) => !disabledComponents.has(k));
  const orderCfg = parseJsonArray(activeSettings?.component_order_json);
  const orderDefined = orderCfg.length > 0;
  // Componentes novos (personalizados) que ainda não estão na ordem salva entram no fim.
  const appliedOrder = orderDefined
    ? [...orderCfg, ...customKeys.filter((k) => !orderCfg.includes(k))]
    : [...DEFAULT_COMPONENT_ORDER, ...customKeys];
  // component_base_json só existe no singleton REAL — em modo simulação
  // sempre usa a base padrão ("acumulado"), nunca lê nem herda do real.
  const baseCfg = opts.simulateProvisional ? {} : parseJsonObject(settings?.component_base_json); // { comp: "running"|"subtotal"|"direct_cost" }
  const COMP: Record<string, { label: string; pct: number | null }> = {
    tax: { label: "Impostos (Simples Nacional)", pct: activeSettings?.tax_percent ?? null },
    commission: { label: "Comissão", pct: activeSettings?.commission_percent ?? null },
    operational: { label: "Taxa operacional", pct: activeSettings?.operational_fee_percent ?? null },
    margin: { label: "Margem de lucro", pct: activeSettings?.profit_margin_percent ?? null },
  };
  for (const c of customComponents) COMP[`custom:${c.key}`] = { label: c.label, pct: c.percent ?? null };
  for (const k of disabledComponents) delete COMP[k];
  let anyRatePending = false;
  /** Aplica impostos/comissão/taxa/margem (na ordem e base configuradas) a um custo. Linear: o total = soma dos componentes. */
  const runPipeline = (direct: number, subtotalPct: number) => {
    let running = subtotalPct;
    const lines: PricingLine[] = [];
    for (const key of appliedOrder) {
      const comp = COMP[key];
      if (!comp) continue;
      if (comp.pct == null) {
        anyRatePending = true;
        lines.push({ label: comp.label, amount: null, detail: "aguardando definição comercial" });
        continue;
      }
      const baseKind = baseCfg[key] ?? "running";
      const base = baseKind === "subtotal" ? subtotalPct : baseKind === "direct_cost" ? direct : running;
      const add = base * (comp.pct / 100);
      running += add;
      lines.push({
        label: `${comp.label} (${comp.pct}% sobre ${baseKind === "running" ? "acumulado" : baseKind === "subtotal" ? "subtotal" : "custo direto"})`,
        amount: round2(add),
        detail: baseCfg[key] ? undefined : "base não definida explicitamente — usando 'acumulado'",
      });
    }
    return { price: running, lines };
  };
  const main = runPipeline(directCost, subtotalWithPercent);
  const running = main.price;
  const taxesAndMargins = main.lines;

  // `pending_info` é SÓ sobre PREÇO (reparo 2.2). O prazo comercial tem
  // pendência PRÓPRIA (`deadline.commercial_deadline_pending`).
  const pendingInfo: string[] = [];
  // Esforço provisório também deixa o custo humano pendente, mas não
  // significa que o valor/hora esteja ausente. Exiba cada causa separadamente.
  if (anySpecialtyRateMissing) pendingInfo.push("valor/hora de especialidade");
  if (anyProvisionalEffort) pendingInfo.push("especialidade/tempo de tarefa(s) provisórios (dado de teste, revisão humana pendente)");
  if (iaPending) pendingInfo.push("custo por token de IA");
  if (reviewPct == null && reviewNeedsPct) pendingInfo.push("percentual de revisão humana");
  if (reviewRatePending) pendingInfo.push("valor/hora da especialidade de revisão");
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
  // O prazo REAL sempre vence quando definido — o provisório só entra como
  // fallback em modo simulação, e nunca sobrescreve/edita o campo real.
  const usedProvisionalDeadline = version.base_commercial_deadline_days == null && !!opts.simulateProvisional && version.provisional_commercial_deadline_days != null;
  const baseCommercial = version.base_commercial_deadline_days ?? (opts.simulateProvisional ? version.provisional_commercial_deadline_days ?? null : null);
  const deadlineProvenance: "real" | "provisional" | "missing" =
    version.base_commercial_deadline_days != null ? "real" : usedProvisionalDeadline ? "provisional" : "missing";
  const commercialDeadline = baseCommercial != null ? baseCommercial + daysFromEffects : null;
  const commercialPending = baseCommercial == null;
  if (commercialPending) {
    warnings.push({ code: "commercial_deadline_pending", message: "Prazo comercial base não definido — a estimativa interna NÃO vira promessa de entrega. Defina o prazo comercial na aba de prazos." });
  } else if (usedProvisionalDeadline) {
    warnings.push({ code: "deadline_provisional", message: "Prazo comercial calculado com base PROVISÓRIA (dado de teste) — nunca é promessa real ao cliente." });
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

  // ── Separação implantação × ciclo recorrente × avulso ────────────────────
  const r6 = (n: number) => Math.round(n * 1e6) / 1e6;
  const pctMult = 1 + percentImpacts / 100;
  const taskDirect = (t: (typeof chargedTasks)[number]) => (t.execution_mode === "ia" ? 0 : (humanByTask.get(t.key) ?? 0) * quantity) + (t.execution_mode === "humano" || !t.ai ? 0 : iaByTask.get(t.key) ?? 0);
  const taskReview = (t: (typeof chargedTasks)[number]) => reviewByTask.get(t.key) ?? 0;
  const priceOf = (direct: number, review: number, extra = 0) => runPipeline(direct, (direct + review + extra) * pctMult);
  const classify = (t: (typeof chargedTasks)[number]): "implementation" | "one_time" | "recurring" =>
    t.cycle_type === "implementacao" ? "implementation" : t.cycle_type === "avulso" || t.repeat_rule === "first_only" ? "one_time" : "recurring";
  const emptyComp = () => ({ direct: 0, review: 0, tasks: [] as string[] });
  const cImpl = emptyComp(), cFirst = emptyComp(), cRec = emptyComp();
  const everyN: { key: string; every: number }[] = [];
  const schedTasks: PricingSplit["schedule"]["tasks"] = [];
  for (const t of chargedTasks) {
    const kind = classify(t);
    const d = taskDirect(t), r = taskReview(t);
    const n = t.repeat_rule === "every_n_cycles" && kind === "recurring" ? Math.max(1, t.repeat_every_cycles ?? 1) : null;
    schedTasks.push({ key: t.key, name: t.name, price: r6(priceOf(d, r).price), kind, every_n: n });
    if (kind === "implementation") { cImpl.direct += d; cImpl.review += r; cImpl.tasks.push(t.key); continue; }
    cFirst.direct += d; cFirst.review += r; cFirst.tasks.push(t.key); // tudo o que nasce no 1º ciclo
    if (kind === "recurring") {
      if (n) { everyN.push({ key: t.key, every: n }); continue; } // aparece só nos ciclos múltiplos de n (fora da renovação típica)
      cRec.direct += d; cRec.review += r; cRec.tasks.push(t.key);
    }
  }
  const items: ChargeItem[] = [...chargeItems, ...effectItems];
  const itemAt = (k: number) => items.filter((i) => chargeActiveAt(i, k));
  const schedItems: PricingSplit["schedule"]["items"] = items.map((i) => ({ label: i.label, price: r6(priceOf(0, 0, i.cost).price), scope: i.scope, start: i.start, end: i.end }));
  const compOut = (c: { direct: number; review: number; tasks: string[] }, extra = 0): PricingSplitComponent => {
    const p = priceOf(c.direct, c.review, extra);
    return { cost: round2(c.direct + c.review + extra), price: round2(p.price), tasks: c.tasks, taxes_and_margins: p.lines };
  };
  const schedAmount = (k: number): number => cycleAmount({ tasks: schedTasks, items: schedItems }, k, 0);
  const isOnce = (sc: string) => sc === "one_time" || sc === "first_cycle";
  const partImpl = schedTasks.filter((t) => t.kind === "implementation").reduce((a, t) => a + t.price, 0);
  const partOnce = schedTasks.filter((t) => t.kind === "one_time").reduce((a, t) => a + t.price, 0) + schedItems.filter((i) => isOnce(i.scope) && chargeActiveAt(i, 0)).reduce((a, i) => a + i.price, 0);
  const extraFirst = itemAt(0).reduce((a, i) => a + i.cost, 0);
  const splitReady = !pricingPending;
  const implComp = compOut(cImpl);
  const split: PricingSplit = {
    first_charge_parts: splitReady ? { implementation: round2(partImpl), one_time: round2(partOnce), recurring: round2(schedAmount(0) - partImpl - partOnce) } : null,
    implementation: { ...implComp, applicable: implementationApplicable, rule: implRule, reason: implementationApplicable ? (implRule === "always" ? "Regra 'sempre': cobrada em toda contratação." : "Primeira contratação deste cliente.") : (activeTasksAll.some((t) => t.cycle_type === "implementacao") ? "Implantação já concluída por este cliente — não cobrada de novo." : "O produto não tem tarefa de implantação.") },
    first_cycle_operation: compOut(cFirst, extraFirst),
    recurring: { ...compOut(cRec, itemAt(1).reduce((a, i) => a + i.cost, 0)), every_n_tasks: everyN },
    revalidation: (() => {
      const rv = activeTasksAll.filter((t) => t.cycle_type === "revalidacao");
      return { cost: 0, price: 0, tasks: rv.map((t) => t.key), charged: false as const, note: rv.length ? "Tarefas de revalidação não entram no preço: só nascem (e se cobram) quando o acesso muda ou expira." : "Sem tarefas de revalidação." };
    })(),
    one_time_items: items.filter((i) => i.scope === "one_time" || i.scope === "first_cycle").map((i) => ({ label: i.label, scope: i.scope, cost: round2(i.cost), price: round2(priceOf(0, 0, i.cost).price), task: i.task })),
    recurring_items: items.filter((i) => !(i.scope === "one_time" || i.scope === "first_cycle")).map((i) => ({ label: i.label, scope: i.scope, cost: round2(i.cost), price: round2(priceOf(0, 0, i.cost).price), start_cycle: i.start, end_cycle: i.end, task: i.task })),
    avulso_total: splitReady ? schedAmount(0) : null,
    first_charge: splitReady ? schedAmount(0) : null,
    renewal: splitReady ? schedAmount(1) : null,
    cycle_prices: [0, 1, 2, 3, 4, 5].map((k) => ({ cycle: k, price: splitReady ? schedAmount(k) : null })),
    schedule: { tasks: schedTasks, items: schedItems },
    not_charged: notCharged,
  };

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
  // Reunião 10/09: modo simulação NUNCA autoriza cotação/publicação/
  // contratação, independente de qualquer outra condição acima — bloqueio
  // incondicional, sem exceção.
  if (opts.simulateProvisional) quoteBlockers.push("simulação provisória para teste — nunca autoriza cotação, publicação ou contratação");
  const commercialReady = !opts.simulateProvisional && quoteBlockers.length === 0;

  return {
    currency,
    quantity,
    active_task_keys: [...activeTaskKeys],
    active_step_refs: activeStepRefs,
    split,
    lines: {
      human_cost: {
        label: "Custo humano",
        amount: humanPending ? null : round2(humanCost),
        detail: humanPending ? "aguardando valor/hora de alguma especialidade" : `${effortMinutes} min no total`,
      },
      ia_cost: { label: "Custo de IA (tokens + revisões)", amount: iaPending ? null : round2(iaCost), detail: iaPending ? "aguardando custo por token" : undefined },
      human_review_cost: {
        label: "Revisão humana",
        amount: humanReviewCost != null ? round2(humanReviewCost) : null,
        detail: humanReviewCost == null
          ? (reviewRatePending ? "aguardando valor/hora da especialidade de revisão" : "aguardando definição comercial")
          : reviewBreakdown.some((r) => r.source === "tempo")
            ? `${reviewBreakdown.filter((r) => r.source === "tempo").reduce((a, r) => a + r.minutes, 0)} min de revisão por tempo${reviewNeedsPct ? ` + ${reviewPct}% do custo humano nas demais` : ""}`
            : `${reviewPct}% do custo humano`,
      },
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
    pricing_mode: "calculated" as PricingMode,
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
    review_breakdown: reviewBreakdown,
    cost_statement: costStatement,
    is_simulation: !!opts.simulateProvisional,
    simulation_provenance: {
      commercial_config: commercialConfigProvenance,
      deadline: deadlineProvenance,
    },
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
  const variation_quantities: Record<string, number> = {};
  for (const va of version.variations) {
    if (va.is_active === false) continue;
    const ordered = [...va.options].filter((o) => o.is_active !== false).sort((a, b) => a.sort_order - b.sort_order);
    const type = va.selection_type ?? "single";
    if (type === "quantity") {
      if (va.is_required) variation_quantities[va.key] = 1;
      continue;
    }
    if (type === "multiple") {
      const defs = ordered.filter((o) => o.is_default);
      const picks = defs.length > 0 ? defs : va.is_required && ordered[0] ? [ordered[0]] : [];
      for (const p of picks) variation_option_keys.push(p.key);
      continue;
    }
    const def = ordered.find((o) => o.is_default) ?? ordered[0];
    if (def) variation_option_keys.push(def.key);
  }
  const addon_keys = version.addons.filter((a) => a.is_default_selected && a.is_active).map((a) => a.key);
  return { variation_option_keys, addon_keys, quantity: 1, answers: {}, ...(Object.keys(variation_quantities).length > 0 ? { variation_quantities } : {}) };
}
