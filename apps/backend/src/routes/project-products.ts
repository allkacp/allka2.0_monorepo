import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { assertProductContractable } from "../lib/product-contractability";
import { recalculateProjectValue } from "../lib/project-value";
import { parseProductMetadata } from "../lib/product-metadata";
import { getTaskScopeWhere, applyScope } from "./project-tasks";
import { findUnmetCatalog2Dependency, transitionNeedsDependencyGate } from "../lib/catalog2-task-dependencies";
import { assertTaskStatusTransitionAllowed, TaskStatusGuardError } from "../lib/task-release-guard";
import { DependencyInUseError } from "../lib/task-release-service";
import { combinedProjectWhere, isAdminUser } from "../lib/project-scope";

const router = Router();

// ── Escopo (fechamento de 02/11) ─────────────────────────────────────────────
// Antes qualquer sessão válida listava, vinculava, alterava e apagava produtos de QUALQUER projeto e lia as
// tarefas de todos. Agora tudo deriva do MESMO escopo das tarefas (getTaskScopeWhere, já usado no PATCH
// /tasks/:id abaixo), nunca de uma segunda regra.

type AuthUser = { id: string; role: string; account_type: string };

// Leitura dos vínculos projeto↔produto: admin vê tudo; agência/empresa só os projetos dela (legado OU novo);
// Líder só os vínculos com alguma tarefa visível para ele; outro perfil (nômade incluso) → null = nada.
async function projectProductScopeWhere(user: AuthUser): Promise<Record<string, unknown> | null> {
  const taskScope = await getTaskScopeWhere(user.id, user.account_type, user.role);
  if (taskScope === null || Object.keys(taskScope).length === 0) return taskScope;
  return user.role === "lider" ? { tasks: { some: taskScope } } : taskScope;
}

// Gravação (vincular, alterar status/preço, desvincular): só o admin e a agência/empresa dona do projeto.
async function canChangeProjectProducts(user: AuthUser, projectId: string): Promise<boolean> {
  if (isAdminUser(user)) return true;
  if (user.account_type !== "agencias" && user.account_type !== "empresas") return false;
  const { where } = await combinedProjectWhere(prisma, user.id, user.account_type);
  if (where === null) return false;
  return !!(await prisma.project.findFirst({ where: { AND: [{ id: projectId }, where] }, select: { id: true } }));
}

// Produto já pago = está num pagamento PAGO (só a confirmação de pagamento, lib/confirm-payment.ts, cria isso).
async function isProjectProductPaid(projectProductId: string): Promise<boolean> {
  return (await prisma.paymentItem.count({ where: { project_product_id: projectProductId, payment: { status: "PAGO" } } })) > 0;
}

const PAID_LOCKED = "product_paid_locked";

// ── Schemas ──────────────────────────────────────────────────────────────────

const linkProductSchema = z.object({
  project_id: z.string().min(1),
  product_id: z.string().min(1),
  // Aceita null além de ausente: "sem variação" em JSON é null, e recusar isso
  // devolvia 400 com mensagem que não explicava nada ("o projeto precisa
  // possuir pelo menos um produto"), mandando quem integra caçar o erro errado.
  variation_id: z.string().nullable().optional(),
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

    const scopeWhere = await projectProductScopeWhere(req.user!);
    if (scopeWhere === null) {
      res.json({ data: [], total: 0 });
      return;
    }

    const items = await prisma.projectProduct.findMany({
      where: applyScope(where, scopeWhere),
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
            // Quem executa/lidera (só os ids; os nomes vão abaixo apenas para admin) — a tela do projeto não pode
            // sugerir atribuição que não existe (reteste Codex 01/11).
            nomade_responsavel_id: true,
            lider_responsavel_id: true,
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
        // Item 6.1 (reunião 2026-09-14, "Completar a execução dos
        // períodos") — ciclos de entrega mensal registrados pra um
        // contrato com período (vazio pra avulso ou período não-recorrente).
        // Os campos catalog2_period_* já vêm por baixo (sem `select` no
        // nível raiz, todo escalar do ProjectProduct é incluído).
        catalog2_delivery_cycles: { orderBy: { occurrence_index: "asc" } },
      },
      orderBy: { created_at: "asc" },
    });

    // Nomes do executor (Nômade) e do Líder só para admin — para os demais perfis a tela mostra
    // "Nômade atribuído"/"Equipe Allka" sem expor nomes, ou "Sem … atribuído" quando não há ninguém.
    if (req.user?.account_type === "admin") {
      const allTasks = items.flatMap((pp) => pp.tasks);
      const nomadeIds = [...new Set(allTasks.map((t) => t.nomade_responsavel_id).filter((id): id is string => !!id))];
      const liderIds = [...new Set(allTasks.map((t) => t.lider_responsavel_id).filter((id): id is string => !!id))];
      const [nomades, lideres] = await Promise.all([
        nomadeIds.length ? prisma.nomade.findMany({ where: { id: { in: nomadeIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
        liderIds.length ? prisma.user.findMany({ where: { id: { in: liderIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
      ]);
      const nomadeName = new Map(nomades.map((n) => [n.id, n.name]));
      const liderName = new Map(lideres.map((u) => [u.id, u.name]));
      const data = items.map((pp) => ({
        ...pp,
        tasks: pp.tasks.map((t) => ({
          ...t,
          nomade_responsavel_name: t.nomade_responsavel_id ? (nomadeName.get(t.nomade_responsavel_id) ?? null) : null,
          lider_responsavel_name: t.lider_responsavel_id ? (liderName.get(t.lider_responsavel_id) ?? null) : null,
        })),
      }));
      res.json({ data, total: data.length });
      return;
    }

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

      // 1. Verify project exists — e é de quem está vinculando (404 também para projeto alheio: não confirma que existe)
      const project = await prisma.project.findUnique({
        where: { id: project_id },
        select: { id: true, title: true, status: true },
      });
      if (!project || !(await canChangeProjectProducts(req.user!, project_id))) {
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

      // 3b. Limite de alterações grátis + taxa emergencial — congelados no
      // momento da compra, mesma lógica dos demais snapshots comerciais.
      const meta = parseProductMetadata(product.metadata);

      // 4. Sempre cria um vínculo novo — o mesmo produto pode ser comprado
      // mais de uma vez no mesmo projeto (ex.: duas instâncias do mesmo
      // produto mensal = mais volume). O histórico completo de compras fica
      // na aba "Produtos"; nunca bloqueamos uma nova compra por causa de um
      // vínculo anterior, ativo ou cancelado.
      let projectProduct = await prisma.projectProduct.create({
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
          alteracoes_incluidas_snapshot: meta.alteracoesIncluidas ?? 3,
          valor_alteracao_extra_snapshot: meta.valorAlteracaoExtra ?? 0,
          taxa_emergencial_reducao_percentual_snapshot:
            meta.taxaEmergencialReducaoPercentual ?? 50,
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
      if (!existing || !(await canChangeProjectProducts(req.user!, existing.project_id))) {
        res.status(404).json({ error: "Vínculo não encontrado" });
        return;
      }

      // Decisão do usuário (02/11): depois de pago, a agência/empresa dona não muda mais preço ao cliente, comissão
      // nem pagador, e não cancela o produto — só o admin corrige. Reenviar o mesmo valor continua aceito.
      // Exceção: produto do catálogo antigo (product_id) — a tela antiga de criar projeto grava preço/comissão/
      // pagador do checkout logo DEPOIS de pagar (project-create-new-panel.tsx, handleCheckoutComplete).
      if (!isAdminUser(req.user) && (await isProjectProductPaid(id))) {
        const changed = (field: "preco_final_cliente_snapshot" | "comissao_snapshot" | "pagador_snapshot") =>
          req.body[field] !== undefined && req.body[field] !== existing[field];
        const commercial =
          existing.product_id === null &&
          (changed("preco_final_cliente_snapshot") || changed("comissao_snapshot") || changed("pagador_snapshot"));
        const cancels = req.body.status === "CANCELADO" && existing.status !== "CANCELADO";
        if (commercial || cancels) {
          res.status(409).json({
            error: "Este produto já foi pago: preço, comissão, pagador e cancelamento só podem ser alterados pela Allka.",
            code: PAID_LOCKED,
          });
          return;
        }
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
      if (!existing || !(await canChangeProjectProducts(req.user!, existing.project_id))) {
        res.status(404).json({ error: "Vínculo não encontrado" });
        return;
      }
      // Produto pago não sai do projeto, para ninguém: o pagamento aponta para ele (o banco já recusava, com erro genérico).
      if (await isProjectProductPaid(id)) {
        res.status(409).json({ error: "Este produto já foi pago e não pode ser removido do projeto.", code: PAID_LOCKED });
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

      // Mesmo escopo de GET /api/project-tasks: fora dele, lista vazia.
      const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
      if (scopeWhere === null) {
        res.json({ data: [], total: 0 });
        return;
      }

      const tasks = await prisma.projectTask.findMany({
        where: applyScope(where, scopeWhere),
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
    // Mesmo escopo do PATCH abaixo; tarefa fora dele = 404 (não confirma que existe).
    const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
    if (scopeWhere === null) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }
    const task = await prisma.projectTask.findFirst({
      where: applyScope({ id: req.params.id as string }, scopeWhere),
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
      // Fechamento de "porta dos fundos" (auditoria do bloco 4/4): esta rota
      // legada não tinha NENHUM escopo/permissão nem checagem de dependência
      // — qualquer usuário autenticado podia liberar/mudar status de
      // qualquer tarefa de qualquer projeto. Agora reaproveita exatamente o
      // mesmo escopo e os mesmos gates de PATCH /api/project-tasks/:id,
      // nunca uma segunda implementação divergente.
      const scopeWhere = await getTaskScopeWhere(req.user!.id, req.user!.account_type, req.user!.role);
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

      const data: Record<string, unknown> = {};
      if (req.body.status !== undefined) {
        await assertTaskStatusTransitionAllowed(prisma, task, req.body.status);
        if (transitionNeedsDependencyGate(task.status, req.body.status)) {
          const blocker = await findUnmetCatalog2Dependency(prisma, task);
          if (blocker) {
            res.status(409).json({
              error: `Esta tarefa depende de "${blocker.title}", que ainda não foi concluída.`,
              code: "dependency_not_met",
              blocked_by: blocker,
            });
            return;
          }
        }

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
        where: { id: req.params.id as string },
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
      if (err instanceof TaskStatusGuardError || err instanceof DependencyInUseError) {
        res.status(err.httpStatus).json({ error: err.message, code: err.code });
        return;
      }
      next(err);
    }
  },
);

export default router;
