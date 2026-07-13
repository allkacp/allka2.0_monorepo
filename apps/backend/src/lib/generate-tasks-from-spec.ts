import type { DbClient } from "./project-scope";
import { getNextTaskCode } from "./task-code";

/**
 * Segundo (e único outro) ponto oficial de criação de ProjectTask, ao lado de
 * gerarTarefasDoProjeto (src/lib/generate-tasks.ts). Existe porque nem toda
 * tarefa nasce de um CatalogTask genérico e reutilizável — fixtures ricas e
 * autorais (briefing, checklist, responsável nômade específico por item) não
 * têm um template de catálogo real por trás.
 *
 * Comportamento CREATE-ONLY por padrão (idempotência segura, não "resetadora"):
 *   - Tarefa já existente (achada por generation_key): REUTILIZADA como está —
 *     nenhum campo operacional (status, responsáveis, datas, prioridade,
 *     observations) é tocado. Campos descritivos (título, briefing, checklist,
 *     steps) só são sincronizados se o chamador passar syncMetadata:true — e
 *     mesmo assim nunca mexe em status/datas/responsáveis/id.
 *   - Etapas já existentes (achadas por project_task_id + source_key, ver
 *     ProjectTaskStage.source_key): REUTILIZADAS como estão. Etapas ausentes
 *     na especificação NUNCA são apagadas — só criação do que falta.
 */
export interface TaskStageSpec {
  // Código estável da etapa dentro da tarefa — compõe a source_key
  // ("spec:{generationKey}:stage:{code}"). Obrigatório: é o que garante
  // reencontrar a MESMA etapa em reexecuções sem depender do id interno.
  code: string;
  titulo: string;
  descricao?: string;
  ordem: number;
  obrigatoria?: boolean;
  briefingNecessario?: boolean;
  status?: string;
  catalogStepRef?: string;
  checklistSnapshot?: string | null;
}

export interface TaskSpec {
  // Identificador estável da especificação (não é o task_code do banco) —
  // usado só para compor a generation_key e permanecer idempotente entre
  // execuções, mesmo que o conteúdo (título, status etc.) mude depois.
  code: string;
  // Código de referência legível gravado em code_snapshot (ex.: "T-SEED-001").
  // Distinto do task_code real, que sempre vem da sequência oficial
  // (T000001, T000002, ...). Se omitido, usa `code`.
  codeSnapshot?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date | null;
  liderResponsavelId?: string | null;
  responsavelAgenciaId?: string | null;
  nomadeResponsavelId?: string | null;
  fase?: string | null;
  briefingSnapshot?: string | null;
  checklistSnapshot?: string | null;
  stepsSnapshot?: string | null;
  observations?: string | null;
  stages?: TaskStageSpec[];
}

export interface GenerateFromSpecParams {
  projectId: string;
  paymentId: string;
  projectProductId: string;
  productId: string;
  tasks: TaskSpec[];
  // Opt-in explícito: sincroniza só campos DESCRITIVOS (título, snapshots de
  // briefing/checklist/steps, code_snapshot) de tarefas já existentes. Nunca
  // toca status, datas operacionais, responsáveis ou apaga etapa — mesmo com
  // isto ligado.
  syncMetadata?: boolean;
}

export interface GenerateFromSpecResult {
  created: number;
  reused: number;
  metadataUpdated: number;
  stagesCreated: number;
  stagesReused: number;
  taskIds: Record<string, string>;
}

export class GenerateFromSpecError extends Error {}

export interface EnsureStagesResult {
  created: number;
  reused: number;
}

/**
 * Create-only por (project_task_id, source_key) — nunca apaga, nunca
 * redefine status/datas de uma etapa já existente. Extraído de
 * generateTasksFromSpec pra também ser usável por scripts que customizam
 * tarefas nascidas do gerador GENÉRICO por catálogo (gerarTarefasDoProjeto),
 * como seed-demo-partner-projects.ts — a tarefa em si já existe (criada pelo
 * caminho oficial), só as etapas precisam de conteúdo custom por especificação.
 *
 * `sourceKeyPrefix` deve ser estável entre execuções (ex.: o generation_key
 * da tarefa, ou qualquer string fixa por tarefa) — a source_key final é
 * `${sourceKeyPrefix}:stage:${stage.code}`.
 */
export async function ensureTaskStages(
  tx: DbClient,
  projectTaskId: string,
  sourceKeyPrefix: string,
  stages: TaskStageSpec[],
): Promise<EnsureStagesResult> {
  let created = 0;
  let reused = 0;
  for (const s of stages) {
    const sourceKey = `${sourceKeyPrefix}:stage:${s.code}`;
    const existingStage = await tx.projectTaskStage.findUnique({
      where: { project_task_id_source_key: { project_task_id: projectTaskId, source_key: sourceKey } },
    });
    if (existingStage) {
      reused++;
      continue;
    }
    await tx.projectTaskStage.create({
      data: {
        project_task_id: projectTaskId,
        source_key: sourceKey,
        catalog_step_ref: s.catalogStepRef ?? null,
        titulo: s.titulo,
        descricao: s.descricao ?? null,
        ordem: s.ordem,
        obrigatoria: s.obrigatoria ?? true,
        depende_da_etapa_anterior: s.ordem > 1,
        briefing_necessario: s.briefingNecessario ?? false,
        checklist_snapshot: s.checklistSnapshot ?? null,
        status: s.status ?? (s.ordem === 1 ? "PENDENTE" : "BLOQUEADA"),
      },
    });
    created++;
  }
  return { created, reused };
}

export async function generateTasksFromSpec(
  tx: DbClient,
  params: GenerateFromSpecParams,
): Promise<GenerateFromSpecResult> {
  const payment = await tx.payment.findUnique({ where: { id: params.paymentId } });
  if (!payment) {
    throw new GenerateFromSpecError(`Payment ${params.paymentId} não encontrado`);
  }
  if (payment.project_id !== params.projectId) {
    throw new GenerateFromSpecError(`Payment ${params.paymentId} não pertence ao projeto ${params.projectId}`);
  }
  if (payment.status !== "PAGO") {
    throw new GenerateFromSpecError(`Payment ${params.paymentId} não está PAGO (status atual: ${payment.status}) — geração de tarefa exige pagamento confirmado`);
  }

  const paymentItem = await tx.paymentItem.findUnique({
    where: { payment_id_project_product_id: { payment_id: params.paymentId, project_product_id: params.projectProductId } },
  });
  if (!paymentItem) {
    throw new GenerateFromSpecError(
      `Nenhum PaymentItem para payment=${params.paymentId} + project_product=${params.projectProductId} — congele o PaymentItem antes de gerar tarefas`,
    );
  }

  let created = 0;
  let reused = 0;
  let metadataUpdated = 0;
  let stagesCreated = 0;
  let stagesReused = 0;
  const taskIds: Record<string, string> = {};

  for (const spec of params.tasks) {
    const generationKey = `spec:${params.paymentId}:${params.projectProductId}:${spec.code}`;
    const existing = await tx.projectTask.findUnique({ where: { generation_key: generationKey } });

    let taskId: string;
    if (existing) {
      taskId = existing.id;
      reused++;
      if (params.syncMetadata) {
        // Só descritivo — nunca status/datas/responsáveis (ver DESCRIPTIVE_FIELDS_ONLY acima).
        await tx.projectTask.update({
          where: { id: taskId },
          data: {
            title: spec.title,
            name_snapshot: spec.title,
            code_snapshot: spec.codeSnapshot ?? spec.code,
            description: spec.description ?? null,
            briefing_snapshot: spec.briefingSnapshot ?? null,
            checklist_snapshot: spec.checklistSnapshot ?? null,
            steps_snapshot: spec.stepsSnapshot ?? null,
          },
        });
        metadataUpdated++;
      }
    } else {
      const taskCode = await getNextTaskCode(tx);
      const createdTask = await tx.projectTask.create({
        data: {
          project_id: params.projectId,
          project_product_id: params.projectProductId,
          product_id: params.productId,
          origin_payment_id: params.paymentId,
          generation_key: generationKey,
          billing_cycle_key: payment.billing_cycle_key,
          task_code: taskCode,
          code_snapshot: spec.codeSnapshot ?? spec.code,
          title: spec.title,
          name_snapshot: spec.title,
          description: spec.description ?? null,
          status: spec.status ?? "PARA_LANCAMENTO",
          priority: spec.priority ?? "medium",
          due_date: spec.dueDate ?? null,
          lider_responsavel_id: spec.liderResponsavelId ?? null,
          responsavel_agencia_id: spec.responsavelAgenciaId ?? null,
          nomade_responsavel_id: spec.nomadeResponsavelId ?? null,
          fase: spec.fase ?? null,
          phase: spec.fase ?? null,
          briefing_snapshot: spec.briefingSnapshot ?? null,
          checklist_snapshot: spec.checklistSnapshot ?? null,
          steps_snapshot: spec.stepsSnapshot ?? null,
          observations: spec.observations ?? null,
        },
      });
      taskId = createdTask.id;
      created++;
    }
    taskIds[spec.code] = taskId;

    if (spec.stages && spec.stages.length > 0) {
      // generationKey já começa com "spec:" — ensureTaskStages não duplica o prefixo.
      const stageResult = await ensureTaskStages(tx, taskId, generationKey, spec.stages);
      stagesCreated += stageResult.created;
      stagesReused += stageResult.reused;
    }
  }

  return { created, reused, metadataUpdated, stagesCreated, stagesReused, taskIds };
}
