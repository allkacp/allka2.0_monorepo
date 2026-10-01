// Modalidades de contratação e ciclos de execução (Pedido 2, 2026-09-29).
//
// Vale para QUALQUER produto: avulso, recorrente mensal, recorrente com
// implementação inicial. Decide, a cada ciclo, quais tarefas nascem:
//   • 1º ciclo (occurrence 0) da 1ª contratação daquele cliente: implementação
//     inicial + tarefas operacionais (que ficam bloqueadas até a implementação
//     concluir, quando o produto pede);
//   • ciclos seguintes: só as tarefas recorrentes, conforme a regra de repetição
//     (todo mês, a cada N ciclos, só na 1ª vez, manual…);
//   • implementação já concluída para o mesmo cliente NÃO se repete, salvo regra
//     "sempre" ou motivo de revalidação (mudança de escopo, acesso expirado, novo
//     ambiente/plataforma).
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const CYCLE_TYPES = ["implementacao", "recorrente", "revalidacao", "avulso", "sob_demanda"] as const;
export type CycleType = (typeof CYCLE_TYPES)[number];
export const CYCLE_TYPE_LABEL: Record<CycleType, string> = {
  implementacao: "Implementação inicial",
  recorrente: "Recorrente",
  revalidacao: "Revalidação",
  avulso: "Avulso (uma vez)",
  sob_demanda: "Sob demanda",
};
export const REPEAT_RULES = ["all_cycles", "first_only", "every_n_cycles", "on_condition", "manual"] as const;
export type RepeatRule = (typeof REPEAT_RULES)[number];
export const REPEAT_RULE_LABEL: Record<RepeatRule, string> = {
  all_cycles: "Todos os ciclos",
  first_only: "Somente na primeira execução",
  every_n_cycles: "A cada N ciclos",
  on_condition: "Somente por condição/mudança",
  manual: "Manual (um líder libera)",
};
export const IMPLEMENTATION_RULES = ["first_only", "always", "on_revalidation"] as const;
export type ImplementationRule = (typeof IMPLEMENTATION_RULES)[number];
export const SELL_MODES = ["standalone", "package_only"] as const;

export type ContractMode = "avulso" | "mensal" | "mensal_implementacao";
export type CycleKind = "implementacao" | "recorrencia_mensal" | "revalidacao" | "avulso";

export interface CycleTaskInput {
  key: string;
  name: string;
  cycle_type: string;
  repeat_rule: string;
  repeat_every_cycles: number | null;
  task_model_id: number | null;
}

export interface CycleContext {
  cycleIndex: number;
  contractMode: ContractMode;
  hasImplementation: boolean;
  implementationRule: string;
  isFirstContract: boolean;
  /** Implementações já CONCLUÍDAS antes para o mesmo cliente+produto (por modelo global ou key). */
  completedImplementation: { modelIds: Set<number>; keys: Set<string> };
  revalidationReason: string | null;
}

export type CycleDecision =
  | { generate: true; cycleKind: CycleKind; note?: string }
  | { generate: false; code: string; reason: string };

/** "avulso" (uma entrega), "mensal" ou "mensal_implementacao" — derivado da configuração real do contrato. */
export function deriveContractMode(opts: { periodMonths: number | null; deliveryRecurrence: string | null; hasImplementation: boolean }): ContractMode {
  const recurring = (opts.periodMonths ?? 0) > 1 && opts.deliveryRecurrence === "mensal";
  if (!recurring) return "avulso";
  return opts.hasImplementation ? "mensal_implementacao" : "mensal";
}

function implementationAlreadyDone(task: CycleTaskInput, ctx: CycleContext): boolean {
  return (task.task_model_id != null && ctx.completedImplementation.modelIds.has(task.task_model_id)) || ctx.completedImplementation.keys.has(task.key);
}

/** Decide se UMA tarefa do modelo nasce neste ciclo. Função pura (sem banco). */
export function planTaskForCycle(task: CycleTaskInput, ctx: CycleContext): CycleDecision {
  const k = ctx.cycleIndex;
  const recurringKind: CycleKind = ctx.contractMode === "avulso" ? "avulso" : "recorrencia_mensal";

  if (task.cycle_type === "sob_demanda") {
    return { generate: false, code: "sob_demanda", reason: "Tarefa sob demanda: só é criada quando um líder/administrador pedir." };
  }
  if (task.repeat_rule === "manual" || task.repeat_rule === "on_condition") {
    return {
      generate: false,
      code: task.repeat_rule,
      reason: task.repeat_rule === "manual" ? "Regra de repetição manual: um líder libera quando for a hora." : "Só é criada quando houver mudança/condição que a exija.",
    };
  }

  if (task.cycle_type === "implementacao") {
    if (k > 0) return { generate: false, code: "implementation_only_first_cycle", reason: "Implementação inicial não se repete nos ciclos seguintes." };
    const done = implementationAlreadyDone(task, ctx);
    if (ctx.implementationRule === "always") return { generate: true, cycleKind: "implementacao" };
    if (ctx.revalidationReason) return { generate: true, cycleKind: "revalidacao", note: `Revalidação: ${ctx.revalidationReason}` };
    if (done) return { generate: false, code: "implementation_done", reason: "Implementação já concluída para este cliente — não é repetida." };
    if (ctx.implementationRule === "on_revalidation") {
      return ctx.isFirstContract
        ? { generate: true, cycleKind: "implementacao" }
        : { generate: false, code: "implementation_revalidation_only", reason: "A implementação só roda de novo se houver revalidação (mudança de escopo, acesso expirado ou novo ambiente)." };
    }
    return { generate: true, cycleKind: "implementacao" }; // first_only e ainda não concluída
  }

  if (task.cycle_type === "revalidacao") {
    return k === 0 && ctx.revalidationReason
      ? { generate: true, cycleKind: "revalidacao", note: `Revalidação: ${ctx.revalidationReason}` }
      : { generate: false, code: "revalidation_not_needed", reason: "Revalidação não necessária neste ciclo." };
  }

  if (task.cycle_type === "avulso") {
    return k === 0 ? { generate: true, cycleKind: recurringKind } : { generate: false, code: "one_time_only", reason: "Tarefa avulsa: roda uma única vez." };
  }

  // recorrente
  switch (task.repeat_rule) {
    case "first_only":
      return k === 0 ? { generate: true, cycleKind: recurringKind } : { generate: false, code: "first_execution_only", reason: "Só roda na primeira execução." };
    case "every_n_cycles": {
      const n = Math.max(1, task.repeat_every_cycles ?? 1);
      return k % n === 0 ? { generate: true, cycleKind: recurringKind } : { generate: false, code: "not_this_cycle", reason: `Roda a cada ${n} ciclos — não é este.` };
    }
    default:
      return { generate: true, cycleKind: recurringKind };
  }
}

/** Chave do "mesmo cliente" de um projeto (empresa; cai no cliente legado). */
function clientConditions(project: { company_id: string | null; client_id: string | null }): Prisma.ProjectWhereInput[] {
  const conds: Prisma.ProjectWhereInput[] = [];
  if (project.company_id) conds.push({ company_id: project.company_id });
  if (project.client_id) conds.push({ client_id: project.client_id });
  return conds;
}

const DONE_STATUSES = ["CONCLUIDA", "APROVADA"];

export async function resolveCycleContext(
  tx: Db,
  projectId: string,
  pp: {
    id: string; catalog2_product_id: string | null; catalog2_period_months: number | null; created_at: Date;
    first_contract: boolean | null; revalidation_reason: string | null;
    catalog2_product?: { delivery_recurrence: string | null } | null;
    catalog2_version?: { has_initial_implementation: boolean; implementation_rule: string } | null;
  },
  cycleIndex: number,
): Promise<CycleContext> {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { company_id: true, client_id: true } });
  const conds = project ? clientConditions(project) : [];
  const hasImplementation = pp.catalog2_version?.has_initial_implementation ?? false;

  let isFirstContract = pp.first_contract;
  if (isFirstContract === null || isFirstContract === undefined) {
    if (conds.length === 0 || !pp.catalog2_product_id) {
      isFirstContract = true;
    } else {
      const prior = await tx.projectProduct.findFirst({
        where: {
          id: { not: pp.id }, catalog2_product_id: pp.catalog2_product_id, created_at: { lt: pp.created_at },
          tasks: { some: {} }, project: { OR: conds },
        },
        select: { id: true },
      });
      isFirstContract = !prior;
    }
  }

  const completed = { modelIds: new Set<number>(), keys: new Set<string>() };
  if (cycleIndex === 0 && conds.length > 0 && pp.catalog2_product_id) {
    const rows = await tx.projectTask.findMany({
      where: {
        catalog2_product_id: pp.catalog2_product_id, status: { in: DONE_STATUSES }, project_product_id: { not: pp.id },
        catalog2_task: { cycle_type: "implementacao" }, project: { OR: conds },
      },
      select: { catalog2_task: { select: { task_model_id: true, key: true } } },
    });
    for (const r of rows) {
      if (r.catalog2_task?.task_model_id != null) completed.modelIds.add(r.catalog2_task.task_model_id);
      if (r.catalog2_task?.key) completed.keys.add(r.catalog2_task.key);
    }
  }

  // Assinatura mensal contínua: cada mês é um ciclo recorrente, mesmo o contrato sendo de "1 mês".
  const subscribed = !!(await tx.catalog2Subscription.findUnique({ where: { project_product_id: pp.id }, select: { id: true } }));
  return {
    cycleIndex,
    contractMode: deriveContractMode({ periodMonths: subscribed ? Math.max(2, pp.catalog2_period_months ?? 0) : pp.catalog2_period_months, deliveryRecurrence: pp.catalog2_product?.delivery_recurrence ?? null, hasImplementation }),
    hasImplementation,
    implementationRule: pp.catalog2_version?.implementation_rule ?? "first_only",
    isFirstContract,
    completedImplementation: completed,
    revalidationReason: pp.revalidation_reason ?? null,
  };
}

/** Implantações que a empresa JÁ concluiu para este produto (decide se a implantação é cobrada de novo). */
export async function loadImplementationDone(db: Db, p: { companyId: string | null; catalog2ProductId: string }) {
  const out = { modelIds: new Set<number>(), keys: new Set<string>() };
  if (!p.companyId) return out;
  const rows = await db.projectTask.findMany({
    where: { catalog2_product_id: p.catalog2ProductId, status: { in: DONE_STATUSES }, catalog2_task: { cycle_type: "implementacao" }, project: { company_id: p.companyId } },
    select: { catalog2_task: { select: { task_model_id: true, key: true } } },
  });
  for (const r of rows) {
    if (r.catalog2_task?.task_model_id != null) out.modelIds.add(r.catalog2_task.task_model_id);
    if (r.catalog2_task?.key) out.keys.add(r.catalog2_task.key);
  }
  return out;
}

export async function logProjectDecision(
  db: Db,
  d: { projectId: string; projectProductId?: string | null; projectTaskId?: string | null; kind: string; message: string; detail?: unknown; actorUserId?: string | null },
) {
  await db.projectDecisionLog.create({
    data: {
      project_id: d.projectId, project_product_id: d.projectProductId ?? null, project_task_id: d.projectTaskId ?? null,
      kind: d.kind, message: d.message, detail_json: d.detail === undefined ? null : JSON.stringify(d.detail), actor_user_id: d.actorUserId ?? null,
    },
  });
}
