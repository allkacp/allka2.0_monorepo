// Entrega emergencial (reunião 2026-10-05, B3): o produto liga a opção; cada ETAPA diz quantas horas ela encurta e quanto cobra a mais
// (valor fixo em R$ ou % do preço da etapa). Se o cliente escolher a entrega emergencial, o sistema recalcula o prazo total
// (caminho mais longo das etapas, com as reduções) e o preço final (soma dos adicionais). Sem configuração nada muda.
import { criticalPathMinutes, type FlowStep } from "./step-flow";

export const EMERGENCY_EXTRA_KINDS = ["fixed", "percent"] as const;
export type EmergencyExtraKind = (typeof EMERGENCY_EXTRA_KINDS)[number];

export interface EmergencyStepInput {
  task_key: string;
  step_key: string;
  name: string;
  sort_order: number;
  depends_on_json?: string | null;
  /** minutos da etapa neste cenário (sem a emergência) */
  minutes: number;
  reduction_minutes: number | null;
  extra_kind: string | null;
  extra_value: number | null;
  /** custo exato da etapa (horas × valor/hora), sem taxas — base do percentual */
  exact_cost: number | null;
}

export interface EmergencyItem { task_key: string; step_key: string; name: string; reduction_minutes: number; extra_kind: string | null; extra_value: number | null; extra_price: number | null }
export interface EmergencyResult {
  /** a versão liga a entrega emergencial E existe ao menos uma etapa com redução/adicional */
  available: boolean;
  /** o cliente escolheu */
  selected: boolean;
  items: EmergencyItem[];
  /** total cobrado a mais (null quando algum percentual não pôde ser calculado por falta de preço) */
  extra_price: number | null;
  extra_pending: boolean;
  minutes_before: number;
  minutes_after: number;
  reduction_minutes: number;
  /** quantos dias úteis o prazo comercial encurta (arredondado para cima) */
  reduction_days: number;
  commercial_days_before: number | null;
  commercial_days_after: number | null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

export function validateEmergencyStepInput(i: { reduction_minutes?: number | null; extra_kind?: string | null; extra_value?: number | null; estimated_minutes?: number | null }): string | null {
  if (i.reduction_minutes != null && i.reduction_minutes < 0) return "A redução de prazo não pode ser negativa.";
  if (i.estimated_minutes != null && i.reduction_minutes != null && i.reduction_minutes > i.estimated_minutes) return "A redução não pode ser maior que o tempo da própria etapa.";
  if (i.extra_kind != null && !(EMERGENCY_EXTRA_KINDS as readonly string[]).includes(i.extra_kind)) return "Tipo de adicional inválido (use valor fixo ou percentual).";
  if ((i.extra_kind != null) !== (i.extra_value != null)) return "Informe o tipo e o valor do adicional juntos.";
  if (i.extra_value != null && i.extra_value < 0) return "O adicional não pode ser negativo.";
  if (i.extra_kind === "percent" && (i.extra_value ?? 0) > 1000) return "O percentual é alto demais (máximo 1000%).";
  return null;
}

export function computeEmergency(args: {
  enabled: boolean;
  selected: boolean;
  steps: EmergencyStepInput[];
  /** preço final ÷ custo acumulado: converte custo da etapa em preço da etapa */
  priceRatio: number | null;
  /** percentual de qualificação/revisão aplicado ao custo humano */
  reviewPercent: number | null;
  baseCommercialDays: number | null;
  hoursPerDay: number;
}): EmergencyResult {
  const configured = args.steps.filter((s) => (s.reduction_minutes ?? 0) > 0 || s.extra_kind != null);
  const available = args.enabled && configured.length > 0;
  const toFlow = (steps: EmergencyStepInput[], reduce: boolean): FlowStep[] => steps.map((s) => ({
    key: `${s.task_key}:${s.step_key}`, name: s.name, sort_order: s.sort_order, depends_on_json: s.depends_on_json ?? null,
    estimated_minutes: Math.max(0, s.minutes - (reduce ? clamp(s.reduction_minutes ?? 0, 0, s.minutes) : 0)),
  }));
  // O caminho mais longo é calculado por tarefa (as dependências são entre etapas da mesma tarefa); tarefas somam.
  const byTask = new Map<string, EmergencyStepInput[]>();
  for (const s of args.steps) byTask.set(s.task_key, [...(byTask.get(s.task_key) ?? []), s]);
  const path = (reduce: boolean) => [...byTask.values()].reduce((a, steps) => a + criticalPathMinutes(prefixKeys(toFlow(steps, reduce))), 0);
  const before = path(false);
  const after = available && args.selected ? path(true) : before;
  const items: EmergencyItem[] = configured.map((s) => {
    const red = clamp(s.reduction_minutes ?? 0, 0, s.minutes);
    let price: number | null = null;
    if (s.extra_kind === "fixed" && s.extra_value != null) price = round2(s.extra_value);
    else if (s.extra_kind === "percent" && s.extra_value != null && s.exact_cost != null && args.priceRatio != null) price = round2((s.extra_value / 100) * s.exact_cost * (1 + (args.reviewPercent ?? 0) / 100) * args.priceRatio);
    else if (s.extra_kind == null) price = 0;
    return { task_key: s.task_key, step_key: s.step_key, name: s.name, reduction_minutes: red, extra_kind: s.extra_kind, extra_value: s.extra_value, extra_price: price };
  });
  const pending = items.some((i) => i.extra_price == null);
  const extra = pending ? null : round2(items.reduce((a, i) => a + (i.extra_price ?? 0), 0));
  const reductionMinutes = Math.max(0, before - after);
  const reductionDays = reductionMinutes > 0 ? Math.ceil(reductionMinutes / 60 / Math.max(1, args.hoursPerDay)) : 0;
  const base = args.baseCommercialDays;
  return {
    available, selected: available && args.selected, items: available ? items : [], extra_price: available ? extra : 0, extra_pending: available && pending,
    minutes_before: before, minutes_after: after, reduction_minutes: reductionMinutes, reduction_days: reductionDays,
    commercial_days_before: base, commercial_days_after: base == null ? null : Math.max(1, base - reductionDays),
  };
}

/** As chaves de etapa dependem da tarefa: "tarefa:etapa" — as dependências guardadas usam só a chave da etapa, então ajusta. */
function prefixKeys(steps: FlowStep[]): FlowStep[] {
  return steps.map((s) => {
    const task = s.key.split(":")[0];
    let deps: string[] | null = null;
    if (s.depends_on_json != null) {
      try { const d = JSON.parse(s.depends_on_json); deps = Array.isArray(d) ? d.map((k: string) => `${task}:${k}`) : null; } catch { deps = null; }
    }
    return { ...s, depends_on_json: deps == null ? null : JSON.stringify(deps) };
  });
}
