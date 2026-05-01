import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

// GET /api/chat/conversations
router.get("/conversations", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [total, data] = await Promise.all([
      prisma.conversation.count({
        where: { participants: { some: { user_id: req.user!.id } } },
      }),
      prisma.conversation.findMany({
        where: { participants: { some: { user_id: req.user!.id } } },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            select: { content: true, created_at: true, is_read: true },
          },
          _count: { select: { messages: true } },
        },
        skip,
        take: limit,
        orderBy: { updated_at: "desc" },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations
router.post(
  "/conversations",
  verifyToken,
  validate(
    z.object({
      title: z.string().optional(),
      type: z.enum(["direct", "group", "support"]).default("direct"),
      participant_ids: z.array(z.string()).min(1),
    })
  ),
  async (req, res, next) => {
    try {
      const { title, type, participant_ids } = req.body as {
        title?: string;
        type: string;
        participant_ids: string[];
      };

      const allParticipants = [...new Set([req.user!.id, ...participant_ids])];

      const conversation = await prisma.conversation.create({
        data: {
          title,
          type,
          participants: {
            create: allParticipants.map((uid) => ({
              user_id: uid,
              role: uid === req.user!.id ? "admin" : "member",
            })),
          },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, avatar: true } } },
          },
        },
      });

      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/chat/conversations/:id/messages
router.get("/conversations/:id/messages", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    // Verify participant
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        conversation_id_user_id: {
          conversation_id: (req.params.id as string),
          user_id: req.user!.id,
        },
      },
    });

    if (!participant) {
      res.status(403).json({ error: "Sem acesso a esta conversa" });
      return;
    }

    const [total, messages] = await Promise.all([
      prisma.chatMessage.count({ where: { conversation_id: (req.params.id as string) } }),
      prisma.chatMessage.findMany({
        where: { conversation_id: (req.params.id as string) },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "asc" },
      }),
    ]);

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        conversation_id: (req.params.id as string),
        sender_id: { not: req.user!.id },
        is_read: false,
      },
      data: { is_read: true },
    });

    res.json({ data: messages, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations/:id/messages
router.post(
  "/conversations/:id/messages",
  verifyToken,
  validate(z.object({ content: z.string().min(1) })),
  async (req, res, next) => {
    try {
      // Verify participant
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          conversation_id_user_id: {
            conversation_id: (req.params.id as string),
            user_id: req.user!.id,
          },
        },
      });

      if (!participant) {
        res.status(403).json({ error: "Sem acesso a esta conversa" });
        return;
      }

      const message = await prisma.chatMessage.create({
        data: {
          conversation_id: (req.params.id as string),
          sender_id: req.user!.id,
          content: (req.body as { content: string }).content,
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: (req.params.id as string) },
        data: { updated_at: new Date() },
      });

      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
