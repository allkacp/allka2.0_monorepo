import { prisma } from "./prisma";

export interface GerarTarefasResult {
  project_id: string;
  generated: number;
  skipped: number;
  stages_generated: number;
}

/**
 * Gera tarefas operacionais (ProjectTask + ProjectTaskStage) para todos os
 * produtos vinculados a um projeto.
 *
 * Idempotente: não cria duplicatas se executada mais de uma vez.
 * Modelos inativos (is_active = false) são ignorados.
 * Disparada automaticamente quando o projeto muda para status "planning".
 */
export async function gerarTarefasDoProjeto(
  projectId: string,
): Promise<GerarTarefasResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });
  if (!project) {
    throw new Error(`Projeto não encontrado: ${projectId}`);
  }

  const projectProducts = await prisma.projectProduct.findMany({
    where: { project_id: projectId },
    include: {
      product: {
        include: {
          task_links: {
            where: { catalog_task: { is_active: true } },
            include: { catalog_task: true },
            orderBy: { sort_order: "asc" },
          },
        },
      },
    },
  });

  let generated = 0;
  let skipped = 0;
  let stages_generated = 0;

  for (const pp of projectProducts) {
    for (const link of pp.product.task_links) {
      const ct = link.catalog_task;

      // Idempotency check — skip if task already exists for this product+model pair
      const existing = await prisma.projectTask.findFirst({
        where: { project_product_id: pp.id, catalog_task_id: ct.id },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const task = await prisma.projectTask.create({
        data: {
          project_id: projectId,
          project_product_id: pp.id,
          product_id: pp.product_id,
          catalog_task_id: ct.id,
          code_snapshot: ct.code,
          name_snapshot: ct.name,
          category_snapshot: ct.category,
          title: ct.name,
          description: ct.description || null,
          status: "PARA_LANCAMENTO",
          priority: ct.default_priority || "medium",
          sort_order: link.sort_order,
          phase: link.phase || null,
          fase: link.phase || null,
          checklist_snapshot: ct.checklist || null,
          steps_snapshot: ct.steps || null,
          briefing_snapshot: ct.briefing_questions || null,
        },
      });
      generated++;

      // Create stages from steps_snapshot immediately (not lazy)
      if (ct.steps) {
        let steps: Array<{
          title?: string;
          label?: string;
          description?: string;
          mandatory?: boolean;
          requires_briefing?: boolean;
          checklist?: unknown;
        }> = [];
        try {
          steps = JSON.parse(ct.steps);
        } catch {
          // invalid JSON — skip stage creation
        }

        if (Array.isArray(steps) && steps.length > 0) {
          const stageData = steps.map((step, idx) => ({
            project_task_id: task.id,
            titulo: step.title || step.label || `Etapa ${idx + 1}`,
            descricao: step.description ?? null,
            ordem: idx,
            status: "PENDENTE",
            obrigatoria: step.mandatory ?? true,
            briefing_necessario: step.requires_briefing ?? false,
            checklist_snapshot: step.checklist
              ? JSON.stringify(step.checklist)
              : null,
          }));

          await prisma.projectTaskStage.createMany({ data: stageData });
          stages_generated += stageData.length;
        }
      }
    }
  }

  return { project_id: projectId, generated, skipped, stages_generated };
}
