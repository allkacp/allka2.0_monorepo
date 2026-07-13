import type { DbClient } from "./project-scope";
import { getNextSequenceValue, formatTaskCode } from "./sequence";

/**
 * Próximo código de tarefa no formato T000001, T000002, ...
 *
 * Antes: SELECT MAX(task_code) + 1 sem lock, sem transação — risco real de
 * colisão sob concorrência no MySQL (só detectada, não evitada, pela
 * constraint @unique em task_code). Agora usa a sequência atômica
 * (EntitySequence, key="project_task") — ver src/lib/sequence.ts.
 *
 * Deve ser chamada com o Prisma Transaction Client (tx) de dentro da mesma
 * transação que cria a ProjectTask.
 */
export async function getNextTaskCode(db: DbClient): Promise<string> {
  const seq = await getNextSequenceValue(db, "project_task");
  return formatTaskCode(seq);
}
