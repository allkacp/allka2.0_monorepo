// Pagamento do nômade na execução por etapa (reunião 2026-10-05, A8b-4). Configurável por tarefa do produto:
//  · "at_end"    (padrão): nada é creditado até a tarefa fechar — os créditos ficam retidos e a regra antiga paga no aceite final;
//  · "per_stage": cada etapa que fecha (qualificada e aprovada) paga o nômade que a executou, na hora.
// O pagamento por etapa é idempotente (uma chave por etapa): chamar de novo nunca credita duas vezes.
import { prisma } from "./prisma";
import { recordWalletEvent } from "./wallet-service";

export const STAGE_PAYOUT_MODES = ["at_end", "per_stage"] as const;
export type StagePayoutMode = (typeof STAGE_PAYOUT_MODES)[number];
export const STAGE_PAYOUT_LABEL: Record<StagePayoutMode, string> = {
  at_end: "Só no fim da tarefa (créditos retidos até a última etapa)",
  per_stage: "A cada etapa aprovada",
};

/** A regra antiga de repasse no aceite final da tarefa continua valendo, exceto quando as etapas já foram pagas uma a uma. */
export async function taskPaysAtEnd(taskId: string): Promise<boolean> {
  const t = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { stage_execution: true, stage_payout_mode: true } });
  return !(t?.stage_execution === "stage" && t.stage_payout_mode === "per_stage");
}

/** Paga as etapas já concluídas de uma tarefa em modo "per_stage". Seguro para chamar várias vezes. */
export async function pagarEtapasConcluidas(taskId: string, actorUserId?: string | null): Promise<number> {
  const task = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { id: true, task_code: true, project_id: true, stage_execution: true, stage_payout_mode: true, nomade_responsavel_id: true } });
  if (!task || task.stage_execution !== "stage" || task.stage_payout_mode !== "per_stage") return 0;
  const etapas = await prisma.projectTaskStage.findMany({ where: { project_task_id: taskId, status: "CONCLUIDA", executor_type: "nomad" }, select: { id: true, titulo: true, nomade_id: true, valor_nomade: true } });
  let pagas = 0;
  for (const e of etapas) {
    const nomadeId = e.nomade_id ?? task.nomade_responsavel_id;
    if (!nomadeId || !(e.valor_nomade && e.valor_nomade > 0)) continue;
    const r = await recordWalletEvent("nomad", nomadeId, {
      type: "task_payout", direction: "credit", amount: e.valor_nomade, description: `Repasse — etapa "${e.titulo}" da tarefa ${task.task_code ?? task.id} aprovada`,
      idempotencyKey: `stage_payout_${e.id}`, referenceType: "project_task_stage", referenceId: e.id, createdBy: actorUserId ?? undefined, metadata: { project_id: task.project_id, project_task_id: task.id },
    });
    if (r && !r.duplicate) pagas++;
  }
  return pagas;
}

/** No aceite final ("at_end"): etapas feitas por um nômade DIFERENTE do responsável da tarefa pagam a ele, uma chave por etapa (A8b-3). */
export async function pagarOutrosNomadesNoFim(taskId: string, actorUserId?: string | null): Promise<void> {
  const task = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { id: true, task_code: true, project_id: true, nomade_responsavel_id: true } });
  if (!task) return;
  const etapas = await prisma.projectTaskStage.findMany({ where: { project_task_id: taskId, status: "CONCLUIDA" }, select: { id: true, titulo: true, nomade_id: true, valor_nomade: true } });
  for (const e of etapas) {
    if (!e.nomade_id || e.nomade_id === task.nomade_responsavel_id || !(e.valor_nomade && e.valor_nomade > 0)) continue;
    await recordWalletEvent("nomad", e.nomade_id, {
      type: "task_payout", direction: "credit", amount: e.valor_nomade, description: `Repasse — etapa "${e.titulo}" da tarefa ${task.task_code ?? task.id} concluída e aprovada`,
      idempotencyKey: `stage_payout_${e.id}`, referenceType: "project_task_stage", referenceId: e.id, createdBy: actorUserId ?? undefined, metadata: { project_id: task.project_id, project_task_id: task.id },
    });
  }
}
