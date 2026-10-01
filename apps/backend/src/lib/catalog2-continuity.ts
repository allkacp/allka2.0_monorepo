// Continuidade com o mesmo nômade/executor entre ciclos (Pedido 2, 2026-09-29).
//
// Por tarefa: "não permitido" | "permitido" (cliente/líder escolhe) | "recomendado"
// (o sistema sugere, dá pra trocar) | "obrigatório" (vai pro mesmo executor, salvo
// indisponibilidade/bloqueio/perda de qualificação ou intervenção do líder).
//
// Sim  → mesma pessoa que concluiu a execução anterior, contexto preservado
//        (briefing, histórico), etapas "só na 1ª execução"/"dispensáveis com
//        continuidade" não se repetem; nova qualificação a cada ciclo (a tarefa é nova).
// Não  → fila normal (especialidade, disponibilidade, qualificação…), com o histórico
//        necessário no briefing; validações obrigatórias de troca de executor rodam.
import { afterExecutorAssigned } from "./connections/flow";
import type { Prisma, PrismaClient } from "@prisma/client";
import { logProjectDecision } from "./catalog2-cycles";
import { reopenAccessValidationOnExecutorChange } from "./client-assets";

type Db = PrismaClient | Prisma.TransactionClient;

export const CONTINUITY_MODES = ["not_allowed", "allowed", "recommended", "required"] as const;
export type ContinuityMode = (typeof CONTINUITY_MODES)[number];
export const CONTINUITY_MODE_LABEL: Record<ContinuityMode, string> = {
  not_allowed: "Não permitido (fila normal)",
  allowed: "Permitido (cliente ou líder escolhe)",
  recommended: "Recomendado (sugere manter, dá pra trocar)",
  required: "Obrigatório (mesmo executor, salvo indisponibilidade)",
};
export const CONTINUITY_CHOICES = ["keep", "redistribute", "manual_leader"] as const;
export type ContinuityChoice = (typeof CONTINUITY_CHOICES)[number];

const DONE_STATUSES = ["CONCLUIDA", "APROVADA"];

export class ContinuityError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus = 422) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

/** Última execução concluída da MESMA tarefa para o MESMO cliente (ciclo anterior ou contrato anterior). */
export async function findPreviousExecution(
  db: Db,
  p: { projectId: string; catalog2ProductId: string | null; taskModelId: number | null; taskKey: string; excludeTaskId?: string },
) {
  if (!p.catalog2ProductId) return null;
  const project = await db.project.findUnique({ where: { id: p.projectId }, select: { company_id: true, client_id: true } });
  const conds: Prisma.ProjectWhereInput[] = [];
  if (project?.company_id) conds.push({ company_id: project.company_id });
  if (project?.client_id) conds.push({ client_id: project.client_id });
  const projectFilter: Prisma.ProjectWhereInput = conds.length ? { OR: conds } : { id: p.projectId };
  const taskMatch: Prisma.Catalog2TaskWhereInput = p.taskModelId != null ? { OR: [{ task_model_id: p.taskModelId }, { key: p.taskKey }] } : { key: p.taskKey };
  return db.projectTask.findFirst({
    where: {
      catalog2_product_id: p.catalog2ProductId, status: { in: DONE_STATUSES }, nomade_responsavel_id: { not: null },
      ...(p.excludeTaskId ? { id: { not: p.excludeTaskId } } : {}), project: projectFilter, catalog2_task: taskMatch,
    },
    orderBy: [{ data_conclusao: "desc" }, { updated_at: "desc" }],
    select: { id: true, title: true, nomade_responsavel_id: true, data_conclusao: true },
  });
}

async function notifyContinuityQuestion(db: Db, taskId: string, mode: ContinuityMode) {
  try {
    const task = await db.projectTask.findUnique({
      where: { id: taskId },
      select: { title: true, task_code: true, lider_responsavel_id: true, project: { select: { title: true, company_id: true, client_id: true, agency_id: true, admin_responsible_user_id: true } } },
    });
    if (!task) return;
    const recipients = new Set<string>();
    const companyId = task.project.company_id ?? task.project.client_id;
    if (companyId) (await db.user.findMany({ where: { company_id: companyId }, select: { id: true } })).forEach((u) => recipients.add(u.id));
    if (task.project.agency_id) (await db.user.findMany({ where: { agency_id: task.project.agency_id }, select: { id: true } })).forEach((u) => recipients.add(u.id));
    if (task.lider_responsavel_id) recipients.add(task.lider_responsavel_id);
    if (task.project.admin_responsible_user_id) recipients.add(task.project.admin_responsible_user_id);
    if (recipients.size === 0) return;
    const code = task.task_code ? ` (${task.task_code})` : "";
    await db.systemAlert.createMany({
      data: [...recipients].map((userId) => ({
        type: "continuidade_pendente",
        title: `Manter com o mesmo nômade? ${task.title}`,
        message: `A tarefa "${task.title}"${code} do projeto "${task.project.title}" pode continuar com o mesmo nômade/executor do ciclo anterior.${mode === "recommended" ? " O sistema recomenda manter." : ""} Escolha: manter, distribuir de novo pela fila inteligente ou (líder) definir manualmente.`,
        severity: "info",
        category: "alerta",
        entity_type: "project_task",
        entity_id: taskId,
        user_id: userId,
      })),
    });
  } catch (err) {
    console.error("[continuity] avisar:", err);
  }
}

/**
 * Chamado na geração de cada tarefa do catálogo: se a tarefa admite continuidade e
 * existe execução anterior do mesmo cliente, marca a decisão (obrigatório: já
 * "mantido"; permitido/recomendado: aguardando escolha, sem entrar na fila até lá).
 */
export async function prepareContinuity(
  db: Db,
  p: {
    projectId: string; projectProductId: string; newTaskId: string; catalog2ProductId: string | null;
    task: { key: string; name: string; task_model_id: number | null; executor_continuity: string };
  },
) {
  const mode = p.task.executor_continuity as ContinuityMode;
  if (mode === "not_allowed" || !CONTINUITY_MODES.includes(mode)) return null;
  const prev = await findPreviousExecution(db, {
    projectId: p.projectId, catalog2ProductId: p.catalog2ProductId, taskModelId: p.task.task_model_id, taskKey: p.task.key, excludeTaskId: p.newTaskId,
  });
  if (!prev?.nomade_responsavel_id) return null;
  const base = { executor_continuity: mode, continuity_prev_task_id: prev.id, continuity_prev_nomade_id: prev.nomade_responsavel_id };
  if (mode === "required") {
    await db.projectTask.update({ where: { id: p.newTaskId }, data: { ...base, continuity_status: "kept", continuity_decided_at: new Date(), continuity_decided_by: "system" } });
    await logProjectDecision(db, {
      projectId: p.projectId, projectProductId: p.projectProductId, projectTaskId: p.newTaskId, kind: "executor_kept",
      message: `Continuidade obrigatória: "${p.task.name}" será direcionada ao mesmo executor do ciclo anterior.`,
      detail: { prev_task_id: prev.id, prev_nomade_id: prev.nomade_responsavel_id },
    });
    return "kept" as const;
  }
  await db.projectTask.update({ where: { id: p.newTaskId }, data: { ...base, continuity_status: "pending_choice", auto_nomad_dispatch_enabled: false } });
  await logProjectDecision(db, {
    projectId: p.projectId, projectProductId: p.projectProductId, projectTaskId: p.newTaskId, kind: "continuity_pending",
    message: `"${p.task.name}": aguardando a escolha de manter (ou não) o mesmo executor do ciclo anterior.`,
    detail: { mode, prev_task_id: prev.id },
  });
  await notifyContinuityQuestion(db, p.newTaskId, mode);
  return "pending" as const;
}

async function buildHandoffText(db: Db, prevTaskId: string | null): Promise<string | null> {
  if (!prevTaskId) return null;
  const prev = await db.projectTask.findUnique({
    where: { id: prevTaskId },
    select: {
      title: true, data_conclusao: true, observations: true,
      qualifications: { orderBy: { created_at: "asc" }, select: { decision: true, comment: true, round: true } },
      briefing_answers: { select: { question_text: true, answer: true } },
    },
  });
  if (!prev) return null;
  const parts = [`── Histórico do ciclo anterior: "${prev.title}"${prev.data_conclusao ? ` (concluída em ${prev.data_conclusao.toLocaleDateString("pt-BR")})` : ""} ──`];
  for (const q of prev.qualifications.filter((x) => x.comment)) parts.push(`• Qualificação (rodada ${q.round}, ${q.decision}): ${q.comment}`);
  for (const b of prev.briefing_answers.filter((x) => x.answer)) parts.push(`• ${b.question_text}: ${b.answer}`);
  if (prev.observations) parts.push(`• Observações anteriores: ${prev.observations}`);
  return parts.join("\n");
}

async function copyBriefingFromPrevious(db: Db, prevTaskId: string, newTaskId: string) {
  const answers = await db.taskBriefingAnswer.findMany({ where: { project_task_id: prevTaskId } });
  for (const a of answers) {
    const exists = await db.taskBriefingAnswer.findUnique({ where: { project_task_id_question_key: { project_task_id: newTaskId, question_key: a.question_key } }, select: { id: true } });
    if (!exists) {
      await db.taskBriefingAnswer.create({
        data: { project_task_id: newTaskId, question_key: a.question_key, question_text: a.question_text, answer: a.answer, files: a.files, links: a.links },
      });
    }
  }
}

/** Etapas "só na 1ª execução"/"dispensáveis com continuidade" não se repetem quando o executor é mantido. */
export async function skipStagesForContinuity(db: Db, taskId: string): Promise<number> {
  const stages = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: [{ ordem: "asc" }, { created_at: "asc" }] });
  let skipped = 0;
  for (const st of stages) {
    if (st.status === "CONCLUIDA") continue;
    let cfg: Record<string, unknown> = {};
    try { cfg = st.config_snapshot ? JSON.parse(st.config_snapshot) : {}; } catch { cfg = {}; }
    if (!cfg.first_execution_only && !cfg.skip_when_same_executor) continue;
    await db.projectTaskStage.update({
      where: { id: st.id },
      data: { status: "CONCLUIDA", concluida_em: new Date(), concluida_por: "system", config_snapshot: JSON.stringify({ ...cfg, dispensed_by: "continuity" }) },
    });
    skipped++;
  }
  if (skipped > 0) {
    const { abrirEtapa } = await import("./stage-engine");
    const remaining = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: [{ ordem: "asc" }, { created_at: "asc" }] });
    const active = remaining.some((s) => ["EM_ANDAMENTO", "AGUARDANDO_EXECUTOR"].includes(s.status));
    const next = remaining.find((s) => s.status !== "CONCLUIDA");
    // só reabre se a tarefa já foi liberada (senão o motor abre a 1ª etapa no lançamento)
    const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { status: true } });
    if (next && !active && task && ["LIBERADA_PARA_EXECUCAO", "AGUARDANDO_NOMADE", "EM_EXECUCAO"].includes(task.status)) await abrirEtapa(db, next.id);
  }
  return skipped;
}

/**
 * Chamado quando a tarefa vai entrar na fila de nômades: se a continuidade manda
 * (ou o líder escolheu alguém), direciona. "assigned" | "waiting_choice" | "none".
 * Indisponibilidade/bloqueio/perda de qualificação → cai na fila normal e avisa o líder.
 */
export async function applyContinuityAssignment(taskId: string): Promise<"assigned" | "waiting_choice" | "none"> {
  const { prisma } = await import("./prisma");
  const t = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, project_id: true, project_product_id: true, nomade_responsavel_id: true, lider_responsavel_id: true, continuity_status: true, continuity_prev_nomade_id: true, executor_continuity: true },
  });
  if (!t || t.nomade_responsavel_id) return "none";
  if (t.continuity_status === "pending_choice") return "waiting_choice";
  if (!["kept", "manual_leader"].includes(t.continuity_status ?? "") || !t.continuity_prev_nomade_id) return "none";

  const { eligibleCandidatesForTask, assignNomadeDirectly } = await import("./task-rotation-engine");
  const eligible = (await eligibleCandidatesForTask(taskId)).some((c) => c.nomadeId === t.continuity_prev_nomade_id);
  if (!eligible) {
    await prisma.projectTask.update({ where: { id: taskId }, data: { continuity_status: "redistributed", auto_nomad_dispatch_enabled: true } });
    await reopenAccessValidationOnExecutorChange(prisma, taskId);
    await logProjectDecision(prisma, {
      projectId: t.project_id, projectProductId: t.project_product_id, projectTaskId: taskId, kind: "executor_changed",
      message: `O executor anterior não pôde continuar (indisponível, bloqueado ou sem a qualificação exigida): "${t.title}" segue para a fila inteligente.`,
      detail: { prev_nomade_id: t.continuity_prev_nomade_id, mode: t.executor_continuity },
    });
    const proj = await prisma.project.findUnique({ where: { id: t.project_id }, select: { admin_responsible_user_id: true } });
    const notifyUser = t.lider_responsavel_id ?? proj?.admin_responsible_user_id ?? null;
    if (notifyUser) {
      await prisma.systemAlert.create({
        data: {
          type: "continuidade_indisponivel", title: `Executor anterior indisponível: ${t.title}`,
          message: `A tarefa "${t.title}" ${t.executor_continuity === "required" ? "exigia" : "pedia"} continuidade com o mesmo executor, mas ele não pode assumir agora. Ela foi para a fila inteligente — intervenha se preferir definir alguém manualmente.`,
          severity: "warning", category: "alerta", entity_type: "project_task", entity_id: taskId, user_id: notifyUser,
        },
      }).catch(() => {});
    }
    return "none";
  }

  await skipStagesForContinuity(prisma, taskId);
  await assignNomadeDirectly(taskId, t.continuity_prev_nomade_id, "system", { criterio: "continuidade", detalhes: "Mesmo executor do ciclo anterior." });
  await logProjectDecision(prisma, {
    projectId: t.project_id, projectProductId: t.project_product_id, projectTaskId: taskId, kind: "executor_kept",
    message: `"${t.title}" foi direcionada ao mesmo executor do ciclo anterior.`, detail: { nomade_id: t.continuity_prev_nomade_id },
  });
  return "assigned";
}

export async function decideContinuity(
  db: Db,
  taskId: string,
  opts: { choice: ContinuityChoice; nomadeId?: string | null; actorUserId: string; canManual: boolean },
): Promise<{ status: string }> {
  const t = await db.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, title: true, project_id: true, project_product_id: true, status: true, nomade_responsavel_id: true, continuity_status: true, continuity_prev_task_id: true, continuity_prev_nomade_id: true, observations: true },
  });
  if (!t) throw new ContinuityError("Tarefa não encontrada.", 404);
  if (t.nomade_responsavel_id) throw new ContinuityError("A tarefa já tem executor.", 409);
  if (t.continuity_status !== "pending_choice" && !(opts.choice === "manual_leader" && opts.canManual && t.continuity_status)) {
    throw new ContinuityError("Esta tarefa não está aguardando a escolha de continuidade.");
  }
  const decided = { continuity_decided_by: opts.actorUserId, continuity_decided_at: new Date() };
  const log = (kind: string, message: string, detail?: unknown) =>
    logProjectDecision(db, { projectId: t.project_id, projectProductId: t.project_product_id, projectTaskId: t.id, kind, message, detail, actorUserId: opts.actorUserId });

  if (opts.choice === "keep") {
    if (!t.continuity_prev_nomade_id) throw new ContinuityError("Não há executor anterior para manter.");
    await db.projectTask.update({ where: { id: t.id }, data: { ...decided, continuity_status: "kept", auto_nomad_dispatch_enabled: true } });
    if (t.continuity_prev_task_id) await copyBriefingFromPrevious(db, t.continuity_prev_task_id, t.id);
    await log("executor_kept", `Escolhido manter o mesmo executor em "${t.title}".`, { nomade_id: t.continuity_prev_nomade_id });
    return { status: "kept" };
  }
  if (opts.choice === "redistribute") {
    const handoff = await buildHandoffText(db, t.continuity_prev_task_id);
    await db.projectTask.update({
      where: { id: t.id },
      data: { ...decided, continuity_status: "redistributed", auto_nomad_dispatch_enabled: true, ...(handoff ? { observations: [t.observations, handoff].filter(Boolean).join("\n\n") } : {}) },
    });
    await reopenAccessValidationOnExecutorChange(db, t.id);
    await afterExecutorAssigned(t.id, { id: opts.actorUserId });
    await log("executor_changed", `Escolhido distribuir "${t.title}" pela fila inteligente (histórico do ciclo anterior incluído no briefing).`);
    return { status: "redistributed" };
  }
  // manual_leader
  if (!opts.canManual) throw new ContinuityError("Somente o líder/administrador pode definir o executor manualmente.", 403);
  if (!opts.nomadeId) throw new ContinuityError("Informe o nômade.");
  const nomade = await db.nomade.findUnique({ where: { id: opts.nomadeId }, select: { id: true, status: true } });
  if (!nomade || nomade.status !== "ativo") throw new ContinuityError("Nômade indisponível.");
  await db.projectTask.update({ where: { id: t.id }, data: { ...decided, continuity_status: "manual_leader", continuity_prev_nomade_id: nomade.id, auto_nomad_dispatch_enabled: true } });
  if (t.continuity_prev_task_id) await copyBriefingFromPrevious(db, t.continuity_prev_task_id, t.id);
  await log("executor_manual", `O líder definiu manualmente o executor de "${t.title}".`, { nomade_id: nomade.id });
  return { status: "manual_leader" };
}
