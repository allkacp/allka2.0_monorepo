import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { config } from "../config";
import { acceptOffer, declineOffer, RotationError } from "../lib/task-rotation-engine";

const router = Router();
router.use(verifyToken);

// ── Ofertas de tarefa para o Nômade (ata 2026-08, bloco 4/5) ─────────────
// Uma oferta INDIVIDUAL por vez. A identidade vem sempre da sessão
// (`req.user.id` = `TaskOffer.nomade_user_id`), nunca do corpo.

function handleRotationError(err: unknown, res: import("express").Response): boolean {
  if (err instanceof RotationError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  return false;
}

// GET /api/task-offers/mine — oferta(s) pendente(s) do Nômade logado.
router.get("/mine", async (req, res, next) => {
  try {
    const now = Date.now();
    const offers = await prisma.taskOffer.findMany({
      where: { nomade_user_id: req.user!.id, status: "pendente", expires_at: { gt: new Date() } },
      orderBy: { offered_at: "asc" },
    });
    const taskIds = offers.map((o) => o.project_task_id);
    const tasks = taskIds.length
      ? await prisma.projectTask.findMany({
          where: { id: { in: taskIds } },
          select: {
            id: true,
            title: true,
            description: true,
            due_date: true,
            category_snapshot: true,
            name_snapshot: true,
            nomade_responsavel_id: true,
            status: true,
            project: { select: { id: true, title: true } },
            project_product: { select: { product: { select: { name: true, category: true } } } },
          },
        })
      : [];
    const taskById = new Map(tasks.map((t) => [t.id, t]));

    const data = offers
      .map((o) => {
        const t = taskById.get(o.project_task_id);
        if (!t) return null;
        return {
          offer_id: o.id,
          rotation_order: o.rotation_order,
          offered_at: o.offered_at,
          expires_at: o.expires_at,
          seconds_left: Math.max(0, Math.round((o.expires_at.getTime() - now) / 1000)),
          // sinaliza se a tarefa já foi assumida por outra pessoa (a oferta
          // ainda aparece pendente mas o accept vai recusar com mensagem clara)
          already_taken: !!t.nomade_responsavel_id || t.status !== "AGUARDANDO_NOMADE",
          task: {
            id: t.id,
            title: t.title,
            description: t.description,
            due_date: t.due_date,
            project: t.project ? { id: t.project.id, name: t.project.title } : null,
            product: t.project_product?.product?.name ?? t.name_snapshot ?? null,
            category: t.category_snapshot ?? t.project_product?.product?.category ?? null,
          },
        };
      })
      .filter(Boolean);

    res.json({ data, offer_ttl_ms: config.TASK_OFFER_TTL_MS });
  } catch (err) {
    next(err);
  }
});

// POST /api/task-offers/:id/accept
router.post("/:id/accept", async (req, res, next) => {
  try {
    const { taskId } = await acceptOffer(req.params.id as string, req.user!.id);
    res.json({ ok: true, task_id: taskId });
  } catch (err) {
    if (handleRotationError(err, res)) return;
    next(err);
  }
});

// POST /api/task-offers/:id/decline
const declineSchema = z.object({ reason: z.string().trim().max(1000).optional() });
router.post("/:id/decline", async (req, res, next) => {
  try {
    const parsed = declineSchema.safeParse(req.body ?? {});
    const { taskId } = await declineOffer(
      req.params.id as string,
      req.user!.id,
      parsed.success ? parsed.data.reason : undefined,
    );
    res.json({ ok: true, task_id: taskId });
  } catch (err) {
    if (handleRotationError(err, res)) return;
    next(err);
  }
});

export default router;
