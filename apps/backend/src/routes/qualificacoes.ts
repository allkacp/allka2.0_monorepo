import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { isAdminUser } from "../lib/project-scope";
import { normalizeStepOps } from "../lib/catalog2-ops";
import { EtapaDecisaoError } from "../lib/stage-engine";
import { aplicarDecisaoEtapa } from "./project-tasks";

// Tela ÚNICA de qualificação (reunião 14/10): o mesmo painel serve ao líder, a qualquer pessoa escolhida como qualificadora,
// ao nômade qualificador (grupo de nômades qualificadores) e ao administrador. Cada um só vê e decide o que é seu.
const router = Router();
router.use(verifyToken);

type Tipo = "qualificacao" | "especialista";

const stageSelect = {
  id: true, titulo: true, descricao: true, status: true, entregue_em: true, rodada_ajuste: true, lider_id: true,
  especialista_id: true, qualificador_pool: true, catalog_step_ref: true, project_task_id: true,
  project_task: { select: { id: true, title: true, task_code: true, project_id: true, lider_responsavel_id: true, nomade_responsavel_id: true } },
} as const;

/** Tipo de decisão que o usuário pode tomar nesta etapa (ou null). */
function tipoPermitido(user: NonNullable<Request["user"]>, e: { status: string; lider_id: string | null; especialista_id: string | null; project_task: { lider_responsavel_id: string | null } }): Tipo | null {
  const admin = isAdminUser(user);
  if (e.status === "EM_QUALIFICACAO" && (admin || e.project_task.lider_responsavel_id === user.id || e.lider_id === user.id)) return "qualificacao";
  if (e.status === "EM_QUALIFICACAO_ESPECIALISTA" && (admin || (!!e.especialista_id && e.especialista_id === user.id))) return "especialista";
  return null;
}

// GET /api/qualificacoes/pendentes — etapas que aguardam a decisão do usuário
router.get("/pendentes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const admin = isAdminUser(user);
    const rows = await prisma.projectTaskStage.findMany({
      where: {
        OR: [
          { status: "EM_QUALIFICACAO", ...(admin ? {} : { OR: [{ lider_id: user.id }, { project_task: { lider_responsavel_id: user.id } }] }) },
          { status: "EM_QUALIFICACAO_ESPECIALISTA", ...(admin ? {} : { especialista_id: user.id }) },
        ],
      },
      select: stageSelect,
      orderBy: { entregue_em: "asc" },
      take: 200,
    });
    const data = rows.map((e) => ({
      id: e.id,
      task_id: e.project_task.id,
      task_title: e.project_task.title,
      task_code: e.project_task.task_code,
      stage_title: e.titulo,
      stage_description: e.descricao,
      kind: e.status === "EM_QUALIFICACAO" ? "qualificacao" : "especialista",
      from_pool: e.qualificador_pool,
      delivered_at: e.entregue_em,
      round: e.rodada_ajuste,
    }));
    res.json({ data, total: data.length });
  } catch (err) { next(err); }
});

// GET /api/qualificacoes/etapas/:stageId — o que conferir: orientações, checklist, critério, entregas e histórico
router.get("/etapas/:stageId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const e = await prisma.projectTaskStage.findUnique({ where: { id: req.params.stageId as string }, select: stageSelect });
    const tipo = e ? tipoPermitido(user, e) : null;
    if (!e || !tipo) { res.status(404).json({ error: "Etapa não encontrada ou não é sua para qualificar." }); return; }
    const step = e.catalog_step_ref
      ? await prisma.catalog2TaskStep.findUnique({ where: { id: e.catalog_step_ref }, select: { name: true, description: true, completion_criteria: true, ops: true } }).catch(() => null)
      : null;
    let ops: ReturnType<typeof normalizeStepOps> = null;
    try { ops = step?.ops ? normalizeStepOps(typeof step.ops === "string" ? JSON.parse(step.ops) : step.ops) : null; } catch { ops = null; }
    const [entregas, historico] = await Promise.all([
      prisma.taskAttachment.findMany({ where: { project_task_stage_id: e.id, type: "delivery" }, orderBy: { created_at: "desc" } }),
      prisma.projectTaskStageReview.findMany({ where: { stage_id: e.id }, orderBy: { created_at: "asc" } }),
    ]);
    res.json({
      id: e.id, kind: tipo, task: { id: e.project_task.id, title: e.project_task.title, code: e.project_task.task_code },
      stage: { title: e.titulo, description: e.descricao, completion_criteria: step?.completion_criteria ?? null, round: e.rodada_ajuste },
      guide: { instructions: ops?.instructions ?? null, evidence_hint: ops?.evidence_hint ?? null, evidence_types: ops?.evidence_types ?? [] },
      checklist: (ops?.checklist ?? []).filter((c) => c.kind === "qualificacao" || c.kind === "execucao"),
      deliveries: entregas,
      history: historico.map((r) => ({ id: r.id, kind: r.kind, decision: r.decision, round: r.round, comment: r.comment, created_at: r.created_at })),
    });
  } catch (err) { next(err); }
});

// POST /api/qualificacoes/etapas/:stageId/decisao — aprovar, pedir ajustes (reprovar) ou comentar
const decisaoSchema = z.object({ decisao: z.enum(["aprovar", "reprovar", "comentar"]), comentario: z.string().max(4000).optional() });
router.post("/etapas/:stageId/decisao", validate(decisaoSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const e = await prisma.projectTaskStage.findUnique({ where: { id: req.params.stageId as string }, select: stageSelect });
    const tipo = e ? tipoPermitido(user, e) : null;
    if (!e || !tipo) { res.status(403).json({ error: "Esta etapa não está aguardando a sua qualificação." }); return; }
    const { decisao, comentario } = req.body as z.infer<typeof decisaoSchema>;
    if (decisao === "reprovar" && !(comentario ?? "").trim()) { res.status(422).json({ error: "Explique o que precisa ser ajustado para pedir ajustes." }); return; }
    const resultado = await aplicarDecisaoEtapa({
      etapa: { id: e.id },
      task: { id: e.project_task.id, project_id: e.project_task.project_id, nomade_responsavel_id: e.project_task.nomade_responsavel_id, task_code: e.project_task.task_code },
      tipo, decisao, comentario, userId: user.id,
    });
    res.json(resultado);
  } catch (err) {
    if (err instanceof EtapaDecisaoError) { res.status(err.httpStatus).json({ error: err.message }); return; }
    next(err);
  }
});

export default router;
