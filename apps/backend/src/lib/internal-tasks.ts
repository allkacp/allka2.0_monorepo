// D2 — Tarefas internas da conta (agência ou empresa): quadro da equipe, com responsável, prazo, comentários e ligação com projeto/passo PLAC.
// Quem pode usar é configurável (mesma marcação de público do produto). A administração vê tudo.
import type { Prisma, PrismaClient } from "@prisma/client";
import { audienceAllows, loadAudienceViewer } from "./catalog2-audience";
import { resolveMyAgencyId } from "./project-scope";

type Db = PrismaClient | Prisma.TransactionClient;

export const TASK_STATUSES = ["todo", "doing", "blocked", "done"] as const;
export const TASK_STATUS_LABEL: Record<string, string> = { todo: "A fazer", doing: "Fazendo", blocked: "Bloqueada", done: "Feita" };
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TASK_PRIORITY_LABEL: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" };

export interface Owner { agency_id: string | null; company_id: string | null }
export type Actor = { id: string; account_type?: string; role?: string };

export async function getSettings(db: Db) {
  return db.internalTaskSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
}

/** A conta do usuário: agência (membro ou dono) ou empresa. Administração/líder não têm conta própria. */
export async function ownerOf(db: Db, user: Actor): Promise<Owner | null> {
  const u = await db.user.findUnique({ where: { id: user.id }, select: { company_id: true, agency_id: true } });
  const agencyId = await resolveMyAgencyId(db as PrismaClient, user.id).catch(() => null);
  if (agencyId || u?.agency_id) return { agency_id: agencyId ?? u?.agency_id ?? null, company_id: null };
  if (u?.company_id) return { agency_id: null, company_id: u.company_id };
  return null;
}

/** O usuário pode usar o módulo? Administração sempre; os demais conforme o público configurado. */
export async function canUseModule(db: Db, user: Actor): Promise<boolean> {
  if (user.role === "admin" || user.account_type === "admin") return true;
  const settings = await getSettings(db);
  const viewer = await loadAudienceViewer(user.id);
  return audienceAllows({ visibility_mode: settings.audience }, viewer);
}

export const sameOwner = (a: Owner, b: Owner) => (a.agency_id ? a.agency_id === b.agency_id : !!a.company_id && a.company_id === b.company_id);
export const ownerWhere = (o: Owner) => (o.agency_id ? { agency_id: o.agency_id } : { company_id: o.company_id });

export function parseChecklist(raw: string | null | undefined): { id: string; text: string; done: boolean }[] {
  try { const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v.filter((x) => x && typeof x.text === "string").map((x) => ({ id: String(x.id ?? ""), text: String(x.text), done: !!x.done })) : []; } catch { return []; }
}

export function taskView(t: Prisma.InternalTaskGetPayload<object>, now = new Date()) {
  const open = t.status !== "done";
  return {
    id: t.id, title: t.title, description: t.description, status: t.status, status_label: TASK_STATUS_LABEL[t.status] ?? t.status,
    priority: t.priority, priority_label: TASK_PRIORITY_LABEL[t.priority] ?? t.priority, due_date: t.due_date, project_id: t.project_id,
    assignee_user_id: t.assignee_user_id, created_by_user_id: t.created_by_user_id, completed_at: t.completed_at, position: t.position,
    checklist: parseChecklist(t.checklist_json), source_kind: t.source_kind, source_id: t.source_id,
    overdue: open && !!t.due_date && t.due_date.getTime() < now.getTime(), agency_id: t.agency_id, company_id: t.company_id, created_at: t.created_at, updated_at: t.updated_at,
  };
}

/** Cria a tarefa interna de um passo PLAC (idempotente por passo). Só para projetos de agência (a conta que executa o PLAC). */
export async function createFromPlacStep(db: Db, step: { id: string; project_id: string; name: string; description: string | null; due_at: Date | null; role_kind: string }, createdBy: string): Promise<boolean> {
  const project = await db.project.findUnique({ where: { id: step.project_id }, select: { agency_id: true, company_id: true, client_id: true, title: true } });
  const owner: Owner | null = project?.agency_id ? { agency_id: project.agency_id, company_id: null } : project?.company_id || project?.client_id ? { agency_id: null, company_id: project.company_id ?? project.client_id } : null;
  if (!owner) return false;
  const exists = await db.internalTask.findUnique({ where: { source_kind_source_id: { source_kind: "plac_step", source_id: step.id } }, select: { id: true } });
  if (exists) return false;
  await db.internalTask.create({
    data: {
      ...owner, title: `PLAC: ${step.name}`, description: `${step.description ?? ""}${step.description ? "\n\n" : ""}Projeto: ${project?.title ?? ""}. Responsável sugerido: ${step.role_kind === "vc" ? "Consultor (VC)" : step.role_kind === "ac" ? "Assistente Consultiva (AC)" : "equipe"}.`,
      due_date: step.due_at, project_id: step.project_id, created_by_user_id: createdBy, source_kind: "plac_step", source_id: step.id, priority: "medium",
    },
  });
  return true;
}

/** Avisa o responsável (ou quem criou) de tarefa vencida e ainda aberta. Um aviso por tarefa. */
export async function sweepInternalTaskOverdue(db: PrismaClient, now = new Date()): Promise<number> {
  const rows = await db.internalTask.findMany({ where: { status: { not: "done" }, due_date: { lt: now }, overdue_alerted_at: null }, take: 300 });
  let n = 0;
  for (const t of rows) {
    const userId = t.assignee_user_id ?? (t.created_by_user_id !== "system" ? t.created_by_user_id : null);
    if (userId) await db.systemAlert.create({
      data: {
        type: "internal_task_overdue", title: `Tarefa interna atrasada: ${t.title}`,
        message: `A tarefa "${t.title}" venceu em ${t.due_date!.toLocaleDateString("pt-BR")} e ainda não foi concluída.`, severity: "warning", category: "alerta",
        entity_type: "internal_task", entity_id: t.id, user_id: userId, dedupe_key: `internal_task_overdue:${t.id}`, action_url: t.agency_id ? "/agency/tarefas-internas" : "/company/tarefas-internas",
      },
    }).catch(() => null);
    await db.internalTask.update({ where: { id: t.id }, data: { overdue_alerted_at: now } });
    n++;
  }
  return n;
}
