import { Router } from "express";
import { validateBriefingAnswers } from "../lib/catalog2-question-types";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requireAdminMaster } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getRotationStatus, restartRotation, RotationError, startTaskRotation, sendManualOffer, assignNomadeDirectly } from "../lib/task-rotation-engine";
import { atribuirLiderParaTarefa } from "../lib/atribuir-lider";
import { withZeroDateRecovery } from "../lib/clean-zero-datetimes";
import { combinedProjectWhere, isAdminUser } from "../lib/project-scope";
import { recalculateProjectValue } from "../lib/project-value";
import { findUnmetCatalog2Dependency, transitionNeedsDependencyGate, CATALOG2_STARTED_STATUSES } from "../lib/catalog2-task-dependencies";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { recordApprovedTask } from "../lib/memory-service";
import { assertTaskStatusTransitionAllowed, TaskStatusGuardError } from "../lib/task-release-guard";
import { decideContinuity, ContinuityError, CONTINUITY_CHOICES } from "../lib/catalog2-continuity";
import { audienceOf, canSee, type Visibility } from "../lib/catalog2-ops";
import { listDeliverablesFor, submitDeliverable, reviewDeliverable, type DeliverableActor } from "../lib/task-deliverables";
import { getTaskAIConfig, runTaskAI, adoptRun, discardRun, listRuns, canRunAI } from "../lib/task-ai";
import { loadOperationalGuide } from "../lib/task-operational";
import { isAssetValid, ASSET_RULE_LABEL } from "../lib/client-assets";
import { ruleStatesForTask, kickDependencies, kickDependenciesForTask } from "../lib/project-dependencies";
import { computeFlowStateFor, isExternalViewer } from "../lib/task-flow-state";
import { logProjectDecision } from "../lib/catalog2-cycles";
import { reevaluateSuccessors, DependencyInUseError, TaskReleaseError } from "../lib/task-release-service";
import { recordWalletEvent } from "../lib/wallet-service";
import {
  iniciarEtapasDaTarefa,
  concluirEtapa,
  garantirQualificador,
  garantirRevisor,
  revisarTarefa,
  RevisaoError,
  revisorDaTarefa,
  qualificarTarefa,
  QualificacaoError,
  atribuirExecutorDaEtapa,
  aprovarTarefa,
  reprovarTarefa,
  nivelPendente,
} from "../lib/stage-engine";

const router = Router();

// ── Valid operational statuses ────────────────────────────────────────────────

export const TASK_STATUSES = [
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
  // Revisão obrigatória (conferência técnica, antes da qualificação e da aprovação)
  "AGUARDANDO_REVISAO",
  // Qualificação obrigatória (aceite interno do líder/qualificador)
  "AGUARDANDO_QUALIFICACAO",
  "EM_AJUSTES",
  // Pacote/dependência: a entrega espera um item/aprovação de outro produto ou tarefa
  "AGUARDANDO_DEPENDENCIA_PRODUTO",
  // Tarefa dispensada por regra/decisão do líder (conta como cumprida para quem depende dela)
  "DISPENSADA_POR_REGRA",
  "MELHORIAS_FINAIS",
  "NAO_SEGUIU_ORIENTACOES",
  // ── Novo fluxo de lançamento com revisão do líder ────────────────────────────
  "LANCAMENTO_ENVIADO_PARA_ANALISE",
  "DEVOLVIDA_PARA_AGENCIA",
  "LIBERADA_PELO_LIDER",
  // ── Materialização da IA de Lançamento (bloco 4/4) ───────────────────────────
  // RASCUNHO_OPERACIONAL: tarefa real criada, mas "Salvar como rascunho
  // operacional" nunca libera nada — fica aqui até alguém explicitamente
  // mandar pra execução. PENDENTE_DE_LIBERACAO: mandada pra execução, mas
  // ainda tem gatilho/dependência/seleção de especialidade-responsável não
  // satisfeitos — sai daqui exclusivamente via task-release-service.ts.
  "RASCUNHO_OPERACIONAL",
  "PENDENTE_DE_LIBERACAO",
] as const;

type TaskStatus = (typeof TASK_STATUSES)[number];

const STAGE_STATUSES = [
  "PENDENTE",
  // Etapa aberta pelo motor que ainda não tem executor definido (nômade a
  // selecionar ou líder a atribuir) — ver src/lib/stage-engine.ts.
  "AGUARDANDO_EXECUTOR",
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

/** Valida as respostas pelo tipo de cada pergunta (texto, número, moeda, data, sim/não, escolha, link, e-mail, telefone, arquivo, ativo). */
async function rejectInvalidBriefing(
  res: Response,
  task: { id: string; briefing_snapshot: string | null; project_id: string },
  answers: { question_key: string; answer?: string | null; files?: string | null; links?: string | null }[],
  final: boolean,
): Promise<boolean> {
  if (!task.briefing_snapshot) return false;
  const existing = await prisma.taskBriefingAnswer.findMany({ where: { project_task_id: task.id }, select: { question_key: true, answer: true, files: true } });
  const errors = validateBriefingAnswers(task.briefing_snapshot, answers, { final, existing });
  // "Acesso ou ativo do cliente": a resposta é o id de um ativo cadastrado pela EMPRESA deste projeto.
  try {
    const questions = JSON.parse(task.briefing_snapshot) as { question_key: string; question_type?: string }[];
    const assetKeys = new Set(questions.filter((q) => q.question_type === "acesso_ativo").map((q) => q.question_key));
    const toCheck = answers.filter((a) => assetKeys.has(a.question_key) && a.answer);
    if (toCheck.length) {
      const project = await prisma.project.findUnique({ where: { id: task.project_id }, select: { company_id: true } });
      for (const a of toCheck) {
        const asset = await prisma.clientAsset.findFirst({ where: { id: a.answer as string, company_id: project?.company_id ?? "" }, select: { id: true } });
        if (!asset) errors.push({ key: a.question_key, message: "Escolha um acesso ou ativo cadastrado pela empresa." });
      }
    }
  } catch { /* snapshot ilegível: não bloqueia */ }
  if (errors.length === 0) return false;
  res.status(422).json({ error: errors[0].message, code: "briefing_invalid", errors });
  return true;
}

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

const bulkSubmitBriefingSchema = z.object({
  items: z
    .array(
      z.object({
        task_id: z.string().min(1),
        answers: z
          .array(
            z.object({
              question_key: z.string().min(1),
              question_text: z.string().min(1),
              answer: z.string().optional().nullable(),
              files: z.string().optional().nullable(),
              links: z.string().optional().nullable(),
            }),
          )
          .min(1),
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

export async function getTaskScopeWhere(
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

  // Agency (inclui Partner — upgrade da própria Agency, não um account_type
  // separado)/Company: escopo combinado legado (agency/client_id) OU novo
  // (agency_id/company_id/partner_id) — mesmo helper usado em GET
  // /api/projects (src/lib/project-scope.ts), pra não ficar dessincronizado
  // de novo. Antes, esta função só reconhecia o escopo legado: uma tarefa
  // nascida num projeto vinculado só pelo campo novo (agency_id/company_id/
  // partner_id) ficava invisível aqui mesmo aparecendo em GET /api/projects.
  if (["agencias", "empresas"].includes(accountType)) {
    const { where } = await combinedProjectWhere(prisma, userId, accountType);
    if (where === null) return null; // não vinculado a nenhum escopo → sem acesso
    return { project: where };
  }

  // Unknown account type (inclui "nomades" hoje) → nega. Comportamento
  // inalterado nesta fase — permissões de Nomad não são implementadas aqui.
  return null;
}

// Merges a base `where` with the scope filter using Prisma AND so neither
// overwrites the other (important when both have a `project` key).
export function applyScope(
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

      const tasks = await withZeroDateRecovery(prisma, () =>
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
                alteracoes_incluidas_snapshot: true,
                valor_alteracao_extra_snapshot: true,
                taxa_emergencial_reducao_percentual_snapshot: true,
                preco_final_cliente_snapshot: true,
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

      // ── Dependência real entre tarefas do catalog2 (em lote, sem N+1) ────
      const pendingCatalog2 = tasks.filter((t) => t.catalog2_task_id && !CATALOG2_STARTED_STATUSES.has(t.status));
      const dependencyBlockedById = new Map<string, { task_id: string; title: string; status: string }>();
      if (pendingCatalog2.length > 0) {
        const catalog2TaskIds = [...new Set(pendingCatalog2.map((t) => t.catalog2_task_id as string))];
        const deps = await prisma.catalog2TaskDependency.findMany({
          where: { task_id: { in: catalog2TaskIds } },
        });
        if (deps.length > 0) {
          const projectProductIds = [...new Set(pendingCatalog2.map((t) => t.project_product_id))];
          const siblings = await prisma.projectTask.findMany({
            where: { project_product_id: { in: projectProductIds }, catalog2_task_id: { not: null } },
            select: { id: true, title: true, status: true, project_product_id: true, catalog2_task_id: true },
          });
          const siblingByKey = new Map(siblings.map((s) => [`${s.project_product_id}:${s.catalog2_task_id}`, s]));
          const depsByTask = new Map<string, string[]>();
          for (const d of deps) {
            if (!depsByTask.has(d.task_id)) depsByTask.set(d.task_id, []);
            depsByTask.get(d.task_id)!.push(d.depends_on_task_id);
          }
          for (const t of pendingCatalog2) {
            const dependsOn = depsByTask.get(t.catalog2_task_id as string);
            if (!dependsOn) continue;
            for (const depCatalogTaskId of dependsOn) {
              const sibling = siblingByKey.get(`${t.project_product_id}:${depCatalogTaskId}`);
              if (sibling && sibling.status !== "CONCLUIDA") {
                dependencyBlockedById.set(t.id, { task_id: sibling.id, title: sibling.title, status: sibling.status });
                break;
              }
            }
          }
        }
      }

      const enriched = tasks.map((t) => ({
        ...t,
        responsavel_agencia: t.responsavel_agencia_id
          ? (agenciaMap.get(t.responsavel_agencia_id) ?? null)
          : null,
        nomade_responsavel: t.nomade_responsavel_id
          ? (nomadeMap.get(t.nomade_responsavel_id) ?? null)
          : null,
        dependency_blocked_by: dependencyBlockedById.get(t.id) ?? null,
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

      // Aceita tanto o id (cuid) quanto o task_code amigável (T000001) —
      // a URL do admin/tarefas usa o task_code, não o id cru.
      const task = await prisma.projectTask.findFirst({
        where: applyScope(
          { OR: [{ id: req.params.id as string }, { task_code: req.params.id as string }] },
          scopeWhere,
        ),
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

      // Dependência real do catalog2 — mostra PROATIVAMENTE por que a tarefa
      // está bloqueada, antes mesmo de tentar liberar (a UI usa isto pra
      // desabilitar o botão e explicar o motivo, sem precisar de um 409).
      const dependency_blocked_by = CATALOG2_STARTED_STATUSES.has(task.status)
        ? null
        : await findUnmetCatalog2Dependency(prisma, task);

      res.json({ ...task, dependency_blocked_by });
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/project-tasks/bulk-submit-briefing ────────────────────────────
// Lançamento em lote — produtos "pacote" (2+ tarefas): agência responde todos
// os questionários de uma vez e libera todas as tarefas do lote juntas.
// Mesma transição que /:id/submit-briefing, aplicada a várias tarefas dentro
// de uma única transação (tudo ou nada — se uma tarefa do lote não estiver
// num status lançável, NENHUMA tarefa do lote é alterada). Precisa vir ANTES
// de PATCH /:id abaixo — senão Express casaria "bulk-submit-briefing" como
// valor do parâmetro :id.

router.patch(
  "/bulk-submit-briefing",
  verifyToken,
  validate(bulkSubmitBriefingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items } = req.body as z.infer<typeof bulkSubmitBriefingSchema>;

      const scopeWhere = await getTaskScopeWhere(
        req.user!.id,
        req.user!.account_type,
        req.user!.role,
      );
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefas não encontradas" });
        return;
      }

      const submittable = [
        "EM_LANCAMENTO",
        "AGUARDANDO_INFORMACOES",
        "DEVOLVIDA_PARA_AGENCIA",
      ];
      const taskIds = items.map((i) => i.task_id);

      const tasks = await prisma.projectTask.findMany({
        where: applyScope({ id: { in: taskIds } }, scopeWhere),
      });
      if (tasks.length !== taskIds.length) {
        res.status(404).json({ error: "Uma ou mais tarefas não foram encontradas" });
        return;
      }
      const notSubmittable = tasks.filter((t) => !submittable.includes(t.status));
      if (notSubmittable.length > 0) {
        res.status(422).json({
          error: "Uma ou mais tarefas do lote não estão em status lançável.",
          tasks: notSubmittable.map((t) => ({ id: t.id, status: t.status })),
        });
        return;
      }

      await prisma.$transaction(
        items.flatMap((item) => [
          ...item.answers.map((a) =>
            prisma.taskBriefingAnswer.upsert({
              where: {
                project_task_id_question_key: {
                  project_task_id: item.task_id,
                  question_key: a.question_key,
                },
              },
              create: {
                project_task_id: item.task_id,
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
            where: { id: item.task_id },
            data: { status: "LANCAMENTO_ENVIADO_PARA_ANALISE" },
          }),
        ]),
      );

      for (const taskId of taskIds) {
        atribuirLiderParaTarefa(taskId).catch((err) =>
          console.error("[bulk-submit-briefing] Erro ao atribuir líder:", err),
        );
      }

      const updated = await prisma.projectTask.findMany({ where: { id: { in: taskIds } } });
      res.json({ updated: updated.length, tasks: updated });
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
        // ── Dependência OPERACIONAL (bloco 4/4) + guarda contra "porta dos
        // fundos" ────────────────────────────────────────────────────────
        // Uma tarefa PENDENTE_DE_LIBERACAO/RASCUNHO_OPERACIONAL nunca sai
        // desse estado por aqui — só pelos mecanismos dedicados do bloco 4.
        // Cancelar uma tarefa usada como pré-requisito também é bloqueado.
        await assertTaskStatusTransitionAllowed(prisma, existing, req.body.status);

        // ── Dependência real entre tarefas do catalog2 ──────────────────────
        // Mesmo gate de PATCH /:id/release — esta rota genérica permite
        // setar qualquer status diretamente (usada pelo modo de edição do
        // admin), então é uma chamada de API que também precisa ser
        // bloqueada quando a dependência não foi cumprida.
        if (transitionNeedsDependencyGate(existing.status, req.body.status)) {
          const blocker = await findUnmetCatalog2Dependency(prisma, existing);
          if (blocker) {
            const overrideReason = typeof req.body.dependency_override_reason === "string" ? req.body.dependency_override_reason.trim() : "";
            const canOverride = isAdminUser(req.user) && overrideReason.length > 0;
            if (!canOverride) {
              res.status(409).json({
                error: `Esta tarefa depende de "${blocker.title}", que ainda não foi concluída.`,
                code: "dependency_not_met",
                blocked_by: blocker,
              });
              return;
            }
            await writeAccessAudit({
              actorId: req.user!.id,
              action: "project_task.dependency_override",
              after: { task_id: existing.id, blocked_by_task_id: blocker.task_id },
              reason: overrideReason,
            });
          }
        }

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
      if (err instanceof TaskStatusGuardError || err instanceof DependencyInUseError) {
        res.status(err.httpStatus).json({ error: err.message, code: err.code });
        return;
      }
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

      // ── Dependência real entre tarefas do catalog2 ────────────────────────
      // Tarefa dependente não pode iniciar enquanto a anterior obrigatória
      // não estiver concluída. Autoridade é sempre o servidor — bloqueia
      // aqui mesmo que a chamada venha direto da API, sem passar pela UI.
      const blocker = await findUnmetCatalog2Dependency(prisma, task);
      if (blocker) {
        const overrideReason = typeof req.body?.dependency_override_reason === "string" ? req.body.dependency_override_reason.trim() : "";
        const canOverride = isAdminUser(req.user) && overrideReason.length > 0;
        if (!canOverride) {
          res.status(409).json({
            error: `Esta tarefa depende de "${blocker.title}", que ainda não foi concluída.`,
            code: "dependency_not_met",
            blocked_by: blocker,
          });
          return;
        }
        await writeAccessAudit({
          actorId: req.user!.id,
          action: "project_task.dependency_override",
          after: { task_id: task.id, blocked_by_task_id: blocker.task_id },
          reason: overrideReason,
        });
      }

      const updated = await prisma.projectTask.update({
        where: { id: req.params.id as string },
        data: {
          status: "LIBERADA_PARA_EXECUCAO",
          data_liberacao_execucao: new Date(),
        },
      });

      // Tarefa com etapas é conduzida pelo motor: quem define executor e prazo
      // é a etapa, não a tarefa. Abrir a primeira etapa aqui é o que dá partida
      // — ver src/lib/stage-engine.ts.
      const abertura = await iniciarEtapasDaTarefa(prisma, updated.id);
      if (abertura?.status === "AGUARDANDO_EXECUTOR") {
        atribuirExecutorDaEtapa(abertura.stageId).catch((err) =>
          console.error("[stage-engine] atribuir executor:", err),
        );
      }

      // Sem etapas: a tarefa entra no RODÍZIO de ofertas de Nômade (ata
      // 2026-08, bloco 4/5) — uma oferta individual por vez, não mais
      // atribuição automática do "melhor". Fire-and-forget: a resposta sai
      // como LIBERADA_PARA_EXECUCAO e o rodízio começa em seguida.
      if (!abertura) {
        startTaskRotation(updated.id).catch((err) =>
          console.error("[task-rotation] start:", err),
        );
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /api/project-tasks/:id/rotation ─────────────────────────────────────
// Controles de distribuição: deliberadamente Admin Master apenas. O servidor
// não confia no botão da interface para habilitar/desabilitar a automação.
const routingSettingsSchema = z.object({
  offer_timeout_minutes: z.number().int().min(1).max(24 * 60),
  mandatory_decline_alerts: z.boolean(),
});
const routingAreaSchema = z.object({ area: z.string().trim().min(1).max(191), auto_nomad_dispatch_enabled: z.boolean() });
const routingTaskSchema = z.object({ auto_nomad_dispatch_enabled: z.boolean() });
const routingNomadeSchema = z.object({ nomade_id: z.string().min(1) });

router.get("/routing/settings", verifyToken, requireAdminMaster, async (_req, res, next) => {
  try {
    const settings = await prisma.taskRoutingSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", offer_timeout_minutes: 60, mandatory_decline_alerts: true }, update: {},
    });
    res.json(settings);
  } catch (err) { next(err); }
});

router.put("/routing/settings", verifyToken, requireAdminMaster, validate(routingSettingsSchema), async (req, res, next) => {
  try {
    const saved = await prisma.taskRoutingSettings.upsert({
      where: { id: "singleton" }, create: { id: "singleton", ...req.body }, update: req.body,
    });
    res.json(saved);
  } catch (err) { next(err); }
});

router.get("/routing/areas", verifyToken, requireAdminMaster, async (_req, res, next) => {
  try { res.json(await prisma.taskRoutingAreaPolicy.findMany({ orderBy: { area: "asc" } })); } catch (err) { next(err); }
});

router.put("/routing/areas", verifyToken, requireAdminMaster, validate(routingAreaSchema), async (req, res, next) => {
  try {
    const saved = await prisma.taskRoutingAreaPolicy.upsert({
      where: { area: req.body.area },
      create: { ...req.body, updated_by_user_id: req.user!.id },
      update: { auto_nomad_dispatch_enabled: req.body.auto_nomad_dispatch_enabled, updated_by_user_id: req.user!.id },
    });
    res.json(saved);
  } catch (err) { next(err); }
});

router.patch("/:id/routing", verifyToken, requireAdminMaster, validate(routingTaskSchema), async (req, res, next) => {
  try {
    const task = await prisma.projectTask.update({
      where: { id: req.params.id as string }, data: req.body,
      select: { id: true, auto_nomad_dispatch_enabled: true },
    });
    res.json(task);
  } catch (err) { next(err); }
});

router.get("/:id/routing/nomades", verifyToken, requireAdminMaster, async (req, res, next) => {
  try {
    const task = await prisma.projectTask.findUnique({ where: { id: req.params.id as string }, select: { id: true } });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada." }); return; }
    const all = await prisma.nomade.findMany({ where: { status: "ativo", user: { is: { is_active: true } } }, select: { id: true, name: true, user_id: true }, orderBy: { name: "asc" } });
    const { eligibleCandidatesForTask } = await import("../lib/task-rotation-engine");
    const eligible = new Set((await eligibleCandidatesForTask(task.id)).map((n) => n.nomadeId));
    res.json(all.map((n) => ({ ...n, eligible: eligible.has(n.id) })));
  } catch (err) { next(err); }
});

router.post("/:id/routing/manual-offer", verifyToken, requireAdminMaster, validate(routingNomadeSchema), async (req, res, next) => {
  try { res.status(201).json(await sendManualOffer(req.params.id as string, req.body.nomade_id, req.user!.id)); }
  catch (err) { if (err instanceof RotationError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; } next(err); }
});

router.post("/:id/routing/direct-assign", verifyToken, requireAdminMaster, validate(routingNomadeSchema), async (req, res, next) => {
  try { await assignNomadeDirectly(req.params.id as string, req.body.nomade_id, req.user!.id); res.json({ ok: true }); }
  catch (err) { if (err instanceof RotationError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; } next(err); }
});

// ── GET /api/project-tasks/:id/rotation ─────────────────────────────────────
// Situação do rodízio de ofertas de Nômade — para o responsável entender por
// que ninguém assumiu. Mesmo escopo de leitura da tarefa.
router.get("/:id/rotation", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
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
    const status = await getRotationStatus(task.id);
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/project-tasks/:id/rotation/restart ───────────────────────────
// Reinicia o rodízio quando há candidatos de novo. Autorização REAL no
// servidor: admin, ou Líder responsável pela tarefa, ou Admin responsável do
// projeto (validado dentro de restartRotation).
router.post("/:id/rotation/restart", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
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
    const isAdmin = req.user!.account_type === "admin" || req.user!.role === "admin";
    await restartRotation(task.id, req.user!.id, isAdmin);
    const status = await getRotationStatus(task.id);
    res.json({ ok: true, rotation: status });
  } catch (err) {
    if (err instanceof RotationError) {
      res.status(err.httpStatus).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// ── POST /api/project-tasks/:id/transfer ─────────────────────────────────────
// Transfere uma tarefa PAGA e NÃO USADA pra outro projeto — o pagamento
// original nunca é reescrito (Payment/PaymentItem continuam apontando pro
// projeto de origem, é literalmente o comprovante de que aquele valor já
// foi cobrado ali). Só admin — move valor já reconhecido entre os livros de
// dois projetos, possivelmente de agências/clientes diferentes.
//
// Sempre por PRODUTO INTEIRO, nunca por tarefa isolada: um ProjectProduct
// pode ter várias tarefas-irmãs e não existe hoje "quantidade"/preço por
// tarefa — se alguma irmã já foi tocada, a transferência inteira é
// recusada, senão o valor ficaria contado nos dois projetos ao mesmo tempo.
const transferTaskSchema = z.object({
  target_project_id: z.string().min(1),
});

// Toda tarefa gerada já nasce com suas ProjectTaskStage (PENDENTE/BLOQUEADA)
// criadas junto — existência de etapa não é sinal de atividade, só o status
// dela é. "Iniciada" = qualquer etapa fora de PENDENTE/BLOQUEADA.
function tarefaEstaIntocada(t: {
  status: string;
  nomade_responsavel_id: string | null;
  stages: { status: string }[];
  _count: { attachments: number; briefing_answers: number };
}): boolean {
  return (
    t.status === "PARA_LANCAMENTO" &&
    !t.nomade_responsavel_id &&
    t.stages.every((s) => s.status === "PENDENTE" || s.status === "BLOQUEADA") &&
    t._count.attachments === 0 &&
    t._count.briefing_answers === 0
  );
}

router.post(
  "/:id/transfer",
  verifyToken,
  requireRole("admin"),
  validate(transferTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { target_project_id } = req.body as z.infer<typeof transferTaskSchema>;

      const task = await prisma.projectTask.findUnique({
        where: { id: req.params.id as string },
        include: { project_product: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }
      if (task.project_id === target_project_id) {
        res.status(400).json({ error: "A tarefa já está neste projeto." });
        return;
      }

      const targetProject = await prisma.project.findUnique({
        where: { id: target_project_id },
        select: { id: true },
      });
      if (!targetProject) {
        res.status(404).json({ error: "Projeto de destino não encontrado" });
        return;
      }

      // Tarefa em si + toda tarefa-irmã do mesmo ProjectProduct precisam
      // estar intocadas — só uma checagem de "atividade" (mesmo trio que
      // PATCH /:id já consulta em conjunto: etapas/anexos/briefing).
      const siblings = await prisma.projectTask.findMany({
        where: { project_product_id: task.project_product_id },
        include: {
          stages: { select: { status: true } },
          _count: {
            select: { attachments: true, briefing_answers: true },
          },
        },
      });

      const naoIntocadas = siblings.filter((t) => !tarefaEstaIntocada(t));
      if (naoIntocadas.length > 0) {
        const alvoTocado = naoIntocadas.some((t) => t.id === task.id);
        res.status(409).json({
          error: alvoTocado
            ? "Esta tarefa já foi iniciada (nômade atribuído, etapa iniciada, anexo ou briefing respondido) e não pode ser transferida."
            : "Esta tarefa compartilha uma compra com outra(s) tarefa(s) já iniciada(s); só é possível transferir quando nenhuma tarefa do mesmo produto foi tocada.",
        });
        return;
      }

      const sourceProjectProduct = task.project_product;

      const result = await prisma.$transaction(async (tx) => {
        // Acha um vínculo já ativo do mesmo produto no destino, ou cria um
        // novo copiando os snapshots comerciais originais — nunca gera
        // cobrança nova (origin: "TRANSFERENCIA").
        let targetProjectProduct = await tx.projectProduct.findFirst({
          where: {
            project_id: target_project_id,
            product_id: sourceProjectProduct.product_id,
            status: { not: "CANCELADO" },
          },
        });

        if (!targetProjectProduct) {
          targetProjectProduct = await tx.projectProduct.create({
            data: {
              project_id: target_project_id,
              product_id: sourceProjectProduct.product_id,
              variation_id: sourceProjectProduct.variation_id,
              product_name_snapshot: sourceProjectProduct.product_name_snapshot,
              product_code_snapshot: sourceProjectProduct.product_code_snapshot,
              product_category_snapshot: sourceProjectProduct.product_category_snapshot,
              product_price_snapshot: sourceProjectProduct.product_price_snapshot,
              recurrence_snapshot: sourceProjectProduct.recurrence_snapshot,
              preco_final_cliente_snapshot: sourceProjectProduct.preco_final_cliente_snapshot,
              comissao_snapshot: sourceProjectProduct.comissao_snapshot,
              pagador_snapshot: sourceProjectProduct.pagador_snapshot,
              alteracoes_incluidas_snapshot: sourceProjectProduct.alteracoes_incluidas_snapshot,
              valor_alteracao_extra_snapshot: sourceProjectProduct.valor_alteracao_extra_snapshot,
              taxa_emergencial_reducao_percentual_snapshot:
                sourceProjectProduct.taxa_emergencial_reducao_percentual_snapshot,
              status: "EM_EXECUCAO",
              origin: "TRANSFERENCIA",
            },
          });
        }

        await tx.projectProduct.update({
          where: { id: sourceProjectProduct.id },
          data: { status: "TRANSFERIDO" },
        });

        const now = new Date();
        await tx.projectTask.updateMany({
          where: { id: { in: siblings.map((t) => t.id) } },
          data: {
            project_id: target_project_id,
            project_product_id: targetProjectProduct.id,
            transferred_from_project_id: task.project_id,
            transferred_at: now,
            transferred_by_user_id: req.user!.id,
          },
        });

        return { targetProjectProductId: targetProjectProduct.id };
      });

      await recalculateProjectValue(prisma, task.project_id);
      await recalculateProjectValue(prisma, target_project_id);

      const transferredTasks = await prisma.projectTask.findMany({
        where: { id: { in: siblings.map((t) => t.id) } },
      });

      res.json({
        transferred_tasks: transferredTasks,
        source_project_product_id: sourceProjectProduct.id,
        target_project_product_id: result.targetProjectProductId,
      });
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

      // ── Helper: normalize the raw JSON stored in briefing_questions/briefing_snapshot
      // The field can contain either:
      //   a) A rich array of objects: [{ question_key, question_text, type, required, options }]
      //   b) A plain string array (from the admin "modelos-tarefas" UI): ["question text", ...]
      // We normalize both into the rich object format.
      function normalizeBriefingQuestions(raw: unknown[]): Record<string, unknown>[] {
        return raw.map((item, idx) => {
          if (typeof item === "string") {
            // Plain string → convert to minimal rich object
            return {
              question_key: `q_${idx}`,
              question_text: item,
              type: "text_long",
              required: true,
            };
          }
          if (item && typeof item === "object") {
            const q = item as Record<string, unknown>;
            // Already rich — ensure question_key exists
            if (!q.question_key) {
              q.question_key = q.key ?? `q_${idx}`;
            }
            // Normalize text field.
            //
            // `question` e `instructions` são o formato que veio da
            // importação da plataforma antiga (as perguntas trazem
            // legacyQuestionId) e também o que o cadastro de produtos grava.
            // Sem eles na lista, toda pergunta importada caía no rótulo
            // genérico "Pergunta N" e a dica sumia — o briefing ficava
            // impossível de responder sem adivinhar.
            if (!q.question_text) {
              q.question_text =
                q.question ?? q.text ?? q.label ?? `Pergunta ${idx + 1}`;
            }
            // Dica exibida abaixo do enunciado (ex.: "Ex: Gerar mais vendas").
            if (!q.description) {
              q.description = q.instructions ?? q.hint ?? undefined;
            }
            // Normalize vocabulário antigo de `type` (usado em alguns catálogos
            // seedados: "text"/"textarea"/"multiselect") pro vocabulário que o
            // TaskLaunchDrawer realmente reconhece pra escolher o input certo
            // ("text_short"/"text_long"/"multiple_choice") — sem isso, essas
            // perguntas renderizavam sem NENHUM campo de resposta.
            const TYPE_ALIASES: Record<string, string> = {
              text: "text_short",
              textarea: "text_long",
              multiselect: "multiple_choice",
            };
            if (typeof q.type === "string" && TYPE_ALIASES[q.type]) {
              q.type = TYPE_ALIASES[q.type];
            }
            return q;
          }
          return { question_key: `q_${idx}`, question_text: String(item), type: "text_long", required: true };
        });
      }

      // Prefer snapshot saved at task creation; fall back to live CatalogTask data
      let rawQuestions: unknown[] = [];
      if (task.briefing_snapshot) {
        try {
          const parsed = JSON.parse(task.briefing_snapshot);
          if (Array.isArray(parsed)) rawQuestions = parsed;
        } catch {}
      }
      if (rawQuestions.length === 0 && task.catalog_task?.briefing_questions) {
        try {
          const parsed = JSON.parse(task.catalog_task.briefing_questions);
          if (Array.isArray(parsed)) rawQuestions = parsed;
        } catch {}
      }
      const briefingQuestions = normalizeBriefingQuestions(rawQuestions);

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
        select: { id: true, briefing_snapshot: true, project_id: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const { answers } = req.body as z.infer<typeof briefingAnswerSchema>;
      if (await rejectInvalidBriefing(res, task, answers, false)) return;

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
      if (await rejectInvalidBriefing(res, task, answers, true)) return;

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

// ── PATCH /api/project-tasks/:id/aprovar ─────────────────────────────────────
// Aceite da entrega. Dois níveis: a agência confere e depois o cliente; a
// tarefa só encerra no último. Nível é inferido do que já foi aprovado, mas
// pode ser forçado (ex.: admin registrando o aceite do cliente).

const aprovarSchema = z.object({
  nivel: z.enum(["agencia", "cliente"]).optional(),
});

/**
 * Em que nível esta pessoa pode assinar.
 *
 * O `nivel` do corpo não pode valer por si: quem chega pela tela da empresa
 * mandaria "agencia" e registraria um aceite que não é dele, encerrando a
 * tarefa sem o primeiro nível. Cada conta assina no seu lado, e só o admin
 * força o nível — é ele que registra o aceite de quem decidiu por fora
 * (telefone, e-mail, reunião).
 */
function nivelPermitido(
  accountType: string,
  role: string,
  nivelPedido?: "agencia" | "cliente",
): "agencia" | "cliente" | undefined {
  if (accountType === "admin" || role === "admin") return nivelPedido;
  if (accountType === "empresas") return "cliente";
  // Agência, parceiro e líder são o lado interno de quem contratou.
  if (accountType === "agencias" || role === "lider") return "agencia";
  return nivelPedido;
}

/**
 * A ordem importa: a agência confere antes do cliente. Sem esta checagem o
 * cliente conseguiria assinar enquanto a tarefa ainda estava com a agência —
 * o aceite dele ficaria gravado fora de ordem e a tarefa encerraria sozinha
 * assim que a agência aprovasse.
 *
 * Vale para quem assina do próprio lado. O admin continua podendo forçar,
 * porque ele registra aceite decidido fora da plataforma.
 */
function ordemDeAprovacaoOk(
  accountType: string,
  role: string,
  nivel: "agencia" | "cliente" | undefined,
  tarefa: {
    aprovado_agencia_em: Date | null;
    aprovado_cliente_em: Date | null;
    exige_aprovacao_cliente: boolean;
  },
): boolean {
  if (accountType === "admin" || role === "admin") return true;
  if (!nivel) return true; // sem nível explícito o motor infere o pendente
  return nivelPendente(tarefa) === nivel;
}

router.patch(
  "/:id/aprovar",
  verifyToken,
  validate(aprovarSchema),
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

      const aprovavel = ["EM_APROVACAO", "APROVACAO_PENDENTE_CLIENTE", "EM_REVISAO"];
      if (!aprovavel.includes(task.status)) {
        res.status(422).json({
          error: `Tarefa com status "${task.status}" não está aguardando aprovação.`,
          current_status: task.status,
        });
        return;
      }

      const nivel = nivelPermitido(
        req.user!.account_type,
        req.user!.role,
        req.body.nivel,
      );
      if (
        !ordemDeAprovacaoOk(req.user!.account_type, req.user!.role, nivel, task)
      ) {
        res.status(422).json({
          error:
            nivel === "cliente"
              ? "Esta entrega ainda está em conferência pela agência."
              : "O aceite deste nível já foi registrado.",
          nivel_pendente: nivelPendente(task),
        });
        return;
      }

      // Memória (acabamento do bloco 1/4): o registro da entrega aprovada
      // roda DENTRO da MESMA transação do aceite — nunca depois, separado.
      // Aceite e memória cometem juntos ou nenhum dos dois: se o registro de
      // memória falhar por qualquer motivo, a transação inteira volta atrás
      // e a tarefa continua exatamente como estava antes deste PATCH (nunca
      // fica "aprovada só no aceite, sem memória"). Uma nova tentativa deste
      // mesmo PATCH então refaz os dois passos do zero, com a
      // idempotency_key garantindo que não duplica se algum passo intermediário
      // já tiver comprometido antes de uma falha de rede na resposta.
      const resultado = await prisma.$transaction(async (tx) => {
        const r = await aprovarTarefa(tx, req.params.id as string, {
          userId: req.user!.id,
          nivel,
        });
        if (r.concluida) {
          await recordApprovedTask(
            {
              projectId: task.project_id,
              projectTaskId: task.id,
              approvedAt: new Date(),
              approvedByUserId: req.user!.id,
              idempotencyKey: `memory-approved-task:${task.id}`,
            },
            tx,
          );
          // Liberação por tarefa aprovada (bloco 4/4): mesma transação do
          // aceite + memória — localiza sucessoras, reavalia TODOS os
          // bloqueadores e libera só quando estiverem satisfeitos. Retry ou
          // duas aprovações concorrentes nunca liberam/notificam duas vezes
          // (CAS dentro de tryReleaseTask, chamada por reevaluateSuccessors).
          await reevaluateSuccessors(task.id, tx);
        }
        return r;
      });

      // ── Repasse ao nômade (fora da transação principal, best-effort — mesmo
      // padrão de recordWalletEvent em routes/payments.ts). Só credita depois
      // do aceite FINAL (concluida=true — nenhum nível de aprovação pendente),
      // nunca em aprovação parcial (só agência) nem em reprovação. Soma
      // valor_nomade de todas as etapas da tarefa; idempotencyKey por
      // task.id garante que reprocessar este PATCH (retry de rede) não
      // credita duas vezes.
      if (resultado.concluida && task.nomade_responsavel_id) {
        const stages = await prisma.projectTaskStage.findMany({
          where: { project_task_id: task.id },
          select: { valor_nomade: true },
        });
        const totalNomade = stages.reduce((sum, s) => sum + (s.valor_nomade ?? 0), 0);
        if (totalNomade > 0) {
          await recordWalletEvent("nomad", task.nomade_responsavel_id, {
            type: "task_payout",
            direction: "credit",
            amount: totalNomade,
            description: `Repasse — tarefa ${task.task_code ?? task.id} concluída e aprovada`,
            idempotencyKey: `task_payout_${task.id}`,
            referenceType: "project_task",
            referenceId: task.id,
            createdBy: req.user!.id,
            metadata: { project_id: task.project_id },
          });
        }
      }

      kickDependencies(task.project_id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
);

// ── PATCH /api/project-tasks/:id/reprovar ────────────────────────────────────
// Devolve a tarefa para execução com o motivo, reabrindo a última etapa
// concluída — é ela que precisa ser refeita.

const reprovarSchema = z.object({
  motivo: z.string().min(3),
  nivel: z.enum(["agencia", "cliente"]).optional(),
});

router.patch(
  "/:id/reprovar",
  verifyToken,
  validate(reprovarSchema),
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
          project_product: {
            select: { alteracoes_incluidas_snapshot: true, valor_alteracao_extra_snapshot: true },
          },
          project: { select: { client_id: true, company_id: true } },
        },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }

      const reprovavel = ["EM_APROVACAO", "APROVACAO_PENDENTE_CLIENTE", "EM_REVISAO"];
      if (!reprovavel.includes(task.status)) {
        res.status(422).json({
          error: `Tarefa com status "${task.status}" não está aguardando aprovação.`,
          current_status: task.status,
        });
        return;
      }

      const nivel = nivelPermitido(
        req.user!.account_type,
        req.user!.role,
        req.body.nivel,
      );
      if (
        !ordemDeAprovacaoOk(req.user!.account_type, req.user!.role, nivel, task)
      ) {
        res.status(422).json({
          error:
            nivel === "cliente"
              ? "Esta entrega ainda está em conferência pela agência."
              : "Este nível de aprovação já foi resolvido.",
          nivel_pendente: nivelPendente(task),
        });
        return;
      }

      // ── Limite de alterações grátis ───────────────────────────────────────
      // A reprovação além do limite (ProjectProduct.alteracoes_incluidas_
      // snapshot) fica bloqueada até a taxa correspondente ser paga — cria
      // (ou reaproveita) a fatura pendente e recusa, sem incrementar
      // `reprovacoes` nem chamar reprovarTarefa. NUNCA usar Math.max(0, ...)
      // aqui: excedente precisa poder ficar negativo pras reprovações dentro
      // do limite grátis (reprovacoes < limite), senão a checagem abaixo
      // (excedente >= alteracoes_extras_pagas, ambos podendo ser 0) bloqueia
      // a 1ª reprovação de qualquer tarefa (bug real, pego no smoke test).
      const limite = task.project_product.alteracoes_incluidas_snapshot;
      const excedente = task.reprovacoes - limite;
      if (excedente >= task.alteracoes_extras_pagas) {
        let invoice = task.pending_fee_invoice_id
          ? await prisma.invoice.findUnique({ where: { id: task.pending_fee_invoice_id } })
          : null;
        if (!invoice || invoice.status !== "pending") {
          const companyId = task.project.company_id ?? task.project.client_id ?? null;
          invoice = await prisma.invoice.create({
            data: {
              project_id: task.project_id,
              company_id: companyId,
              amount: task.project_product.valor_alteracao_extra_snapshot,
              status: "pending",
              description: `Alteração adicional além das ${limite} grátis — tarefa ${task.task_code ?? task.title}`,
            },
          });
          await prisma.projectTask.update({
            where: { id: task.id },
            data: { pending_fee_invoice_id: invoice.id },
          });
        }
        res.status(402).json({
          error: `Limite de ${limite} alterações grátis atingido. Pague a taxa de alteração adicional para continuar.`,
          invoice: { id: invoice.id, amount: invoice.amount, status: invoice.status },
        });
        return;
      }

      const resultado = await prisma.$transaction((tx) =>
        reprovarTarefa(tx, req.params.id as string, {
          userId: req.user!.id,
          motivo: req.body.motivo,
          nivel,
        }),
      );
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },
);

// ── Situação do fluxo, histórico de decisões e dispensa por regra ─────────────
// GET  /:id/flow       "por que está parada / o que falta" em linguagem clara
// GET  /:id/decisions  histórico de decisões automáticas e manuais (executor mantido/trocado,
//                      acessos validados, etapas dispensadas, dependências liberadas…)
// POST /:id/dispense   líder/admin dispensa a tarefa por regra (só antes de começar)
// ── Entregáveis e anexos estruturados da tarefa contratada (Pedido 3, fase 3) ──
// Quem enxerga cada item depende da visibilidade definida no cadastro; quem envia, do "responsável".
async function resolveTaskActor(req: Request, key: string) {
  const user = req.user!;
  const admin = isAdminUser(user);
  const sel = { id: true, lider_responsavel_id: true, reviewer_user_id: true, nomade_responsavel_id: true } as const;
  let task: { id: string; lider_responsavel_id: string | null; reviewer_user_id: string | null; nomade_responsavel_id: string | null } | null = null;
  let executor = false;
  if (user.account_type === "nomades") {
    const nomade = await prisma.nomade.findUnique({ where: { user_id: user.id }, select: { id: true } });
    if (nomade) {
      task = await prisma.projectTask.findFirst({
        where: { AND: [{ OR: [{ id: key }, { task_code: key }] }, { OR: [{ nomade_responsavel_id: nomade.id }, { stages: { some: { nomade_id: nomade.id } } }] }] },
        select: sel,
      });
      executor = !!task;
    }
  } else {
    const scopeWhere = await getTaskScopeWhere(user.id, user.account_type, user.role);
    if (scopeWhere) task = await prisma.projectTask.findFirst({ where: applyScope({ OR: [{ id: key }, { task_code: key }] }, scopeWhere), select: sel });
    // revisor designado (pode não ser o líder da tarefa) também enxerga
    if (!task) task = await prisma.projectTask.findFirst({ where: { AND: [{ OR: [{ id: key }, { task_code: key }] }, { reviewer_user_id: user.id }] }, select: sel });
  }
  if (!task) return null;
  const actor: DeliverableActor = {
    userId: user.id,
    admin,
    leader: !admin && (task.lider_responsavel_id === user.id || task.reviewer_user_id === user.id),
    executor,
    agency: user.account_type === "agencias",
    client: user.account_type === "empresas",
  };
  return { task, viewer: audienceOf(user), actor };
}

router.get("/:id/deliverables", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveTaskActor(req, req.params.id as string);
    if (!ctx) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    res.json({ data: await listDeliverablesFor(prisma, ctx.task.id, ctx.viewer, ctx.actor) });
  } catch (err) { next(err); }
});

const deliverableSubmitSchema = z.object({
  content_url: z.string().max(1000).nullish(),
  content_text: z.string().max(20000).nullish(),
  content_name: z.string().max(191).nullish(),
});
router.post("/:id/deliverables/:did/submit", verifyToken, validate(deliverableSubmitSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveTaskActor(req, req.params.id as string);
    if (!ctx) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const item = await prisma.projectTaskDeliverable.findFirst({ where: { id: req.params.did as string, project_task_id: ctx.task.id }, select: { id: true, visibility: true } });
    if (!item || !canSee(ctx.viewer, item.visibility as Visibility)) { res.status(404).json({ error: "Entregável não encontrado." }); return; }
    const updated = await submitDeliverable(prisma, item.id, ctx.actor, req.body);
    kickDependenciesForTask(ctx.task.id);
    res.json({ id: updated.id, status: updated.status });
  } catch (err) { next(err); }
});

const deliverableReviewSchema = z.object({ decisao: z.enum(["aprovar", "reprovar", "em_revisao"]), comentario: z.string().max(4000).optional() });
router.post("/:id/deliverables/:did/review", verifyToken, validate(deliverableReviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveTaskActor(req, req.params.id as string);
    if (!ctx) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const item = await prisma.projectTaskDeliverable.findFirst({ where: { id: req.params.did as string, project_task_id: ctx.task.id }, select: { id: true } });
    if (!item) { res.status(404).json({ error: "Entregável não encontrado." }); return; }
    const updated = await reviewDeliverable(prisma, item.id, ctx.actor, req.body.decisao, req.body.comentario);
    kickDependenciesForTask(ctx.task.id);
    res.json({ id: updated.id, status: updated.status });
  } catch (err) { next(err); }
});

// ── IA na tarefa (Pedido 3, fase 5): só administração, líder e executor enxergam e acionam ──
async function aiContext(req: Request, res: Response) {
  const ctx = await resolveTaskActor(req, req.params.id as string);
  if (!ctx) { res.status(404).json({ error: "Tarefa não encontrada" }); return null; }
  if (ctx.viewer === "agency" || ctx.viewer === "client") { res.status(403).json({ error: "A IA da tarefa é interna: seu perfil não tem acesso." }); return null; }
  return ctx;
}
router.get("/:id/ai", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await aiContext(req, res);
    if (!ctx) return;
    const config = await getTaskAIConfig(ctx.task.id);
    res.json({ config: config ? { mode: config.mode, trigger: config.trigger, prompt_version: config.prompt_version, profile_name: config.profile.name, active: config.profile.is_active, can_run: config.profile.is_active && canRunAI(ctx.actor, config.profile) } : null, runs: config ? await listRuns(ctx.task.id) : [] });
  } catch (err) { next(err); }
});
router.post("/:id/ai/run", verifyToken, validate(z.object({ stage_id: z.string().nullish(), inputs: z.record(z.string(), z.string()).optional(), note: z.string().max(2000).optional() })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await aiContext(req, res);
    if (!ctx) return;
    const r = await runTaskAI({ taskId: ctx.task.id, actor: ctx.actor, stageId: req.body.stage_id ?? null, inputs: req.body.inputs, note: req.body.note });
    kickDependenciesForTask(ctx.task.id);
    res.status(201).json({ run_id: r.run.id, status: r.run.status, forwarded: r.forwarded, reason: r.forwarded ? r.reason : null, output_text: r.run.output_text, cost: r.run.cost });
  } catch (err) { next(err); }
});
router.post("/:id/ai/runs/:runId/adopt", verifyToken, validate(z.object({ text: z.string().max(40000).optional(), note: z.string().max(2000).optional() })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await aiContext(req, res);
    if (!ctx) return;
    const own = await prisma.projectTaskAIRun.findFirst({ where: { id: req.params.runId as string, project_task_id: ctx.task.id }, select: { id: true } });
    if (!own) { res.status(404).json({ error: "Execução não encontrada." }); return; }
    const run = await adoptRun(own.id, ctx.actor, req.body);
    kickDependenciesForTask(ctx.task.id);
    res.json({ id: run.id, status: run.status, deliverable_id: run.deliverable_id });
  } catch (err) { next(err); }
});
router.post("/:id/ai/runs/:runId/discard", verifyToken, validate(z.object({ note: z.string().max(2000).optional() })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = await aiContext(req, res);
    if (!ctx) return;
    const own = await prisma.projectTaskAIRun.findFirst({ where: { id: req.params.runId as string, project_task_id: ctx.task.id }, select: { id: true } });
    if (!own) { res.status(404).json({ error: "Execução não encontrada." }); return; }
    const run = await discardRun(own.id, ctx.actor, req.body.note);
    res.json({ id: run.id, status: run.status });
  } catch (err) { next(err); }
});

// ── GET /api/project-tasks/:id/operational ───────────────────────────────────
// Guia operacional da tarefa (objetivo, instruções, entradas, saída esperada, critério de aceite,
// evidência…) — cada perfil só recebe o que a visibilidade do produto permite. O nômade só vê
// tarefas em que é o responsável ou tem etapa atribuída.
router.get("/:id/operational", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.params.id as string;
    const viewer = audienceOf(req.user);
    let taskId: string | null = null;
    if (req.user!.account_type === "nomades") {
      const nomade = await prisma.nomade.findUnique({ where: { user_id: req.user!.id }, select: { id: true } });
      if (nomade) {
        const t = await prisma.projectTask.findFirst({
          where: { AND: [{ OR: [{ id: key }, { task_code: key }] }, { OR: [{ nomade_responsavel_id: nomade.id }, { stages: { some: { nomade_id: nomade.id } } }] }] },
          select: { id: true },
        });
        taskId = t?.id ?? null;
      }
    } else {
      const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
      if (scopeWhere) {
        const t = await prisma.projectTask.findFirst({ where: applyScope({ OR: [{ id: key }, { task_code: key }] }, scopeWhere), select: { id: true } });
        taskId = t?.id ?? null;
      }
    }
    if (!taskId) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    res.json(await loadOperationalGuide(prisma, taskId, viewer));
  } catch (err) { next(err); }
});

router.get("/:id/flow", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
    if (scopeWhere === null) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const task = await prisma.projectTask.findFirst({ where: applyScope({ id: req.params.id as string }, scopeWhere), select: { id: true, status: true, lider_responsavel_id: true } });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const flow = await computeFlowStateFor(prisma, task.id, audienceOf(req.user!));
    const dispensable = ["PARA_LANCAMENTO", "EM_LANCAMENTO", "AGUARDANDO_INFORMACOES", "PENDENTE_DE_LIBERACAO", "RASCUNHO_OPERACIONAL"].includes(task.status);
    res.json({ ...flow, can_dispense: dispensable && (isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id) });
  } catch (err) { next(err); }
});

router.get("/:id/decisions", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
    if (scopeWhere === null) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const task = await prisma.projectTask.findFirst({ where: applyScope({ id: req.params.id as string }, scopeWhere), select: { id: true, project_id: true, project_product_id: true } });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const rows = await prisma.projectDecisionLog.findMany({
      where: { project_id: task.project_id, OR: [{ project_task_id: task.id }, { project_product_id: task.project_product_id, project_task_id: null }] },
      orderBy: { created_at: "desc" }, take: 100,
    });
    const INTERNAL_KINDS = ["executor_kept", "executor_changed", "executor_manual", "continuity_pending", "dependency_delay_alert", "operation_blocked"];
    const external = isExternalViewer(audienceOf(req.user!));
    res.json({ data: rows.filter((r) => !external || !INTERNAL_KINDS.includes(r.kind)).map((r) => ({ id: r.id, kind: r.kind, message: r.message, created_at: r.created_at, automatic: !r.actor_user_id })) });
  } catch (err) { next(err); }
});

router.post("/:id/dispense", verifyToken, validate(z.object({ reason: z.string().trim().min(3).max(500) })), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.projectTask.findUnique({ where: { id: req.params.id as string }, select: { id: true, title: true, status: true, project_id: true, project_product_id: true, lider_responsavel_id: true } });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    if (!(isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id)) { res.status(403).json({ error: "Somente o líder/administrador pode dispensar uma tarefa." }); return; }
    const dispensable = ["PARA_LANCAMENTO", "EM_LANCAMENTO", "AGUARDANDO_INFORMACOES", "PENDENTE_DE_LIBERACAO", "RASCUNHO_OPERACIONAL"];
    if (!dispensable.includes(task.status)) { res.status(422).json({ error: `Uma tarefa em "${task.status}" já começou e não pode ser dispensada.` }); return; }
    await prisma.$transaction(async (tx) => {
      await tx.projectTask.update({ where: { id: task.id }, data: { status: "DISPENSADA_POR_REGRA", data_conclusao: new Date() } });
      await logProjectDecision(tx, { projectId: task.project_id, projectProductId: task.project_product_id, projectTaskId: task.id, kind: "task_dispensed", message: `"${task.title}" foi dispensada por regra: ${req.body.reason}`, actorUserId: req.user!.id });
    });
    kickDependencies(task.project_id);
    res.json({ ok: true, status: "DISPENSADA_POR_REGRA" });
  } catch (err) { next(err); }
});

// ── Dependências da tarefa (pacote, produto, entregável, aprovação, ativo) ────
// GET /:id/dependencies  cada regra com estado claro: bloqueada | aguardando item | liberada | concluída
router.get("/:id/dependencies", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
    if (scopeWhere === null) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const task = await prisma.projectTask.findFirst({
      where: applyScope({ id: req.params.id as string }, scopeWhere),
      select: { id: true, status: true, project_id: true },
    });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const states = await ruleStatesForTask(prisma, task.id);
    const ruleRows = await prisma.projectDependencyRule.findMany({ where: { task_id: task.id } });
    const rowById = new Map(ruleRows.map((r) => [r.id, r]));
    const targets = await prisma.projectTask.findMany({ where: { id: { in: states.map((s) => s.targetTaskId).filter((x): x is string => !!x) } }, select: { id: true, title: true, status: true, lider_responsavel_id: true, nomade_responsavel_id: true } });
    const byId = new Map(targets.map((t) => [t.id, t]));
    const releaserIds = [...new Set([...ruleRows.map((r) => r.released_by_user_id), ...targets.map((t) => t.nomade_responsavel_id)].filter((x): x is string => !!x))];
    const releasers = releaserIds.length ? await prisma.user.findMany({ where: { id: { in: releaserIds } }, select: { id: true, name: true } }) : [];
    const releaserName = new Map(releasers.map((u) => [u.id, u.name]));
    const staffView = !isExternalViewer(audienceOf(req.user!));
    const canRelease = isAdminUser(req.user) || (await prisma.projectTask.findUnique({ where: { id: task.id }, select: { lider_responsavel_id: true } }))?.lider_responsavel_id === req.user!.id;
    res.json({
      status: task.status,
      applies: states.length > 0,
      blocked: states.some((s) => !s.satisfied && (s.behavior === "block_start" || s.behavior === "block_final")),
      can_release: canRelease,
      auto_update: true,
      rules: states.map((s) => {
        if (!staffView) return { behavior: s.behavior, satisfied: s.satisfied, reason: s.reason, targetKind: s.targetKind };
        const row = rowById.get(s.ruleId);
        const target = s.targetTaskId ? byId.get(s.targetTaskId) ?? null : null;
        return {
          ...s,
          target_task: target ? { id: target.id, title: target.title, status: target.status } : null,
          blocks: s.behavior === "block_start" ? "o início da tarefa" : s.behavior === "block_final" ? "a conclusão da tarefa" : s.behavior === "require_before_delivery" ? "o envio da entrega" : null,
          origin: row?.project_package_id ? "pacote" : row?.source_rule_id ? "regra do catálogo" : "regra da tarefa",
          expected_deliverable: row?.target_deliverable_key ?? null,
          responsible: target?.nomade_responsavel_id ? releaserName.get(target.nomade_responsavel_id) ?? null : null,
          released: row?.released_manually_at ? { at: row.released_manually_at, by: row.released_by_user_id ? releaserName.get(row.released_by_user_id) ?? null : null, reason: row.release_reason } : null,
          can_release: canRelease && !s.satisfied,
        };
      }),
    });
  } catch (err) { next(err); }
});

// POST /:id/dependencies/:ruleId/release  { reason }  — liberação MANUAL de uma dependência (só líder/admin; justificativa obrigatória; fica no histórico)
router.post("/:id/dependencies/:ruleId/release", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length < 10) { res.status(422).json({ error: "Explique o motivo da liberação (mínimo de 10 caracteres).", code: "release_reason_required" }); return; }
    const task = await prisma.projectTask.findUnique({ where: { id: req.params.id as string }, select: { id: true, title: true, project_id: true, project_product_id: true, lider_responsavel_id: true } });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    if (!(isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id)) { res.status(403).json({ error: "Somente o líder da tarefa ou a administração pode liberar uma dependência." }); return; }
    const rule = await prisma.projectDependencyRule.findFirst({ where: { id: req.params.ruleId as string, task_id: task.id } });
    if (!rule) { res.status(404).json({ error: "Dependência não encontrada nesta tarefa." }); return; }
    if (rule.released_manually_at) { res.status(409).json({ error: "Esta dependência já foi liberada manualmente.", code: "already_released" }); return; }
    await prisma.$transaction(async (tx) => {
      await tx.projectDependencyRule.update({ where: { id: rule.id }, data: { released_manually_at: new Date(), released_by_user_id: req.user!.id, release_reason: reason } });
      await logProjectDecision(tx, { projectId: task.project_id, projectProductId: task.project_product_id, projectTaskId: task.id, kind: "dependency_released_manually", message: `A dependência "${rule.reason}" de "${task.title}" foi liberada manualmente. Motivo: ${reason}`, actorUserId: req.user!.id });
    });
    kickDependencies(task.project_id);
    res.json({ ok: true, released: true });
  } catch (err) { next(err); }
});

// ── Ativos/acessos do cliente exigidos pela tarefa ───────────────────────────
// GET /:id/assets  quais acessos a tarefa precisa, status de cada um e se valem pela regra dela
router.get("/:id/assets", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
    if (scopeWhere === null) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const task = await prisma.projectTask.findFirst({
      where: applyScope({ id: req.params.id as string }, scopeWhere),
      select: { id: true, lider_responsavel_id: true, catalog2_task: { select: { asset_rule: true, asset_revalidate_days: true } } },
    });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const links = await prisma.clientAssetLink.findMany({ where: { project_task_id: task.id }, include: { asset: true }, orderBy: { created_at: "asc" } });
    const rule = task.catalog2_task?.asset_rule ?? "first_only";
    const staff = isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id || req.user!.role === "lider";
    res.json({
      applies: links.length > 0,
      rule,
      rule_label: ASSET_RULE_LABEL[rule as keyof typeof ASSET_RULE_LABEL] ?? rule,
      revalidate_days: task.catalog2_task?.asset_revalidate_days ?? null,
      can_validate: staff,
      // quem pode avisar que algo mudou no acesso: o cliente, a agência e a equipe Allka (o executor não)
      can_report: staff || req.user!.account_type === "empresas" || req.user!.account_type === "agencias",
      assets: links.map((l) => ({
        id: l.asset.id, asset_type: l.asset.asset_type, label: l.asset.label, platform: l.asset.platform, identifier: l.asset.identifier,
        status: l.asset.status, is_required: l.is_required, last_validated_at: l.asset.last_validated_at, scope_confirmed: l.asset.scope_confirmed,
        expires_at: l.asset.expires_at, valid: isAssetValid(l.asset, rule, { revalidateDays: task.catalog2_task?.asset_revalidate_days }),
      })),
    });
  } catch (err) { next(err); }
});

// ── Continuidade com o mesmo executor ────────────────────────────────────────
// GET  /:id/continuity  situação (regra, decisão, executor anterior, quem pode escolher)
// POST /:id/continuity  { choice: "keep" | "redistribute" | "manual_leader", nomade_id? }
//   "Manter com o mesmo nômade/executor do ciclo anterior?" — cliente/agência/líder
//   escolhem manter ou redistribuir pela fila; definir manualmente é só do líder/admin.

const continuitySchema = z.object({
  choice: z.enum(CONTINUITY_CHOICES),
  nomade_id: z.string().optional(),
});

async function showsExecutorName(taskId: string): Promise<boolean> {
  const t = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { catalog2_task: { select: { version: { select: { show_executor_name: true } } } } } });
  return !!t?.catalog2_task?.version?.show_executor_name;
}

router.get("/:id/continuity", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
    if (scopeWhere === null) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const task = await prisma.projectTask.findFirst({
      where: applyScope({ id: req.params.id as string }, scopeWhere),
      select: {
        id: true, status: true, executor_continuity: true, continuity_status: true, continuity_prev_task_id: true, continuity_prev_nomade_id: true,
        continuity_decided_at: true, lider_responsavel_id: true, nomade_responsavel_id: true,
      },
    });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const prevNomade = task.continuity_prev_nomade_id
      ? await prisma.nomade.findUnique({ where: { id: task.continuity_prev_nomade_id }, select: { id: true, name: true } })
      : null;
    const prevTask = task.continuity_prev_task_id
      ? await prisma.projectTask.findUnique({ where: { id: task.continuity_prev_task_id }, select: { id: true, title: true, data_conclusao: true } })
      : null;
    const leaderOrAdmin = isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id;
    res.json({
      applies: !!task.executor_continuity && task.executor_continuity !== "not_allowed",
      mode: task.executor_continuity,
      status: task.continuity_status,
      decided_at: task.continuity_decided_at,
      // Padrão: o cliente e a agência veem "Especialista responsável". A identificação nominal é configurável por produto/plano (versão).
      previous_executor: prevNomade && isExternalViewer(audienceOf(req.user!)) && !(await showsExecutorName(task.id)) ? { id: null, name: "Especialista responsável" } : prevNomade,
      previous_task: prevTask,
      can_choose: task.continuity_status === "pending_choice" && !task.nomade_responsavel_id,
      can_choose_manually: leaderOrAdmin && !task.nomade_responsavel_id && !!task.continuity_status,
      recommended: task.executor_continuity === "recommended",
    });
  } catch (err) { next(err); }
});

router.post("/:id/continuity", verifyToken, validate(continuitySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
    if (scopeWhere === null) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const task = await prisma.projectTask.findFirst({
      where: applyScope({ id: req.params.id as string }, scopeWhere),
      select: { id: true, status: true, lider_responsavel_id: true },
    });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const leaderOrAdmin = isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id;
    const resultado = await prisma.$transaction((tx) =>
      decideContinuity(tx, task.id, { choice: req.body.choice, nomadeId: req.body.nomade_id ?? null, actorUserId: req.user!.id, canManual: leaderOrAdmin }),
    );
    // Se a tarefa já foi liberada, dá a partida agora (mantido → direciona; redistribuir → fila).
    if (["LIBERADA_PARA_EXECUCAO", "AGUARDANDO_NOMADE"].includes(task.status)) {
      startTaskRotation(task.id).catch((err) => console.error("[continuity] start rotation:", err));
    }
    res.json(resultado);
  } catch (err) {
    if (err instanceof ContinuityError) { res.status(err.httpStatus).json({ error: err.message }); return; }
    next(err);
  }
});

// ── Qualificação obrigatória ─────────────────────────────────────────────────
// POST  /:id/qualificacao  { decisao: "aprovar" | "reprovar" | "comentar", comentario }
// GET   /:id/qualificacao  histórico (entrega solicitada, aprovações, ajustes, comentários)
// Só o líder/qualificador da tarefa (ou o admin) decide. Reprovar devolve ao
// executor (EM_AJUSTES) e NÃO conta como alteração grátis do cliente.

// ── POST/GET /api/project-tasks/:id/revisao ─────────────────────────────────
// Revisão obrigatória (conferência técnica): vem ANTES da qualificação e da aprovação.
// Só o revisor da tarefa (designado ou o líder responsável) ou o administrador decide.
const revisaoSchema = z.object({
  decisao: z.enum(["aprovar", "reprovar", "ajustes", "comentar"]),
  comentario: z.string().max(4000).optional(),
  minutos: z.number().int().min(0).max(10000).optional(),
});

router.post("/:id/revisao", verifyToken, validate(revisaoSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.projectTask.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, reviewer_user_id: true, lider_responsavel_id: true },
    });
    if (!task) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    if (!(isAdminUser(req.user) || revisorDaTarefa(task) === req.user!.id)) {
      res.status(403).json({ error: "Somente o revisor desta tarefa pode revisar a entrega." });
      return;
    }
    const resultado = await prisma.$transaction((tx) =>
      revisarTarefa(tx, task.id, { userId: req.user!.id, decisao: req.body.decisao, comentario: req.body.comentario, minutos: req.body.minutos }),
    );
    kickDependenciesForTask(task.id);
    if (resultado.proximo === "qualificacao") {
      garantirQualificador(task.id).catch((err) => console.error("[stage-engine] qualificador:", err));
    }
    res.json(resultado);
  } catch (err) {
    if (err instanceof RevisaoError) { res.status(err.httpStatus).json({ error: err.message }); return; }
    next(err);
  }
});

router.get("/:id/revisao", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.projectTask.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true, requires_review: true, review_round: true, reviewed_at: true, status: true, reviewer_user_id: true, lider_responsavel_id: true,
        nomade_responsavel_id: true, review_minutes: true, review_specialty_id: true, stages: { select: { nomade_id: true } },
      },
    });
    if (!t) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    // A revisão é interna: administração, revisor/líder da tarefa e o nômade que executou (para ver os ajustes pedidos).
    let allowed = isAdminUser(req.user) || revisorDaTarefa(t) === req.user!.id || t.lider_responsavel_id === req.user!.id;
    if (!allowed && req.user!.account_type === "nomades") {
      const nomade = await prisma.nomade.findUnique({ where: { user_id: req.user!.id }, select: { id: true } });
      allowed = !!nomade && (t.nomade_responsavel_id === nomade.id || t.stages.some((s) => s.nomade_id === nomade.id));
    }
    if (!allowed) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const historico = await prisma.projectTaskReview.findMany({ where: { project_task_id: t.id }, orderBy: { created_at: "asc" } });
    const total_minutos = historico.reduce((s, h) => s + (h.minutes_spent ?? 0), 0);
    const spec = t.review_specialty_id ? await prisma.catalog2Specialty.findUnique({ where: { id: t.review_specialty_id }, select: { id: true, name: true, max_hourly_rate: true } }) : null;
    const custo_estimado = spec?.max_hourly_rate != null ? Math.round((total_minutos / 60) * spec.max_hourly_rate * 100) / 100 : null;
    res.json({
      requires_review: t.requires_review, status: t.status, review_round: t.review_round, reviewed_at: t.reviewed_at,
      pode_revisar: isAdminUser(req.user) || revisorDaTarefa(t) === req.user!.id,
      revisor_id: revisorDaTarefa(t), minutos_estimados: t.review_minutes, total_minutos, custo_estimado,
      especialidade: spec ? { id: spec.id, name: spec.name } : null, historico,
    });
  } catch (err) { next(err); }
});

// ── Custos REALIZADOS da tarefa (Pedido 3, fase 7): IA (execuções registradas) + revisão (minutos gastos × valor/hora). Só administração e líder. ──
router.get("/:id/costs", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.projectTask.findUnique({
      where: { id: req.params.id as string },
      select: { id: true, requires_review: true, review_minutes: true, review_specialty_id: true, lider_responsavel_id: true, reviewer_user_id: true },
    });
    if (!t || !(isAdminUser(req.user) || t.lider_responsavel_id === req.user!.id || t.reviewer_user_id === req.user!.id)) { res.status(404).json({ error: "Tarefa não encontrada" }); return; }
    const reviews = await prisma.projectTaskReview.findMany({ where: { project_task_id: t.id }, select: { minutes_spent: true } });
    const spent = reviews.reduce((a, r) => a + (r.minutes_spent ?? 0), 0);
    const spec = t.review_specialty_id ? await prisma.catalog2Specialty.findUnique({ where: { id: t.review_specialty_id }, select: { name: true, max_hourly_rate: true } }) : null;
    const reviewCost = spec?.max_hourly_rate != null ? Math.round((spent / 60) * spec.max_hourly_rate * 100) / 100 : null;
    const runs = await prisma.projectTaskAIRun.findMany({ where: { project_task_id: t.id }, select: { status: true, prompt_tokens: true, completion_tokens: true, cost: true } });
    const byStatus: Record<string, number> = {};
    for (const r of runs) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const aiCost = Math.round(runs.reduce((a, r) => a + (r.cost ?? 0), 0) * 1_000_000) / 1_000_000;
    res.json({
      review: { planned_minutes: t.review_minutes, spent_minutes: spent, specialty: spec?.name ?? null, estimated_cost: reviewCost },
      ai: { runs: runs.length, by_status: byStatus, tokens_in: runs.reduce((a, r) => a + r.prompt_tokens, 0), tokens_out: runs.reduce((a, r) => a + r.completion_tokens, 0), cost: aiCost },
      total_realized: Math.round((aiCost + (reviewCost ?? 0)) * 100) / 100,
    });
  } catch (err) { next(err); }
});

const qualificacaoSchema = z.object({
  decisao: z.enum(["aprovar", "reprovar", "comentar"]),
  comentario: z.string().max(4000).optional(),
});

router.post(
  "/:id/qualificacao",
  verifyToken,
  validate(qualificacaoSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const task = await prisma.projectTask.findUnique({
        where: { id: req.params.id as string },
        select: { id: true, requires_qualification: true, lider_responsavel_id: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }
      const podeQualificar = isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id;
      if (!podeQualificar) {
        res.status(403).json({ error: "Somente o líder/qualificador desta tarefa pode qualificar a entrega." });
        return;
      }
      const resultado = await prisma.$transaction((tx) =>
        qualificarTarefa(tx, task.id, {
          userId: req.user!.id,
          decisao: req.body.decisao,
          comentario: req.body.comentario,
        }),
      );
      kickDependenciesForTask(task.id);
      res.json(resultado);
    } catch (err) {
      if (err instanceof QualificacaoError) {
        res.status(err.httpStatus).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);

router.get(
  "/:id/qualificacao",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
      if (scopeWhere === null) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }
      const task = await prisma.projectTask.findFirst({
        where: applyScope({ id: req.params.id as string }, scopeWhere),
        select: { id: true, requires_qualification: true, qualification_round: true, qualified_at: true, status: true, lider_responsavel_id: true },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }
      const historico = await prisma.projectTaskQualification.findMany({
        where: { project_task_id: task.id },
        orderBy: { created_at: "asc" },
      });
      res.json({ ...task, pode_qualificar: isAdminUser(req.user) || task.lider_responsavel_id === req.user!.id, historico });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/project-tasks/:id/solicitar-emergencial ────────────────────────
// Agência ou cliente pedem entrega acelerada: comprime o prazo restante (da
// tarefa e de cada etapa aberta) e cobra +50% do valor do produto na hora —
// diferente do limite de alterações, NÃO bloqueia nada, é imediato. Só uma
// vez por tarefa (evita comprimir/cobrar repetidas vezes).

router.post(
  "/:id/solicitar-emergencial",
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
          project_product: {
            select: {
              preco_final_cliente_snapshot: true,
              taxa_emergencial_reducao_percentual_snapshot: true,
            },
          },
          project: {
            select: { client_id: true, company_id: true, agency_id: true, agency: true, title: true },
          },
          stages: {
            where: { status: { in: ["PENDENTE", "AGUARDANDO_EXECUTOR", "EM_ANDAMENTO"] } },
          },
        },
      });
      if (!task) {
        res.status(404).json({ error: "Tarefa não encontrada" });
        return;
      }
      if (["CONCLUIDA", "CANCELADA"].includes(task.status)) {
        res.status(422).json({
          error: `Tarefa com status "${task.status}" não pode receber entrega emergencial.`,
        });
        return;
      }
      if (task.emergencial_solicitada_em) {
        res.status(409).json({ error: "Entrega emergencial já foi solicitada para esta tarefa." });
        return;
      }

      const reducao = task.project_product.taxa_emergencial_reducao_percentual_snapshot;
      const valor = 0.5 * task.project_product.preco_final_cliente_snapshot;
      const agora = new Date();
      const comprimir = (data: Date) =>
        new Date(agora.getTime() + (data.getTime() - agora.getTime()) * (1 - reducao / 100));

      const resultado = await prisma.$transaction(async (tx) => {
        const novoDueDate =
          task.due_date && task.due_date > agora ? comprimir(task.due_date) : task.due_date;

        const stagesAjustadas: { id: string; prazo_execucao: Date }[] = [];
        for (const stage of task.stages) {
          if (stage.prazo_execucao && stage.prazo_execucao > agora) {
            const novoPrazo = comprimir(stage.prazo_execucao);
            await tx.projectTaskStage.update({
              where: { id: stage.id },
              data: { prazo_execucao: novoPrazo },
            });
            stagesAjustadas.push({ id: stage.id, prazo_execucao: novoPrazo });
          }
        }

        const companyId = task.project.company_id ?? task.project.client_id ?? null;
        const invoice = await tx.invoice.create({
          data: {
            project_id: task.project_id,
            company_id: companyId,
            amount: valor,
            status: "pending",
            description: `Taxa de entrega emergencial — tarefa ${task.task_code ?? task.title}`,
          },
        });

        const updatedTask = await tx.projectTask.update({
          where: { id: task.id },
          data: {
            due_date: novoDueDate,
            emergencial_solicitada_em: agora,
            emergencial_solicitada_por: req.user!.id,
            emergencial_reducao_percentual: reducao,
            emergencial_invoice_id: invoice.id,
          },
        });

        return { task: updatedTask, invoice, stagesAjustadas };
      });

      // Avisa a outra ponta do projeto (best-effort — nunca falha a resposta
      // principal por causa disso), mesmo padrão de avisarAprovadores.
      try {
        const solicitanteEhAgencia = req.user!.account_type === "agencias";
        let destinatarios: string[] = [];
        if (solicitanteEhAgencia) {
          const companyId = task.project.company_id ?? task.project.client_id;
          if (companyId) {
            const users = await prisma.user.findMany({
              where: { company_id: companyId },
              select: { id: true },
            });
            destinatarios = users.map((u) => u.id);
          }
        } else {
          let agencyId = task.project.agency_id ?? null;
          if (!agencyId && task.project.agency) {
            const porNome = await prisma.agency.findFirst({
              where: { name: task.project.agency },
              select: { id: true },
            });
            agencyId = porNome?.id ?? null;
          }
          if (agencyId) {
            const users = await prisma.user.findMany({
              where: { agency_id: agencyId },
              select: { id: true },
            });
            destinatarios = users.map((u) => u.id);
          }
        }
        if (destinatarios.length > 0) {
          await prisma.systemAlert.createMany({
            data: destinatarios.map((userId) => ({
              type: "entrega_emergencial_solicitada",
              title: `Entrega emergencial solicitada: ${task.title}`,
              message: `${solicitanteEhAgencia ? "A agência" : "O cliente"} solicitou entrega emergencial para a tarefa "${task.title}" — prazo reduzido em ${reducao}%, taxa de ${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} gerada.`,
              severity: "info",
              category: "alerta",
              entity_type: "project_task",
              entity_id: task.id,
              user_id: userId,
            })),
          });
        }
      } catch (err) {
        console.error("[project-tasks] avisar entrega emergencial:", err);
      }

      res.json({
        novo_due_date: resultado.task.due_date,
        stages_ajustadas: resultado.stagesAjustadas,
        invoice: resultado.invoice,
      });
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

      // Concluir etapa é o gatilho do motor: encerra esta, abre a seguinte
      // (herdando o nômade quando a configuração pede continuidade) e encerra
      // a tarefa quando não sobra etapa obrigatória. Ver src/lib/stage-engine.ts.
      if (req.body.status === "CONCLUIDA") {
        const resultado = await prisma.$transaction((tx) =>
          concluirEtapa(tx, req.params.stageId as string, { userId: req.user!.id }),
        );

        // Etapa seguinte que depende de nômade novo: a escolha roda fora da
        // transação, como já acontece na liberação da tarefa.
        if (resultado.proxima?.status === "AGUARDANDO_EXECUTOR") {
          atribuirExecutorDaEtapa(resultado.proxima.stageId).catch((err) =>
            console.error("[stage-engine] atribuir executor:", err),
          );
        }
        if (resultado.enviadaParaQualificacao) {
          garantirQualificador(resultado.tarefaId).catch((err) =>
            console.error("[stage-engine] qualificador:", err),
          );
        }
        if (resultado.enviadaParaRevisao) {
          garantirRevisor(resultado.tarefaId).catch((err) =>
            console.error("[stage-engine] revisor:", err),
          );
        }

        kickDependenciesForTask(resultado.tarefaId);
        const etapaAtualizada = await prisma.projectTaskStage.findUnique({
          where: { id: req.params.stageId as string },
        });
        res.json({
          ...etapaAtualizada,
          motor: {
            proxima_etapa: resultado.proxima,
            tarefa_concluida: resultado.tarefaConcluida,
          },
        });
        return;
      }

      const updated = await prisma.projectTaskStage.update({
        where: { id: req.params.stageId as string },
        data: { status: req.body.status },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
