import { prisma } from "./prisma";

export interface ProductContractabilitySummary {
  productId: string;
  activeTaskTemplates: number;
  hasActiveTaskTemplates: boolean;
  isContractable: boolean;
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