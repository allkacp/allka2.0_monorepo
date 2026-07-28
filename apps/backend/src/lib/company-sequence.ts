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

// O "emp_N" mostrado em admin/empresas é uma numeração ÚNICA compartilhada
// entre Company E Agency (a tela lista os dois tipos juntos, na mesma
// coluna ID) — mas até aqui só Company tinha @default(autoincrement()),
// e Agency.sequence_number nunca era preenchido na criação via usuário
// (ficava null, só setado manualmente em scripts). Isso deixava o "próximo
// número" de cada tipo colidir (Company #2 e Agency #2 podiam existir ao
// mesmo tempo). Esta função calcula o próximo número respeitando as DUAS
// tabelas: reaproveita o menor número liberado do pool compartilhado
// (CompanyFreedSequence) e, se não houver nenhum, usa o maior sequence_number
// já usado por QUALQUER Company ou Agency, +1 — nunca um valor já em uso
// por nenhum dos dois tipos.
export async function claimNextOrgSequenceNumber(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const freed = await claimFreedSequenceNumber(tx);
  if (freed !== undefined) return freed;

  const [maxCompany, maxAgency] = await Promise.all([
    tx.company.aggregate({ _max: { sequence_number: true } }),
    tx.agency.aggregate({ _max: { sequence_number: true } }),
  ]);
  const highest = Math.max(
    maxCompany._max.sequence_number ?? 0,
    maxAgency._max.sequence_number ?? 0,
  );
  return highest + 1;
}
