// Guia operacional da tarefa contratada (Pedido 3, fase 1): o que cada perfil pode ver das
// instruções, entradas, saída esperada, critérios e evidências — filtrado pela visibilidade
// definida no cadastro do produto. Nada aqui devolve campo que o perfil não pode ver.
import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeStepOps, normalizeTaskOps, visibleChecklist, visibleStepGuide, visibleTaskGuide, type Visibility, type VisibleGuideItem } from "./catalog2-ops";

type Db = PrismaClient | Prisma.TransactionClient;

export interface OperationalGuide {
  viewer: Visibility;
  task: { items: VisibleGuideItem[] };
  stages: Array<{
    stage_id: string;
    titulo: string;
    ordem: number;
    status: string;
    items: VisibleGuideItem[];
    evidence_required: boolean;
  }>;
}

function parseJson(v: string | null | undefined): Record<string, unknown> {
  if (!v) return {};
  try {
    const p = JSON.parse(v);
    return p && typeof p === "object" ? (p as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** `taskId` já precisa ter sido autorizado pelo chamador (escopo do perfil). */
export async function loadOperationalGuide(db: Db, taskId: string, viewer: Visibility): Promise<OperationalGuide | null> {
  const task = await db.projectTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      description: true,
      ops: { select: { task_ops: true, stage_ops: true } },
      stages: { orderBy: [{ ordem: "asc" }, { created_at: "asc" }], select: { id: true, titulo: true, descricao: true, ordem: true, status: true, exige_anexo: true, catalog_step_ref: true, config_snapshot: true } },
    },
  });
  if (!task) return null;
  const taskOps = normalizeTaskOps(task.ops?.task_ops);
  const stageOpsMap = (task.ops?.stage_ops && typeof task.ops.stage_ops === "object" ? task.ops.stage_ops : {}) as Record<string, unknown>;
  return {
    viewer,
    task: { items: visibleTaskGuide(taskOps, viewer, { description: task.description }) },
    stages: task.stages.map((st) => {
      const cfg = parseJson(st.config_snapshot);
      const ops = st.catalog_step_ref ? normalizeStepOps(stageOpsMap[st.catalog_step_ref]) : null;
      const g = visibleStepGuide(ops, viewer, { description: st.descricao, completion_criteria: typeof cfg.completion_criteria === "string" ? cfg.completion_criteria : null });
      return { stage_id: st.id, titulo: st.titulo, ordem: st.ordem, status: st.status, items: g.items, evidence_required: g.evidence_required || st.exige_anexo, checklist: visibleChecklist(ops, viewer) };
    }),
  };
}
