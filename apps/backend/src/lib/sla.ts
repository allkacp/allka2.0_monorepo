// PRAZOS E SLA ESTRUTURADOS (2026-10-02) — universal e opcional.
//
// Regra de prazo por escopo (produto, modalidade, implantação, ciclo, tarefa, etapa, entregável, aprovação, relatório), em
//   • dias úteis (segunda a sexta)           • dias corridos           • horas úteis (janela comercial de 8h: 09:00–17:00),
// contados a partir de uma âncora (início, pré-requisitos válidos, início/fechamento do ciclo).
// O relógio pode ser PAUSADO (motivo + responsável pela pendência) e RETOMADO: o que faltava continua de onde parou.
//
// Produto sem regras: nenhum relógio é criado e nada muda no prazo atual.
import type { Prisma, PrismaClient } from "@prisma/client";
import { logProjectDecision } from "./catalog2-cycles";

type Db = PrismaClient | Prisma.TransactionClient;

export const SLA_SCOPES = ["product", "modality", "implementation", "cycle", "task", "step", "deliverable", "approval", "report"] as const;
export type SlaScope = (typeof SLA_SCOPES)[number];
export const SLA_SCOPE_LABEL: Record<SlaScope, string> = {
  product: "Produto (entrega total)", modality: "Modalidade de contratação", implementation: "Implantação inicial", cycle: "Ciclo recorrente",
  task: "Tarefa", step: "Etapa", deliverable: "Entregável", approval: "Aprovação", report: "Relatório",
};
export const SLA_UNITS = ["business_days", "calendar_days", "business_hours"] as const;
export type SlaUnit = (typeof SLA_UNITS)[number];
export const SLA_UNIT_LABEL: Record<SlaUnit, string> = { business_days: "dias úteis", calendar_days: "dias corridos", business_hours: "horas úteis" };
/** Âncora: de onde o prazo começa a contar. */
export const SLA_ANCHORS = ["start", "prerequisites_valid", "cycle_start", "cycle_close"] as const;
export type SlaAnchor = (typeof SLA_ANCHORS)[number];
export const SLA_ANCHOR_LABEL: Record<SlaAnchor, string> = {
  start: "Início do trabalho", prerequisites_valid: "Pré-requisitos obrigatórios válidos", cycle_start: "Início do ciclo", cycle_close: "Fechamento do ciclo",
};
export const SLA_MODALITIES = ["any", "avulso", "mensal"] as const;

/** Motivos de pausa do SLA (a parte dependente espera). */
export const SLA_PAUSE_REASONS = {
  acesso_nao_liberado: "Acesso não liberado",
  conexao_vencida_insuficiente: "Conexão vencida ou insuficiente",
  material_nao_enviado: "Material não enviado",
  aprovacao_pendente: "Aprovação pendente",
  verba_indisponivel: "Verba indisponível",
  pagamento_plataforma_pendente: "Pagamento da plataforma de anúncios pendente",
  pagina_destino_indisponivel: "Página de destino indisponível",
  falta_resposta_cliente: "Falta de resposta do cliente",
  bloqueio_revisao_plataforma: "Bloqueio ou revisão da própria plataforma de anúncios",
} as const;
export type SlaPauseReason = keyof typeof SLA_PAUSE_REASONS;
export const SLA_RESPONSIBLES = ["client", "agency", "nomad", "leader", "admin", "platform"] as const;
export const SLA_RESPONSIBLE_LABEL: Record<(typeof SLA_RESPONSIBLES)[number], string> = { client: "Cliente", agency: "Agência", nomad: "Nômade", leader: "Líder", admin: "Administração", platform: "Plataforma externa" };

// ── Aritmética de tempo ───────────────────────────────────────────────────────────────────────────────
export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 17;
export const BUSINESS_MINUTES_PER_DAY = (BUSINESS_END_HOUR - BUSINESS_START_HOUR) * 60;
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** Primeiro instante útil em ou depois de `d` (pula fim de semana e horas fora da janela comercial). */
export function nextBusinessInstant(d: Date): Date {
  const x = new Date(d.getTime());
  for (let guard = 0; guard < 14; guard++) {
    if (isWeekend(x)) { x.setDate(x.getDate() + 1); x.setHours(BUSINESS_START_HOUR, 0, 0, 0); continue; }
    if (x.getHours() < BUSINESS_START_HOUR) { x.setHours(BUSINESS_START_HOUR, 0, 0, 0); return x; }
    if (x.getHours() >= BUSINESS_END_HOUR) { x.setDate(x.getDate() + 1); x.setHours(BUSINESS_START_HOUR, 0, 0, 0); continue; }
    return x;
  }
  return x;
}

/** Soma `minutes` minutos ÚTEIS (janela comercial, segunda a sexta). */
export function addBusinessMinutes(from: Date, minutes: number): Date {
  let cur = nextBusinessInstant(from);
  let left = Math.max(0, Math.round(minutes));
  for (let guard = 0; guard < 100000 && left > 0; guard++) {
    const endOfDay = new Date(cur.getTime()); endOfDay.setHours(BUSINESS_END_HOUR, 0, 0, 0);
    const room = Math.floor((endOfDay.getTime() - cur.getTime()) / 60000);
    if (left <= room) return new Date(cur.getTime() + left * 60000);
    left -= room;
    cur = nextBusinessInstant(new Date(endOfDay.getTime() + 1));
  }
  return cur;
}

/** Minutos úteis entre dois instantes (0 se `to` <= `from`). */
export function businessMinutesBetween(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 0;
  let cur = nextBusinessInstant(from);
  let total = 0;
  for (let guard = 0; guard < 100000 && cur.getTime() < to.getTime(); guard++) {
    const endOfDay = new Date(cur.getTime()); endOfDay.setHours(BUSINESS_END_HOUR, 0, 0, 0);
    const stop = Math.min(endOfDay.getTime(), to.getTime());
    total += Math.max(0, Math.floor((stop - cur.getTime()) / 60000));
    cur = nextBusinessInstant(new Date(endOfDay.getTime() + 1));
  }
  return total;
}

/** Prazo final: âncora + quantidade na unidade escolhida. */
export function computeDue(anchor: Date, amount: number, unit: string): Date {
  if (unit === "calendar_days") return new Date(anchor.getTime() + amount * 86400000);
  if (unit === "business_hours") return addBusinessMinutes(anchor, amount * 60);
  return addBusinessMinutes(anchor, amount * BUSINESS_MINUTES_PER_DAY); // business_days
}

/** Quanto falta (na mesma unidade de contagem) entre `at` e o prazo — base da retomada depois de uma pausa. */
export function remainingMinutes(at: Date, due: Date, unit: string): number {
  if (unit === "calendar_days") return Math.max(0, Math.round((due.getTime() - at.getTime()) / 60000));
  return businessMinutesBetween(at, due);
}
/** Novo prazo ao retomar: o que faltava continua a contar a partir de agora. */
export function dueAfterResume(resumeAt: Date, remaining: number, unit: string): Date {
  if (unit === "calendar_days") return new Date(resumeAt.getTime() + remaining * 60000);
  return addBusinessMinutes(resumeAt, remaining);
}

// ── Validação do cadastro ─────────────────────────────────────────────────────────────────────────────
export interface SlaRuleInput { key?: string; name: string; scope_kind: string; target_key?: string | null; modality?: string; amount: number; unit?: string; anchor?: string; description?: string | null; is_active?: boolean; sort_order?: number }

export async function validateSlaRuleInput(db: Db, versionId: string, r: SlaRuleInput): Promise<string | null> {
  if (!(SLA_SCOPES as readonly string[]).includes(r.scope_kind)) return `Escopo de prazo inválido: "${r.scope_kind}".`;
  if (r.unit && !(SLA_UNITS as readonly string[]).includes(r.unit)) return `Unidade de prazo inválida: "${r.unit}".`;
  if (r.anchor && !(SLA_ANCHORS as readonly string[]).includes(r.anchor)) return `Âncora de prazo inválida: "${r.anchor}".`;
  if (r.modality && !(SLA_MODALITIES as readonly string[]).includes(r.modality)) return `Modalidade inválida: "${r.modality}".`;
  if (!(r.amount > 0)) return "O prazo precisa ser maior que zero.";
  const needsTarget = ["task", "step", "deliverable", "approval", "report"].includes(r.scope_kind);
  if (needsTarget && !r.target_key) return "Escolha o alvo do prazo (tarefa, etapa, entregável, aprovação ou relatório).";
  if (r.anchor === "cycle_close" && r.scope_kind !== "report" && r.scope_kind !== "task") return "A âncora \"fechamento do ciclo\" vale só para relatório ou tarefa.";
  const tasks = await db.catalog2Task.findMany({ where: { version_id: versionId }, include: { steps: { select: { key: true } }, deliverables: { select: { key: true } } } });
  const taskKeys = new Set(tasks.map((t) => t.key));
  const stepRefs = new Set(tasks.flatMap((t) => t.steps.map((s) => `${t.key}:${s.key}`)));
  const delivKeys = new Set(tasks.flatMap((t) => t.deliverables.map((d) => d.key)));
  const t = r.target_key ?? "";
  if (r.scope_kind === "task" && !taskKeys.has(t)) return `A tarefa "${t}" não existe nesta versão.`;
  if (r.scope_kind === "step" && !stepRefs.has(t)) return `A etapa "${t}" não existe (use tarefa:etapa).`;
  if (r.scope_kind === "deliverable" && !delivKeys.has(t)) return `O entregável "${t}" não existe nesta versão.`;
  if (r.scope_kind === "report" && !taskKeys.has(t) && !delivKeys.has(t)) return `O relatório "${t}" precisa ser uma tarefa ou um entregável desta versão.`;
  if (r.scope_kind === "approval") {
    const g = await db.catalog2ApprovalGate.findFirst({ where: { version_id: versionId, key: t }, select: { id: true } });
    if (!g) return `O portão de aprovação "${t}" não existe nesta versão.`;
  }
  return null;
}

// ── Execução: relógios de projeto ─────────────────────────────────────────────────────────────────────
export type ClockStatus = "aguardando" | "correndo" | "pausado" | "concluido";

/** Estado exibido: corre, pausado, concluído ou ESTOURADO (passou do prazo sem concluir). */
export function clockDisplay(c: { status: string; due_at: Date | null }, now = new Date()): "aguardando" | "correndo" | "pausado" | "concluido" | "estourado" {
  if (c.status === "concluido") return "concluido";
  if (c.status === "pausado") return "pausado";
  if (c.status === "aguardando" || !c.due_at) return "aguardando";
  return now.getTime() > c.due_at.getTime() ? "estourado" : "correndo";
}

/** Cria os relógios previstos pelas regras da versão para os produtos contratados. Idempotente (uma linha por regra/alvo/ciclo). */
export async function materializeSlaClocks(db: Db, projectId: string, projectProductIds: string[]): Promise<number> {
  let created = 0;
  const pps = await db.projectProduct.findMany({ where: { id: { in: projectProductIds }, project_id: projectId, catalog2_version_id: { not: null } }, select: { id: true, catalog2_version_id: true, catalog2_period_months: true } });
  for (const pp of pps) {
    const rules = await db.catalog2SlaRule.findMany({ where: { version_id: pp.catalog2_version_id!, is_active: true }, orderBy: { sort_order: "asc" } });
    if (rules.length === 0) continue;
    const tasks = await db.projectTask.findMany({ where: { project_product_id: pp.id }, select: { id: true, occurrence_index: true, cycle_kind: true, catalog2_task: { select: { key: true } } } });
    const modality = (pp.catalog2_period_months ?? 0) > 1 ? "mensal" : "avulso";
    for (const rule of rules) {
      if (rule.modality !== "any" && rule.modality !== modality) continue;
      const mk = async (taskId: string | null, scopeKey: string) => {
        const exists = await db.projectSlaClock.findFirst({ where: { project_id: projectId, project_product_id: pp.id, project_task_id: taskId, rule_key: rule.key, target_key: scopeKey }, select: { id: true } });
        if (exists) return;
        await db.projectSlaClock.create({ data: { project_id: projectId, project_task_id: taskId, project_product_id: pp.id, rule_id: rule.id, rule_key: rule.key, scope_kind: rule.scope_kind, target_key: scopeKey, amount: rule.amount, unit: rule.unit, anchor: rule.anchor, status: "aguardando" } });
        created++;
      };
      if (rule.scope_kind === "task") {
        for (const t of tasks.filter((x) => x.catalog2_task?.key === rule.target_key)) await mk(t.id, `${rule.target_key}#${t.occurrence_index}`);
      } else if (rule.scope_kind === "step") {
        const [tk] = (rule.target_key ?? "").split(":");
        for (const t of tasks.filter((x) => x.catalog2_task?.key === tk)) await mk(t.id, `${rule.target_key}#${t.occurrence_index}`);
      } else if (rule.scope_kind === "deliverable" || rule.scope_kind === "report") {
        const key = rule.target_key ?? "";
        const owner = await db.catalog2TaskDeliverable.findFirst({ where: { key, task: { version_id: pp.catalog2_version_id! } }, select: { task: { select: { key: true } } } });
        const taskKey = owner?.task.key ?? key;
        for (const t of tasks.filter((x) => x.catalog2_task?.key === taskKey)) await mk(t.id, `${key}#${t.occurrence_index}`);
      } else if (rule.scope_kind === "approval") {
        for (const t of tasks) {
          const g = await db.projectApprovalGate.findFirst({ where: { project_task_id: t.id, gate_key: rule.target_key ?? "" }, select: { id: true } });
          if (g) await mk(t.id, `${rule.target_key}#${t.occurrence_index}`);
        }
      } else if (rule.scope_kind === "cycle") {
        const idxs = [...new Set(tasks.filter((t) => t.cycle_kind !== "implementacao" && t.cycle_kind !== "revalidacao").map((t) => t.occurrence_index))];
        for (const i of idxs) await mk(null, `cycle#${i}`);
      } else {
        // produto / modalidade / implantação: um relógio por contratação
        await mk(null, rule.scope_kind);
      }
    }
  }
  return created;
}

/** Pausa os relógios (ainda correndo) de uma tarefa — a parte dependente espera. Registra motivo e responsável. */
export async function pauseTaskClocks(db: Db, taskId: string, p: { reason: string; reasonText?: string | null; party?: string; userId?: string | null; stageKey?: string | null }): Promise<number> {
  const clocks = await db.projectSlaClock.findMany({ where: { project_task_id: taskId, status: { in: ["correndo", "aguardando"] } } });
  let n = 0;
  const now = new Date();
  for (const c of clocks) {
    if (p.stageKey && c.scope_kind === "step" && !(c.target_key ?? "").includes(`:${p.stageKey}#`)) continue;
    await db.projectSlaPause.create({ data: { clock_id: c.id, reason_key: p.reason, reason_text: p.reasonText ?? SLA_PAUSE_REASONS[p.reason as SlaPauseReason] ?? p.reason, responsible_party: p.party ?? "client", responsible_user_id: p.userId ?? null, started_at: now } });
    await db.projectSlaClock.update({ where: { id: c.id }, data: { status: "pausado" } });
    n++;
  }
  return n;
}

/** Retoma os relógios pausados de uma tarefa: o que faltava continua a contar a partir de agora. */
export async function resumeTaskClocks(db: Db, taskId: string, resolvedBy?: string | null, onlyReason?: string): Promise<number> {
  const clocks = await db.projectSlaClock.findMany({ where: { project_task_id: taskId, status: "pausado" }, include: { pauses: { where: { resolved_at: null } } } });
  let n = 0;
  const now = new Date();
  for (const c of clocks) {
    const open = c.pauses.filter((p) => !onlyReason || p.reason_key === onlyReason);
    if (open.length === 0) continue;
    for (const p of open) {
      const minutes = Math.max(0, Math.round((now.getTime() - p.started_at.getTime()) / 60000));
      await db.projectSlaPause.update({ where: { id: p.id }, data: { resolved_at: now, resolved_by: resolvedBy ?? null, minutes } });
    }
    const stillOpen = c.pauses.length - open.length;
    if (stillOpen > 0) continue; // ainda há outro motivo de pausa aberto
    const startedAt = c.pauses.reduce<Date>((min, p) => (p.started_at < min ? p.started_at : min), c.pauses[0].started_at);
    let due = c.due_at;
    if (due) {
      const remaining = remainingMinutes(startedAt, due, c.unit);
      due = dueAfterResume(now, remaining, c.unit);
    }
    const paused = c.paused_minutes + Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60000));
    await db.projectSlaClock.update({ where: { id: c.id }, data: { status: c.anchor_at ? "correndo" : "aguardando", due_at: due, paused_minutes: paused } });
    n++;
  }
  if (n > 0) {
    const t = await db.projectTask.findUnique({ where: { id: taskId }, select: { project_id: true } });
    if (t) await logProjectDecision(db, { projectId: t.project_id, projectTaskId: taskId, kind: "sla_resumed", message: "O prazo (SLA) foi retomado: o tempo que faltava volta a contar." });
  }
  return n;
}

/** Âncora o relógio (primeira vez) e calcula o prazo. Também grava o prazo na tarefa (due_date) quando o escopo é a própria tarefa. */
export async function anchorClock(db: Db, clockId: string, at: Date): Promise<void> {
  const c = await db.projectSlaClock.findUnique({ where: { id: clockId } });
  if (!c || c.anchor_at || c.status === "concluido") return;
  const due = computeDue(at, c.amount, c.unit);
  await db.projectSlaClock.update({ where: { id: c.id }, data: { anchor_at: at, started_at: at, due_at: due, original_due_at: due, status: c.status === "pausado" ? "pausado" : "correndo" } });
  if (c.scope_kind === "task" && c.project_task_id) await db.projectTask.update({ where: { id: c.project_task_id }, data: { due_date: due } });
}

const DONE_TASK = ["CONCLUIDA", "APROVADA"];

/**
 * Sincroniza as âncoras e conclusões dos relógios de um projeto a partir do estado real (idempotente):
 * tarefa liberada → âncora de tarefa/implantação; etapa aberta → âncora de etapa; ciclo iniciado → âncora de ciclo; fechamento do ciclo → relatório.
 */
export async function syncSlaClocks(db: Db, projectId: string): Promise<void> {
  const clocks = await db.projectSlaClock.findMany({ where: { project_id: projectId, status: { not: "concluido" } } });
  if (clocks.length === 0) return;
  const now = new Date();
  for (const c of clocks) {
    const task = c.project_task_id ? await db.projectTask.findUnique({ where: { id: c.project_task_id }, select: { id: true, status: true, data_liberacao_execucao: true, created_at: true, occurrence_index: true, catalog2_task_id: true } }) : null;
    // conclusão
    if (c.scope_kind === "task" || c.scope_kind === "deliverable" || c.scope_kind === "report") {
      if (task && DONE_TASK.includes(task.status)) { await db.projectSlaClock.update({ where: { id: c.id }, data: { status: "concluido", completed_at: now } }); continue; }
    }
    if (c.scope_kind === "step" && task) {
      const [, stepKey] = (c.target_key ?? "").replace(/#\d+$/, "").split(":");
      const step = task.catalog2_task_id ? await db.catalog2TaskStep.findFirst({ where: { key: stepKey, task_id: task.catalog2_task_id }, select: { id: true } }) : null;
      const stage = step ? await db.projectTaskStage.findFirst({ where: { project_task_id: task.id, catalog_step_ref: step.id }, select: { status: true, iniciada_em: true } }) : null;
      if (stage?.status === "CONCLUIDA") { await db.projectSlaClock.update({ where: { id: c.id }, data: { status: "concluido", completed_at: now } }); continue; }
      if (!c.anchor_at && stage?.iniciada_em) await anchorClock(db, c.id, stage.iniciada_em);
      continue;
    }
    if (c.scope_kind === "approval" && task) {
      const gateKey = (c.target_key ?? "").replace(/#\d+$/, "");
      const g = await db.projectApprovalGate.findFirst({ where: { project_task_id: task.id, gate_key: gateKey }, select: { status: true, created_at: true } });
      if (g && (g.status === "aprovada" || g.status === "dispensada")) { await db.projectSlaClock.update({ where: { id: c.id }, data: { status: "concluido", completed_at: now } }); continue; }
      if (!c.anchor_at && g) await anchorClock(db, c.id, g.created_at);
      continue;
    }
    // âncora
    if (!c.anchor_at) {
      if (c.scope_kind === "cycle") {
        const idx = Number((c.target_key ?? "").split("#")[1] ?? 0);
        const first = await db.projectTask.findFirst({ where: { project_product_id: c.project_product_id ?? undefined, occurrence_index: idx, cycle_kind: { notIn: ["implementacao", "revalidacao"] } }, orderBy: { created_at: "asc" }, select: { created_at: true } });
        if (first) await anchorClock(db, c.id, first.created_at);
      } else if (c.anchor === "cycle_close") {
        const idx = Number((c.target_key ?? "").split("#")[1] ?? 0);
        const cyc = await db.projectSlaClock.findFirst({ where: { project_product_id: c.project_product_id, scope_kind: "cycle", target_key: `cycle#${idx}` }, select: { due_at: true } });
        if (cyc?.due_at) await anchorClock(db, c.id, cyc.due_at);
      } else if (c.scope_kind === "implementation") {
        const first = await db.projectTask.findFirst({ where: { project_product_id: c.project_product_id ?? undefined, cycle_kind: { in: ["implementacao", "revalidacao"] }, data_liberacao_execucao: { not: null } }, orderBy: { data_liberacao_execucao: "asc" }, select: { data_liberacao_execucao: true } });
        if (first?.data_liberacao_execucao) await anchorClock(db, c.id, first.data_liberacao_execucao);
        const left = await db.projectTask.count({ where: { project_product_id: c.project_product_id ?? undefined, cycle_kind: { in: ["implementacao", "revalidacao"] }, status: { notIn: [...DONE_TASK, "CANCELADA"] } } });
        const total = await db.projectTask.count({ where: { project_product_id: c.project_product_id ?? undefined, cycle_kind: { in: ["implementacao", "revalidacao"] } } });
        if (total > 0 && left === 0) await db.projectSlaClock.update({ where: { id: c.id }, data: { status: "concluido", completed_at: now } });
      } else if (task && task.data_liberacao_execucao) {
        await anchorClock(db, c.id, task.data_liberacao_execucao);
      } else if (!task && (c.scope_kind === "product" || c.scope_kind === "modality")) {
        const first = await db.projectTask.findFirst({ where: { project_product_id: c.project_product_id ?? undefined, data_liberacao_execucao: { not: null } }, orderBy: { data_liberacao_execucao: "asc" }, select: { data_liberacao_execucao: true } });
        if (first?.data_liberacao_execucao) await anchorClock(db, c.id, first.data_liberacao_execucao);
      }
    } else if (c.scope_kind === "implementation") {
      const left = await db.projectTask.count({ where: { project_product_id: c.project_product_id ?? undefined, cycle_kind: { in: ["implementacao", "revalidacao"] }, status: { notIn: [...DONE_TASK, "CANCELADA"] } } });
      if (left === 0) await db.projectSlaClock.update({ where: { id: c.id }, data: { status: "concluido", completed_at: now } });
    } else if (c.scope_kind === "cycle") {
      const idx = Number((c.target_key ?? "").split("#")[1] ?? 0);
      const left = await db.projectTask.count({ where: { project_product_id: c.project_product_id ?? undefined, occurrence_index: idx, cycle_kind: { notIn: ["implementacao", "revalidacao"] }, status: { notIn: [...DONE_TASK, "CANCELADA"] } } });
      if (left === 0) await db.projectSlaClock.update({ where: { id: c.id }, data: { status: "concluido", completed_at: now } });
    }
  }
}

/** Relógios de uma tarefa (e do produto dela) com estado de exibição, pausas e motivo — para as telas. */
export async function slaView(db: Db, taskId: string) {
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { project_product_id: true, project_id: true } });
  if (!task) return [];
  const clocks = await db.projectSlaClock.findMany({ where: { OR: [{ project_task_id: taskId }, { project_task_id: null, project_product_id: task.project_product_id }] }, include: { pauses: { orderBy: { started_at: "asc" } } }, orderBy: { created_at: "asc" } });
  const now = new Date();
  return clocks.map((c) => ({
    id: c.id, rule_key: c.rule_key, scope_kind: c.scope_kind, scope_label: SLA_SCOPE_LABEL[c.scope_kind as SlaScope] ?? c.scope_kind, target_key: c.target_key,
    amount: c.amount, unit: c.unit, unit_label: SLA_UNIT_LABEL[c.unit as SlaUnit] ?? c.unit, anchor: c.anchor, status: clockDisplay(c, now), anchor_at: c.anchor_at, due_at: c.due_at, original_due_at: c.original_due_at,
    paused_minutes: c.paused_minutes, completed_at: c.completed_at,
    pauses: c.pauses.map((p) => ({ id: p.id, reason_key: p.reason_key, reason: p.reason_text, responsible_party: p.responsible_party, responsible_label: SLA_RESPONSIBLE_LABEL[p.responsible_party as keyof typeof SLA_RESPONSIBLE_LABEL] ?? p.responsible_party, responsible_user_id: p.responsible_user_id, started_at: p.started_at, resolved_at: p.resolved_at, minutes: p.minutes })),
  }));
}
