// Efeito UNIVERSAL de esforço (2026-10-02): acrescenta/substitui minutos de uma tarefa ou etapa por variação, adicional
// ou condição — sem inventar etapas fictícias. Vale para qualquer produto; produtos antigos (sem esses efeitos) não mudam.
//
// Como funciona:
//   • tipo do efeito: add_effort_minutes | add_effort_hours | replace_effort_minutes (valor numérico >= 0);
//   • alvo: source_task_key (obrigatório) e, opcionalmente, source_step_key — o esforço usa a especialidade do alvo;
//   • quando entra: charge_scope = implementation | first_cycle | one_time | recurring | per_cycle (+ charge_start_cycle / charge_end_cycle;
//     "ciclo específico" = per_cycle com início = fim);
//   • quantidade: effort_scale_by_quantity multiplica pelo número escolhido (adicional por unidade, variação por quantidade ou quantidade do pedido).
// "Substituir" troca o esforço-base do alvo (em todos os ciclos em que o alvo existir) em vez de somar.

export const EFFORT_EFFECT_TYPES = ["add_effort_minutes", "add_effort_hours", "replace_effort_minutes"] as const;
export type EffortEffectType = (typeof EFFORT_EFFECT_TYPES)[number];

export const EFFORT_EFFECT_LABEL: Record<EffortEffectType, string> = {
  add_effort_minutes: "Adicionar minutos de esforço",
  add_effort_hours: "Adicionar horas de esforço",
  replace_effort_minutes: "Substituir o esforço (minutos)",
};

export const isEffortEffect = (t: string): t is EffortEffectType => (EFFORT_EFFECT_TYPES as readonly string[]).includes(t);

/** Minutos que o efeito representa (horas viram minutos). Valor inválido = 0. */
export function effortMinutesOf(type: string, value: string | number | null | undefined): number {
  const n = Number(String(value ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return type === "add_effort_hours" ? Math.round(n * 60 * 100) / 100 : n;
}

export interface EffortItem {
  from: string;
  mode: "add" | "replace";
  /** Minutos por unidade (já convertidos de horas). */
  minutes: number;
  scale: number;
  task: string;
  step: string | null;
  scope: string;
  start: number;
  end: number | null;
}

/** O esforço entra no ciclo k (0 = implantação/primeira cobrança)? */
export function effortActiveAt(m: { scope: string; start: number; end: number | null }, k: number, implementationApplicable = true): boolean {
  if (m.scope === "implementation") return k === 0 && implementationApplicable;
  if (k < m.start) return false;
  if (m.end != null && k > m.end) return false;
  if (m.scope === "one_time" || m.scope === "first_cycle") return k === Math.max(0, m.start);
  return true;
}

export interface EffortValidationCtx {
  taskKeys: Set<string>;
  /** "taskKey:stepKey" */
  stepRefs: Set<string>;
}

/** Valida um efeito de esforço: tipo, número e alvo (tarefa obrigatória; etapa precisa pertencer à tarefa). */
export function validateEffortEffect(type: string, value: string, meta: { source_task_key?: string | null; source_step_key?: string | null; charge_scope?: string | null }, ctx: EffortValidationCtx): string | null {
  if (!isEffortEffect(type)) return null;
  const n = Number(String(value ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return `O efeito "${EFFORT_EFFECT_LABEL[type]}" precisa de um número maior ou igual a zero.`;
  if (!meta.source_task_key) return "Escolha a tarefa (ou etapa) que recebe o esforço.";
  if (!ctx.taskKeys.has(meta.source_task_key)) return `A tarefa "${meta.source_task_key}" do esforço não existe nesta versão.`;
  if (meta.source_step_key && !ctx.stepRefs.has(`${meta.source_task_key}:${meta.source_step_key}`)) return `A etapa "${meta.source_step_key}" não existe na tarefa "${meta.source_task_key}".`;
  if (type === "replace_effort_minutes" && meta.charge_scope && !["recurring", "per_cycle"].includes(meta.charge_scope)) {
    return "Substituir o esforço vale para todos os ciclos do alvo: use o escopo \"todos os ciclos\".";
  }
  return null;
}

export function describeEffort(type: string, value: string, scale: boolean): string | null {
  if (!isEffortEffect(type)) return null;
  const n = Number(value);
  const unit = type === "add_effort_hours" ? `${n} h` : `${n} min`;
  const per = scale ? " por unidade" : "";
  return type === "replace_effort_minutes" ? `substitui o esforço por ${unit}${per}` : `+${unit} de esforço${per}`;
}
