import type { DbClient } from "./project-scope";
import { getNextTaskCode } from "./task-code";

export interface GerarTarefasResult {
  project_id: string;
  generated: number; // tasks created in this run
  skipped: number; // tasks that already existed for this generation_key (idempotency)
  stages_generated: number; // stages created in this run
  total_tarefas: number; // total tasks in the project after this run
  total_etapas: number; // total stages in the project after this run
  produtos_processados: number;
  produtos_sem_modelo: string[];
  erros_de_geracao: string[];
  warnings: string[];
}

export interface GerarTarefasOptions {
  // Obrigatórios: geração só acontece a partir de um pagamento confirmado.
  paymentId: string;
  paidAt: Date;
  billingCycleKey: string;
  // Obrigatório (não opcional de propósito — sem fallback silencioso pra
  // "todos os produtos do projeto"). Deve vir exatamente dos
  // PaymentItems.project_product_id do Payment em questão — nunca de uma
  // consulta fresca a "produtos atuais do projeto", senão um produto
  // adicionado DEPOIS do pagamento vazaria pra dentro de um reprocessamento
  // do pagamento antigo. Ver src/lib/confirm-payment.ts.
  projectProductIds: string[];
}

interface ParsedStep {
  id?: string;
  code?: string;
  name?: string;
  titulo?: string;
  description?: string;
  descricao?: string;
  order?: number;
}

function parseSteps(raw: string | null): ParsedStep[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Gera tarefas operacionais (ProjectTask) e etapas (ProjectTaskStage) para os
 * ProjectProducts de um projeto, a partir dos CatalogTasks ativos vinculados
 * a cada produto (ProductCatalogTask, respeitando sort_order/is_mandatory/
 * phase). Uma ProjectTask por CatalogTask vinculado — não uma por produto
 * (comportamento anterior desta função agregava todos os CatalogTasks de um
 * produto numa única tarefa; a lógica de project-products.ts, agora removida
 * daquele arquivo, já fazia 1 tarefa por CatalogTask corretamente — este é o
 * comportamento consolidado aqui).
 *
 * Templates originais (CatalogTask) nunca são modificados — tudo é copiado
 * por snapshot.
 *
 * Idempotência: cada tarefa tem um generation_key único
 * (paymentId:projectProductId:catalogTaskId:occurrenceIndex, ver schema). Se
 * a mesma chave já existe, a tarefa é contabilizada como "skipped" e não é
 * recriada — proteção de banco (constraint @unique), não apenas de aplicação.
 *
 * Deve ser chamada com o Prisma Transaction Client (tx) de dentro da mesma
 * transação que confirma o pagamento — ver src/lib/confirm-payment.ts. Nunca
 * chamar fora de uma transação nem passar o PrismaClient global.
 */
export async function gerarTarefasDoProjeto(
  tx: DbClient,
  projectId: string,
  options: GerarTarefasOptions,
): Promise<GerarTarefasResult> {
  const warnings: string[] = [];
  const produtos_sem_modelo: string[] = [];
  const erros_de_geracao: string[] = [];

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, status: true },
  });
  if (!project) {
    throw new Error(`Projeto não encontrado: ${projectId}`);
  }

  const projectProducts = await tx.projectProduct.findMany({
    where: {
      project_id: projectId,
      id: { in: options.projectProductIds },
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

  if (projectProducts.length === 0) {
    warnings.push(`Projeto "${project.title}" (${projectId}) não possui produtos válidos para gerar tarefas.`);
  }

  let generated = 0;
  let skipped = 0;
  let stages_generated = 0;

  for (const pp of projectProducts) {
    const productName = pp.product_name_snapshot || pp.product.name;
    const activeLinks = pp.product.task_links;

    if (activeLinks.length === 0) {
      produtos_sem_modelo.push(productName);
      warnings.push(`Produto "${productName}" não possui modelos de tarefas ativos vinculados.`);
      continue;
    }

    for (const link of activeLinks) {
      const ct = link.catalog_task;
      const occurrenceIndex = 0; // reservado para produtos com múltiplas ocorrências (não usado nesta fase)
      const generationKey = `${options.paymentId}:${pp.id}:${ct.id}:${occurrenceIndex}`;

      try {
        const existing = await tx.projectTask.findUnique({
          where: { generation_key: generationKey },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const taskCode = await getNextTaskCode(tx);
        const dueDate = ct.default_deadline_days
          ? new Date(options.paidAt.getTime() + ct.default_deadline_days * 24 * 60 * 60 * 1000)
          : null;

        const newTask = await tx.projectTask.create({
          data: {
            project_id: projectId,
            project_product_id: pp.id,
            product_id: pp.product_id,
            catalog_task_id: ct.id,
            code_snapshot: ct.code,
            name_snapshot: ct.name,
            category_snapshot: ct.category,
            task_code: taskCode,
            title: ct.name,
            description: ct.description ?? null,
            status: "PARA_LANCAMENTO",
            priority: ct.default_priority || "medium",
            sort_order: link.sort_order,
            phase: link.phase || null,
            fase: link.phase || null,
            checklist_snapshot: ct.checklist || null,
            steps_snapshot: ct.steps || null,
            briefing_snapshot: ct.briefing_questions || null,
            due_date: dueDate,
            // Janela de 30 dias pra lançar a tarefa antes dela expirar —
            // comportamento pré-existente, preservado (não é duração nova
            // inventada nesta fase).
            lancamento_expires_at: new Date(options.paidAt.getTime() + 30 * 24 * 60 * 60 * 1000),
            origin_payment_id: options.paymentId,
            generation_key: generationKey,
            billing_cycle_key: options.billingCycleKey,
            occurrence_index: occurrenceIndex,
          },
        });
        generated++;

        const parsedSteps = parseSteps(ct.steps);
        const stagesToCreate =
          parsedSteps.length > 0
            ? parsedSteps.map((step, idx) => ({
                project_task_id: newTask.id,
                catalog_step_ref: step.id ?? step.code ?? `${ct.id}-step-${idx + 1}`,
                titulo: step.name ?? step.titulo ?? `Etapa ${idx + 1}`,
                descricao: step.description ?? step.descricao ?? null,
                ordem: step.order ?? idx + 1,
                // Primeira etapa disponível (PENDENTE); demais bloqueadas
                // até a etapa anterior concluir — mesmo status já usado em
                // todo o resto do sistema para essa dependência sequencial.
                status: idx === 0 ? "PENDENTE" : "BLOQUEADA",
                obrigatoria: true,
                depende_da_etapa_anterior: idx > 0,
                briefing_necessario: false,
              }))
            : [
                // Template sem etapas cadastradas: não inventamos uma etapa
                // falsa com conteúdo fictício — materializamos 1 única etapa
                // que espelha a própria tarefa (mesmo padrão de fallback já
                // usado no sistema), preservando is_mandatory do link.
                {
                  project_task_id: newTask.id,
                  catalog_step_ref: ct.id,
                  titulo: ct.name,
                  descricao: ct.description ?? null,
                  ordem: 1,
                  status: "PENDENTE",
                  obrigatoria: link.is_mandatory,
                  depende_da_etapa_anterior: false,
                  briefing_necessario: false,
                },
              ];

        if (stagesToCreate.length > 0) {
          await tx.projectTaskStage.createMany({ data: stagesToCreate });
          stages_generated += stagesToCreate.length;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        erros_de_geracao.push(`${productName} / ${ct.name}: ${msg}`);
        throw err; // propaga pro rollback da transação — nenhuma tarefa parcial pode ficar
      }
    }
  }

  const total_tarefas = await tx.projectTask.count({ where: { project_id: projectId } });
  const total_etapas = await tx.projectTaskStage.count({ where: { project_task: { project_id: projectId } } });

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
