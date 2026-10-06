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
export function canSee(viewer: Visibility, fieldVisibility: Visibility): boolean {
  return RANK[viewer] <= RANK[fieldVisibility];
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
  visibility?: Partial<Record<TaskOpsTextField, Visibility>>;
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

export interface StepOps {
  checklist?: ChecklistItem[];
  /** Quem envia/confere a evidência da etapa (padrão: o executor). */
  evidence_owner?: EvidenceOwner;
  instructions?: string;
  /** A etapa só conclui depois de anexar uma evidência (usa o mesmo bloqueio já existente de "exige anexo"). */
  evidence_required?: boolean;
  evidence_hint?: string;
  visibility?: Partial<Record<StepOpsTextField | "completion_criteria", Visibility>>;
}

// ── Validação (API) ───────────────────────────────────────────────────────
const visibilityEnum = z.enum(VISIBILITY_LEVELS);
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
    visibility: z.record(z.string(), visibilityEnum).nullish(),
  })
  .strict()
  .nullish();

function cleanVisibility<K extends string>(raw: unknown, allowed: readonly K[]): Partial<Record<K, Visibility>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Partial<Record<K, Visibility>> = {};
  for (const k of allowed) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && (VISIBILITY_LEVELS as readonly string[]).includes(v)) out[k] = v as Visibility;
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
  if (r.evidence_required === true) out.evidence_required = true;
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
  visibility: Visibility;
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
  push("evidence_hint", STEP_OPS_LABEL.evidence_hint, ops?.evidence_hint);
  return { items, evidence_required: !!ops?.evidence_required };
}
