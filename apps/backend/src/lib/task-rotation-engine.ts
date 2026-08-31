import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { config } from "../config";
import { onlineUserIds } from "./presence-service";
import { recordAlertEvent } from "./alert-events";
import { listActiveAdminMasterIds } from "./notification-group-service";
import { writeAccessAudit } from "./product-feedback-service";

// ── Rodízio de ofertas de tarefa a Nômades (ata 2026-08, bloco 4/5) ──────
// Quando uma tarefa está pronta para receber um Nômade e ainda não tem
// responsável (`status = AGUARDANDO_NOMADE`, `nomade_responsavel_id = null`),
// a plataforma oferece a tarefa a UM Nômade elegível e ONLINE por vez.
// Nunca uma lista disputada. Aceitou → atribui de verdade (fluxo oficial).
// Recusou/expirou → próximo. Esgotou → alerta ao responsável real.

const OFFER_TTL_MS = config.TASK_OFFER_TTL_MS;
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // "ofertas recentes" p/ o desempate do rodízio

export type RotationCloseReason =
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled_task_assigned"
  | "cancelled_new_episode"
  | "cancelled_restart";

export class RotationError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public code?: string,
  ) {
    super(message);
  }
}

function newEpisodeKey(taskId: string): string {
  return `${taskId}:${Date.now()}`;
}

// ── Candidatos elegíveis (sem o filtro de presença) ─────────────────────
// Espelha a lógica de selecionar-nomade.ts: NomadeHabilidade como fonte
// primária, Qualification legada como fallback. Só entra quem cumpre os
// requisitos REAIS já existentes: usuário ativo, perfil de Nômade `ativo`,
// habilitação/skill compatível com a categoria da tarefa. Nunca presume
// elegibilidade só por `account_type`.
export interface RotationCandidate {
  nomadeId: string;
  userId: string | null;
  name: string;
  nota: number;
  tasksCompleted: number;
}

export async function eligibleCandidatesForTask(taskId: string): Promise<RotationCandidate[]> {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      category_snapshot: true,
      name_snapshot: true,
      catalog_task: { select: { category: true, name: true } },
      project_product: { select: { product: { select: { name: true, category: true } } } },
    },
  });
  if (!task) return [];

  const category =
    task.category_snapshot ?? task.catalog_task?.category ?? task.project_product?.product?.category ?? "";
  const productName = task.name_snapshot ?? task.catalog_task?.name ?? task.project_product?.product?.name ?? "";

  const nomadeSelect = {
    id: true,
    user_id: true,
    name: true,
    status: true,
    performance_avg_rating: true,
    tasks_completed_total: true,
    user: { select: { id: true, is_active: true } },
  } as const;

  const byId = new Map<string, RotationCandidate>();
  const push = (n: { id: string; user_id: string | null; name: string; status: string; performance_avg_rating: number; tasks_completed_total: number; user: { id: string; is_active: boolean } | null }, nota: number) => {
    if (n.status !== "ativo") return;
    if (!n.user || !n.user.is_active) return; // usuário bloqueado/inativo nunca é elegível
    const existing = byId.get(n.id);
    const cand: RotationCandidate = {
      nomadeId: n.id,
      userId: n.user_id ?? n.user.id,
      name: n.name,
      nota: nota > 0 ? nota : n.performance_avg_rating,
      tasksCompleted: n.tasks_completed_total,
    };
    if (!existing || cand.nota > existing.nota) byId.set(n.id, cand);
  };

  // Primário: NomadeHabilidade
  const areaOrs: Prisma.NomadeHabilidadeWhereInput[] = [];
  if (category) areaOrs.push({ area: { contains: category } }, { categoria_produto: { contains: category } });
  if (productName) areaOrs.push({ categoria_produto: { contains: productName } });
  const habilidades = await prisma.nomadeHabilidade.findMany({
    where: {
      ativo: true,
      disponibilidade: "disponivel",
      nomade: { status: "ativo" },
      ...(areaOrs.length ? { OR: areaOrs } : {}),
    },
    include: { nomade: { select: nomadeSelect } },
  });
  for (const h of habilidades) push(h.nomade, h.nota_media);

  // Fallback: Qualification legada
  if (byId.size === 0 && category) {
    const quals = await prisma.qualification.findMany({
      where: { status: "habilitado", category: { contains: category.toLowerCase() } },
      include: { nomade: { select: nomadeSelect } },
    });
    for (const q of quals) push(q.nomade, 0);
  }

  return [...byId.values()];
}

// ── Ordem do rodízio (determinística e razoavelmente justa) ─────────────
// Nunca "o primeiro do banco". Prioriza quem está há mais tempo sem receber
// uma oferta e quem recebeu menos ofertas recentes; desempate estável por
// nomadeId.
async function orderCandidates(candidates: RotationCandidate[]): Promise<RotationCandidate[]> {
  if (candidates.length <= 1) return candidates;
  const nomadeIds = candidates.map((c) => c.nomadeId);
  const recent = await prisma.taskOffer.findMany({
    where: { nomade_id: { in: nomadeIds }, offered_at: { gte: new Date(Date.now() - RECENT_WINDOW_MS) } },
    select: { nomade_id: true, offered_at: true },
  });
  const lastOffered = new Map<string, number>();
  const count = new Map<string, number>();
  for (const r of recent) {
    count.set(r.nomade_id, (count.get(r.nomade_id) ?? 0) + 1);
    lastOffered.set(r.nomade_id, Math.max(lastOffered.get(r.nomade_id) ?? 0, r.offered_at.getTime()));
  }
  return [...candidates].sort((a, b) => {
    const la = lastOffered.get(a.nomadeId) ?? 0; // 0 = nunca recebeu → vai primeiro
    const lb = lastOffered.get(b.nomadeId) ?? 0;
    if (la !== lb) return la - lb;
    const ca = count.get(a.nomadeId) ?? 0;
    const cb = count.get(b.nomadeId) ?? 0;
    if (ca !== cb) return ca - cb;
    return a.nomadeId < b.nomadeId ? -1 : 1;
  });
}

// ── Escalonamento (esgotou o rodízio) ──────────────────────────────────
// Destino do alerta amarelo, na ordem obrigatória (ata 2026-08, bloco 5/5 —
// acabamento do bloco 4):
//   1. Líder responsável da tarefa;
//   2. Admin responsável do projeto;
//   3. cada Admin Master ATIVO (um alerta individual por Master — nunca um
//      alerta Geral `user_id: null`, nunca um usuário inventado).
// Se não existir nenhum Admin Master ativo, o chamador registra um erro
// operacional explícito e auditável e NÃO cria alerta.
type EscalationTarget =
  | { kind: "single"; userId: string; relation: "lider_responsavel" | "admin_responsavel" }
  | { kind: "masters"; userIds: string[] }
  | { kind: "none" };

async function resolveEscalationTarget(task: {
  id: string;
  lider_responsavel_id: string | null;
  project_id: string;
}): Promise<EscalationTarget> {
  if (task.lider_responsavel_id) {
    return { kind: "single", userId: task.lider_responsavel_id, relation: "lider_responsavel" };
  }
  const project = await prisma.project.findUnique({
    where: { id: task.project_id },
    select: { admin_responsible_user_id: true },
  });
  if (project?.admin_responsible_user_id) {
    return { kind: "single", userId: project.admin_responsible_user_id, relation: "admin_responsavel" };
  }
  // Sem Líder nem Admin responsável comprovados — cai nos Admin Masters ativos.
  const masterIds = await listActiveAdminMasterIds(prisma);
  if (masterIds.length > 0) return { kind: "masters", userIds: masterIds };
  return { kind: "none" };
}

interface EpisodeCounts {
  offered: number;
  declined: number;
  expired: number;
  pending: number;
}

async function episodeCounts(episodeKey: string): Promise<EpisodeCounts> {
  const rows = await prisma.taskOffer.groupBy({
    by: ["status"],
    where: { episode_key: episodeKey },
    _count: { _all: true },
  });
  const n = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
  return {
    offered: rows.reduce((a, r) => a + r._count._all, 0),
    declined: n("recusada"),
    expired: n("expirada"),
    pending: n("pendente"),
  };
}

async function escalate(
  task: { id: string; title: string; project_id: string; lider_responsavel_id: string | null },
  episodeKey: string,
  noOneOnline: boolean,
): Promise<void> {
  const target = await resolveEscalationTarget(task);

  if (target.kind === "none") {
    // Nunca inventa responsável, nunca cria alerta Geral — erro operacional
    // explícito e auditável (ata 2026-08, bloco 5/5).
    console.error(
      `[task-rotation] tarefa ${task.id} esgotou o rodízio SEM Líder, SEM Admin responsável e SEM Admin Master ativo — nenhum alerta criado. Ação humana necessária.`,
    );
    await writeAccessAudit({
      actorId: null,
      action: "task_rotation.exhausted_no_recipient",
      after: { project_task_id: task.id, project_id: task.project_id, episode_key: episodeKey, no_one_online: noOneOnline },
      reason: "Rodízio esgotado sem Líder, sem Admin responsável do projeto e sem Admin Master ativo.",
    });
    return;
  }

  const counts = await episodeCounts(episodeKey);
  const project = await prisma.project.findUnique({
    where: { id: task.project_id },
    select: { title: true },
  });
  const taskInfo = await prisma.projectTask.findUnique({
    where: { id: task.id },
    select: { category_snapshot: true, name_snapshot: true, project_product: { select: { product: { select: { name: true, category: true } } } } },
  });
  const produto = taskInfo?.name_snapshot ?? taskInfo?.project_product?.product?.name ?? "—";
  const categoria = taskInfo?.category_snapshot ?? taskInfo?.project_product?.product?.category ?? "—";

  const msg = noOneOnline
    ? `Nenhum Nômade elegível estava online para a tarefa "${task.title}" (${categoria}). O rodízio não encontrou candidatos.`
    : `Todos os ${counts.offered} Nômades avaliados no rodízio da tarefa "${task.title}" recusaram (${counts.declined}) ou não responderam a tempo (${counts.expired}).`;
  const fullMessage =
    msg +
    ` Projeto: ${project?.title ?? "—"}. Produto/categoria: ${produto} / ${categoria}. ` +
    `Avaliados: ${counts.offered}${noOneOnline ? "" : `; recusaram: ${counts.declined}; expiraram: ${counts.expired}`}.`;

  // Um alerta por destinatário, deduplicado por tarefa + episódio + pessoa.
  // Assim o fallback para vários Admin Masters não vira 1 alerta Geral nem
  // N alertas colidindo na mesma dedupe_key.
  const recipients: Array<{ userId: string; relation: string }> =
    target.kind === "single"
      ? [{ userId: target.userId, relation: target.relation }]
      : target.userIds.map((userId) => ({ userId, relation: "admin_master" }));

  for (const { userId, relation } of recipients) {
    const dedupe = `task_rotation_exhausted:${episodeKey}:${userId}`;
    const existing = await prisma.systemAlert.findFirst({
      where: { type: "task.rotation_exhausted", dedupe_key: dedupe, manual_resolved_at: null },
      select: { id: true },
    });
    if (existing) continue; // deduplicado — não recria a cada varredura do motor

    await prisma.systemAlert.create({
      data: {
        type: "task.rotation_exhausted",
        title: "Tarefa sem Nômade — rodízio esgotado",
        message: fullMessage,
        severity: "warning",
        category: "alerta",
        user_id: userId, // responsável REAL — nunca Geral (user_id: null)
        entity_type: "project_task",
        entity_id: task.id,
        action_url: `/admin/tarefas/${task.id}`,
        dedupe_key: dedupe,
        events: {
          create: {
            event_type: "created",
            description: `Rodízio de Nômade esgotado (${relation}).`,
            metadata_json: JSON.stringify({ episode_key: episodeKey, no_one_online: noOneOnline, relation, ...counts }),
          },
        },
      },
    });
  }
}

async function resolveExhaustedAlert(taskId: string, episodeKey: string | null, actorUserId: string | null, reason: string): Promise<void> {
  // Resolve TODOS os alertas de "rodízio esgotado" da tarefa (o Líder / Admin
  // responsável E os Admin Masters do fallback). O episódio é irrelevante:
  // atribuir ou reiniciar torna qualquer alerta de esgotamento anterior
  // obsoleto. `episodeKey` fica só como parâmetro informativo/histórico.
  void episodeKey;
  const where: Prisma.SystemAlertWhereInput = {
    type: "task.rotation_exhausted",
    entity_id: taskId,
    manual_resolved_at: null,
  };
  const alerts = await prisma.systemAlert.findMany({ where, select: { id: true } });
  for (const a of alerts) {
    await prisma.systemAlert.update({
      where: { id: a.id },
      data: { manual_resolved_at: new Date(), resolved_by_user_id: actorUserId, resolution_action: "outra_acao", resolution_description: reason, dedupe_key: null },
    });
    await recordAlertEvent(a.id, { eventType: "resolved", description: reason, actorUserId });
  }
}

// ── Avança o rodízio de UMA tarefa ─────────────────────────────────────
// Expira ofertas vencidas; se há oferta pendente válida → aguarda; senão
// cria a próxima oferta ou escala. Chamado pelo job de fundo e após uma
// recusa (para responsividade).
export async function advanceRotation(taskId: string): Promise<{ action: "waiting" | "offered" | "escalated" | "closed"; offerId?: string }> {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      status: true,
      project_id: true,
      nomade_responsavel_id: true,
      lider_responsavel_id: true,
      rotation_episode_key: true,
    },
  });
  if (!task) return { action: "closed" };

  // Tarefa saiu de AGUARDANDO_NOMADE ou já tem responsável → encerra ofertas pendentes.
  if (task.status !== "AGUARDANDO_NOMADE" || task.nomade_responsavel_id) {
    await prisma.taskOffer.updateMany({
      where: { project_task_id: taskId, status: "pendente" },
      data: { status: "cancelada", close_reason: "cancelled_task_assigned", responded_at: new Date() },
    });
    return { action: "closed" };
  }

  const now = new Date();

  // Expira ofertas pendentes vencidas.
  await prisma.taskOffer.updateMany({
    where: { project_task_id: taskId, status: "pendente", expires_at: { lt: now } },
    data: { status: "expirada", close_reason: "expired", responded_at: now },
  });

  // Ainda há oferta pendente válida? Aguarda.
  const pending = await prisma.taskOffer.findFirst({
    where: { project_task_id: taskId, status: "pendente", expires_at: { gte: now } },
    select: { id: true },
  });
  if (pending) return { action: "waiting", offerId: pending.id };

  // Garante um episódio.
  let episodeKey = task.rotation_episode_key;
  if (!episodeKey) {
    episodeKey = newEpisodeKey(taskId);
    await prisma.projectTask.update({ where: { id: taskId }, data: { rotation_episode_key: episodeKey } });
  }

  // Quem já foi ofertado NESTE episódio não volta imediatamente.
  const offeredThisEpisode = await prisma.taskOffer.findMany({
    where: { episode_key: episodeKey },
    select: { nomade_id: true },
  });
  const alreadyOffered = new Set(offeredThisEpisode.map((o) => o.nomade_id));
  const nextOrder = offeredThisEpisode.length + 1;

  const candidates = await eligibleCandidatesForTask(taskId);
  const userIds = candidates.map((c) => c.userId).filter((x): x is string => !!x);
  const online = await onlineUserIds(prisma, userIds, now);
  const pool = candidates.filter((c) => c.userId && online.has(c.userId) && !alreadyOffered.has(c.nomadeId));

  if (pool.length === 0) {
    const noOneOnline = candidates.filter((c) => c.userId && online.has(c.userId)).length === 0;
    await escalate(task, episodeKey, noOneOnline);
    return { action: "escalated" };
  }

  const ordered = await orderCandidates(pool);
  const chosen = ordered[0];
  const offer = await prisma.taskOffer.create({
    data: {
      project_task_id: taskId,
      nomade_id: chosen.nomadeId,
      nomade_user_id: chosen.userId,
      episode_key: episodeKey,
      rotation_order: nextOrder,
      status: "pendente",
      offered_at: now,
      expires_at: new Date(now.getTime() + OFFER_TTL_MS),
    },
  });
  return { action: "offered", offerId: offer.id };
}

// ── Inicia um novo episódio de rodízio (chamado no /release, sem etapas) ──
export async function startTaskRotation(taskId: string): Promise<void> {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, nomade_responsavel_id: true },
  });
  if (!task || task.nomade_responsavel_id) return;

  await prisma.$transaction([
    prisma.taskOffer.updateMany({
      where: { project_task_id: taskId, status: "pendente" },
      data: { status: "cancelada", close_reason: "cancelled_new_episode", responded_at: new Date() },
    }),
    prisma.projectTask.update({
      where: { id: taskId },
      data: { status: "AGUARDANDO_NOMADE", rotation_episode_key: newEpisodeKey(taskId) },
    }),
  ]);
  await advanceRotation(taskId);
}

// ── Aceitar oferta (transacional, com CAS) ─────────────────────────────
export async function acceptOffer(offerId: string, sessionUserId: string): Promise<{ taskId: string }> {
  return prisma.$transaction(async (tx) => {
    const offer = await tx.taskOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new RotationError("Oferta não encontrada.", 404);
    if (offer.nomade_user_id !== sessionUserId) throw new RotationError("Esta oferta não é sua.", 403);
    if (offer.status !== "pendente") throw new RotationError("Esta oferta não está mais pendente.", 409, "offer_not_pending");
    if (offer.expires_at.getTime() < Date.now()) {
      await tx.taskOffer.update({ where: { id: offer.id }, data: { status: "expirada", close_reason: "expired", responded_at: new Date() } });
      throw new RotationError("Esta oferta expirou.", 409, "offer_expired");
    }

    // Compare-and-swap: só atribui se a tarefa AINDA estiver sem Nômade.
    const swap = await tx.projectTask.updateMany({
      where: { id: offer.project_task_id, nomade_responsavel_id: null, status: "AGUARDANDO_NOMADE" },
      data: {
        nomade_responsavel_id: offer.nomade_id,
        status: "EM_EXECUCAO",
        data_inicio_execucao: new Date(),
        rotation_episode_key: null,
      },
    });
    if (swap.count === 0) {
      // Outra pessoa venceu a corrida (ou a tarefa mudou de estado).
      await tx.taskOffer.update({
        where: { id: offer.id },
        data: { status: "cancelada", close_reason: "cancelled_task_assigned", responded_at: new Date() },
      });
      throw new RotationError("Esta tarefa já foi assumida por outra pessoa.", 409, "task_already_assigned");
    }

    await tx.taskOffer.update({
      where: { id: offer.id },
      data: { status: "aceita", close_reason: "accepted", responded_at: new Date(), responded_by_user_id: sessionUserId },
    });
    // Cancela qualquer outra oferta pendente da mesma tarefa.
    await tx.taskOffer.updateMany({
      where: { project_task_id: offer.project_task_id, status: "pendente", id: { not: offer.id } },
      data: { status: "cancelada", close_reason: "cancelled_task_assigned", responded_at: new Date() },
    });

    await tx.taskAssignmentHistory.create({
      data: {
        project_task_id: offer.project_task_id,
        nomade_id: offer.nomade_id,
        criterio: "rodizio",
        automatico: false,
        resultado: "atribuido",
        detalhes: JSON.stringify({ offer_id: offer.id, episode_key: offer.episode_key, rotation_order: offer.rotation_order }),
      },
    });

    return { taskId: offer.project_task_id };
  }).then(async (r) => {
    // Fora da transação: se havia alerta de esgotamento, resolve (o problema acabou).
    await resolveExhaustedAlert(r.taskId, null, sessionUserId, "Um Nômade aceitou a oferta — tarefa atribuída.");
    return r;
  });
}

// ── Recusar oferta ────────────────────────────────────────────────────
export async function declineOffer(offerId: string, sessionUserId: string, reason?: string): Promise<{ taskId: string }> {
  const offer = await prisma.taskOffer.findUnique({ where: { id: offerId } });
  if (!offer) throw new RotationError("Oferta não encontrada.", 404);
  if (offer.nomade_user_id !== sessionUserId) throw new RotationError("Esta oferta não é sua.", 403);
  if (offer.status !== "pendente") throw new RotationError("Esta oferta não está mais pendente.", 409, "offer_not_pending");

  await prisma.taskOffer.update({
    where: { id: offer.id },
    data: {
      status: "recusada",
      close_reason: "declined",
      responded_at: new Date(),
      responded_by_user_id: sessionUserId,
      decline_reason: reason?.trim() ? reason.trim().slice(0, 1000) : null,
    },
  });
  // Avança imediatamente para o próximo (o job de fundo também cobriria).
  await advanceRotation(offer.project_task_id).catch(() => null);
  return { taskId: offer.project_task_id };
}

// ── Situação do rodízio (para o responsável) ───────────────────────────
export interface RotationStatus {
  task_id: string;
  status: string;
  nomade_responsavel_id: string | null;
  episode_key: string | null;
  phase:
    | "atribuida"
    | "procurando"
    | "oferta_enviada"
    | "recusada"
    | "expirada"
    | "escalada"
    | "inativo";
  pending_offer: { id: string; nomade_id: string; rotation_order: number; offered_at: Date; expires_at: Date } | null;
  counts: EpisodeCounts;
  offers: Array<{
    id: string;
    nomade_id: string;
    nomade_name: string | null;
    rotation_order: number;
    status: string;
    offered_at: Date;
    expires_at: Date;
    responded_at: Date | null;
    decline_reason: string | null;
    close_reason: string | null;
  }>;
  escalated: boolean;
}

export async function getRotationStatus(taskId: string): Promise<RotationStatus | null> {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, nomade_responsavel_id: true, rotation_episode_key: true },
  });
  if (!task) return null;

  const episodeKey = task.rotation_episode_key;
  const offers = episodeKey
    ? await prisma.taskOffer.findMany({ where: { episode_key: episodeKey }, orderBy: { rotation_order: "asc" } })
    : [];
  const nomadeNames = new Map<string, string>();
  if (offers.length) {
    const ns = await prisma.nomade.findMany({ where: { id: { in: [...new Set(offers.map((o) => o.nomade_id))] } }, select: { id: true, name: true } });
    ns.forEach((n) => nomadeNames.set(n.id, n.name));
  }
  const counts = episodeKey ? await episodeCounts(episodeKey) : { offered: 0, declined: 0, expired: 0, pending: 0 };
  const pending = offers.find((o) => o.status === "pendente" && o.expires_at.getTime() >= Date.now()) ?? null;
  const escalated = episodeKey
    ? !!(await prisma.systemAlert.findFirst({
        where: {
          type: "task.rotation_exhausted",
          // Um alerta por destinatário: dedupe_key = "...:<episode>:<userId>".
          dedupe_key: { startsWith: `task_rotation_exhausted:${episodeKey}:` },
          manual_resolved_at: null,
        },
        select: { id: true },
      }))
    : false;

  let phase: RotationStatus["phase"];
  if (task.nomade_responsavel_id) phase = "atribuida";
  else if (task.status !== "AGUARDANDO_NOMADE") phase = "inativo";
  else if (escalated) phase = "escalada";
  else if (pending) phase = "oferta_enviada";
  else if (offers.some((o) => o.status === "recusada")) phase = "recusada";
  else if (offers.some((o) => o.status === "expirada")) phase = "expirada";
  else phase = "procurando";

  return {
    task_id: task.id,
    status: task.status,
    nomade_responsavel_id: task.nomade_responsavel_id,
    episode_key: episodeKey,
    phase,
    pending_offer: pending
      ? { id: pending.id, nomade_id: pending.nomade_id, rotation_order: pending.rotation_order, offered_at: pending.offered_at, expires_at: pending.expires_at }
      : null,
    counts,
    offers: offers.map((o) => ({
      id: o.id,
      nomade_id: o.nomade_id,
      nomade_name: nomadeNames.get(o.nomade_id) ?? null,
      rotation_order: o.rotation_order,
      status: o.status,
      offered_at: o.offered_at,
      expires_at: o.expires_at,
      responded_at: o.responded_at,
      decline_reason: o.decline_reason,
      close_reason: o.close_reason,
    })),
    escalated,
  };
}

// ── Reiniciar o rodízio (Líder/Admin responsável) ─────────────────────
export async function restartRotation(taskId: string, actorUserId: string, actorIsAdmin: boolean): Promise<void> {
  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      nomade_responsavel_id: true,
      lider_responsavel_id: true,
      project_id: true,
      rotation_episode_key: true,
    },
  });
  if (!task) throw new RotationError("Tarefa não encontrada.", 404);
  if (task.nomade_responsavel_id) throw new RotationError("A tarefa já tem um Nômade responsável.", 409);

  const project = await prisma.project.findUnique({ where: { id: task.project_id }, select: { admin_responsible_user_id: true } });
  const authorized =
    actorIsAdmin || task.lider_responsavel_id === actorUserId || project?.admin_responsible_user_id === actorUserId;
  if (!authorized) throw new RotationError("Você não pode reiniciar o rodízio desta tarefa.", 403);

  const prevEpisode = task.rotation_episode_key;
  await prisma.$transaction([
    prisma.taskOffer.updateMany({
      where: { project_task_id: taskId, status: "pendente" },
      data: { status: "cancelada", close_reason: "cancelled_restart", responded_at: new Date() },
    }),
    prisma.projectTask.update({
      where: { id: taskId },
      data: { status: "AGUARDANDO_NOMADE", rotation_episode_key: newEpisodeKey(taskId) },
    }),
  ]);
  await resolveExhaustedAlert(taskId, prevEpisode, actorUserId, "Rodízio reiniciado pelo responsável.");
  await advanceRotation(taskId);
}

// ── Job de fundo ──────────────────────────────────────────────────────
let running = false;
export async function runTaskRotationOnce(): Promise<{ scanned: number }> {
  const tasks = await prisma.projectTask.findMany({
    where: { status: "AGUARDANDO_NOMADE", nomade_responsavel_id: null },
    select: { id: true },
    take: 500,
  });
  for (const t of tasks) {
    try {
      await advanceRotation(t.id);
    } catch (err) {
      console.error(`[task-rotation] falha ao avançar rodízio da tarefa ${t.id}:`, err);
    }
  }
  return { scanned: tasks.length };
}

export async function runTaskRotationOnceGuarded(): Promise<{ scanned: number } | null> {
  if (running) return null;
  running = true;
  try {
    return await runTaskRotationOnce();
  } finally {
    running = false;
  }
}
