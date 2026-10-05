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

export const DEPENDENCY_TARGET_KINDS = ["product", "task", "step", "deliverable", "internal_approval", "client_approval", "info_asset", "product_deliverables"] as const;
export type DependencyTargetKind = (typeof DEPENDENCY_TARGET_KINDS)[number];
export const DEPENDENCY_TARGET_LABEL: Record<DependencyTargetKind, string> = {
  product: "Outro produto (concluído)",
  task: "Uma tarefa específica",
  step: "Uma etapa específica",
  deliverable: "Um entregável/anexo",
  internal_approval: "Aprovação interna (qualificação)",
  client_approval: "Aprovação do cliente",
  info_asset: "Informação/ativo validado (acesso)",
  product_deliverables: "Entregáveis aprovados de outro produto (resolvido pelo ID real)",
};
export const DEPENDENCY_BEHAVIORS = ["block_start", "block_final", "require_before_delivery", "alert_only", "block_stage"] as const;
export type DependencyBehavior = (typeof DEPENDENCY_BEHAVIORS)[number];
export const DEPENDENCY_BEHAVIOR_LABEL: Record<DependencyBehavior, string> = {
  block_start: "Bloquear o início até a conclusão",
  block_final: "Pode iniciar, mas bloqueia a execução final/publicação",
  require_before_delivery: "Pode executar, mas exige o item/aprovação antes da entrega",
  alert_only: "Somente alertar (não bloqueia)",
  block_stage: "Bloquear só a etapa indicada (o resto da tarefa continua)",
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
  /** Liberação manual por líder/administrador (com justificativa e histórico). */
  releasedManually: boolean;
}

interface RuleRow {
  id: string; project_id: string; task_id: string; target_kind: string; target_task_id: string | null; target_stage_key: string | null;
  target_project_product_id: string | null; target_asset_type: string | null; target_missing: boolean; behavior: string; reason: string;
  target_deliverable_key?: string | null;
  target_connection_req_id?: string | null;
  released_manually_at?: Date | null; release_reason?: string | null;
}

export async function evaluateRule(db: Db, rule: RuleRow): Promise<RuleState> {
  const base = { ruleId: rule.id, behavior: rule.behavior, targetKind: rule.target_kind, targetTaskId: rule.target_task_id, releasedManually: !!rule.released_manually_at };
  // Liberada à mão por líder/administrador: deixa de bloquear, mas continua visível (com o motivo) e registrada no histórico.
  if (rule.released_manually_at) return { ...base, satisfied: true, state: "liberada", reason: `${rule.reason} — liberada manualmente${rule.release_reason ? `: ${rule.release_reason}` : ""}.` };
  const blocked = rule.behavior === "block_start" || rule.behavior === "block_final" || rule.behavior === "block_stage";
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
      // Entregável ESTRUTURADO específico: só libera quando estiver aprovado (ou enviado, se não exige aprovação).
      if (rule.target_deliverable_key && rule.target_task_id) {
        const d = await db.projectTaskDeliverable.findUnique({
          where: { project_task_id_key: { project_task_id: rule.target_task_id, key: rule.target_deliverable_key } },
          select: { status: true },
        });
        if (!d) return waiting(`${rule.reason} — o entregável ainda não existe nesta contratação.`);
        return d.status === "aprovado" ? ok(rule.reason) : waiting(rule.reason);
      }
      const n = rule.target_task_id ? await db.taskAttachment.count({ where: { project_task_id: rule.target_task_id } }) : 0;
      return n > 0 ? ok(rule.reason) : waiting(rule.reason);
    }
    case "product_deliverables": {
      // Entregáveis aprovados do OUTRO produto (mesmo projeto): precisam existir e estar aprovados; sem entregáveis estruturados, vale a tarefa concluída.
      if (!rule.target_project_product_id) return waiting(rule.reason);
      const tasks = await db.projectTask.findMany({ where: { project_product_id: rule.target_project_product_id, occurrence_index: 0, status: { not: "CANCELADA" } }, select: { id: true, status: true } });
      if (tasks.length === 0) return waiting(`${rule.reason} — o produto vinculado ainda não gerou tarefas.`);
      const dels = await db.projectTaskDeliverable.findMany({ where: { project_task_id: { in: tasks.map((t) => t.id) }, is_required: true }, select: { status: true } });
      if (dels.length > 0) return dels.every((d) => d.status === "aprovado") ? ok(rule.reason) : waiting(`${rule.reason} — entregável do produto vinculado ainda não aprovado.`);
      return tasks.every((t) => DONE.includes(t.status)) ? ok(rule.reason) : waiting(`${rule.reason} — o produto vinculado ainda não foi entregue.`);
    }
    case "internal_approval": {
      const t = rule.target_task_id ? await db.projectTask.findUnique({ where: { id: rule.target_task_id }, select: { qualified_at: true, aprovado_agencia_em: true, status: true } }) : null;
      return t && (t.qualified_at || t.aprovado_agencia_em || DONE.includes(t.status)) ? ok(rule.reason) : waiting(rule.reason);
    }
    case "client_approval": {
      const t = rule.target_task_id ? await db.projectTask.findUnique({ where: { id: rule.target_task_id }, select: { aprovado_cliente_em: true, status: true } }) : null;
      return t && (t.aprovado_cliente_em || DONE.includes(t.status)) ? ok(rule.reason) : waiting(rule.reason);
    }
    case "connection": {
      const { evaluateConnectionRule } = await import("./connections/flow");
      const r = await evaluateConnectionRule(db, rule);
      return r.satisfied ? ok(r.reason) : waiting(r.reason);
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
export async function unmetRules(db: Db, taskId: string, behaviors: (DependencyBehavior | "block_stage")[]): Promise<RuleState[]> {
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

/** A regra vale para esta tarefa? `applies_to`: all | implementacao | recorrencia | revalidacao (cycle_kind da tarefa). */
export function ruleAppliesToCycle(appliesTo: string | null | undefined, cycleKind: string | null | undefined): boolean {
  switch (appliesTo ?? "all") {
    case "implementacao": return cycleKind === "implementacao";
    case "revalidacao": return cycleKind === "revalidacao";
    case "recorrencia": return cycleKind !== "implementacao" && cycleKind !== "revalidacao"; // recorrência mensal, avulso ou tarefa sem ciclo
    default: return true;
  }
}

/** Regra "deste produto para ele mesmo": o alvo é a tarefa IRMÃ da MESMA contratação e do MESMO ciclo. */
async function resolveSameProductTarget(
  db: Db,
  rule: { target_task_key: string | null; target_step_key: string | null },
  t: { project_product_id: string | null; occurrence_index: number },
) {
  if (!rule.target_task_key) return { missing: false, ppId: t.project_product_id, taskId: null as string | null, stepId: null as string | null };
  if (!t.project_product_id) return { missing: true, ppId: null as string | null, taskId: null as string | null, stepId: null as string | null };
  const tt = await db.projectTask.findFirst({
    where: { project_product_id: t.project_product_id, occurrence_index: t.occurrence_index, catalog2_task: { key: rule.target_task_key } },
    select: { id: true, catalog2_task_id: true },
  });
  let stepId: string | null = null;
  if (tt?.catalog2_task_id && rule.target_step_key) {
    stepId = (await db.catalog2TaskStep.findFirst({ where: { task_id: tt.catalog2_task_id, key: rule.target_step_key }, select: { id: true } }))?.id ?? null;
  }
  return { missing: !tt, ppId: t.project_product_id, taskId: tt?.id ?? null, stepId };
}

/**
 * Chamado depois de gerar tarefas de um pagamento/ciclo: (1) detecta pacotes contratados
 * juntos e cria a instância; (2) cria, para cada tarefa dependente, as regras materializadas;
 * (3) segura (PENDENTE_DE_LIBERACAO) as tarefas com "bloquear o início" ainda não cumprido.
 */
export async function materializeDependencyRules(db: Db, projectId: string, projectProductIds: string[]): Promise<{ rulesCreated: number; packagesLinked: number }> {
  const r = await materializeDependencyRulesCore(db, projectId, projectProductIds);
  // Conexões e acessos necessários (módulo universal): só age em versões com o módulo ativado.
  const { materializeConnectionRules } = await import("./connections/flow");
  const c = await materializeConnectionRules(db, projectId, projectProductIds);
  // Estrutura universal v2: portões de aprovação, relógios de SLA e entradas vindas de outros produtos (só agem se o produto os configurou).
  const { materializeApprovalGates } = await import("./approval-gates");
  await materializeApprovalGates(db, projectId, projectProductIds);
  const sla = await import("./sla");
  await sla.materializeSlaClocks(db, projectId, projectProductIds);
  await sla.syncSlaClocks(db, projectId);
  return { ...r, rulesCreated: r.rulesCreated + c.rulesCreated };
}

async function materializeDependencyRulesCore(db: Db, projectId: string, projectProductIds: string[]): Promise<{ rulesCreated: number; packagesLinked: number }> {
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
  // Todos os produtos do projeto (para regras "somente se comprados juntos", inclusive quando o outro produto é contratado depois).
  const allPps = await db.projectProduct.findMany({ where: { project_id: projectId, catalog2_product_id: { not: null } }, select: { id: true, catalog2_product_id: true, package_instance_id: true } });
  const projectCatalogIds = new Set(allPps.map((p) => p.catalog2_product_id!));

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
  const productRules = await db.catalog2DependencyRule.findMany({
    where: {
      package_id: null, is_active: true,
      OR: [
        { dependent_product_id: { in: [...contractedProductIds] } },
        // vínculo "somente se comprados juntos": o dependente já estava no projeto e o produto-alvo acabou de ser contratado
        { condition_mode: "when_bought_together", dependent_product_id: { in: [...projectCatalogIds] }, target_product_id: { in: [...contractedProductIds] } },
      ],
    },
  });
  const applicable = [...packages.filter((p) => packageInstances.has(p.id)).flatMap((p) => p.rules.map((r) => ({ rule: r, instanceId: packageInstances.get(p.id)! }))), ...productRules.map((r) => ({ rule: r, instanceId: null as string | null }))];

  for (const { rule, instanceId } of applicable) {
    const togetherOnly = (rule as { condition_mode?: string }).condition_mode === "when_bought_together";
    // "Somente se comprados juntos": sem o outro produto no pedido/projeto, a regra nem existe (não obriga a compra do outro).
    if (togetherOnly && rule.target_product_id && rule.target_product_id !== rule.dependent_product_id && !projectCatalogIds.has(rule.target_product_id)) continue;
    const scopePps = togetherOnly ? allPps : pps;
    const dependentTasksAll = await db.projectTask.findMany({
      where: {
        project_id: projectId, project_product_id: { in: scopePps.filter((p) => p.catalog2_product_id === rule.dependent_product_id).map((p) => p.id) },
        ...(rule.dependent_task_key ? { catalog2_task: { key: rule.dependent_task_key } } : {}),
      },
      select: { id: true, title: true, status: true, cycle_kind: true, project_product_id: true, occurrence_index: true, catalog2_task_id: true },
    });
    // Só as tarefas dos ciclos em que a regra vale (implantação, recorrência, revalidação ou todos).
    const dependentTasks = dependentTasksAll.filter((t) => ruleAppliesToCycle((rule as { applies_to?: string }).applies_to, t.cycle_kind));
    if (dependentTasks.length === 0) continue;
    const sameProduct = !!rule.target_product_id && rule.target_product_id === rule.dependent_product_id;
    const target = sameProduct ? { missing: false, ppId: null as string | null, taskId: null as string | null, stepId: null as string | null } : await resolveTargetInProject(db, rule, { projectId, companyProjectFilter });
    const targetProduct = rule.target_product_id ? await db.catalog2Product.findUnique({ where: { id: rule.target_product_id }, select: { internal_name: true } }) : null;
    const what = `${DEPENDENCY_TARGET_LABEL[rule.target_kind as DependencyTargetKind] ?? rule.target_kind}${targetProduct ? ` — ${targetProduct.internal_name}` : ""}${rule.target_task_key ? ` (tarefa ${rule.target_task_key})` : ""}${rule.target_asset_type ? ` (${rule.target_asset_type})` : ""}`;
    for (const t of dependentTasks) {
      const exists = await db.projectDependencyRule.findFirst({ where: { task_id: t.id, source_rule_id: rule.id }, select: { id: true } });
      if (exists) continue;
      const tgt = sameProduct ? await resolveSameProductTarget(db, rule, t) : target;
      // Etapa específica aguardando o outro produto (o resto da tarefa continua) / começo parcial (executa, mas não entrega).
      const stepKey = (rule as { dependent_step_key?: string | null }).dependent_step_key ?? null;
      const stepRow = stepKey && t.catalog2_task_id ? await db.catalog2TaskStep.findFirst({ where: { task_id: t.catalog2_task_id, key: stepKey }, select: { id: true } }) : null;
      let effBehavior = rule.behavior;
      if (stepKey && stepRow && effBehavior !== "alert_only") effBehavior = "block_stage";
      else if ((rule as { allow_partial_start?: boolean }).allow_partial_start && effBehavior === "block_start") effBehavior = "block_final";
      const stageGate = effBehavior === "block_stage" ? ((rule as { stage_gate?: string | null }).stage_gate ?? "start") : null;
      if (sameProduct && tgt.taskId === t.id) continue; // uma tarefa nunca espera por ela mesma
      await db.projectDependencyRule.create({
        data: {
          project_id: projectId, project_package_id: instanceId, task_id: t.id, source_rule_id: rule.id, target_kind: rule.target_kind,
          target_task_id: tgt.taskId, target_stage_key: tgt.stepId, target_project_product_id: tgt.ppId, target_product_id: rule.target_product_id,
          target_asset_type: rule.target_asset_type, target_deliverable_key: (rule as { target_deliverable_key?: string | null }).target_deliverable_key ?? null, target_missing: tgt.missing,
          behavior: effBehavior, reason: rule.note?.trim() || `Depende de: ${what}`,
          dependent_stage_key: effBehavior === "block_stage" ? stepRow?.id ?? null : null, stage_gate: stageGate,
          provides_input: !!(rule as { provides_input?: boolean }).provides_input, input_label: (rule as { input_label?: string | null }).input_label ?? null,
        },
      });
      result.rulesCreated++;
      if (effBehavior === "block_start" && t.status === "PARA_LANCAMENTO") {
        await db.projectTask.update({ where: { id: t.id }, data: { status: "PENDENTE_DE_LIBERACAO" } });
        await logProjectDecision(db, { projectId, projectTaskId: t.id, kind: "dependency_blocked", message: `"${t.title}" aguarda: ${what}.` });
      }
    }
  }
  return result;
}

/**
 * Entregável APROVADO de outro produto (ou tarefa) vira ENTRADA da tarefa dependente: guarda o vínculo com o link/anexo, a versão e a aprovação.
 * Só age em regras marcadas "provides_input"; produtos sem esse recurso não geram nada.
 */
export async function syncTaskInputs(db: Db, projectId: string): Promise<number> {
  const rules = await db.projectDependencyRule.findMany({ where: { project_id: projectId, provides_input: true, target_kind: { in: ["product_deliverables", "deliverable"] } } });
  let n = 0;
  for (const r of rules) {
    const taskIds: string[] = [];
    if (r.target_kind === "product_deliverables" && r.target_project_product_id) {
      taskIds.push(...(await db.projectTask.findMany({ where: { project_product_id: r.target_project_product_id, occurrence_index: 0, status: { not: "CANCELADA" } }, select: { id: true } })).map((t) => t.id));
    } else if (r.target_task_id) taskIds.push(r.target_task_id);
    if (taskIds.length === 0) continue;
    const dels = await db.projectTaskDeliverable.findMany({ where: { project_task_id: { in: taskIds }, status: "aprovado", ...(r.target_kind === "deliverable" && r.target_deliverable_key ? { key: r.target_deliverable_key } : {}) } });
    for (const d of dels) {
      const data = { source_project_task_id: d.project_task_id, source_product_id: r.target_product_id, label: r.input_label ?? d.name, link_url: d.content_url, version_number: d.version, approval_status: d.status, approved_at: d.reviewed_at };
      const cur = await db.projectTaskInput.findFirst({ where: { project_task_id: r.task_id, source_rule_id: r.id, source_deliverable_key: d.key } });
      if (cur) { await db.projectTaskInput.update({ where: { id: cur.id }, data }); }
      else { await db.projectTaskInput.create({ data: { project_task_id: r.task_id, source_rule_id: r.id, source_deliverable_key: d.key, ...data } }); n++; }
    }
  }
  return n;
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
    let target: { missing: boolean; ppId: string | null; taskId: string | null; stepId: string | null };
    if (src.target_product_id && src.target_product_id === src.dependent_product_id) {
      const dt = await db.projectTask.findUnique({ where: { id: r.task_id }, select: { project_product_id: true, occurrence_index: true } });
      target = dt ? await resolveSameProductTarget(db, src, dt) : { missing: true, ppId: null, taskId: null, stepId: null };
    } else {
      target = await resolveTargetInProject(db, src, { projectId, companyProjectFilter });
    }
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
      const gatesHold = await (await import("./approval-gates")).unmetDeliveryGates(db, t.id);
      if ((await unmetRules(db, t.id, ["block_final", "require_before_delivery"])).length === 0 && gatesHold.length === 0) {
        const { enviarParaAceite, garantirRevisor, garantirQualificador } = await import("./stage-engine");
        const destino = await enviarParaAceite(db, t.id, {});
        // avisa quem precisa decidir (depois da transação, se houver uma em andamento)
        if (destino === "revisao") setTimeout(() => void garantirRevisor(t.id), 1500);
        if (destino === "qualificacao") setTimeout(() => void garantirQualificador(t.id), 1500);
        await logProjectDecision(db, { projectId, projectTaskId: t.id, kind: "dependency_released", message: `A entrega de "${t.title}" seguiu: o item/aprovação exigido já existe.` });
        moved++;
      }
    }
    // Etapas que esperavam o entregável de outro produto: reavalia e abre as liberadas.
    const waitingStages = await db.projectTaskStage.findMany({ where: { status: "AGUARDANDO_DEPENDENCIA", project_task: { project_id: projectId } }, select: { id: true } });
    if (waitingStages.length > 0) {
      const { abrirEtapa } = await import("./stage-engine");
      for (const s of waitingStages) { const r = await abrirEtapa(db, s.id); if (r.status !== "AGUARDANDO_DEPENDENCIA") moved++; }
    }
    // Entregável aprovado de outro produto vira ENTRADA da tarefa (anexo/link, versão e aprovação).
    await syncTaskInputs(db, projectId);
    // Relógios de SLA acompanham o estado real (âncoras, conclusões).
    await (await import("./sla")).syncSlaClocks(db, projectId);
  } catch (err) {
    console.error("[dependencies] reavaliar:", err);
  }
  return moved;
}
