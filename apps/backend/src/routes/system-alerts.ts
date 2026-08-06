import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

const router = Router();

// ── Escopo por destinatário ───────────────────────────────────────────────────
//
// SystemAlert nasceu como mural global do Admin ("nômade não encontrado",
// "tarefa atrasada"): todas as rotas aqui liam e escreviam sem olhar para quem
// era o alerta. Com o motor de etapas passaram a existir avisos endereçados
// (`user_id`, ver migration 20260804160000) — e sem escopo eles ficavam
// invisíveis para o dono e visíveis para todos os outros.
//
//   Admin      → alertas gerais (user_id nulo) + os endereçados a ele
//   Demais     → só os endereçados a ele
//
// O escopo entra em TODAS as rotas, não só na listagem: sem isso qualquer
// usuário marcaria como lido ou apagaria o alerta de outro. O `read-all`, em
// particular, marcava o mural inteiro da plataforma.

function escopoDoUsuario(req: Request): Record<string, unknown> {
  const user = req.user!;
  const ehAdmin = user.role === "admin" || user.account_type === "admin";
  return ehAdmin
    ? { OR: [{ user_id: null }, { user_id: user.id }] }
    : { user_id: user.id };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const listSchema = z.object({
  type: z.string().optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  is_read: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── GET /api/system-alerts ────────────────────────────────────────────────────

router.get(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listSchema.safeParse(req.query);
      if (!query.success) {
        res.status(400).json({
          error: "Parâmetros inválidos",
          details: query.error.flatten(),
        });
        return;
      }

      const { type, severity, is_read, entity_type, entity_id, limit, offset } =
        query.data;

      const filtros: Record<string, unknown> = {};
      if (type) filtros.type = type;
      if (severity) filtros.severity = severity;
      if (is_read !== undefined) filtros.is_read = is_read;
      if (entity_type) filtros.entity_type = entity_type;
      if (entity_id) filtros.entity_id = entity_id;

      // AND explícito: o escopo usa OR internamente (admin vê geral + os seus),
      // e espalhar as duas coisas no mesmo objeto faria um sobrescrever o outro.
      const where = { AND: [filtros, escopoDoUsuario(req)] };

      const [total, alerts, unread] = await Promise.all([
        prisma.systemAlert.count({ where }),
        prisma.systemAlert.findMany({
          where,
          orderBy: { created_at: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.systemAlert.count({
          where: { AND: [filtros, escopoDoUsuario(req), { is_read: false }] },
        }),
      ]);

      res.json({ data: alerts, total, unread });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/system-alerts/unread-count ──────────────────────────────────────

router.get(
  "/unread-count",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await prisma.systemAlert.count({
        where: { AND: [{ is_read: false }, escopoDoUsuario(req)] },
      });
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/:id/read ────────────────────────────────────────

router.patch(
  "/:id/read",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // findFirst com escopo em vez de findUnique: alerta de outra pessoa tem
      // de responder "não encontrado", não ser marcado como lido.
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      const updated = await prisma.systemAlert.update({
        where: { id: alert.id },
        data: { is_read: true, read_at: new Date() },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/system-alerts/read-all ────────────────────────────────────────

router.patch(
  "/read-all",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await prisma.systemAlert.updateMany({
        where: { AND: [{ is_read: false }, escopoDoUsuario(req)] },
        data: { is_read: true, read_at: new Date() },
      });
      res.json({ updated: result.count });
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/system-alerts/:id ────────────────────────────────────────────

router.delete(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alert = await prisma.systemAlert.findFirst({
        where: { AND: [{ id: req.params.id as string }, escopoDoUsuario(req)] },
        select: { id: true },
      });
      if (!alert) {
        res.status(404).json({ error: "Alerta não encontrado" });
        return;
      }
      await prisma.systemAlert.delete({ where: { id: alert.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
