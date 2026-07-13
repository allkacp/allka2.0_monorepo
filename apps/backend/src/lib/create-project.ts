import type { Prisma, PrismaClient, Project } from "@prisma/client";
import type { DbClient } from "./project-scope";
import { getNextSequenceValue, formatProjectCode } from "./sequence";

/**
 * Único mecanismo de geração de project_code usado por todo código desta
 * fase (rotas, seed, admin-seed) — helper explícito e compartilhado, não
 * middleware Prisma.
 *
 * Um middleware $use() foi tentado antes e removido: ele abria sua PRÓPRIA
 * transação (`client.$transaction(...)`) pra buscar o próximo project_code,
 * separada de qualquer transação em que o chamador já estivesse — se o
 * INSERT do projeto falhasse depois por outro motivo (nome duplicado,
 * validação etc.), o número da sequência já tinha sido consumido e
 * commitado, criando um buraco permanente. Também não tinha teste
 * persistido. Essas duas falhas (transação fora da transação chamadora, sem
 * teste) violam os critérios pros quais o middleware poderia ter
 * permanecido — por isso foi trocado por isto.
 *
 * `withProjectCode` garante que a geração do código e o `create()` do
 * chamador (com qualquer `data`/`include` que ele precisar) rodam sempre na
 * MESMA transação/conexão:
 *   - Se `db` já for um Prisma Transaction Client (chamador já está dentro
 *     de um `prisma.$transaction(async (tx) => ...)`), a geração do código
 *     participa DESSA transação — rollback do chamador desfaz o incremento
 *     da sequência junto.
 *   - Se `db` for o PrismaClient de topo, abre a ÚNICA transação necessária
 *     (sequência + o que o callback fizer, atômicos entre si).
 */
export async function withProjectCode<T>(
  db: DbClient,
  fn: (tx: DbClient, projectCode: string) => Promise<T>,
): Promise<T> {
  const run = async (tx: DbClient): Promise<T> => {
    const seq = await getNextSequenceValue(tx, "project");
    return fn(tx, formatProjectCode(seq));
  };
  const isTopLevelClient = typeof (db as { $transaction?: unknown }).$transaction === "function";
  if (isTopLevelClient) {
    return (db as PrismaClient).$transaction((tx) => run(tx));
  }
  return run(db);
}

/** Atalho pro caso comum: criar um Project sem precisar de `include`/extras. */
export async function createProjectWithSequentialCode(
  db: DbClient,
  data: Omit<Prisma.ProjectUncheckedCreateInput, "project_code">,
): Promise<Project> {
  return withProjectCode(db, (tx, projectCode) =>
    tx.project.create({ data: { ...data, project_code: projectCode } }),
  );
}
