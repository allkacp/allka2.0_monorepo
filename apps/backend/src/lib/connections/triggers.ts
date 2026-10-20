// Gatilhos de ativação das exigências de conexão (2026-10-02). Universal: vale para qualquer produto; sem gatilhos nada muda
// (modo "manual" = comportamento anterior: obrigatória ativa sempre; condicional só quando alguém ativa).
//
// Uma exigência pode ser ativada por: produto · variação · opção · adicional · tarefa · etapa · resposta de questionário · produto vinculado.
// activation_mode: manual | any_trigger (basta um gatilho) | all_triggers (todos).
//
// A avaliação acontece na contratação (seleção da cotação) e sempre que as exigências do projeto são recalculadas.
import type { Prisma, PrismaClient } from "@prisma/client";
import { ConnectionError } from "./catalog";
import { computePricing, defaultSelection, type PricingSelection } from "../catalog2-pricing";

type Db = PrismaClient | Prisma.TransactionClient;

export const ACTIVATION_MODES = ["manual", "any_trigger", "all_triggers"] as const;
export type ActivationMode = (typeof ACTIVATION_MODES)[number];
export const ACTIVATION_MODE_LABEL: Record<ActivationMode, string> = {
  manual: "Manual (quem opera ativa)",
  any_trigger: "Quando QUALQUER gatilho ocorrer",
  all_triggers: "Quando TODOS os gatilhos ocorrerem",
};

export const TRIGGER_KINDS = ["product", "variation", "option", "addon", "task", "step", "questionnaire_answer", "linked_product", "connection", "modality", "first_execution", "renewal", "commercial_rule"] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];
export const TRIGGER_KIND_LABEL: Record<TriggerKind, string> = {
  product: "Contratar este produto",
  variation: "Uma variação (qualquer opção ou uma específica)",
  option: "Uma opção escolhida",
  addon: "Um adicional contratado",
  task: "Uma tarefa que entra no cenário",
  step: "Uma etapa que entra no cenário",
  questionnaire_answer: "Resposta de questionário",
  linked_product: "Produto vinculado contratado junto (ID real)",
  connection: "Outra conexão (acesso) exigida neste produto",
  modality: "Modalidade de contratação",
  first_execution: "Primeira execução",
  renewal: "Renovação (ciclos seguintes)",
  commercial_rule: "Regra comercial do produto",
};
/** Modalidades que o gatilho "modalidade" entende (avulso = sem período; assinatura = contrato mensal/por período). */
export const MODALITIES = ["avulso", "assinatura"] as const;
/** Regras comerciais compatíveis (derivadas do que o produto já tem; nunca inventam preço). */
export const COMMERCIAL_RULES = ["implementation_charge", "recurring_billing"] as const;
export const COMMERCIAL_RULE_LABEL: Record<(typeof COMMERCIAL_RULES)[number], string> = {
  implementation_charge: "Há cobrança de implantação (etapas só da primeira execução)",
  recurring_billing: "Cobrança recorrente (assinatura)",
};
export const TRIGGER_OPERATORS = ["selected", "not_selected", "eq", "neq", "contains", "exists", "not_exists"] as const;
/** Vários valores válidos na MESMA regra são guardados separados por "|" (ex.: "google_ads|ambas" = Google Ads OU Ambas). */
export const MULTI_SEP = "|";
export const splitMulti = (v?: string | null): string[] => (v ?? "").split(MULTI_SEP).map((x) => x.trim()).filter(Boolean);
/** Gatilhos que NÃO precisam de referência (valem só pela ocasião). */
export const REFERENCELESS_KINDS: readonly string[] = ["product", "first_execution", "renewal"];

export interface TriggerInput { kind: string; ref_key?: string | null; ref_value?: string | null; operator?: string | null }

export interface TriggerContext {
  selection: PricingSelection;
  activeTaskKeys: Set<string>;
  activeStepRefs: Set<string>;
  /** IDs (catalog2) dos produtos contratados no mesmo projeto/pedido. */
  contractedProductIds: Set<string>;
  /** chave da variação → chaves das suas opções. */
  optionsByVariation: Map<string, Set<string>>;
  /** "avulso" | "assinatura" quando conhecido (nulo = avulso). */
  modality?: string | null;
  /** true = a primeira execução do produto neste projeto · false = renovação · nulo/ausente = desconhecido (vale como primeira). */
  firstExecution?: boolean | null;
  /** Chaves das exigências de conexão ativas neste cenário (para o gatilho "outra conexão"). */
  activeRequirementKeys?: Set<string>;
  /** O produto tem etapas "só na primeira execução" (cobrança de implantação)? */
  hasImplementationSteps?: boolean;
}

export function evaluateTrigger(t: TriggerInput, ctx: TriggerContext): boolean {
  const op = t.operator ?? "selected";
  const negate = op === "not_selected" || op === "neq" || op === "not_exists";
  const vals = splitMulti(t.ref_value);
  const refs = splitMulti(t.ref_key);
  const sel = ctx.selection;
  const chosen = new Set(sel.variation_option_keys ?? []);
  let hit = false;
  switch (t.kind as TriggerKind) {
    case "product":
      hit = true; break;
    case "variation": {
      const opts = ctx.optionsByVariation.get(t.ref_key ?? "");
      if (!opts) return false;
      hit = vals.length ? vals.some((v) => chosen.has(v) && opts.has(v)) : [...opts].some((k) => chosen.has(k));
      break;
    }
    case "option":
      hit = refs.some((k) => chosen.has(k)); break;
    case "addon":
      hit = refs.some((k) => (sel.addon_keys ?? []).includes(k) || !!sel.addon_selections?.[k]); break;
    case "task":
      hit = ctx.activeTaskKeys.has(t.ref_key ?? ""); break;
    case "step":
      hit = ctx.activeStepRefs.has(t.ref_key ?? ""); break;
    case "questionnaire_answer": {
      const v = (sel.answers ?? {})[t.ref_key ?? ""] ?? "";
      if (op === "selected" || op === "not_selected" || op === "exists" || op === "not_exists") hit = v.length > 0;
      else if (op === "eq" || op === "neq") hit = vals.some((x) => v === x);
      else if (op === "contains") hit = vals.some((x) => v.toLowerCase().includes(x.toLowerCase()));
      break;
    }
    case "linked_product":
      hit = refs.some((k) => ctx.contractedProductIds.has(k)); break;
    case "connection":
      hit = refs.some((k) => ctx.activeRequirementKeys?.has(k)); break;
    case "modality":
      hit = vals.length ? vals.includes(ctx.modality ?? "avulso") : (ctx.modality ?? "avulso") === "assinatura"; break;
    case "first_execution":
      hit = ctx.firstExecution !== false; break;
    case "renewal":
      hit = ctx.firstExecution === false; break;
    case "commercial_rule":
      hit = refs.some((k) => (k === "implementation_charge" ? ctx.firstExecution !== false && !!ctx.hasImplementationSteps : k === "recurring_billing" ? (ctx.modality ?? "avulso") === "assinatura" : false)); break;
    default:
      return false;
  }
  return negate ? !hit : hit;
}

export function evaluateActivation(mode: string, triggers: TriggerInput[], ctx: TriggerContext): boolean {
  if (mode === "all_triggers") return triggers.every((t) => evaluateTrigger(t, ctx));
  return triggers.some((t) => evaluateTrigger(t, ctx)); // any_trigger
}

/** Texto curto de por que a conexão foi (ou não) ativada — vai para o histórico. */
export function describeTrigger(t: TriggerInput): string {
  const k = TRIGGER_KIND_LABEL[t.kind as TriggerKind] ?? t.kind;
  const nice = (v?: string | null) => splitMulti(v).join(" ou ");
  return `${k}${t.ref_key ? `: ${nice(t.ref_key)}` : ""}${t.ref_value ? ` = ${nice(t.ref_value)}` : ""}`;
}

/** Contexto a partir de uma SELEÇÃO já conhecida (cotação/cesta). Produtos vinculados: só os informados. */
export async function buildTriggerContextFromSelection(db: Db, versionId: string, selectionIn: PricingSelection, contractedProductIds: string[] = [], extra: { modality?: string | null; firstExecution?: boolean | null } = {}): Promise<TriggerContext> {
  let selection = selectionIn;
  if (!(selection.variation_option_keys?.length || selection.addon_keys?.length || selection.addon_selections)) {
    // Sem escolhas (ex.: carga direta): vale a seleção padrão da versão.
    selection = { ...(await defaultSelection(versionId)), ...selection };
  }
  let activeTaskKeys = new Set<string>(); let activeStepRefs = new Set<string>();
  try {
    const pr = await computePricing(versionId, selection, { previewOnly: true });
    activeTaskKeys = new Set(pr.active_task_keys); activeStepRefs = new Set(pr.active_step_refs);
  } catch { /* sem cenário: tarefa/etapa só ativam quando o cálculo existir */ }
  const variations = await db.catalog2Variation.findMany({ where: { version_id: versionId }, select: { key: true, options: { select: { key: true } } } });
  const implSteps = await db.catalog2TaskStep.count({ where: { first_execution_only: true, task: { version_id: versionId } } });
  const ctx: TriggerContext = {
    selection, activeTaskKeys, activeStepRefs,
    contractedProductIds: new Set(contractedProductIds),
    optionsByVariation: new Map(variations.map((v) => [v.key, new Set(v.options.map((o) => o.key))])),
    modality: extra.modality ?? null, firstExecution: extra.firstExecution ?? null, hasImplementationSteps: implSteps > 0,
  };
  ctx.activeRequirementKeys = await activeRequirementKeysOf(db, versionId, ctx);
  return ctx;
}

/**
 * Exigências ativas no cenário: as obrigatórias/opcionais sem gatilho valem sempre; as com gatilho valem quando ele ocorre.
 * Gatilhos "outra conexão" são resolvidos numa segunda passada (um nível, para evitar laço).
 */
async function activeRequirementKeysOf(db: Db, versionId: string, ctx: TriggerContext): Promise<Set<string>> {
  const rows = await db.catalog2ConnectionRequirement.findMany({ where: { version_id: versionId, draft_incomplete: false }, select: { key: true, obligation: true, activation_mode: true, triggers: true } });
  const active = new Set<string>();
  const later: typeof rows = [];
  for (const r of rows) {
    if (r.activation_mode === "manual" || r.triggers.length === 0) { if (r.obligation !== "conditional") active.add(r.key); continue; }
    if (r.triggers.some((t) => t.kind === "connection")) { later.push(r); continue; }
    if (evaluateActivation(r.activation_mode, r.triggers, ctx)) active.add(r.key);
  }
  const withFirstPass: TriggerContext = { ...ctx, activeRequirementKeys: active };
  for (const r of later) if (evaluateActivation(r.activation_mode, r.triggers, withFirstPass)) active.add(r.key);
  return active;
}

/** Monta o contexto de avaliação de um produto contratado (seleção da cotação, cenário ativo e produtos do mesmo projeto). */
export async function buildTriggerContext(db: Db, p: { projectId: string; versionId: string; quoteId?: string | null; projectProductId?: string | null }): Promise<TriggerContext> {
  let selection: PricingSelection = {};
  let modality: string | null = null;
  if (p.quoteId) {
    const q = await db.catalog2Quote.findUnique({ where: { id: p.quoteId }, select: { selection_json: true, contract_period: true } });
    try { selection = q?.selection_json ? (JSON.parse(q.selection_json) as PricingSelection) : {}; } catch { selection = {}; }
    modality = q?.contract_period ? "assinatura" : "avulso";
  }
  let firstExecution: boolean | null = null;
  if (p.projectProductId) {
    const pp = await db.projectProduct.findUnique({ where: { id: p.projectProductId }, select: { first_execution_in_project: true, catalog2_period: true } });
    firstExecution = pp?.first_execution_in_project ?? null;
    if (!modality && pp) modality = pp.catalog2_period ? "assinatura" : "avulso";
  }
  const pps = await db.projectProduct.findMany({ where: { project_id: p.projectId, catalog2_product_id: { not: null } }, select: { catalog2_product_id: true } });
  return buildTriggerContextFromSelection(db, p.versionId, selection, pps.map((x) => x.catalog2_product_id!).filter(Boolean), { modality, firstExecution });
}

/** Valida os gatilhos contra a estrutura REAL da versão (nenhuma referência inventada ou por nome aproximado). */
/**
 * Falta algo nesta regra? Devolve a mensagem em português (ou nulo se a regra está completa).
 * Só olha o que a própria regra tem; a existência das referências é conferida em validateTriggers.
 */
export function triggerIncompleteReason(t: TriggerInput): string | null {
  if (!(TRIGGER_KINDS as readonly string[]).includes(t.kind)) return "escolha a origem da condição";
  const op = t.operator ?? "selected";
  const ref = (t.ref_key ?? "").trim();
  const hasVal = splitMulti(t.ref_value).length > 0;
  if (!REFERENCELESS_KINDS.includes(t.kind) && t.kind !== "modality" && !ref) return "escolha a referência da regra";
  if (t.kind === "modality" && !hasVal) return "escolha a modalidade";
  if (t.kind === "variation" && (op === "eq" || op === "neq") && !hasVal) return "escolha ao menos uma opção da variação";
  if (t.kind === "questionnaire_answer" && (op === "eq" || op === "neq" || op === "contains") && !hasVal) return "informe o valor da resposta";
  return null;
}

export async function validateTriggers(db: Db, versionId: string, triggers: TriggerInput[], opts: { allowIncomplete?: boolean } = {}): Promise<TriggerInput[]> {
  if (opts.allowIncomplete) {
    // Rascunho: guarda o que veio (só confere o formato), para a pessoa continuar depois do mesmo ponto.
    return triggers.map((t) => ({
      kind: (TRIGGER_KINDS as readonly string[]).includes(t.kind) ? t.kind : "product",
      ref_key: (t.ref_key ?? "").trim() || null, ref_value: t.ref_value?.trim() || null,
      operator: (TRIGGER_OPERATORS as readonly string[]).includes(t.operator ?? "") ? t.operator : "selected",
    }));
  }
  const fail = (m: string) => { throw new ConnectionError(m, 422, "trigger_invalid"); };
  const v = await db.catalog2ProductVersion.findUnique({
    where: { id: versionId },
    include: {
      variations: { include: { options: true } }, addons: true,
      tasks: { include: { steps: true, questionnaire: { include: { questions: true } } } },
    },
  });
  if (!v) return fail("Versão não encontrada.");
  const optionKeys = new Set(v.variations.flatMap((x) => x.options.map((o) => o.key)));
  const out: TriggerInput[] = [];
  for (const t of triggers) {
    if (!(TRIGGER_KINDS as readonly string[]).includes(t.kind)) fail(`Tipo de gatilho inválido: "${t.kind}".`);
    const operator = t.operator ?? "selected";
    if (!(TRIGGER_OPERATORS as readonly string[]).includes(operator)) fail(`Operador de gatilho inválido: "${operator}".`);
    const ref = (t.ref_key ?? "").trim();
    const incomplete = triggerIncompleteReason(t);
    if (incomplete) fail(`Condição incompleta: ${incomplete}.`);
    switch (t.kind as TriggerKind) {
      case "product": case "first_execution": case "renewal": break;
      case "variation": {
        const va = v.variations.find((x) => x.key === ref);
        if (!va) fail(`A variação "${ref}" não existe nesta versão.`);
        for (const val of splitMulti(t.ref_value)) if (!va!.options.some((o) => o.key === val)) fail(`A opção "${val}" não pertence à variação "${ref}".`);
        break;
      }
      case "option": for (const k of splitMulti(ref)) if (!optionKeys.has(k)) fail(`A opção "${k}" não existe nesta versão.`); break;
      case "addon": for (const k of splitMulti(ref)) if (!v.addons.some((a) => a.key === k)) fail(`O adicional "${k}" não existe nesta versão.`); break;
      case "connection": {
        const keys = new Set((await db.catalog2ConnectionRequirement.findMany({ where: { version_id: versionId }, select: { key: true } })).map((x) => x.key));
        for (const k of splitMulti(ref)) if (!keys.has(k)) fail(`A conexão "${k}" não existe nesta versão.`);
        break;
      }
      case "modality": for (const val of splitMulti(t.ref_value)) if (!(MODALITIES as readonly string[]).includes(val)) fail(`Modalidade desconhecida: "${val}".`); break;
      case "commercial_rule": for (const k of splitMulti(ref)) if (!(COMMERCIAL_RULES as readonly string[]).includes(k)) fail(`Regra comercial desconhecida: "${k}".`); break;
      case "task": if (!v.tasks.some((x) => x.key === ref)) fail(`A tarefa "${ref}" não existe nesta versão.`); break;
      case "step": if (!v.tasks.some((x) => x.steps.some((s) => `${x.key}:${s.key}` === ref))) fail(`A etapa "${ref}" não existe (use tarefa:etapa).`); break;
      case "questionnaire_answer":
        if (!v.tasks.some((x) => x.questionnaire?.questions.some((q) => q.key === ref))) fail(`A pergunta "${ref}" não existe em nenhum questionário desta versão.`);
        if ((operator === "eq" || operator === "neq" || operator === "contains") && !t.ref_value) fail("Informe o valor da resposta que ativa a conexão.");
        break;
      case "linked_product": {
        for (const k of splitMulti(ref)) {
          const p = await db.catalog2Product.findUnique({ where: { id: k }, select: { id: true } });
          if (!p) fail(`O produto vinculado "${k}" não foi encontrado pelo ID real.`);
        }
        break;
      }
    }
    out.push({ kind: t.kind, ref_key: ref || null, ref_value: t.ref_value?.trim() || null, operator });
  }
  return out;
}

export async function replaceTriggers(db: Db, requirementId: string, triggers: TriggerInput[]) {
  await db.catalog2ConnectionTrigger.deleteMany({ where: { requirement_id: requirementId } });
  let i = 0;
  for (const t of triggers) await db.catalog2ConnectionTrigger.create({ data: { requirement_id: requirementId, kind: t.kind, ref_key: t.ref_key ?? null, ref_value: t.ref_value ?? null, operator: t.operator ?? "selected", sort_order: i++ } });
}
