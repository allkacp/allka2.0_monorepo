import { prisma } from "./prisma";

export type ProductType = "unico" | "pacote";

export interface ProductContractabilitySummary {
  productId: string;
  activeTaskTemplates: number;
  hasActiveTaskTemplates: boolean;
  isContractable: boolean;
  // "unico" = 1 CatalogTask ativa vinculada, "pacote" = 2+. Derivado, não é
  // um campo persistido — ver Fase 1 do plano de produtos (memória
  // project_products_unico_pacote / plano cheerful-pondering-mccarthy).
  productType: ProductType;
}

export async function getProductContractability(
  productId: string,
): Promise<ProductContractabilitySummary> {
  const activeTaskTemplates = await prisma.productCatalogTask.count({
    where: {
      product_id: productId,
      catalog_task: { is_active: true },
    },
  });

  const hasActiveTaskTemplates = activeTaskTemplates > 0;

  return {
    productId,
    activeTaskTemplates,
    hasActiveTaskTemplates,
    isContractable: hasActiveTaskTemplates,
    productType: activeTaskTemplates > 1 ? "pacote" : "unico",
  };
}

export async function assertProductContractable(productId: string) {
  const summary = await getProductContractability(productId);
  if (!summary.hasActiveTaskTemplates) {
    throw Object.assign(
      new Error(
        "Este produto não pode ser ativado porque ainda não possui tarefas operacionais vinculadas. Cadastre pelo menos uma tarefa antes de ativar o produto.",
      ),
      { code: "PRODUCT_WITHOUT_TASKS", summary },
    );
  }
  return summary;
}