import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { syncRoomParticipants } from "../lib/chat-service";
import {
  allEligibleIds,
  approveGroup,
  createGroupApprovalAlerts,
  eligibleMembersFor,
  NoActiveAdminMasterError,
  resolveGroupActorRole,
  resolveGroupApprovalAlerts,
  type GroupActorRole,
} from "../lib/notification-group-service";

const router = Router();
router.use(verifyToken);

// ── Grupos de Notificação com ciclo de aprovação (ata 2026-08, bloco 3/5;
//    reparo do público do alerta) ────────────────────────────────────────
// Admin Master cria ATIVO direto (com sala). Líder SOLICITA (pending),
// escolhendo só membros sob sua responsabilidade → UM alerta amarelo
// INDIVIDUAL para cada Admin Master ATIVO (`user_id` real; nunca `null`,
// nunca visível a admin comum) → qualquer Master aprova (transação: ativo +
// sala + participantes + resolve TODOS os alertas da solicitação) ou rejeita
// (com justificativa). Sem Master ativo → a solicitação é recusada
// transacionalmente (nada de grupo pendente pela metade). Tudo auditado.

const MEMBER_LIMIT = 200;
const NAME_MIN = 2;

function audit(actorId: string, action: string, before: unknown, after: unknown) {
  return prisma.productFeedbackAccessAudit.create({
    data: {
      actor_id: actorId,
      action,
      before_json: before !== undefined ? JSON.stringify(before) : null,
      after_json: after !== undefined ? JSON.stringify(after) : null,
    },
  });
}

function groupSummary(g: {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  status: string;
  owner_user_id: string;
  requested_by_id: string | null;
  approved_by_id: string | null;
  approved_at: Date | null;
  rejected_by_id: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  archived_at: Date | null;
  conversation_id: string | null;
  created_at: Date;
  _count?: { members: number };
}) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    purpose: g.purpose,
    status: g.status,
    owner_user_id: g.owner_user_id,
    requested_by_id: g.requested_by_id,
    approved_by_id: g.approved_by_id,
    approved_at: g.approved_at,
    rejected_by_id: g.rejected_by_id,
    rejected_at: g.rejected_at,
    rejection_reason: g.rejection_reason,
    archived_at: g.archived_at,
    conversation_id: g.conversation_id,
    member_count: g._count?.members ?? 0,
    created_at: g.created_at,
  };
}

// ── GET /eligible-members?q=&page=&page_size= ─────────────────────────────
router.get("/eligible-members", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.page_size) || 20;
    const result = await eligibleMembersFor(req.user!.id, req.user!.account_type, role, { q, page, pageSize });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET / — lista conforme o papel ───────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    const meId = req.user!.id;
    const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    let where: Prisma.NotificationGroupWhereInput;
    if (role === "master") {
      where = {};
    } else if (role === "leader") {
      where = { OR: [{ owner_user_id: meId }, { requested_by_id: meId }] };
    } else {
      // participante comum → só grupos ATIVOS de que é membro
      where = { status: "active", members: { some: { user_id: meId } } };
    }
    const and: Prisma.NotificationGroupWhereInput[] = [where];
    if (statusFilter) and.push({ status: statusFilter });
    if (q) and.push({ name: { contains: q } });

    const groups = await prisma.notificationGroup.findMany({
      where: { AND: and },
      include: { _count: { select: { members: true } } },
      orderBy: { created_at: "desc" },
    });
    res.json({ data: groups.map(groupSummary), role });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — detalhe ───────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    const meId = req.user!.id;
    const group = await prisma.notificationGroup.findUnique({
      where: { id: req.params.id as string },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, account_type: true, is_active: true } } } },
        _count: { select: { members: true } },
      },
    });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    const isOwnerOrRequester = group.owner_user_id === meId || group.requested_by_id === meId;
    const isMember = group.members.some((m) => m.user_id === meId);
    if (role !== "master" && !isOwnerOrRequester && !(isMember && group.status === "active")) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    res.json({
      ...groupSummary(group),
      members: group.members.map((m) => m.user),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST / — Admin Master cria ATIVO direto (com sala) ────────────────────
const createSchema = z.object({
  name: z.string().trim().min(NAME_MIN),
  description: z.string().trim().max(2000).optional(),
  purpose: z.string().trim().max(2000).optional(),
  member_user_ids: z.array(z.string()).max(MEMBER_LIMIT).default([]),
});

router.post("/", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    if (role !== "master") {
      res.status(403).json({ error: "Apenas o Admin Master cria grupos diretamente. Líderes usam “Solicitar grupo”." });
      return;
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const { name, description, purpose, member_user_ids } = parsed.data;
    const memberIds = [...new Set(member_user_ids)].filter((id) => id !== req.user!.id);

    const created = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: {
          title: name,
          type: "group",
          status: "active",
          created_by_id: req.user!.id,
          participants: {
            create: [req.user!.id, ...memberIds].map((uid) => ({
              user_id: uid,
              role: uid === req.user!.id ? "admin" : "member",
            })),
          },
        },
      });
      const group = await tx.notificationGroup.create({
        data: {
          owner_user_id: req.user!.id,
          name,
          description: description || null,
          purpose: purpose || null,
          status: "active",
          approved_by_id: req.user!.id,
          approved_at: new Date(),
          conversation_id: conversation.id,
          members: { create: memberIds.map((user_id) => ({ user_id })) },
        },
        include: { _count: { select: { members: true } } },
      });
      await tx.productFeedbackAccessAudit.create({
        data: {
          actor_id: req.user!.id,
          action: "notification_group.created_active",
          after_json: JSON.stringify({ id: group.id, name, member_count: memberIds.length, conversation_id: conversation.id }),
        },
      });
      return group;
    });

    res.status(201).json(groupSummary(created));
  } catch (err) {
    next(err);
  }
});

// ── POST /requests — Líder solicita (pending) ────────────────────────────
const requestSchema = z.object({
  name: z.string().trim().min(NAME_MIN),
  description: z.string().trim().max(2000).optional(),
  purpose: z.string().trim().min(3, "Explique a finalidade do grupo").max(2000),
  member_user_ids: z.array(z.string()).min(1, "Selecione ao menos um membro").max(MEMBER_LIMIT),
});

router.post("/requests", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    if (role !== "leader") {
      res.status(403).json({ error: "Apenas Líderes solicitam a criação de grupo." });
      return;
    }
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const { name, description, purpose, member_user_ids } = parsed.data;
    const requested = [...new Set(member_user_ids)].filter((id) => id !== req.user!.id);

    // Membro fora do escopo do Líder → BLOQUEIA (não filtra em silêncio).
    const eligible = await allEligibleIds(req.user!.id, req.user!.account_type, "leader");
    const outOfScope = requested.filter((id) => !eligible.has(id));
    if (outOfScope.length > 0) {
      res.status(400).json({
        error: "Alguns membros estão fora do seu escopo de responsabilidade.",
        out_of_scope_user_ids: outOfScope,
      });
      return;
    }
    if (requested.length === 0) {
      res.status(400).json({ error: "Selecione ao menos um membro além de você." });
      return;
    }

    // Duplicata por clique/retry: mesma pessoa, mesmo nome, pending, criado
    // nos últimos 20s → devolve o que já existe (não cria um segundo grupo
    // nem um segundo alerta).
    const recent = await prisma.notificationGroup.findFirst({
      where: {
        requested_by_id: req.user!.id,
        name,
        status: "pending",
        created_at: { gte: new Date(Date.now() - 20_000) },
      },
      include: { _count: { select: { members: true } } },
    });
    if (recent) {
      res.status(200).json({ ...groupSummary(recent), deduped: true });
      return;
    }

    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });

    const group = await prisma.$transaction(async (tx) => {
      const g = await tx.notificationGroup.create({
        data: {
          owner_user_id: req.user!.id,
          requested_by_id: req.user!.id,
          name,
          description: description || null,
          purpose,
          status: "pending",
          members: { create: requested.map((user_id) => ({ user_id })) },
        },
        include: { _count: { select: { members: true } } },
      });
      // Um alerta amarelo INDIVIDUAL por Admin Master ativo. Se não houver
      // nenhum, lança NoActiveAdminMasterError → a transação inteira é
      // desfeita (nada de grupo pendente pela metade, nada de conversa).
      await createGroupApprovalAlerts(
        tx,
        { id: g.id, name: g.name, purpose: g.purpose, requested_by_id: req.user!.id },
        me?.name ?? "Líder",
        requested.length,
      );
      await tx.productFeedbackAccessAudit.create({
        data: {
          actor_id: req.user!.id,
          action: "notification_group.requested",
          after_json: JSON.stringify({ id: g.id, name, member_count: requested.length, purpose }),
        },
      });
      return g;
    });

    res.status(201).json(groupSummary(group));
  } catch (err) {
    if (err instanceof NoActiveAdminMasterError) {
      res.status(err.httpStatus).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// ── POST /:id/approve — Admin Master (transacional) ──────────────────────
router.post("/:id/approve", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    if (role !== "master") {
      res.status(403).json({ error: "Apenas o Admin Master aprova solicitações." });
      return;
    }
    try {
      const { conversationId } = await approveGroup(req.params.id as string, req.user!.id);
      const group = await prisma.notificationGroup.findUnique({
        where: { id: req.params.id as string },
        include: { _count: { select: { members: true } } },
      });
      res.json({ ...groupSummary(group!), conversation_id: conversationId });
    } catch (err) {
      const httpStatus = (err as { httpStatus?: number }).httpStatus;
      if (httpStatus) {
        res.status(httpStatus).json({ error: (err as Error).message });
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/reject — Admin Master (justificativa obrigatória) ──────────
const rejectSchema = z.object({ reason: z.string().trim().min(3, "A justificativa é obrigatória").max(2000) });

router.post("/:id/reject", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    if (role !== "master") {
      res.status(403).json({ error: "Apenas o Admin Master rejeita solicitações." });
      return;
    }
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors.reason?.[0] ?? "Justificativa obrigatória" });
      return;
    }
    const group = await prisma.notificationGroup.findUnique({ where: { id: req.params.id as string } });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    if (group.status !== "pending") {
      res.status(409).json({ error: "Só uma solicitação pendente pode ser rejeitada." });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const g = await tx.notificationGroup.update({
        where: { id: group.id },
        data: {
          status: "rejected",
          rejected_by_id: req.user!.id,
          rejected_at: new Date(),
          rejection_reason: parsed.data.reason,
        },
        include: { _count: { select: { members: true } } },
      });
      await resolveGroupApprovalAlerts(tx, group.id, req.user!.id, "rejected");
      await tx.productFeedbackAccessAudit.create({
        data: {
          actor_id: req.user!.id,
          action: "notification_group.rejected",
          before_json: JSON.stringify({ id: group.id, status: "pending" }),
          after_json: JSON.stringify({ id: group.id, status: "rejected", reason: parsed.data.reason }),
        },
      });
      return g;
    });
    res.json(groupSummary(updated));
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/cancel — Líder cancela a PRÓPRIA solicitação pendente ──────
router.post("/:id/cancel", async (req, res, next) => {
  try {
    const meId = req.user!.id;
    const group = await prisma.notificationGroup.findUnique({ where: { id: req.params.id as string } });
    if (!group || group.requested_by_id !== meId) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    if (group.status !== "pending") {
      res.status(409).json({ error: "Só uma solicitação pendente pode ser cancelada." });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const g = await tx.notificationGroup.update({
        where: { id: group.id },
        data: { status: "archived", archived_by_id: meId, archived_at: new Date() },
        include: { _count: { select: { members: true } } },
      });
      await resolveGroupApprovalAlerts(tx, group.id, meId, "cancelled");
      await tx.productFeedbackAccessAudit.create({
        data: {
          actor_id: meId,
          action: "notification_group.request_cancelled",
          before_json: JSON.stringify({ id: group.id, status: "pending" }),
          after_json: JSON.stringify({ id: group.id, status: "archived" }),
        },
      });
      return g;
    });
    res.json(groupSummary(updated));
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id/archive — Admin Master arquiva grupo ativo (sala fica RO) ──
router.patch("/:id/archive", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    if (role !== "master") {
      res.status(403).json({ error: "Apenas o Admin Master arquiva grupos." });
      return;
    }
    const group = await prisma.notificationGroup.findUnique({ where: { id: req.params.id as string } });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    if (group.status === "archived") {
      res.status(409).json({ error: "Grupo já está arquivado." });
      return;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const g = await tx.notificationGroup.update({
        where: { id: group.id },
        data: { status: "archived", archived_by_id: req.user!.id, archived_at: new Date() },
        include: { _count: { select: { members: true } } },
      });
      if (group.conversation_id) {
        await tx.conversation.update({
          where: { id: group.conversation_id },
          data: { status: "archived", archived_at: new Date() },
        });
      }
      await tx.productFeedbackAccessAudit.create({
        data: {
          actor_id: req.user!.id,
          action: "notification_group.archived",
          before_json: JSON.stringify({ id: group.id, status: group.status }),
          after_json: JSON.stringify({ id: group.id, status: "archived", conversation_archived: !!group.conversation_id }),
        },
      });
      return g;
    });
    res.json(groupSummary(updated));
  } catch (err) {
    next(err);
  }
});

// ── PUT /:id — editar nome/descrição/membros (sincroniza a sala) ─────────
const updateSchema = z.object({
  name: z.string().trim().min(NAME_MIN).optional(),
  description: z.string().trim().max(2000).optional(),
  purpose: z.string().trim().max(2000).optional(),
  member_user_ids: z.array(z.string()).max(MEMBER_LIMIT).optional(),
});

router.put("/:id", async (req, res, next) => {
  try {
    const role = await resolveGroupActorRole(req);
    const meId = req.user!.id;
    const group = await prisma.notificationGroup.findUnique({
      where: { id: req.params.id as string },
      include: { members: { select: { user_id: true } } },
    });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    const canEdit =
      role === "master" ||
      (role === "leader" && group.requested_by_id === meId && group.status === "pending");
    if (!canEdit) {
      res.status(403).json({ error: "Você não pode editar este grupo." });
      return;
    }
    if (group.status === "rejected" || group.status === "archived") {
      res.status(409).json({ error: "Grupo rejeitado/arquivado não pode ser editado." });
      return;
    }
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const { name, description, purpose, member_user_ids } = parsed.data;

    let nextMemberIds: string[] | null = null;
    if (member_user_ids !== undefined) {
      const requested = [...new Set(member_user_ids)].filter((id) => id !== group.owner_user_id);
      const editorRole: GroupActorRole = role === "master" ? "master" : "leader";
      const eligible = await allEligibleIds(
        role === "master" ? meId : group.requested_by_id ?? meId,
        req.user!.account_type,
        editorRole,
      );
      // Master pode incluir quem quiser; Líder só o próprio escopo.
      if (editorRole === "leader") {
        const bad = requested.filter((id) => !eligible.has(id));
        if (bad.length > 0) {
          res.status(400).json({ error: "Membro fora do escopo.", out_of_scope_user_ids: bad });
          return;
        }
      }
      nextMemberIds = requested;
    }

    const before = { name: group.name, description: group.description, purpose: group.purpose, members: group.members.map((m) => m.user_id) };

    const updated = await prisma.$transaction(async (tx) => {
      if (nextMemberIds) {
        await tx.notificationGroupMember.deleteMany({ where: { group_id: group.id } });
        await tx.notificationGroupMember.createMany({
          data: nextMemberIds.map((user_id) => ({ group_id: group.id, user_id })),
        });
      }
      const g = await tx.notificationGroup.update({
        where: { id: group.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(purpose !== undefined ? { purpose: purpose || null } : {}),
        },
        include: { _count: { select: { members: true } } },
      });
      // Sincroniza a sala (idempotente) se o grupo já tem sala.
      if (group.conversation_id) {
        if (name !== undefined && name !== group.name) {
          await tx.conversation.update({ where: { id: group.conversation_id }, data: { title: name } });
        }
        if (nextMemberIds) {
          await syncRoomParticipants(tx, group.conversation_id, [group.owner_user_id, ...nextMemberIds]);
        }
      }
      await tx.productFeedbackAccessAudit.create({
        data: {
          actor_id: meId,
          action: "notification_group.updated",
          before_json: JSON.stringify(before),
          after_json: JSON.stringify({
            name: name ?? group.name,
            description: description ?? group.description,
            purpose: purpose ?? group.purpose,
            members: nextMemberIds ?? before.members,
          }),
        },
      });
      return g;
    });

    res.json(groupSummary(updated));
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — só o dono, e só se o grupo NÃO estiver ativo com sala ──
router.delete("/:id", async (req, res, next) => {
  try {
    const meId = req.user!.id;
    const group = await prisma.notificationGroup.findFirst({
      where: { id: req.params.id as string, owner_user_id: meId },
    });
    if (!group) {
      res.status(404).json({ error: "Grupo não encontrado" });
      return;
    }
    if (group.status === "active" && group.conversation_id) {
      res.status(409).json({ error: "Grupo ativo com sala de chat — use “Arquivar” em vez de excluir." });
      return;
    }
    await prisma.notificationGroup.delete({ where: { id: group.id } });
    await audit(meId, "notification_group.deleted", { id: group.id, status: group.status }, undefined);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
