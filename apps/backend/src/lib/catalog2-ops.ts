// Campos OPERACIONAIS de tarefa e etapa (Pedido 3, fase 1) + visibilidade por perfil.
//
// Ficam num único JSON ("ops") nas tarefas, etapas e modelos globais — assim um campo
// novo não exige mexer em todos os pontos que copiam tarefa/etapa (clonar versão,
// duplicar, importar, enviar pacote…): copia-se o bloco inteiro.
//
// Vazio/nulo = nada preenchido (todos os produtos antigos). Nada aqui é obrigatório.
//
// VISIBILIDADE: cada campo tem um "nível" que diz até onde ele pode ser visto:
//   internal → só Administração · leader → + Líder · executor → + quem executa (nômade/IA)
//   agency → + agência · client → todos, inclusive o cliente.
// Quem vê: o perfil do usuário precisa estar "dentro" do nível do campo.
import { z } from "zod";

export const VISIBILITY_LEVELS = ["internal", "leader", "executor", "agency", "client"] as const;
export type Visibility = (typeof VISIBILITY_LEVELS)[number];
export const VISIBILITY_LABEL: Record<Visibility, string> = {
  internal: "Só administração",
  leader: "Administração e líder",
  executor: "Quem executa (nômade/IA), líder e administração",
  agency: "Também a agência",
  client: "Todos, inclusive o cliente",
};
const RANK: Record<Visibility, number> = { internal: 0, leader: 1, executor: 2, agency: 3, client: 4 };

/** Em que "nível" o usuário logado está (quanto menor, mais interno). */
export function audienceOf(user?: { role?: string | null; account_type?: string | null } | null): Visibility {
  if (!user) return "client";
  if (user.role === "admin" || user.account_type === "admin") return "internal";
  if (user.role === "lider" || user.account_type === "lider") return "leader";
  if (user.account_type === "nomades") return "executor";
  if (user.account_type === "agencias") return "agency";
  return "client"; // empresas e qualquer outro perfil: o mais restrito
}
// R21-13 (reunião 21/10): além do nível antigo (hierárquico), o campo aceita uma LISTA de perfis marcados (internal,leader,executor,agency,client).
// Administração sempre enxerga. Nível antigo continua valendo: "agency" = administração + líder + quem executa + agência.
export type VisibilityValue = string;
const levelsUpTo = (v: Visibility): Visibility[] => VISIBILITY_LEVELS.filter((l) => RANK[l] <= RANK[v]);
export function expandVisibility(v: string | null | undefined): Set<Visibility> {
  const raw = String(v ?? "client").trim();
  if ((VISIBILITY_LEVELS as readonly string[]).includes(raw)) return new Set(levelsUpTo(raw as Visibility));
  const tokens = raw.split(",").map((t) => t.trim()).filter((t): t is Visibility => (VISIBILITY_LEVELS as readonly string[]).includes(t));
  return new Set<Visibility>(["internal", ...tokens]);
}
export function isValidVisibilityValue(v: unknown): v is string {
  if (typeof v !== "string") return false;
  if ((VISIBILITY_LEVELS as readonly string[]).includes(v)) return true;
  const parts = v.split(",").map((t) => t.trim());
  return parts.length > 0 && parts.every((t) => (VISIBILITY_LEVELS as readonly string[]).includes(t)) && new Set(parts).size === parts.length;
}
/** Guarda do jeito mais simples: nível antigo quando a lista é exatamente "até um nível"; senão a lista ordenada (com administração). */
export function normalizeVisibilityValue(v: string): string {
  if ((VISIBILITY_LEVELS as readonly string[]).includes(v)) return v;
  const set = expandVisibility(v);
  for (const level of VISIBILITY_LEVELS) {
    const upTo = levelsUpTo(level);
    if (upTo.length === set.size && upTo.every((l) => set.has(l))) return level;
  }
  return VISIBILITY_LEVELS.filter((l) => set.has(l)).join(",");
}
export const visibilityValueSchema = z.string().refine(isValidVisibilityValue, "Visibilidade inválida: use um nível ou uma lista de perfis.").transform(normalizeVisibilityValue);
export function canSee(viewer: Visibility, fieldVisibility: string): boolean {
  return expandVisibility(fieldVisibility).has(viewer);
}

// ── Tarefa ────────────────────────────────────────────────────────────────
export const TASK_OPS_TEXT_FIELDS = ["objective", "instructions", "required_inputs", "expected_output", "acceptance_criteria", "risks_notes"] as const;
export type TaskOpsTextField = (typeof TASK_OPS_TEXT_FIELDS)[number];
export const TASK_OPS_LABEL: Record<TaskOpsTextField, string> = {
  objective: "Objetivo",
  instructions: "Instruções de execução",
  required_inputs: "Entradas necessárias",
  expected_output: "Saída / entregável esperado",
  acceptance_criteria: "Critério de aceite",
  risks_notes: "Riscos e observações",
};
export const TASK_OPS_DEFAULT_VISIBILITY: Record<TaskOpsTextField, Visibility> = {
  objective: "client",
  instructions: "executor",
  required_inputs: "client",
  expected_output: "client",
  acceptance_criteria: "client",
  risks_notes: "leader",
};
const TASK_TEXT_MAX: Record<TaskOpsTextField, number> = { objective: 4000, instructions: 8000, required_inputs: 4000, expected_output: 4000, acceptance_criteria: 4000, risks_notes: 4000 };

export interface TaskOps {
  objective?: string;
  instructions?: string;
  required_inputs?: string;
  expected_output?: string;
  acceptance_criteria?: string;
  risks_notes?: string;
  visibility?: Partial<Record<TaskOpsTextField, string>>;
}

// ── Etapa ─────────────────────────────────────────────────────────────────
export const STEP_OPS_TEXT_FIELDS = ["instructions", "evidence_hint"] as const;
export type StepOpsTextField = (typeof STEP_OPS_TEXT_FIELDS)[number];
export const STEP_OPS_LABEL: Record<StepOpsTextField | "evidence_required" | "completion_criteria", string> = {
  instructions: "Instrução para o executor",
  evidence_hint: "Que evidência enviar",
  evidence_required: "Evidência obrigatória",
  completion_criteria: "Critério de conclusão",
};
export const STEP_OPS_DEFAULT_VISIBILITY: Record<StepOpsTextField | "completion_criteria", Visibility> = {
  instructions: "executor",
  evidence_hint: "executor",
  completion_criteria: "executor",
};
const STEP_TEXT_MAX: Record<StepOpsTextField, number> = { instructions: 8000, evidence_hint: 1000 };

/** Checklist da etapa (reunião 2026-10-05): itens de execução, de aprovação e de qualificação. */
export const CHECKLIST_KINDS = ["execucao", "aprovacao", "qualificacao"] as const;
export type ChecklistKind = (typeof CHECKLIST_KINDS)[number];
export interface ChecklistItem { id: string; text: string; kind: ChecklistKind; required: boolean }
export const CHECKLIST_MAX_ITEMS = 60;
export const CHECKLIST_TEXT_MAX = 300;

export const EVIDENCE_OWNERS = ["executor", "leader", "client"] as const;
export type EvidenceOwner = (typeof EVIDENCE_OWNERS)[number];
/** Que tipo de prova a etapa exige (pode marcar mais de um). Aparece para quem executa e facilita pedir a evidência certa. */
export const EVIDENCE_TYPES = ["print", "arquivo", "pdf", "relatorio", "link", "texto"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];
export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = { print: "Print da tela", arquivo: "Arquivo anexo", pdf: "PDF", relatorio: "Relatório", link: "Link", texto: "Texto / descrição" };

/** Aprovação do cliente na etapa (19/10): como a etapa é aprovada e o que fazer com ajustes/silêncio. Só vale em tarefa com execução por etapa. */
export const CLIENT_APPROVAL_MODES = ["none", "step", "deliverables", "awareness"] as const;
export type ClientApprovalMode = (typeof CLIENT_APPROVAL_MODES)[number];
export const CLIENT_SILENCE_ACTIONS = ["wait", "remind", "escalate"] as const;
export const CLIENT_SILENCE_STEPS = ["remind", "escalate"] as const;
export const ADJUST_RECEIVERS = ["executor", "leader"] as const;
export interface ClientApprovalOps {
  mode: ClientApprovalMode;
  /** O que fazer quando o cliente não responde no prazo (registrado no cadastro; hoje o prazo é mostrado e acompanhado). */
  silence_action?: (typeof CLIENT_SILENCE_ACTIONS)[number];
  /** Várias ações ao mesmo tempo (lembrar o cliente E avisar o líder). Vazio = continuar aguardando. `silence_action` guarda a primeira, por compatibilidade. */
  silence_actions?: (typeof CLIENT_SILENCE_STEPS)[number][];
  adjust_receiver?: (typeof ADJUST_RECEIVERS)[number];
  adjustment_limit?: number;
}

/** Etapa em ciclos (23/10): a etapa dura vários períodos (ex.: gestão semanal por 30 dias). O cadastro lista CADA ciclo, com o seu período (dias
 * contados a partir do início da etapa) e as suas regras. Cada ciclo termina com entrega aprovada pelo cliente em prazo curto; o ciclo seguinte
 * começa na data certa com ou sem aprovação; reprovação vira orientação do ciclo seguinte (o anterior não reabre); a etapa fecha no último ciclo. */
export interface StepCycleItem {
  /** Primeiro dia do ciclo (1 = dia em que a etapa começa). */
  from_day: number;
  /** Último dia do ciclo (inclusive). */
  to_day: number;
  /** Quantos dias úteis o cliente tem para aprovar a entrega deste ciclo. */
  approval_window_days: number;
  /** Horas de trabalho previstas neste ciclo (opcional; informativo). */
  hours?: number;
  /** Regra/orientação própria deste ciclo (opcional). */
  rule?: string;
}
export interface StepCyclesOps { items: StepCycleItem[] }
export const STEP_CYCLES_MAX = 60;

/** Aceita o formato antigo (period_days/total_days/approval_window_days) gerando a lista de ciclos. Devolve null se algo estiver inválido. */
export function normalizeStepCycles(raw: unknown): StepCyclesOps | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  let list: unknown[] = [];
  if (Array.isArray(r.items)) list = r.items;
  else {
    const pd = Number(r.period_days), td = Number(r.total_days), aw = Number(r.approval_window_days);
    if (!(Number.isInteger(pd) && pd >= 1 && pd <= 90 && Number.isInteger(td) && td >= pd && td <= 366 && Number.isInteger(aw) && aw >= 1 && aw <= 30)) return null;
    for (let from = 1; from <= td && list.length < STEP_CYCLES_MAX; from += pd) list.push({ from_day: from, to_day: Math.min(from + pd - 1, td), approval_window_days: aw });
  }
  if (list.length === 0 || list.length > STEP_CYCLES_MAX) return null;
  const items: StepCycleItem[] = [];
  let prevTo = 0;
  for (const it of list) {
    if (!it || typeof it !== "object") return null;
    const x = it as Record<string, unknown>;
    const from = Number(x.from_day), to = Number(x.to_day), aw = Number(x.approval_window_days);
    if (!(Number.isInteger(from) && Number.isInteger(to) && Number.isInteger(aw))) return null;
    if (from < 1 || to < from || to > 366 || from <= prevTo || aw < 1 || aw > 30) return null;
    const item: StepCycleItem = { from_day: from, to_day: to, approval_window_days: aw };
    if (x.hours != null && x.hours !== "") {
      const h = Number(x.hours);
      if (!(Number.isFinite(h) && h >= 0 && h <= 1000)) return null;
      if (h > 0) item.hours = Math.round(h * 100) / 100;
    }
    const rule = typeof x.rule === "string" ? x.rule.trim().slice(0, 500) : "";
    if (rule) item.rule = rule;
    items.push(item);
    prevTo = to;
  }
  return { items };
}

export interface StepOps {
  /** Etapa em ciclos (ver StepCyclesOps). Ausente = etapa comum. */
  cycles?: StepCyclesOps;
  /** A etapa foi declarada SEM entregáveis (19/10). Ausente = não declarado (vale o que estiver ligado à etapa). */
  no_deliverables?: boolean;
  /** Aprovação do cliente (explícita). Ausente = comportamento anterior (etapa visível ao cliente é aprovada por ele). */
  client_approval?: ClientApprovalOps;
  checklist?: ChecklistItem[];
  /** Quem envia/confere a evidência da etapa (padrão: o executor). */
  evidence_owner?: EvidenceOwner;
  instructions?: string;
  /** A etapa só conclui depois de anexar uma evidência (usa o mesmo bloqueio já existente de "exige anexo"). */
  evidence_required?: boolean;
  evidence_hint?: string;
  /** Prompt/instrução específica para a IA executar ESTA etapa (só vale quando o executor é IA ou "humano ou IA"). Nunca aparece para o cliente. */
  ai_prompt?: string;
  /** "Humano ou IA": quem qualifica quando a IA executa (a opção IA SEMPRE é qualificada; a da opção humana fica nas colunas da etapa). */
  ai_qualifier_kind?: "leader" | "person" | "leader_person" | "nomad_pool";
  ai_qualifier_user_id?: string;
  /** Tipos de prova aceitos (print, PDF, relatório…). Só vale com evidence_required. */
  evidence_types?: EvidenceType[];
  /** P-12 (08/10): quais acessos do produto esta etapa usa. Ausente = padrão (a etapa de validação de acessos usa todos; as demais, nenhum). */
  access_scope?: "all" | "some";
  /** Chaves das exigências de conexão escolhidas (quando access_scope = "some"). */
  access_keys?: string[];
  /**
   * Acessos GUARDADOS quando a etapa foi desligada em "Esta etapa precisa de acesso": as exigências próprias (para recriar
   * ao ligar de novo) e as chaves dos acessos de outras etapas que ela usava. Nada disso vale em execução enquanto guardado.
   */
  access_parked?: { reqs: Record<string, unknown>[]; keys: string[] };
  visibility?: Partial<Record<StepOpsTextField | "completion_criteria", string>>;
}

// ── Validação (API) ───────────────────────────────────────────────────────
const visibilityEnum = visibilityValueSchema;
const text = (max: number) => z.string().max(max).nullish();
export const taskOpsSchema = z
  .object({
    objective: text(TASK_TEXT_MAX.objective),
    instructions: text(TASK_TEXT_MAX.instructions),
    required_inputs: text(TASK_TEXT_MAX.required_inputs),
    expected_output: text(TASK_TEXT_MAX.expected_output),
    acceptance_criteria: text(TASK_TEXT_MAX.acceptance_criteria),
    risks_notes: text(TASK_TEXT_MAX.risks_notes),
    visibility: z.record(z.string(), visibilityEnum).nullish(),
  })
  .strict()
  .nullish();
export const stepOpsSchema = z
  .object({
    checklist: z.array(z.object({ id: z.string().max(40).nullish(), text: z.string().max(CHECKLIST_TEXT_MAX), kind: z.enum(CHECKLIST_KINDS).nullish(), required: z.boolean().nullish() })).max(CHECKLIST_MAX_ITEMS).nullish(),
    evidence_owner: z.enum(EVIDENCE_OWNERS).nullish(),
    instructions: text(STEP_TEXT_MAX.instructions),
    evidence_required: z.boolean().nullish(),
    evidence_hint: text(STEP_TEXT_MAX.evidence_hint),
    ai_prompt: text(8000),
    ai_qualifier_kind: z.enum(["leader", "person", "leader_person", "nomad_pool"]).nullish(),
    ai_qualifier_user_id: z.string().max(60).nullish(),
    evidence_types: z.array(z.enum(EVIDENCE_TYPES)).max(EVIDENCE_TYPES.length).nullish(),
    no_deliverables: z.boolean().nullish(),
    // Etapa em ciclos: recusa configuração inválida (ciclos sobrepostos, prazo 0…) em vez de descartar em silêncio.
    cycles: z.unknown().refine((v) => v == null || normalizeStepCycles(v) !== null, "Ciclos inválidos: confira os períodos (sem sobreposição) e o prazo de aprovação de 1 a 30 dias úteis.").nullish(),
    client_approval: z.object({ mode: z.enum(CLIENT_APPROVAL_MODES), silence_action: z.enum(CLIENT_SILENCE_ACTIONS).nullish(), silence_actions: z.array(z.enum(CLIENT_SILENCE_STEPS)).max(2).nullish(), adjust_receiver: z.enum(ADJUST_RECEIVERS).nullish(), adjustment_limit: z.number().int().min(0).max(50).nullish() }).nullish(),
    access_scope: z.enum(["all", "some"]).nullish(),
    access_keys: z.array(z.string().max(60)).max(40).nullish(),
    access_parked: z.object({ reqs: z.array(z.record(z.string(), z.unknown())).max(40), keys: z.array(z.string().max(60)).max(40) }).nullish(),
    visibility: z.record(z.string(), visibilityEnum).nullish(),
  })
  .strict()
  .nullish();

function cleanVisibility<K extends string>(raw: unknown, allowed: readonly K[]): Partial<Record<K, string>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Partial<Record<K, string>> = {};
  for (const k of allowed) {
    const v = (raw as Record<string, unknown>)[k];
    if (isValidVisibilityValue(v)) out[k] = normalizeVisibilityValue(v);
  }
  return Object.keys(out).length ? out : undefined;
}

/** Normaliza o que veio da API/banco: tira espaços, descarta vazios e campos desconhecidos. Nulo se nada sobrar. */
export function normalizeTaskOps(raw: unknown): TaskOps | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: TaskOps = {};
  for (const f of TASK_OPS_TEXT_FIELDS) {
    const v = typeof r[f] === "string" ? (r[f] as string).trim() : "";
    if (v) out[f] = v.slice(0, TASK_TEXT_MAX[f]);
  }
  const vis = cleanVisibility(r.visibility, TASK_OPS_TEXT_FIELDS);
  if (vis) out.visibility = vis;
  return Object.keys(out).length ? out : null;
}
export function normalizeStepOps(raw: unknown): StepOps | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: StepOps = {};
  for (const f of STEP_OPS_TEXT_FIELDS) {
    const v = typeof r[f] === "string" ? (r[f] as string).trim() : "";
    if (v) out[f] = v.slice(0, STEP_TEXT_MAX[f]);
  }
  const aiPrompt = typeof r.ai_prompt === "string" ? r.ai_prompt.trim() : "";
  if (aiPrompt) out.ai_prompt = aiPrompt.slice(0, 8000);
  if (["leader", "person", "leader_person", "nomad_pool"].includes(r.ai_qualifier_kind as string)) {
    out.ai_qualifier_kind = r.ai_qualifier_kind as StepOps["ai_qualifier_kind"];
    const au = typeof r.ai_qualifier_user_id === "string" ? r.ai_qualifier_user_id.trim() : "";
    if (au && (out.ai_qualifier_kind === "person" || out.ai_qualifier_kind === "leader_person")) out.ai_qualifier_user_id = au.slice(0, 60);
  }
  if (r.evidence_required === true) out.evidence_required = true;
  if (r.evidence_required === true && Array.isArray(r.evidence_types)) {
    const types = EVIDENCE_TYPES.filter((t) => (r.evidence_types as unknown[]).includes(t));
    if (types.length) out.evidence_types = [...types];
  }
  if ((EVIDENCE_OWNERS as readonly string[]).includes(r.evidence_owner as string) && r.evidence_owner !== "executor") out.evidence_owner = r.evidence_owner as EvidenceOwner;
  if (Array.isArray(r.checklist)) {
    const seen = new Set<string>();
    const items: ChecklistItem[] = [];
    for (const raw of r.checklist.slice(0, CHECKLIST_MAX_ITEMS)) {
      if (!raw || typeof raw !== "object") continue;
      const it = raw as Record<string, unknown>;
      const t = typeof it.text === "string" ? it.text.trim().slice(0, CHECKLIST_TEXT_MAX) : "";
      if (!t) continue;
      let id = typeof it.id === "string" && it.id.trim() ? it.id.trim().slice(0, 40) : "";
      if (!id || seen.has(id)) id = `i${items.length + 1}-${Math.random().toString(36).slice(2, 7)}`;
      seen.add(id);
      const kind = (CHECKLIST_KINDS as readonly string[]).includes(it.kind as string) ? (it.kind as ChecklistKind) : "execucao";
      items.push({ id, text: t, kind, required: it.required !== false });
    }
    if (items.length) out.checklist = items;
  }
  if (r.no_deliverables === true) out.no_deliverables = true;
  const ca = r.client_approval as { mode?: unknown; silence_action?: unknown; silence_actions?: unknown; adjust_receiver?: unknown; adjustment_limit?: unknown } | undefined;
  if (ca && typeof ca === "object" && (CLIENT_APPROVAL_MODES as readonly string[]).includes(ca.mode as string)) {
    const o: ClientApprovalOps = { mode: ca.mode as ClientApprovalMode };
    if ((CLIENT_SILENCE_ACTIONS as readonly string[]).includes(ca.silence_action as string)) o.silence_action = ca.silence_action as ClientApprovalOps["silence_action"];
    if (Array.isArray(ca.silence_actions)) {
      const acts = (CLIENT_SILENCE_STEPS as readonly string[]).filter((k) => (ca.silence_actions as unknown[]).includes(k)) as ClientApprovalOps["silence_actions"];
      if (acts && acts.length) { o.silence_actions = acts; o.silence_action = acts[0]; }
    }
    if ((ADJUST_RECEIVERS as readonly string[]).includes(ca.adjust_receiver as string)) o.adjust_receiver = ca.adjust_receiver as ClientApprovalOps["adjust_receiver"];
    if (typeof ca.adjustment_limit === "number" && Number.isInteger(ca.adjustment_limit) && ca.adjustment_limit >= 0 && ca.adjustment_limit <= 50) o.adjustment_limit = ca.adjustment_limit;
    out.client_approval = o;
  }
  const cyc = normalizeStepCycles(r.cycles);
  if (cyc) out.cycles = cyc;
  if (r.access_scope === "all") out.access_scope = "all";
  if (r.access_scope === "some" && Array.isArray(r.access_keys)) {
    const keys = Array.from(new Set(r.access_keys.filter((k): k is string => typeof k === "string").map((k) => k.trim().slice(0, 60)).filter(Boolean))).slice(0, 40);
    out.access_scope = "some";
    out.access_keys = keys;
  }
  const parked = r.access_parked as { reqs?: unknown; keys?: unknown } | undefined;
  if (parked && typeof parked === "object") {
    const reqs = Array.isArray(parked.reqs) ? (parked.reqs.filter((x) => x && typeof x === "object" && !Array.isArray(x)).slice(0, 40) as Record<string, unknown>[]) : [];
    const keys = Array.isArray(parked.keys) ? Array.from(new Set(parked.keys.filter((k): k is string => typeof k === "string").map((k) => k.trim().slice(0, 60)).filter(Boolean))).slice(0, 40) : [];
    if (reqs.length || keys.length) out.access_parked = { reqs: JSON.parse(JSON.stringify(reqs)), keys };
  }
  const vis = cleanVisibility(r.visibility, [...STEP_OPS_TEXT_FIELDS, "completion_criteria"] as const);
  if (vis) out.visibility = vis;
  return Object.keys(out).length ? out : null;
}

/** Igualdade ignorando a ordem das chaves. */
export function opsEqual(a: unknown, b: unknown): boolean {
  const canon = (v: unknown): string => JSON.stringify(v ?? null, (_k, val) => (val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([x], [y]) => x.localeCompare(y))) : val));
  return canon(a) === canon(b);
}

// ── Filtro por perfil ─────────────────────────────────────────────────────
export interface VisibleGuideItem {
  key: string;
  label: string;
  value: string;
  visibility: string;
}
export function visibleTaskGuide(ops: TaskOps | null | undefined, viewer: Visibility, extra?: { description?: string | null }): VisibleGuideItem[] {
  const items: VisibleGuideItem[] = [];
  if (extra?.description?.trim()) items.push({ key: "description", label: "Descrição", value: extra.description.trim(), visibility: "client" });
  for (const f of TASK_OPS_TEXT_FIELDS) {
    const value = ops?.[f];
    if (!value) continue;
    const vis = ops?.visibility?.[f] ?? TASK_OPS_DEFAULT_VISIBILITY[f];
    if (canSee(viewer, vis)) items.push({ key: f, label: TASK_OPS_LABEL[f], value, visibility: vis });
  }
  return items;
}
/**
 * Checklist da etapa visível para quem está olhando (execução do projeto): o de EXECUÇÃO é de quem faz (executor, líder, equipe interna);
 * o de QUALIFICAÇÃO é de quem qualifica (líder, equipe interna); o de APROVAÇÃO é de quem aprova, e todos podem ver o que será conferido.
 */
export function visibleChecklist(ops: StepOps | null | undefined, viewer: Visibility): ChecklistItem[] {
  const all = ops?.checklist ?? [];
  const sees: Record<ChecklistKind, Visibility[]> = {
    execucao: ["internal", "leader", "executor"],
    qualificacao: ["internal", "leader"],
    aprovacao: ["internal", "leader", "executor", "agency", "client"],
  };
  return all.filter((c) => sees[c.kind ?? "execucao"]?.includes(viewer));
}
export function visibleStepGuide(ops: StepOps | null | undefined, viewer: Visibility, extra?: { description?: string | null; completion_criteria?: string | null }): { items: VisibleGuideItem[]; evidence_required: boolean } {
  const items: VisibleGuideItem[] = [];
  if (extra?.description?.trim()) items.push({ key: "description", label: "Descrição", value: extra.description.trim(), visibility: "client" });
  const push = (key: StepOpsTextField | "completion_criteria", label: string, value?: string | null) => {
    if (!value) return;
    const vis = ops?.visibility?.[key] ?? STEP_OPS_DEFAULT_VISIBILITY[key];
    if (canSee(viewer, vis)) items.push({ key, label, value, visibility: vis });
  };
  push("instructions", STEP_OPS_LABEL.instructions, ops?.instructions);
  push("completion_criteria", STEP_OPS_LABEL.completion_criteria, extra?.completion_criteria?.trim() || null);
  const typesText = ops?.evidence_types?.length ? `Tipo: ${ops.evidence_types.map((t) => EVIDENCE_TYPE_LABEL[t]).join(", ")}` : "";
  push("evidence_hint", STEP_OPS_LABEL.evidence_hint, [typesText, ops?.evidence_hint].filter(Boolean).join(" — ") || null);
  return { items, evidence_required: !!ops?.evidence_required };
}
