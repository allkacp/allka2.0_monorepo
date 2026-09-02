import { prisma } from "./prisma";
import type { DbClient } from "./project-scope";

/**
 * Executa `fn` de forma atômica. Se `db` já é o client transacional de UMA
 * transação aberta por quem chamou (ex.: a aprovação de tarefa, bloco 1), o
 * Prisma não permite abrir uma transação aninhada — e não precisa: `fn` já
 * roda dentro da atomicidade do chamador, então só repassamos `db` direto.
 * Só quando ninguém deu uma transação de fora (chamada avulsa — script,
 * teste, ou uma edição manual isolada) é que abrimos uma aqui, pra manter a
 * mesma garantia nesse caso também.
 */
export async function runAtomic<T>(db: DbClient, fn: (tx: DbClient) => Promise<T>): Promise<T> {
  if (db === prisma) return prisma.$transaction((tx) => fn(tx));
  return fn(db);
}
