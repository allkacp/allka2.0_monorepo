import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import type { ChatMessage } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken, evaluateAdminMasterAccess } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import {
  resolveChatAccess,
  totalUnreadForUser,
  unreadForConversation,
} from "../lib/chat-service";
import {
  canUseChat,
  chatSettingsSchema,
  extensionAllowed,
  getChatSettings,
  saveChatSettings,
  withinWindow,
  type ChatSettings,
} from "../lib/chat-settings";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "../lib/file-storage";
import { isAdminUser } from "../lib/project-scope";

const router = Router();

// ── Chat estilo WhatsApp Web (2026-10-12) ─────────────────────────────────
// Configurações (Configurações > Chat) valem para todas as rotas abaixo: chat
// desligado ou perfil fora da lista → 403 com code "chat_disabled". Anexos
// ficam em uploads/chat/<conversa>/ e só saem por GET .../attachment, com a
// mesma checagem de participante. Mensagem apagada some para todos (texto e
// anexo), mas a linha fica — "Mensagem apagada" na conversa.

const SENDER_SELECT = { id: true, name: true, avatar: true } as const;

async function isAdminMaster(userId: string, accountType: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { admin_profile: { select: { is_master: true, is_active: true } } },
  });
  return evaluateAdminMasterAccess(accountType, u?.admin_profile as Parameters<typeof evaluateAdminMasterAccess>[1]);
}

type Locals = { chatSettings: ChatSettings };

/** Carrega as configurações e barra quem não pode usar o chat. */
async function chatGate(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await getChatSettings();
    if (!canUseChat(settings, req.user!)) {
      res.status(403).json({ error: "O chat não está liberado para o seu perfil.", code: "chat_disabled" });
      return;
    }
    (res.locals as Locals).chatSettings = settings;
    next();
  } catch (err) {
    next(err);
  }
}
const settingsOf = (res: Response) => (res.locals as Locals).chatSettings;

type ReplyPreview = { id: string; content: string; type: string; sender_name: string | null; deleted: boolean };

/** Forma pública da mensagem: apagada não leva texto nem anexo. */
function toDto(
  m: ChatMessage & { sender?: { id: string; name: string; avatar: string | null } | null },
  replies: Map<string, ReplyPreview>,
) {
  const deleted = !!m.deleted_at;
  return {
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    sender: m.sender ?? null,
    content: deleted ? "" : m.content,
    type: m.type,
    attachment: !deleted && m.attachment_file
      ? { name: m.attachment_name, mime: m.attachment_mime, size: m.attachment_size, duration_sec: m.audio_duration_sec }
      : null,
    reply_to: m.reply_to_id ? replies.get(m.reply_to_id) ?? { id: m.reply_to_id, content: "", type: "text", sender_name: null, deleted: true } : null,
    edited_at: m.edited_at,
    deleted_at: m.deleted_at,
    client_message_id: m.client_message_id,
    created_at: m.created_at,
  };
}

async function loadReplies(ids: (string | null)[]): Promise<Map<string, ReplyPreview>> {
  const want = [...new Set(ids.filter((x): x is string => !!x))];
  const map = new Map<string, ReplyPreview>();
  if (want.length === 0) return map;
  const rows = await prisma.chatMessage.findMany({
    where: { id: { in: want } },
    select: { id: true, content: true, type: true, deleted_at: true, sender: { select: { name: true } } },
  });
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      content: r.deleted_at ? "" : r.content.slice(0, 200),
      type: r.type,
      sender_name: r.sender?.name ?? null,
      deleted: !!r.deleted_at,
    });
  }
  return map;
}

/** Valida a mensagem citada: precisa ser da mesma sala. */
async function checkReply(conversationId: string, replyToId: string | undefined, settings: ChatSettings) {
  if (!replyToId) return null;
  if (!settings.allow_reply) return "Responder mensagens está desligado nas configurações do chat.";
  const r = await prisma.chatMessage.findUnique({ where: { id: replyToId }, select: { conversation_id: true } });
  if (!r || r.conversation_id !== conversationId) return "A mensagem respondida não é desta conversa.";
  return null;
}

/** Garante que a pessoa pode escrever na sala (participante, sala ativa, conta ativa). */
async function assertCanWrite(conversationId: string, userId: string, res: Response): Promise<boolean> {
  const access = await resolveChatAccess(prisma, conversationId, userId);
  if (!access.ok) {
    res.status(404).json({ error: "Conversa não encontrada" });
    return false;
  }
  if (access.conversationStatus === "archived") {
    res.status(403).json({ error: "Esta sala está arquivada e não recebe novas mensagens." });
    return false;
  }
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { is_active: true } });
  if (!me?.is_active) {
    res.status(403).json({ error: "Sua conta está inativa." });
    return false;
  }
  return true;
}

function lastMessagePreview(m: { id: string; content: string; created_at: Date; sender_id: string; type: string; deleted_at: Date | null; attachment_name: string | null }) {
  return {
    id: m.id,
    content: m.deleted_at ? "" : m.content,
    created_at: m.created_at,
    sender_id: m.sender_id,
    type: m.type,
    deleted: !!m.deleted_at,
    attachment_name: m.deleted_at ? null : m.attachment_name,
  };
}

// GET /api/chat/settings — qualquer usuário autenticado (o front decide se mostra o chat)
router.get("/settings", verifyToken, async (req, res, next) => {
  try {
    const settings = await getChatSettings();
    const admin_master = isAdminUser(req.user) ? await isAdminMaster(req.user!.id, req.user!.account_type) : false;
    res.json({ settings, can_use: canUseChat(settings, req.user!), can_manage: admin_master });
  } catch (err) {
    next(err);
  }
});

// PUT /api/chat/settings — só Admin Master
router.put("/settings", verifyToken, async (req, res, next) => {
  try {
    if (!isAdminUser(req.user) || !(await isAdminMaster(req.user!.id, req.user!.account_type))) {
      res.status(403).json({ error: "Só o Admin Master altera as configurações do chat.", code: "forbidden" });
      return;
    }
    const parsed = chatSettingsSchema.safeParse(req.body?.settings ?? req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
      return;
    }
    const settings = await saveChatSettings(parsed.data, req.user!.id);
    res.json({ settings, can_use: canUseChat(settings, req.user!), can_manage: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/contacts?q= — com quem dá para começar conversa.
// Admin procura qualquer usuário ativo; os demais veem a administração e quem
// já está em alguma conversa com eles (nunca a base inteira de usuários).
router.get("/contacts", verifyToken, chatGate, async (req, res, next) => {
  try {
    const meId = req.user!.id;
    const q = String(req.query.q ?? "").trim().slice(0, 80);
    const settings = settingsOf(res);
    const admin = isAdminUser(req.user);
    if (!admin && !settings.allow_new_conversations) {
      res.json({ data: [] });
      return;
    }
    const nameFilter: Prisma.UserWhereInput = q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {};
    let scope: Prisma.UserWhereInput = {};
    if (!admin) {
      const mates = await prisma.chatParticipant.findMany({
        where: { left_at: null, conversation: { participants: { some: { user_id: meId, left_at: null } } } },
        select: { user_id: true },
      });
      scope = { OR: [{ account_type: "admin" }, { id: { in: [...new Set(mates.map((m) => m.user_id))] } }] };
    }
    const rows = await prisma.user.findMany({
      where: { AND: [{ is_active: true, id: { not: meId } }, scope, nameFilter] },
      select: { id: true, name: true, avatar: true, account_type: true, email: true },
      orderBy: { name: "asc" },
      take: 30,
    });
    res.json({ data: rows.map((u) => ({ ...u, email: admin ? u.email : undefined })) });
  } catch (err) {
    next(err);
  }
});


// ── Chat interno (ata 2026-08, bloco 3/5 — restaurado) ───────────────────
// As tabelas conversations/chat_participants/chat_messages nunca tinham sido
// migradas (só existiam no schema.prisma). Migration formal
// `20260828160000_chat_and_notification_group_lifecycle`.
//
// Acesso: SÓ participante ativo (`left_at` nulo) — trocar o id na URL nunca
// entra. Sala arquivada = somente leitura. Usuário inativo não envia. Salas
// de grupo são criadas ao aprovar um Grupo de Notificação, nunca por aqui.

// GET /api/chat/conversations — lista com não-lidas por conversa
router.get("/conversations", verifyToken, chatGate, async (req, res, next) => {
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
            select: { id: true, content: true, created_at: true, sender_id: true, type: true, deleted_at: true, attachment_name: true },
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
          last_message: c.messages[0] ? lastMessagePreview(c.messages[0]) : null,
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
router.get("/unread-count", verifyToken, chatGate, async (req, res, next) => {
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
  chatGate,
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
      if (!isAdminUser(req.user) && !settingsOf(res).allow_new_conversations) {
        res.status(403).json({ error: "Iniciar conversas novas está desligado nas configurações do chat." });
        return;
      }
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
router.get("/conversations/:id", verifyToken, chatGate, async (req, res, next) => {
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
router.get("/conversations/:id/messages", verifyToken, chatGate, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { page, limit, skip } = parsePagination(req.query);

    const access = await resolveChatAccess(prisma, id, req.user!.id);
    if (!access.ok) {
      // 404 seguro — não revela existência de sala fora do escopo.
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }

    const [total, messages, others] = await Promise.all([
      prisma.chatMessage.count({ where: { conversation_id: id } }),
      prisma.chatMessage.findMany({
        where: { conversation_id: id },
        include: { sender: { select: SENDER_SELECT } },
        skip,
        take: limit,
        orderBy: { created_at: "asc" },
      }),
      prisma.chatParticipant.findMany({
        where: { conversation_id: id, left_at: null, user_id: { not: req.user!.id } },
        select: { user_id: true, last_read_at: true },
      }),
    ]);
    const replies = await loadReplies(messages.map((m) => m.reply_to_id));

    // Confirmação de leitura (tiques azuis): a mensagem foi lida por TODOS os
    // outros participantes quando é anterior ao menor last_read_at deles.
    const settings = settingsOf(res);
    const readAllUntil =
      settings.show_read_receipts && others.length > 0 && others.every((o) => o.last_read_at)
        ? new Date(Math.min(...others.map((o) => o.last_read_at!.getTime())))
        : null;

    res.json({
      data: messages.map((m) => toDto(m, replies)),
      total,
      page,
      limit,
      read_only: access.conversationStatus === "archived",
      read_all_until: readAllUntil,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations/:id/read — marca a sala como lida até agora
router.post("/conversations/:id/read", verifyToken, chatGate, async (req, res, next) => {
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
  chatGate,
  validate(
    z.object({
      content: z.string().trim().min(1).max(4000),
      client_message_id: z.string().trim().min(1).max(120).optional(),
      reply_to_id: z.string().trim().min(1).max(191).optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const { content, client_message_id, reply_to_id } = req.body as { content: string; client_message_id?: string; reply_to_id?: string };
      const settings = settingsOf(res);
      if (content.length > settings.max_message_chars) {
        res.status(400).json({ error: `A mensagem passou do limite de ${settings.max_message_chars} caracteres.` });
        return;
      }

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
      const replyError = await checkReply(id, reply_to_id, settings);
      if (replyError) {
        res.status(400).json({ error: replyError });
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
          res.status(200).json({ ...toDto(existing, await loadReplies([existing.reply_to_id])), deduped: true });
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
            ...(reply_to_id ? { reply_to_id } : {}),
          },
          include: { sender: { select: SENDER_SELECT } },
        });
        await prisma.conversation.update({ where: { id }, data: { updated_at: new Date() } });
        res.status(201).json(toDto(message, await loadReplies([message.reply_to_id])));
      } catch (err) {
        // Corrida de duplo-clique com o MESMO client_message_id.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && client_message_id) {
          const existing = await prisma.chatMessage.findUnique({
            where: { client_message_id },
            include: { sender: { select: { id: true, name: true, avatar: true } } },
          });
          if (existing) {
            res.status(200).json({ ...toDto(existing, await loadReplies([existing.reply_to_id])), deduped: true });
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

// POST /api/chat/conversations/:id/attachments — imagem, documento ou áudio
// gravado (multipart: file + kind + caption? + duration_sec? + client_message_id?
// + reply_to_id?). O arquivo só é gravado depois de passar por todas as regras.
const attachmentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

router.post(
  "/conversations/:id/attachments",
  verifyToken,
  chatGate,
  (req, res, next) => {
    attachmentUpload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({ error: "Arquivo grande demais." });
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const settings = settingsOf(res);
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Nenhum arquivo enviado." });
        return;
      }
      const kind = String(req.body?.kind ?? "file");
      if (!["image", "file", "audio"].includes(kind)) {
        res.status(400).json({ error: "Tipo de anexo inválido." });
        return;
      }
      const caption = String(req.body?.caption ?? "").trim();
      const clientMessageId = String(req.body?.client_message_id ?? "").trim().slice(0, 120) || undefined;
      const replyToId = String(req.body?.reply_to_id ?? "").trim().slice(0, 191) || undefined;
      const duration = Math.max(0, Math.round(Number(req.body?.duration_sec ?? 0) || 0));

      if (kind === "audio") {
        if (!settings.allow_audio) {
          res.status(403).json({ error: "Mensagens de áudio estão desligadas nas configurações do chat." });
          return;
        }
        if (!/^audio\//.test(file.mimetype) && !/^video\/webm/.test(file.mimetype)) {
          res.status(400).json({ error: "O arquivo enviado não é um áudio." });
          return;
        }
        if (duration > settings.max_audio_seconds + 2) {
          res.status(400).json({ error: `O áudio passou do limite de ${settings.max_audio_seconds} segundos.` });
          return;
        }
      } else if (kind === "image") {
        if (!settings.allow_images) {
          res.status(403).json({ error: "Envio de imagens está desligado nas configurações do chat." });
          return;
        }
        if (!/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) {
          res.status(400).json({ error: "Envie uma imagem PNG, JPG, GIF ou WEBP." });
          return;
        }
      } else {
        if (!settings.allow_files) {
          res.status(403).json({ error: "Envio de documentos está desligado nas configurações do chat." });
          return;
        }
        if (!extensionAllowed(settings, file.originalname)) {
          res.status(400).json({ error: "Este tipo de arquivo não é aceito no chat." });
          return;
        }
      }
      if (file.size > settings.max_file_mb * 1024 * 1024) {
        res.status(413).json({ error: `O arquivo passou do limite de ${settings.max_file_mb} MB.` });
        return;
      }
      if (caption.length > settings.max_message_chars) {
        res.status(400).json({ error: `A legenda passou do limite de ${settings.max_message_chars} caracteres.` });
        return;
      }

      if (!(await assertCanWrite(id, req.user!.id, res))) return;
      const replyError = await checkReply(id, replyToId, settings);
      if (replyError) {
        res.status(400).json({ error: replyError });
        return;
      }

      if (clientMessageId) {
        const existing = await prisma.chatMessage.findUnique({ where: { client_message_id: clientMessageId }, include: { sender: { select: SENDER_SELECT } } });
        if (existing) {
          if (existing.conversation_id !== id || existing.sender_id !== req.user!.id) {
            res.status(409).json({ error: "client_message_id já usado em outra mensagem." });
            return;
          }
          res.status(200).json({ ...toDto(existing, await loadReplies([existing.reply_to_id])), deduped: true });
          return;
        }
      }

      const originalName = (file.originalname || (kind === "audio" ? "audio.webm" : "arquivo")).slice(0, 180);
      const storedName = generateStoredFileName(originalName);
      fs.writeFileSync(`${ensureUploadDir(`chat/${id}`)}/${storedName}`, file.buffer);

      const message = await prisma.chatMessage.create({
        data: {
          conversation_id: id,
          sender_id: req.user!.id,
          content: caption,
          type: kind,
          attachment_name: originalName,
          attachment_file: storedName,
          attachment_mime: file.mimetype.slice(0, 180),
          attachment_size: file.size,
          audio_duration_sec: kind === "audio" ? duration : null,
          ...(clientMessageId ? { client_message_id: clientMessageId } : {}),
          ...(replyToId ? { reply_to_id: replyToId } : {}),
        },
        include: { sender: { select: SENDER_SELECT } },
      });
      await prisma.conversation.update({ where: { id }, data: { updated_at: new Date() } });
      res.status(201).json(toDto(message, await loadReplies([message.reply_to_id])));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/chat/messages/:messageId/attachment — só participante da sala
router.get("/messages/:messageId/attachment", verifyToken, chatGate, async (req, res, next) => {
  try {
    const m = await prisma.chatMessage.findUnique({ where: { id: req.params.messageId as string } });
    if (!m || m.deleted_at || !m.attachment_file) {
      res.status(404).json({ error: "Anexo não encontrado" });
      return;
    }
    const access = await resolveChatAccess(prisma, m.conversation_id, req.user!.id);
    if (!access.ok) {
      res.status(404).json({ error: "Anexo não encontrado" });
      return;
    }
    const filePath = uploadedFilePath(`chat/${m.conversation_id}`, m.attachment_file);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Arquivo não encontrado em disco" });
      return;
    }
    // Só imagem e áudio abrem no navegador com o tipo declarado; o resto vai
    // como download binário (um "documento" nunca é interpretado como página).
    res.setHeader("X-Content-Type-Options", "nosniff");
    const inlineSafe = !!m.attachment_mime && /^(image\/(png|jpe?g|gif|webp)|audio\/[\w.+-]+|video\/webm)(;.*)?$/i.test(m.attachment_mime);
    res.type(inlineSafe ? m.attachment_mime! : "application/octet-stream");
    if (req.query.download === "1" || !inlineSafe) {
      res.download(filePath, m.attachment_name ?? m.attachment_file);
      return;
    }
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(m.attachment_name ?? m.attachment_file)}`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

/** Mensagem própria, de sala onde ainda pode escrever. */
async function loadOwnMessage(req: Request, res: Response) {
  const m = await prisma.chatMessage.findUnique({ where: { id: req.params.messageId as string } });
  if (!m) {
    res.status(404).json({ error: "Mensagem não encontrada" });
    return null;
  }
  const access = await resolveChatAccess(prisma, m.conversation_id, req.user!.id);
  if (!access.ok) {
    res.status(404).json({ error: "Mensagem não encontrada" });
    return null;
  }
  if (m.sender_id !== req.user!.id) {
    res.status(403).json({ error: "Só quem enviou pode alterar a mensagem." });
    return null;
  }
  if (access.conversationStatus === "archived") {
    res.status(403).json({ error: "Esta sala está arquivada — somente leitura." });
    return null;
  }
  if (m.deleted_at) {
    res.status(409).json({ error: "Esta mensagem já foi apagada." });
    return null;
  }
  return m;
}

// PATCH /api/chat/messages/:messageId — editar o texto da própria mensagem
router.patch(
  "/messages/:messageId",
  verifyToken,
  chatGate,
  validate(z.object({ content: z.string().trim().min(1).max(4000) })),
  async (req, res, next) => {
    try {
      const settings = settingsOf(res);
      if (!settings.allow_edit) {
        res.status(403).json({ error: "Editar mensagens está desligado nas configurações do chat." });
        return;
      }
      const m = await loadOwnMessage(req, res);
      if (!m) return;
      if (m.type !== "text") {
        res.status(400).json({ error: "Só mensagens de texto podem ser editadas." });
        return;
      }
      if (!withinWindow(m.created_at, settings.edit_window_minutes)) {
        res.status(403).json({ error: `O prazo para editar (${settings.edit_window_minutes} min) já passou.` });
        return;
      }
      const content = String(req.body.content);
      if (content.length > settings.max_message_chars) {
        res.status(400).json({ error: `A mensagem passou do limite de ${settings.max_message_chars} caracteres.` });
        return;
      }
      const updated = await prisma.chatMessage.update({
        where: { id: m.id },
        data: { content, edited_at: new Date() },
        include: { sender: { select: SENDER_SELECT } },
      });
      res.json(toDto(updated, await loadReplies([updated.reply_to_id])));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/chat/messages/:messageId — apagar para todos (lógico)
router.delete("/messages/:messageId", verifyToken, chatGate, async (req, res, next) => {
  try {
    const settings = settingsOf(res);
    if (!settings.allow_delete) {
      res.status(403).json({ error: "Apagar mensagens está desligado nas configurações do chat." });
      return;
    }
    const m = await loadOwnMessage(req, res);
    if (!m) return;
    if (!withinWindow(m.created_at, settings.delete_window_minutes)) {
      res.status(403).json({ error: `O prazo para apagar (${settings.delete_window_minutes} min) já passou.` });
      return;
    }
    const updated = await prisma.chatMessage.update({
      where: { id: m.id },
      data: { deleted_at: new Date() },
      include: { sender: { select: SENDER_SELECT } },
    });
    // O binário sai do disco — "apagar para todos" não deixa o arquivo para trás.
    if (m.attachment_file) {
      const fp = uploadedFilePath(`chat/${m.conversation_id}`, m.attachment_file);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.json(toDto(updated, new Map()));
  } catch (err) {
    next(err);
  }
});

export default router;
