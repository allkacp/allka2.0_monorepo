import type { DbClient } from "./project-scope";
import { getNextTaskCode } from "./task-code";
import { computePricing, type PricingSelection } from "./catalog2-pricing";
import type { GerarTarefasResult } from "./generate-tasks";

export interface GerarTarefasCatalog2Options {
  // Obrigatórios: geração só acontece a partir de um pagamento confirmado —
  // mesmo contrato de gerarTarefasDoProjeto (generate-tasks.ts).
  paymentId: string;
  paidAt: Date;
  billingCycleKey: string;
  // Só os ProjectProduct de origem catalog2 cobertos por ESTE pagamento —
  // nunca uma consulta fresca a "produtos atuais do projeto".
  projectProductIds: string[];
}

/**
 * Espelha gerarTarefasDoProjeto (src/lib/generate-tasks.ts) para o novo
 * catálogo: gera ProjectTask/ProjectTaskStage a partir dos Catalog2Task da
 * versão CONTRATADA (ProjectProduct.catalog2_version_id — a mesma que a
 * Catalog2Quote de origem congelou), nunca da versão publicada atual do
 * produto (que pode já ter mudado).
 *
 * Tarefa condicional (Catalog2Task.is_conditional=true) só é materializada
 * se sua key estiver em `active_task_keys` — resultado que o próprio motor
 * de precificação (computePricing) já calcula a partir dos efeitos
 * (add_task/remove_task) da seleção CONGELADA na quote de origem. Isto
 * reaproveita o motor de efeitos existente (catalog2-effects.ts via
 * catalog2-pricing.ts) em vez de duplicar a lógica de condições aqui.
 *
 * Idempotência: generation_key com prefixo "c2:" (c2:paymentId:
 * projectProductId:catalog2TaskId:occurrenceIndex) — nunca colide com o
 * formato legado sem prefixo. Etapas usam ProjectTaskStage.source_key
 * ("c2:" + generationKey + ":step:" + stepId), protegido pela constraint
 * @@unique([project_task_id, source_key]) — create-only, nunca duplica sob
 * retry.
 *
 * Limitação conhecida (documentada, fora de escopo do Bloco 6): dependência
 * ENTRE tarefas (Catalog2TaskDependency) não bloqueia a tarefa dependente no
 * motor de execução (isso exigiria estender stage-engine.ts amplamente) —
 * só é refletida em sort_order (dependências antes) e como texto
 * informativo em `observations`.
 *
 * Deve ser chamada com o Prisma Transaction Client (tx), de dentro da mesma
 * transação que confirma o pagamento — ver src/lib/confirm-payment.ts.
 */
export async function gerarTarefasCatalog2DoProjeto(
  tx: DbClient,
  projectId: string,
  options: GerarTarefasCatalog2Options,
): Promise<GerarTarefasResult> {
  const warnings: string[] = [];
  const produtos_sem_modelo: string[] = [];
  const erros_de_geracao: string[] = [];

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });
  if (!project) {
    throw new Error(`Projeto não encontrado: ${projectId}`);
  }

  const projectProducts = await tx.projectProduct.findMany({
    where: {
      project_id: projectId,
      id: { in: options.projectProductIds },
      catalog2_product_id: { not: null },
      catalog2_version_id: { not: null },
    },
    include: {
      catalog2_version: {
        include: {
          tasks: {
            orderBy: { sort_order: "asc" },
            include: {
              steps: { orderBy: { sort_order: "asc" } },
              dependencies: { select: { depends_on_task_id: true } },
              specialty: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (projectProducts.length === 0) {
    warnings.push(`Projeto "${project.title}" (${projectId}) não possui produtos catalog2 válidos para gerar tarefas.`);
  }

  let generated = 0;
  let skipped = 0;
  let stages_generated = 0;

  for (const pp of projectProducts) {
    const productName = pp.product_name_snapshot;
    const version = pp.catalog2_version;
    if (!version) {
      produtos_sem_modelo.push(productName);
      continue;
    }

    // Reexecuta o motor de precificação sobre a MESMA seleção congelada na
    // Catalog2Quote de origem, só para obter active_task_keys — nunca para
    // recalcular preço/prazo aqui (isso já foi congelado no checkout).
    let activeTaskKeys: Set<string> | null = null;
    if (pp.origin_catalog2_quote_id) {
      const quote = await tx.catalog2Quote.findUnique({
        where: { id: pp.origin_catalog2_quote_id },
        select: { selection_json: true },
      });
      if (quote) {
        const sel = JSON.parse(quote.selection_json) as PricingSelection;
        const pricing = await computePricing(version.id, sel);
        activeTaskKeys = new Set(pricing.active_task_keys);
      }
    }
    // Sem cotação de origem rastreável (não deveria acontecer no fluxo
    // normal — só robustez): assume só as tarefas fixas, nunca as
    // condicionais, para nunca cobrar/entregar algo não confirmado.
    const tasksToGenerate = version.tasks.filter(
      (t) => !t.is_conditional || (activeTaskKeys?.has(t.key) ?? false),
    );

    if (tasksToGenerate.length === 0) {
      produtos_sem_modelo.push(productName);
      warnings.push(`Produto "${productName}" (catalog2) não possui tarefas ativas nesta contratação.`);
      continue;
    }

    // Dependências: ordena para que uma tarefa nunca venha antes de quem ela
    // depende (sort_order relativo) — ver limitação conhecida no comentário
    // do arquivo (não bloqueia execução, só ordena).
    const byId = new Map(tasksToGenerate.map((t) => [t.id, t]));
    const orderedTasks = topoSort(tasksToGenerate, byId);

    for (let idx = 0; idx < orderedTasks.length; idx++) {
      const ct = orderedTasks[idx];
      const occurrenceIndex = 0;
      const generationKey = `c2:${options.paymentId}:${pp.id}:${ct.id}:${occurrenceIndex}`;

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
        const dependencyNames = ct.dependencies
          .map((d) => byId.get(d.depends_on_task_id)?.name)
          .filter((n): n is string => !!n);

        const newTask = await tx.projectTask.create({
          data: {
            project_id: projectId,
            project_product_id: pp.id,
            product_id: null,
            catalog2_task_id: ct.id,
            catalog2_product_id: pp.catalog2_product_id,
            catalog2_version_id: pp.catalog2_version_id,
            code_snapshot: ct.key,
            name_snapshot: ct.name,
            category_snapshot: ct.specialty?.name ?? null,
            task_code: taskCode,
            title: ct.name,
            description: ct.description ?? ct.objective ?? null,
            status: "PARA_LANCAMENTO",
            exige_aprovacao_cliente: ct.requires_client_approval,
            sort_order: idx,
            checklist_snapshot: null,
            steps_snapshot: null,
            briefing_snapshot: null,
            observations: dependencyNames.length > 0 ? `Depende de: ${dependencyNames.join(", ")}` : null,
            lancamento_expires_at: new Date(options.paidAt.getTime() + 30 * 24 * 60 * 60 * 1000),
            origin_payment_id: options.paymentId,
            generation_key: generationKey,
            billing_cycle_key: options.billingCycleKey,
            occurrence_index: occurrenceIndex,
          },
        });
        generated++;

        const steps = ct.steps;
        const stagesToCreate =
          steps.length > 0
            ? steps.map((step, sIdx) => ({
                project_task_id: newTask.id,
                source_key: `${generationKey}:step:${step.id}`,
                catalog_step_ref: step.id,
                titulo: step.name,
                descricao: step.description ?? null,
                ordem: sIdx + 1,
                status: sIdx === 0 ? "PENDENTE" : "BLOQUEADA",
                obrigatoria: true,
                depende_da_etapa_anterior: sIdx > 0,
                briefing_necessario: sIdx === 0,
              }))
            : [
                {
                  project_task_id: newTask.id,
                  source_key: `${generationKey}:step:self`,
                  catalog_step_ref: ct.id,
                  titulo: ct.name,
                  descricao: ct.description ?? null,
                  ordem: 1,
                  status: "PENDENTE",
                  obrigatoria: true,
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

/** Ordena tarefas por dependência (topológico simples) — em caso de ciclo
 * (não deveria existir, validado no admin do catalog2), preserva a ordem
 * original em vez de travar. */
function topoSort<T extends { id: string; sort_order: number; dependencies: { depends_on_task_id: string }[] }>(
  tasks: T[],
  byId: Map<string, T>,
): T[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: T[] = [];

  function visit(t: T) {
    if (visited.has(t.id) || visiting.has(t.id)) return;
    visiting.add(t.id);
    for (const dep of t.dependencies) {
      const depTask = byId.get(dep.depends_on_task_id);
      if (depTask) visit(depTask);
    }
    visiting.delete(t.id);
    visited.add(t.id);
    out.push(t);
  }

  for (const t of [...tasks].sort((a, b) => a.sort_order - b.sort_order)) visit(t);
  return out;
}

/** Soma dois resultados de geração de tarefas (legado + catalog2) num só,
 * para o chamador (confirm-payment.ts) reportar um único resultado. */
export function mergeGerarTarefasResults(
  a: GerarTarefasResult | null,
  b: GerarTarefasResult,
): GerarTarefasResult {
  if (!a) return b;
  return {
    project_id: a.project_id,
    generated: a.generated + b.generated,
    skipped: a.skipped + b.skipped,
    stages_generated: a.stages_generated + b.stages_generated,
    total_tarefas: b.total_tarefas, // já reflete o total acumulado do projeto
    total_etapas: b.total_etapas,
    produtos_processados: a.produtos_processados + b.produtos_processados,
    produtos_sem_modelo: [...a.produtos_sem_modelo, ...b.produtos_sem_modelo],
    erros_de_geracao: [...a.erros_de_geracao, ...b.erros_de_geracao],
    warnings: [...a.warnings, ...b.warnings],
  };
}
