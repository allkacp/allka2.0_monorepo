import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";
import { runAtomic } from "./db-atomic";
import { assertTaskNotUsedAsPrerequisite, DependencyInUseError } from "./task-dependency-graph";

// ─── Liberação automática de tarefa (bloco 4/4) ─────────────────────────────
// Uma tarefa PENDENTE_DE_LIBERACAO só sai desse estado quando TODOS os seus
// bloqueadores (TaskDependency + TaskReleaseTrigger) estiverem satisfeitos —
// nunca por um endpoint alternativo que escreva o status diretamente (ver
// fechamento do "backdoor" em project-products.ts).

export const RELEASE_READY_STATUS = "PARA_LANCAMENTO";
export const PENDING_RELEASE_STATUS = "PENDENTE_DE_LIBERACAO";
export const DRAFT_STATUS = "RASCUNHO_OPERACIONAL";

// Status que contam como "tarefa anterior aprovada" pro gatilho de
// dependência — CONCLUIDA é o caminho normal (stage-engine.ts, dois níveis
// de aceite); APROVADA é o caminho de tarefa sem etapa (lider.ts).
const TERMINAL_APPROVED_STATUSES = new Set(["CONCLUIDA", "APROVADA"]);

export class TaskReleaseError extends Error {
  httpStatus: number;
  code: string;
  constructor(message: string, httpStatus = 422, code = "task_release_invalid") {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

export interface TaskGateStatus {
  dependencies: { dependencyId: string; taskId: string; title: string; satisfied: boolean }[];
  triggers: { id: string; type: string; satisfied: boolean; scheduledAt: string | null }[];
  allSatisfied: boolean;
}

export async function getTaskGateStatus(taskId: string, db: DbClient = prisma): Promise<TaskGateStatus> {
  const deps = await db.taskDependency.findMany({
    where: { task_id: taskId },
    include: { depends_on_task: { select: { id: true, title: true, status: true } } },
  });
  const dependencies = deps.map((d) => ({
    dependencyId: d.id,
    taskId: d.depends_on_task_id,
    title: d.depends_on_task.title,
    satisfied: TERMINAL_APPROVED_STATUSES.has(d.depends_on_task.status),
  }));

  const triggerRows = await db.taskReleaseTrigger.findMany({ where: { task_id: taskId } });
  const triggers = triggerRows.map((t) => ({
    id: t.id,
    type: t.trigger_type,
    satisfied: t.status === "satisfied",
    scheduledAt: t.scheduled_at ? t.scheduled_at.toISOString() : null,
  }));

  return {
    dependencies,
    triggers,
    allSatisfied: dependencies.every((d) => d.satisfied) && triggers.every((t) => t.satisfied),
  };
}

async function notifyTaskReleased(db: DbClient, task: { id: string; title: string; project_id: string; assignee_id: string | null }) {
  const project = await db.project.findUnique({ where: { id: task.project_id }, select: { admin_responsible_user_id: true } });
  const recipients = [task.assignee_id, project?.admin_responsible_user_id].filter((id): id is string => Boolean(id));
  if (recipients.length === 0) return;
  await db.systemAlert
    .createMany({
      data: recipients.map((userId) => ({
        type: "tarefa_liberada",
        title: "Tarefa liberada para execução",
        message: `A tarefa "${task.title}" teve todos os bloqueadores satisfeitos e foi liberada.`,
        severity: "info",
        category: "notificacao",
        entity_type: "project_task",
        entity_id: task.id,
        user_id: userId,
      })),
    })
    .catch(() => {});
}

async function notifyAdminOverride(db: DbClient, task: { id: string; title: string; project_id: string }, reason: string) {
  const project = await db.project.findUnique({ where: { id: task.project_id }, select: { admin_responsible_user_id: true } });
  if (!project?.admin_responsible_user_id) return;
  await db.systemAlert
    .create({
      data: {
        type: "excecao_administrativa_dependencia",
        title: "Exceção administrativa aplicada",
        message: `A tarefa "${task.title}" foi liberada ignorando bloqueadores pendentes. Justificativa: ${reason}`,
        // "error" (crítico/vermelho) — acabamento do bloco 4: exceção
        // administrativa ignora bloqueador de verdade, então nunca é só um
        // aviso amarelo (isso é reservado pro bloqueio prolongado normal em
        // notifyLongBlockedTasks, abaixo).
        severity: "error",
        category: "alerta",
        entity_type: "project_task",
        entity_id: task.id,
        user_id: project.admin_responsible_user_id,
      },
    })
    .catch(() => {});
}

/**
 * Tenta liberar UMA tarefa — só efetiva se ela estiver PENDENTE_DE_LIBERACAO
 * e todos os bloqueadores satisfeitos. CAS (`updateMany` com `where:
 * {status: PENDENTE_DE_LIBERACAO}`) garante que retry/corrida nunca libera
 * nem notifica duas vezes: só a chamada que realmente muda a linha grava
 * evento/notificação.
 */
export async function tryReleaseTask(taskId: string, db: DbClient = prisma): Promise<boolean> {
  const task = await db.projectTask.findUnique({ where: { id: taskId } });
  if (!task || task.status !== PENDING_RELEASE_STATUS) return false;

  const gate = await getTaskGateStatus(taskId, db);
  if (!gate.allSatisfied) return false;

  return runAtomic(db, async (tx) => {
    const cas = await tx.projectTask.updateMany({ where: { id: taskId, status: PENDING_RELEASE_STATUS }, data: { status: RELEASE_READY_STATUS } });
    if (cas.count === 0) return false;
    await tx.taskReleaseEvent.create({
      data: { task_id: taskId, event_type: "released", description: "Todos os bloqueadores foram satisfeitos — tarefa liberada para execução." },
    });
    await notifyTaskReleased(tx, task);
    return true;
  });
}

/** Localiza toda sucessora de `prerequisiteTaskId` e tenta liberar cada uma. */
export async function reevaluateSuccessors(prerequisiteTaskId: string, db: DbClient = prisma): Promise<void> {
  const successors = await db.taskDependency.findMany({ where: { depends_on_task_id: prerequisiteTaskId }, select: { task_id: true } });
  for (const s of successors) {
    await tryReleaseTask(s.task_id, db);
  }
}

/**
 * Satisfaz um gatilho de data (chamado pelo worker durável — nunca por um
 * timer só em memória). Idempotente: um trigger já satisfeito não é
 * satisfeito de novo (a query do worker já filtra por status=pending, e o
 * CAS aqui é a segunda camada de proteção contra corrida).
 */
export async function satisfyScheduledDateTrigger(triggerId: string, db: DbClient = prisma): Promise<boolean> {
  const trigger = await db.taskReleaseTrigger.findUnique({ where: { id: triggerId } });
  if (!trigger || trigger.status !== "pending" || trigger.trigger_type !== "scheduled_date") return false;
  return runAtomic(db, async (tx) => {
    const cas = await tx.taskReleaseTrigger.updateMany({ where: { id: triggerId, status: "pending" }, data: { status: "satisfied", satisfied_at: new Date() } });
    if (cas.count === 0) return false;
    await tx.taskReleaseEvent.create({ data: { task_id: trigger.task_id, event_type: "trigger_satisfied", description: "Data programada atingida." } });
    return true;
  }).then(async (changed) => {
    if (changed) await tryReleaseTask(trigger.task_id, db);
    return changed;
  });
}

/**
 * Satisfaz gatilho(s) de pagamento vinculados a uma referência financeira
 * REAL (Payment.id ou Catalog2ChangeOrder.id) — nunca cria gateway novo,
 * nunca aceita um evento fabricado: quem chama isto já validou o pagamento
 * de verdade no ponto real (confirm-payment.ts / catalog2-checkout.ts).
 */
export async function satisfyPaymentTriggersByReference(
  params: { referenceType: "payment" | "catalog2_change_order"; referenceId: string },
  db: DbClient = prisma,
): Promise<number> {
  const triggers = await db.taskReleaseTrigger.findMany({
    where: { trigger_type: "payment", status: "pending", payment_reference_type: params.referenceType, payment_reference_id: params.referenceId },
  });
  let satisfiedCount = 0;
  for (const trigger of triggers) {
    const changed = await runAtomic(db, async (tx) => {
      const cas = await tx.taskReleaseTrigger.updateMany({ where: { id: trigger.id, status: "pending" }, data: { status: "satisfied", satisfied_at: new Date() } });
      if (cas.count === 0) return false;
      await tx.taskReleaseEvent.create({ data: { task_id: trigger.task_id, event_type: "trigger_satisfied", description: "Pagamento da nova etapa confirmado." } });
      return true;
    });
    if (changed) {
      satisfiedCount += 1;
      await tryReleaseTask(trigger.task_id, db);
    }
  }
  return satisfiedCount;
}

/** Aprovação manual do gestor — sempre com justificativa, autor e data (nunca ignora OUTROS bloqueadores; só satisfaz o gatilho manual_approval). */
export async function satisfyManualApprovalTrigger(
  params: { triggerId: string; actorUserId: string; note: string },
  db: DbClient = prisma,
): Promise<void> {
  if (!params.note.trim()) throw new TaskReleaseError("Justificativa é obrigatória para liberar manualmente.");
  const trigger = await db.taskReleaseTrigger.findUnique({ where: { id: params.triggerId } });
  if (!trigger || trigger.trigger_type !== "manual_approval") throw new TaskReleaseError("Gatilho de aprovação manual não encontrado.", 404, "not_found");
  if (trigger.status === "satisfied") return; // idempotente — já satisfeito, nada a fazer

  const changed = await runAtomic(db, async (tx) => {
    const cas = await tx.taskReleaseTrigger.updateMany({
      where: { id: params.triggerId, status: "pending" },
      data: { status: "satisfied", satisfied_by_user_id: params.actorUserId, satisfied_at: new Date(), satisfaction_note: params.note.trim() },
    });
    if (cas.count === 0) return false;
    await tx.taskReleaseEvent.create({
      data: { task_id: trigger.task_id, event_type: "trigger_satisfied", actor_user_id: params.actorUserId, description: `Aprovação manual do gestor: ${params.note.trim()}` },
    });
    return true;
  });
  if (changed) await tryReleaseTask(trigger.task_id, db);
}

/** Confirmação humana de especialidade/responsável quando a IA não resolveu um id estável — nunca associa automaticamente, só grava a escolha explícita. */
export async function satisfySelectionTrigger(
  params: { triggerId: string; actorUserId: string; specialtyId?: string; responsibleUserId?: string },
  db: DbClient = prisma,
): Promise<void> {
  const trigger = await db.taskReleaseTrigger.findUnique({ where: { id: params.triggerId } });
  if (!trigger || !["specialty_selection", "responsible_selection"].includes(trigger.trigger_type)) {
    throw new TaskReleaseError("Gatilho de seleção não encontrado.", 404, "not_found");
  }
  if (trigger.status === "satisfied") return;

  if (trigger.trigger_type === "specialty_selection") {
    if (!params.specialtyId) throw new TaskReleaseError("specialty_id é obrigatório para confirmar a especialidade.");
    const specialty = await db.specialty.findUnique({ where: { id: params.specialtyId } });
    if (!specialty || !specialty.is_active) throw new TaskReleaseError("Especialidade informada não existe ou está inativa.");
  }
  if (trigger.trigger_type === "responsible_selection") {
    if (!params.responsibleUserId) throw new TaskReleaseError("responsible_user_id é obrigatório para confirmar o responsável.");
    const user = await db.user.findUnique({ where: { id: params.responsibleUserId } });
    if (!user) throw new TaskReleaseError("Usuário responsável informado não existe.");
  }

  const changed = await runAtomic(db, async (tx) => {
    const cas = await tx.taskReleaseTrigger.updateMany({
      where: { id: params.triggerId, status: "pending" },
      data: { status: "satisfied", satisfied_by_user_id: params.actorUserId, satisfied_at: new Date() },
    });
    if (cas.count === 0) return false;
    if (trigger.trigger_type === "specialty_selection") {
      await tx.projectTask.update({ where: { id: trigger.task_id }, data: { required_specialty_id: params.specialtyId } });
    } else {
      await tx.projectTask.update({ where: { id: trigger.task_id }, data: { assignee_id: params.responsibleUserId } });
    }
    await tx.taskReleaseEvent.create({
      data: { task_id: trigger.task_id, event_type: "trigger_satisfied", actor_user_id: params.actorUserId, description: `Seleção humana confirmada (${trigger.trigger_type}).` },
    });
    return true;
  });
  if (changed) await tryReleaseTask(trigger.task_id, db);
}

/**
 * Exceção administrativa — libera IGNORANDO bloqueadores pendentes. Só
 * permissão elevada oficial (checado pelo chamador/rota, nunca aqui),
 * sempre com justificativa, evento de auditoria E alerta visível. Nunca
 * disponível por parâmetro escondido — é sempre uma ação própria, explícita.
 */
export async function applyAdminDependencyOverride(
  params: { taskId: string; actorUserId: string; reason: string },
  db: DbClient = prisma,
): Promise<void> {
  if (!params.reason.trim()) throw new TaskReleaseError("Justificativa é obrigatória para a exceção administrativa.");
  const task = await db.projectTask.findUniqueOrThrow({ where: { id: params.taskId } });
  if (task.status !== PENDING_RELEASE_STATUS) throw new TaskReleaseError("Só é possível aplicar exceção administrativa numa tarefa pendente de liberação.");

  await runAtomic(db, async (tx) => {
    await tx.taskDependencyOverride.create({ data: { task_id: params.taskId, reason: params.reason.trim(), authorized_by_user_id: params.actorUserId } });
    const cas = await tx.projectTask.updateMany({ where: { id: params.taskId, status: PENDING_RELEASE_STATUS }, data: { status: RELEASE_READY_STATUS } });
    if (cas.count === 0) throw new TaskReleaseError("Esta tarefa já foi liberada por outra ação.", 409, "task_release_stale");
    await tx.taskReleaseEvent.create({
      data: { task_id: params.taskId, event_type: "admin_override", actor_user_id: params.actorUserId, description: `Exceção administrativa: ${params.reason.trim()}` },
    });
    await notifyAdminOverride(tx, task, params.reason.trim());
  });
}

/**
 * Guarda de cancelamento/arquivamento — nunca retrocede silenciosamente uma
 * tarefa já em andamento nem apaga uma dependência em uso sem avisar.
 */
export async function assertSafeToCancelOrArchive(taskId: string, db: DbClient = prisma): Promise<void> {
  await assertTaskNotUsedAsPrerequisite(taskId, db);
}

export { DependencyInUseError };
