import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";
import { runAtomic } from "./db-atomic";

// ─── Dependência OPERACIONAL entre tarefas (bloco 4/4) ──────────────────────
// Entidade PRÓPRIA (`TaskDependency`) — nunca reaproveita
// `Catalog2TaskDependency` (template-a-template do catálogo, nunca aponta pra
// um ProjectTask real). O backend valida o GRAFO INTEIRO (autorreferência,
// ciclo direto/indireto, projetos diferentes, tarefa inexistente) — nunca só
// a interface.

export class DependencyValidationError extends Error {
  httpStatus = 422;
  code = "task_dependency_invalid";
  constructor(message: string) {
    super(message);
  }
}

export class DependencyInUseError extends Error {
  httpStatus = 409;
  code = "task_dependency_in_use";
  constructor(message: string) {
    super(message);
  }
}

async function loadProjectEdges(db: DbClient, projectId: string): Promise<{ task_id: string; depends_on_task_id: string }[]> {
  return db.taskDependency.findMany({ where: { project_id: projectId }, select: { task_id: true, depends_on_task_id: true } });
}

/** BFS: a partir de `from`, seguindo arestas "depende de", alcança `target`? Detecta ciclo indireto/ramificado/convergente igual a direto. */
function reaches(edges: { task_id: string; depends_on_task_id: string }[], from: string, target: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const e of edges) adjacency.set(e.task_id, [...(adjacency.get(e.task_id) ?? []), e.depends_on_task_id]);

  const visited = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) stack.push(next);
  }
  return false;
}

/**
 * Adiciona UMA aresta de dependência (taskId depende de dependsOnTaskId),
 * validando o grafo INTEIRO do projeto antes — nunca só a checagem local da
 * nova aresta. Ciclo (direto ou indireto), autorreferência, tarefa
 * inexistente e projetos diferentes são sempre rejeitados.
 */
export async function addTaskDependency(
  params: { taskId: string; dependsOnTaskId: string; actorUserId: string },
  db: DbClient = prisma,
) {
  if (params.taskId === params.dependsOnTaskId) {
    throw new DependencyValidationError("Uma tarefa não pode depender de si mesma.");
  }

  const [task, dependsOn] = await Promise.all([
    db.projectTask.findUnique({ where: { id: params.taskId }, select: { id: true, project_id: true, title: true } }),
    db.projectTask.findUnique({ where: { id: params.dependsOnTaskId }, select: { id: true, project_id: true, title: true } }),
  ]);
  if (!task) throw new DependencyValidationError("Tarefa não encontrada.");
  if (!dependsOn) throw new DependencyValidationError("Tarefa pré-requisito não encontrada.");
  if (task.project_id !== dependsOn.project_id) {
    throw new DependencyValidationError("Uma dependência nunca pode atravessar projetos diferentes.");
  }

  const edges = await loadProjectEdges(db, task.project_id);
  // Ciclo (direto: dependsOn -> task já existe; indireto: dependsOn alcança
  // task por uma cadeia/ramificação/convergência já existente).
  if (reaches(edges, params.dependsOnTaskId, params.taskId)) {
    throw new DependencyValidationError("Esta dependência criaria um ciclo (direto ou indireto) entre tarefas.");
  }

  try {
    return await runAtomic(db, async (tx) => {
      const dependency = await tx.taskDependency.create({
        data: {
          project_id: task.project_id,
          task_id: params.taskId,
          depends_on_task_id: params.dependsOnTaskId,
          created_by_user_id: params.actorUserId,
        },
      });
      await tx.taskReleaseEvent.create({
        data: {
          task_id: params.taskId,
          event_type: "dependency_added",
          actor_user_id: params.actorUserId,
          description: `Passou a depender da tarefa "${dependsOn.title}".`,
        },
      });
      return dependency;
    });
  } catch (e: any) {
    if (e?.code === "P2002") throw new DependencyValidationError("Esta dependência já existe.");
    throw e;
  }
}

/**
 * Remove uma dependência (edição humana / correção). Nunca some em silêncio
 * — sempre gera um TaskReleaseEvent auditável, e reavaliação de liberação
 * cabe ao chamador (a remoção pode destravar a sucessora).
 */
export async function removeTaskDependency(dependencyId: string, actorUserId: string, db: DbClient = prisma) {
  const dep = await db.taskDependency.findUnique({ where: { id: dependencyId } });
  if (!dep) return null;
  return runAtomic(db, async (tx) => {
    await tx.taskDependency.delete({ where: { id: dependencyId } });
    await tx.taskReleaseEvent.create({
      data: { task_id: dep.task_id, event_type: "dependency_removed", actor_user_id: actorUserId, description: "Pré-requisito removido." },
    });
    return dep;
  });
}

/**
 * "Impedir exclusão silenciosa de tarefa usada como pré-requisito" — chamado
 * antes de qualquer cancelamento/arquivamento de tarefa. `onDelete: Restrict`
 * no banco já protege contra DELETE físico (que este app não faz hoje), mas
 * cancelar/arquivar é uma mudança de STATUS, não um DELETE — por isso a
 * checagem de aplicação aqui é a proteção real desse caminho.
 */
export async function assertTaskNotUsedAsPrerequisite(taskId: string, db: DbClient = prisma): Promise<void> {
  const count = await db.taskDependency.count({ where: { depends_on_task_id: taskId } });
  if (count > 0) {
    throw new DependencyInUseError(
      "Esta tarefa é pré-requisito de outra(s) tarefa(s) e não pode ser cancelada/arquivada sem remover essa dependência antes ou usar uma exceção administrativa auditada.",
    );
  }
}

export async function listTaskDependencies(taskId: string, db: DbClient = prisma) {
  return db.taskDependency.findMany({
    where: { task_id: taskId },
    include: { depends_on_task: { select: { id: true, title: true, status: true } } },
  });
}
