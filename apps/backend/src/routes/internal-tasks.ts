// D2 — Tarefas internas da conta. Qualquer membro da mesma conta (agência ou empresa) vê e edita o quadro; a administração vê tudo.
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser, projectVisibleToUser } from "../lib/project-scope";
import { AUDIENCE_TOKENS, parseAudiences, serializeAudiences } from "../lib/catalog2-audience";
import { TASK_PRIORITIES, TASK_STATUSES, canUseModule, createFromPlacStep, getSettings, ownerOf, ownerWhere, sameOwner, taskView, type Owner } from "../lib/internal-tasks";

const router = Router();
router.use(verifyToken);

class ItError extends Error { constructor(message: string, public httpStatus = 422, public code = "internal_task") { super(message); } }
function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ItError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}
const admin = (req: Request) => isAdminUser(req.user!);

/** Conta sobre a qual a requisição age: a do usuário; a administração informa agency_id/company_id (ou vê tudo quando não informa). */
async function scopeOf(req: Request): Promise<{ owner: Owner | null; all: boolean }> {
  if (!(await canUseModule(prisma, req.user!))) throw new ItError("Este módulo não está liberado para a sua conta.", 403, "module_not_allowed");
  if (admin(req)) {
    const a = typeof req.query.agency_id === "string" ? req.query.agency_id : typeof req.body?.agency_id === "string" ? req.body.agency_id : null;
    const c = typeof req.query.company_id === "string" ? req.query.company_id : typeof req.body?.company_id === "string" ? req.body.company_id : null;
    if (a || c) return { owner: { agency_id: a, company_id: a ? null : c }, all: false };
    return { owner: null, all: true };
  }
  const owner = await ownerOf(prisma, req.user!);
  if (!owner) throw new ItError("Sua conta não está vinculada a uma agência ou empresa.", 403, "no_account");
  return { owner, all: false };
}
async function loadTask(req: Request) {
  const t = await prisma.internalTask.findUnique({ where: { id: req.params.id as string } });
  if (!t) throw new ItError("Tarefa não encontrada.", 404, "not_found");
  if (!admin(req)) {
    const owner = await ownerOf(prisma, req.user!);
    if (!owner || !sameOwner({ agency_id: t.agency_id, company_id: t.company_id }, owner)) throw new ItError("Tarefa não encontrada.", 404, "not_found");
  }
  return t;
}
async function assertAssignee(userId: string | null | undefined, owner: Owner) {
  if (!userId) return;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  const o = u ? await ownerOf(prisma, { id: userId }) : null;
  if (!u || !o || !sameOwner(owner, o)) throw new ItError("O responsável precisa ser da mesma conta.");
}

// ── Configuração (administração) ───────────────────────────────────────────
router.get("/settings", async (req, res, next) => {
  try {
    const s = await getSettings(prisma);
    const a = parseAudiences(s.audience);
    res.json({ audiences: a === "all" ? [] : a, all: a === "all", auto_from_plac: s.auto_from_plac, can_use: await canUseModule(prisma, req.user!), can_manage: admin(req) });
  } catch (e) { handle(e, res, next); }
});
router.put("/settings", async (req, res, next) => {
  try {
    if (!admin(req)) throw new ItError("Só a administração configura.", 403, "forbidden");
    const d = z.object({ audiences: z.array(z.enum(AUDIENCE_TOKENS)).max(4), auto_from_plac: z.boolean().optional() }).parse(req.body);
    const value = serializeAudiences(d.audiences.filter((x) => x !== "internal"));
    const s = await prisma.internalTaskSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", audience: value, auto_from_plac: !!d.auto_from_plac }, update: { audience: value, ...(d.auto_from_plac !== undefined ? { auto_from_plac: d.auto_from_plac } : {}) } });
    const a = parseAudiences(s.audience);
    res.json({ audiences: a === "all" ? [] : a, all: a === "all", auto_from_plac: s.auto_from_plac });
  } catch (e) { handle(e, res, next); }
});

// ── Quadro ──────────────────────────────────────────────────────────────────
router.get("/members", async (req, res, next) => {
  try {
    const { owner } = await scopeOf(req);
    if (!owner) { res.json({ data: [] }); return; }
    const users = await prisma.user.findMany({
      where: owner.agency_id ? { OR: [{ agency_id: owner.agency_id }, { owned_agency: { is: { id: owner.agency_id } } }], is_active: true } : { company_id: owner.company_id, is_active: true },
      select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 300,
    });
    res.json({ data: users });
  } catch (e) { handle(e, res, next); }
});
router.get("/summary", async (req, res, next) => {
  try {
    const { owner } = await scopeOf(req);
    const where = { ...(owner ? ownerWhere(owner) : {}) };
    const now = new Date();
    const [open, late, doing, soon, mine] = await Promise.all([
      prisma.internalTask.count({ where: { ...where, status: { not: "done" } } }),
      prisma.internalTask.count({ where: { ...where, status: { not: "done" }, due_date: { lt: now } } }),
      prisma.internalTask.count({ where: { ...where, status: "doing" } }),
      prisma.internalTask.count({ where: { ...where, status: { not: "done" }, due_date: { gte: now, lt: new Date(now.getTime() + 3 * 86400000) } } }),
      prisma.internalTask.count({ where: { ...where, status: { not: "done" }, assignee_user_id: req.user!.id } }),
    ]);
    res.json({ open, late, doing, due_soon: soon, mine });
  } catch (e) { handle(e, res, next); }
});
router.get("/", async (req, res, next) => {
  try {
    const { owner } = await scopeOf(req);
    const q = z.object({ status: z.enum(TASK_STATUSES).optional(), assignee: z.string().optional(), project_id: z.string().optional(), mine: z.string().optional() }).parse(req.query);
    const rows = await prisma.internalTask.findMany({
      where: { ...(owner ? ownerWhere(owner) : {}), ...(q.status ? { status: q.status } : {}), ...(q.project_id ? { project_id: q.project_id } : {}), ...(q.mine === "1" ? { assignee_user_id: req.user!.id } : q.assignee ? { assignee_user_id: q.assignee } : {}) },
      orderBy: [{ position: "asc" }, { due_date: "asc" }, { created_at: "desc" }], take: 1000,
    });
    res.json({ data: rows.map((r) => taskView(r)), total: rows.length });
  } catch (e) { handle(e, res, next); }
});

const checklistSchema = z.array(z.object({ id: z.string().max(40).optional(), text: z.string().trim().min(1).max(300), done: z.boolean().optional() })).max(60);
const bodySchema = z.object({
  title: z.string().trim().min(2).max(190), description: z.string().max(8000).nullish(), status: z.enum(TASK_STATUSES).optional(), priority: z.enum(TASK_PRIORITIES).optional(),
  due_date: z.string().datetime({ offset: true }).nullish(), project_id: z.string().nullish(), assignee_user_id: z.string().nullish(), checklist: checklistSchema.optional(), position: z.number().int().min(0).max(100000).optional(),
});
const cl = (c: z.infer<typeof checklistSchema>) => JSON.stringify(c.map((x, i) => ({ id: x.id ?? `i${Date.now().toString(36)}${i}`, text: x.text, done: !!x.done })));
async function assertProject(req: Request, projectId: string | null | undefined) {
  if (!projectId) return;
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true } });
  if (!p || (!admin(req) && !(await projectVisibleToUser(prisma, req.user as any, p)))) throw new ItError("Projeto não encontrado.", 404, "project_not_found");
}
router.post("/", async (req, res, next) => {
  try {
    const { owner } = await scopeOf(req);
    if (!owner) throw new ItError("Informe a agência ou a empresa dona da tarefa (agency_id / company_id).", 400, "owner_required");
    const d = bodySchema.parse(req.body);
    await assertAssignee(d.assignee_user_id, owner);
    await assertProject(req, d.project_id);
    const max = await prisma.internalTask.aggregate({ where: { ...ownerWhere(owner), status: d.status ?? "todo" }, _max: { position: true } });
    const row = await prisma.internalTask.create({
      data: {
        ...owner, title: d.title, description: d.description ?? null, status: d.status ?? "todo", priority: d.priority ?? "medium", due_date: d.due_date ? new Date(d.due_date) : null,
        project_id: d.project_id ?? null, assignee_user_id: d.assignee_user_id ?? null, created_by_user_id: req.user!.id, position: d.position ?? (max._max.position ?? 0) + 1,
        completed_at: d.status === "done" ? new Date() : null, checklist_json: d.checklist ? cl(d.checklist) : null,
      },
    });
    res.status(201).json(taskView(row));
  } catch (e) { handle(e, res, next); }
});
router.patch("/:id", async (req, res, next) => {
  try {
    await scopeOf(req);
    const t = await loadTask(req);
    const d = bodySchema.partial().parse(req.body);
    const owner: Owner = { agency_id: t.agency_id, company_id: t.company_id };
    if (d.assignee_user_id !== undefined) await assertAssignee(d.assignee_user_id, owner);
    if (d.project_id !== undefined) await assertProject(req, d.project_id);
    const data: Record<string, unknown> = {};
    if (d.title !== undefined) data.title = d.title;
    if (d.description !== undefined) data.description = d.description;
    if (d.priority) data.priority = d.priority;
    if (d.due_date !== undefined) { data.due_date = d.due_date ? new Date(d.due_date) : null; data.overdue_alerted_at = null; }
    if (d.project_id !== undefined) data.project_id = d.project_id;
    if (d.assignee_user_id !== undefined) data.assignee_user_id = d.assignee_user_id;
    if (d.position !== undefined) data.position = d.position;
    if (d.checklist) data.checklist_json = cl(d.checklist);
    if (d.status) { data.status = d.status; data.completed_at = d.status === "done" ? new Date() : null; if (d.status !== "done") data.overdue_alerted_at = null; }
    const row = await prisma.internalTask.update({ where: { id: t.id }, data });
    // Tarefa que veio de um passo PLAC: concluir/reabrir aqui reflete no passo (e vice-versa, em routes/plac.ts).
    if (d.status && t.source_kind === "plac_step" && t.source_id) {
      await prisma.placProjectStep.updateMany({ where: { id: t.source_id }, data: d.status === "done" ? { status: "concluida", completed_at: new Date(), completed_by_user_id: req.user!.id } : { status: d.status === "doing" ? "em_andamento" : "pendente", completed_at: null, completed_by_user_id: null } });
    }
    res.json(taskView(row));
  } catch (e) { handle(e, res, next); }
});
router.delete("/:id", async (req, res, next) => {
  try {
    await scopeOf(req);
    const t = await loadTask(req);
    if (!admin(req) && t.created_by_user_id !== req.user!.id) throw new ItError("Só quem criou a tarefa (ou a administração) pode excluí-la.", 403, "forbidden");
    await prisma.internalTask.delete({ where: { id: t.id } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.get("/:id/comments", async (req, res, next) => {
  try { await scopeOf(req); const t = await loadTask(req); res.json({ data: await prisma.internalTaskComment.findMany({ where: { task_id: t.id }, orderBy: { created_at: "asc" } }) }); } catch (e) { handle(e, res, next); }
});
router.post("/:id/comments", async (req, res, next) => {
  try {
    await scopeOf(req);
    const t = await loadTask(req);
    const d = z.object({ body: z.string().trim().min(1).max(4000) }).parse(req.body);
    res.status(201).json(await prisma.internalTaskComment.create({ data: { task_id: t.id, author_user_id: req.user!.id, body: d.body } }));
  } catch (e) { handle(e, res, next); }
});
// Cria a tarefa interna de um passo PLAC (botão no projeto).
router.post("/from-plac/:stepId", async (req, res, next) => {
  try {
    await scopeOf(req);
    const step = await prisma.placProjectStep.findUnique({ where: { id: req.params.stepId as string } });
    if (!step) throw new ItError("Passo não encontrado.", 404, "not_found");
    await assertProject(req, step.project_id);
    const created = await createFromPlacStep(prisma, step, req.user!.id);
    const task = await prisma.internalTask.findUnique({ where: { source_kind_source_id: { source_kind: "plac_step", source_id: step.id } } });
    res.status(created ? 201 : 200).json({ created, task: task ? taskView(task) : null });
  } catch (e) { handle(e, res, next); }
});

export default router;
