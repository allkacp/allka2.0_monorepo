// Dependência real entre tarefas do catalog2 (fechamento técnico do sprint
// de produtos). `Catalog2TaskDependency` já existia desde o Bloco 3, mas até
// aqui só influenciava a ORDEM de geração (sort_order) — nunca bloqueava
// execução. Este módulo é o único ponto de verdade sobre "esta tarefa pode
// começar?" para tarefas nascidas do catalog2; tarefas do catálogo antigo
// (catalog2_task_id nulo) nunca passam por aqui.
import type { DbClient } from "./project-scope";

// Status que já representam "a tarefa começou" — usado nos dois sentidos:
// (a) o alvo de uma transição cai aqui → precisa checar dependência;
// (b) o status ATUAL já cai aqui → a tarefa já passou do gate, não bloqueia
//     de novo (evita re-bloquear uma tarefa em andamento por engano).
export const CATALOG2_STARTED_STATUSES = new Set([
  "LIBERADA_PARA_EXECUCAO",
  "EM_EXECUCAO",
  "EM_REVISAO",
  "EM_APROVACAO",
  "APROVADA",
  "CONCLUIDA",
]);

export interface DependencyBlocker {
  task_id: string;
  title: string;
  status: string;
}

/**
 * Se a tarefa tiver dependências do catalog2 ainda não concluídas, devolve a
 * PRIMEIRA tarefa-irmã (mesmo ProjectProduct, mesma contratação) que ainda
 * bloqueia. `null` = livre para iniciar (sem dependência, ou já concluída).
 *
 * Escopo por `project_product_id` (não só `project_id`): dependências do
 * catalog2 só fazem sentido dentro da MESMA versão/contratação — isso evita
 * que uma dependência de uma compra colida com tarefas de outra compra do
 * mesmo produto no mesmo projeto (ex.: pedido original + aditivo).
 */
export async function findUnmetCatalog2Dependency(
  db: DbClient,
  task: { project_product_id: string; catalog2_task_id: string | null },
): Promise<DependencyBlocker | null> {
  if (!task.catalog2_task_id) return null;

  const deps = await db.catalog2TaskDependency.findMany({
    where: { task_id: task.catalog2_task_id },
    select: { depends_on_task_id: true },
  });
  if (deps.length === 0) return null;

  const dependsOnCatalogTaskIds = deps.map((d) => d.depends_on_task_id);
  const blocker = await db.projectTask.findFirst({
    where: {
      project_product_id: task.project_product_id,
      catalog2_task_id: { in: dependsOnCatalogTaskIds },
      status: { not: "CONCLUIDA" },
    },
    select: { id: true, title: true, status: true },
  });
  return blocker ? { task_id: blocker.id, title: blocker.title, status: blocker.status } : null;
}

/**
 * Decide se uma transição de status precisa passar pelo gate de dependência:
 * só quando o ALVO é um status "iniciado" e o status ATUAL ainda não é (a
 * tarefa nunca tinha começado antes desta chamada).
 */
export function transitionNeedsDependencyGate(currentStatus: string, targetStatus: string): boolean {
  return CATALOG2_STARTED_STATUSES.has(targetStatus) && !CATALOG2_STARTED_STATUSES.has(currentStatus);
}
