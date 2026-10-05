// Produtos vinculados (2026-10-02): o que o cliente vê na contratação quando um produto depende de outro "comprado junto".
// Só regras ativas, "somente se comprados juntos" (não obrigam a compra do outro) e sempre pelo ID real do produto.
import type { Prisma, PrismaClient } from "@prisma/client";
import { DEPENDENCY_BEHAVIOR_LABEL, DEPENDENCY_TARGET_LABEL, type DependencyBehavior, type DependencyTargetKind } from "./project-dependencies";

type Db = PrismaClient | Prisma.TransactionClient;

export async function linkedProductsForClient(db: Db, productId: string, versionId: string) {
  const rules = await db.catalog2DependencyRule.findMany({
    where: { dependent_product_id: productId, package_id: null, is_active: true, condition_mode: "when_bought_together", target_product_id: { not: null } },
    include: { target_product: { select: { id: true, slug: true, internal_name: true, published_version_id: true, status: true } } },
    orderBy: { created_at: "asc" },
  });
  if (rules.length === 0) return [];
  const version = await db.catalog2ProductVersion.findUnique({ where: { id: versionId }, select: { tasks: { select: { key: true, name: true, steps: { select: { key: true, name: true } } } } } });
  const taskName = new Map((version?.tasks ?? []).map((t) => [t.key, t.name]));
  const stepName = new Map((version?.tasks ?? []).flatMap((t) => t.steps.map((s) => [`${t.key}:${s.key}`, s.name] as const)));
  const titles = await db.catalog2ProductVersion.findMany({ where: { id: { in: rules.map((r) => r.target_product?.published_version_id).filter((x): x is string => !!x) } }, select: { id: true, title: true } });
  const titleById = new Map(titles.map((t) => [t.id, t.title]));
  return rules.map((r) => {
    const tp = r.target_product!;
    const what = r.dependent_step_key && r.dependent_task_key ? `a etapa "${stepName.get(`${r.dependent_task_key}:${r.dependent_step_key}`) ?? r.dependent_step_key}"` : r.dependent_task_key ? `a tarefa "${taskName.get(r.dependent_task_key) ?? r.dependent_task_key}"` : "o produto";
    return {
      product_id: tp.id, slug: tp.slug, name: (tp.published_version_id ? titleById.get(tp.published_version_id) : null) || tp.internal_name,
      available: !!tp.published_version_id && tp.status === "disponivel",
      requires_purchase: false,
      relation: DEPENDENCY_TARGET_LABEL[r.target_kind as DependencyTargetKind] ?? r.target_kind,
      effect: DEPENDENCY_BEHAVIOR_LABEL[r.behavior as DependencyBehavior] ?? r.behavior,
      description: `Se você contratar junto com "${(tp.published_version_id ? titleById.get(tp.published_version_id) : null) || tp.internal_name}", ${what} aguarda ${r.target_kind === "product_deliverables" ? "o(s) entregável(is) aprovado(s) dele" : "o item vinculado"}. A preparação pode começar antes. Não é obrigatório contratar o outro produto.`,
      partial_start: r.allow_partial_start || !!r.dependent_step_key,
      provides_input: r.provides_input,
    };
  });
}
