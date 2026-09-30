// Pacotes de produtos e dependências entre produtos/tarefas/etapas/entregáveis/aprovações
// (Pedido 2, 2026-09-29).
//
// A regra é definida no catálogo (Catalog2DependencyRule, dentro de um pacote ou como
// pré-requisito de produto) e MATERIALIZADA por contratação em ProjectDependencyRule
// (tarefa dependente → o que ela espera). Comportamentos:
//   block_start              bloqueia o início da tarefa (fica PENDENTE_DE_LIBERACAO);
//   block_final              deixa iniciar/executar, mas NÃO deixa concluir a etapa final;
//   require_before_delivery  executa, mas a entrega fica em AGUARDANDO_DEPENDENCIA_PRODUTO
//                            até o anexo/aprovação/item existir;
//   alert_only               só alerta o líder.
import type { Prisma, PrismaClient } from "@prisma/client";
import { logProjectDecision } from "./catalog2-cycles";
import { isAssetValid } from "./client-assets";

type Db = PrismaClient | Prisma.TransactionClient;

export const DEPENDENCY_TARGET_KINDS = ["product", "task", "step", "deliverable", "internal_approval", "client_approval", "info_asset"] as const;
export type DependencyTargetKind = (typeof DEPENDENCY_TARGET_KINDS)[number];
export const DEPENDENCY_TARGET_LABEL: Record<DependencyTargetKind, string> = {
  product: "Outro produto (concluído)",
  task: "Uma tarefa específica",
  step: "Uma etapa específica",
  deliverable: "Um entregável/anexo",
  internal_approval: "Aprovação interna (qualificação)",
  client_approval: "Aprovação do cliente",
  info_asset: "Informação/ativo validado (acesso)",
};
export const DEPENDENCY_BEHAVIORS = ["block_start", "block_final", "require_before_delivery", "alert_only"] as const;
export type DependencyBehavior = (typeof DEPENDENCY_BEHAVIORS)[number];
export const DEPENDENCY_BEHAVIOR_LABEL: Record<DependencyBehavior, string> = {
  block_start: "Bloquear o início até a conclusão",
  block_final: "Pode iniciar, mas bloqueia a execução final/publicação",
  require_before_delivery: "Pode executar, mas exige o item/aprovação antes da entrega",
  alert_only: "Somente alertar (não bloqueia)",
};

export class DependencyBlockedError extends Error {
  httpStatus = 409;
  statusCode = 409;
  code = "dependency_blocked";
}

const DONE = ["CONCLUIDA", "APROVADA", "DISPENSADA_POR_REGRA"];

export interface RuleState {
  ruleId: string;
  behavior: string;
  targetKind: string;
  satisfied: boolean;
  /** bloqueada | aguardando_item | liberada | concluida — para cliente, executor e líder. */
  state: "bloqueada" | "aguardando_item" | "liberada" | "concluida";
  reason: string;
  targetTaskId: string | null;
}

interface RuleRow {
  id: string; project_id: string; task_id: string; target_kind: string; target_task_id: string | null; target_stage_key: string | null;
  target_project_product_id: string | null; target_asset_type: string | null; target_missing: boolean; behavior: string; reason: string;
}

export async function evaluateRule(db: Db, rule: RuleRow): Promise<RuleState> {
  const base = { ruleId: rule.id, behavior: rule.behavior, targetKind: rule.target_kind, targetTaskId: rule.target_task_id };
  const blocked = rule.behavior === "block_start" || rule.behavior === "block_final";
  const waiting = (reason: string): RuleState => ({ ...base, satisfied: false, state: blocked ? "bloqueada" : "aguardando_item", reason });
  const ok = (reason: string): RuleState => ({ ...base, satisfied: true, state: rule.target_kind === "product" || rule.target_kind === "task" ? "concluida" : "liberada", reason });

  if (rule.target_missing) return waiting(`${rule.reason} — o produto/tarefa exigido ainda não foi contratado.`);

  switch (rule.target_kind) {
    case "task": {
      const t = rule.target_task_id ? await db.projectTask.findUnique({ where: { id: rule.target_task_id }, select: { status: true } }) : null;
      if (!t) return waiting(`${rule.reason} — tarefa ainda não existe.`);
      return DONE.includes(t.status) ? ok(rule.reason) : waiting(rule.reason);
    }
    case "product": {
      if (!rule.target_project_product_id) return waiting(rule.reason);
      const tasks = await db.projectTask.findMany({ where: { project_product_id: rule.target_project_product_id, occurrence_index: 0 }, select: { status: true } });
      const relevant = tasks.filter((t) => t.status !== "CANCELADA");
      return relevant.length > 0 && relevant.every((t) => DONE.includes(t.status)) ? ok(rule.reason) : waiting(rule.reason);
    }
    case "step": {
      const stage = rule.target_task_id && rule.target_stage_key
        ? await db.projectTaskStage.findFirst({ where: { project_task_id: rule.target_task_id, catalog_step_ref: rule.target_stage_key }, select: { status: true } })
        : null;
      return stage?.status === "CONCLUIDA" ? ok(rule.reason) : waiting(rule.reason);
    }
    case "deliverable": {
      const n = rule.target_task_id ? await db.taskAttachment.count({ where: { project_task_id: rule.target_task_id } }) : 0;
      return n > 0 ? ok(rule.reason) : waiting(rule.reason);
    }
    case "internal_approval": {
      const t = rule.target_task_id ? await db.projectTask.findUnique({ where: { id: rule.target_task_id }, select: { qualified_at: true, aprovado_agencia_em: true, status: true } }) : null;
      return t && (t.qualified_at || t.aprovado_agencia_em || DONE.includes(t.status)) ? ok(rule.reason) : waiting(rule.reason);
    }
    case "client_approval": {
      const t = rule.target_task_id ? await db.projectTask.findUnique({ where: { id: rule.target_task_id }, select: { aprovado_cliente_em: true, status: true } }) : null;
      return t && (t.aprovado_cliente_em || DONE.includes(t.status)) ? ok(rule.reason) : waiting(rule.reason);
    }
    case "info_asset": {
      const project = await db.project.findUnique({ where: { id: rule.project_id }, select: { company_id: true, client_id: true } });
      const companyId = project?.company_id ?? project?.client_id ?? null;
      const assets = companyId && rule.target_asset_type ? await db.clientAsset.findMany({ where: { company_id: companyId, asset_type: rule.target_asset_type } }) : [];
      return assets.some((a) => isAssetValid(a, "none_while_valid")) ? ok(rule.reason) : waiting(rule.reason);
    }
    default:
      return waiting(rule.reason);
  }
}

export async function ruleStatesForTask(db: Db, taskId: string): Promise<RuleState[]> {
  const rules = await db.projectDependencyRule.findMany({ where: { task_id: taskId }, orderBy: { created_at: "asc" } });
  return Promise.all(rules.map((r) => evaluateRule(db, r)));
}

/** Regras ainda NÃO cumpridas de certos comportamentos (para os gates do motor). */
export async function unmetRules(db: Db, taskId: string, behaviors: DependencyBehavior[]): Promise<RuleState[]> {
  const states = await ruleStatesForTask(db, taskId);
  return states.filter((s) => !s.satisfied && (behaviors as string[]).includes(s.behavior));
}

// ── Materialização: pacote/regras do catálogo → regras da contratação ─────────────────────────

async function resolveTargetInProject(
  db: Db,
  rule: { target_kind: string; target_product_id: string | null; target_task_key: string | null; target_step_key: string | null },
  scope: { projectId: string; companyProjectFilter: Prisma.ProjectWhereInput },
) {
  if (!rule.target_product_id) return { missing: rule.target_kind !== "info_asset", ppId: null as string | null, taskId: null as string | null, stepId: null as string | null };
  const pp = await db.projectProduct.findFirst({
    where: { catalog2_product_id: rule.target_product_id, project: scope.companyProjectFilter },
    orderBy: [{ created_at: "desc" }],
    select: { id: true, catalog2_version_id: true },
  });
  if (!pp) return { missing: true, ppId: null, taskId: null, stepId: null };
  let taskId: string | null = null;
  let stepId: string | null = null;
  if (rule.target_task_key) {
    const t = await db.projectTask.findFirst({
      where: { project_product_id: pp.id, occurrence_index: 0, catalog2_task: { key: rule.target_task_key } },
      select: { id: true, catalog2_task_id: true },
    });
    taskId = t?.id ?? null;
    if (t?.catalog2_task_id && rule.target_step_key) {
      stepId = (await db.catalog2TaskStep.findFirst({ where: { task_id: t.catalog2_task_id, key: rule.target_step_key }, select: { id: true } }))?.id ?? null;
    }
  }
  return { missing: (rule.target_task_key != null && !taskId), ppId: pp.id, taskId, stepId };
}

/**
 * Chamado depois de gerar tarefas de um pagamento/ciclo: (1) detecta pacotes contratados
 * juntos e cria a instância; (2) cria, para cada tarefa dependente, as regras materializadas;
 * (3) segura (PENDENTE_DE_LIBERACAO) as tarefas com "bloquear o início" ainda não cumprido.
 */
export async function materializeDependencyRules(db: Db, projectId: string, projectProductIds: string[]): Promise<{ rulesCreated: number; packagesLinked: number }> {
  const result = { rulesCreated: 0, packagesLinked: 0 };
  const project = await db.project.findUnique({ where: { id: projectId }, select: { company_id: true, client_id: true } });
  if (!project) return result;
  const conds: Prisma.ProjectWhereInput[] = [];
  if (project.company_id) conds.push({ company_id: project.company_id });
  if (project.client_id) conds.push({ client_id: project.client_id });
  const companyProjectFilter: Prisma.ProjectWhereInput = conds.length ? { OR: conds } : { id: projectId };

  const pps = await db.projectProduct.findMany({
    where: { id: { in: projectProductIds }, project_id: projectId, catalog2_product_id: { not: null } },
    select: { id: true, catalog2_product_id: true, package_instance_id: true },
  });
  if (pps.length === 0) return result;

  // (1) pacotes contratados juntos (todos os produtos do pacote neste mesmo pagamento)
  const contractedProductIds = new Set(pps.map((p) => p.catalog2_product_id!));
  const packages = await db.catalog2Package.findMany({ where: { is_active: true }, include: { items: true, rules: { where: { is_active: true } } } });
  const packageInstances = new Map<string, string>(); // packageId -> instanceId
  for (const pkg of packages) {
    if (pkg.items.length < 2 || !pkg.items.every((i) => contractedProductIds.has(i.catalog2_product_id))) continue;
    const already = pps.find((p) => p.package_instance_id && pkg.items.some((i) => i.catalog2_product_id === p.catalog2_product_id));
    let instanceId = already?.package_instance_id ?? null;
    if (!instanceId) {
      const inst = await db.projectPackage.create({ data: { project_id: projectId, package_id: pkg.id, name_snapshot: pkg.name } });
      instanceId = inst.id;
      await db.projectProduct.updateMany({ where: { id: { in: pps.filter((p) => pkg.items.some((i) => i.catalog2_product_id === p.catalog2_product_id)).map((p) => p.id) } }, data: { package_instance_id: instanceId } });
      await logProjectDecision(db, { projectId, kind: "package_linked", message: `Pacote "${pkg.name}" contratado: ${pkg.items.length} produtos ligados por regras de dependência.` });
      result.packagesLinked++;
    }
    packageInstances.set(pkg.id, instanceId);
  }

  // (2) regras: as dos pacotes detectados + as de pré-requisito de produto (sem pacote)
  const productRules = await db.catalog2DependencyRule.findMany({ where: { package_id: null, is_active: true, dependent_product_id: { in: [...contractedProductIds] } } });
  const applicable = [...packages.filter((p) => packageInstances.has(p.id)).flatMap((p) => p.rules.map((r) => ({ rule: r, instanceId: packageInstances.get(p.id)! }))), ...productRules.map((r) => ({ rule: r, instanceId: null as string | null }))];

  for (const { rule, instanceId } of applicable) {
    const dependentTasks = await db.projectTask.findMany({
      where: {
        project_id: projectId, project_product_id: { in: pps.filter((p) => p.catalog2_product_id === rule.dependent_product_id).map((p) => p.id) },
        ...(rule.dependent_task_key ? { catalog2_task: { key: rule.dependent_task_key } } : {}),
      },
      select: { id: true, title: true, status: true },
    });
    if (dependentTasks.length === 0) continue;
    const target = await resolveTargetInProject(db, rule, { projectId, companyProjectFilter });
    const targetProduct = rule.target_product_id ? await db.catalog2Product.findUnique({ where: { id: rule.target_product_id }, select: { internal_name: true } }) : null;
    const what = `${DEPENDENCY_TARGET_LABEL[rule.target_kind as DependencyTargetKind] ?? rule.target_kind}${targetProduct ? ` — ${targetProduct.internal_name}` : ""}${rule.target_task_key ? ` (tarefa ${rule.target_task_key})` : ""}${rule.target_asset_type ? ` (${rule.target_asset_type})` : ""}`;
    for (const t of dependentTasks) {
      const exists = await db.projectDependencyRule.findFirst({ where: { task_id: t.id, source_rule_id: rule.id }, select: { id: true } });
      if (exists) continue;
      await db.projectDependencyRule.create({
        data: {
          project_id: projectId, project_package_id: instanceId, task_id: t.id, source_rule_id: rule.id, target_kind: rule.target_kind,
          target_task_id: target.taskId, target_stage_key: target.stepId, target_project_product_id: target.ppId, target_product_id: rule.target_product_id,
          target_asset_type: rule.target_asset_type, target_missing: target.missing,
          behavior: rule.behavior, reason: rule.note?.trim() || `Depende de: ${what}`,
        },
      });
      result.rulesCreated++;
      if (rule.behavior === "block_start" && t.status === "PARA_LANCAMENTO") {
        await db.projectTask.update({ where: { id: t.id }, data: { status: "PENDENTE_DE_LIBERACAO" } });
        await logProjectDecision(db, { projectId, projectTaskId: t.id, kind: "dependency_blocked", message: `"${t.title}" aguarda: ${what}.` });
      }
    }
  }
  return result;
}

/** Pré-requisito de produto cujo alvo ainda não existia (produto exigido não contratado): procura de novo. */
async function resolveMissingTargets(db: Db, projectId: string): Promise<void> {
  const missing = await db.projectDependencyRule.findMany({ where: { project_id: projectId, target_missing: true, source_rule_id: { not: null } } });
  if (missing.length === 0) return;
  const project = await db.project.findUnique({ where: { id: projectId }, select: { company_id: true, client_id: true } });
  const conds: Prisma.ProjectWhereInput[] = [];
  if (project?.company_id) conds.push({ company_id: project.company_id });
  if (project?.client_id) conds.push({ client_id: project.client_id });
  const companyProjectFilter: Prisma.ProjectWhereInput = conds.length ? { OR: conds } : { id: projectId };
  for (const r of missing) {
    const src = await db.catalog2DependencyRule.findUnique({ where: { id: r.source_rule_id! } });
    if (!src) continue;
    const target = await resolveTargetInProject(db, src, { projectId, companyProjectFilter });
    if (target.missing) continue;
    await db.projectDependencyRule.update({
      where: { id: r.id },
      data: { target_missing: false, target_project_product_id: target.ppId, target_task_id: target.taskId, target_stage_key: target.stepId },
    });
  }
}

/** Depois de um evento (aprovação, etapa concluída, anexo, ativo validado): reavalia sem bloquear a resposta. */
export function kickDependencies(projectId: string | null | undefined): void {
  if (!projectId) return;
  void (async () => {
    const { prisma } = await import("./prisma");
    await reevaluateProjectDependencies(prisma, projectId);
  })().catch((err) => console.error("[dependencies] kick:", err));
}
export function kickDependenciesForTask(taskId: string): void {
  void (async () => {
    const { prisma } = await import("./prisma");
    const t = await prisma.projectTask.findUnique({ where: { id: taskId }, select: { project_id: true } });
    if (t) await reevaluateProjectDependencies(prisma, t.project_id);
  })().catch((err) => console.error("[dependencies] kick:", err));
}

/**
 * Reavalia as dependências de um projeto: libera tarefas cujo "bloquear início" foi
 * cumprido e avança entregas que estavam seguradas por "exigir antes da entrega".
 * Devolve quantas tarefas andaram. Nunca lança (é chamado depois de eventos).
 */
export async function reevaluateProjectDependencies(db: Db, projectId: string): Promise<number> {
  let moved = 0;
  try {
    await resolveMissingTargets(db, projectId);
    const { tryReleaseTask } = await import("./task-release-service");
    const waiting = await db.projectTask.findMany({ where: { project_id: projectId, status: "PENDENTE_DE_LIBERACAO" }, select: { id: true, title: true } });
    for (const t of waiting) {
      if (await tryReleaseTask(t.id, db as PrismaClient)) {
        moved++;
        await logProjectDecision(db, { projectId, projectTaskId: t.id, kind: "dependency_released", message: `"${t.title}" foi liberada: as dependências foram cumpridas.` });
      }
    }
    const held = await db.projectTask.findMany({ where: { project_id: projectId, status: "AGUARDANDO_DEPENDENCIA_PRODUTO" }, select: { id: true, title: true } });
    for (const t of held) {
      if ((await unmetRules(db, t.id, ["block_final", "require_before_delivery"])).length === 0) {
        const { enviarParaAceite } = await import("./stage-engine");
        await enviarParaAceite(db, t.id, {});
        await logProjectDecision(db, { projectId, projectTaskId: t.id, kind: "dependency_released", message: `A entrega de "${t.title}" seguiu: o item/aprovação exigido já existe.` });
        moved++;
      }
    }
  } catch (err) {
    console.error("[dependencies] reavaliar:", err);
  }
  return moved;
}
