// Exigências de conexão por VERSÃO de produto (módulo universal, opcional). Quando `requires_connections` é falso a versão
// se comporta como se o módulo não existisse: nada aparece para o cliente, não cria pendência e não bloqueia nada.
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ASSET_RULES_CONN, ConnectionError, CONNECTION_METHODS, DEPENDENCY_KINDS, GRANT_SCOPES, OBLIGATIONS, PENDING_BEHAVIORS, VALIDATION_MODES, WHEN_NEEDED,
  dependencyKey, parseJsonArray, serializeConnectionType, slugKey,
  type DependencyKind,
} from "./catalog";

type Db = PrismaClient | Prisma.TransactionClient;

export interface DependentInput { task_key: string; step_key?: string | null; kind?: DependencyKind }
export interface RequirementInput {
  connection_type_id?: number; connection_type_key?: string;
  key?: string; label?: string | null;
  when_needed?: string; when_task_key?: string | null; when_step_key?: string | null; condition_text?: string | null;
  obligation?: string; method?: string; permission_level?: string; pending_behavior?: string;
  reason?: string | null; instructions?: string | null; default_grant_scope?: string; validation_mode?: string;
  asset_rule?: string; revalidate_days?: number | null; light_check?: boolean;
  reminder_interval_hours?: number | null; reminder_limit?: number | null; escalate_after_reminders?: number | null; visible_to_client?: boolean;
  dependents?: DependentInput[];
}

const REQ_INCLUDE = { connection_type: true, dependencies: { orderBy: { dep_key: "asc" as const } } } satisfies Prisma.Catalog2ConnectionRequirementInclude;
export type RequirementRow = Prisma.Catalog2ConnectionRequirementGetPayload<{ include: typeof REQ_INCLUDE }>;

export function serializeRequirement(r: RequirementRow) {
  return {
    id: r.id, key: r.key, label: r.label, connection_type: serializeConnectionType(r.connection_type),
    when_needed: r.when_needed, when_task_key: r.when_task_key, when_step_key: r.when_step_key, condition_text: r.condition_text,
    obligation: r.obligation, method: r.method, permission_level: r.permission_level, pending_behavior: r.pending_behavior,
    advanced: {
      reason: r.reason, instructions: r.instructions, default_grant_scope: r.default_grant_scope, validation_mode: r.validation_mode,
      asset_rule: r.asset_rule, revalidate_days: r.revalidate_days, light_check: r.light_check,
      reminder_interval_hours: r.reminder_interval_hours, reminder_limit: r.reminder_limit, escalate_after_reminders: r.escalate_after_reminders,
      visible_to_client: r.visible_to_client,
    },
    dependents: r.dependencies.map((d) => ({ id: d.id, task_key: d.task_key, step_key: d.step_key, kind: d.kind })),
    sort_order: r.sort_order,
  };
}

export async function listRequirements(db: Db, versionId: string) {
  const rows = await db.catalog2ConnectionRequirement.findMany({ where: { version_id: versionId }, include: REQ_INCLUDE, orderBy: { sort_order: "asc" } });
  return rows;
}

export async function moduleState(db: Db, versionId: string) {
  const v = await db.catalog2ProductVersion.findUnique({ where: { id: versionId }, select: { requires_connections: true } });
  const rows = await listRequirements(db, versionId);
  return { requires_connections: !!v?.requires_connections, requirements: rows.map(serializeRequirement) };
}

async function loadVersionStructure(db: Db, versionId: string) {
  const tasks = await db.catalog2Task.findMany({ where: { version_id: versionId }, select: { key: true, name: true, steps: { select: { key: true, name: true } } } });
  return new Map(tasks.map((t) => [t.key, { name: t.name, steps: new Set(t.steps.map((s) => s.key)) }]));
}

function pick<T extends string>(v: string | undefined, allowed: readonly T[], field: string, dflt: T): T {
  const val = v ?? dflt;
  if (!(allowed as readonly string[]).includes(val)) throw new ConnectionError(`Valor inválido em ${field}: "${val}".`, 422, "invalid_field", { field, allowed });
  return val as T;
}

async function normalize(db: Db, versionId: string, input: RequirementInput, current?: RequirementRow) {
  const type = input.connection_type_id != null
    ? await db.connectionType.findUnique({ where: { id: input.connection_type_id } })
    : input.connection_type_key ? await db.connectionType.findUnique({ where: { key: input.connection_type_key } }) : current?.connection_type ?? null;
  if (!type) throw new ConnectionError("Tipo de conexão não encontrado no catálogo global.", 422, "connection_type_not_found");
  if (!type.is_active && type.id !== current?.connection_type_id) throw new ConnectionError(`O tipo "${type.name}" está inativo.`, 422, "connection_type_inactive");
  const allowedMethods = parseJsonArray<string>(type.allowed_methods_json);
  const levels = parseJsonArray<{ key: string }>(type.permission_levels_json).map((l) => l.key);
  const method = pick(input.method ?? current?.method ?? allowedMethods[0], CONNECTION_METHODS, "method", "oauth");
  if (allowedMethods.length && !allowedMethods.includes(method)) throw new ConnectionError(`O método "${method}" não é permitido para "${type.name}".`, 422, "method_not_allowed", { allowed: allowedMethods });
  const permission = input.permission_level ?? current?.permission_level ?? levels[0] ?? "read_write";
  if (levels.length && !levels.includes(permission)) throw new ConnectionError(`O nível de permissão "${permission}" não existe para "${type.name}".`, 422, "permission_not_allowed", { allowed: levels });
  // Sem "quando" informado: com dependentes vale "antes da tarefa" (a primeira); sem dependentes, "depois da contratação".
  const when = pick(input.when_needed ?? current?.when_needed ?? (input.dependents?.length ? "before_task" : "after_checkout"), WHEN_NEEDED, "when_needed", "before_task");
  const structure = await loadVersionStructure(db, versionId);
  const whenTask = input.when_task_key !== undefined ? input.when_task_key : current?.when_task_key ?? input.dependents?.[0]?.task_key ?? null;
  const whenStep = input.when_step_key !== undefined ? input.when_step_key : current?.when_step_key ?? (when === "before_step" ? input.dependents?.[0]?.step_key ?? null : null);
  if (when === "before_task" || when === "before_step") {
    if (!whenTask || !structure.has(whenTask)) throw new ConnectionError("Informe uma tarefa existente desta versão em \"quando será necessária\".", 422, "when_task_invalid");
    if (when === "before_step" && (!whenStep || !structure.get(whenTask)!.steps.has(whenStep))) throw new ConnectionError("Informe uma etapa existente da tarefa escolhida.", 422, "when_step_invalid");
  }
  const obligation = pick(input.obligation ?? current?.obligation, OBLIGATIONS, "obligation", "required");
  const condition = input.condition_text !== undefined ? input.condition_text : current?.condition_text ?? null;
  if ((obligation === "conditional" || when === "on_condition") && !condition?.trim()) throw new ConnectionError("Descreva a condição em que a conexão passa a ser necessária.", 422, "condition_missing");
  const assetRule = pick(input.asset_rule ?? current?.asset_rule, ASSET_RULES_CONN, "asset_rule", "first_only");
  const revalidate = input.revalidate_days !== undefined ? input.revalidate_days : current?.revalidate_days ?? null;
  if (assetRule === "every_x_days" && !(revalidate && revalidate >= 1)) throw new ConnectionError("Informe a cada quantos dias revalidar.", 422, "revalidate_days_missing");
  return {
    type, method, permission, when, whenTask: when === "before_task" || when === "before_step" ? whenTask : null, whenStep: when === "before_step" ? whenStep : null,
    obligation, condition: condition?.trim() || null,
    pending: pick(input.pending_behavior ?? current?.pending_behavior, PENDING_BEHAVIORS, "pending_behavior", "block_dependents"),
    scope: pick(input.default_grant_scope ?? current?.default_grant_scope, GRANT_SCOPES, "default_grant_scope", "project"),
    validation: pick(input.validation_mode ?? current?.validation_mode, VALIDATION_MODES, "validation_mode", "manual"),
    assetRule, revalidate, structure,
  };
}

function checkDependents(structure: Map<string, { name: string; steps: Set<string> }>, deps: DependentInput[]): DependentInput[] {
  const seen = new Set<string>();
  const out: DependentInput[] = [];
  for (const d of deps) {
    const t = structure.get(d.task_key);
    if (!t) throw new ConnectionError(`A tarefa "${d.task_key}" não existe nesta versão.`, 422, "dependent_task_not_found");
    if (d.step_key && !t.steps.has(d.step_key)) throw new ConnectionError(`A etapa "${d.step_key}" não existe na tarefa "${t.name}".`, 422, "dependent_step_not_found");
    const kind = pick(d.kind, DEPENDENCY_KINDS, "dependents.kind", "start");
    const k = dependencyKey(d.task_key, d.step_key);
    if (seen.has(k)) throw new ConnectionError(`Dependência repetida: ${t.name}${d.step_key ? ` / ${d.step_key}` : ""}.`, 422, "dependent_duplicated");
    seen.add(k);
    out.push({ task_key: d.task_key, step_key: d.step_key ?? null, kind });
  }
  return out;
}

async function uniqueKey(db: Db, versionId: string, base: string, ignoreId?: string) {
  let key = base, n = 2;
  while (await db.catalog2ConnectionRequirement.findFirst({ where: { version_id: versionId, key, ...(ignoreId ? { id: { not: ignoreId } } : {}) }, select: { id: true } })) key = `${base}_${n++}`;
  return key;
}

export async function createRequirement(db: Db, versionId: string, input: RequirementInput) {
  const n = await normalize(db, versionId, input);
  const deps = checkDependents(n.structure, input.dependents ?? (n.whenTask ? [{ task_key: n.whenTask, step_key: n.whenStep, kind: "start" as DependencyKind }] : []));
  const count = await db.catalog2ConnectionRequirement.count({ where: { version_id: versionId } });
  const key = await uniqueKey(db, versionId, slugKey(input.key || input.label || n.type.key));
  const row = await db.catalog2ConnectionRequirement.create({
    data: {
      version_id: versionId, connection_type_id: n.type.id, key, label: input.label?.trim() || null,
      when_needed: n.when, when_task_key: n.whenTask, when_step_key: n.whenStep, condition_text: n.condition,
      obligation: n.obligation, method: n.method, permission_level: n.permission, pending_behavior: n.pending,
      reason: input.reason?.trim() || null, instructions: input.instructions?.trim() || null, default_grant_scope: n.scope, validation_mode: n.validation,
      asset_rule: n.assetRule, revalidate_days: n.revalidate, light_check: !!input.light_check,
      reminder_interval_hours: input.reminder_interval_hours ?? null, reminder_limit: input.reminder_limit ?? null, escalate_after_reminders: input.escalate_after_reminders ?? null,
      visible_to_client: input.visible_to_client !== false, sort_order: count + 1,
      dependencies: { create: deps.map((d) => ({ task_key: d.task_key, step_key: d.step_key ?? null, kind: d.kind ?? "start", dep_key: dependencyKey(d.task_key, d.step_key) })) },
    },
    include: REQ_INCLUDE,
  });
  return row;
}

export async function updateRequirement(db: Db, id: string, input: RequirementInput) {
  const cur = await db.catalog2ConnectionRequirement.findUnique({ where: { id }, include: REQ_INCLUDE });
  if (!cur) throw new ConnectionError("Exigência não encontrada.", 404, "requirement_not_found");
  const n = await normalize(db, cur.version_id, input, cur);
  const deps = input.dependents ? checkDependents(n.structure, input.dependents) : null;
  await db.catalog2ConnectionRequirement.update({
    where: { id },
    data: {
      connection_type_id: n.type.id, ...(input.label !== undefined ? { label: input.label?.trim() || null } : {}),
      when_needed: n.when, when_task_key: n.whenTask, when_step_key: n.whenStep, condition_text: n.condition,
      obligation: n.obligation, method: n.method, permission_level: n.permission, pending_behavior: n.pending,
      ...(input.reason !== undefined ? { reason: input.reason?.trim() || null } : {}), ...(input.instructions !== undefined ? { instructions: input.instructions?.trim() || null } : {}),
      default_grant_scope: n.scope, validation_mode: n.validation, asset_rule: n.assetRule, revalidate_days: n.revalidate,
      ...(input.light_check !== undefined ? { light_check: input.light_check } : {}),
      ...(input.reminder_interval_hours !== undefined ? { reminder_interval_hours: input.reminder_interval_hours } : {}),
      ...(input.reminder_limit !== undefined ? { reminder_limit: input.reminder_limit } : {}),
      ...(input.escalate_after_reminders !== undefined ? { escalate_after_reminders: input.escalate_after_reminders } : {}),
      ...(input.visible_to_client !== undefined ? { visible_to_client: input.visible_to_client } : {}),
    },
  });
  if (deps) {
    await db.catalog2ConnectionDependency.deleteMany({ where: { requirement_id: id } });
    for (const d of deps) await db.catalog2ConnectionDependency.create({ data: { requirement_id: id, task_key: d.task_key, step_key: d.step_key ?? null, kind: d.kind ?? "start", dep_key: dependencyKey(d.task_key, d.step_key) } });
  }
  return db.catalog2ConnectionRequirement.findUniqueOrThrow({ where: { id }, include: REQ_INCLUDE });
}

export async function deleteRequirement(db: Db, id: string) {
  const cur = await db.catalog2ConnectionRequirement.findUnique({ where: { id } });
  if (!cur) throw new ConnectionError("Exigência não encontrada.", 404, "requirement_not_found");
  await db.catalog2ConnectionRequirement.delete({ where: { id } });
  return cur;
}

export async function setModuleFlag(db: Db, versionId: string, on: boolean) {
  await db.catalog2ProductVersion.update({ where: { id: versionId }, data: { requires_connections: on } });
}

/** Cópia para a nova versão (flag + exigências + dependências), preservando as chaves. */
export async function cloneConnections(tx: Prisma.TransactionClient, srcVersionId: string, destVersionId: string) {
  const src = await tx.catalog2ProductVersion.findUnique({ where: { id: srcVersionId }, select: { requires_connections: true } });
  if (src?.requires_connections) await tx.catalog2ProductVersion.update({ where: { id: destVersionId }, data: { requires_connections: true } });
  const rows = await tx.catalog2ConnectionRequirement.findMany({ where: { version_id: srcVersionId }, include: { dependencies: true } });
  for (const r of rows) {
    const { id: _id, version_id: _v, dependencies, created_at: _c, updated_at: _u, ...rest } = r;
    await tx.catalog2ConnectionRequirement.create({
      data: { ...rest, version_id: destVersionId, dependencies: { create: dependencies.map((d) => ({ task_key: d.task_key, step_key: d.step_key, kind: d.kind, dep_key: d.dep_key })) } },
    });
  }
}

/** Coerência para publicar. Módulo desativado → nenhuma pendência (não afeta publicação, preço nem prazo). */
export async function validateConnectionConfig(db: Db, versionId: string): Promise<string[]> {
  const v = await db.catalog2ProductVersion.findUnique({ where: { id: versionId }, select: { requires_connections: true } });
  if (!v?.requires_connections) return [];
  const rows = await listRequirements(db, versionId);
  const issues: string[] = [];
  if (rows.length === 0) return ["Conexões: o módulo está ativado, mas nenhuma exigência foi cadastrada."];
  const structure = await loadVersionStructure(db, versionId);
  for (const r of rows) {
    const name = r.label || r.connection_type.name;
    if (!r.connection_type.is_active) issues.push(`Conexões: o tipo "${r.connection_type.name}" (exigência "${name}") está inativo.`);
    const methods = parseJsonArray<string>(r.connection_type.allowed_methods_json);
    if (methods.length && !methods.includes(r.method)) issues.push(`Conexões: o método "${r.method}" não é permitido para "${r.connection_type.name}".`);
    const levels = parseJsonArray<{ key: string }>(r.connection_type.permission_levels_json).map((l) => l.key);
    if (levels.length && !levels.includes(r.permission_level)) issues.push(`Conexões: o nível de permissão "${r.permission_level}" não existe para "${r.connection_type.name}".`);
    if ((r.when_needed === "before_task" || r.when_needed === "before_step") && (!r.when_task_key || !structure.has(r.when_task_key))) issues.push(`Conexões: "${name}" aponta para uma tarefa que não existe mais.`);
    if (r.when_needed === "before_step" && r.when_task_key && (!r.when_step_key || !structure.get(r.when_task_key)?.steps.has(r.when_step_key))) issues.push(`Conexões: "${name}" aponta para uma etapa que não existe mais.`);
    if ((r.obligation === "conditional" || r.when_needed === "on_condition") && !r.condition_text?.trim()) issues.push(`Conexões: "${name}" é condicional e precisa descrever a condição.`);
    for (const d of r.dependencies) {
      const t = structure.get(d.task_key);
      if (!t) issues.push(`Conexões: "${name}" tem dependência de uma tarefa que não existe ("${d.task_key}").`);
      else if (d.step_key && !t.steps.has(d.step_key)) issues.push(`Conexões: "${name}" tem dependência de uma etapa que não existe ("${d.step_key}").`);
    }
    const blocking = r.dependencies.length > 0; // dependência só informativa também é coerente (nada bloqueia, só informa)
    if (r.obligation === "required" && r.pending_behavior === "block_dependents" && !blocking) issues.push(`Conexões: "${name}" é obrigatória e bloqueia dependentes, mas nenhuma tarefa ou etapa depende dela.`);
    if (r.pending_behavior === "block_checkout" && r.when_needed !== "during_checkout") issues.push(`Conexões: "${name}" só pode bloquear a conclusão da contratação se for exigida durante a contratação.`);
    if (r.asset_rule === "every_x_days" && !(r.revalidate_days && r.revalidate_days >= 1)) issues.push(`Conexões: "${name}" revalida a cada X dias, mas X não foi informado.`);
  }
  return issues;
}

/** Item do checklist do produto (nulo quando o módulo está desativado: não entra no checklist). */
export async function connectionsReadinessItem(db: Db, versionId: string): Promise<{ key: "conexoes"; label: string; status: "pronto" | "pendente"; detail: string } | null> {
  const v = await db.catalog2ProductVersion.findUnique({ where: { id: versionId }, select: { requires_connections: true } });
  if (!v?.requires_connections) return null;
  const issues = await validateConnectionConfig(db, versionId);
  const n = await db.catalog2ConnectionRequirement.count({ where: { version_id: versionId } });
  return { key: "conexoes", label: "Conexões e acessos necessários", status: issues.length === 0 ? "pronto" : "pendente", detail: issues.length === 0 ? `${n} exigência(s) configurada(s).` : issues.join(" ") };
}
