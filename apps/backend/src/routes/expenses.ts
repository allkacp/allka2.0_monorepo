import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate, parsePagination } from "../middleware/validate";

const router = Router();

function getQueryString(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

const EXPENSE_STATUSES = ["prevista", "pendente", "paga", "atrasada", "cancelada"] as const;
const EXPENSE_TYPES = ["fixa", "variável"] as const;
const EXPENSE_RECURRENCES = ["única", "mensal", "anual", "personalizada"] as const;

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  amount: z.number().positive(),
  type: z.enum(EXPENSE_TYPES).default("fixa"),
  recurrence: z.enum(EXPENSE_RECURRENCES).default("mensal"),
  status: z.enum(EXPENSE_STATUSES).default("prevista"),
  due_date: z.string().datetime({ offset: true }).optional(),
  paid_at: z.string().datetime({ offset: true }).optional(),
  payment_method: z.string().optional(),
  department: z.string().optional(),
  competence_month: z.string().optional(), // "YYYY-MM"
  notes: z.string().optional(),
  attachment_url: z.string().optional(),
  recurrence_id: z.string().optional(),
  is_recurring_base: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

// ─── GET /api/expenses ─────────────────────────────────────────────────────────
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status       = getQueryString(req.query.status);
    const category     = getQueryString(req.query.category);
    const type         = getQueryString(req.query.type);
    const recurrence   = getQueryString(req.query.recurrence);
    const department   = getQueryString(req.query.department);
    const competence   = getQueryString(req.query.competence);
    const search       = getQueryString(req.query.search);
    const fromRaw      = getQueryString(req.query.from);
    const toRaw        = getQueryString(req.query.to);

    const where: Record<string, unknown> = {};
    if (status)     where["status"]           = status;
    if (category)   where["category"]         = category;
    if (type)       where["type"]             = type;
    if (recurrence) where["recurrence"]       = recurrence;
    if (department) where["department"]       = department;
    if (competence) where["competence_month"] = competence;
    if (search) {
      where["OR"] = [
        { name:        { contains: search } },
        { description: { contains: search } },
        { category:    { contains: search } },
        { department:  { contains: search } },
      ];
    }
    if (fromRaw || toRaw) {
      const dateFilter: Record<string, Date> = {};
      if (fromRaw) dateFilter.gte = new Date(fromRaw);
      if (toRaw)   dateFilter.lte = new Date(toRaw);
      where["created_at"] = dateFilter;
    }

    const [total, data] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { due_date: "asc" },
      }),
    ]);

    res.json({ data, total, page, limit });
  } catch (err) { next(err); }
});

// ─── GET /api/expenses/stats ────────────────────────────────────────────────
router.get("/stats", verifyToken, async (req, res, next) => {
  try {
    const fromRaw    = getQueryString(req.query.from);
    const toRaw      = getQueryString(req.query.to);
    const competence = getQueryString(req.query.competence);

    const where: Record<string, unknown> = {};
    if (competence) where["competence_month"] = competence;
    if (fromRaw || toRaw) {
      const df: Record<string, Date> = {};
      if (fromRaw) df.gte = new Date(fromRaw);
      if (toRaw)   df.lte = new Date(toRaw);
      where["created_at"] = df;
    }

    const [byStatus, byType, byCategory, total] = await Promise.all([
      prisma.expense.groupBy({ by: ["status"],   _sum: { amount: true }, _count: true, where }),
      prisma.expense.groupBy({ by: ["type"],     _sum: { amount: true }, _count: true, where }),
      prisma.expense.groupBy({ by: ["category"], _sum: { amount: true }, _count: true, where }),
      prisma.expense.aggregate({ _sum: { amount: true }, _count: true, where }),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s) => { statusMap[s.status] = s._sum.amount ?? 0; });

    const typeMap: Record<string, number> = {};
    byType.forEach((t) => { typeMap[t.type] = t._sum.amount ?? 0; });

    res.json({
      total:     total._sum.amount ?? 0,
      count:     total._count,
      paid:      statusMap["paga"]     ?? 0,
      pending:   statusMap["pendente"] ?? 0,
      overdue:   statusMap["atrasada"] ?? 0,
      projected: statusMap["prevista"] ?? 0,
      fixed:     typeMap["fixa"]       ?? 0,
      variable:  typeMap["variável"]   ?? 0,
      byStatus:  byStatus.map(s => ({ status:   s.status,   amount: s._sum.amount ?? 0, count: s._count })),
      byType:    byType.map(t   => ({ type:     t.type,     amount: t._sum.amount ?? 0, count: t._count })),
      byCategory:byCategory.map(c => ({ category: c.category, amount: c._sum.amount ?? 0, count: c._count })),
    });
  } catch (err) { next(err); }
});

// ─── GET /api/expenses/:id ─────────────────────────────────────────────────
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: getQueryString(req.params.id)! } });
    if (!expense) { res.status(404).json({ error: "Despesa não encontrada" }); return; }
    res.json(expense);
  } catch (err) { next(err); }
});

// ─── POST /api/expenses ────────────────────────────────────────────────────
router.post("/", verifyToken, validate(createSchema), async (req, res, next) => {
  try {
    const data = { ...req.body } as Record<string, unknown>;
    if (data["due_date"]) data["due_date"] = new Date(data["due_date"] as string);
    if (data["paid_at"])  data["paid_at"]  = new Date(data["paid_at"]  as string);
    data["created_by"] = (req as any).user?.id ?? null;

    const expense = await prisma.expense.create({ data: data as any });

    // If monthly/annual recurrence, generate next 11 instances (previews)
    if (
      (expense.recurrence === "mensal" || expense.recurrence === "anual") &&
      expense.is_recurring_base &&
      expense.due_date
    ) {
      const recurrenceId = expense.id; // use base id as group key
      await prisma.expense.update({ where: { id: expense.id }, data: { recurrence_id: recurrenceId } });

      const instances = [];
      for (let i = 1; i <= 11; i++) {
        const baseDate = new Date(expense.due_date);
        if (expense.recurrence === "mensal") baseDate.setMonth(baseDate.getMonth() + i);
        else baseDate.setFullYear(baseDate.getFullYear() + i);

        const cm = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}`;
        instances.push({
          name:              expense.name,
          description:       expense.description,
          category:          expense.category,
          amount:            expense.amount,
          type:              expense.type,
          recurrence:        expense.recurrence,
          status:            "prevista",
          due_date:          baseDate,
          payment_method:    expense.payment_method,
          department:        expense.department,
          competence_month:  cm,
          notes:             expense.notes,
          recurrence_id:     recurrenceId,
          is_recurring_base: false,
          created_by:        expense.created_by,
        });
      }
      await prisma.expense.createMany({ data: instances });
    }

    res.status(201).json(expense);
  } catch (err) { next(err); }
});

// ─── PUT /api/expenses/:id ─────────────────────────────────────────────────
router.put("/:id", verifyToken, validate(updateSchema), async (req, res, next) => {
  try {
    const data = { ...req.body } as Record<string, unknown>;
    if (data["due_date"]) data["due_date"] = new Date(data["due_date"] as string);
    if (data["paid_at"])  data["paid_at"]  = new Date(data["paid_at"]  as string);
    if (data["status"] === "paga" && !data["paid_at"]) data["paid_at"] = new Date();

    const expense = await prisma.expense.update({
      where: { id: getQueryString(req.params.id)! },
      data: data as any,
    });
    res.json(expense);
  } catch (err) { next(err); }
});

// ─── DELETE /api/expenses/:id ──────────────────────────────────────────────
router.delete("/:id", verifyToken, async (req, res, next) => {
  try {
    const only_this = getQueryString(req.query.only_this) === "true";
    const expenseId = getQueryString(req.params.id)!;
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) { res.status(404).json({ error: "Despesa não encontrada" }); return; }

    if (!only_this && expense.is_recurring_base && expense.recurrence_id) {
      // Cancel all future (prevista) instances of this series, delete this base
      await prisma.expense.updateMany({
        where: { recurrence_id: expense.recurrence_id, status: "prevista" },
        data: { status: "cancelada" },
      });
    }
    await prisma.expense.delete({ where: { id: expenseId } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
