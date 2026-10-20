// Edição de MODELOS GLOBAIS de tarefa e etapa (19/10): impacto, propagação para os vínculos editáveis e "novo modelo a partir deste".
//
// Regras (pedido do usuário):
//  • "Editar globalmente" altera o modelo e leva a mudança a TODOS os vínculos editáveis (versões em rascunho). Versão publicada
//    (ou qualquer outra que não seja rascunho) NUNCA muda sozinha: continua na revisão antiga e só passa a indicar "revisão nova disponível".
//  • "Criar novo modelo a partir deste" duplica o modelo (ID novo) e liga SÓ o item editado ao novo; os vínculos atuais ficam como estavam.
//  • Ajustes que pertencem ao produto (acessos da etapa) nunca viajam entre produtos.
import { Prisma, type PrismaClient } from "@prisma/client";
import { createStepModel, createTaskModel, stepDataFromModel, taskDataFromModel } from "./catalog2-models";

type Db = PrismaClient | Prisma.TransactionClient;

/** Chaves do ops da etapa que apontam para coisas DESTE produto (acessos): não vão para o modelo nem para outros produtos. */
export const PRODUCT_BOUND_STEP_OPS = ["access_keys", "access_scope", "access_parked"] as const;

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** ops do MODELO a partir do ops da etapa editada (sem o que é só deste produto). */
export function modelOpsFromStepOps(ops: unknown): Record<string, unknown> | null {
  const o = { ...asObj(ops) };
  for (const k of PRODUCT_BOUND_STEP_OPS) delete o[k];
  return Object.keys(o).length ? o : null;
}
/** ops que a etapa de OUTRO produto passa a ter: o do modelo + o que era só dela (acessos). */
export function mergeStepOpsKeepingLocal(modelOps: unknown, localOps: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const merged: Record<string, unknown> = { ...asObj(modelOps) };
  for (const k of PRODUCT_BOUND_STEP_OPS) delete merged[k];
  const local = asObj(localOps);
  for (const k of PRODUCT_BOUND_STEP_OPS) if (k in local) merged[k] = local[k];
  return Object.keys(merged).length ? (merged as Prisma.InputJsonValue) : Prisma.DbNull;
}

export interface ModelImpact {
  kind: "task" | "step";
  model_id: number;
  name: string;
  revision: number;
  /** Tarefas (ou etapas) de produtos que usam o modelo. */
  instances: number;
  /** Quantas estão em versão em RASCUNHO (serão atualizadas). */
  editable: number;
  /** Quantas estão em versão publicada/outra (não mudam; passam a indicar revisão nova). */
  locked: number;
  products: number;
  product_list: { id: string; name: string; number: number | null }[];
  /** Só para etapa: tarefas (dos produtos) que usam a etapa. */
  tasks: { id: string; name: string; product_name: string; version: string }[];
}

export async function modelImpact(db: Db, kind: "task" | "step", modelId: number): Promise<ModelImpact | null> {
  const rows = kind === "task"
    ? await db.catalog2Task.findMany({ where: { task_model_id: modelId }, select: { id: true, name: true, version: { select: { version_number: true, state: true, product: { select: { id: true, internal_name: true, sequence_number: true } } } } } })
    : await db.catalog2TaskStep.findMany({ where: { step_model_id: modelId }, select: { id: true, name: true, task: { select: { id: true, name: true, version: { select: { version_number: true, state: true, product: { select: { id: true, internal_name: true, sequence_number: true } } } } } } } });
  const model = kind === "task"
    ? await db.catalog2TaskModel.findUnique({ where: { id: modelId }, select: { id: true, name: true, revision: true } })
    : await db.catalog2StepModel.findUnique({ where: { id: modelId }, select: { id: true, name: true, revision: true } });
  if (!model) return null;
  const flat = rows.map((r: any) => (kind === "task" ? { v: r.version, taskId: r.id, taskName: r.name } : { v: r.task.version, taskId: r.task.id, taskName: r.task.name }));
  const products = new Map<string, { id: string; name: string; number: number | null }>();
  for (const f of flat) products.set(f.v.product.id, { id: f.v.product.id, name: f.v.product.internal_name, number: f.v.product.sequence_number ?? null });
  const editable = flat.filter((f) => f.v.state === "rascunho").length;
  return {
    kind, model_id: model.id, name: model.name, revision: model.revision,
    instances: flat.length, editable, locked: flat.length - editable,
    products: products.size, product_list: [...products.values()],
    tasks: kind === "step" ? flat.map((f) => ({ id: f.taskId, name: f.taskName, product_name: f.v.product.internal_name, version: `v${f.v.version_number}` })) : [],
  };
}

/** Leva o modelo de ETAPA atual para as etapas editáveis (rascunho) de outros produtos. Publicadas ficam como estão. */
export async function propagateStepModel(tx: Prisma.TransactionClient, modelId: number, exceptStepId?: string): Promise<{ updated: number; locked: number }> {
  const model = await tx.catalog2StepModel.findUniqueOrThrow({ where: { id: modelId } });
  const rows = await tx.catalog2TaskStep.findMany({ where: { step_model_id: modelId, ...(exceptStepId ? { id: { not: exceptStepId } } : {}) }, select: { id: true, ops: true, task: { select: { version: { select: { state: true } } } } } });
  let updated = 0; let locked = 0;
  for (const r of rows) {
    if (r.task.version.state !== "rascunho") { locked++; continue; }
    const { step_model_id: _i, ops: _o, ...data } = stepDataFromModel(model);
    await tx.catalog2TaskStep.update({ where: { id: r.id }, data: { ...data, ops: mergeStepOpsKeepingLocal(model.ops, r.ops) } });
    updated++;
  }
  return { updated, locked };
}

export async function propagateTaskModel(tx: Prisma.TransactionClient, modelId: number, exceptTaskId?: string): Promise<{ updated: number; locked: number }> {
  const model = await tx.catalog2TaskModel.findUniqueOrThrow({ where: { id: modelId } });
  const rows = await tx.catalog2Task.findMany({ where: { task_model_id: modelId, ...(exceptTaskId ? { id: { not: exceptTaskId } } : {}) }, select: { id: true, version: { select: { state: true } } } });
  let updated = 0; let locked = 0;
  for (const r of rows) {
    if (r.version.state !== "rascunho") { locked++; continue; }
    const { task_model_id: _i, ...data } = taskDataFromModel(model);
    await tx.catalog2Task.update({ where: { id: r.id }, data });
    updated++;
  }
  return { updated, locked };
}

/** Nome livre para o modelo novo: se já existe um com o mesmo nome, acrescenta "(novo modelo)", "(novo modelo 2)"… */
async function freeModelName(db: Db, kind: "task" | "step", wanted: string): Promise<string> {
  const exists = async (n: string) => (kind === "task" ? await db.catalog2TaskModel.count({ where: { name: n } }) : await db.catalog2StepModel.count({ where: { name: n } })) > 0;
  if (!(await exists(wanted))) return wanted;
  let i = 1;
  for (;;) {
    const n = `${wanted.slice(0, 160)} (novo modelo${i > 1 ? ` ${i}` : ""})`;
    if (!(await exists(n))) return n;
    i += 1;
  }
}

/** "Criar novo modelo a partir deste" (etapa): cria o modelo com os valores atuais da etapa e liga SÓ esta etapa a ele. */
export async function forkStepModelFromStep(tx: Prisma.TransactionClient, stepId: string, userId: string | null, wantedName?: string | null) {
  const s = await tx.catalog2TaskStep.findUniqueOrThrow({ where: { id: stepId } });
  const base = s.step_model_id != null ? await tx.catalog2StepModel.findUnique({ where: { id: s.step_model_id } }) : null;
  const name = await freeModelName(tx, "step", (wantedName?.trim() || s.name).slice(0, 191));
  const nm = await createStepModel(tx, {
    name, description: s.description, specialty_id: s.specialty_id, estimated_minutes: s.estimated_minutes,
    execution_mode: s.execution_mode ?? base?.execution_mode ?? "humano", purpose: s.purpose ?? base?.purpose ?? "execucao",
    completion_criteria: s.completion_criteria ?? base?.completion_criteria ?? null, ops: modelOpsFromStepOps(s.ops),
  }, userId);
  await tx.catalog2TaskStep.update({ where: { id: stepId }, data: { step_model_id: nm.id, step_model_revision: nm.revision, name: nm.name } });
  return nm;
}

/** "Criar novo modelo a partir deste" (tarefa): novo modelo de tarefa com os valores atuais + a mesma lista de etapas (por referência). */
export async function forkTaskModelFromTask(tx: Prisma.TransactionClient, taskId: string, userId: string | null, wantedName?: string | null) {
  const t = await tx.catalog2Task.findUniqueOrThrow({ where: { id: taskId }, include: { steps: { orderBy: { sort_order: "asc" }, select: { step_model_id: true } } } });
  const name = await freeModelName(tx, "task", (wantedName?.trim() || t.name).slice(0, 191));
  const nm = await createTaskModel(tx, {
    name, description: t.description, execution_mode: t.execution_mode, specialty_id: t.specialty_id, estimated_minutes: t.estimated_minutes,
    questionnaire_id: t.questionnaire_id, is_conditional: t.is_conditional, requires_client_approval: t.requires_client_approval, requires_qualification: t.requires_qualification,
    cycle_type: t.cycle_type, repeat_rule: t.repeat_rule, repeat_every_cycles: t.repeat_every_cycles, executor_continuity: t.executor_continuity,
    asset_rule: t.asset_rule, asset_revalidate_days: t.asset_revalidate_days, ops: t.ops, requires_review: t.requires_review, review_minutes: t.review_minutes,
    review_specialty_id: t.review_specialty_id, qualification_cost_mode: t.qualification_cost_mode, qualification_specialty_id: t.qualification_specialty_id,
    qualification_hourly_rate: t.qualification_hourly_rate, qualification_minutes: t.qualification_minutes, qualification_percent: t.qualification_percent,
    qualification_fixed_amount: t.qualification_fixed_amount, qualifier_kind: t.qualifier_kind,
  }, userId);
  const seen = new Set<number>();
  let n = 0;
  for (const s of t.steps) {
    if (s.step_model_id == null || seen.has(s.step_model_id)) continue;
    seen.add(s.step_model_id); n += 1;
    await tx.catalog2TaskModelStep.create({ data: { task_model_id: nm.id, step_model_id: s.step_model_id, sort_order: n } });
  }
  await tx.catalog2Task.update({ where: { id: taskId }, data: { task_model_id: nm.id, task_model_revision: nm.revision, name: nm.name } });
  return nm;
}

/** Liga (sem duplicar) uma etapa-modelo à tarefa-modelo da tarefa onde ela acabou de entrar. */
export async function linkStepModelToTask(db: Db, taskId: string, stepModelId: number | null | undefined, sortOrder: number) {
  if (stepModelId == null) return;
  const t = await db.catalog2Task.findUnique({ where: { id: taskId }, select: { task_model_id: true } });
  if (t?.task_model_id == null) return;
  const has = await db.catalog2TaskModelStep.findFirst({ where: { task_model_id: t.task_model_id, step_model_id: stepModelId }, select: { id: true } });
  if (!has) await db.catalog2TaskModelStep.create({ data: { task_model_id: t.task_model_id, step_model_id: stepModelId, sort_order: sortOrder } });
}
