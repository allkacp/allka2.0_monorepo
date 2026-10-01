// Entregáveis e anexos ESTRUTURADOS (Pedido 3, fase 3).
//
// Definição no catálogo (por tarefa, opcionalmente por etapa) → um registro por tarefa contratada,
// com estado: pendente → enviado → (em revisão) → aprovado / reprovado. Serve para:
//   • cobrar o que precisa ser enviado (por executor, líder, agência, cliente);
//   • travar a conclusão da etapa quando um item obrigatório do executor não foi enviado;
//   • ser alvo de dependência ("espera o entregável X aprovado");
//   • mostrar a cada perfil só o que ele pode ver (mesma visibilidade dos campos operacionais).
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { audienceOf, canSee, VISIBILITY_LEVELS, type Visibility } from "./catalog2-ops";
import { rejectSecrets, AssetError } from "./client-assets";

type Db = PrismaClient | Prisma.TransactionClient;

export const DELIVERABLE_TYPES = ["arquivo", "link", "texto", "registro_sistema", "outro"] as const;
export type DeliverableType = (typeof DELIVERABLE_TYPES)[number];
export const DELIVERABLE_TYPE_LABEL: Record<DeliverableType, string> = {
  arquivo: "Arquivo (link do arquivo)",
  link: "Link",
  texto: "Texto",
  registro_sistema: "Registro de sistema",
  outro: "Outro",
};
export const DELIVERABLE_RESPONSIBLES = ["executor", "lider", "agencia", "cliente", "sistema"] as const;
export type DeliverableResponsible = (typeof DELIVERABLE_RESPONSIBLES)[number];
export const DELIVERABLE_RESPONSIBLE_LABEL: Record<DeliverableResponsible, string> = {
  executor: "Executor (nômade/IA)",
  lider: "Líder",
  agencia: "Agência",
  cliente: "Cliente",
  sistema: "Sistema (automático)",
};
export const DELIVERABLE_STATUSES = ["pendente", "enviado", "em_revisao", "aprovado", "reprovado"] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  em_revisao: "Em revisão",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export class DeliverableError extends Error {
  statusCode: number;
  httpStatus: number;
  constructor(message: string, statusCode = 422) {
    super(message);
    this.statusCode = statusCode;
    this.httpStatus = statusCode;
  }
}

/** Definição de um entregável no catálogo (corpo da API do editor de produto). */
export const deliverableInputSchema = z.object({
  key: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(191),
  description: z.string().max(4000).nullish(),
  type: z.enum(DELIVERABLE_TYPES).default("arquivo"),
  responsible: z.enum(DELIVERABLE_RESPONSIBLES).default("executor"),
  is_required: z.boolean().default(true),
  requires_approval: z.boolean().default(true),
  visibility: z.enum(VISIBILITY_LEVELS).default("client"),
  step_id: z.string().nullish(),
  sort_order: z.number().int().optional(),
});

// ── Materialização (geração da tarefa contratada) ─────────────────────────
export async function materializeTaskDeliverables(
  db: Db,
  p: { catalogTaskId: string; projectTaskId: string; stageIdByStepId: Map<string, string> },
): Promise<number> {
  const defs = await db.catalog2TaskDeliverable.findMany({ where: { task_id: p.catalogTaskId }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
  let n = 0;
  for (const d of defs) {
    let stageId: string | null = null;
    if (d.step_id) {
      stageId = p.stageIdByStepId.get(d.step_id) ?? null;
      if (!stageId) continue; // a etapa não nasceu neste ciclo (ex.: "só na 1ª execução") — o item também não
    }
    await db.projectTaskDeliverable.create({
      data: {
        project_task_id: p.projectTaskId, project_task_stage_id: stageId, catalog2_deliverable_id: d.id, key: d.key, name: d.name, description: d.description,
        type: d.type, responsible: d.responsible, is_required: d.is_required, requires_approval: d.requires_approval, visibility: d.visibility, sort_order: d.sort_order,
        // Item entregue pelo "sistema" não depende de ninguém: nasce enviado (e aprovado, se não exigir aprovação).
        status: d.responsible === "sistema" ? (d.requires_approval ? "enviado" : "aprovado") : "pendente",
      },
    });
    n++;
  }
  return n;
}

// Copia as definições de entregável de uma tarefa para outra (duplicar, importar, nova versão),
// religando cada item à etapa equivalente pela CHAVE da etapa.
export async function copyTaskDeliverables(
  db: Db,
  src: { steps: { id: string; key: string }[]; deliverables: { step_id: string | null; key: string; name: string; description: string | null; type: string; responsible: string; is_required: boolean; requires_approval: boolean; visibility: string; sort_order: number }[] },
  newTaskId: string,
): Promise<number> {
  if (!src.deliverables?.length) return 0;
  const newSteps = await db.catalog2TaskStep.findMany({ where: { task_id: newTaskId }, select: { id: true, key: true } });
  const idByKey = new Map(newSteps.map((s) => [s.key, s.id]));
  const keyBySrcStepId = new Map(src.steps.map((s) => [s.id, s.key]));
  for (const d of src.deliverables) {
    const stepKey = d.step_id ? keyBySrcStepId.get(d.step_id) : undefined;
    await db.catalog2TaskDeliverable.create({
      data: {
        task_id: newTaskId, step_id: stepKey ? idByKey.get(stepKey) ?? null : null, key: d.key, name: d.name, description: d.description, type: d.type,
        responsible: d.responsible, is_required: d.is_required, requires_approval: d.requires_approval, visibility: d.visibility, sort_order: d.sort_order,
      },
    });
  }
  return src.deliverables.length;
}

// ── Quem pode enviar / decidir ────────────────────────────────────────────
export interface DeliverableActor {
  userId: string;
  admin: boolean;
  leader: boolean; // líder responsável OU revisor designado da tarefa
  executor: boolean; // nômade com a tarefa/etapa
  agency: boolean;
  client: boolean;
}

export function canSubmit(actor: DeliverableActor, responsible: string): boolean {
  if (actor.admin) return responsible !== "sistema";
  switch (responsible) {
    case "executor": return actor.executor || actor.leader;
    case "lider": return actor.leader;
    case "agencia": return actor.agency;
    case "cliente": return actor.client;
    default: return false;
  }
}
export function canReview(actor: DeliverableActor): boolean {
  return actor.admin || actor.leader;
}

// ── Leitura filtrada por perfil ───────────────────────────────────────────
export async function listDeliverablesFor(db: Db, taskId: string, viewer: Visibility, actor: DeliverableActor) {
  const rows = await db.projectTaskDeliverable.findMany({ where: { project_task_id: taskId }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], include: { versions: { orderBy: { version: "desc" } } } });
  const staff = canSee(viewer, "executor"); // administração, líder e quem executa veem histórico e consumidores
  // Registro de execução: tarefa/etapa produtora e quem consome o item (dependências que o esperam).
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { id: true, title: true, catalog2_task: { select: { key: true } } } });
  const stageIds = rows.map((r) => r.project_task_stage_id).filter((x): x is string => !!x);
  const stages = stageIds.length ? await db.projectTaskStage.findMany({ where: { id: { in: stageIds } }, select: { id: true, titulo: true } }) : [];
  const stageTitle = new Map(stages.map((s) => [s.id, s.titulo]));
  const consumerRules = staff ? await db.projectDependencyRule.findMany({ where: { target_task_id: taskId, target_kind: "deliverable" }, select: { task_id: true, target_deliverable_key: true, released_manually_at: true } }) : [];
  const consumerTasks = consumerRules.length ? await db.projectTask.findMany({ where: { id: { in: [...new Set(consumerRules.map((r) => r.task_id))] } }, select: { id: true, title: true, status: true } }) : [];
  const consumerById = new Map(consumerTasks.map((t) => [t.id, t]));
  const userIds = [...new Set(rows.flatMap((r) => [r.submitted_by, r.reviewed_by, ...r.versions.map((v) => v.submitted_by), ...r.versions.map((v) => v.reviewed_by)]).filter((x): x is string => !!x && !x.startsWith("ai:")))];
  const users = staff && userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  const nameOf = (id: string | null) => (id ? (id.startsWith("ai:") ? "IA" : users.find((u) => u.id === id)?.name ?? null) : null);
  return rows
    .filter((r) => canSee(viewer, r.visibility as Visibility))
    .map((r) => ({
      version: r.version,
      origin: r.source,
      producer_task: task ? { id: task.id, title: task.title, key: task.catalog2_task?.key ?? null } : null,
      producer_stage: r.project_task_stage_id ? { id: r.project_task_stage_id, title: stageTitle.get(r.project_task_stage_id) ?? null } : null,
      consumers: consumerRules.filter((c) => c.target_deliverable_key === r.key).map((c) => ({ task_id: c.task_id, title: consumerById.get(c.task_id)?.title ?? null, status: consumerById.get(c.task_id)?.status ?? null, released_manually: !!c.released_manually_at })),
      submitted_by_name: staff ? nameOf(r.submitted_by) : null,
      reviewed_by_name: staff ? nameOf(r.reviewed_by) : null,
      approved: r.status === "aprovado",
      approved_at: r.status === "aprovado" ? r.reviewed_at : null,
      rejection_reason: r.status === "reprovado" ? r.review_comment : null,
      history: staff ? r.versions.map((v) => ({ version: v.version, status: v.status, content_url: v.content_url, content_text: v.content_text, content_name: v.content_name, submitted_at: v.submitted_at, submitted_by_name: nameOf(v.submitted_by), reviewed_by_name: nameOf(v.reviewed_by), review_comment: v.review_comment, replaced_at: v.replaced_at })) : [],
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      type: r.type,
      responsible: r.responsible,
      is_required: r.is_required,
      requires_approval: r.requires_approval,
      status: r.status,
      stage_id: r.project_task_stage_id,
      content_url: r.content_url,
      content_text: r.content_text,
      content_name: r.content_name,
      submitted_at: r.submitted_at,
      reviewed_at: r.reviewed_at,
      review_comment: r.review_comment,
      can_submit: canSubmit(actor, r.responsible) && r.status !== "aprovado",
      can_review: canReview(actor) && ["enviado", "em_revisao"].includes(r.status),
    }));
}

// ── Envio ─────────────────────────────────────────────────────────────────
const urlOk = (v: string) => /^https?:\/\/\S+$/i.test(v) && v.length <= 1000;

export interface SubmissionInput {
  content_url?: string | null;
  content_text?: string | null;
  content_name?: string | null;
}

export async function submitDeliverable(db: Db, id: string, actor: DeliverableActor, input: SubmissionInput) {
  try {
    rejectSecrets(input);
  } catch (e) {
    if (e instanceof AssetError) throw new DeliverableError(e.message, 422);
    throw e;
  }
  const d = await db.projectTaskDeliverable.findUnique({ where: { id } });
  if (!d) throw new DeliverableError("Entregável não encontrado.", 404);
  if (!canSubmit(actor, d.responsible)) throw new DeliverableError("Este item deve ser enviado por outro perfil (responsável: " + (DELIVERABLE_RESPONSIBLE_LABEL[d.responsible as DeliverableResponsible] ?? d.responsible) + ").", 403);
  if (d.status === "aprovado") throw new DeliverableError("Este item já foi aprovado.", 409);

  const url = input.content_url?.trim() || null;
  const text = input.content_text?.trim() || null;
  const name = input.content_name?.trim() || null;
  if (url && !urlOk(url)) throw new DeliverableError("Informe um link válido (começando com http:// ou https://).");
  switch (d.type) {
    case "arquivo":
    case "link":
      if (!url) throw new DeliverableError(d.type === "arquivo" ? "Informe o link do arquivo (Drive, Figma, etc.)." : "Informe o link.");
      break;
    case "texto":
      if (!text) throw new DeliverableError("Escreva o texto do entregável.");
      break;
    case "registro_sistema":
    case "outro":
      if (!url && !text) throw new DeliverableError("Informe o link ou descreva o registro entregue.");
      break;
  }
  const status: DeliverableStatus = d.requires_approval ? "enviado" : "aprovado";
  // Substituição: a versão que estava valendo vai para o histórico (nunca se perde) e a nova recebe o número seguinte.
  const replacing = d.status !== "pendente" && !!(d.content_url || d.content_text);
  if (replacing) {
    await db.projectTaskDeliverableVersion.create({
      data: { deliverable_id: d.id, version: d.version, status: d.status, content_url: d.content_url, content_text: d.content_text, content_name: d.content_name, submitted_at: d.submitted_at, submitted_by: d.submitted_by, reviewed_by: d.reviewed_by, review_comment: d.review_comment },
    });
  }
  return db.projectTaskDeliverable.update({
    where: { id },
    data: {
      ...(replacing ? { version: d.version + 1 } : {}),
      status, content_url: url, content_text: text, content_name: name, submitted_at: new Date(), submitted_by: actor.userId,
      // nova versão enviada limpa a decisão anterior
      reviewed_at: d.requires_approval ? null : new Date(), reviewed_by: d.requires_approval ? null : actor.userId, review_comment: null,
    },
  });
}

// ── Decisão (aprovar / reprovar / marcar em revisão) ──────────────────────
export type DeliverableDecision = "aprovar" | "reprovar" | "em_revisao";

export async function reviewDeliverable(db: Db, id: string, actor: DeliverableActor, decisao: DeliverableDecision, comentario?: string | null) {
  if (!canReview(actor)) throw new DeliverableError("Somente o líder/revisor da tarefa ou a administração decide sobre o entregável.", 403);
  const d = await db.projectTaskDeliverable.findUnique({ where: { id } });
  if (!d) throw new DeliverableError("Entregável não encontrado.", 404);
  if (!["enviado", "em_revisao"].includes(d.status)) throw new DeliverableError(`Entregável "${DELIVERABLE_STATUS_LABEL[d.status as DeliverableStatus] ?? d.status}" não está aguardando decisão.`, 409);
  const comment = comentario?.trim() || null;
  if (decisao === "reprovar" && !comment) throw new DeliverableError("Explique o que precisa ser corrigido.");
  const status: DeliverableStatus = decisao === "aprovar" ? "aprovado" : decisao === "reprovar" ? "reprovado" : "em_revisao";
  return db.projectTaskDeliverable.update({
    where: { id },
    data: { status, review_comment: comment, ...(decisao === "em_revisao" ? {} : { reviewed_at: new Date(), reviewed_by: actor.userId }) },
  });
}

// ── Trava da conclusão da etapa ───────────────────────────────────────────
/**
 * Itens OBRIGATÓRIOS do executor/líder que ainda faltam antes de concluir a etapa:
 *  • os ligados a esta etapa;
 *  • os da tarefa toda (sem etapa), quando esta é a última etapa obrigatória a concluir.
 * "Faltam" = pendente ou reprovado (enviado/em revisão/aprovado já contam como entregues).
 */
export async function missingRequiredDeliverablesForStage(db: Db, stageId: string): Promise<string[]> {
  const stage = await db.projectTaskStage.findUnique({ where: { id: stageId }, select: { id: true, project_task_id: true } });
  if (!stage) return [];
  const others = await db.projectTaskStage.count({ where: { project_task_id: stage.project_task_id, id: { not: stage.id }, obrigatoria: true, status: { not: "CONCLUIDA" } } });
  const rows = await db.projectTaskDeliverable.findMany({
    where: {
      project_task_id: stage.project_task_id,
      is_required: true,
      responsible: { in: ["executor", "lider"] },
      status: { in: ["pendente", "reprovado"] },
      OR: [{ project_task_stage_id: stage.id }, ...(others === 0 ? [{ project_task_stage_id: null }] : [])],
    },
    orderBy: { sort_order: "asc" },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}

export async function assertRequiredDeliverablesForStage(db: Db, stageId: string): Promise<void> {
  const missing = await missingRequiredDeliverablesForStage(db, stageId);
  if (missing.length > 0) {
    throw new DeliverableError(`Antes de concluir esta etapa, envie: ${missing.join(", ")}.`, 422);
  }
}

export { audienceOf };
