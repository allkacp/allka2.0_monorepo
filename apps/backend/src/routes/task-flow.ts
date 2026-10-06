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
      select: { id: true, title: true, status: true, project_id: true, lider_responsavel_id: true, stage_execution: true, catalog2_task: { select: { key: true, name: true } } },
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
    const stageRows = await prisma.projectTaskStage.findMany({
      where: { project_task_id: task.id }, orderBy: [{ ordem: "asc" }, { created_at: "asc" }],
      select: { id: true, titulo: true, status: true, ordem: true, iniciada_em: true, concluida_em: true, entregue_em: true, qualificada_em: true, aprovada_em: true, prazo_execucao: true, executor_type: true, lider_id: true, nomade_id: true, visivel_ao_cliente: true, exige_qualificacao: true, libera_proxima_auto: true, rodada_ajuste: true, depende_de_json: true, catalog_step_ref: true },
    });
    const staff = kind === "admin" || kind === "leader";
    const isLeaderOfTask = task.lider_responsavel_id === req.user!.id;
    const ladoContratante = kind === "admin" || kind === "agency" || kind === "company";
    const stageMode = task.stage_execution === "stage";
    // Quem contratou NÃO vê etapa interna (a menos que o líder tenha avisado o cliente); equipe e nômade veem tudo.
    const visiveis = stageRows.filter((e) => staff || kind === "nomad" || e.visivel_ao_cliente || !stageMode);
    const stages = visiveis.map((e, i) => {
      const concluidaSemLiberar = stageMode && e.status === "CONCLUIDA" && !e.libera_proxima_auto && stageRows.some((o) => o.ordem > e.ordem && ["BLOQUEADA", "PENDENTE"].includes(o.status) && !o.iniciada_em);
      return {
        id: e.id, titulo: e.titulo, status: e.status, ordem: e.ordem, iniciada_em: e.iniciada_em, concluida_em: e.concluida_em, entregue_em: e.entregue_em, qualificada_em: e.qualificada_em, aprovada_em: e.aprovada_em,
        prazo_execucao: e.prazo_execucao, rodada_ajuste: e.rodada_ajuste, em_paralelo: e.depende_de_json != null,
        ...(staff ? { interna: !e.visivel_ao_cliente, exige_qualificacao: e.exige_qualificacao, libera_proxima_auto: e.libera_proxima_auto, executor_type: e.executor_type } : {}),
        can_qualify: stageMode && e.status === "EM_QUALIFICACAO" && (kind === "admin" || isLeaderOfTask || e.lider_id === req.user!.id),
        can_approve: stageMode && e.status === "EM_APROVACAO_CLIENTE" && ladoContratante && e.visivel_ao_cliente,
        can_release: concluidaSemLiberar && (kind === "admin" || isLeaderOfTask || e.lider_id === req.user!.id),
        can_warn_client: stageMode && !e.visivel_ao_cliente && (kind === "admin" || isLeaderOfTask || e.lider_id === req.user!.id),
        position: i + 1,
      };
    });
    const inputs = await prisma.projectTaskInput.findMany({ where: { project_task_id: task.id }, orderBy: { created_at: "asc" } });
    const deps = await ruleStatesForTask(prisma, task.id);
    res.json({
      task: { id: task.id, title: task.title, status: task.status, catalog_key: task.catalog2_task?.key ?? null, stage_execution: task.stage_execution },
      viewer: { kind, can_manage_sla: staff },
      stages, approval_gates: gates, sla: await slaView(prisma, task.id),
      inputs: inputs.map((i) => ({ id: i.id, label: i.label, source_product_id: i.source_product_id, source_task_id: i.source_project_task_id, deliverable_key: i.source_deliverable_key, link_url: i.link_url, version: i.version_number, approval_status: i.approval_status, approved_at: i.approved_at })),
      dependencies: deps.map((d) => ({ rule_id: d.ruleId, kind: d.targetKind, behavior: d.behavior, state: d.state, satisfied: d.satisfied, reason: d.reason })),
      connections: await taskConnectionView(prisma, task.id),
    });
  } catch (e) { next(e); }
});

export default router;
