// PORTÃO DE APROVAÇÃO COMO FLUXO (2026-10-02) — universal e opcional.
//
// Até aqui a aprovação do cliente era só o ESTADO FINAL da tarefa. Um portão é uma aprovação no MEIO do fluxo:
//   before_step     precisa estar aprovado para a etapa ÂNCORA poder começar;
//   after_step      depois que a etapa âncora termina, a PRÓXIMA etapa só começa com a aprovação (se for a última, segura a entrega);
//   before_publish  igual a before_step, rotulado como "antes de publicar" (a etapa âncora é a que publica);
//   before_deliver  a tarefa só segue para qualificação/aprovação final depois dele.
// Quem aprova: client (cliente/agência dona do projeto), internal (administração/líder) ou leader (líder da tarefa).
// Vários portões podem formar um grupo: "sequence" (um depois do outro, por sequence_no) ou "parallel" (todos ao mesmo tempo).
// Reprovar devolve a tarefa para a etapa configurada (ou a padrão), reabre as seguintes e registra motivo e rodada.
//
// Produto sem portões: nada muda (nenhuma linha é criada, nenhuma etapa espera).
import type { Prisma, PrismaClient } from "@prisma/client";
import { logProjectDecision } from "./catalog2-cycles";

type Db = PrismaClient | Prisma.TransactionClient;

export const GATE_POSITIONS = ["before_step", "after_step", "before_publish", "before_deliver"] as const;
export type GatePosition = (typeof GATE_POSITIONS)[number];
export const GATE_POSITION_LABEL: Record<GatePosition, string> = {
  before_step: "Antes de iniciar a etapa",
  after_step: "Depois de concluir a etapa",
  before_publish: "Antes de publicar",
  before_deliver: "Antes de entregar a tarefa",
};
export const APPROVER_KINDS = ["client", "internal", "leader"] as const;
export type ApproverKind = (typeof APPROVER_KINDS)[number];
export const APPROVER_KIND_LABEL: Record<ApproverKind, string> = { client: "Cliente", internal: "Aprovação interna", leader: "Líder" };
export const GROUP_MODES = ["sequence", "parallel"] as const;
export const GATE_STATUS = { PENDENTE: "pendente", APROVADA: "aprovada", REPROVADA: "reprovada", DISPENSADA: "dispensada" } as const;
export const STAGE_WAITING_APPROVAL = "AGUARDANDO_APROVACAO";

export class ApprovalGateError extends Error {
  constructor(message: string, public httpStatus = 409, public code = "approval_gate") { super(message); }
}

interface GateRow {
  id: string; project_id: string; project_task_id: string; gate_key: string; name: string; position: string; approver_kind: string;
  group_key: string | null; sequence_no: number; group_mode: string; anchor_stage_key: string | null; return_stage_key: string | null;
  requires_comment: boolean; is_required: boolean; status: string; round: number;
}

const settled = (s: string) => s === GATE_STATUS.APROVADA || s === GATE_STATUS.DISPENSADA;

/** Cria os portões de cada tarefa gerada (idempotente). Só age em versões que têm portões configurados. */
export async function materializeApprovalGates(db: Db, projectId: string, projectProductIds: string[]): Promise<number> {
  let created = 0;
  const tasks = await db.projectTask.findMany({
    where: { project_id: projectId, project_product_id: { in: projectProductIds }, catalog2_task_id: { not: null }, catalog2_version_id: { not: null } },
    select: { id: true, catalog2_version_id: true, catalog2_task: { select: { key: true } } },
  });
  if (tasks.length === 0) return 0;
  const versionIds = [...new Set(tasks.map((t) => t.catalog2_version_id!))];
  const gates = await db.catalog2ApprovalGate.findMany({ where: { version_id: { in: versionIds }, is_active: true }, orderBy: [{ sort_order: "asc" }, { sequence_no: "asc" }] });
  if (gates.length === 0) return 0;
  for (const t of tasks) {
    for (const g of gates.filter((x) => x.version_id === t.catalog2_version_id && x.anchor_task_key === t.catalog2_task?.key)) {
      const exists = await db.projectApprovalGate.findUnique({ where: { project_task_id_gate_key: { project_task_id: t.id, gate_key: g.key } }, select: { id: true } });
      if (exists) continue;
      await db.projectApprovalGate.create({
        data: {
          project_id: projectId, project_task_id: t.id, source_gate_id: g.id, gate_key: g.key, name: g.name, position: g.position, approver_kind: g.approver_kind,
          group_key: g.group_key, sequence_no: g.sequence_no, group_mode: g.group_mode, anchor_stage_key: g.anchor_step_key, return_stage_key: g.rejection_return_step_key,
          requires_comment: g.requires_comment, is_required: g.is_required,
        },
      });
      created++;
    }
  }
  return created;
}

async function stageStepKeys(db: Db, taskId: string) {
  const stages = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: [{ ordem: "asc" }, { created_at: "asc" }], select: { id: true, ordem: true, status: true, catalog_step_ref: true, titulo: true, nomade_id: true, manter_mesmo_nomade: true } });
  const ids = stages.map((s) => s.catalog_step_ref).filter((x): x is string => !!x);
  const steps = ids.length ? await db.catalog2TaskStep.findMany({ where: { id: { in: ids } }, select: { id: true, key: true } }) : [];
  const keyById = new Map(steps.map((s) => [s.id, s.key]));
  return stages.map((s) => ({ ...s, step_key: s.catalog_step_ref ? keyById.get(s.catalog_step_ref) ?? null : null }));
}

/** O portão está liberado para decisão? Em grupo "sequence", só depois dos anteriores (menor sequence_no) terem sido aprovados. */
export function isActionable(g: GateRow, all: GateRow[]): boolean {
  if (settled(g.status)) return false;
  if (!g.group_key || g.group_mode !== "sequence") return true;
  return all.filter((x) => x.group_key === g.group_key && x.sequence_no < g.sequence_no && x.is_required).every((x) => settled(x.status));
}

export async function gatesOfTask(db: Db, taskId: string): Promise<GateRow[]> {
  return db.projectApprovalGate.findMany({ where: { project_task_id: taskId }, orderBy: [{ group_key: "asc" }, { sequence_no: "asc" }, { created_at: "asc" }] });
}

/** Portões obrigatórios ainda NÃO aprovados que impedem a etapa de começar. */
export async function unmetGatesForStageStart(db: Db, stage: { project_task_id: string; catalog_step_ref: string | null }): Promise<GateRow[]> {
  const gates = await gatesOfTask(db, stage.project_task_id);
  if (gates.length === 0) return [];
  const stages = await stageStepKeys(db, stage.project_task_id);
  const idx = stages.findIndex((s) => s.catalog_step_ref === stage.catalog_step_ref);
  if (idx < 0) return [];
  const thisKey = stages[idx].step_key;
  const prevKey = idx > 0 ? stages[idx - 1].step_key : null;
  return gates.filter((g) => g.is_required && !settled(g.status) && (
    ((g.position === "before_step" || g.position === "before_publish") && !!thisKey && g.anchor_stage_key === thisKey) ||
    (g.position === "after_step" && !!prevKey && g.anchor_stage_key === prevKey)
  ));
}

/** Portões que seguram a ENTREGA da tarefa (before_deliver, ou after_step da última etapa). */
export async function unmetDeliveryGates(db: Db, taskId: string): Promise<GateRow[]> {
  const gates = await gatesOfTask(db, taskId);
  if (gates.length === 0) return [];
  const stages = await stageStepKeys(db, taskId);
  const lastKey = stages.length ? stages[stages.length - 1].step_key : null;
  return gates.filter((g) => g.is_required && !settled(g.status) && (g.position === "before_deliver" || (g.position === "after_step" && !!lastKey && g.anchor_stage_key === lastKey)));
}

/** Resumo para as telas: cada portão com o estado e se já pode ser decidido. */
export async function gateView(db: Db, taskId: string) {
  const gates = await gatesOfTask(db, taskId);
  const events = gates.length ? await db.projectApprovalGateEvent.findMany({ where: { gate_id: { in: gates.map((g) => g.id) } }, orderBy: { created_at: "asc" } }) : [];
  return gates.map((g) => ({
    id: g.id, key: g.gate_key, name: g.name, position: g.position, position_label: GATE_POSITION_LABEL[g.position as GatePosition] ?? g.position,
    approver_kind: g.approver_kind, approver_label: APPROVER_KIND_LABEL[g.approver_kind as ApproverKind] ?? g.approver_kind,
    group_key: g.group_key, sequence_no: g.sequence_no, group_mode: g.group_mode, anchor_stage_key: g.anchor_stage_key, return_stage_key: g.return_stage_key,
    requires_comment: g.requires_comment, is_required: g.is_required, status: g.status, round: g.round, actionable: isActionable(g, gates),
    history: events.filter((e) => e.gate_id === g.id).map((e) => ({ round: e.round, decision: e.decision, actor_user_id: e.actor_user_id, comment: e.comment, returned_to_stage_key: e.returned_to_stage_key, at: e.created_at })),
  }));
}

/** Quem pode decidir o portão? */
export interface Decider { id: string; kind: "admin" | "leader" | "company" | "agency" | "nomad" | "other"; isTaskLeader?: boolean }
export function canDecide(g: { approver_kind: string }, d: Decider): { ok: boolean; onBehalf: boolean } {
  if (g.approver_kind === "client") {
    if (d.kind === "company" || d.kind === "agency") return { ok: true, onBehalf: false };
    if (d.kind === "admin") return { ok: true, onBehalf: true };
    return { ok: false, onBehalf: false };
  }
  if (g.approver_kind === "leader") return d.kind === "admin" || (d.kind === "leader" && d.isTaskLeader !== false) ? { ok: true, onBehalf: false } : { ok: false, onBehalf: false };
  // internal
  return d.kind === "admin" || d.kind === "leader" ? { ok: true, onBehalf: false } : { ok: false, onBehalf: false };
}

async function notify(db: Db, userIds: (string | null | undefined)[], a: { title: string; message: string; taskId: string }) {
  for (const uid of [...new Set(userIds.filter((x): x is string => !!x))]) {
    try {
      await db.systemAlert.create({ data: { type: "approval_gate", title: a.title, message: a.message, severity: "warning", category: "alerta", entity_type: "project_task", entity_id: a.taskId, user_id: uid, action_url: "/tarefas" } });
    } catch { /* aviso é acessório */ }
  }
}

/** Avisa quem precisa aprovar (cliente: usuários do dono do projeto; interno/líder: o líder da tarefa). */
export async function notifyApprovers(db: Db, taskId: string, gates: GateRow[]) {
  if (gates.length === 0) return;
  const t = await db.projectTask.findUnique({ where: { id: taskId }, select: { title: true, lider_responsavel_id: true, project_id: true } });
  if (!t) return;
  for (const g of gates) {
    let users: (string | null)[] = [];
    if (g.approver_kind === "client") {
      const { clientUsersOfProject } = await import("./connections/core");
      users = await clientUsersOfProject(db, t.project_id);
    } else users = [t.lider_responsavel_id];
    await notify(db, users, { title: `Aprovação necessária: ${g.name}`, message: `A tarefa "${t.title}" aguarda sua aprovação para continuar.`, taskId });
  }
}

/** Reavalia as etapas que esperavam aprovação e abre as que foram liberadas. Também libera a entrega segurada. */
export async function releaseAfterGate(db: Db, taskId: string): Promise<{ opened: number }> {
  const { abrirEtapa } = await import("./stage-engine");
  const stages = await stageStepKeys(db, taskId);
  let opened = 0;
  for (const [i, s] of stages.entries()) {
    if (s.status !== STAGE_WAITING_APPROVAL) continue;
    const unmet = await unmetGatesForStageStart(db, { project_task_id: taskId, catalog_step_ref: s.catalog_step_ref });
    if (unmet.length > 0) continue;
    const prev = i > 0 ? stages[i - 1] : null;
    await abrirEtapa(db, s.id, { nomadeAnterior: prev?.nomade_id ?? null, herdarNomade: prev?.manter_mesmo_nomade ?? false });
    opened++;
  }
  // Nenhuma espera de aprovação sobrando: o SLA da parte dependente volta a contar.
  const waitingLeft = (await stageStepKeys(db, taskId)).some((s) => s.status === STAGE_WAITING_APPROVAL) || (await unmetDeliveryGates(db, taskId)).length > 0;
  if (!waitingLeft) { try { await (await import("./sla")).resumeTaskClocks(db, taskId, null, "aprovacao_pendente"); } catch { /* SLA é acessório */ } }
  try {
    const { kickDependenciesForTask } = await import("./project-dependencies");
    kickDependenciesForTask(taskId);
  } catch { /* reavaliação é acessória */ }
  return { opened };
}

/** Resolve para qual etapa devolver quando um portão é reprovado (configurada → padrão do tipo de portão). */
async function resolveReturnStage(db: Db, g: GateRow): Promise<{ stageId: string; key: string | null } | null> {
  const stages = await stageStepKeys(db, g.project_task_id);
  if (stages.length === 0) return null;
  const byKey = (k: string | null) => (k ? stages.find((s) => s.step_key === k) ?? null : null);
  let target = byKey(g.return_stage_key);
  if (!target) {
    const anchor = byKey(g.anchor_stage_key);
    const anchorIdx = anchor ? stages.indexOf(anchor) : -1;
    if (g.position === "after_step") target = anchor;
    else if (g.position === "before_deliver") target = stages[stages.length - 1];
    else target = anchorIdx > 0 ? stages[anchorIdx - 1] : anchor; // antes de iniciar/publicar: volta à etapa anterior
  }
  return target ? { stageId: target.id, key: target.step_key } : null;
}

/** Decide um portão. Aprovar libera o fluxo; reprovar devolve a tarefa à etapa configurada, com motivo e rodada. */
export async function decideGate(db: Db, gateId: string, decider: Decider, input: { decision: "approve" | "reject"; comment?: string | null; onBehalf?: boolean }) {
  const g = await db.projectApprovalGate.findUnique({ where: { id: gateId } });
  if (!g) throw new ApprovalGateError("Portão de aprovação não encontrado.", 404, "gate_not_found");
  const perm = canDecide(g, decider);
  if (!perm.ok) throw new ApprovalGateError("Você não pode decidir este portão de aprovação.", 403, "gate_forbidden");
  if (perm.onBehalf && !(input.comment && input.comment.trim().length >= 5)) throw new ApprovalGateError("Para aprovar pelo cliente, a administração precisa registrar o motivo (mínimo de 5 caracteres).", 422, "gate_on_behalf_comment");
  const all = await gatesOfTask(db, g.project_task_id);
  if (settled(g.status)) throw new ApprovalGateError("Este portão já foi aprovado.", 409, "gate_already_settled");
  if (g.status === GATE_STATUS.REPROVADA) throw new ApprovalGateError("Este portão foi reprovado e aguarda a correção antes de nova decisão.", 409, "gate_rejected_pending_fix");
  if (!isActionable(g, all)) throw new ApprovalGateError("Este portão só pode ser decidido depois dos anteriores do mesmo grupo (aprovação em sequência).", 409, "gate_not_actionable");
  const comment = input.comment?.trim() || null;
  if (input.decision === "reject" && !comment) throw new ApprovalGateError("Informe o motivo da reprovação.", 422, "gate_comment_required");
  if (input.decision === "approve" && g.requires_comment && !comment) throw new ApprovalGateError("Este portão exige um comentário na aprovação.", 422, "gate_comment_required");
  const now = new Date();

  if (input.decision === "approve") {
    await db.projectApprovalGate.update({ where: { id: g.id }, data: { status: GATE_STATUS.APROVADA, decided_by: decider.id, decided_at: now, comment } });
    await db.projectApprovalGateEvent.create({ data: { gate_id: g.id, round: g.round, decision: "aprovada", actor_user_id: decider.id, comment } });
    await logProjectDecision(db, { projectId: g.project_id, projectTaskId: g.project_task_id, kind: "approval_gate_approved", message: `Portão "${g.name}" aprovado${perm.onBehalf ? " pela administração em nome do cliente" : ""}.` });
    const rel = await releaseAfterGate(db, g.project_task_id);
    return { status: GATE_STATUS.APROVADA, opened_stages: rel.opened, returned_to: null as string | null };
  }

  // reprovar: devolve à etapa configurada e reabre as seguintes
  const back = await resolveReturnStage(db, g);
  await db.projectApprovalGate.update({ where: { id: g.id }, data: { status: GATE_STATUS.REPROVADA, decided_by: decider.id, decided_at: now, comment } });
  await db.projectApprovalGateEvent.create({ data: { gate_id: g.id, round: g.round, decision: "reprovada", actor_user_id: decider.id, comment, returned_to_stage_key: back?.key ?? null } });
  if (back) {
    const stages = await stageStepKeys(db, g.project_task_id);
    const from = stages.findIndex((s) => s.id === back.stageId);
    for (const [i, s] of stages.entries()) {
      if (i < from) continue;
      if (i === from) await db.projectTaskStage.update({ where: { id: s.id }, data: { status: "PENDENTE", concluida_em: null, concluida_por: null } });
      else await db.projectTaskStage.update({ where: { id: s.id }, data: { status: "BLOQUEADA", concluida_em: null, concluida_por: null, iniciada_em: null } });
    }
    const { abrirEtapa } = await import("./stage-engine");
    const prev = from > 0 ? stages[from - 1] : null;
    await abrirEtapa(db, back.stageId, { nomadeAnterior: prev?.nomade_id ?? null, herdarNomade: prev?.manter_mesmo_nomade ?? false });
  }
  await db.projectTask.update({ where: { id: g.project_task_id }, data: { status: "EM_AJUSTES" } });
  await logProjectDecision(db, { projectId: g.project_id, projectTaskId: g.project_task_id, kind: "approval_gate_rejected", message: `Portão "${g.name}" reprovado: ${comment}${back?.key ? ` — tarefa devolvida à etapa "${back.key}"` : ""}.` });
  return { status: GATE_STATUS.REPROVADA, opened_stages: 0, returned_to: back?.key ?? null };
}

/** Depois que a etapa de retorno é concluída de novo, os portões reprovados voltam a ficar pendentes (nova rodada). */
export async function reopenRejectedGates(db: Db, taskId: string, finishedStepKey: string | null): Promise<void> {
  if (!finishedStepKey) return;
  const rejected = await db.projectApprovalGate.findMany({ where: { project_task_id: taskId, status: GATE_STATUS.REPROVADA } });
  for (const g of rejected) {
    const back = await resolveReturnStage(db, g);
    if (back?.key !== finishedStepKey) continue;
    await db.projectApprovalGate.update({ where: { id: g.id }, data: { status: GATE_STATUS.PENDENTE, round: g.round + 1, decided_by: null, decided_at: null } });
  }
}

/** Dispensa (administração) um portão obrigatório, com motivo. */
export async function dispenseGate(db: Db, gateId: string, actorId: string, reason: string) {
  const g = await db.projectApprovalGate.findUnique({ where: { id: gateId } });
  if (!g) throw new ApprovalGateError("Portão de aprovação não encontrado.", 404, "gate_not_found");
  if (!reason || reason.trim().length < 5) throw new ApprovalGateError("Informe o motivo da dispensa (mínimo de 5 caracteres).", 422, "gate_comment_required");
  await db.projectApprovalGate.update({ where: { id: g.id }, data: { status: GATE_STATUS.DISPENSADA, decided_by: actorId, decided_at: new Date(), comment: reason.trim() } });
  await db.projectApprovalGateEvent.create({ data: { gate_id: g.id, round: g.round, decision: "dispensada", actor_user_id: actorId, comment: reason.trim() } });
  await logProjectDecision(db, { projectId: g.project_id, projectTaskId: g.project_task_id, kind: "approval_gate_dispensed", message: `Portão "${g.name}" dispensado: ${reason.trim()}.` });
  await releaseAfterGate(db, g.project_task_id);
}

// ── Validação do cadastro (catálogo) ───────────────────────────────────────────────────────────────────
export interface GateInput { key?: string; name: string; description?: string | null; anchor_task_key: string; anchor_step_key?: string | null; position?: string; approver_kind?: string; group_key?: string | null; sequence_no?: number; group_mode?: string; rejection_return_step_key?: string | null; requires_comment?: boolean; is_required?: boolean; is_active?: boolean; sort_order?: number }

/** Confere o portão contra a estrutura real da versão. Devolve mensagens em português (vazio = ok). */
export async function validateGateInput(db: Db, versionId: string, g: GateInput): Promise<string | null> {
  if (g.position && !(GATE_POSITIONS as readonly string[]).includes(g.position)) return `Posição inválida: "${g.position}".`;
  if (g.approver_kind && !(APPROVER_KINDS as readonly string[]).includes(g.approver_kind)) return `Aprovador inválido: "${g.approver_kind}".`;
  if (g.group_mode && !(GROUP_MODES as readonly string[]).includes(g.group_mode)) return `Modo de grupo inválido: "${g.group_mode}".`;
  const task = await db.catalog2Task.findFirst({ where: { version_id: versionId, key: g.anchor_task_key }, include: { steps: { select: { key: true } } } });
  if (!task) return `A tarefa "${g.anchor_task_key}" do portão não existe nesta versão.`;
  const stepKeys = new Set(task.steps.map((s) => s.key));
  const position = g.position ?? "before_step";
  if ((position === "before_step" || position === "after_step" || position === "before_publish") && !g.anchor_step_key) return "Escolha a etapa em que o portão atua.";
  if (g.anchor_step_key && !stepKeys.has(g.anchor_step_key)) return `A etapa "${g.anchor_step_key}" não existe na tarefa "${g.anchor_task_key}".`;
  if (g.rejection_return_step_key && !stepKeys.has(g.rejection_return_step_key)) return `A etapa de retorno "${g.rejection_return_step_key}" não existe na tarefa "${g.anchor_task_key}".`;
  if (g.group_key && (g.group_mode ?? "sequence") === "sequence" && g.sequence_no == null) return "Aprovações em sequência precisam de uma ordem (sequence_no).";
  return null;
}
