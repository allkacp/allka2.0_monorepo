import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import {
  resolveChatAccess,
  totalUnreadForUser,
  unreadForConversation,
} from "../lib/chat-service";

const router = Router();

// ── Chat interno (ata 2026-08, bloco 3/5 — restaurado) ───────────────────
// As tabelas conversations/chat_participants/chat_messages nunca tinham sido
// migradas (só existiam no schema.prisma). Migration formal
// `20260828160000_chat_and_notification_group_lifecycle`.
//
// Acesso: SÓ participante ativo (`left_at` nulo) — trocar o id na URL nunca
// entra. Sala arquivada = somente leitura. Usuário inativo não envia. Salas
// de grupo são criadas ao aprovar um Grupo de Notificação, nunca por aqui.

// GET /api/chat/conversations — lista com não-lidas por conversa
router.get("/conversations", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const meId = req.user!.id;

    const where: Prisma.ConversationWhereInput = {
      participants: { some: { user_id: meId, left_at: null } },
    };

    const [total, rows] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        include: {
          participants: {
            where: { left_at: null },
            include: { user: { select: { id: true, name: true, avatar: true, is_active: true } } },
          },
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            select: { id: true, content: true, created_at: true, sender_id: true },
          },
          notification_group: { select: { id: true, name: true, status: true } },
        },
        skip,
        take: limit,
        orderBy: { updated_at: "desc" },
      }),
    ]);

    const data = await Promise.all(
      rows.map(async (c) => {
        const mine = c.participants.find((p) => p.user_id === meId);
        const unread = await unreadForConversation(prisma, c.id, meId, mine?.last_read_at ?? null);
        return {
          id: c.id,
          title: c.title,
          type: c.type,
          status: c.status,
          archived_at: c.archived_at,
          read_only: c.status === "archived",
          notification_group: c.notification_group,
          participants: c.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            avatar: p.user.avatar,
            role: p.role,
          })),
          last_message: c.messages[0]
            ? { id: c.messages[0].id, content: c.messages[0].content, created_at: c.messages[0].created_at, sender_id: c.messages[0].sender_id }
            : null,
          unread_count: unread,
          updated_at: c.updated_at,
        };
      }),
    );

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/unread-count — total de não lidas
router.get("/unread-count", verifyToken, async (req, res, next) => {
  try {
    const count = await totalUnreadForUser(prisma, req.user!.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations — só conversa direta/suporte.
// Sala de GRUPO ("type":"group") é criada exclusivamente ao aprovar um
// Grupo de Notificação (POST /api/notification-groups/:id/approve).
router.post(
  "/conversations",
  verifyToken,
  validate(
    z.object({
      title: z.string().max(200).optional(),
      type: z.enum(["direct", "support"]).default("direct"),
      participant_ids: z.array(z.string()).min(1).max(50),
    }),
  ),
  async (req, res, next) => {
    try {
      const { title, type, participant_ids } = req.body as {
        title?: string;
        type: "direct" | "support";
        participant_ids: string[];
      };
      const meId = req.user!.id;
      const others = [...new Set(participant_ids)].filter((id) => id !== meId);
      if (others.length === 0) {
        res.status(400).json({ error: "Informe ao menos um outro participante." });
        return;
      }

      // Os participantes precisam existir e estar ativos.
      const valid = await prisma.user.findMany({
        where: { id: { in: others }, is_active: true },
        select: { id: true },
      });
      if (valid.length !== others.length) {
        res.status(400).json({ error: "Um ou mais participantes não estão disponíveis." });
        return;
      }

      // Conversa direta 1:1 já existente entre as duas pessoas → reusa (não
      // duplica por clique/retry).
      if (type === "direct" && others.length === 1) {
        const existing = await prisma.conversation.findFirst({
          where: {
            type: "direct",
            AND: [
              { participants: { some: { user_id: meId } } },
              { participants: { some: { user_id: others[0] } } },
            ],
          },
          select: { id: true },
        });
        if (existing) {
          res.status(200).json({ id: existing.id, reused: true });
          return;
        }
      }

      const all = [meId, ...others];
      const conversation = await prisma.conversation.create({
        data: {
          title: title ?? null,
          type,
          created_by_id: meId,
          participants: {
            create: all.map((uid) => ({ user_id: uid, role: uid === meId ? "admin" : "member" })),
          },
        },
        include: { participants: { include: { user: { select: { id: true, name: true, avatar: true } } } } },
      });
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/chat/conversations/:id — detalhe (participantes + status)
router.get("/conversations/:id", verifyToken, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const access = await resolveChatAccess(prisma, id, req.user!.id);
    if (!access.ok) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          where: { left_at: null },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        notification_group: { select: { id: true, name: true, status: true } },
      },
    });
    res.json({
      id: conv!.id,
      title: conv!.title,
      type: conv!.type,
      status: conv!.status,
      read_only: conv!.status === "archived",
      notification_group: conv!.notification_group,
      participants: conv!.participants.map((p) => ({ id: p.user.id, name: p.user.name, avatar: p.user.avatar, role: p.role })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/conversations/:id/messages — histórico (não marca leitura)
router.get("/conversations/:id/messages", verifyToken, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { page, limit, skip } = parsePagination(req.query);

    const access = await resolveChatAccess(prisma, id, req.user!.id);
    if (!access.ok) {
      // 404 seguro — não revela existência de sala fora do escopo.
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }

    const [total, messages] = await Promise.all([
      prisma.chatMessage.count({ where: { conversation_id: id } }),
      prisma.chatMessage.findMany({
        where: { conversation_id: id },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
        skip,
        take: limit,
        orderBy: { created_at: "asc" },
      }),
    ]);

    res.json({ data: messages, total, page, limit, read_only: access.conversationStatus === "archived" });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations/:id/read — marca a sala como lida até agora
router.post("/conversations/:id/read", verifyToken, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const access = await resolveChatAccess(prisma, id, req.user!.id);
    if (!access.ok) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }
    await prisma.chatParticipant.update({
      where: { conversation_id_user_id: { conversation_id: id, user_id: req.user!.id } },
      data: { last_read_at: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations/:id/messages — enviar (idempotente)
router.post(
  "/conversations/:id/messages",
  verifyToken,
  validate(
    z.object({
      content: z.string().trim().min(1).max(4000),
      client_message_id: z.string().trim().min(1).max(120).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const { content, client_message_id } = req.body as { content: string; client_message_id?: string };

      const access = await resolveChatAccess(prisma, id, req.user!.id);
      if (!access.ok) {
        res.status(404).json({ error: "Conversa não encontrada" });
        return;
      }
      if (access.conversationStatus === "archived") {
        res.status(403).json({ error: "Esta sala está arquivada e não recebe novas mensagens." });
        return;
      }
      // Usuário inativo não envia.
      const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { is_active: true } });
      if (!me?.is_active) {
        res.status(403).json({ error: "Sua conta está inativa." });
        return;
      }

      // Idempotência: mesmo client_message_id → devolve a mensagem já criada.
      if (client_message_id) {
        const existing = await prisma.chatMessage.findUnique({
          where: { client_message_id },
          include: { sender: { select: { id: true, name: true, avatar: true } } },
        });
        if (existing) {
          if (existing.conversation_id !== id || existing.sender_id !== req.user!.id) {
            res.status(409).json({ error: "client_message_id já usado em outra mensagem." });
            return;
          }
          res.status(200).json({ ...existing, deduped: true });
          return;
        }
      }

      try {
        const message = await prisma.chatMessage.create({
          data: {
            conversation_id: id,
            sender_id: req.user!.id,
            content,
            ...(client_message_id ? { client_message_id } : {}),
          },
          include: { sender: { select: { id: true, name: true, avatar: true } } },
        });
        await prisma.conversation.update({ where: { id }, data: { updated_at: new Date() } });
        res.status(201).json(message);
      } catch (err) {
        // Corrida de duplo-clique com o MESMO client_message_id.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && client_message_id) {
          const existing = await prisma.chatMessage.findUnique({
            where: { client_message_id },
            include: { sender: { select: { id: true, name: true, avatar: true } } },
          });
          if (existing) {
            res.status(200).json({ ...existing, deduped: true });
            return;
          }
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  },
);

export default router;
