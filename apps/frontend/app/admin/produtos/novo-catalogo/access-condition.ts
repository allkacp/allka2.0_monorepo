// Condição de um acesso ("Condição quando este acesso passa a ser necessário"): modelo puro, sem tela.
// Guarda no formato que o servidor já entende (gatilhos de ativação): activation_mode (E / OU) + regras (origem, referência, operador, valores).
// Vários valores válidos na MESMA regra viram "a|b" (= a OU b). Nunca há código livre: tudo vem de listas da própria versão do produto.

export const COND_KINDS = ["variation", "option", "addon", "questionnaire_answer", "connection", "step", "modality", "first_execution", "renewal", "commercial_rule"] as const;
export type CondKind = (typeof COND_KINDS)[number];
export const COND_KIND_LABEL: Record<CondKind, string> = {
  variation: "Variação",
  option: "Opção da variação",
  addon: "Adicional",
  questionnaire_answer: "Resposta do questionário",
  connection: "Outra conexão",
  step: "Etapa",
  modality: "Modalidade de contratação",
  first_execution: "Primeira execução",
  renewal: "Renovação",
  commercial_rule: "Regra comercial",
};
export const COND_OPERATORS = ["eq", "neq", "selected", "not_selected", "contains", "exists", "not_exists"] as const;
export type CondOperator = (typeof COND_OPERATORS)[number];
export const COND_OPERATOR_LABEL: Record<CondOperator, string> = {
  eq: "É igual a",
  neq: "É diferente de",
  selected: "Está selecionado",
  not_selected: "Não está selecionado",
  contains: "Contém",
  exists: "Existe",
  not_exists: "Não existe",
};
/** Operadores que fazem sentido para cada origem (o resto só confundiria). */
export const OPERATORS_BY_KIND: Record<CondKind, CondOperator[]> = {
  variation: ["eq", "neq", "selected", "not_selected"],
  option: ["selected", "not_selected"],
  addon: ["selected", "not_selected"],
  questionnaire_answer: ["eq", "neq", "contains", "exists", "not_exists"],
  connection: ["exists", "not_exists"],
  step: ["exists", "not_exists"],
  modality: ["eq", "neq"],
  first_execution: ["selected", "not_selected"],
  renewal: ["selected", "not_selected"],
  commercial_rule: ["exists", "not_exists"],
};
/** Origens em que as "opções válidas" ficam em ref_key (várias separadas por "|"); nas demais ficam em ref_value. */
const MULTI_IN_REF: readonly CondKind[] = ["option", "addon", "connection", "commercial_rule"];
const NEEDS_NO_REF: readonly CondKind[] = ["first_execution", "renewal", "modality"];
export const SEP = "|";
export const COMMERCIAL_RULES: { key: string; label: string }[] = [
  { key: "implementation_charge", label: "Há cobrança de implantação (etapas só da primeira execução)" },
  { key: "recurring_billing", label: "Cobrança recorrente (assinatura)" },
];
export const MODALITIES: { key: string; label: string }[] = [
  { key: "avulso", label: "Compra avulsa" },
  { key: "assinatura", label: "Assinatura mensal" },
];

export interface CondRule { id: string; kind: CondKind | ""; ref_key: string; values: string[]; operator: CondOperator }
export interface AccessCondition {
  mode: "any_trigger" | "all_triggers";
  rules: CondRule[];
  /** Gatilhos de tipos que esta tela não edita (ex.: produto vinculado): seguem guardados, nunca são apagados por aqui. */
  preserved?: TriggerRow[];
}
export interface TriggerRow { kind: string; ref_key?: string | null; ref_value?: string | null; operator?: string | null }

let seq = 1;
export const newRuleId = () => `r${Date.now().toString(36)}${seq++}`;
export const emptyRule = (): CondRule => ({ id: newRuleId(), kind: "", ref_key: "", values: [], operator: "eq" });
export const emptyCondition = (): AccessCondition => ({ mode: "any_trigger", rules: [], preserved: [] });
export const defaultOperator = (kind: CondKind): CondOperator => OPERATORS_BY_KIND[kind][0];

const split = (v?: string | null): string[] => (v ?? "").split(SEP).map((x) => x.trim()).filter(Boolean);

/** Gatilhos guardados no servidor → condição da tela. */
export function conditionFromServer(activation: { mode?: string; triggers?: TriggerRow[] } | null | undefined): AccessCondition {
  // Gatilhos de outros tipos (ex.: "produto", "tarefa", "produto vinculado") continuam valendo no servidor, mas não são editados aqui.
  const trg = (activation?.triggers ?? []).filter((t) => (COND_KINDS as readonly string[]).includes(t.kind));
  const preserved = (activation?.triggers ?? []).filter((t) => !(COND_KINDS as readonly string[]).includes(t.kind)).map((t) => ({ kind: t.kind, ref_key: t.ref_key ?? null, ref_value: t.ref_value ?? null, operator: t.operator ?? null }));
  return { mode: activation?.mode === "all_triggers" ? "all_triggers" : "any_trigger", rules: trg.map(ruleFromTrigger), preserved };
}
function ruleFromTrigger(t: TriggerRow): CondRule {
  const kind = t.kind as CondKind;
  const multiRef = MULTI_IN_REF.includes(kind);
  const operator = ((COND_OPERATORS as readonly string[]).includes(t.operator ?? "") ? t.operator : defaultOperator(kind)) as CondOperator;
  return { id: newRuleId(), kind, ref_key: multiRef ? "" : (t.ref_key ?? ""), values: multiRef ? split(t.ref_key) : split(t.ref_value), operator };
}

/** Condição da tela → gatilhos para enviar ao servidor (mantém regras incompletas: o servidor decide se aceita como rascunho). */
export function triggersFromCondition(c: AccessCondition): TriggerRow[] {
  const edited = c.rules.filter((r) => r.kind).map((r) => {
    const kind = r.kind as CondKind;
    const multiRef = MULTI_IN_REF.includes(kind);
    return {
      kind,
      ref_key: multiRef ? (r.values.join(SEP) || null) : (r.ref_key || null),
      ref_value: multiRef ? null : (r.values.join(SEP) || null),
      operator: r.operator,
    };
  });
  return [...edited, ...(c.preserved ?? [])];
}

/** O que falta nesta regra (mensagem em português) ou nulo se está completa. */
export function ruleIssue(r: CondRule): string | null {
  if (!r.kind) return "escolha a origem da condição";
  const kind = r.kind;
  if (!OPERATORS_BY_KIND[kind].includes(r.operator)) return "escolha o operador";
  if (MULTI_IN_REF.includes(kind)) return r.values.length ? null : kind === "option" ? "escolha ao menos uma opção" : kind === "addon" ? "escolha ao menos um adicional" : kind === "connection" ? "escolha a conexão" : "escolha a regra comercial";
  if (kind === "modality") return r.values.length ? null : "escolha a modalidade";
  if (NEEDS_NO_REF.includes(kind)) return null;
  if (!r.ref_key) return kind === "variation" ? "escolha a variação" : kind === "questionnaire_answer" ? "escolha a pergunta do questionário" : "escolha a etapa";
  if (kind === "variation" && (r.operator === "eq" || r.operator === "neq") && !r.values.length) return "escolha ao menos uma opção da variação";
  if (kind === "questionnaire_answer" && ["eq", "neq", "contains"].includes(r.operator) && !r.values.length) return "informe o valor da resposta";
  return null;
}

/** Problemas da condição inteira (vazio = completa). */
export function conditionIssues(c: AccessCondition): string[] {
  if (!c.rules.length && !(c.preserved ?? []).length) return ["defina a condição: adicione ao menos uma regra"];
  return c.rules.map((r, i) => ruleIssue(r) && `regra ${i + 1}: ${ruleIssue(r)}`).filter((x): x is string => !!x);
}

// ── Listas da própria versão (nada de código livre) ────────────────────────
export interface CondRef { key: string; label: string }
export interface CondOptionRef extends CondRef { options: CondRef[] }
export interface CondSources {
  variations: CondOptionRef[];
  options: (CondRef & { variation: string })[];
  addons: CondRef[];
  questions: (CondRef & { options: CondRef[]; type: string })[];
  connections: CondRef[];
  steps: CondRef[];
}

/** Extrai as referências possíveis a partir do que o editor já tem carregado (versão do produto). `selfKey` = o próprio acesso (não pode depender de si). */
export function sourcesFromVersion(version: any, selfKey?: string | null): CondSources {
  const variations: CondOptionRef[] = (version?.variations ?? []).filter((v: any) => v.is_active !== false).map((v: any) => ({
    key: v.key, label: v.name, options: (v.options ?? []).filter((o: any) => o.is_active !== false).map((o: any) => ({ key: o.key, label: o.label })),
  }));
  const questions = (version?.tasks ?? []).flatMap((t: any) => (t.questionnaire?.questions ?? []).map((q: any) => ({
    key: q.key, label: q.label, type: q.question_type,
    options: (Array.isArray(q.options) ? q.options : []).map((o: any) => (typeof o === "string" ? { key: o, label: o } : { key: String(o.value ?? o.key ?? o.label), label: String(o.label ?? o.value ?? o.key) })),
  })));
  return {
    variations,
    options: variations.flatMap((v) => v.options.map((o) => ({ ...o, variation: v.label }))),
    addons: (version?.addons ?? []).filter((a: any) => a.is_active !== false).map((a: any) => ({ key: a.key, label: a.name })),
    questions,
    connections: ((version?.connection_requirements ?? []) as any[]).filter((r) => r.key !== selfKey && !r.draft_incomplete).map((r) => ({ key: r.key, label: r.label?.trim() || r.connection_type?.name || r.key })),
    steps: (version?.tasks ?? []).flatMap((t: any) => (t.steps ?? []).map((s: any) => ({ key: `${t.key}:${s.key}`, label: `${s.name} (${t.name})` }))),
  };
}

const labelOfKey = (list: CondRef[], key: string) => list.find((x) => x.key === key)?.label ?? key;

/** Frase legível da condição ("Plataforma é igual a Google Ads ou Ambas, e …"). Vazia se não há regra. */
export function describeCondition(c: AccessCondition, src: CondSources): string {
  const parts = c.rules.filter((r) => r.kind).map((r) => {
    const kind = r.kind as CondKind;
    const op = COND_OPERATOR_LABEL[r.operator].toLowerCase();
    const or = (list: string[]) => list.join(" ou ");
    switch (kind) {
      case "variation": {
        const va = src.variations.find((v) => v.key === r.ref_key);
        const vals = r.values.map((v) => labelOfKey(va?.options ?? [], v));
        return `a variação “${va?.label ?? (r.ref_key || "…")}” ${vals.length ? `${op} ${or(vals)}` : op}`;
      }
      case "option": return `a opção ${or(r.values.map((v) => `“${labelOfKey(src.options, v)}”`)) || "…"} ${op}`;
      case "addon": return `o adicional ${or(r.values.map((v) => `“${labelOfKey(src.addons, v)}”`)) || "…"} ${op}`;
      case "questionnaire_answer": {
        const q = src.questions.find((x) => x.key === r.ref_key);
        const vals = r.values.map((v) => labelOfKey(q?.options ?? [], v));
        return `a resposta “${q?.label ?? (r.ref_key || "…")}” ${op}${vals.length ? ` ${or(vals)}` : ""}`;
      }
      case "connection": return `a conexão ${or(r.values.map((v) => `“${labelOfKey(src.connections, v)}”`)) || "…"} ${op}`;
      case "step": return `a etapa “${labelOfKey(src.steps, r.ref_key) || "…"}” ${op}`;
      case "modality": return `a modalidade ${op} ${or(r.values.map((v) => labelOfKey(MODALITIES, v))) || "…"}`;
      case "first_execution": return r.operator === "not_selected" ? "não é a primeira execução" : "é a primeira execução";
      case "renewal": return r.operator === "not_selected" ? "não é uma renovação" : "é uma renovação";
      case "commercial_rule": return `a regra comercial ${or(r.values.map((v) => `“${labelOfKey(COMMERCIAL_RULES, v)}”`)) || "…"} ${op}`;
    }
  });
  if (!parts.length) return "";
  return parts.join(c.mode === "all_triggers" ? ", e " : ", ou ");
}
