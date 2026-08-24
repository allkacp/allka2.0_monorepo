import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";

// Planejador (Admin → Projetos → Planejador). Quadro pessoal — cada usuário
// só vê/edita as próprias colunas e cards (owner_user_id, sempre resolvido
// do token, nunca do payload). Entidade própria, não uma view de Project —
// ver comentário no schema.prisma acima de `model PlannerColumn`.
const router = Router();

router.use(verifyToken, requireRole("admin"));

const DEFAULT_COLUMNS = [
  { label: "Backlog", color: "bg-slate-500" },
  { label: "A Fazer", color: "bg-sky-500" },
  { label: "Em Andamento", color: "bg-violet-500" },
  { label: "Em Revisão", color: "bg-amber-500" },
  { label: "Concluído", color: "bg-emerald-500" },
] as const;

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const COLUMN_SELECT = {
  id: true,
  label: true,
  color: true,
  position: true,
  updated_at: true,
} as const;

const CARD_SELECT = {
  id: true,
  column_id: true,
  title: true,
  description: true,
  priority: true,
  due_date: true,
  project_id: true,
  position: true,
  archived_at: true,
  created_at: true,
  updated_at: true,
} as const;

function serializeColumn(c: {
  id: string;
  label: string;
  color: string;
  position: number;
  updated_at: Date;
}) {
  return {
    id: c.id,
    label: c.label,
    color: c.color,
    position: c.position,
    updatedAt: c.updated_at.toISOString(),
  };
}

function serializeCard(c: {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: Date | null;
  project_id: string | null;
  position: number;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: c.id,
    columnId: c.column_id,
    title: c.title,
    description: c.description,
    priority: c.priority,
    dueDate: c.due_date ? c.due_date.toISOString() : null,
    projectId: c.project_id,
    position: c.position,
    archivedAt: c.archived_at ? c.archived_at.toISOString() : null,
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
  };
}

/** Garante que o usuário tenha ao menos as colunas padrão — só na primeira
 * visita (0 colunas). Nunca recria colunas que o usuário já apagou/editou;
 * roda uma vez só, condicionado a count() === 0. */
async function ensureDefaultColumns(ownerId: string) {
  const count = await prisma.plannerColumn.count({ where: { owner_user_id: ownerId } });
  if (count > 0) return;
  await prisma.plannerColumn.createMany({
    data: DEFAULT_COLUMNS.map((c, i) => ({
      owner_user_id: ownerId,
      label: c.label,
      color: c.color,
      position: i,
    })),
  });
}

type OwnedColumnResult = { error: 404; body: { error: string } } | { column: { id: string; label: string; color: string; position: number; updated_at: Date } };

async function findOwnedColumn(id: string, ownerId: string): Promise<OwnedColumnResult> {
  const row = await prisma.plannerColumn.findFirst({
    where: { id, owner_user_id: ownerId },
    select: COLUMN_SELECT,
  });
  if (!row) return { error: 404, body: { error: "Coluna não encontrada" } };
  return { column: row };
}

type OwnedCardResult =
  | { error: 404; body: { error: string } }
  | { card: NonNullable<Awaited<ReturnType<typeof prisma.plannerCard.findFirst>>> };

async function findOwnedCard(id: string, ownerId: string): Promise<OwnedCardResult> {
  const card = await prisma.plannerCard.findFirst({
    where: { id, owner_user_id: ownerId },
  });
  if (!card) return { error: 404, body: { error: "Card não encontrado" } };
  return { card };
}

// ─── GET /api/planner/board — colunas + cards ativos do usuário ───────────
router.get("/board", requirePermission("projetos", "view"), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    await ensureDefaultColumns(ownerId);
    const [columns, cards] = await Promise.all([
      prisma.plannerColumn.findMany({
        where: { owner_user_id: ownerId },
        orderBy: { position: "asc" },
        select: COLUMN_SELECT,
      }),
      prisma.plannerCard.findMany({
        where: { owner_user_id: ownerId, archived_at: null },
        orderBy: { position: "asc" },
        select: CARD_SELECT,
      }),
    ]);
    res.json({
      columns: columns.map(serializeColumn),
      cards: cards.map(serializeCard),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/planner/columns — criar coluna ──────────────────────────────
const createColumnSchema = z.object({
  label: z.string().trim().min(1, "Nome obrigatório").max(80),
  color: z.string().trim().min(1).max(80).optional(),
});

router.post(
  "/columns",
  requirePermission("projetos", "create"),
  validate(createColumnSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const body = req.body as z.infer<typeof createColumnSchema>;
      const count = await prisma.plannerColumn.count({ where: { owner_user_id: ownerId } });
      const column = await prisma.plannerColumn.create({
        data: {
          owner_user_id: ownerId,
          label: body.label,
          color: body.color ?? "bg-slate-500",
          position: count,
        },
        select: COLUMN_SELECT,
      });
      res.status(201).json({ column: serializeColumn(column) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/planner/columns/reorder — reordenar colunas ─────────────────
// Vem antes de /columns/:id de propósito (Express casaria "reorder" com
// :id senão).
const reorderColumnsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

router.put(
  "/columns/reorder",
  requirePermission("projetos", "edit"),
  validate(reorderColumnsSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const { orderedIds } = req.body as z.infer<typeof reorderColumnsSchema>;
      const owned = await prisma.plannerColumn.findMany({
        where: { owner_user_id: ownerId },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map((c) => c.id));
      if (orderedIds.length !== ownedIds.size || !orderedIds.every((id) => ownedIds.has(id))) {
        res.status(400).json({ error: "Lista de colunas inválida ou incompleta." });
        return;
      }
      await prisma.$transaction(
        orderedIds.map((id, index) =>
          prisma.plannerColumn.update({ where: { id }, data: { position: index } }),
        ),
      );
      const columns = await prisma.plannerColumn.findMany({
        where: { owner_user_id: ownerId },
        orderBy: { position: "asc" },
        select: COLUMN_SELECT,
      });
      res.json({ columns: columns.map(serializeColumn) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/planner/columns/:id — editar coluna ──────────────────────────
const updateColumnSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().min(1).max(80).optional(),
});

router.put(
  "/columns/:id",
  requirePermission("projetos", "edit"),
  validate(updateColumnSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const found = await findOwnedColumn(String(req.params.id), ownerId);
      if ("error" in found) {
        res.status(found.error).json(found.body);
        return;
      }
      const body = req.body as z.infer<typeof updateColumnSchema>;
      const column = await prisma.plannerColumn.update({
        where: { id: found.column.id },
        data: {
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.color !== undefined ? { color: body.color } : {}),
        },
        select: COLUMN_SELECT,
      });
      res.json({ column: serializeColumn(column) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/planner/columns/:id — excluir coluna vazia ───────────────
// Só permite excluir coluna sem cards ativos (409 senão) — evita apagar
// cards em cascata sem o usuário perceber. Mova/arquive os cards antes.
router.delete("/columns/:id", requirePermission("projetos", "delete"), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const found = await findOwnedColumn(String(req.params.id), ownerId);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    const activeCards = await prisma.plannerCard.count({
      where: { column_id: found.column.id, archived_at: null },
    });
    if (activeCards > 0) {
      res.status(409).json({
        error: "Esta coluna ainda tem cards. Mova ou remova os cards antes de excluir a coluna.",
      });
      return;
    }
    await prisma.plannerColumn.delete({ where: { id: found.column.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/planner/cards — criar card ──────────────────────────────────
const createCardSchema = z.object({
  columnId: z.string().min(1),
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
});

router.post(
  "/cards",
  requirePermission("projetos", "create"),
  validate(createCardSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const body = req.body as z.infer<typeof createCardSchema>;

      const column = await findOwnedColumn(body.columnId, ownerId);
      if ("error" in column) {
        res.status(400).json({ error: "Coluna informada é inválida." });
        return;
      }

      if (body.projectId) {
        const project = await prisma.project.findUnique({ where: { id: body.projectId }, select: { id: true } });
        if (!project) {
          res.status(400).json({ error: "Projeto informado não existe." });
          return;
        }
      }

      const count = await prisma.plannerCard.count({
        where: { column_id: column.column.id, owner_user_id: ownerId, archived_at: null },
      });

      const card = await prisma.plannerCard.create({
        data: {
          owner_user_id: ownerId,
          column_id: column.column.id,
          title: body.title,
          description: body.description ?? null,
          priority: body.priority ?? "medium",
          due_date: body.dueDate ? new Date(body.dueDate) : null,
          project_id: body.projectId ?? null,
          position: count,
        },
        select: CARD_SELECT,
      });
      res.status(201).json({ card: serializeCard(card) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/planner/cards/:id — editar card ──────────────────────────────
// `updatedAt` opcional: se enviado, precisa bater com o valor atual no
// banco (mesma leitura que o frontend recebeu por último) — senão 409,
// pra impedir que uma edição atropele outra sem avisar (proteção contra
// duas atualizações concorrentes, item explícito do lote).
const updateCardSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  projectId: z.string().min(1).nullable().optional(),
  updatedAt: z.string().datetime().optional(),
});

router.put(
  "/cards/:id",
  requirePermission("projetos", "edit"),
  validate(updateCardSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const found = await findOwnedCard(String(req.params.id), ownerId);
      if ("error" in found) {
        res.status(found.error).json(found.body);
        return;
      }
      const body = req.body as z.infer<typeof updateCardSchema>;

      if (body.updatedAt && new Date(body.updatedAt).getTime() !== found.card.updated_at.getTime()) {
        res.status(409).json({ error: "Este card foi alterado por outra sessão. Recarregue e tente de novo." });
        return;
      }

      if (body.projectId) {
        const project = await prisma.project.findUnique({ where: { id: body.projectId }, select: { id: true } });
        if (!project) {
          res.status(400).json({ error: "Projeto informado não existe." });
          return;
        }
      }

      const card = await prisma.plannerCard.update({
        where: { id: found.card.id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(body.dueDate !== undefined ? { due_date: body.dueDate ? new Date(body.dueDate) : null } : {}),
          ...(body.projectId !== undefined ? { project_id: body.projectId } : {}),
          updated_by_user_id: ownerId,
        },
        select: CARD_SELECT,
      });
      res.json({ card: serializeCard(card) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /api/planner/cards/:id/position — mover/reordenar card ───────────
// Único endpoint pra "mover pra outra coluna" e "reordenar dentro da
// mesma coluna" — o frontend já calcula a ordem final via dnd-kit
// (arrayMove) e manda a posição alvo; o backend reindexa as duas colunas
// afetadas (origem e destino, quando diferentes) em transação.
const moveCardSchema = z.object({
  columnId: z.string().min(1),
  position: z.number().int().min(0),
  updatedAt: z.string().datetime().optional(),
});

router.put(
  "/cards/:id/position",
  requirePermission("projetos", "edit"),
  validate(moveCardSchema),
  async (req, res, next) => {
    try {
      const ownerId = req.user!.id;
      const found = await findOwnedCard(String(req.params.id), ownerId);
      if ("error" in found) {
        res.status(found.error).json(found.body);
        return;
      }
      const body = req.body as z.infer<typeof moveCardSchema>;

      if (body.updatedAt && new Date(body.updatedAt).getTime() !== found.card.updated_at.getTime()) {
        res.status(409).json({ error: "Este card foi alterado por outra sessão. Recarregue e tente de novo." });
        return;
      }

      const targetColumn = await findOwnedColumn(body.columnId, ownerId);
      if ("error" in targetColumn) {
        res.status(400).json({ error: "Coluna informada é inválida." });
        return;
      }

      const sourceColumnId = found.card.column_id;
      const targetColumnId = targetColumn.column.id;

      const [sourceSiblings, targetSiblings] = await Promise.all([
        prisma.plannerCard.findMany({
          where: { column_id: sourceColumnId, owner_user_id: ownerId, archived_at: null, id: { not: found.card.id } },
          orderBy: { position: "asc" },
          select: { id: true },
        }),
        sourceColumnId === targetColumnId
          ? Promise.resolve(null)
          : prisma.plannerCard.findMany({
              where: { column_id: targetColumnId, owner_user_id: ownerId, archived_at: null },
              orderBy: { position: "asc" },
              select: { id: true },
            }),
      ]);

      const destList = sourceColumnId === targetColumnId ? sourceSiblings : (targetSiblings ?? []);
      const clampedPosition = Math.max(0, Math.min(body.position, destList.length));
      const finalDestOrder = [...destList.map((c) => c.id)];
      finalDestOrder.splice(clampedPosition, 0, found.card.id);

      const updates = [
        ...finalDestOrder.map((id, index) =>
          prisma.plannerCard.update({
            where: { id },
            data: {
              position: index,
              ...(id === found.card.id ? { column_id: targetColumnId, updated_by_user_id: ownerId } : {}),
            },
          }),
        ),
        ...(sourceColumnId !== targetColumnId
          ? sourceSiblings.map((c, index) =>
              prisma.plannerCard.update({ where: { id: c.id }, data: { position: index } }),
            )
          : []),
      ];

      await prisma.$transaction(updates);

      const card = await prisma.plannerCard.findUnique({ where: { id: found.card.id }, select: CARD_SELECT });
      res.json({ card: serializeCard(card!) });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/planner/cards/:id — arquivar (soft delete) ───────────────
router.delete("/cards/:id", requirePermission("projetos", "delete"), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const found = await findOwnedCard(String(req.params.id), ownerId);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    if (found.card.archived_at) {
      res.json({ ok: true, card: serializeCard(found.card) });
      return;
    }
    const card = await prisma.plannerCard.update({
      where: { id: found.card.id },
      data: { archived_at: new Date(), updated_by_user_id: ownerId },
      select: CARD_SELECT,
    });
    res.json({ ok: true, card: serializeCard(card) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/planner/cards/:id/restore — desarquivar ────────────────────
router.post("/cards/:id/restore", requirePermission("projetos", "edit"), async (req, res, next) => {
  try {
    const ownerId = req.user!.id;
    const found = await findOwnedCard(String(req.params.id), ownerId);
    if ("error" in found) {
      res.status(found.error).json(found.body);
      return;
    }
    if (!found.card.archived_at) {
      res.json({ ok: true, card: serializeCard(found.card) });
      return;
    }
    const count = await prisma.plannerCard.count({
      where: { column_id: found.card.column_id, owner_user_id: ownerId, archived_at: null },
    });
    const card = await prisma.plannerCard.update({
      where: { id: found.card.id },
      data: { archived_at: null, position: count, updated_by_user_id: ownerId },
      select: CARD_SELECT,
    });
    res.json({ ok: true, card: serializeCard(card) });
  } catch (err) {
    next(err);
  }
});

export default router;
