import type { DbClient } from "./project-scope";

/**
 * Próximo valor de uma sequência nomeada (tabela EntitySequence), atômico
 * sob concorrência no MySQL.
 *
 * Usa o idioma padrão do MySQL para contadores customizados:
 *   UPDATE entity_sequences
 *      SET current_value = LAST_INSERT_ID(current_value + 1)
 *    WHERE `key` = ?
 *   SELECT LAST_INSERT_ID()
 * O UPDATE toma um lock de linha durante a transação chamadora; duas
 * chamadas concorrentes com a mesma key serializam nesse UPDATE (a segunda
 * espera a primeira liberar o lock), e LAST_INSERT_ID() é escopado à
 * conexão/sessão — por isso o valor lido depois é sempre o que a própria
 * chamada acabou de gravar, nunca o de outra transação concorrente.
 *
 * Deve sempre ser chamada com o Prisma Transaction Client (tx), nunca com o
 * PrismaClient global, para que UPDATE e SELECT LAST_INSERT_ID() rodem na
 * mesma conexão/transação.
 */
export async function getNextSequenceValue(db: DbClient, key: string): Promise<number> {
  const affected = await db.$executeRaw`
    UPDATE entity_sequences
       SET current_value = LAST_INSERT_ID(current_value + 1)
     WHERE \`key\` = ${key}
  `;

  if (affected === 0) {
    // Primeira vez que esta key é usada — cria a linha via Prisma normal
    // (gera o cuid) começando em 1. Se outra transação criar a mesma key
    // entre o UPDATE acima e este create (corrida rara, só no primeiro uso),
    // o unique constraint em `key` rejeita uma das duas; a que falhar tenta
    // de novo pelo caminho normal (UPDATE, que agora vai encontrar a linha).
    try {
      await db.entitySequence.create({ data: { key, current_value: 1 } });
      return 1;
    } catch {
      const retry = await db.$executeRaw`
        UPDATE entity_sequences
           SET current_value = LAST_INSERT_ID(current_value + 1)
         WHERE \`key\` = ${key}
      `;
      if (retry === 0) {
        throw new Error(`Não foi possível obter a próxima sequência para "${key}"`);
      }
    }
  }

  const rows = await db.$queryRaw<{ value: bigint | number }[]>`SELECT LAST_INSERT_ID() AS value`;
  return Number(rows[0]?.value ?? 0);
}

export function formatProjectCode(seq: number): string {
  return "proj_" + String(seq).padStart(5, "0");
}

export function formatTaskCode(seq: number): string {
  return "T" + String(seq).padStart(6, "0");
}
