import type { Prisma, PrismaClient } from "@prisma/client";

// Código público sequencial exibido na UI (tela Admin > Usuários), formato
// "User_00001", "User_00002", etc. Nunca usar no lugar de `id` (FK/lookup
// técnico) — é só para exibição.
const PREFIX = "User_";
const PAD_LENGTH = 5;

function formatUserCode(n: number): string {
  return `${PREFIX}${String(n).padStart(PAD_LENGTH, "0")}`;
}

/**
 * Calcula o próximo user_code disponível, buscando o maior código já usado
 * no padrão "User_00001" e somando 1. Aceita tanto o PrismaClient quanto um
 * `tx` de transaction, pra poder rodar de forma segura dentro de uma
 * transaction (evita duas criações simultâneas colidirem no mesmo código —
 * ainda assim, como não há lock explícito, uma corrida rara é possível; a
 * unique constraint em user_code garante que nunca duplica silenciosamente).
 */
export async function generateNextUserCode(
  txOrPrisma: PrismaClient | Prisma.TransactionClient,
): Promise<string> {
  const users = await txOrPrisma.user.findMany({
    where: { user_code: { startsWith: PREFIX } },
    select: { user_code: true },
  });

  let max = 0;
  for (const u of users) {
    const match = u.user_code?.match(/^User_(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }

  return formatUserCode(max + 1);
}
