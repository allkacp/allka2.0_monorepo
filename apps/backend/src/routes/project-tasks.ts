import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { selecionarNomadeParaTarefa } from "../lib/selecionar-nomade";
import { atribuirLiderParaTarefa } from "../lib/atribuir-lider";
import { withZeroDateRecovery } from "../lib/clean-zero-datetimes";

const router = Router();

// ── Valid operational statuses ────────────────────────────────────────────────

const TASK_STATUSES = [
  // ── Pipeline original (mantidos para compatibilidade com dados existentes) ──
  "PARA_LANCAMENTO",
  "EM_LANCAMENTO",
  "AGUARDANDO_INFORMACOES",
  "LIBERADA_PARA_EXECUCAO",
  "EM_EXECUCAO",
  "EM_REVISAO",
  "EM_APROVACAO",
  "CONCLUIDA",
  "CANCELADA",
  "AGUARDANDO_NOMADE",
  // ── Novos status operacionais ────────────────────────────────────────────────
  "AGUARDANDO_ETAPA",
  "APROVACAO_PENDENTE_CLIENTE",
  "APROVADA",
  "REPROVADA",
  "PAUSADA",
  "ENTREGA_PENDENTE",
  "ENTREGA_ATRASADA",
  "ENTREGUE_PELO_NOMADE",
  "PARA_QUALIFICACAO",
  "QUALIFICACAO_PENDENTE",
  "MELHORIAS_FINAIS",
  "NAO_SEGUIU_ORIENTACOES",
  // ── Novo fluxo de lançamento com revisão do líder ────────────────────────────
  "LANCAMENTO_ENVIADO_PARA_ANALISE",
  "DEVOLVIDA_PARA_AGENCIA",
  "LIBERADA_PELO_LIDER",
] as const;

type TaskStatus = (typeof TASK_STATUSES)[number];

const STAGE_STATUSES = [
  "PENDENTE",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "BLOQUEADA",
] as const;

// ── Schemas ───────────────────────────────────────────────────────────────────

const updateTaskSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignee_id: z.string().optional().nullable(),
  responsavel_agencia_id: z.string().optional().nullable(),
  nomade_responsavel_id: z.string().optional().nullable(),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  start_date: z.string().datetime({ offset: true }).optional().nullable(),
  observations: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  fase: z.string().optional().nullable(),
});

const briefingAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        question_key: z.string().min(1),
        question_text: z.string().min(1),
        answer: z.string().optional().nullable(),
        files: z.string().optional().nullable(), // JSON string: {name,url,size,mime_type}[]
        links: z.string().optional().nullable(), // JSON string: string[]
      }),
    )
    .min(1),
});

const attachmentSchema = z.object({
  type: z.enum(["file", "link", "reference", "delivery"]).default("file"),
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().int().optional(),
  mime_type: z.string().optional(),
  observations: z.string().optional(),
  uploaded_by: z.string().optional(),
});

const updateStageSchema = z.object({
  status: z.enum(STAGE_STATUSES),
});

// ── Status transition side effects ────────────────────────────────────────────

function buildStatusSideEffects(
  newStatus: TaskStatus,
  current: { data_lancamento: Date | null; data_inicio_execucao: Date | null },
) {
  const extras: Record<string, unknown> = {};
  switch (newStatus) {
    case "EM_LANCAMENTO":
      if (!current.data_lancamento) extras.data_lancamento = new Date();
      break;
    case "ENTREGUE_PELO_NOMADE":
    case "PARA_QUALIFICACAO":
    case "QUALIFICACAO_PENDENTE":
      extras.data_conclusao = null; // not concluded yet
      break;
    case "LIBERADA_PARA_EXECUCAO":
      extras.data_liberacao_execucao = new Date();
      break;
    case "EM_EXECUCAO":
      if (!current.data_inicio_execucao)
        extras.data_inicio_execucao = new Date();
      break;
    case "CONCLUIDA":
    case "APROVADA":
      extras.data_conclusao = new Date();
      extras.completed_at = new Date();
      break;
    case "CANCELADA":
    case "REPROVADA":
    case "NAO_SEGUIU_ORIENTACOES":
      extras.data_conclusao = new Date();
      extras.completed_at = new Date();
      break;
  }
  return extras;
}

// ── Task scope helpers ────────────────────────────────────────────────────────
// Returns a Prisma `where` fragment that restricts ProjectTask visibility.
//   null → caller must reject the request (return empty list or 404).
//   {}   → admin / no restriction, sees everything.

type ScopeWhere = Record<string, unknown>;

async function getTaskScopeWhere(
  userId: string,
  accountType: string,
  role: string,
): Promise<ScopeWhere | null> {
  // Admin sees everything
  if (accountType === "admin" || role === "admin") return {};

  // Leader: scoped to tasks where they are the explicitly assigned leader.
  // Leaders should use /api/lider/tasks for their primary workflow, but if
  // they hit this endpoint we never let them fall through to admin behaviour.
  if (role === "lider") {
    return { lider_responsavel_id: userId };
  }

  // Agency: scoped to tasks in projects belonging to their agency (by name)
  if (accountType === "agencias") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { agency: { select: { name: true } } },
    });
    const agencyName = user?.agency?.name;
    if (!agencyName) return null; // not linked to any agency → no access
    return { project: { agency: agencyName } };
  }

  // Company: scoped to tasks in projects where the client is their company
  if (accountType === "empresas") {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });
    if (!user?.company_id) return null; // not linked to any company → no access
    return { project: { client_id: user.company_id } };
  }

  // Partner: scoped to tasks in projects of companies they referred
  if (accountType === "parceiro") {
    const profile = await prisma.partnerProfile.findUnique({
      where: { user_id: userId },
      select: { referred_companies: { select: { id: true } } },
    });
    const companyIds = profile?.referred_companies?.map((c) => c.id) ?? [];
    if (companyIds.length === 0) return null; // no referred companies → no access
    return { project: { client_id: { in: companyIds } } };
  }

  // Unknown account type → deny
  return null;
}

// Merges a base `where` with the scope filter using Prisma AND so neither
// overwrites the other (important when both have a `project` key).
function applyScope(
  base: Record<string, unknown>,
  scope: ScopeWhere,
): Record<string, unknown> {
  if (Object.keys(scope).length === 0) return base; // admin: no extra filter
  return { AND: [base, scope] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/project-tasks ────────────────────────────────────────────────────

router.get(
  "/",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project_id = req.query.project_id as string | undefined;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const phase = req.query.phase as string | undefined;
      const assignee_id = req.query.assignee_id as string | undefined;
      const project_product_id = req.query.project_product_id as
        | string
        | undefined;
      // New filters
      const nomade_responsavel_id = req.query.nomade_responsavel_id as
        | string
        | undefined;
      const responsavel_agencia_id = req.query.responsavel_agencia_id as
        | string
        | undefined;
      const client_id = req.query.client_id as string | undefined; // filter by project.client_id
      const overdue = req.query.overdue === "true";

      // ── Resolve scope before building the where clause ──
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.json({ data: [], total: 0 });
        return;
      }

      const where: Record<string, unknown> = {};
      if (project_id) where.project_id = project_id;
      if (status) where.status = status;
      if (priority) where.priority = priority;
      if (phase) where.fase = phase;
      if (assignee_id) where.assignee_id = assignee_id;
      if (project_product_id) where.project_product_id = project_product_id;
      if (nomade_responsavel_id)
        where.nomade_responsavel_id = nomade_responsavel_id;
      if (responsavel_agencia_id)
        where.responsavel_agencia_id = responsavel_agencia_id;
      // client_id filter only honoured for admin; scoped users already have their scope locked
      if (client_id && Object.keys(scopeWhere).length === 0) {
        where.project = { client_id };
      }
      if (overdue) {
        where.due_date = { lt: new Date() };
        where.status = { notIn: ["CONCLUIDA", "CANCELADA"] };
      }

      const tasks = await withZeroDateRecovery(() =>
        prisma.projectTask.findMany({
          where: applyScope(where, scopeWhere),
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                type: true,
                consultant: true,
                client: {
                  select: { id: true, name: true, logo: true, cnpj: true },
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
            _count: {
              select: {
                stages: true,
                briefing_answers: true,
                attachments: true,
              },
            },
          },
          orderBy: [
            { project_id: "asc" },
            { sort_order: "asc" },
            { created_at: "asc" },
          ],
        }),
      );

      // ── Post-process: resolve responsavel_agencia and nomade_responsavel names
      const agenciaIds = [
        ...new Set(
          tasks
            .map((t) => t.responsavel_agencia_id)
            .filter(Boolean) as string[],
        ),
      ];
      const nomadeIds = [
        ...new Set(
          tasks.map((t) => t.nomade_responsavel_id).filter(Boolean) as string[],
        ),
      ];

      const [agenciaUsers, nomadeUsers] = await Promise.all([
        agenciaIds.length > 0
          ? prisma.user.findMany({
              where: { id: { in: agenciaIds } },
              select: { id: true, name: true, email: true, avatar: true },
            })
          : Promise.resolve([]),
        nomadeIds.length > 0
          ? prisma.nomade.findMany({
              where: { id: { in: nomadeIds } },
              select: { id: true, name: true, email: true, avatar: true },
            })
          : Promise.resolve([]),
      ]);

      const agenciaMap = new Map(agenciaUsers.map((u) => [u.id, u]));
      const nomadeMap = new Map(nomadeUsers.map((n) => [n.id, n]));

      const enriched = tasks.map((t) => ({
        ...t,
        responsavel_agencia: t.responsavel_agencia_id
          ? (agenciaMap.get(t.responsavel_agencia_id) ?? null)
          : null,
        nomade_responsavel: t.nomade_responsavel_id
          ? (nomadeMap.get(t.nomade_responsavel_id) ?? null)
          : null,
      }));

      res.json({ data: enriched, total: enriched.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/project-tasks/aguardando-nomade ─────────────────────────────────
// Admin-only view: tasks waiting for a nomad to be assigned

router.get(
  "/aguardando-nomade",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Only admin can see the global queue of tasks awaiting nomad assignment
      if (
        req.user!.account_type !== "admin" &&
        req.user!.role !== "admin"
      ) {
        res.status(403).json({ error: "Acesso restrito a administradores" });
        return;
      }

      const tasks = await prisma.projectTask.findMany({
        where: { status: "AGUARDANDO_NOMADE" },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              status: true,
              client: { select: { id: true, name: true, logo: true } },
            },
          },
          project_product: {
            select: {
              id: true,
              product_name_snapshot: true,
              product_code_snapshot: true,
              product_category_snapshot: true,
            },
          },
          _count: { select: { stages: true, attachments: true } },
          assignment_history: {
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
        orderBy: { created_at: "asc" },
      });
      res.json({ data: tasks, total: tasks.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/project-tasks/:id ────────────────────────────────────────────────

router.get(
  "/:id",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        include: {
          project: {
            include: {
              client: { select: { id: true, name: true, cnpj: true } },
            },
          },
          project_product: true,
          catalog_task: true,
          stages: { orderBy: { ordem: "asc" } },
          briefing_answers: { orderBy: { created_at: "asc" } },
          attachments: { orderBy: { created_at: "desc" } },
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
  },
);

// ── PATCH /api/project-tasks/:id ─────────────────────────────────────────────

router.patch(
  "/:id",
  verifyToken,
  validate(updateTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const existing = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
      });
      if (!existing) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const data: Record<string, unknown> = {};

      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.description !== undefined)
        data.description = req.body.description;
      if (req.body.priority !== undefined) data.priority = req.body.priority;
      if (req.body.assignee_id !== undefined)
        data.assignee_id = req.body.assignee_id;
      if (req.body.responsavel_agencia_id !== undefined)
        data.responsavel_agencia_id = req.body.responsavel_agencia_id;
      if (req.body.nomade_responsavel_id !== undefined)
        data.nomade_responsavel_id = req.body.nomade_responsavel_id;
      if (req.body.due_date !== undefined)
        data.due_date = req.body.due_date ? new Date(req.body.due_date) : null;
      if (req.body.start_date !== undefined)
        data.start_date = req.body.start_date
          ? new Date(req.body.start_date)
          : null;
      if (req.body.observations !== undefined)
        data.observations = req.body.observations;
      if (req.body.fase !== undefined) data.fase = req.body.fase;

      if (req.body.status !== undefined) {
        data.status = req.body.status;
        Object.assign(
          data,
          buildStatusSideEffects(
            req.body.status as TaskStatus,
            existing as any,
          ),
        );
      }

      const updated = await prisma.projectTask.update({
        where: { id: req.params.id as string },
        data,
        include: {
          project: { select: { id: true, title: true } },
          project_product: {
            select: { id: true, product_name_snapshot: true },
          },
          _count: {
            select: { stages: true, briefing_answers: true, attachments: true },
          },
        },
      });

      // Fire-and-forget: auto-assign leader when task enters qualification queue or is launched
      if (
        req.body.status === "PARA_QUALIFICACAO" ||
        req.body.status === "QUALIFICACAO_PENDENTE" ||
        req.body.status === "ENTREGUE_PELO_NOMADE" ||
        req.body.status === "EM_LANCAMENTO" ||
        req.body.status === "LANCAMENTO_EM_REVISAO"
      ) {
        atribuirLiderParaTarefa(updated.id).catch((err) =>
          console.error("[atribuir-lider] Error:", err),
        );
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/project-tasks/:id/launch ──────────────────────────────────────
// Transition: PARA_LANCAMENTO → EM_LANCAMENTO

router.patch(
  "/:id/launch",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }
      if (task.status !== "PARA_LANCAMENTO") {
        res.status(422).json({
          error:
            "Apenas tarefas com status PARA_LANCAMENTO podem ser lançadas.",
          current_status: task.status,
        });
        return;
      }

      // Verificar prazo de lançamento — 30 dias após geração da tarefa
      if (task.lancamento_expires_at && task.lancamento_expires_at < new Date()) {
        await prisma.projectTask.update({
          where: { id: req.params.id as string },
          data: { status: "CANCELADA" },
        });
        res.status(410).json({
          error: "Prazo de lançamento expirado. A tarefa foi cancelada automaticamente.",
          code: "LANCAMENTO_EXPIRADO",
        });
        return;
      }

      const updated = await prisma.projectTask.update({
        where: { id: req.params.id as string },
        data: {
          status: "EM_LANCAMENTO",
          data_lancamento: task.data_lancamento ?? new Date(),
        },
      });

      // Fire-and-forget: assign leader (PA0001-T01 E01 is leader-responsible)
      atribuirLiderParaTarefa(updated.id).catch((err) =>
        console.error("[atribuir-lider] Error on launch:", err),
      );

      // Activate the first stage so the lider can start working on it
      const firstStage = await prisma.projectTaskStage.findFirst({
        where: { project_task_id: updated.id },
        orderBy: { ordem: "asc" },
      });
      if (firstStage) {
        await prisma.projectTaskStage.update({
          where: { id: firstStage.id },
          data: { status: "EM_ANDAMENTO" },
        });
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/project-tasks/:id/release ─────────────────────────────────────
// Transition: EM_LANCAMENTO | AGUARDANDO_INFORMACOES → LIBERADA_PARA_EXECUCAO

router.patch(
  "/:id/release",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }
      const releasable = ["EM_LANCAMENTO", "AGUARDANDO_INFORMACOES"];
      if (!releasable.includes(task.status)) {
        res.status(422).json({
          error:
            "Apenas tarefas em EM_LANCAMENTO ou AGUARDANDO_INFORMACOES podem ser liberadas.",
          current_status: task.status,
        });
        return;
      }

      const updated = await prisma.projectTask.update({
        where: { id: req.params.id as string },
        data: {
          status: "LIBERADA_PARA_EXECUCAO",
          data_liberacao_execucao: new Date(),
        },
      });

      // Fire-and-forget: attempt nomad auto-selection in background
      // Response is sent immediately with LIBERADA_PARA_EXECUCAO;
      // task may transition to EM_EXECUCAO or AGUARDANDO_NOMADE asynchronously.
      selecionarNomadeParaTarefa(updated.id).catch((err) =>
        console.error("[selecionar-nomade] Error:", err),
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// BRIEFING ANSWERS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/project-tasks/:id/briefing ──────────────────────────────────────

router.get(
  "/:id/briefing",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: {
          id: true,
          briefing_snapshot: true,
          catalog_task_id: true,
          catalog_task: { select: { briefing_questions: true } },
        },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      // Prefer snapshot saved at task creation; fall back to live CatalogTask data
      let briefingQuestions: unknown[] = [];
      if (task.briefing_snapshot) {
        try { briefingQuestions = JSON.parse(task.briefing_snapshot); } catch {}
      } else if (task.catalog_task?.briefing_questions) {
        try { briefingQuestions = JSON.parse(task.catalog_task.briefing_questions); } catch {}
      }

      const answers = await prisma.taskBriefingAnswer.findMany({
        where: { project_task_id: req.params.id as string },
        orderBy: { created_at: "asc" },
      });

      res.json({ briefing_questions: briefingQuestions, answers });
    } catch (err) {
      next(err);
    }
  },
);

// ── PUT /api/project-tasks/:id/briefing ──────────────────────────────────────
// Upsert answers for one or more briefing questions

router.put(
  "/:id/briefing",
  verifyToken,
  validate(briefingAnswerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: { id: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const { answers } = req.body as z.infer<typeof briefingAnswerSchema>;

      const upserted = await prisma.$transaction(
        answers.map((a) =>
          prisma.taskBriefingAnswer.upsert({
            where: {
              project_task_id_question_key: {
                project_task_id: req.params.id as string,
                question_key: a.question_key,
              },
            },
            create: {
              project_task_id: req.params.id as string,
              question_key: a.question_key,
              question_text: a.question_text,
              answer: a.answer ?? null,
              files: a.files ?? null,
              links: a.links ?? null,
            },
            update: {
              question_text: a.question_text,
              answer: a.answer ?? null,
              files: a.files ?? null,
              links: a.links ?? null,
            },
          }),
        ),
      );

      // PUT /briefing is "save draft" — does NOT change task status

      res.json({ updated: upserted.length, answers: upserted });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/project-tasks/:id/submit-briefing ─────────────────────────────
// Agência finaliza o briefing e envia para análise do líder
// Transitions: EM_LANCAMENTO | AGUARDANDO_INFORMACOES | DEVOLVIDA_PARA_AGENCIA
//              → LANCAMENTO_ENVIADO_PARA_ANALISE

router.patch(
  "/:id/submit-briefing",
  verifyToken,
  validate(briefingAnswerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const submittable = [
        "EM_LANCAMENTO",
        "AGUARDANDO_INFORMACOES",
        "DEVOLVIDA_PARA_AGENCIA",
      ];
      if (!submittable.includes(task.status)) {
        res.status(422).json({
          error: `Tarefa com status "${task.status}" não pode ser enviada para análise.`,
          current_status: task.status,
        });
        return;
      }

      const { answers } = req.body as z.infer<typeof briefingAnswerSchema>;

      // Upsert answers + transition status atomically
      await prisma.$transaction([
        ...answers.map((a) =>
          prisma.taskBriefingAnswer.upsert({
            where: {
              project_task_id_question_key: {
                project_task_id: req.params.id as string,
                question_key: a.question_key,
              },
            },
            create: {
              project_task_id: req.params.id as string,
              question_key: a.question_key,
              question_text: a.question_text,
              answer: a.answer ?? null,
              files: a.files ?? null,
              links: a.links ?? null,
            },
            update: {
              question_text: a.question_text,
              answer: a.answer ?? null,
              files: a.files ?? null,
              links: a.links ?? null,
            },
          }),
        ),
        prisma.projectTask.update({
          where: { id: req.params.id as string },
          data: { status: "LANCAMENTO_ENVIADO_PARA_ANALISE" },
        }),
      ]);

      // Fire-and-forget: ensure a leader is assigned to review this briefing
      atribuirLiderParaTarefa(req.params.id as string).catch((err) =>
        console.error("[submit-briefing] Erro ao atribuir líder:", err),
      );

      const updated = await prisma.projectTask.findUnique({
        where: { id: req.params.id as string },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/project-tasks/:id/attachments ────────────────────────────────────

router.get(
  "/:id/attachments",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: { id: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const type = req.query.type as string | undefined;
      const where: Record<string, unknown> = {
        project_task_id: req.params.id as string,
      };
      if (type) where.type = type;

      const attachments = await prisma.taskAttachment.findMany({
        where,
        orderBy: { created_at: "desc" },
      });

      res.json({ data: attachments, total: attachments.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/project-tasks/:id/attachments ───────────────────────────────────

router.post(
  "/:id/attachments",
  verifyToken,
  validate(attachmentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: { id: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const attachment = await prisma.taskAttachment.create({
        data: {
          project_task_id: req.params.id as string,
          type: req.body.type,
          name: req.body.name,
          url: req.body.url,
          size: req.body.size ?? null,
          mime_type: req.body.mime_type ?? null,
          observations: req.body.observations ?? null,
          uploaded_by: req.body.uploaded_by ?? null,
        },
      });

      res.status(201).json(attachment);
    } catch (err) {
      next(err);
    }
  },
);

// ── DELETE /api/project-tasks/:id/attachments/:attachmentId ──────────────────

router.delete(
  "/:id/attachments/:attachmentId",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      // Verify the parent task is in scope before allowing deletion
      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: { id: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const attachment = await prisma.taskAttachment.findFirst({
        where: {
          id: req.params.attachmentId as string,
          project_task_id: req.params.id as string,
        },
      });
      if (!attachment) {
        res.status(404).json({ error: "Anexo não encontrado" });
        return;
      }

      await prisma.taskAttachment.delete({
        where: { id: req.params.attachmentId as string },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// STAGES
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/project-tasks/:id/stages ────────────────────────────────────────

router.get(
  "/:id/stages",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: { id: true, steps_snapshot: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const stages = await prisma.projectTaskStage.findMany({
        where: { project_task_id: req.params.id as string },
        orderBy: { ordem: "asc" },
      });

      // If no stages exist yet, auto-generate them from steps_snapshot
      if (stages.length === 0 && task.steps_snapshot) {
        let steps: Array<{
          title?: string;
          label?: string;
          description?: string;
          mandatory?: boolean;
          requires_briefing?: boolean;
          checklist?: unknown;
        }> = [];
        try {
          steps = JSON.parse(task.steps_snapshot);
        } catch {}

        if (Array.isArray(steps) && steps.length > 0) {
          const created = await prisma.$transaction(
            steps.map((step, idx) =>
              prisma.projectTaskStage.create({
                data: {
                  project_task_id: req.params.id as string,
                  titulo: step.title || step.label || `Etapa ${idx + 1}`,
                  descricao: step.description ?? null,
                  ordem: idx,
                  status: "PENDENTE",
                  obrigatoria: step.mandatory ?? true,
                  briefing_necessario: step.requires_briefing ?? false,
                  checklist_snapshot: step.checklist
                    ? JSON.stringify(step.checklist)
                    : null,
                },
              }),
            ),
          );
          res.json({
            data: created,
            total: created.length,
            auto_generated: true,
          });
          return;
        }
      }

      res.json({ data: stages, total: stages.length });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/project-tasks/:id/stages/:stageId ─────────────────────────────

router.patch(
  "/:id/stages/:stageId",
  verifyToken,
  validate(updateStageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      // Verify parent task is in scope before allowing stage mutation
      const taskInScope = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: { id: true },
      });
      if (!taskInScope) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const stage = await prisma.projectTaskStage.findFirst({
        where: {
          id: req.params.stageId as string,
          project_task_id: req.params.id as string,
        },
      });
      if (!stage) {
        res.status(404).json({ error: "Etapa não encontrada" });
        return;
      }

      const updated = await prisma.projectTaskStage.update({
        where: { id: req.params.stageId as string },
        data: { status: req.body.status },
      });

      // Auto-complete parent task when all mandatory stages are done
      if (req.body.status === "CONCLUIDA") {
        const remaining = await prisma.projectTaskStage.count({
          where: {
            project_task_id: req.params.id as string,
            obrigatoria: true,
            status: { not: "CONCLUIDA" },
          },
        });
        if (remaining === 0) {
          const parent = await prisma.projectTask.findUnique({
            where: { id: req.params.id as string },
            select: { status: true },
          });
          if (parent && !["CONCLUIDA", "CANCELADA"].includes(parent.status)) {
            await prisma.projectTask.update({
              where: { id: req.params.id as string },
              data: {
                status: "EM_APROVACAO",
              },
            });
          }
        }
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
