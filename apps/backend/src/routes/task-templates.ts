import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  task_type: z
    .enum(["execution", "review", "approval", "qualification", "support"])
    .default("execution"),
  description: z.string().optional(),
  objective: z.string().optional(),
  default_deadline_days: z.number().int().positive().optional(),
  default_priority: z
    .enum(["low", "medium", "high", "urgent"])
    .default("medium"),
  complexity: z
    .enum(["basic", "intermediate", "advanced", "premium"])
    .default("basic"),
  estimated_hours: z.number().positive().optional(),
  responsible_type: z.string().optional(),
  requires_access: z.boolean().default(false),
  requires_briefing: z.boolean().default(false),
  requires_files: z.boolean().default(false),
  steps: z.string().optional(),
  checklist: z.string().optional(),
  briefing_questions: z.string().optional(),
  required_files: z.string().optional(),
  execution_rules: z.string().optional(),
  conclusion_rules: z.string().optional(),
  internal_guidance: z.string().optional(),
  status: z.enum(["ativa", "inativa", "em_revisao"]).default("ativa"),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial();

const linkSchema = z.object({
  product_id: z.string().min(1),
  catalog_task_id: z.string().min(1),
  sort_order: z.number().int().default(0),
  is_mandatory: z.boolean().default(true),
  phase: z.string().optional(),
  notes: z.string().optional(),
});

// ── Helper: auto-generate code ───────────────────────────────────────────────

async function generateCode(): Promise<string> {
  const last = await prisma.catalogTask.findFirst({
    orderBy: { created_at: "desc" },
    select: { code: true },
  });
  if (!last) return "CT-001";
  const num = parseInt(last.code.replace(/\D/g, ""), 10);
  return `CT-${String(num + 1).padStart(3, "0")}`;
}

// ── GET /api/task-templates ──────────────────────────────────────────────────
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;
    const is_active = req.query.is_active;

    const where: Record<string, unknown> = {};
    if (category) where["category"] = category;
    if (status) where["status"] = status;
    if (is_active !== undefined) where["is_active"] = is_active === "true";
    if (search) {
      where["OR"] = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.catalogTask.count({ where }),
      prisma.catalogTask.findMany({
        where,
        include: {
          product_links: {
            include: { product: { select: { id: true, name: true } } },
          },
          _count: { select: { product_links: true } },
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

// ── GET /api/task-templates/:id ──────────────────────────────────────────────
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const task = await prisma.catalogTask.findUnique({
      where: { id: (req.params.id as string) },
      include: {
        product_links: {
          include: {
            product: { select: { id: true, name: true, category: true } },
          },
          orderBy: { sort_order: "asc" },
        },
      },
    });
    if (!task) return res.status(404).json({ error: "CatalogTask not found" });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/task-templates ─────────────────────────────────────────────────
router.post(
  "/",
  verifyToken,
  validate(createSchema),
  async (req, res, next) => {
    try {
      const data = req.body;
      if (!data.code) data.code = await generateCode();

      const task = await prisma.catalogTask.create({ data });
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /api/task-templates/:id ──────────────────────────────────────────────
router.put(
  "/:id",
  verifyToken,
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const task = await prisma.catalogTask.update({
        where: { id: (req.params.id as string) },
        data: { ...req.body, updated_at: new Date() },
      });
      res.json(task);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/task-templates/:id/status ────────────────────────────────────
router.patch("/:id/status", verifyToken, async (req, res, next) => {
  try {
    const { status, is_active } = req.body;
    const task = await prisma.catalogTask.update({
      where: { id: (req.params.id as string) },
      data: {
        status,
        is_active: is_active ?? status === "ativa",
        updated_at: new Date(),
      },
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/task-templates/:id ──────────────────────────────────────────
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    // Remove all product links first
    await prisma.productCatalogTask.deleteMany({
      where: { catalog_task_id: (req.params.id as string) },
    });
    await prisma.catalogTask.delete({ where: { id: (req.params.id as string) } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/task-templates/links ──────────────────────────────────────────
// Link a task template to a product
router.post(
  "/links",
  verifyToken,
  validate(linkSchema),
  async (req, res, next) => {
    try {
      const link = await prisma.productCatalogTask.upsert({
        where: {
          product_id_catalog_task_id: {
            product_id: req.body.product_id,
            catalog_task_id: req.body.catalog_task_id,
          },
        },
        update: {
          sort_order: req.body.sort_order,
          is_mandatory: req.body.is_mandatory,
          phase: req.body.phase,
          notes: req.body.notes,
        },
        create: req.body,
        include: { catalog_task: true },
      });
      res.status(201).json(link);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/task-templates/links/:linkId ─────────────────────────────────
router.delete("/links/:linkId", verifyToken, async (req, res, next) => {
  try {
    await prisma.productCatalogTask.delete({
      where: { id: (req.params.linkId as string) },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/task-templates/by-product/:productId ───────────────────────────
// Returns all task templates linked to a product, ordered by sort_order
router.get("/by-product/:productId", verifyToken, async (req, res, next) => {
  try {
    const links = await prisma.productCatalogTask.findMany({
      where: { product_id: (req.params.productId as string) },
      include: { catalog_task: true },
      orderBy: { sort_order: "asc" },
    });
    res.json(links);
  } catch (err) {
    next(err);
  }
});

export default router;
