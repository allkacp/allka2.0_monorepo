// Cria N ProjectProduct numa única transação — extraído de
// routes/product-bundles.ts (POST /:id/contract) pra ser reaproveitado por
// qualquer fluxo que precise virar uma "lista pronta" de produtos em
// vínculos reais de uma vez (combo, IALLKA), em vez do padrão frágil de N
// requests sequenciais sem transação que o checkout manual ainda usa
// (project-create-new-panel.tsx).
import type { PrismaClient } from "@prisma/client";
import { assertProductContractable } from "./product-contractability";
import { parseProductMetadata } from "./product-metadata";
import { recalculateProjectValue } from "./project-value";

export interface BulkProductItem {
  product_id: string;
  variation_id?: string | null;
}

export interface CreateBulkProjectProductsOptions {
  project_id: string;
  items: BulkProductItem[];
  // Livre — quem chama define o valor ("COMBO", "AI_ASSEMBLY", etc.).
  origin: string;
  pagador_snapshot?: "AGENCIA" | "CLIENTE";
  recurrence_snapshot?: "avulso" | "mensal";
  // Snapshots específicos de cada origem — todos opcionais, cada chamador
  // só preenche os que fazem sentido pro seu `origin`.
  originBundlePurchaseId?: string;
  originBundleNameSnapshot?: string;
  originAiSessionId?: string;
}

/** Revalida cada item ANTES de abrir a transação e rejeita tudo (nenhuma
 * linha parcial) se qualquer um não puder ser contratado agora — mesma
 * regra que já vale pra comprar um produto avulso. */
export async function createBulkProjectProducts(
  prisma: PrismaClient,
  options: CreateBulkProjectProductsOptions,
) {
  const {
    project_id,
    items,
    origin,
    pagador_snapshot,
    recurrence_snapshot,
    originBundlePurchaseId,
    originBundleNameSnapshot,
    originAiSessionId,
  } = options;

  if (items.length === 0) {
    throw Object.assign(new Error("Nenhum produto para vincular"), { code: "EMPTY_ITEMS" });
  }

  const productIds = [...new Set(items.map((i) => i.product_id))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));

  const variationIds = items.map((i) => i.variation_id).filter((v): v is string => !!v);
  const variations = variationIds.length
    ? await prisma.productVariation.findMany({ where: { id: { in: variationIds } } })
    : [];
  const variationById = new Map(variations.map((v) => [v.id, v]));

  for (const item of items) {
    await assertProductContractable(item.product_id);
  }

  const created = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const item of items) {
      const product = productById.get(item.product_id);
      if (!product) {
        throw Object.assign(new Error(`Produto ${item.product_id} não encontrado`), { code: "PRODUCT_NOT_FOUND" });
      }
      const variation = item.variation_id ? variationById.get(item.variation_id) : undefined;
      const priceSnapshot = variation ? variation.price || product.base_price : product.base_price;
      // Cada componente congela SEU PRÓPRIO limite de alterações/taxa
      // emergencial no momento da vinculação — mesma lógica de
      // project-products.ts POST /, não um valor único pro grupo inteiro.
      const meta = parseProductMetadata(product.metadata);
      const pp = await tx.projectProduct.create({
        data: {
          project_id,
          product_id: item.product_id,
          variation_id: item.variation_id || null,
          product_name_snapshot: product.name,
          product_code_snapshot: product.id,
          product_category_snapshot: product.category,
          product_price_snapshot: priceSnapshot,
          preco_final_cliente_snapshot: priceSnapshot,
          comissao_snapshot: 0,
          pagador_snapshot: pagador_snapshot ?? "AGENCIA",
          recurrence_snapshot: recurrence_snapshot || null,
          alteracoes_incluidas_snapshot: meta.alteracoesIncluidas ?? 3,
          valor_alteracao_extra_snapshot: meta.valorAlteracaoExtra ?? 0,
          taxa_emergencial_reducao_percentual_snapshot:
            meta.taxaEmergencialReducaoPercentual ?? 50,
          origin,
          origin_bundle_purchase_id: originBundlePurchaseId ?? null,
          origin_bundle_name_snapshot: originBundleNameSnapshot ?? null,
          origin_ai_session_id: originAiSessionId ?? null,
          status: "PENDENTE",
        },
      });
      rows.push(pp);
    }
    return rows;
  });

  await recalculateProjectValue(prisma, project_id);

  return created;
}
