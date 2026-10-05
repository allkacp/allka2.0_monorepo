// Prazos e SLA de projeto (2026-10-02): relógios com pausa e retomada. Ver lib/sla.ts.
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser, projectVisibleToUser } from "../lib/project-scope";
import { viewerKind, type Viewer } from "../lib/connections/pending";
import { SLA_PAUSE_REASONS, SLA_RESPONSIBLES, SLA_RESPONSIBLE_LABEL, pauseTaskClocks, resumeTaskClocks, slaView, syncSlaClocks } from "../lib/sla";
import { logProjectDecision } from "../lib/catalog2-cycles";

const router = Router();
router.use(verifyToken);

class SlaError extends Error { constructor(message: string, public httpStatus = 409, public code = "sla") { super(message); } }
function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof SlaError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}
const isStaff = (req: Request) => ["admin", "leader"].includes(viewerKind(req.user as Viewer));

async function loadTask(req: Request, taskId: string) {
  const task = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { id: true, project_id: true, title: true, lider_responsavel_id: true } });
  if (!task) throw new SlaError("Tarefa não encontrada.", 404, "task_not_found");
  if (!isAdminUser(req.user!)) {
    const project = await prisma.project.findUnique({ where: { id: task.project_id } });
    if (!project || (task.lider_responsavel_id !== req.user!.id && !(await projectVisibleToUser(prisma, req.user!, project)))) throw new SlaError("Tarefa não encontrada.", 404, "task_not_found");
  }
  return task;
}

router.get("/reasons", (_req, res) => {
  res.json({
    reasons: Object.entries(SLA_PAUSE_REASONS).map(([key, label]) => ({ key, label })),
    responsibles: SLA_RESPONSIBLES.map((key) => ({ key, label: SLA_RESPONSIBLE_LABEL[key] })),
  });
});

/** Relógios da tarefa (e da contratação) com estado, pausas, motivo e responsável. */
router.get("/task/:taskId", async (req, res, next) => {
  try {
    const task = await loadTask(req, req.params.taskId as string);
    await syncSlaClocks(prisma, task.project_id);
    res.json({ data: await slaView(prisma, task.id) });
  } catch (e) { handle(e, res, next); }
});

/** Pausa manual do SLA da parte dependente (equipe): motivo e responsável pela pendência. */
router.post("/task/:taskId/pause", async (req, res, next) => {
  try {
    if (!isStaff(req)) throw new SlaError("Só a equipe (líder ou administração) pode pausar o prazo.", 403, "sla_forbidden");
    const d = z.object({ reason: z.enum(Object.keys(SLA_PAUSE_REASONS) as [string, ...string[]]), responsible_party: z.enum(SLA_RESPONSIBLES).default("client"), responsible_user_id: z.string().nullish(), note: z.string().max(2000).nullish() }).parse(req.body);
    const task = await loadTask(req, req.params.taskId as string);
    const n = await pauseTaskClocks(prisma, task.id, { reason: d.reason, reasonText: d.note ? `${SLA_PAUSE_REASONS[d.reason as keyof typeof SLA_PAUSE_REASONS]} — ${d.note}` : undefined, party: d.responsible_party, userId: d.responsible_user_id ?? null });
    await logProjectDecision(prisma, { projectId: task.project_id, projectTaskId: task.id, kind: "sla_paused", message: `Prazo (SLA) pausado: ${SLA_PAUSE_REASONS[d.reason as keyof typeof SLA_PAUSE_REASONS]} (responsável: ${SLA_RESPONSIBLE_LABEL[d.responsible_party]}).` });
    res.json({ ok: true, paused_clocks: n });
  } catch (e) { handle(e, res, next); }
});

router.post("/task/:taskId/resume", async (req, res, next) => {
  try {
    if (!isStaff(req)) throw new SlaError("Só a equipe (líder ou administração) pode retomar o prazo.", 403, "sla_forbidden");
    const d = z.object({ reason: z.string().max(60).optional() }).parse(req.body ?? {});
    const task = await loadTask(req, req.params.taskId as string);
    const n = await resumeTaskClocks(prisma, task.id, req.user!.id, d.reason);
    res.json({ ok: true, resumed_clocks: n });
  } catch (e) { handle(e, res, next); }
});

export default router;
void isAdminUser;
