// Vocabulário FECHADO de condições e efeitos do novo catálogo (bloco 3/6).
// Nada aqui é código livre / JS / SQL — só enums validados no servidor.

export const CONDITION_TRIGGER_SOURCES = [
  "variation_option", // gatilho: uma opção de variação foi escolhida
  "addon_selected", // gatilho: um adicional foi selecionado
  "quantity", // gatilho: quantidade contratada
  "client_answer", // gatilho: resposta do cliente a uma pergunta
  "contract_attribute", // gatilho: atributo conhecido da contratação (ex.: urgente)
] as const;
export type ConditionTriggerSource = (typeof CONDITION_TRIGGER_SOURCES)[number];

export const CONDITION_OPERATORS = [
  "eq",
  "neq",
  "gte",
  "lte",
  "contains",
  "selected",
  "not_selected",
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

// Efeitos — mesmo conjunto para condições, opções de variação e adicionais.
export const CATALOG2_EFFECT_TYPES = [
  "add_deadline_days", // effect_value = número de dias (>= 0)
  "add_fixed_amount", // effect_value = valor fixo (>= 0)
  "add_percent", // effect_value = percentual (>= 0)
  "add_task", // effect_value = key de uma tarefa is_conditional da mesma versão
  "remove_task", // effect_value = key de uma tarefa da mesma versão
  "add_step", // effect_value = "taskKey:stepKey" (etapa is_conditional da mesma versão)
  "require_info", // effect_value = texto (informação exigida do cliente)
  "add_deliverable", // effect_value = texto (entregável adicional)
] as const;
export type Catalog2EffectType = (typeof CATALOG2_EFFECT_TYPES)[number];

const NUMERIC_EFFECTS = new Set<Catalog2EffectType>(["add_deadline_days", "add_fixed_amount", "add_percent"]);
const TASK_REF_EFFECTS = new Set<Catalog2EffectType>(["add_task", "remove_task"]);
const TEXT_EFFECTS = new Set<Catalog2EffectType>(["require_info", "add_deliverable"]);

export interface EffectValidationCtx {
  taskKeys: Set<string>;
  conditionalTaskKeys: Set<string>;
  // "taskKey:stepKey"
  stepRefs: Set<string>;
  conditionalStepRefs: Set<string>;
}

/** Valida um par (effect_type, effect_value). Devolve null se OK, ou a mensagem de erro. */
export function validateEffect(
  effectType: string,
  effectValue: string,
  ctx: EffectValidationCtx,
): string | null {
  if (!(CATALOG2_EFFECT_TYPES as readonly string[]).includes(effectType)) {
    return `Tipo de efeito inválido: "${effectType}".`;
  }
  const et = effectType as Catalog2EffectType;
  const v = (effectValue ?? "").trim();

  if (NUMERIC_EFFECTS.has(et)) {
    const n = Number(v);
    if (!Number.isFinite(n)) return `O efeito "${et}" precisa de um número.`;
    if (n < 0) return `O efeito "${et}" não aceita valor negativo.`;
    return null;
  }
  if (TASK_REF_EFFECTS.has(et)) {
    if (!v) return `O efeito "${et}" precisa apontar para a key de uma tarefa.`;
    if (!ctx.taskKeys.has(v)) return `O efeito "${et}" aponta para a tarefa "${v}", que não existe nesta versão.`;
    if (et === "add_task" && !ctx.conditionalTaskKeys.has(v)) {
      return `"add_task" só pode incluir uma tarefa marcada como condicional. "${v}" é fixa.`;
    }
    return null;
  }
  if (et === "add_step") {
    if (!v.includes(":")) return `"add_step" precisa de "taskKey:stepKey".`;
    if (!ctx.stepRefs.has(v)) return `"add_step" aponta para "${v}", que não existe nesta versão.`;
    if (!ctx.conditionalStepRefs.has(v)) return `"add_step" só pode incluir uma etapa marcada como condicional.`;
    return null;
  }
  if (TEXT_EFFECTS.has(et)) {
    if (!v) return `O efeito "${et}" precisa de um texto.`;
    if (v.length > 500) return `O texto do efeito "${et}" é longo demais.`;
    return null;
  }
  return `Efeito não reconhecido: "${et}".`;
}

/** Frase legível para o admin a partir dos campos da condição. */
export function describeCondition(c: {
  trigger_source: string;
  trigger_ref?: string | null;
  operator: string;
  comparison_value?: string | null;
  effect_type: string;
  effect_value: string;
}): string {
  const src: Record<string, string> = {
    variation_option: `a opção "${c.trigger_ref ?? "?"}"`,
    addon_selected: `o adicional "${c.trigger_ref ?? "?"}"`,
    quantity: "a quantidade",
    client_answer: `a resposta "${c.trigger_ref ?? "?"}"`,
    contract_attribute: `o atributo "${c.trigger_ref ?? "?"}"`,
  };
  const op: Record<string, string> = {
    eq: `for igual a "${c.comparison_value ?? ""}"`,
    neq: `for diferente de "${c.comparison_value ?? ""}"`,
    gte: `for maior ou igual a ${c.comparison_value ?? ""}`,
    lte: `for menor ou igual a ${c.comparison_value ?? ""}`,
    contains: `contiver "${c.comparison_value ?? ""}"`,
    selected: "for selecionado",
    not_selected: "não for selecionado",
  };
  const eff: Record<string, string> = {
    add_deadline_days: `adicionar ${c.effect_value} dia(s) ao prazo`,
    add_fixed_amount: `somar ${c.effect_value} ao valor`,
    add_percent: `somar ${c.effect_value}% ao valor`,
    add_task: `incluir a tarefa "${c.effect_value}"`,
    remove_task: `remover a tarefa "${c.effect_value}"`,
    add_step: `incluir a etapa "${c.effect_value}"`,
    require_info: `exigir a informação: ${c.effect_value}`,
    add_deliverable: `adicionar o entregável: ${c.effect_value}`,
  };
  return `Se ${src[c.trigger_source] ?? c.trigger_source} ${op[c.operator] ?? c.operator}, ${eff[c.effect_type] ?? c.effect_type}.`;
}
