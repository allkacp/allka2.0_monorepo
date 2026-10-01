// Exigências materializadas na contratação, dependências de tarefas/etapas, pausa por dependência externa e SLA.
// Reaproveita o motor de dependências existente (ProjectDependencyRule): a conexão é só mais um tipo de alvo ("connection").
import type { Prisma, PrismaClient } from "@prisma/client";
import { logProjectDecision } from "../catalog2-cycles";
import {
  CONNECTION_STATE_LABEL, ConnectionError, behaviorForKind, connectionSatisfies,
  type ConnectionState, type DependencyKind, type GrantScope,
} from "./catalog";
import { grantConnection, grantCovers, logConnection, clientUsersOfProject, ownerMatches, ownerOfProject, ownerWhere, revokeGrants, type Actor } from "./core";
import { safeText } from "./secrets";

type Db = PrismaClient | Prisma.TransactionClient;

export const PAUSED_STATUS = "PAUSADA_DEPENDENCIA_EXTERNA";
/** Tarefas em andamento: só estas podem ser pausadas por perda de conexão. */
const RUNNING = ["LIBERADA_PARA_EXECUCAO", "AGUARDANDO_NOMADE", "EM_EXECUCAO", "EM_AJUSTES"];
const EXECUTOR_BOUND_METHODS = ["user_invite", "temporary_user"];

// ── Notificação ─────────────────────────────────────────────────────────────
async function notify(db: Db, userIds: (string | null | undefined)[], a: { type: string; title: string; message: string; severity?: string; entityType: string; entityId: string; url?: string }) {
  for (const uid of [...new Set(userIds.filter((x): x is string => !!x))]) {
    try {
      await db.systemAlert.create({ data: { type: a.type, title: a.title, message: safeText(a.message), severity: a.severity ?? "warning", category: "alerta", entity_type: a.entityType, entity_id: a.entityId, user_id: uid, action_url: a.url ?? "/conexoes" } });
    } catch { /* aviso é acessório */ }
  }
}


// ── Materialização ──────────────────────────────────────────────────────────
type PcrRow = Prisma.ProjectConnectionRequirementGetPayload<object>;

async function reqDef(db: Db, id: string) {
  return db.catalog2ConnectionRequirement.findUnique({ where: { id }, include: { connection_type: true, dependencies: true } });
}

/** Cria (idempotente) as exigências do produto contratado, já usando as escolhas feitas no rascunho da cotação. */
export async function ensureProjectConnectionRequirements(db: Db, p: { projectId: string; projectProductId: string; versionId: string; quoteId?: string | null; actor?: Actor | null }): Promise<PcrRow[]> {
  const version = await db.catalog2ProductVersion.findUnique({ where: { id: p.versionId }, select: { requires_connections: true } });
  if (!version?.requires_connections) return [];
  const reqs = await db.catalog2ConnectionRequirement.findMany({ where: { version_id: p.versionId }, include: { connection_type: true }, orderBy: { sort_order: "asc" } });
  const owner = await ownerOfProject(db, p.projectId);
  const companyId = owner.company_id ?? null;
  const out: PcrRow[] = [];
  for (const r of reqs) {
    const existing = await db.projectConnectionRequirement.findUnique({ where: { project_product_id_requirement_id: { project_product_id: p.projectProductId, requirement_id: r.id } } });
    if (existing) { out.push(existing); continue; }
    const choice = p.quoteId ? await db.connectionQuoteChoice.findUnique({ where: { quote_id_requirement_id: { quote_id: p.quoteId, requirement_id: r.id } } }) : null;
    const conditionActive = r.obligation !== "conditional";
    let connectionId: string | null = null;
    if (choice?.connection_id) {
      const c = await db.clientConnection.findUnique({ where: { id: choice.connection_id }, select: { id: true, company_id: true, agency_id: true, status: true, connection_type_id: true } });
      if (c && ownerMatches(c, owner) && c.connection_type_id === r.connection_type_id && !["revoked", "removed"].includes(c.status)) connectionId = c.id;
    }
    // Reutilização AUTOMÁTICA só dentro do mesmo projeto e do escopo já autorizado (projeto inteiro).
    let reusedAuto = false;
    if (!connectionId && (owner.company_id || owner.agency_id)) {
      const found = await db.clientConnection.findFirst({
        where: { AND: [ownerWhere(owner), { connection_type_id: r.connection_type_id, status: { notIn: ["revoked", "removed"] }, grants: { some: { project_id: p.projectId, project_task_id: null, revoked_at: null } } }] },
        orderBy: { updated_at: "desc" },
      });
      if (found) { connectionId = found.id; reusedAuto = true; }
    }
    const conn = connectionId ? await db.clientConnection.findUnique({ where: { id: connectionId } }) : null;
    const pcr = await db.projectConnectionRequirement.create({
      data: {
        project_id: p.projectId, project_product_id: p.projectProductId, requirement_id: r.id, connection_type_id: r.connection_type_id, label: r.label || r.connection_type.name,
        connection_id: connectionId, handling: choice?.handling ?? (r.when_needed === "during_checkout" ? "now" : "later"),
        status: conn ? conn.status : conditionActive ? "awaiting_submission" : "not_requested", condition_active: conditionActive,
        responsible_user_id: choice?.responsible_user_id ?? null, responsible_name: choice?.responsible_name ?? null, invited_email: choice?.invited_email ?? null,
        draft_json: choice?.draft_json ?? (choice?.grant_scope ? JSON.stringify({ grant_scope: choice.grant_scope }) : null), last_request_at: conditionActive ? new Date() : null,
      },
    });
    await logConnection(db, { kind: reusedAuto ? "reused" : "requested", message: reusedAuto ? `"${pcr.label}": conexão já autorizada neste projeto foi reaproveitada.` : `Conexão "${pcr.label}" solicitada na contratação.`, pcrId: pcr.id, connectionId, companyId, projectId: p.projectId, actor: p.actor ?? null });
    // projeto inteiro já pode ser autorizado agora; tarefas específicas esperam as tarefas existirem (materializeConnectionRules)
    if (choice?.connection_id && connectionId && (choice.grant_scope ?? r.default_grant_scope) === "project") {
      await grantConnection(db, p.actor ?? { id: choice.created_by_user_id }, { connection_id: connectionId, project_id: p.projectId, scope: "project" });
    }
    out.push(pcr);
  }
  return out;
}

const cycleMatches = (when: string, cycleKind: string | null) => when === "implementation_only" ? cycleKind === "implementacao" : when === "revalidation_only" ? cycleKind === "revalidacao" : true;

/** Depois de gerar as tarefas: cria as regras de dependência (tarefa/etapa → conexão) e segura as tarefas dependentes. */
export async function materializeConnectionRules(db: Db, projectId: string, projectProductIds: string[]): Promise<{ rulesCreated: number; held: number }> {
  const res = { rulesCreated: 0, held: 0 };
  const pps = await db.projectProduct.findMany({ where: { id: { in: projectProductIds }, project_id: projectId, catalog2_version_id: { not: null } }, select: { id: true, catalog2_version_id: true, origin_catalog2_quote_id: true } });
  for (const pp of pps) {
    const pcrs = await ensureProjectConnectionRequirements(db, { projectId, projectProductId: pp.id, versionId: pp.catalog2_version_id!, quoteId: pp.origin_catalog2_quote_id });
    if (pcrs.length === 0) continue;
    const tasks = await db.projectTask.findMany({ where: { project_product_id: pp.id }, select: { id: true, title: true, status: true, cycle_kind: true, catalog2_task_id: true, catalog2_task: { select: { key: true } } } });
    for (const pcr of pcrs) {
      if (!pcr.condition_active) continue;
      const def = await reqDef(db, pcr.requirement_id);
      if (!def) continue;
      // grants de tarefas específicas escolhidos antes da contratação
      let pendingScope: { grant_scope?: string; task_keys?: string[] } = {};
      try { pendingScope = pcr.draft_json ? JSON.parse(pcr.draft_json) : {}; } catch { pendingScope = {}; }
      for (const dep of def.dependencies) {
        for (const t of tasks.filter((x) => x.catalog2_task?.key === dep.task_key && cycleMatches(def.when_needed, x.cycle_kind))) {
          const stageRef = dep.step_key && t.catalog2_task_id ? (await db.catalog2TaskStep.findFirst({ where: { task_id: t.catalog2_task_id, key: dep.step_key }, select: { id: true } }))?.id ?? null : null;
          const exists = await db.projectDependencyRule.findFirst({ where: { task_id: t.id, target_connection_req_id: pcr.id, dependent_stage_key: stageRef }, select: { id: true } });
          if (exists) continue;
          const nonBlocking = def.pending_behavior === "alert_only" || def.pending_behavior === "allow_draft" || dep.kind === "info" || def.obligation === "optional";
          const behavior = nonBlocking ? "alert_only" : stageRef ? "block_stage" : behaviorForKind(dep.kind as DependencyKind);
          await db.projectDependencyRule.create({
            data: {
              project_id: projectId, task_id: t.id, target_kind: "connection", target_connection_req_id: pcr.id, connection_dep_kind: dep.kind, dependent_stage_key: stageRef,
              behavior, reason: `Conexão necessária: ${pcr.label}`, target_missing: false,
            },
          });
          res.rulesCreated++;
          const st = await evaluateConnectionRule(db, { task_id: t.id, project_id: projectId, target_connection_req_id: pcr.id });
          if (st.satisfied && pcr.connection_id) {
            await logConnection(db, { kind: "reused", message: `"${pcr.label}" já estava válida para "${t.title}": a validação completa foi dispensada${def.light_check ? " (conferência leve pendente)" : ""}.`, pcrId: pcr.id, connectionId: pcr.connection_id, projectId, taskId: t.id });
            await logProjectDecision(db, { projectId, projectProductId: pp.id, projectTaskId: t.id, kind: "connection_reused", message: `Conexão "${pcr.label}" reutilizada: validação completa dispensada.`, detail: { requirement: pcr.id, light_check: def.light_check } });
            if (def.light_check && !pcr.light_check_pending) await db.projectConnectionRequirement.update({ where: { id: pcr.id }, data: { light_check_pending: true } });
          }
          if (behavior === "block_start" && t.status === "PARA_LANCAMENTO" && !(await evaluateConnectionRule(db, { task_id: t.id, project_id: projectId, target_connection_req_id: pcr.id })).satisfied) {
            await db.projectTask.update({ where: { id: t.id }, data: { status: "PENDENTE_DE_LIBERACAO" } });
            await logProjectDecision(db, { projectId, projectProductId: pp.id, projectTaskId: t.id, kind: "dependency_blocked", message: `"${t.title}" aguarda a conexão: ${pcr.label}.` });
            await logConnection(db, { kind: "blocked", message: `"${t.title}" aguarda a conexão "${pcr.label}".`, pcrId: pcr.id, projectId, taskId: t.id });
            res.held++;
          }
        }
      }
      // autorização de uso por tarefa(s) escolhida(s) antes da contratação
      if (pcr.connection_id && pendingScope.grant_scope && pendingScope.grant_scope !== "project" && pendingScope.task_keys?.length) {
        const ids = tasks.filter((t) => pendingScope.task_keys!.includes(t.catalog2_task?.key ?? "")).map((t) => t.id);
        if (ids.length) await grantConnection(db, { id: null, role: "system" }, { connection_id: pcr.connection_id, project_id: projectId, scope: ids.length === 1 ? "task" : "selected_tasks", task_ids: ids });
      }
    }
  }
  return res;
}

// ── Avaliação (usada por project-dependencies.evaluateRule) ─────────────────
export async function evaluateConnectionRule(db: Db, rule: { task_id: string; project_id: string; target_connection_req_id?: string | null }): Promise<{ satisfied: boolean; reason: string; state: string }> {
  const pcr = rule.target_connection_req_id ? await db.projectConnectionRequirement.findUnique({ where: { id: rule.target_connection_req_id } }) : null;
  if (!pcr) return { satisfied: false, reason: "Conexão exigida não encontrada.", state: "none" };
  if (pcr.status === "dispensed") return { satisfied: true, reason: `Conexão "${pcr.label}" dispensada.`, state: "dispensed" };
  if (!pcr.condition_active) return { satisfied: true, reason: `Conexão "${pcr.label}" condicional ainda não ativada.`, state: "not_requested" };
  const def = await db.catalog2ConnectionRequirement.findUnique({ where: { id: pcr.requirement_id } });
  const conn = pcr.connection_id ? await db.clientConnection.findUnique({ where: { id: pcr.connection_id } }) : null;
  if (!conn) return { satisfied: false, reason: `Aguardando conexão: ${pcr.label}.`, state: "awaiting_submission" };
  const task = await db.projectTask.findUnique({ where: { id: rule.task_id }, select: { id: true, nomade_responsavel_id: true } });
  const bound = def?.asset_rule === "on_executor_change" || EXECUTOR_BOUND_METHODS.includes(conn.method);
  if (!task || !(await grantCovers(db, conn.id, rule.project_id, task.id, task.nomade_responsavel_id, bound))) {
    return { satisfied: false, reason: bound && task?.nomade_responsavel_id ? `"${pcr.label}": o novo executor ainda não foi autorizado.` : `"${pcr.label}": falta autorizar o uso nesta tarefa/projeto.`, state: "not_authorized" };
  }
  if (!connectionSatisfies(conn, { asset_rule: def?.asset_rule, revalidate_days: def?.revalidate_days })) {
    return { satisfied: false, reason: `"${pcr.label}": ${CONNECTION_STATE_LABEL[conn.status as ConnectionState] ?? conn.status}${conn.last_problem ? ` — ${conn.last_problem.replace(/[.\s]+$/, "")}` : ""}.`, state: conn.status };
  }
  if (pcr.light_check_pending) return { satisfied: false, reason: `"${pcr.label}": aguardando a conferência leve.`, state: "light_check" };
  return { satisfied: true, reason: `Conexão "${pcr.label}" válida.`, state: "valid" };
}

// ── Sincronização e recálculo ──────────────────────────────────────────────
export async function syncRequirementStatuses(db: Db, connectionId: string) {
  const c = await db.clientConnection.findUnique({ where: { id: connectionId } });
  if (!c) return;
  const pcrs = await db.projectConnectionRequirement.findMany({ where: { connection_id: connectionId, status: { not: "dispensed" } } });
  for (const p of pcrs) {
    await db.projectConnectionRequirement.update({ where: { id: p.id }, data: { status: c.status, resolved_at: c.status === "valid" ? new Date() : null } });
  }
}

async function projectsOfConnection(db: Db, connectionId: string): Promise<string[]> {
  const a = await db.projectConnectionRequirement.findMany({ where: { connection_id: connectionId }, select: { project_id: true } });
  const b = await db.clientConnectionGrant.findMany({ where: { connection_id: connectionId }, select: { project_id: true } });
  return [...new Set([...a, ...b].map((x) => x.project_id))];
}

/** Depois de qualquer mudança na conexão: reavalia dependências, libera, pausa ou retoma só as atividades afetadas. */
export async function recalcConnection(db: Db, connectionId: string, actor?: Actor | null) {
  await syncRequirementStatuses(db, connectionId);
  const out = { released: 0, paused: 0, resumed: 0 };
  for (const projectId of await projectsOfConnection(db, connectionId)) {
    const r = await recalcProjectConnections(db, projectId, actor);
    out.released += r.released; out.paused += r.paused; out.resumed += r.resumed;
  }
  return out;
}

export async function recalcTaskConnections(db: Db, taskId: string, actor?: Actor | null): Promise<{ paused: number; resumed: number }> {
  const out = { paused: 0, resumed: 0 };
  const rs = await db.projectDependencyRule.findMany({ where: { task_id: taskId, target_kind: "connection" } });
  if (rs.length === 0) return out;
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { id: true, title: true, status: true, project_id: true } });
  if (!task) return out;
  const projectId = task.project_id;
  const evals = await Promise.all(rs.map(async (r) => ({ r, e: await evaluateConnectionRule(db, r) })));
  const isContinue = (r: (typeof rs)[number]) => r.connection_dep_kind === "continue" && !r.dependent_stage_key && r.behavior === "block_start";
  // antes de começar: segura a tarefa se perdeu a conexão exigida para iniciar
  if (task.status === "PARA_LANCAMENTO" && evals.some((x) => x.r.behavior === "block_start" && !x.e.satisfied)) {
    await db.projectTask.update({ where: { id: taskId }, data: { status: "PENDENTE_DE_LIBERACAO" } });
    await logProjectDecision(db, { projectId, projectTaskId: taskId, kind: "dependency_blocked", message: `"${task.title}" aguarda: ${evals.find((x) => !x.e.satisfied)!.e.reason}` });
  }
  if (RUNNING.includes(task.status)) {
    const activeLost: typeof evals = [];
    for (const x of evals.filter((y) => !y.e.satisfied)) {
      if (isContinue(x.r)) activeLost.push(x);
      else if (x.r.behavior === "block_stage" && x.r.connection_dep_kind !== "conclude" && x.r.dependent_stage_key) {
        // etapa específica: só pausa quando essa etapa já está aberta
        const stage = await db.projectTaskStage.findFirst({ where: { project_task_id: taskId, catalog_step_ref: x.r.dependent_stage_key }, select: { status: true } });
        if (stage && stage.status !== "PENDENTE" && stage.status !== "CONCLUIDA") activeLost.push(x);
      }
    }
    if (activeLost.length) {
      await pauseTask(db, taskId, { pcrId: activeLost[0].r.target_connection_req_id, reason: activeLost[0].e.reason, detectedBy: actor?.integration ?? actor?.id ?? "system", critical: true });
      out.paused++;
    }
  }
  if (task.status === PAUSED_STATUS) {
    const blocking: typeof evals = [];
    for (const x of evals.filter((y) => !y.e.satisfied)) {
      if (isContinue(x.r)) blocking.push(x);
      else if (x.r.behavior === "block_stage" && x.r.connection_dep_kind !== "conclude" && x.r.dependent_stage_key) {
        const stage = await db.projectTaskStage.findFirst({ where: { project_task_id: taskId, catalog_step_ref: x.r.dependent_stage_key }, select: { status: true } });
        if (stage && stage.status !== "PENDENTE" && stage.status !== "CONCLUIDA") blocking.push(x);
      }
    }
    if (blocking.length === 0 && (await resumeTask(db, taskId, actor ?? null))) out.resumed++;
  }
  return out;
}

export async function recalcProjectConnections(db: Db, projectId: string, actor?: Actor | null) {
  const out = { released: 0, paused: 0, resumed: 0 };
  const { reevaluateProjectDependencies } = await import("../project-dependencies");
  const rules = await db.projectDependencyRule.findMany({ where: { project_id: projectId, target_kind: "connection" }, select: { task_id: true } });
  for (const taskId of new Set(rules.map((r) => r.task_id))) {
    const r = await recalcTaskConnections(db, taskId, actor);
    out.paused += r.paused; out.resumed += r.resumed;
  }
  out.released = await reevaluateProjectDependencies(db, projectId);
  return out;
}

// ── Pausa por dependência externa e SLA ────────────────────────────────────
export async function pauseTask(db: Db, taskId: string, p: { pcrId: string | null; reason: string; party?: string; detectedBy?: string | null; stageKey?: string | null; critical?: boolean }) {
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { id: true, title: true, status: true, project_id: true, project_product_id: true, due_date: true, original_due_date: true, nomade_responsavel_id: true, lider_responsavel_id: true } });
  if (!task) return null;
  const open = await db.projectTaskExternalBlock.findFirst({ where: { project_task_id: taskId, resolved_at: null, project_connection_req_id: p.pcrId } });
  if (open) {
    await db.projectTaskExternalBlock.update({ where: { id: open.id }, data: { attempts: { increment: 1 } } });
    return open;
  }
  const pcr = p.pcrId ? await db.projectConnectionRequirement.findUnique({ where: { id: p.pcrId } }) : null;
  const anyOpen = await db.projectTaskExternalBlock.findFirst({ where: { project_task_id: taskId, resolved_at: null } });
  const previous = task.status === PAUSED_STATUS ? anyOpen?.previous_status ?? "EM_EXECUCAO" : task.status;
  const block = await db.projectTaskExternalBlock.create({
    data: {
      project_id: task.project_id, project_task_id: taskId, stage_key: p.stageKey ?? null, project_connection_req_id: p.pcrId, connection_id: pcr?.connection_id ?? null,
      reason: safeText(p.reason), responsible_party: p.party ?? "client", responsible_user_id: pcr?.responsible_user_id ?? null, detected_by: p.detectedBy ?? "system",
      affects_critical_path: p.critical !== false, previous_status: previous,
    },
  });
  if (task.status !== PAUSED_STATUS) {
    await db.projectTask.update({
      where: { id: taskId },
      data: { status: PAUSED_STATUS, status_before_external_pause: previous, external_pause_started_at: new Date(), original_due_date: task.original_due_date ?? task.due_date },
    });
  }
  await logProjectDecision(db, { projectId: task.project_id, projectProductId: task.project_product_id, projectTaskId: taskId, kind: "task_paused_external", message: `"${task.title}" pausada por dependência externa: ${safeText(p.reason)} O prazo (SLA) foi suspenso e o atraso não conta para o executor.`, detail: { block_id: block.id, requirement: p.pcrId } });
  await logConnection(db, { kind: "paused", message: `"${task.title}" pausada por dependência externa: ${safeText(p.reason)}`, pcrId: p.pcrId, connectionId: pcr?.connection_id ?? null, projectId: task.project_id, taskId, actor: { id: null, integration: "system", role: "system" } });
  await notify(db, [pcr?.responsible_user_id, ...(await clientUsersOfProject(db, task.project_id)), task.lider_responsavel_id, task.nomade_responsavel_id], { type: "conexao_pausa", title: "Atividade pausada: conexão necessária", message: `"${task.title}" foi pausada porque falta resolver: ${p.reason}`, entityType: "project_task", entityId: taskId });
  return block;
}

/** Retoma: calcula o tempo bloqueado, preserva o prazo original e só empurra o prazo se a atividade estava no caminho obrigatório. */
export async function resumeTask(db: Db, taskId: string, actor: Actor | null): Promise<boolean> {
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { id: true, title: true, status: true, project_id: true, project_product_id: true, due_date: true, original_due_date: true, status_before_external_pause: true, external_pause_total_minutes: true, external_pause_started_at: true } });
  if (!task || task.status !== PAUSED_STATUS) return false;
  const blocks = await db.projectTaskExternalBlock.findMany({ where: { project_task_id: taskId, resolved_at: null } });
  const now = new Date();
  const started = task.external_pause_started_at ?? blocks.reduce((m, b) => (b.started_at < m ? b.started_at : m), now);
  const minutes = Math.max(0, Math.round((now.getTime() - started.getTime()) / 60_000));
  const critical = blocks.some((b) => b.affects_critical_path);
  for (const b of blocks) {
    await db.projectTaskExternalBlock.update({ where: { id: b.id }, data: { resolved_at: now, resolved_by: actor?.id ?? actor?.integration ?? "system", blocked_minutes: minutes, deadline_impact_minutes: b.affects_critical_path ? minutes : 0 } });
  }
  const newDue = task.due_date && critical ? new Date(task.due_date.getTime() + minutes * 60_000) : task.due_date;
  await db.projectTask.update({
    where: { id: taskId },
    data: { status: task.status_before_external_pause || "EM_EXECUCAO", status_before_external_pause: null, external_pause_started_at: null, external_pause_total_minutes: { increment: minutes }, due_date: newDue },
  });
  if (critical && minutes > 0) {
    const proj = await db.project.findUnique({ where: { id: task.project_id }, select: { end_date: true } });
    if (proj?.end_date) await db.project.update({ where: { id: task.project_id }, data: { end_date: new Date(proj.end_date.getTime() + minutes * 60_000) } });
  }
  const msg = `"${task.title}" retomada após ${minutes} min de bloqueio externo.${critical ? " O prazo foi recalculado (caminho obrigatório); o prazo original foi preservado." : " Fora do caminho obrigatório: o prazo geral não mudou."}`;
  await logProjectDecision(db, { projectId: task.project_id, projectProductId: task.project_product_id, projectTaskId: taskId, kind: "task_resumed_external", message: msg, detail: { minutes, critical, original_due_date: task.original_due_date, new_due_date: newDue } });
  await logConnection(db, { kind: "resumed", message: msg, projectId: task.project_id, taskId, actor: actor ?? { id: null, integration: "system", role: "system" }, detail: { minutes, critical } });
  return true;
}

// ── Exigência na contratação ───────────────────────────────────────────────
async function pcrOrThrow(db: Db, id: string) {
  const p = await db.projectConnectionRequirement.findUnique({ where: { id } });
  if (!p) throw new ConnectionError("Exigência de conexão não encontrada.", 404, "requirement_not_found");
  return p;
}

export async function linkConnection(db: Db, actor: Actor, pcrId: string, p: { connection_id: string; scope: GrantScope; task_ids?: string[]; executor_user_id?: string | null }) {
  const pcr = await pcrOrThrow(db, pcrId);
  const conn = await db.clientConnection.findUnique({ where: { id: p.connection_id } });
  if (!conn) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  if (conn.connection_type_id !== pcr.connection_type_id) throw new ConnectionError("Esta conexão é de outro tipo.", 422, "connection_type_mismatch");
  const reuse = !!(await db.clientConnectionGrant.findFirst({ where: { connection_id: conn.id, revoked_at: null }, select: { id: true } }));
  await grantConnection(db, actor, { connection_id: conn.id, project_id: pcr.project_id, scope: p.scope, task_ids: p.task_ids, executor_user_id: p.executor_user_id });
  await db.projectConnectionRequirement.update({ where: { id: pcrId }, data: { connection_id: conn.id, handling: "now", status: conn.status, resolved_at: conn.status === "valid" ? new Date() : null } });
  if (reuse) await logConnection(db, { kind: "reused", message: `Conexão "${conn.label}" reutilizada em "${pcr.label}" (escopo ${p.scope}).`, pcrId, connectionId: conn.id, companyId: conn.company_id, projectId: pcr.project_id, actor });
  return recalcConnection(db, conn.id, actor);
}

export async function setHandling(db: Db, actor: Actor, pcrId: string, p: { handling: "later" | "draft" | "now"; responsible_user_id?: string | null; responsible_name?: string | null; invited_email?: string | null; draft?: unknown }) {
  const pcr = await pcrOrThrow(db, pcrId);
  const def = await db.catalog2ConnectionRequirement.findUnique({ where: { id: pcr.requirement_id }, select: { obligation: true, pending_behavior: true, when_needed: true } });
  if (p.handling === "later" && def?.pending_behavior === "block_checkout" && !pcr.connection_id) throw new ConnectionError("Esta conexão precisa ser enviada para concluir a contratação.", 409, "connection_required_now");
  await db.projectConnectionRequirement.update({
    where: { id: pcrId },
    data: { handling: p.handling, ...(p.responsible_user_id !== undefined ? { responsible_user_id: p.responsible_user_id } : {}), ...(p.responsible_name !== undefined ? { responsible_name: p.responsible_name } : {}), ...(p.invited_email !== undefined ? { invited_email: p.invited_email } : {}), ...(p.draft !== undefined ? { draft_json: safeText(JSON.stringify(p.draft)) } : {}), last_request_at: new Date() },
  });
  await logConnection(db, { kind: "requested", message: `"${pcr.label}": cliente escolheu ${p.handling === "later" ? "fazer depois" : p.handling === "draft" ? "salvar como rascunho" : "conectar agora"}${p.responsible_name ? `; responsável: ${p.responsible_name}` : ""}.`, pcrId, projectId: pcr.project_id, actor, detail: { handling: p.handling } });
}

export async function dispenseRequirement(db: Db, actor: Actor, pcrId: string, reason: string) {
  const pcr = await pcrOrThrow(db, pcrId);
  const def = await db.catalog2ConnectionRequirement.findUnique({ where: { id: pcr.requirement_id }, select: { obligation: true } });
  const staff = ["admin", "leader", "lider"].includes(actor.role ?? "") || actor.role === "system";
  if (def?.obligation === "required" && !staff) throw new ConnectionError("Somente a Allka (líder/administrador) pode dispensar uma conexão obrigatória.", 403, "dispense_forbidden");
  if (!reason || reason.trim().length < 10) throw new ConnectionError("Informe a justificativa da dispensa (mínimo 10 caracteres).", 422, "reason_required");
  await db.projectConnectionRequirement.update({ where: { id: pcrId }, data: { status: "dispensed", dispensed_reason: safeText(reason), resolved_at: new Date() } });
  await logConnection(db, { kind: "dispensed", message: `Conexão "${pcr.label}" dispensada: ${safeText(reason)}`, pcrId, projectId: pcr.project_id, actor });
  const { reevaluateProjectDependencies } = await import("../project-dependencies");
  await recalcProjectConnections(db, pcr.project_id, actor);
  return reevaluateProjectDependencies(db, pcr.project_id);
}

export async function activateCondition(db: Db, actor: Actor, pcrId: string) {
  const pcr = await pcrOrThrow(db, pcrId);
  if (pcr.condition_active) return pcr;
  await db.projectConnectionRequirement.update({ where: { id: pcrId }, data: { condition_active: true, status: pcr.connection_id ? "awaiting_validation" : "awaiting_submission", last_request_at: new Date() } });
  await logConnection(db, { kind: "requested", message: `A condição de "${pcr.label}" ocorreu: a conexão passou a ser necessária.`, pcrId, projectId: pcr.project_id, actor });
  await materializeConnectionRules(db, pcr.project_id, [pcr.project_product_id]);
  return recalcProjectConnections(db, pcr.project_id, actor);
}

export async function confirmLightCheck(db: Db, actor: Actor, pcrId: string, note?: string | null) {
  const pcr = await pcrOrThrow(db, pcrId);
  await db.projectConnectionRequirement.update({ where: { id: pcrId }, data: { light_check_pending: false } });
  await logConnection(db, { kind: "validated", message: `Conferência leve de "${pcr.label}" concluída${note ? `: ${safeText(note)}` : ""}.`, pcrId, projectId: pcr.project_id, actor, detail: { light_check: true } });
  return recalcProjectConnections(db, pcr.project_id, actor);
}

/** Liberação manual por líder/administrador (justificativa obrigatória, registrada). */
export async function manualRelease(db: Db, actor: Actor, ruleId: string, reason: string) {
  if (!reason || reason.trim().length < 10) throw new ConnectionError("Informe a justificativa (mínimo 10 caracteres).", 422, "reason_required");
  const rule = await db.projectDependencyRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.target_kind !== "connection") throw new ConnectionError("Regra de conexão não encontrada.", 404, "rule_not_found");
  await db.projectDependencyRule.update({ where: { id: ruleId }, data: { released_manually_at: new Date(), released_by_user_id: actor.id, release_reason: safeText(reason) } });
  await logConnection(db, { kind: "manual_release", message: `Liberação manual da dependência de conexão: ${safeText(reason)}`, pcrId: rule.target_connection_req_id, projectId: rule.project_id, taskId: rule.task_id, actor });
  return recalcProjectConnections(db, rule.project_id, actor);
}

// ── Troca de executor ───────────────────────────────────────────────────────
/** Reavalia as conexões da tarefa quando o executor muda: revoga o acesso do anterior e exige autorização do novo (só bloqueia esta tarefa). */
export async function onExecutorChanged(db: Db, taskId: string, prev: string | null, next: string | null, actor?: Actor | null) {
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { id: true, title: true, project_id: true } });
  if (!task) return { affected: 0 };
  const rules = await db.projectDependencyRule.findMany({ where: { task_id: taskId, target_kind: "connection" } });
  let affected = 0;
  for (const r of rules) {
    const pcr = r.target_connection_req_id ? await db.projectConnectionRequirement.findUnique({ where: { id: r.target_connection_req_id } }) : null;
    if (!pcr?.connection_id) continue;
    const def = await db.catalog2ConnectionRequirement.findUnique({ where: { id: pcr.requirement_id }, select: { asset_rule: true } });
    const conn = await db.clientConnection.findUnique({ where: { id: pcr.connection_id }, select: { method: true, label: true, company_id: true } });
    if (!conn) continue;
    const bound = def?.asset_rule === "on_executor_change" || EXECUTOR_BOUND_METHODS.includes(conn.method);
    if (!bound) { // mesmo escopo e executor-neutro: mantém, só registra
      await logConnection(db, { kind: "executor_changed", message: `Troca de executor em "${task.title}": "${conn.label}" mantida (não depende da pessoa).`, pcrId: pcr.id, connectionId: pcr.connection_id, projectId: task.project_id, taskId, actor: actor ?? null });
      continue;
    }
    // revoga o acesso de QUALQUER executor anterior (≠ o novo) ligado a esta tarefa
    await db.clientConnectionGrant.updateMany({ where: { connection_id: pcr.connection_id, project_id: task.project_id, AND: [{ executor_user_id: { not: null } }, { executor_user_id: { not: next } }], revoked_at: null, OR: [{ project_task_id: null }, { project_task_id: taskId }] }, data: { revoked_at: new Date(), revoked_by_user_id: actor?.id ?? null, revoke_reason: "troca de executor" } });
    await logConnection(db, { kind: "executor_changed", message: `Troca de executor em "${task.title}": o acesso do executor anterior foi revogado e o novo precisa ser autorizado para "${conn.label}".`, pcrId: pcr.id, connectionId: pcr.connection_id, projectId: task.project_id, taskId, actor: actor ?? null, detail: { previous_executor: prev, new_executor: next } });
    affected++;
  }
  if (affected) await recalcProjectConnections(db, task.project_id, actor ?? null);
  return { affected };
}

/** Gancho chamado depois que uma tarefa recebe/troca de executor (rodízio, atribuição direta, continuidade). Nunca lança. */
export async function afterExecutorAssigned(taskId: string, actor?: Actor | null): Promise<void> {
  try {
    const { prisma } = await import("../prisma");
    const t = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { nomade_responsavel_id: true } });
    if (!t) return;
    await onExecutorChanged(prisma, taskId, null, t.nomade_responsavel_id, actor ?? null);
  } catch (err) {
    console.error("[connections] troca de executor:", err);
  }
}

/** Autoriza o novo executor numa conexão atrelada à pessoa (convite/usuário temporário). */
export async function authorizeExecutor(db: Db, actor: Actor, p: { pcr_id: string; task_id: string; executor_user_id: string }) {
  const pcr = await pcrOrThrow(db, p.pcr_id);
  if (!pcr.connection_id) throw new ConnectionError("Esta exigência ainda não tem conexão.", 409, "no_connection");
  await grantConnection(db, actor, { connection_id: pcr.connection_id, project_id: pcr.project_id, scope: "task", task_ids: [p.task_id], executor_user_id: p.executor_user_id });
  return recalcProjectConnections(db, pcr.project_id, actor);
}

// ── Visões da tarefa ────────────────────────────────────────────────────────
export async function taskConnectionView(db: Db, taskId: string) {
  const rules = await db.projectDependencyRule.findMany({ where: { task_id: taskId, target_kind: "connection" }, orderBy: { created_at: "asc" } });
  const items = [];
  for (const r of rules) {
    const e = await evaluateConnectionRule(db, r);
    const pcr = r.target_connection_req_id ? await db.projectConnectionRequirement.findUnique({ where: { id: r.target_connection_req_id } }) : null;
    items.push({ rule_id: r.id, pcr_id: pcr?.id ?? null, label: pcr?.label ?? "Conexão", kind: r.connection_dep_kind, behavior: r.behavior, stage_ref: r.dependent_stage_key, satisfied: e.satisfied, state: e.state, reason: e.reason, released_manually: !!r.released_manually_at });
  }
  const blocks = await db.projectTaskExternalBlock.findMany({ where: { project_task_id: taskId }, orderBy: { started_at: "desc" } });
  return { connections: items, blocks: blocks.map((b) => ({ id: b.id, reason: b.reason, party: b.responsible_party, detected_by: b.detected_by, started_at: b.started_at, resolved_at: b.resolved_at, blocked_minutes: b.blocked_minutes, deadline_impact_minutes: b.deadline_impact_minutes, reminders_sent: b.reminders_sent, attempts: b.attempts, affects_critical_path: b.affects_critical_path })) };
}

export { revokeGrants };
