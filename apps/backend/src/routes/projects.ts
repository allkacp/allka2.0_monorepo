import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";
import { gerarTarefasDoProjeto } from "../lib/generate-tasks";

const router = Router();

// ─── Project scope helpers ───────────────────────────────────────────────────

type ProjectScope =
  | { kind: "admin" }
  | { kind: "open" }
  | { kind: "agency"; agencyName: string }
  | { kind: "company"; companyId: string }
  | { kind: "company_unlinked" };

async function getProjectScope(
  userId: string,
  accountType: string,
): Promise<ProjectScope> {
  if (accountType === "admin") return { kind: "admin" };

  if (accountType === "agencias") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { agency: { select: { name: true } } },
    });
    const agencyName = user?.agency?.name;
    if (!agencyName) return { kind: "open" };
    return { kind: "agency", agencyName };
  }

  if (accountType === "empresas") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });
    if (!user?.company_id) return { kind: "company_unlinked" };
    return { kind: "company", companyId: user.company_id };
  }

  return { kind: "open" };
}

function scopeToWhere(scope: ProjectScope): Record<string, unknown> | null {
  if (scope.kind === "company_unlinked") return null;
  if (scope.kind === "agency") return { agency: scope.agencyName };
  if (scope.kind === "company") return { client_id: scope.companyId };
  return {};
}

function projectInScope(
  scope: ProjectScope,
  project: { agency: string | null; client_id: string | null },
): boolean {
  if (scope.kind === "admin" || scope.kind === "open") return true;
  if (scope.kind === "company_unlinked") return false;
  if (scope.kind === "agency") return project.agency === scope.agencyName;
  if (scope.kind === "company") return project.client_id === scope.companyId;
  return false;
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  client_id: z.string().optional(),
  status: z
    .enum([
      "draft",
      "negotiation",
      "pending-approval",
      "awaiting-payment",
      "planning",
      "in-progress",
      "paused",
      "completed",
      "cancelled",
    ])
    .default("draft"),
  lifecycle: z.enum(["avulso", "mensal"]).default("avulso"),
  type: z.string().optional(),
  value: z.number().min(0).default(0),
  budget: z.number().min(0).default(0),
  spent: z.number().min(0).default(0),
  progress: z.number().min(0).max(100).default(0),
  agency: z.string().optional(),
  company_type: z.enum(["company", "agency", "nomad"]).optional(),
  consultant: z.string().optional(),
  consultant_email: z.string().optional(),
  team_size: z.number().min(0).default(0),
  nomades: z.string().optional(),
  bitrix_sync: z.boolean().default(false),
  portfolio_permission: z.boolean().default(false),
  overdue: z.boolean().default(false),
  from_lead: z.boolean().default(false),
  billing_day: z.number().optional(),
  billing_start_date: z.string().optional(),
  start_date: z.preprocess(
    (v) => (!v || v === "" ? undefined : v),
    z.string().optional(),
  ),
  end_date: z.preprocess(
    (v) => (!v || v === "" ? undefined : v),
    z.string().optional(),
  ),
});

const updateSchema = createSchema.partial();

// GET /api/projects
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;
    const client_id = req.query.client_id as string | undefined;
    const search = req.query.search as string | undefined;

    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    const scopeWhere = scopeToWhere(scope);

    if (scopeWhere === null) {
      res.json({ data: [], total: 0, page, limit });
      return;
    }

    const where: Record<string, unknown> = { ...scopeWhere };
    if (status) where["status"] = status;
    if (search) where["title"] = { contains: search };
    // client_id filter is only applied for admin/open — scoped users already have their scope locked
    if (client_id && (scope.kind === "admin" || scope.kind === "open")) {
      where["client_id"] = client_id;
    }

    const [total, data] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, cnpj: true } },
          products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  base_price: true,
                  image: true,
                },
              },
              variation: {
                select: { id: true, name: true, price: true },
              },
            },
            orderBy: { created_at: "asc" },
          },
          _count: { select: { task_executions: true } },
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

// GET /api/projects/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      include: {
        client: true,
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                base_price: true,
                image: true,
              },
            },
            variation: {
              select: { id: true, name: true, price: true },
            },
          },
          orderBy: { created_at: "asc" },
        },
        _count: { select: { task_executions: true, invoices: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }

    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    if (!projectInScope(scope, project)) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/tasks  — operational execution tasks (ProjectTask)
router.get("/:id/tasks", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = req.query.status as string | undefined;

    const parent = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true },
    });
    if (!parent) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }
    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    if (!projectInScope(scope, parent)) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    const where: Record<string, unknown> = {
      project_id: req.params.id as string,
    };
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      prisma.projectTask.count({ where }),
      prisma.projectTask.findMany({
        where,
        include: {
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
          _count: {
            select: { stages: true, briefing_answers: true, attachments: true },
          },
        },
        skip,
        take: limit,
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/generate-tasks  — idempotent (re-)generation of tasks from all linked products
router.post("/:id/generate-tasks", verifyToken, async (req, res, next) => {
  try {
    const result = await gerarTarefasDoProjeto(
      req.params.id as string as string,
    );
    res.status(201).json({
      ...result,
      message: `${result.generated} tarefa(s) gerada(s), ${result.skipped} j\u00e1 existia(m).`,
    });
  } catch (err: any) {
    if (err?.message?.includes("n\u00e3o encontrado")) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// POST /api/projects
router.post(
  "/",
  verifyToken,
  validate(createSchema),
  async (req, res, next) => {
    try {
      const { start_date, end_date, ...rest } = req.body;
      const scope = await getProjectScope(req.user!.id, req.user!.account_type);
      const agencyName = scope.kind === "agency" ? scope.agencyName : undefined;
      const toDate = (v: string | undefined) => {
        if (!v) return undefined;
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      };
      const project = await prisma.project.create({
        data: {
          ...rest,
          agency: agencyName || rest.agency,
          start_date: toDate(start_date),
          end_date: toDate(end_date),
        },
        include: { client: { select: { id: true, name: true, cnpj: true } } },
      });
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/projects/:id
router.put(
  "/:id",
  verifyToken,
  validate(updateSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id as string as string;
      const { start_date, end_date, ...rest } = req.body;
      const toDate = (v: string | undefined) => {
        if (!v) return undefined;
        const d = new Date(v);
        return isNaN(d.getTime()) ? undefined : d;
      };

      // Capture previous status and validate scope before update
      const before = await prisma.project.findUnique({
        where: { id },
        select: { status: true, agency: true, client_id: true },
      });

      if (!before) {
        res.status(404).json({ error: "Projeto não encontrado" });
        return;
      }

      const scope = await getProjectScope(req.user!.id, req.user!.account_type);
      if (!projectInScope(scope, before)) {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...rest,
          start_date: toDate(start_date),
          end_date: toDate(end_date),
        },
        include: { client: { select: { id: true, name: true, cnpj: true } } },
      });

      // Auto-generate operational tasks when project transitions to "planning"
      if (rest.status === "planning" && before?.status !== "planning") {
        gerarTarefasDoProjeto(id).catch((err) =>
          console.error(
            `[generate-tasks] Erro ao gerar tarefas para projeto ${id}:`,
            err,
          ),
        );
      }

      res.json(project);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/projects/:id
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
      select: { agency: true, client_id: true },
    });
    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }
    const scope = await getProjectScope(req.user!.id, req.user!.account_type);
    if (!projectInScope(scope, project)) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    await prisma.project.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
