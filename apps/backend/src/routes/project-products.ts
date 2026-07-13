import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { assertProductContractable } from "../lib/product-contractability";
import { recalculateProjectValue } from "../lib/project-value";

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const linkProductSchema = z.object({
  project_id: z.string().min(1),
  product_id: z.string().min(1),
  variation_id: z.string().optional(),
  recurrence_snapshot: z.enum(["avulso", "mensal"]).optional(),
  preco_final_cliente_snapshot: z.number().min(0).optional(),
  comissao_snapshot: z.number().min(0).optional(),
  pagador_snapshot: z.enum(["AGENCIA", "CLIENTE"]).optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  expected_end_date: z.string().datetime({ offset: true }).optional(),
});

const updateProjectProductSchema = z.object({
  status: z
    .enum(["PENDENTE", "EM_EXECUCAO", "CONCLUIDO", "CANCELADO"])
    .optional(),
  start_date: z.string().datetime({ offset: true }).optional().nullable(),
  expected_end_date: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  // Commercial snapshot fields (updatable after checkout)
  preco_final_cliente_snapshot: z.number().min(0).optional(),
  comissao_snapshot: z.number().min(0).optional(),
  pagador_snapshot: z.enum(["AGENCIA", "CLIENTE"]).optional(),
});

const updateProjectTaskSchema = z.object({
  status: z
    .enum([
      "PARA_LANCAMENTO",
      "EM_LANCAMENTO",
      "AGUARDANDO_INFORMACOES",
      "LIBERADA_PARA_EXECUCAO",
      "EM_EXECUCAO",
      "EM_REVISAO",
      "EM_APROVACAO",
      "CONCLUIDA",
      "CANCELADA",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignee_id: z.string().optional().nullable(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  start_date: z.string().datetime({ offset: true }).optional().nullable(),
  observations: z.string().optional().nullable(),
});

// ── GET /api/project-products?project_id=xxx ─────────────────────────────────
// List all products linked to a project

router.get("/", verifyToken, async (req, res, next) => {
  try {
    const project_id = req.query.project_id as string | undefined;
    const where: Record<string, unknown> = {};
    if (project_id) where["project_id"] = project_id;

    const items = await prisma.projectProduct.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            base_price: true,
            is_active: true,
          },
        },
        variation: {
          select: { id: true, name: true, price: true },
        },
        tasks: {
          orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
          select: {
            id: true,
            task_code: true,
            title: true,
            status: true,
            priority: true,
            phase: true,
            sort_order: true,
            due_date: true,
            completed_at: true,
            code_snapshot: true,
            name_snapshot: true,
            lancamento_expires_at: true,
            stages: {
              orderBy: { ordem: "asc" },
              select: {
                id: true,
                titulo: true,
                descricao: true,
                ordem: true,
                status: true,
                depende_da_etapa_anterior: true,
              },
            },
          },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { created_at: "asc" },
    });

    res.json({ data: items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/project-products ───────────────────────────────────────────────
// Link a product to a project and auto-generate execution tasks from CatalogTasks

router.post(
  "/",
  verifyToken,
  validate(linkProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        project_id,
        product_id,
        variation_id,
        recurrence_snapshot,
        preco_final_cliente_snapshot,
        comissao_snapshot,
        pagador_snapshot,
        start_date,
        expected_end_date,
      } = req.body;

      // 1. Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: project_id },
        select: { id: true, title: true, status: true },
      });
      if (!project) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }

      // 2. Verify product exists and fetch its data for snapshot
      const product = await prisma.product.findUnique({
        where: { id: product_id },
        include: {
          variations: { where: variation_id ? { id: variation_id } : {} },
          task_links: {
            where: { catalog_task: { is_active: true } },
            include: {
              catalog_task: true,
            },
            orderBy: { sort_order: "asc" },
          },
        },
      });
      if (!product) {
        res.status(404).json({ error: "Produto não encontrado" });
        return;
      }

      await assertProductContractable(product.id);

      // 3. Compute price snapshot
      let priceSnapshot = product.base_price;
      if (variation_id && product.variations.length > 0) {
        priceSnapshot = product.variations[0].price || product.base_price;
      }

      // 4. Create or retrieve ProjectProduct (idempotent)
      let projectProduct = await prisma.projectProduct.findUnique({
        where: { project_id_product_id: { project_id, product_id } },
      });

      if (projectProduct) {
        res.status(409).json({
          error: "Produto já está vinculado a este projeto",
          project_product: projectProduct,
        });
        return;
      }

      projectProduct = await prisma.projectProduct.create({
        data: {
          project_id,
          product_id,
          variation_id: variation_id || null,
          product_name_snapshot: product.name,
          product_code_snapshot: product.id,
          product_category_snapshot: product.category,
          product_price_snapshot: priceSnapshot,
          preco_final_cliente_snapshot:
            preco_final_cliente_snapshot ?? priceSnapshot,
          comissao_snapshot: comissao_snapshot ?? 0,
          pagador_snapshot: pagador_snapshot ?? "AGENCIA",
          recurrence_snapshot: recurrence_snapshot || null,
          status: "PENDENTE",
          start_date: start_date ? new Date(start_date) : null,
          expected_end_date: expected_end_date
            ? new Date(expected_end_date)
            : null,
        },
      });

      // Vincular produto NUNCA gera tarefa — a única origem permitida de
      // geração automática nesta fase é pagamento confirmado como PAGO (ver
      // src/lib/confirm-payment.ts). O bloco que gerava tarefas aqui (uma
      // por CatalogTask vinculado, quando o projeto já estava em
      // planning/in-progress/paused) foi removido de propósito. Em vez
      // disso, só recalculamos o valor do projeto a partir dos produtos
      // válidos — nunca confiamos em valor enviado pelo frontend.
      await recalculateProjectValue(prisma, project_id);

      const result = await prisma.projectProduct.findUnique({
        where: { id: projectProduct.id },
        include: {
          tasks: { orderBy: [{ sort_order: "asc" }] },
          _count: { select: { tasks: true } },
        },
      });

      res.status(201).json({
        project_product: result,
        tasks_generated: 0,
        tasks_skipped: 0,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/project-products/:id ──────────────────────────────────────────
// Update status / dates of a project-product link

router.patch(
  "/:id",
  verifyToken,
  validate(updateProjectProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params as Record<string, string>).id;
      const existing = await prisma.projectProduct.findUnique({
        where: { id },
      });
      if (!existing) {
        res.status(404).json({ error: "Vínculo não encontrado" });
        return;
      }

      const data: Record<string, unknown> = {};
      if (req.body.status !== undefined) data.status = req.body.status;
      if (req.body.start_date !== undefined)
        data.start_date = req.body.start_date
          ? new Date(req.body.start_date)
          : null;
      if (req.body.expected_end_date !== undefined)
        data.expected_end_date = req.body.expected_end_date
          ? new Date(req.body.expected_end_date)
          : null;
      if (req.body.preco_final_cliente_snapshot !== undefined)
        data.preco_final_cliente_snapshot =
          req.body.preco_final_cliente_snapshot;
      if (req.body.comissao_snapshot !== undefined)
        data.comissao_snapshot = req.body.comissao_snapshot;
      if (req.body.pagador_snapshot !== undefined)
        data.pagador_snapshot = req.body.pagador_snapshot;

      const updated = await prisma.projectProduct.update({
        where: { id },
        data,
        include: { tasks: { orderBy: [{ sort_order: "asc" }] } },
      });
      // Cobre o caso de cancelamento (status -> CANCELADO) e qualquer
      // mudança de preço negociado — o total do projeto sempre reflete só
      // os vínculos ainda válidos.
      await recalculateProjectValue(prisma, updated.project_id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/project-products/:id ─────────────────────────────────────────
// Unlink a product from a project (cascades to tasks via DB constraint)

router.delete(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params as Record<string, string>).id;
      const existing = await prisma.projectProduct.findUnique({
        where: { id },
      });
      if (!existing) {
        res.status(404).json({ error: "Vínculo não encontrado" });
        return;
      }

      await prisma.projectProduct.delete({ where: { id } });
      await recalculateProjectValue(prisma, existing.project_id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT TASKS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/project-tasks?project_id=xxx&status=xxx ─────────────────────────
// List execution tasks (optionally filtered by project / status)

router.get(
  "/tasks",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project_id = req.query.project_id as string | undefined;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const assignee_id = req.query.assignee_id as string | undefined;
      const phase = req.query.phase as string | undefined;

      const where: Record<string, unknown> = {};
      if (project_id) where["project_id"] = project_id;
      if (status) where["status"] = status;
      if (priority) where["priority"] = priority;
      if (assignee_id) where["assignee_id"] = assignee_id;
      if (phase) where["phase"] = phase;

      const tasks = await prisma.projectTask.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
              type: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  cnpj: true,
                  email: true,
                  logo: true,
                },
              },
            },
          },
          project_product: {
            select: {
              id: true,
              product_name_snapshot: true,
              product_code_snapshot: true,
              product_category_snapshot: true,
              status: true,
            },
          },
          catalog_task: {
            select: { id: true, code: true, name: true, category: true },
          },
        },
        orderBy: [
          { project_id: "asc" },
          { sort_order: "asc" },
          { created_at: "asc" },
        ],
      });

      res.json({ data: tasks, total: tasks.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/project-tasks/:id ───────────────────────────────────────────────

router.get("/tasks/:id", verifyToken, async (req, res, next) => {
  try {
    const task = await prisma.projectTask.findUnique({
      where: { id: req.params.id as string },
      include: {
        project: {
          include: { client: { select: { id: true, name: true, cnpj: true } } },
        },
        project_product: {
          include: { product: { select: { id: true, name: true, category: true } } },
        },
        catalog_task: true,
        stages: {
          orderBy: { ordem: "asc" },
          select: {
            id: true,
            titulo: true,
            descricao: true,
            ordem: true,
            status: true,
            obrigatoria: true,
            depende_da_etapa_anterior: true,
            briefing_necessario: true,
            checklist_snapshot: true,
            created_at: true,
            updated_at: true,
          },
        },
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

// ── PATCH /api/project-tasks/:id ─────────────────────────────────────────────
// Update status, priority, assignee, dates, observations of an execution task

router.patch(
  "/tasks/:id",
  verifyToken,
  validate(updateProjectTaskSchema),
  async (req, res, next) => {
    try {
      const task = await prisma.projectTask.findUnique({
        where: { id: req.params.id as string as string as string },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const data: Record<string, unknown> = {};
      if (req.body.status !== undefined) {
        data.status = req.body.status;
        if (req.body.status === "CONCLUIDA") {
          data.completed_at = new Date();
        }
        if (req.body.status === "EM_EXECUCAO" && !task.start_date) {
          data.start_date = new Date();
        }
      }
      if (req.body.priority !== undefined) data.priority = req.body.priority;
      if (req.body.assignee_id !== undefined)
        data.assignee_id = req.body.assignee_id;
      if (req.body.due_date !== undefined)
        data.due_date = req.body.due_date ? new Date(req.body.due_date) : null;
      if (req.body.start_date !== undefined)
        data.start_date = req.body.start_date
          ? new Date(req.body.start_date)
          : null;
      if (req.body.observations !== undefined)
        data.observations = req.body.observations;

      const updated = await prisma.projectTask.update({
        where: { id: req.params.id as string as string as string },
        data,
        include: {
          project: { select: { id: true, title: true } },
          project_product: {
            select: { id: true, product_name_snapshot: true },
          },
        },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
