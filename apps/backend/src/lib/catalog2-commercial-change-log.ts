// Item 4.1 (reunião 2026-09-14, "Ajustar a proteção comercial") — registro e
// consulta de QUANDO uma alteração comercial realmente aconteceu (mudança em
// Catalog2PricingSettings, valor/hora de uma especialidade, ou publicação de
// uma nova versão substituindo a atual). A proteção de 30 dias de
// Catalog2Quote conta a partir dessa data real, nunca da data em que alguém
// abriu/revalidou a cotação depois — ver revalidateQuote em catalog2-client.ts.

import type { DbClient } from "./project-scope";

type Db = DbClient;

export type CommercialChangeScope = "global_settings" | "specialty_rate" | "product_version";

export async function logCommercialChangeEvent(
  db: Db,
  input: { scope: CommercialChangeScope; product_id?: string; specialty_id?: string; version_id?: string; actor_user_id?: string; note?: string },
) {
  await db.catalog2CommercialChangeEvent.create({
    data: {
      scope: input.scope,
      product_id: input.product_id ?? null,
      specialty_id: input.specialty_id ?? null,
      version_id: input.version_id ?? null,
      actor_user_id: input.actor_user_id ?? null,
      note: input.note ?? null,
    },
  });
}

/**
 * Encontra a data da alteração comercial MAIS ANTIGA, depois de `after`, que
 * pode ter afetado o preço de um produto/versão específicos (config global +
 * qualquer especialidade usada pelas tarefas da versão + republicação do
 * PRÓPRIO produto). Alterações sucessivas depois dessa primeira nunca
 * importam aqui — o chamador ancora só na primeira e nunca recalcula depois.
 */
export async function findEarliestCommercialChangeAfter(
  db: Db,
  params: { productId: string; specialtyIds: string[]; after: Date },
): Promise<Date | null> {
  const rows = await db.catalog2CommercialChangeEvent.findMany({
    where: {
      occurred_at: { gt: params.after },
      OR: [
        { scope: "global_settings" },
        { scope: "product_version", product_id: params.productId },
        ...(params.specialtyIds.length > 0 ? [{ scope: "specialty_rate" as const, specialty_id: { in: params.specialtyIds } }] : []),
      ],
    },
    orderBy: { occurred_at: "asc" },
    take: 1,
    select: { occurred_at: true },
  });
  return rows[0]?.occurred_at ?? null;
}
