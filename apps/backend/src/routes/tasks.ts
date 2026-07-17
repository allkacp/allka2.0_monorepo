import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

const createSchema = z.object({
  project_id: z.string().optional(),
  template_id: z.string().optional(),
  nomade_id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z
    .enum([
      "draft",
      "launched",
      "in_progress",
      "returned",
      "paused",
      "agency_approval",
      "client_approval",
      "approved",
      "rejected",
      "expired",
    ])
    .default("draft"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  type: z.enum(["standard", "qualification", "learning"]).default("standard"),
  due_date: z.string().datetime({ offset: true }).optional(),
});

const updateSchema = createSchema.partial();

const statusSchema = z.object({
  status: z.enum([
    "draft",
    "launched",
    "in_progress",
    "returned",
    "paused",
    "agency_approval",
    "client_approval",
    "approved",
    "rejected",
    "expired",
  ]),
  feedback: z.string().optional(),
});

// GET /api/tasks
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const project_id = req.query.project_id as string | undefined;
    const nomade_id = req.query.nomade_id as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where["status"] = status;
    if (project_id) where["project_id"] = project_id;
    if (nomade_id) where["nomade_id"] = nomade_id;

    // If nomad role, only show their own tasks
    if (req.user?.role === "nomad" || req.user?.role === "nomad_admin") {
      where["nomade"] = {
        user_id: req.user.id,
      };
    }

    const [total, data] = await Promise.all([
      prisma.taskExecution.count({ where }),
      prisma.taskExecution.findMany({
        where,
        include: {
          nomade: { select: { id: true, name: true, avatar: true } },
          template: { select: { id: true, name: true } },
          project: { select: { id: true, title: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const task = await prisma.taskExecution.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        nomade: true,
        template: true,
        project: { include: { client: { select: { id: true, name: true } } } },
      },
    });

    if (!task) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const task = await prisma.taskExecution.create({
      data: req.body,
      include: {
        nomade: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id
router.put("/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
    const task = await prisma.taskExecution.update({
      where: { id: (req.params.id as string) },
      data: req.body,
      include: {
        nomade: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id/status
router.put("/:id/status", verifyToken, validate(statusSchema), async (req, res, next) => {
  try {
    const { status, feedback } = req.body as {
      status: string;
      feedback?: string;
    };

    const data: Record<string, unknown> = { status };
    if (feedback !== undefined) data["feedback"] = feedback;

    if (status === "approved") data["approved_at"] = new Date();
    if (status === "in_progress" || status === "launched") {
      // no extra field
    }

    const task = await prisma.taskExecution.update({
      where: { id: (req.params.id as string) },
      data,
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    await prisma.taskExecution.delete({ where: { id: (req.params.id as string) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
