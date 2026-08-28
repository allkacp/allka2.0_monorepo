import type { Request } from "express";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { evaluateAdminMasterAccess } from "../middleware/auth";
import { resolveMyAgencyId } from "./project-scope";
import { syncRoomParticipants } from "./chat-service";

// ── Serviço de Grupos de Notificação (ata 2026-08, bloco 3/5) ────────────
// Ciclo: Admin Master cria ATIVO direto (com sala); Líder SOLICITA (pending)
// escolhendo só membros sob sua responsabilidade → alerta amarelo pro
// Master → Master aprova (transação: ativo + sala + participantes + resolve
// o alerta) ou rejeita (com justificativa). Tudo auditado.

type Tx = Prisma.TransactionClient | PrismaClient;

export type GroupActorRole = "master" | "leader" | "other";

export async function resolveGroupActorRole(req: Request): Promise<GroupActorRole> {
  const u = req.user!;
  const dbUser = await prisma.user.findUnique({
    where: { id: u.id },
    select: {
      role: true,
      admin_profile: { select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } } },
    },
  });
  if (evaluateAdminMasterAccess(u.account_type, dbUser?.admin_profile ?? null)) return "master";
  if (dbUser?.role === "lider") return "leader";
  return "other";
}

export interface EligiblePage {
  data: Array<{ id: string; name: string; email: string; account_type: string; is_active: boolean }>;
  total: number;
  page: number;
  page_size: number;
}

/**
 * Universo de membros que o solicitante PODE incluir, filtrado no servidor
 * ANTES da paginação. Líder → só pessoas responsáveis por tarefas onde ele é
 * `lider_responsavel_id`. Master → toda a base ativa. Agência/Empresa → seu
 * próprio time. Nunca carrega tudo no cliente.
 */
/** `where` Prisma do universo permitido (sem texto, sem paginação). */
async function buildEligibleWhere(
  actorId: string,
  accountType: string,
  role: GroupActorRole,
): Promise<Prisma.UserWhereInput> {
  if (role === "master" || accountType === "admin") {
    return { is_active: true, id: { not: actorId } };
  }
  if (role === "leader") {
    // Pessoas sob a responsabilidade do líder: assignees/nômades das tarefas
    // onde ele é o líder responsável. Vínculo direto, consultável.
    const tasks = await prisma.projectTask.findMany({
      where: { lider_responsavel_id: actorId },
      select: { assignee_id: true, nomade_responsavel_id: true },
    });
    const ids = [
      ...new Set(
        tasks
          .flatMap((t) => [t.assignee_id, t.nomade_responsavel_id])
          .filter((x): x is string => !!x && x !== actorId),
      ),
    ];
    return { id: { in: ids.length ? ids : ["__none__"] }, is_active: true };
  }
  if (accountType === "agencias") {
    const agencyId = await resolveMyAgencyId(prisma, actorId);
    return agencyId ? { agency_id: agencyId, is_active: true, id: { not: actorId } } : { id: { in: ["__none__"] } };
  }
  if (accountType === "empresas") {
    const me = await prisma.user.findUnique({ where: { id: actorId }, select: { company_id: true } });
    return me?.company_id ? { company_id: me.company_id, is_active: true, id: { not: actorId } } : { id: { in: ["__none__"] } };
  }
  return { id: { in: ["__none__"] } };
}

export async function eligibleMembersFor(
  actorId: string,
  accountType: string,
  role: GroupActorRole,
  opts: { q?: string; page?: number; pageSize?: number } = {},
): Promise<EligiblePage> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const q = (opts.q ?? "").trim();
  const scopeWhere = await buildEligibleWhere(actorId, accountType, role);
  const where: Prisma.UserWhereInput = q
    ? { AND: [scopeWhere, { OR: [{ name: { contains: q } }, { email: { contains: q } }] }] }
    : scopeWhere;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, account_type: true, is_active: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { data: users, total, page, page_size: pageSize };
}

/** Ids permitidos (sem paginação) — valida a lista submetida contra o escopo. */
export async function allEligibleIds(
  actorId: string,
  accountType: string,
  role: GroupActorRole,
): Promise<Set<string>> {
  const where = await buildEligibleWhere(actorId, accountType, role);
  const rows = await prisma.user.findMany({ where, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}

const APPROVAL_ALERT_DEDUPE = (groupId: string) => `notif_group_approval:${groupId}`;

/** Cria (idempotente por dedupe_key) o alerta amarelo Geral para o Admin Master. */
export async function createGroupApprovalAlert(
  db: Tx,
  group: { id: string; name: string; purpose: string | null; requested_by_id: string | null },
  requesterName: string,
  memberCount: number,
): Promise<void> {
  const dedupe = APPROVAL_ALERT_DEDUPE(group.id);
  const existing = await db.systemAlert.findUnique({ where: { dedupe_key: dedupe }, select: { id: true } });
  if (existing) return; // retry / clique duplo não duplica

  await db.systemAlert.create({
    data: {
      type: "notification_group.approval_pending",
      title: "Novo Grupo de Notificação aguardando aprovação",
      message:
        `Grupo "${group.name}" solicitado por ${requesterName}, com ${memberCount} membro${memberCount !== 1 ? "s" : ""}.` +
        (group.purpose ? ` Finalidade: ${group.purpose}` : ""),
      severity: "warning",
      category: "alerta",
      user_id: null, // Geral — visível a todos os admins (escopoDoUsuario)
      entity_type: "notification_group",
      entity_id: group.id,
      action_url: `/admin/grupos-notificacao?review=${group.id}`,
      dedupe_key: dedupe,
      created_by_user_id: group.requested_by_id,
      events: {
        create: {
          event_type: "created",
          description: "Solicitação de Grupo de Notificação registrada — aguardando decisão do Admin Master.",
          actor_user_id: group.requested_by_id,
        },
      },
    },
  });
}

/** Encerra o alerta amarelo depois da decisão (aprovar/rejeitar/cancelar). */
export async function resolveGroupApprovalAlert(
  db: Tx,
  groupId: string,
  actorId: string,
  outcome: "approved" | "rejected" | "cancelled",
): Promise<void> {
  const alert = await db.systemAlert.findUnique({
    where: { dedupe_key: APPROVAL_ALERT_DEDUPE(groupId) },
    select: { id: true, manual_resolved_at: true },
  });
  if (!alert || alert.manual_resolved_at) return;
  const label =
    outcome === "approved" ? "Grupo aprovado." : outcome === "rejected" ? "Grupo rejeitado." : "Solicitação cancelada pelo solicitante.";
  await db.systemAlert.update({
    where: { id: alert.id },
    data: {
      manual_resolved_at: new Date(),
      resolved_by_user_id: actorId,
      resolution_action: "outra_acao",
      resolution_description: label,
      dedupe_key: null, // libera pra um pedido futuro do mesmo grupo, se houver
      // Evento na MESMA transação (nested write) — nunca com o prisma global,
      // que travaria esperando os locks que a própria transação segura.
      events: {
        create: { event_type: "resolved", description: label, actor_user_id: actorId },
      },
    },
  });
}

/**
 * Aprova a solicitação — TRANSACIONAL. Se qualquer passo falhar, nada é
 * gravado (o grupo NUNCA fica ativo sem sala).
 *   1. grupo → active (+ approved_by/at)
 *   2. cria a sala de chat
 *   3. adiciona participantes (dono + membros)
 *   4. vincula conversation_id
 *   5. auditoria
 *   6. encerra o alerta amarelo
 */
export async function approveGroup(groupId: string, masterId: string): Promise<{ conversationId: string }> {
  return prisma.$transaction(async (tx) => {
    const group = await tx.notificationGroup.findUnique({
      where: { id: groupId },
      include: { members: { select: { user_id: true } } },
    });
    if (!group) throw Object.assign(new Error("Grupo não encontrado"), { httpStatus: 404 });
    if (group.status !== "pending") {
      throw Object.assign(new Error("Só uma solicitação pendente pode ser aprovada."), { httpStatus: 409 });
    }

    const participantIds = [...new Set([group.owner_user_id, ...group.members.map((m) => m.user_id)])];

    const conversation = await tx.conversation.create({
      data: {
        title: group.name,
        type: "group",
        status: "active",
        created_by_id: masterId,
        participants: {
          create: participantIds.map((uid) => ({
            user_id: uid,
            role: uid === group.owner_user_id ? "admin" : "member",
          })),
        },
      },
    });

    await tx.notificationGroup.update({
      where: { id: group.id },
      data: {
        status: "active",
        approved_by_id: masterId,
        approved_at: new Date(),
        conversation_id: conversation.id,
      },
    });

    await tx.productFeedbackAccessAudit.create({
      data: {
        actor_id: masterId,
        action: "notification_group.approved",
        before_json: JSON.stringify({ id: group.id, status: "pending" }),
        after_json: JSON.stringify({
          id: group.id,
          status: "active",
          conversation_id: conversation.id,
          participants: participantIds.length,
        }),
      },
    });

    await resolveGroupApprovalAlert(tx, group.id, masterId, "approved");

    return { conversationId: conversation.id };
  });
}
