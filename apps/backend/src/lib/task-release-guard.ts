import type { DbClient } from "./project-scope";
import { assertSafeToCancelOrArchive, PENDING_RELEASE_STATUS, DRAFT_STATUS } from "./task-release-service";

// ─── Guarda compartilhada contra "portas dos fundos" (bloco 4/4) ───────────
// Chamada de TODO endpoint capaz de mudar `ProjectTask.status` diretamente
// (auditoria do bloco 4 encontrou pelo menos um endpoint sem gate nenhum —
// `PATCH /api/project-products/tasks/:id` — e vários outros sem checagem de
// dependência). Nunca confia que só a rota "oficial" vai ser usada.

export class TaskStatusGuardError extends Error {
  httpStatus: number;
  code: string;
  constructor(message: string, httpStatus = 409, code = "task_release_gate") {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

const TERMINAL_REMOVAL_STATUSES = new Set(["CANCELADA"]);

/**
 * 1. Uma tarefa PENDENTE_DE_LIBERACAO/RASCUNHO_OPERACIONAL só pode sair
 *    desse estado pelos mecanismos dedicados (tryReleaseTask,
 *    applyAdminDependencyOverride, ou nova materialização) — nunca por um
 *    PATCH genérico de status, mesmo vindo de uma rota com escopo/permissão
 *    corretos.
 * 2. Cancelar/arquivar uma tarefa usada como pré-requisito de outra é
 *    bloqueado (nunca um "sumiço" silencioso de dependência).
 */
export async function assertTaskStatusTransitionAllowed(
  db: DbClient,
  task: { id: string; status: string },
  targetStatus: string | undefined,
): Promise<void> {
  if (!targetStatus || targetStatus === task.status) return;

  if (task.status === PENDING_RELEASE_STATUS || task.status === DRAFT_STATUS) {
    throw new TaskStatusGuardError(
      `Esta tarefa está em "${task.status}" e só pode sair desse estado pelo mecanismo oficial de liberação (nunca por edição direta de status).`,
    );
  }

  if (TERMINAL_REMOVAL_STATUSES.has(targetStatus)) {
    await assertSafeToCancelOrArchive(task.id, db);
  }
}
