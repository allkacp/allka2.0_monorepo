import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

const router = Router();

// ── Middleware: require lider role ────────────────────────────────────────────

function requireLider(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Não autenticado" });
  if (user.role !== "lider" && user.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a líderes" });
  }
  next();
}

router.use(verifyToken as any);
router.use(requireLider);

// ── GET /api/lider/me ─────────────────────────────────────────────────────────

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        account_type: true,
        avatar: true,
        phone: true,
        position: true,
        lider_areas: {
          where: { ativo: true },
          select: {
            id: true,
            area_nome: true,
            categorias_permitidas: true,
            produtos_permitidos: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ── Helper: get allowed categories for a lider ────────────────────────────────

async function getAllowedCategories(userId: string, userRole: string): Promise<string[] | null> {
  if (userRole === "admin") return null; // admin sees all
  const areas = await prisma.liderArea.findMany({
    where: { user_id: userId, ativo: true },
    select: { categorias_permitidas: true },
  });
  const cats: string[] = [];
  for (const area of areas) {
    if (area.categorias_permitidas) {
      try {
        const parsed = JSON.parse(area.categorias_permitidas);
        if (Array.isArray(parsed)) cats.push(...parsed);
      } catch {}
    }
  }
  return cats;
}

// ── GET /api/lider/tasks ──────────────────────────────────────────────────────

router.get("/tasks", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { status, page = "1", limit = "20" } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const allowedCats = await getAllowedCategories(user.id, user.role);

    // Build category filter using product category
    const categoryFilter = allowedCats !== null && allowedCats.length > 0
      ? {
          OR: [
            { category_snapshot: { in: allowedCats } },
            { product: { category: { in: allowedCats } } },
          ],
        }
      : {};

    const statusFilter = status ? { status } : {};

    const where = {
      ...statusFilter,
      ...categoryFilter,
    };

    const [tasks, total] = await Promise.all([
      prisma.projectTask.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              client: { select: { name: true } },
            },
          },
          project_product: {
            select: {
              product_name_snapshot: true,
              product: { select: { name: true, category: true } },
            },
          },
        },
      }),
      prisma.projectTask.count({ where }),
    ]);

    res.json({ tasks, total, page: parseInt(page), limit: take });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/lider/tasks/counts ───────────────────────────────────────────────

router.get("/tasks/counts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const allowedCats = await getAllowedCategories(user.id, user.role);

    const categoryFilter = allowedCats !== null && allowedCats.length > 0
      ? {
          OR: [
            { category_snapshot: { in: allowedCats } },
            { product: { category: { in: allowedCats } } },
          ],
        }
      : {};

    const [paraLancamento, emExecucao, atrasadas, aprovadas, devolvidas] = await Promise.all([
      prisma.projectTask.count({ where: { status: "PARA_LANCAMENTO", ...categoryFilter } }),
      prisma.projectTask.count({ where: { status: "EM_EXECUCAO", ...categoryFilter } }),
      prisma.projectTask.count({
        where: {
          due_date: { lt: new Date() },
          status: { notIn: ["CONCLUIDA", "CANCELADA", "APROVADA"] },
          ...categoryFilter,
        },
      }),
      prisma.projectTask.count({ where: { status: "APROVADA", ...categoryFilter } }),
      prisma.projectTask.count({ where: { status: "REPROVADA", ...categoryFilter } }),
    ]);

    res.json({ paraLancamento, emExecucao, atrasadas, aprovadas, devolvidas });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/lider/tasks/:id/approve ───────────────────────────────────────
// For tasks WITHOUT stages: marks the whole task as APROVADA.
// For tasks WITH stages: advances the current EM_ANDAMENTO stage.

router.patch("/tasks/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const stages = await prisma.projectTaskStage.findMany({
      where: { project_task_id: id },
      orderBy: { ordem: "asc" },
    });

    if (stages.length === 0) {
      // Simple task (no stages) — approve the whole task
      const task = await prisma.projectTask.update({
        where: { id },
        data: { status: "APROVADA", updated_at: new Date() },
      });
      return res.json({ task });
    }

    // Stage-aware approval: advance the current EM_ANDAMENTO stage
    const currentStage = stages.find((s) => s.status === "EM_ANDAMENTO");
    if (!currentStage) {
      return res.status(422).json({
        error: "Nenhuma etapa em andamento para aprovar.",
        suggestion: "Use PATCH /stages/:stageId/approve para aprovar uma etapa específica.",
      });
    }

    return res.redirect(307, `/api/lider/tasks/${id}/stages/${currentStage.id}/approve`);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/lider/tasks/:id/stages/:stageId/approve ───────────────────────
// Approve a specific stage: mark CONCLUIDA and unlock the next stage.

router.patch("/tasks/:id/stages/:stageId/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, stageId } = req.params;

    const stage = await prisma.projectTaskStage.findFirst({
      where: { id: stageId, project_task_id: id },
    });
    if (!stage) {
      return res.status(404).json({ error: "Etapa não encontrada" });
    }
    if (stage.status !== "EM_ANDAMENTO") {
      return res.status(422).json({
        error: "Apenas etapas em andamento podem ser aprovadas.",
        current_status: stage.status,
      });
    }

    // Mark current stage as CONCLUIDA
    await prisma.projectTaskStage.update({
      where: { id: stageId },
      data: { status: "CONCLUIDA", updated_at: new Date() },
    });

    // Find next stage
    const allStages = await prisma.projectTaskStage.findMany({
      where: { project_task_id: id },
      orderBy: { ordem: "asc" },
    });
    const nextStage = allStages.find((s) => s.ordem > stage.ordem && s.status !== "CONCLUIDA");

    let taskStatus: string;

    if (nextStage) {
      // Unlock next stage
      await prisma.projectTaskStage.update({
        where: { id: nextStage.id },
        data: { status: "EM_ANDAMENTO", updated_at: new Date() },
      });
      taskStatus = "EM_EXECUCAO";
    } else {
      // All stages complete → task is done
      taskStatus = "CONCLUIDA";
    }

    const task = await prisma.projectTask.update({
      where: { id },
      data: { status: taskStatus, updated_at: new Date() },
      include: {
        stages: { orderBy: { ordem: "asc" } },
      },
    });

    res.json({ task, stage_aprovada: stageId, proxima_etapa: nextStage?.id ?? null });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/lider/tasks/:id/stages/:stageId/reject ────────────────────────
// Reject a stage: keeps it EM_ANDAMENTO, records reason on the task.

router.patch("/tasks/:id/stages/:stageId/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, stageId } = req.params;
    const { motivo } = req.body as { motivo?: string };
    if (!motivo || motivo.trim() === "") {
      return res.status(400).json({ error: "Motivo de reprovação é obrigatório" });
    }

    const stage = await prisma.projectTaskStage.findFirst({
      where: { id: stageId, project_task_id: id },
    });
    if (!stage) return res.status(404).json({ error: "Etapa não encontrada" });

    // Stage stays EM_ANDAMENTO — nomad must revise and resubmit
    // Record reason on the task
    const task = await prisma.projectTask.update({
      where: { id },
      data: {
        status: "REPROVADA_PELO_LIDER",
        observations: `[Etapa ${stage.titulo}] ${motivo.trim()}`,
        updated_at: new Date(),
      },
      include: { stages: { orderBy: { ordem: "asc" } } },
    });

    res.json({ task, stage_reprovada: stageId });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/lider/tasks/:id/stages/:stageId/return ────────────────────────
// Return to agency (used for E01 when briefing/access is incomplete).

router.patch("/tasks/:id/stages/:stageId/return", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, stageId } = req.params;
    const { motivo } = req.body as { motivo?: string };

    const stage = await prisma.projectTaskStage.findFirst({
      where: { id: stageId, project_task_id: id },
    });
    if (!stage) return res.status(404).json({ error: "Etapa não encontrada" });

    // Task is returned to agency for corrections
    const task = await prisma.projectTask.update({
      where: { id },
      data: {
        status: "DEVOLVIDA_PARA_AGENCIA",
        observations: motivo?.trim() ?? null,
        updated_at: new Date(),
      },
      include: { stages: { orderBy: { ordem: "asc" } } },
    });

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/lider/tasks/:id/stages ──────────────────────────────────────────

router.get("/tasks/:id/stages", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const stages = await prisma.projectTaskStage.findMany({
      where: { project_task_id: id },
      orderBy: { ordem: "asc" },
    });
    res.json({ stages });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/lider/tasks/:id/reject ────────────────────────────────────────

router.patch("/tasks/:id/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body as { motivo?: string };
    if (!motivo || motivo.trim() === "") {
      return res.status(400).json({ error: "Motivo de reprovação é obrigatório" });
    }
    const task = await prisma.projectTask.update({
      where: { id },
      data: {
        status: "REPROVADA",
        observations: motivo.trim(),
        updated_at: new Date(),
      },
    });
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/lider/tasks/:id/return ────────────────────────────────────────

router.patch("/tasks/:id/return", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body as { motivo?: string };
    const task = await prisma.projectTask.update({
      where: { id },
      data: {
        status: "DEVOLVIDA_PARA_AGENCIA",
        observations: motivo?.trim() ?? null,
        updated_at: new Date(),
      },
    });
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

export default router;
