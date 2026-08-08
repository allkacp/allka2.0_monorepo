import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

/**
 * Notificações da administração.
 *
 * A tela /admin/notifications trabalhava inteiramente em memória — mensagens,
 * regras e histórico eram arrays dentro do componente, e nada era gravado.
 *
 * O que existe aqui é só o que a plataforma consegue cumprir. A tela oferecia
 * cinco canais (email, whatsapp, popup, banner, push) e **nenhum deles existe
 * no backend**: não há serviço de email, SMS ou push configurado. O canal que
 * funciona é o aviso dentro da plataforma, que já roda em `system_alerts` — é
 * por ele que o motor de etapas avisa os aprovadores.
 *
 * Então: enviar uma notificação cria `system_alerts` para o público-alvo, e o
 * histórico é a lista desses alertas. Nada de registrar entregas que não
 * aconteceram.
 */

const messageSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  is_active: z.boolean().optional(),
});

const ruleSchema = z.object({
  message_id: z.string().min(1),
  name: z.string().min(1),
  is_active: z.boolean().optional(),
  target_account_types: z.array(z.string()).optional(),
  target_roles: z.array(z.string()).optional(),
});

const sendSchema = z.object({
  /** Regra que define o público. Sem ela, é preciso mandar `user_ids`. */
  rule_id: z.string().optional(),
  /** Destinatários explícitos, quando o envio não passa por uma regra. */
  user_ids: z.array(z.string()).optional(),
  /** Para onde a pessoa vai ao clicar no aviso. */
  action_url: z.string().optional(),
});

// ─── Mensagens ────────────────────────────────────────────────────────────────

router.get("/messages", verifyToken, requireRole("admin"), async (_req, res, next) => {
  try {
    const messages = await prisma.notificationMessage.findMany({
      include: {
        rules: true,
        _count: { select: { alerts: true } },
      },
      orderBy: { created_at: "desc" },
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/messages",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "create"),
  validate(messageSchema),
  async (req, res, next) => {
    try {
      const message = await prisma.notificationMessage.create({
        data: { ...req.body, created_by: req.user!.id },
      });
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/messages/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "edit"),
  validate(messageSchema.partial()),
  async (req, res, next) => {
    try {
      const message = await prisma.notificationMessage.update({
        where: { id: req.params.id as string },
        data: req.body,
      });
      res.json(message);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/messages/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "delete"),
  async (req, res, next) => {
    try {
      await prisma.notificationMessage.delete({
        where: { id: req.params.id as string },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─── Regras de público ────────────────────────────────────────────────────────

router.get("/rules", verifyToken, requireRole("admin"), async (_req, res, next) => {
  try {
    const rules = await prisma.notificationRule.findMany({
      include: { message: { select: { id: true, name: true, title: true } } },
      orderBy: { created_at: "desc" },
    });
    res.json(rules);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/rules",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "create"),
  validate(ruleSchema),
  async (req, res, next) => {
    try {
      const rule = await prisma.notificationRule.create({ data: req.body });
      res.status(201).json(rule);
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/rules/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "edit"),
  validate(ruleSchema.partial()),
  async (req, res, next) => {
    try {
      const rule = await prisma.notificationRule.update({
        where: { id: req.params.id as string },
        data: req.body,
      });
      res.json(rule);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/rules/:id",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "delete"),
  async (req, res, next) => {
    try {
      await prisma.notificationRule.delete({
        where: { id: req.params.id as string },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ─── Envio ────────────────────────────────────────────────────────────────────

/**
 * Resolve o público de uma regra. Listas vazias ou ausentes = todos os
 * usuários ativos — decisão deliberada: uma regra sem filtro é "avisar todo
 * mundo", não "não avisar ninguém".
 */
async function destinatariosDaRegra(ruleId: string): Promise<string[]> {
  const rule = await prisma.notificationRule.findUnique({
    where: { id: ruleId },
  });
  if (!rule) return [];

  const tipos = (rule.target_account_types as string[] | null) ?? [];
  const funcoes = (rule.target_roles as string[] | null) ?? [];

  const where: Record<string, unknown> = { is_active: true, status: "ativo" };
  if (tipos.length > 0) where.account_type = { in: tipos };
  if (funcoes.length > 0) where.role = { in: funcoes };

  const users = await prisma.user.findMany({ where, select: { id: true } });
  return users.map((u) => u.id);
}

router.post(
  "/messages/:id/send",
  verifyToken,
  requireRole("admin"),
  requirePermission("sistema", "create"),
  validate(sendSchema),
  async (req, res, next) => {
    try {
      const messageId = req.params.id as string;
      const message = await prisma.notificationMessage.findUnique({
        where: { id: messageId },
      });
      if (!message) {
        res.status(404).json({ error: "Mensagem não encontrada" });
        return;
      }
      if (!message.is_active) {
        res.status(422).json({ error: "Mensagem inativa não pode ser enviada" });
        return;
      }

      const { rule_id, user_ids, action_url } = req.body as z.infer<
        typeof sendSchema
      >;

      const destinatarios = rule_id
        ? await destinatariosDaRegra(rule_id)
        : (user_ids ?? []);

      if (destinatarios.length === 0) {
        res.status(422).json({
          error:
            "Nenhum destinatário: informe uma regra com público ou uma lista de usuários.",
        });
        return;
      }

      // Um alerta por pessoa. É o mesmo canal que o resto da plataforma usa,
      // então a notificação aparece no painel de avisos junto com as demais.
      await prisma.systemAlert.createMany({
        data: destinatarios.map((userId) => ({
          type: "notificacao_admin",
          title: message.title,
          message: message.content,
          severity: "info",
          user_id: userId,
          action_url: action_url ?? null,
          notification_message_id: message.id,
        })),
      });

      res.status(201).json({
        sent: destinatarios.length,
        channel: "in_app",
        message_id: message.id,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Histórico ────────────────────────────────────────────────────────────────

// O histórico é a lista de alertas nascidos de uma mensagem. `is_read` conta
// como "aberto" — é a única confirmação de leitura que existe de verdade.
router.get("/history", verifyToken, requireRole("admin"), async (req, res, next) => {
  try {
    const messageId =
      typeof req.query.message_id === "string" ? req.query.message_id : undefined;

    const alerts = await prisma.systemAlert.findMany({
      where: {
        notification_message_id: messageId ?? { not: null },
      },
      include: {
        notification_message: { select: { id: true, name: true, title: true } },
      },
      orderBy: { created_at: "desc" },
      take: 500,
    });

    const userIds = [...new Set(alerts.map((a) => a.user_id).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds as string[] } },
      select: { id: true, name: true, email: true },
    });
    const porId = new Map(users.map((u) => [u.id, u]));

    res.json(
      alerts.map((a) => ({
        id: a.id,
        message_id: a.notification_message_id,
        message_name: a.notification_message?.name ?? null,
        message_title: a.title,
        message_content: a.message,
        recipient_id: a.user_id,
        recipient_name: a.user_id ? (porId.get(a.user_id)?.name ?? null) : null,
        recipient_email: a.user_id ? (porId.get(a.user_id)?.email ?? null) : null,
        // Canal único e real: aviso dentro da plataforma.
        channel: "in_app",
        status: a.is_read ? "opened" : "sent",
        sent_at: a.created_at,
        opened_at: a.read_at,
      })),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
