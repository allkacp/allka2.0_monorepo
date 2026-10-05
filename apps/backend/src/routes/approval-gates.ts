// Portões de aprovação do fluxo (2026-10-02): ver lib/approval-gates.ts. Cliente/agência aprovam os seus; líder e administração, os internos.
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser, projectVisibleToUser } from "../lib/project-scope";
import { viewerKind, type Viewer } from "../lib/connections/pending";
import { ApprovalGateError, canDecide, decideGate, dispenseGate, gateView, gatesOfTask, isActionable, type Decider } from "../lib/approval-gates";
import { DependencyBlockedError } from "../lib/project-dependencies";

const router = Router();
router.use(verifyToken);

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ApprovalGateError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof DependencyBlockedError) { res.status(409).json({ error: err.message, code: err.code }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}

function deciderOf(req: Request, task?: { lider_responsavel_id: string | null } | null): Decider {
  const kind = viewerKind(req.user as Viewer);
  return { id: req.user!.id, kind: kind === "other" ? "other" : kind, isTaskLeader: task ? task.lider_responsavel_id === req.user!.id : undefined };
}

async function loadTaskForUser(req: Request, taskId: string) {
  const task = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { id: true, project_id: true, lider_responsavel_id: true, title: true } });
  if (!task) throw new ApprovalGateError("Tarefa não encontrada.", 404, "task_not_found");
  if (!isAdminUser(req.user!)) {
    const project = await prisma.project.findUnique({ where: { id: task.project_id } });
    const isLeader = task.lider_responsavel_id === req.user!.id;
    if (!project || (!isLeader && !(await projectVisibleToUser(prisma, req.user!, project)))) throw new ApprovalGateError("Tarefa não encontrada.", 404, "task_not_found");
  }
  return task;
}

/** Portões de uma tarefa (com o estado, a ordem e se o usuário pode decidir). */
router.get("/task/:taskId", async (req, res, next) => {
  try {
    const task = await loadTaskForUser(req, req.params.taskId as string);
    const view = await gateView(prisma, task.id);
    const d = deciderOf(req, task);
    res.json({ data: view.map((g) => ({ ...g, can_decide: g.actionable && canDecide({ approver_kind: g.approver_kind }, d).ok })) });
  } catch (e) { handle(e, res, next); }
});

/** Decisão: aprovar libera o fluxo; reprovar exige o motivo e devolve a tarefa à etapa configurada. */
router.post("/:gateId/decision", async (req, res, next) => {
  try {
    const d = z.object({ decision: z.enum(["approve", "reject"]), comment: z.string().max(4000).nullish() }).parse(req.body);
    const gate = await prisma.projectApprovalGate.findUnique({ where: { id: req.params.gateId as string } });
    if (!gate) throw new ApprovalGateError("Portão de aprovação não encontrado.", 404, "gate_not_found");
    const task = await loadTaskForUser(req, gate.project_task_id);
    const out = await decideGate(prisma, gate.id, deciderOf(req, task), { decision: d.decision, comment: d.comment ?? null });
    res.json({ ok: true, ...out });
  } catch (e) { handle(e, res, next); }
});

/** Dispensa de um portão obrigatório (só administração, com motivo registrado). */
router.post("/:gateId/dispense", async (req, res, next) => {
  try {
    if (!isAdminUser(req.user!)) throw new ApprovalGateError("Só a administração pode dispensar um portão.", 403, "gate_forbidden");
    const d = z.object({ reason: z.string().min(5).max(2000) }).parse(req.body);
    await dispenseGate(prisma, req.params.gateId as string, req.user!.id, d.reason);
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

/** Aprovações pendentes do usuário (cliente/agência: as do cliente; líder/admin: as internas e de líder). */
router.get("/pending", async (req, res, next) => {
  try {
    const kind = viewerKind(req.user as Viewer);
    const pending = await prisma.projectApprovalGate.findMany({ where: { status: "pendente" }, orderBy: { created_at: "asc" }, take: 500 });
    const out = [];
    const byTask = new Map<string, Awaited<ReturnType<typeof gatesOfTask>>>();
    for (const g of pending) {
      const task = await prisma.projectTask.findUnique({ where: { id: g.project_task_id }, select: { id: true, title: true, project_id: true, lider_responsavel_id: true, project: { select: { title: true } } } });
      if (!task) continue;
      if (!canDecide({ approver_kind: g.approver_kind }, { id: req.user!.id, kind: kind === "other" ? "other" : kind, isTaskLeader: task.lider_responsavel_id === req.user!.id }).ok) continue;
      if (!isAdminUser(req.user!)) {
        const project = await prisma.project.findUnique({ where: { id: task.project_id } });
        if (!project || (task.lider_responsavel_id !== req.user!.id && !(await projectVisibleToUser(prisma, req.user!, project)))) continue;
      }
      const all = byTask.get(task.id) ?? await gatesOfTask(prisma, task.id);
      byTask.set(task.id, all);
      if (!isActionable(g, all)) continue;
      out.push({ gate_id: g.id, name: g.name, position: g.position, approver_kind: g.approver_kind, task: { id: task.id, title: task.title }, project: { id: task.project_id, title: task.project?.title ?? null } });
    }
    res.json({ data: out });
  } catch (e) { handle(e, res, next); }
});

export default router;
