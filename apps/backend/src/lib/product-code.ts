import type { Prisma, PrismaClient } from "@prisma/client";

// Código público sequencial exibido na UI (admin/produtos) e usado na URL,
// formato "prod_1", "prod_2", etc — mesmo padrão do "user_N" (ver
// user-code.ts) e "emp_N" (Company/Agency). Nunca usar no lugar de `id`
// (FK/lookup técnico) — é só para exibição/URL amigável.
const PREFIX = "prod_";

function formatProductCode(n: number): string {
  return `${PREFIX}${n}`;
}

/**
 * Calcula o próximo product_code disponível, buscando o maior código já
 * usado no padrão "prod_N" e somando 1. Aceita tanto o PrismaClient quanto
 * um `tx` de transaction. A unique constraint em product_code garante que
 * nunca duplica silenciosamente mesmo numa corrida rara.
 */
export async function generateNextProductCode(
  txOrPrisma: PrismaClient | Prisma.TransactionClient,
): Promise<string> {
  const products = await txOrPrisma.product.findMany({
    where: { product_code: { startsWith: PREFIX } },
    select: { product_code: true },
  });

  let max = 0;
  for (const p of products) {
    const match = p.product_code?.match(/^prod_(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }

  return formatProductCode(max + 1);
}
