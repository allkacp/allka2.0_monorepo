import type { Prisma, PrismaClient } from "@prisma/client";

// Ao excluir uma Company, seu sequence_number vai para o "pool" de números
// liberados (CompanyFreedSequence) em vez de nunca mais ser usado (o padrão
// do AUTO_INCREMENT do MySQL). Ao criar uma Company nova, reaproveitamos o
// menor número livre do pool antes de deixar o AUTO_INCREMENT gerar um novo —
// assim o ID de uma empresa excluída volta a ficar disponível.
export async function claimFreedSequenceNumber(
  txOrPrisma: PrismaClient | Prisma.TransactionClient,
): Promise<number | undefined> {
  const freed = await txOrPrisma.companyFreedSequence.findFirst({
    orderBy: { sequence_number: "asc" },
  });
  if (!freed) return undefined;
  await txOrPrisma.companyFreedSequence.delete({ where: { id: freed.id } });
  return freed.sequence_number;
}
