import { Prisma } from "@prisma/client";
import type { DbClient } from "./project-scope";

/**
 * Recalcula Project.value/budget a partir dos ProjectProducts vinculados e
 * ainda válidos (status != CANCELADO), usando o preço final já negociado
 * (preco_final_cliente_snapshot — já reflete desconto/recorrência definidos
 * no momento do vínculo). Nunca reescreve os snapshots em si (histórico
 * comercial preservado mesmo depois de pagamento confirmado); só recalcula
 * o total agregado no Project.
 *
 * As colunas de dinheiro no schema continuam Float (fora do escopo desta
 * fase mudar o tipo de coluna em todo o sistema) — a soma intermediária usa
 * Prisma.Decimal só para evitar erro de ponto flutuante do JS na agregação,
 * convertendo para number apenas na gravação final.
 *
 * Chamar sempre depois de: vincular produto, remover produto, cancelar
 * ProjectProduct.
 */
export async function recalculateProjectValue(db: DbClient, projectId: string): Promise<number> {
  const products = await db.projectProduct.findMany({
    where: { project_id: projectId, status: { not: "CANCELADO" } },
    select: { preco_final_cliente_snapshot: true },
  });

  const total = products.reduce(
    (sum, p) => sum.plus(new Prisma.Decimal(p.preco_final_cliente_snapshot)),
    new Prisma.Decimal(0),
  );
  const value = total.toNumber();

  await db.project.update({
    where: { id: projectId },
    data: { value, budget: value },
  });

  return value;
}
