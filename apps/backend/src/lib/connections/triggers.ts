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

export const TRIGGER_KINDS = ["product", "variation", "option", "addon", "task", "step", "questionnaire_answer", "linked_product"] as const;
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
};
export const TRIGGER_OPERATORS = ["selected", "not_selected", "eq", "neq", "contains"] as const;

export interface TriggerInput { kind: string; ref_key?: string | null; ref_value?: string | null; operator?: string | null }

export interface TriggerContext {
  selection: PricingSelection;
  activeTaskKeys: Set<string>;
  activeStepRefs: Set<string>;
  /** IDs (catalog2) dos produtos contratados no mesmo projeto/pedido. */
  contractedProductIds: Set<string>;
  /** chave da variação → chaves das suas opções. */
  optionsByVariation: Map<string, Set<string>>;
}

export function evaluateTrigger(t: TriggerInput, ctx: TriggerContext): boolean {
  const op = t.operator ?? "selected";
  const negate = op === "not_selected" || op === "neq";
  const sel = ctx.selection;
  const chosen = new Set(sel.variation_option_keys ?? []);
  let hit = false;
  switch (t.kind as TriggerKind) {
    case "product":
      hit = true; break;
    case "variation": {
      const opts = ctx.optionsByVariation.get(t.ref_key ?? "");
      if (!opts) return false;
      hit = t.ref_value ? chosen.has(t.ref_value) && opts.has(t.ref_value) : [...opts].some((k) => chosen.has(k));
      break;
    }
    case "option":
      hit = chosen.has(t.ref_key ?? ""); break;
    case "addon":
      hit = (sel.addon_keys ?? []).includes(t.ref_key ?? "") || !!sel.addon_selections?.[t.ref_key ?? ""]; break;
    case "task":
      hit = ctx.activeTaskKeys.has(t.ref_key ?? ""); break;
    case "step":
      hit = ctx.activeStepRefs.has(t.ref_key ?? ""); break;
    case "questionnaire_answer": {
      const v = (sel.answers ?? {})[t.ref_key ?? ""] ?? "";
      if (op === "selected" || op === "not_selected") hit = v.length > 0;
      else if (op === "eq" || op === "neq") hit = v === (t.ref_value ?? "");
      else if (op === "contains") hit = v.toLowerCase().includes((t.ref_value ?? "").toLowerCase());
      break;
    }
    case "linked_product":
      hit = ctx.contractedProductIds.has(t.ref_key ?? ""); break;
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
  return `${k}${t.ref_key ? `: ${t.ref_key}` : ""}${t.ref_value ? ` = ${t.ref_value}` : ""}`;
}

/** Contexto a partir de uma SELEÇÃO já conhecida (cotação/cesta). Produtos vinculados: só os informados. */
export async function buildTriggerContextFromSelection(db: Db, versionId: string, selectionIn: PricingSelection, contractedProductIds: string[] = []): Promise<TriggerContext> {
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
  return {
    selection, activeTaskKeys, activeStepRefs,
    contractedProductIds: new Set(contractedProductIds),
    optionsByVariation: new Map(variations.map((v) => [v.key, new Set(v.options.map((o) => o.key))])),
  };
}

/** Monta o contexto de avaliação de um produto contratado (seleção da cotação, cenário ativo e produtos do mesmo projeto). */
export async function buildTriggerContext(db: Db, p: { projectId: string; versionId: string; quoteId?: string | null }): Promise<TriggerContext> {
  let selection: PricingSelection = {};
  if (p.quoteId) {
    const q = await db.catalog2Quote.findUnique({ where: { id: p.quoteId }, select: { selection_json: true } });
    try { selection = q?.selection_json ? (JSON.parse(q.selection_json) as PricingSelection) : {}; } catch { selection = {}; }
  }
  const pps = await db.projectProduct.findMany({ where: { project_id: p.projectId, catalog2_product_id: { not: null } }, select: { catalog2_product_id: true } });
  return buildTriggerContextFromSelection(db, p.versionId, selection, pps.map((x) => x.catalog2_product_id!).filter(Boolean));
}

/** Valida os gatilhos contra a estrutura REAL da versão (nenhuma referência inventada ou por nome aproximado). */
export async function validateTriggers(db: Db, versionId: string, triggers: TriggerInput[]): Promise<TriggerInput[]> {
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
    switch (t.kind as TriggerKind) {
      case "product": break;
      case "variation": {
        const va = v.variations.find((x) => x.key === ref);
        if (!va) fail(`A variação "${ref}" não existe nesta versão.`);
        if (t.ref_value && !va!.options.some((o) => o.key === t.ref_value)) fail(`A opção "${t.ref_value}" não pertence à variação "${ref}".`);
        break;
      }
      case "option": if (!optionKeys.has(ref)) fail(`A opção "${ref}" não existe nesta versão.`); break;
      case "addon": if (!v.addons.some((a) => a.key === ref)) fail(`O adicional "${ref}" não existe nesta versão.`); break;
      case "task": if (!v.tasks.some((x) => x.key === ref)) fail(`A tarefa "${ref}" não existe nesta versão.`); break;
      case "step": if (!v.tasks.some((x) => x.steps.some((s) => `${x.key}:${s.key}` === ref))) fail(`A etapa "${ref}" não existe (use tarefa:etapa).`); break;
      case "questionnaire_answer":
        if (!v.tasks.some((x) => x.questionnaire?.questions.some((q) => q.key === ref))) fail(`A pergunta "${ref}" não existe em nenhum questionário desta versão.`);
        if ((operator === "eq" || operator === "neq" || operator === "contains") && !t.ref_value) fail("Informe o valor da resposta que ativa a conexão.");
        break;
      case "linked_product": {
        const p = ref ? await db.catalog2Product.findUnique({ where: { id: ref }, select: { id: true } }) : null;
        if (!p) fail(`O produto vinculado "${ref}" não foi encontrado pelo ID real.`);
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
