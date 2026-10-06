// PLAC (13 passos): modelo editável (administração) e passos de cada projeto (quem enxerga o projeto acompanha e conclui).
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser, isLeaderUser, projectVisibleToUser } from "../lib/project-scope";
import { AUDIENCE_TOKENS, serializeAudiences } from "../lib/catalog2-audience";
import { PLAC_PHASES, PLAC_REPEAT, PLAC_ROLES, PLAC_STATUS, ensurePlacTemplates, generatePlacForProject, idsOf, progressOf, stepView } from "../lib/plac";

const router = Router();
router.use(verifyToken);

class PlacError extends Error { constructor(message: string, public httpStatus = 422, public code = "plac") { super(message); } }
function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof PlacError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}
const adminOnly = (req: Request) => { if (!isAdminUser(req.user!)) throw new PlacError("Só a administração configura os passos PLAC.", 403, "forbidden"); };
const internal = (req: Request) => isAdminUser(req.user!) || isLeaderUser(req.user!);

const templateView = (t: any) => ({
  id: t.id, key: t.key, order: t.sort_order, name: t.name, description: t.description, role: t.role_kind, phase: t.phase, after_key: t.after_key, offset_days: t.offset_days,
  estimated_hours: t.estimated_hours, hourly_cost: t.hourly_cost, repeat_rule: t.repeat_rule,
  audiences: t.audience === "all" ? [] : String(t.audience).split(",").filter(Boolean), four_f_ids: idsOf(t.four_f_ids), internal_user_ids: idsOf(t.internal_user_ids), is_active: t.is_active,
});

const tplSchema = z.object({
  name: z.string().trim().min(2).max(190), description: z.string().max(4000).nullish(), role: z.enum(PLAC_ROLES), phase: z.enum(PLAC_PHASES),
  after_key: z.string().max(100).nullish(), offset_days: z.number().min(0).max(3650), estimated_hours: z.number().min(0).max(1000).nullish(), hourly_cost: z.number().min(0).max(100000).nullish(),
  repeat_rule: z.enum(PLAC_REPEAT).optional(), audiences: z.array(z.enum(AUDIENCE_TOKENS)).max(4).optional(), four_f_ids: z.array(z.string()).max(50).optional(),
  internal_user_ids: z.array(z.string()).max(30).optional(), is_active: z.boolean().optional(), order: z.number().int().min(0).max(1000).optional(),
});
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

router.get("/templates", async (req, res, next) => {
  try {
    adminOnly(req);
    await ensurePlacTemplates(prisma);
    const [rows, fourFs] = await Promise.all([prisma.placStepTemplate.findMany({ orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] }), prisma.catalog2FourF.findMany({ select: { id: true, name: true } })]);
    res.json({ data: rows.map(templateView), four_fs: fourFs });
  } catch (e) { handle(e, res, next); }
});
router.get("/internal-users", async (req, res, next) => {
  try {
    adminOnly(req);
    const users = await prisma.user.findMany({ where: { is_active: true, OR: [{ account_type: "admin" }, { account_type: "lider" }, { role: "lider" }] }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" }, take: 300 });
    res.json({ data: users });
  } catch (e) { handle(e, res, next); }
});
function dataOf(d: z.infer<typeof tplSchema>, afterKeyValid: string | null) {
  return {
    name: d.name, description: d.description ?? null, role_kind: d.role, phase: d.phase, after_key: afterKeyValid, offset_days: d.offset_days,
    estimated_hours: d.estimated_hours ?? null, hourly_cost: d.hourly_cost ?? null, ...(d.repeat_rule ? { repeat_rule: d.repeat_rule } : {}),
    ...(d.audiences ? { audience: serializeAudiences(d.audiences.filter((a) => a !== "internal")) } : {}),
    ...(d.four_f_ids ? { four_f_ids: d.four_f_ids.length ? JSON.stringify(d.four_f_ids) : null } : {}),
    ...(d.internal_user_ids ? { internal_user_ids: d.internal_user_ids.length ? JSON.stringify(d.internal_user_ids) : null } : {}),
    ...(d.is_active !== undefined ? { is_active: d.is_active } : {}), ...(d.order !== undefined ? { sort_order: d.order } : {}),
  };
}
async function validAfter(after: string | null | undefined, selfKey: string | null): Promise<string | null> {
  if (!after) return null;
  if (after === selfKey) throw new PlacError("Um passo não pode ser depois dele mesmo.");
  if (!(await prisma.placStepTemplate.findUnique({ where: { key: after } }))) throw new PlacError("O passo anterior escolhido não existe.");
  // evita círculo: o passo "after" não pode depender (direta ou indiretamente) deste
  if (selfKey) {
    const all = await prisma.placStepTemplate.findMany({ select: { key: true, after_key: true } });
    const map = new Map(all.map((t) => [t.key, t.after_key]));
    for (let k: string | null | undefined = after, i = 0; k && i < 50; k = map.get(k), i++) if (k === selfKey) throw new PlacError("Isso criaria um círculo entre os passos.");
  }
  return after;
}
router.post("/templates", async (req, res, next) => {
  try {
    adminOnly(req);
    const d = tplSchema.parse(req.body);
    let key = slug(d.name) || "passo";
    for (let i = 2; await prisma.placStepTemplate.findUnique({ where: { key } }); i++) key = `${slug(d.name) || "passo"}_${i}`;
    const max = await prisma.placStepTemplate.aggregate({ _max: { sort_order: true } });
    const row = await prisma.placStepTemplate.create({ data: { key, sort_order: d.order ?? (max._max.sort_order ?? 0) + 1, ...dataOf(d, await validAfter(d.after_key, null)) } });
    res.status(201).json(templateView(row));
  } catch (e) { handle(e, res, next); }
});
router.put("/templates/:key", async (req, res, next) => {
  try {
    adminOnly(req);
    const d = tplSchema.parse(req.body);
    const cur = await prisma.placStepTemplate.findUnique({ where: { key: req.params.key as string } });
    if (!cur) throw new PlacError("Passo não encontrado.", 404, "not_found");
    const row = await prisma.placStepTemplate.update({ where: { key: cur.key }, data: dataOf(d, await validAfter(d.after_key, cur.key)) });
    res.json(templateView(row));
  } catch (e) { handle(e, res, next); }
});
router.delete("/templates/:key", async (req, res, next) => {
  try {
    adminOnly(req);
    const cur = await prisma.placStepTemplate.findUnique({ where: { key: req.params.key as string } });
    if (!cur) throw new PlacError("Passo não encontrado.", 404, "not_found");
    // quem dependia dele passa a depender do anterior dele (ou do pagamento)
    await prisma.$transaction([
      prisma.placStepTemplate.updateMany({ where: { after_key: cur.key }, data: { after_key: cur.after_key } }),
      prisma.placStepTemplate.delete({ where: { key: cur.key } }),
    ]);
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

async function loadProject(req: Request) {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId as string }, select: { id: true, title: true, agency: true, client_id: true, agency_id: true, company_id: true, partner_id: true } });
  if (!project) throw new PlacError("Projeto não encontrado.", 404, "not_found");
  if (!internal(req) && !(await projectVisibleToUser(prisma, req.user as any, project))) throw new PlacError("Projeto não encontrado.", 404, "not_found");
  return project;
}
router.get("/projects/:projectId", async (req, res, next) => {
  try {
    const project = await loadProject(req);
    const rows = await prisma.placProjectStep.findMany({ where: { project_id: project.id }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
    const steps = rows.map((r) => stepView(r));
    res.json({ project: { id: project.id, title: project.title }, steps, progress: progressOf(rows), can_manage: isAdminUser(req.user!), can_complete: true });
  } catch (e) { handle(e, res, next); }
});
// Gera (ou completa) os passos de um projeto já existente — administração.
router.post("/projects/:projectId/generate", async (req, res, next) => {
  try {
    adminOnly(req);
    const project = await loadProject(req);
    const r = await generatePlacForProject(prisma, project.id, new Date());
    res.json(r);
  } catch (e) { handle(e, res, next); }
});
router.patch("/projects/:projectId/steps/:stepId", async (req, res, next) => {
  try {
    const project = await loadProject(req);
    const d = z.object({
      status: z.enum(PLAC_STATUS).optional(), note: z.string().max(4000).nullish(), assignee_user_id: z.string().nullish(),
      due_at: z.string().datetime({ offset: true }).nullish(), internal_user_ids: z.array(z.string()).max(30).optional(),
    }).parse(req.body);
    const step = await prisma.placProjectStep.findFirst({ where: { id: req.params.stepId as string, project_id: project.id } });
    if (!step) throw new PlacError("Passo não encontrado.", 404, "not_found");
    const admin = isAdminUser(req.user!);
    if ((d.due_at !== undefined || d.internal_user_ids !== undefined || d.assignee_user_id !== undefined) && !admin) throw new PlacError("Só a administração altera prazo, responsável e controle interno.", 403, "forbidden");
    const data: Record<string, unknown> = {};
    if (d.status) {
      data.status = d.status;
      data.completed_at = d.status === "concluida" ? new Date() : null;
      data.completed_by_user_id = d.status === "concluida" ? req.user!.id : null;
      if (d.status !== "pendente" && d.status !== "em_andamento") data.overdue_alerted_at = step.overdue_alerted_at ?? new Date();
      else data.overdue_alerted_at = null;
    }
    if (d.note !== undefined) data.note = d.note;
    if (d.assignee_user_id !== undefined) data.assignee_user_id = d.assignee_user_id;
    if (d.due_at !== undefined) { data.due_at = d.due_at ? new Date(d.due_at) : null; data.overdue_alerted_at = null; }
    if (d.internal_user_ids) data.internal_user_ids = d.internal_user_ids.length ? JSON.stringify(d.internal_user_ids) : null;
    const row = await prisma.placProjectStep.update({ where: { id: step.id }, data });
    // D2: o passo que virou tarefa interna acompanha o status (concluir aqui conclui lá).
    if (d.status) await prisma.internalTask.updateMany({ where: { source_kind: "plac_step", source_id: step.id }, data: d.status === "concluida" ? { status: "done", completed_at: new Date() } : d.status === "em_andamento" ? { status: "doing", completed_at: null } : d.status === "dispensada" ? { status: "done", completed_at: new Date() } : { status: "todo", completed_at: null } });
    const all = await prisma.placProjectStep.findMany({ where: { project_id: project.id } });
    res.json({ step: stepView(row), progress: progressOf(all) });
  } catch (e) { handle(e, res, next); }
});

export default router;
