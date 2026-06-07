import { prisma } from "./prisma";
import { getNextTaskCode } from "./task-code";

export interface GerarTarefasResult {
  project_id: string;
  generated: number;        // tasks created in this run
  skipped: number;          // tasks that already existed (idempotency)
  stages_generated: number; // stages created in this run
  total_tarefas: number;    // total tasks in the project after this run
  total_etapas: number;     // total stages in the project after this run
  produtos_processados: number;
  produtos_sem_modelo: string[];
  erros_de_geracao: string[];
  warnings: string[];
}

export interface GerarTarefasOptions {
  paymentId?: string;
  paidAt?: Date;
  productIds?: string[];
}

/**
 * Gera tarefas operacionais (ProjectTask + ProjectTaskStage) para todos os
 * produtos vinculados a um projeto.
 *
 * Idempotente: n�o cria duplicatas se executada mais de uma vez.
 * Modelos inativos (is_active = false) s�o ignorados.
 * Disparada automaticamente quando o projeto muda para status "planning".
 */
export async function gerarTarefasDoProjeto(
  projectId: string,
  options: GerarTarefasOptions = {},
): Promise<GerarTarefasResult> {
  const warnings: string[] = [];
  const produtos_sem_modelo: string[] = [];
  const erros_de_geracao: string[] = [];

  console.log(`[generate-tasks] Iniciando gera��o de tarefas para projeto: ${projectId}`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, status: true },
  });

  if (!project) {
    throw new Error(`Projeto n�o encontrado: ${projectId}`);
  }

  console.log(`[generate-tasks] Projeto encontrado: "${project.title}" (status=${project.status})`);

  const projectProducts = await prisma.projectProduct.findMany({
    where: {
      project_id: projectId,
      ...(options.productIds?.length
        ? { product_id: { in: options.productIds } }
        : {}),
    },
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

  console.log(`[generate-tasks] Produtos encontrados no projeto: ${projectProducts.length}`);

  if (projectProducts.length === 0) {
    const msg = `Projeto "${project.title}" (${projectId}) n�o possui produtos vinculados.`;
    console.warn(`[generate-tasks] AVISO: ${msg}`);
    warnings.push(msg);
  }

  let generated = 0;
  let skipped = 0;
  let stages_generated = 0;

  for (const pp of projectProducts) {
    const productName = pp.product_name_snapshot || pp.product.name;
    const activeLinks = pp.product.task_links;
    const paymentMarker = options.paymentId
      ? `"paymentId":"${options.paymentId}"`
      : null;

    console.log(`[generate-tasks] Produto: "${productName}" | modelos ativos: ${activeLinks.length}`);

    if (activeLinks.length === 0) {
      const msg = `Produto "${productName}" n�o possui modelos de tarefas ativos vinculados.`;
      console.warn(`[generate-tasks] AVISO: ${msg}`);
      warnings.push(msg);
      produtos_sem_modelo.push(productName);
      continue;
    }

    // Idempotency: check if a task already exists for this project_product
    const existingTask = await prisma.projectTask.findFirst({
      where: options.paymentId
        ? {
            project_product_id: pp.id,
            observations: { contains: paymentMarker ?? "" },
          }
        : { project_product_id: pp.id },
      include: { stages: { select: { catalog_step_ref: true } } },
    });

    let taskId: string;

    // First active link determines the primary CatalogTask metadata
    const primaryLink = activeLinks[0];
    const primaryCt = primaryLink?.catalog_task;

    if (existingTask) {
      taskId = existingTask.id;
      skipped++;
      console.log(`[generate-tasks]   Pulando tarefa (j� existe): "${existingTask.title}"`);
    } else {
      const taskCode = await getNextTaskCode();
      const newTask = await prisma.projectTask.create({
        data: {
          project_id: projectId,
          project_product_id: pp.id,
          product_id: pp.product_id,
          // Link to the primary catalog task so auto-assignment services can read category
          catalog_task_id: primaryCt?.id ?? null,
          code_snapshot: primaryCt?.code ?? null,
          name_snapshot: primaryCt?.name ?? productName,
          category_snapshot: primaryCt?.category ?? null,
          steps_snapshot: primaryCt?.steps ?? null,
          briefing_snapshot: primaryCt?.briefing_questions ?? null,
          checklist_snapshot: primaryCt?.checklist ?? null,
          title: primaryCt?.name ?? productName,
          task_code: taskCode,
          status: "PARA_LANCAMENTO",
          priority: primaryCt?.default_priority ?? "medium",
          sort_order: 0,
          // 30-day window to launch the task before it expires
          lancamento_expires_at: new Date(
            (options.paidAt ?? new Date()).getTime() + 30 * 24 * 60 * 60 * 1000,
          ),
          observations: JSON.stringify({
            source: "payment-approved",
            paymentId: options.paymentId ?? null,
            projectId,
            projectProductId: pp.id,
            productId: pp.product_id,
            paidAt: (options.paidAt ?? new Date()).toISOString(),
          }),
        },
      });
      taskId = newTask.id;
      generated++;
      console.log(`[generate-tasks]   ? Tarefa criada: "${primaryCt?.name ?? productName}" (id=${newTask.id})`);
    }

    // Build stages: expand CatalogTask.steps JSON into individual stages,
    // or fall back to one stage per CatalogTask link for tasks without steps.
    const existingRefs = new Set(
      (existingTask?.stages ?? []).map((s) => s.catalog_step_ref).filter(Boolean),
    );
    const stagesToCreate: Array<{
      project_task_id: string;
      catalog_step_ref: string;
      titulo: string;
      descricao: string | null;
      ordem: number;
      status: string;
      obrigatoria: boolean;
      depende_da_etapa_anterior: boolean;
      briefing_necessario: boolean;
    }> = [];

    for (const link of activeLinks) {
      const ct = link.catalog_task;

      // Try to parse the steps JSON (e.g., PA0001-T01 has 7 steps)
      let parsedSteps: Array<{
        id?: string;
        code?: string;
        name?: string;
        titulo?: string;
        description?: string;
        descricao?: string;
        order?: number;
      }> = [];
      if (ct.steps) {
        try {
          const raw = JSON.parse(ct.steps);
          if (Array.isArray(raw)) parsedSteps = raw;
        } catch {
          // ignore JSON parse errors � fall through to single-stage fallback
        }
      }

      if (parsedSteps.length > 0) {
        // Expand each step into its own ProjectTaskStage
        parsedSteps.forEach((step, idx) => {
          const stepRef = step.id ?? step.code ?? `${ct.id}-step-${idx + 1}`;
          if (existingRefs.has(stepRef)) return;
          stagesToCreate.push({
            project_task_id: taskId,
            catalog_step_ref: stepRef,
            titulo: step.name ?? step.titulo ?? `Etapa ${idx + 1}`,
            descricao: step.description ?? step.descricao ?? null,
            ordem: step.order ?? idx + 1,
            // First stage starts PENDENTE (activated when task is launched)
            // Subsequent stages are BLOQUEADA until the previous one completes
            status: idx === 0 ? "PENDENTE" : "BLOQUEADA",
            obrigatoria: true,
            depende_da_etapa_anterior: idx > 0,
            briefing_necessario: false,
          });
        });
      } else {
        // Fallback: one stage representing the whole CatalogTask
        if (!existingRefs.has(link.catalog_task_id)) {
          stagesToCreate.push({
            project_task_id: taskId,
            catalog_step_ref: link.catalog_task_id,
            titulo: ct.name,
            descricao: ct.description ?? null,
            ordem: link.sort_order,
            status: "PENDENTE",
            obrigatoria: link.is_mandatory,
            depende_da_etapa_anterior: false,
            briefing_necessario: false,
          });
        }
      }
    }

    if (stagesToCreate.length > 0) {
      await prisma.projectTaskStage.createMany({ data: stagesToCreate });
      stages_generated += stagesToCreate.length;
      console.log(`[generate-tasks]   ? ${stagesToCreate.length} etapas criadas`);
    }
  }

  console.log(
    `[generate-tasks] Conclu�do: geradas=${generated} tarefas, ${stages_generated} etapas, ignoradas=${skipped}, sem_modelo=${produtos_sem_modelo.length}`,
  );

  if (generated === 0 && skipped === 0 && projectProducts.length > 0) {
    const msg = "Nenhuma tarefa foi gerada. Verifique os modelos vinculados aos produtos.";
    console.warn(`[generate-tasks] AVISO: ${msg}`);
    warnings.push(msg);
  }

  // Query real totals after this run (accurate regardless of prior state)
  const total_tarefas = await prisma.projectTask.count({
    where: { project_id: projectId },
  });
  const total_etapas = await prisma.projectTaskStage.count({
    where: { project_task: { project_id: projectId } },
  });

  console.log(
    `[generate-tasks] Totais finais: ${total_tarefas} tarefas, ${total_etapas} etapas no projeto`,
  );

  return {
    project_id: projectId,
    generated,
    skipped,
    stages_generated,
    total_tarefas,
    total_etapas,
    produtos_processados: projectProducts.length,
    produtos_sem_modelo,
    erros_de_geracao,
    warnings,
  };
}
