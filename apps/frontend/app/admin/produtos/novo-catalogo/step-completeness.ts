// O que falta para uma etapa estar COMPLETA ("Concluir e salvar etapa"). Puro, sem tela: a tela usa a lista para abrir o bloco certo,
// rolar até o campo, destacar e explicar. "Salvar rascunho da etapa" nunca consulta isto (rascunho aceita tudo incompleto).
// As regras são as mesmas que o servidor já cobra na publicação (nome, especialidade e horas, líder/especialista escolhidos).
// 19/10: 6 blocos (5 = Entregáveis desta etapa, 6 = Conexões e acessos) e status REAL por bloco (com a quantidade de pendências).

export type StepBlockId = 1 | 2 | 3 | 4 | 5 | 6;
export interface StepIssue { block: StepBlockId; field: string; message: string }
/** "na" = Não se aplica (bloco corretamente desativado). */
export type BlockStatus = "complete" | "incomplete" | "error" | "optional" | "na";

export const BLOCK_IDS: StepBlockId[] = [1, 2, 3, 4, 5, 6];
export const STEP_BLOCKS: { id: StepBlockId; title: string }[] = [
  { id: 1, title: "O que é esta etapa" },
  { id: 2, title: "Quem faz e quanto tempo leva" },
  { id: 3, title: "Quando a etapa termina" },
  { id: 4, title: "Checklist, orientações e evidência" },
  { id: 5, title: "Entregáveis desta etapa" },
  { id: 6, title: "Conexões e acessos desta etapa" },
];

export interface StepFormLike {
  name: string; description: string; execution_mode: string; specialty_id: string; estimated_hours: string;
  ai_specialty_id: string; ai_estimated_hours: string; completion_criteria: string;
  executor_kind: string; leader_mode: string; leader_user_id: string;
  qual_on: boolean; qualifier_kind: string; specialist_user_id: string;
  approval_hours: string; rework_hours: string; executor_accept_hours: string; ai_free_changes: string;
  internal_step?: boolean;
  ops?: any;
}
export interface StepIssueCtx {
  /** Especialidade padrão da tarefa (vale quando a etapa não tem a sua). */
  taskSpecialtyId?: string | null;
  /** A tarefa executa por etapa (aparecem os prazos de aprovação/refação/IA grátis). */
  stageExecution?: boolean;
  /** O prazo de aceite do preferido só aparece quando a etapa usa o mesmo executor da outra. */
  acceptHoursApplies?: boolean;
  /** Mensagens dos entregáveis (já com o nome do entregável), vindas do editor de entregáveis. */
  deliverableIssues?: { field: string; message: string }[];
  /** Quantos entregáveis ativos da etapa exigem aprovação do cliente (para a aprovação "por entregável"). */
  approvableDeliverables?: number;
  /** Quantos entregáveis desta etapa estão marcados para aprovação — inclusive quando a configuração é incompatível. */
  approvalDeliverables?: number;
  /** Mensagens de acesso (já com o nome do acesso), vindas do editor de acessos. */
  accessIssues?: { field: string; message: string }[];
}

const hoursOf = (v: string): number | null | "bad" => { const t = String(v ?? "").trim(); if (t === "") return null; const n = Number(t); return Number.isInteger(n) && n >= 1 ? n : "bad"; };
const positive = (v: string) => v.trim() !== "" && Number(v) > 0;

export function stepIssues(f: StepFormLike, ctx: StepIssueCtx = {}): StepIssue[] {
  const out: StepIssue[] = [];
  const push = (block: StepBlockId, field: string, message: string) => out.push({ block, field, message });
  // 1 · O que é esta etapa
  if (!f.name.trim()) push(1, "name", "Informe o nome da etapa.");
  if (!f.description.trim()) push(1, "description", "Descreva o que acontece nesta etapa.");
  // 2 · Quem faz e quanto tempo leva
  if (f.execution_mode === "hibrido") {
    if (!(f.specialty_id || ctx.taskSpecialtyId)) push(2, "specialty", "Escolha a especialidade da opção humana.");
    if (!positive(f.estimated_hours)) push(2, "hours", "Informe as horas estimadas da opção humana.");
    if (!f.ai_specialty_id) push(2, "ai_specialty", "Escolha a especialidade da opção IA.");
    if (!positive(f.ai_estimated_hours)) push(2, "ai_hours", "Informe as horas estimadas da opção IA.");
  } else {
    if (!(f.specialty_id || ctx.taskSpecialtyId)) push(2, "specialty", "Escolha a especialidade da etapa.");
    if (!positive(f.estimated_hours)) push(2, "hours", "Informe as horas estimadas (maior que zero).");
  }
  if (f.executor_kind === "leader" && f.leader_mode === "specific" && !f.leader_user_id) push(2, "leader", "Escolha qual líder recebe a etapa (ou deixe “Qualquer líder da área”).");
  // 3 · Quando a etapa termina
  if (!f.completion_criteria.trim()) push(3, "completion_criteria", "Informe o critério de conclusão (quando a etapa pode ser considerada concluída).");
  const qualOn = f.execution_mode === "ia" ? true : !!f.qual_on;
  if (qualOn && (f.qualifier_kind === "person" || f.qualifier_kind === "leader_person") && !f.specialist_user_id) push(3, "qualifier_person", "Escolha a pessoa que qualifica a etapa.");
  if (f.execution_mode === "hibrido" && (f.ops?.ai_qualifier_kind === "person" || f.ops?.ai_qualifier_kind === "leader_person") && !f.ops?.ai_qualifier_user_id) push(3, "ai_qualifier_person", "Escolha a pessoa que qualifica quando a IA executa.");
  if (ctx.stageExecution) {
    if (hoursOf(f.approval_hours) === "bad") push(3, "approval_hours", "Prazo de aprovação: use um número inteiro a partir de 1 (ou deixe vazio).");
    if (hoursOf(f.rework_hours) === "bad") push(3, "rework_hours", "Prazo de refação: use um número inteiro a partir de 1 (ou deixe vazio).");
    if (ctx.acceptHoursApplies && hoursOf(f.executor_accept_hours) === "bad") push(3, "accept_hours", "Prazo de aceite do preferido: use um número inteiro a partir de 1 (ou deixe vazio).");
    const ai = f.ai_free_changes.trim();
    if (ai !== "" && !(/^\d+$/.test(ai) && Number(ai) <= 100)) push(3, "ai_free_changes", "Alterações por IA grátis: use um número inteiro de 0 a 100 (ou deixe vazio).");
    const ca = f.ops?.client_approval;
    const approvalCount = ctx.approvalDeliverables ?? ctx.approvableDeliverables ?? 0;
    if (!f.internal_step && ca?.mode === "deliverables" && approvalCount === 0) push(3, "approval_deliverables", "A aprovação é por entregável, mas nenhum entregável desta etapa exige aprovação do cliente. Marque “Exige aprovação” em ao menos um (bloco Entregáveis desta etapa) ou escolha outra opção.");
    if (!f.internal_step && ca?.mode && ca.mode !== "deliverables" && approvalCount > 0) push(3, "approval_deliverables_conflict", "Há entregável(is) marcado(s) para aprovação, mas a etapa não usa aprovação por entregável. Desative essa aprovação nos entregáveis ou escolha “Sim, por um ou mais entregáveis”.");
    if (ca && f.internal_step && ca.mode !== "none") push(3, "approval_mode", "A etapa é interna (o cliente não a vê), então a aprovação do cliente não se aplica. Escolha “Não” ou desmarque “Etapa interna”.");
  }
  // 5 · Entregáveis desta etapa
  for (const d of ctx.deliverableIssues ?? []) push(5, d.field, d.message);
  // 6 · Conexões e acessos
  for (const a of ctx.accessIssues ?? []) push(6, a.field, a.message);
  return out;
}

export interface BlockInfo { status: BlockStatus; count: number }
/**
 * Situação real do bloco: "complete" = todos os obrigatórios válidos; "incomplete" = N pendências; "error" = pendências depois de tentar concluir;
 * "na" = corretamente desativado (não se aplica); "optional" = nada configurado e nada exigido.
 */
export function blockInfo(block: StepBlockId, issues: StepIssue[], showErrors: boolean, o: { applies?: boolean; hasContent?: boolean } = {}): BlockInfo {
  if (o.applies === false) return { status: "na", count: 0 };
  const count = issues.filter((i) => i.block === block).length;
  if (count) return { status: showErrors ? "error" : "incomplete", count };
  if (o.hasContent === false) return { status: "optional", count: 0 };
  return { status: "complete", count: 0 };
}
/** Compatibilidade com quem só precisa do status. */
export function blockStatus(block: StepBlockId, issues: StepIssue[], showErrors: boolean, hasContent: boolean): BlockStatus {
  return blockInfo(block, issues, showErrors, { hasContent }).status;
}

export const STATUS_LABEL: Record<BlockStatus, string> = { complete: "Completo", incomplete: "Incompleto", error: "Com erro", optional: "Opcional", na: "Não se aplica" };

/** Menor bloco que tem erro (para abrir e rolar até ele). */
export function firstIssue(issues: StepIssue[]): StepIssue | null {
  return [...issues].sort((a, b) => a.block - b.block)[0] ?? null;
}
