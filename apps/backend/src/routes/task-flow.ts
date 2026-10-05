// Visão unificada do FLUXO de uma tarefa no projeto (2026-10-02): portões de aprovação, prazos/SLA, entradas vindas de outros produtos,
// dependências e conexões. Uma única leitura para cliente, líder, nômade e administração (cada um vê só o que pode ver).
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser, projectVisibleToUser } from "../lib/project-scope";
import { viewerKind, type Viewer } from "../lib/connections/pending";
import { gateView, canDecide, type Decider } from "../lib/approval-gates";
import { slaView, syncSlaClocks } from "../lib/sla";
import { ruleStatesForTask } from "../lib/project-dependencies";
import { taskConnectionView } from "../lib/connections/flow";

const router = Router();
router.use(verifyToken);

function fail(res: Response, status: number, error: string, code: string) { res.status(status).json({ error, code }); }

router.get("/:taskId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.projectTask.findUnique({
      where: { id: req.params.taskId as string },
      select: { id: true, title: true, status: true, project_id: true, lider_responsavel_id: true, catalog2_task: { select: { key: true, name: true } } },
    });
    if (!task) { fail(res, 404, "Tarefa não encontrada.", "task_not_found"); return; }
    if (!isAdminUser(req.user!)) {
      const project = await prisma.project.findUnique({ where: { id: task.project_id } });
      if (!project || (task.lider_responsavel_id !== req.user!.id && !(await projectVisibleToUser(prisma, req.user!, project)))) { fail(res, 404, "Tarefa não encontrada.", "task_not_found"); return; }
    }
    await syncSlaClocks(prisma, task.project_id);
    const kind = viewerKind(req.user as Viewer);
    const decider: Decider = { id: req.user!.id, kind: kind === "other" ? "other" : kind, isTaskLeader: task.lider_responsavel_id === req.user!.id };
    const gates = (await gateView(prisma, task.id)).map((g) => ({ ...g, can_decide: g.actionable && canDecide({ approver_kind: g.approver_kind }, decider).ok }));
    const stages = await prisma.projectTaskStage.findMany({ where: { project_task_id: task.id }, orderBy: [{ ordem: "asc" }, { created_at: "asc" }], select: { id: true, titulo: true, status: true, ordem: true, iniciada_em: true, concluida_em: true } });
    const inputs = await prisma.projectTaskInput.findMany({ where: { project_task_id: task.id }, orderBy: { created_at: "asc" } });
    const deps = await ruleStatesForTask(prisma, task.id);
    res.json({
      task: { id: task.id, title: task.title, status: task.status, catalog_key: task.catalog2_task?.key ?? null },
      stages, approval_gates: gates, sla: await slaView(prisma, task.id),
      inputs: inputs.map((i) => ({ id: i.id, label: i.label, source_product_id: i.source_product_id, source_task_id: i.source_project_task_id, deliverable_key: i.source_deliverable_key, link_url: i.link_url, version: i.version_number, approval_status: i.approval_status, approved_at: i.approved_at })),
      dependencies: deps.map((d) => ({ rule_id: d.ruleId, kind: d.targetKind, behavior: d.behavior, state: d.state, satisfied: d.satisfied, reason: d.reason })),
      connections: await taskConnectionView(prisma, task.id),
    });
  } catch (e) { next(e); }
});

export default router;
