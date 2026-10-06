// Conexões do cliente: ciclo de vida, autorização de uso (escopo), validação (automática/manual/humana) e auditoria.
// A conexão pertence à EMPRESA; o uso é autorizado por projeto/tarefa. Nunca duplica credencial.
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  CONNECTION_METHODS, CONNECTION_STATE_LABEL, GRANT_SCOPES, SECRET_METHODS, ConnectionError, connectionSatisfies, parseJsonArray, parseFieldDefs, splitFieldValues, missingRequiredFields,
  type ConnectionState, type GrantScope,
} from "./catalog";
import { assertNoSecretInPlainFields, hasSecret, readSecretForConnector, revokeSecret, safeText, storeSecret } from "./secrets";
import { getConnector, oauthRedirectUri, signOAuthState, verifyOAuthState, connectorStatus, type VerifyResult } from "./connectors";

type Db = PrismaClient | Prisma.TransactionClient;

export interface Actor { id: string | null; role?: string | null; integration?: string | null }

// ── Auditoria ───────────────────────────────────────────────────────────────
export async function logConnection(
  db: Db,
  e: { kind: string; message: string; connectionId?: string | null; pcrId?: string | null; companyId?: string | null; projectId?: string | null; taskId?: string | null; actor?: Actor | null; detail?: unknown },
) {
  await db.connectionEvent.create({
    data: {
      kind: e.kind, message: safeText(e.message), connection_id: e.connectionId ?? null, project_connection_req_id: e.pcrId ?? null,
      company_id: e.companyId ?? null, project_id: e.projectId ?? null, project_task_id: e.taskId ?? null,
      actor_user_id: e.actor?.id ?? null, actor_role: e.actor?.role ?? e.actor?.integration ?? null,
      detail_json: e.detail === undefined ? null : safeText(JSON.stringify(e.detail)),
    },
  });
}

/** Visão segura de uma conexão (NUNCA inclui segredo; só diz se existe um guardado). */
function parseStored(json: string | null | undefined): Record<string, string> { try { const v = json ? JSON.parse(json) : {}; return v && typeof v === "object" ? v : {}; } catch { return {}; } }

export async function serializeConnection(db: Db, id: string) {
  const c = await db.clientConnection.findUnique({
    where: { id },
    include: { connection_type: true, grants: { where: { revoked_at: null }, orderBy: { created_at: "asc" } } },
  });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  return {
    id: c.id, company_id: c.company_id, agency_id: c.agency_id, type: { id: c.connection_type.id, key: c.connection_type.key, name: c.connection_type.name, icon: c.connection_type.icon },
    provider: c.provider, method: c.method, label: c.label, account_label: c.account_label, external_id: c.external_id,
    scopes: parseJsonArray<string>(c.scopes_json), permission_level: c.permission_level,
    status: c.status, status_label: CONNECTION_STATE_LABEL[c.status as ConnectionState] ?? c.status,
    owner_user_id: c.owner_user_id, provided_by_user_id: c.provided_by_user_id, connected_by_user_id: c.connected_by_user_id,
    validated_by_user_id: c.validated_by_user_id, validated_by_integration: c.validated_by_integration,
    last_validated_at: c.last_validated_at, next_revalidation_at: c.next_revalidation_at, expires_at: c.expires_at, revoked_at: c.revoked_at,
    last_problem: c.last_problem, correction_needed: c.correction_needed, evidence: c.evidence,
    has_secret: await hasSecret(db, c.id),
    field_values: Object.fromEntries(Object.entries(parseStored(c.field_values_json)).filter(([, v]) => v !== "__set__")),
    secret_fields_set: Object.entries(parseStored(c.field_values_json)).filter(([, v]) => v === "__set__").map(([k]) => k),
    grants: c.grants.map((g) => ({ id: g.id, project_id: g.project_id, scope: g.scope, project_task_id: g.project_task_id, executor_user_id: g.executor_user_id, created_at: g.created_at })),
    created_at: c.created_at, updated_at: c.updated_at,
  };
}

// ── Criação / edição ───────────────────────────────────────────────────────
export interface Owner { company_id?: string | null; agency_id?: string | null }
export interface CreateConnectionInput {
  company_id?: string | null; agency_id?: string | null;
  connection_type_id?: number; connection_type_key?: string;
  method?: string; label?: string; account_label?: string | null; external_id?: string | null;
  permission_level?: string | null; scopes?: string[];
  owner_user_id?: string | null; provided_by_user_id?: string | null;
  secret_value?: string | null;
  /** Valores dos campos definidos no tipo ([{ key, value }]); os de tipo "segredo" vão para o cofre. */
  fields?: { key: string; value: string }[];
  expires_at?: Date | null;
}

export async function createConnection(db: Db, actor: Actor, input: CreateConnectionInput) {
  const { secret_value, ...plain } = input;
  assertNoSecretInPlainFields(plain);
  const type = input.connection_type_id != null
    ? await db.connectionType.findUnique({ where: { id: input.connection_type_id } })
    : input.connection_type_key ? await db.connectionType.findUnique({ where: { key: input.connection_type_key } }) : null;
  if (!type || !type.is_active) throw new ConnectionError("Tipo de conexão inexistente ou inativo.", 422, "connection_type_not_found");
  const methods = parseJsonArray<string>(type.allowed_methods_json);
  const method = input.method ?? methods[0] ?? "manual_instruction";
  if (!(CONNECTION_METHODS as readonly string[]).includes(method) || (methods.length && !methods.includes(method))) throw new ConnectionError(`Método "${method}" não permitido para ${type.name}.`, 422, "method_not_allowed", { allowed: methods });
  const levels = parseJsonArray<{ key: string }>(type.permission_levels_json).map((l) => l.key);
  if (input.permission_level && levels.length && !levels.includes(input.permission_level)) throw new ConnectionError("Nível de permissão inválido para este tipo.", 422, "permission_not_allowed", { allowed: levels });
  if (secret_value && !SECRET_METHODS.includes(method as never)) throw new ConnectionError("Este método não usa segredo. Use a conexão oficial, o convite ou a autorização segura.", 422, "secret_not_allowed_for_method");
  if (!input.company_id && !input.agency_id) throw new ConnectionError("Informe a empresa (ou a agência) dona da conexão.", 400, "owner_required");
  if (input.company_id) { if (!(await db.company.findUnique({ where: { id: input.company_id }, select: { id: true } }))) throw new ConnectionError("Empresa não encontrada.", 404, "company_not_found"); }
  else if (!(await db.agency.findUnique({ where: { id: input.agency_id! }, select: { id: true } }))) throw new ConnectionError("Agência não encontrada.", 404, "agency_not_found");
  const fieldSplit = splitFieldValues(parseFieldDefs(type.fields_json), input.fields);
  const hasData = !!(input.external_id || input.account_label || secret_value || fieldSplit.hasAny);
  const conn = await db.clientConnection.create({
    data: {
      company_id: input.company_id ?? null, agency_id: input.company_id ? null : input.agency_id ?? null, connection_type_id: type.id, provider: type.provider, method, label: (input.label?.trim() || type.name).slice(0, 191),
      account_label: input.account_label ?? null, external_id: input.external_id ?? null, permission_level: input.permission_level ?? levels[0] ?? null,
      field_values_json: fieldSplit.hasAny ? JSON.stringify(fieldSplit.stored) : null,
      scopes_json: input.scopes ? JSON.stringify(input.scopes) : null,
      status: hasData ? "submitted" : "awaiting_submission",
      owner_user_id: input.owner_user_id ?? null, provided_by_user_id: input.provided_by_user_id ?? actor.id, connected_by_user_id: actor.id,
      expires_at: input.expires_at ?? null,
    },
  });
  if (fieldSplit.secrets.length) await storeSecret(db, conn.id, JSON.stringify({ __fields: Object.fromEntries(fieldSplit.secrets), value: secret_value ?? null }));
  else if (secret_value) await storeSecret(db, conn.id, secret_value);
  await logConnection(db, { kind: "created", message: `Conexão "${conn.label}" criada (${method}).`, connectionId: conn.id, companyId: conn.company_id, actor, detail: { type: type.key, method, has_secret: !!secret_value } });
  return conn;
}

export async function updateConnection(db: Db, actor: Actor, id: string, patch: { label?: string; account_label?: string | null; external_id?: string | null; permission_level?: string | null; secret_value?: string | null; fields?: { key: string; value: string }[]; expires_at?: Date | null }) {
  const { secret_value, ...plain } = patch;
  assertNoSecretInPlainFields(plain);
  const conn = await db.clientConnection.findUnique({ where: { id }, include: { connection_type: true } });
  if (!conn) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  if (["revoked", "removed"].includes(conn.status)) throw new ConnectionError("Conexão revogada/removida: crie uma nova.", 409, "connection_closed");
  if (secret_value && !SECRET_METHODS.includes(conn.method as never)) throw new ConnectionError("Este método não usa segredo.", 422, "secret_not_allowed_for_method");
  const fieldSplit = splitFieldValues(parseFieldDefs(conn.connection_type.fields_json), patch.fields);
  const changed = Object.keys(plain).filter((k) => (plain as Record<string, unknown>)[k] !== undefined);
  const needsRevalidation = changed.some((k) => ["external_id", "account_label", "permission_level"].includes(k)) || !!secret_value || fieldSplit.hasAny;
  await db.clientConnection.update({
    where: { id },
    data: {
      ...(patch.label ? { label: patch.label.slice(0, 191) } : {}),
      ...(patch.account_label !== undefined ? { account_label: patch.account_label } : {}),
      ...(patch.external_id !== undefined ? { external_id: patch.external_id } : {}),
      ...(patch.permission_level !== undefined ? { permission_level: patch.permission_level } : {}),
      ...(patch.expires_at !== undefined ? { expires_at: patch.expires_at } : {}),
      ...(fieldSplit.hasAny ? { field_values_json: JSON.stringify({ ...parseStored(conn.field_values_json), ...fieldSplit.stored }) } : {}),
      ...(needsRevalidation && conn.status === "valid" ? { status: "awaiting_validation" } : {}),
      ...(needsRevalidation && ["needs_correction", "incomplete", "invalid", "awaiting_submission"].includes(conn.status) ? { status: "submitted", last_problem: null, correction_needed: null } : {}),
    },
  });
  if (fieldSplit.secrets.length) {
    let prev: { __fields?: Record<string, string>; value?: string | null } = {};
    try { const raw = await readSecretForConnector(db, id); const j = raw ? JSON.parse(raw) : null; if (j && typeof j === "object" && j.__fields) prev = j; else if (raw) prev = { value: raw }; } catch { prev = {}; }
    await storeSecret(db, id, JSON.stringify({ __fields: { ...(prev.__fields ?? {}), ...Object.fromEntries(fieldSplit.secrets) }, value: secret_value ?? prev.value ?? null }));
  } else if (secret_value) await storeSecret(db, id, secret_value);
  await logConnection(db, { kind: "changed", message: `Conexão "${conn.label}" alterada (${changed.concat(secret_value ? ["segredo"] : []).join(", ") || "sem mudanças"}).`, connectionId: id, companyId: conn.company_id, actor, detail: { fields: changed, secret_rotated: !!secret_value } });
  return db.clientConnection.findUniqueOrThrow({ where: { id } });
}

/** Cliente informa que enviou os dados/convite: passa a aguardar validação. */
export async function markSubmitted(db: Db, actor: Actor, id: string) {
  const c = await db.clientConnection.findUnique({ where: { id }, include: { connection_type: true } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  const missing = missingRequiredFields(parseFieldDefs(c.connection_type.fields_json), c.field_values_json);
  if (missing.length) throw new ConnectionError(`Preencha os campos obrigatórios: ${missing.join(", ")}.`, 422, "connection_fields_missing", { missing });
  if (["valid", "revoked", "removed", "expired"].includes(c.status) && c.status !== "expired") throw new ConnectionError(`Conexão já está ${CONNECTION_STATE_LABEL[c.status as ConnectionState].toLowerCase()}.`, 409, "invalid_transition");
  await db.clientConnection.update({ where: { id }, data: { status: "awaiting_validation", last_problem: null, correction_needed: null } });
  await logConnection(db, { kind: "changed", message: `Conexão "${c.label}" enviada para validação.`, connectionId: id, companyId: c.company_id, actor });
}

// ── Autorização de uso (escopo) ─────────────────────────────────────────────
export interface GrantInput { connection_id: string; project_id: string; scope: GrantScope; task_ids?: string[]; executor_user_id?: string | null }

export async function companyOfProject(db: Db, projectId: string): Promise<string | null> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { company_id: true, client_id: true } });
  return p?.company_id ?? p?.client_id ?? null;
}

/** Donos possíveis das conexões do projeto: a empresa cliente e/ou a agência que comprou. */
export async function ownerOfProject(db: Db, projectId: string): Promise<Owner> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { company_id: true, client_id: true, agency_id: true } });
  return { company_id: p?.company_id ?? p?.client_id ?? null, agency_id: p?.agency_id ?? null };
}
export const ownerMatches = (conn: { company_id: string | null; agency_id: string | null }, owner: Owner) =>
  (!!owner.company_id && conn.company_id === owner.company_id) || (!!owner.agency_id && conn.agency_id === owner.agency_id);
export const ownerWhere = (owner: Owner): Prisma.ClientConnectionWhereInput => ({ OR: [...(owner.company_id ? [{ company_id: owner.company_id }] : []), ...(owner.agency_id ? [{ agency_id: owner.agency_id }] : [])] });

/** Quem recebe os avisos do cliente: usuários da empresa; sem empresa, os da agência. */
export async function clientUsersOfProject(db: Db, projectId: string): Promise<string[]> {
  const o = await ownerOfProject(db, projectId);
  const where = o.company_id ? { company_id: o.company_id } : o.agency_id ? { agency_id: o.agency_id } : null;
  return where ? (await db.user.findMany({ where, select: { id: true }, take: 10 })).map((u) => u.id) : [];
}

export async function grantConnection(db: Db, actor: Actor, input: GrantInput) {
  if (!(GRANT_SCOPES as readonly string[]).includes(input.scope)) throw new ConnectionError("Escopo de uso inválido.", 422, "invalid_scope");
  const conn = await db.clientConnection.findUnique({ where: { id: input.connection_id } });
  if (!conn) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  if (["revoked", "removed"].includes(conn.status)) throw new ConnectionError("Conexão revogada/removida: não pode ser autorizada.", 409, "connection_closed");
  const owner = await ownerOfProject(db, input.project_id);
  if (!ownerMatches(conn, owner)) throw new ConnectionError("Esta conexão pertence a outra empresa: não pode ser usada neste projeto.", 403, "connection_other_company");
  const taskIds = [...new Set(input.task_ids ?? [])];
  if (input.scope === "task" && taskIds.length !== 1) throw new ConnectionError("Para \"somente nesta tarefa\" informe exatamente uma tarefa.", 422, "task_required");
  if (input.scope === "selected_tasks" && taskIds.length < 1) throw new ConnectionError("Selecione ao menos uma tarefa.", 422, "tasks_required");
  if (taskIds.length) {
    const n = await db.projectTask.count({ where: { id: { in: taskIds }, project_id: input.project_id } });
    if (n !== taskIds.length) throw new ConnectionError("Alguma tarefa não pertence a este projeto.", 422, "task_not_in_project");
  }
  const created = [];
  const rows = input.scope === "project" ? [null] : taskIds;
  for (const taskId of rows) {
    const existing = await db.clientConnectionGrant.findFirst({ where: { connection_id: conn.id, project_id: input.project_id, project_task_id: taskId, executor_user_id: input.executor_user_id ?? null, revoked_at: null } });
    if (existing) { created.push(existing); continue; }
    created.push(await db.clientConnectionGrant.create({
      data: { connection_id: conn.id, project_id: input.project_id, scope: taskId ? input.scope : "project", project_task_id: taskId, executor_user_id: input.executor_user_id ?? null, granted_by_user_id: actor.id },
    }));
  }
  await logConnection(db, { kind: "authorized", message: `Uso de "${conn.label}" autorizado (${input.scope}${taskIds.length ? `, ${taskIds.length} tarefa(s)` : ""}).`, connectionId: conn.id, companyId: conn.company_id, projectId: input.project_id, actor, detail: { scope: input.scope, task_ids: taskIds, executor_user_id: input.executor_user_id ?? null } });
  return created;
}

/** Reduz/revoga a autorização de uso (todas as do projeto, ou só as de certas tarefas). */
export async function revokeGrants(db: Db, actor: Actor, p: { connection_id: string; project_id: string; task_ids?: string[]; reason?: string }) {
  const conn = await db.clientConnection.findUnique({ where: { id: p.connection_id } });
  if (!conn) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  const where: Prisma.ClientConnectionGrantWhereInput = { connection_id: p.connection_id, project_id: p.project_id, revoked_at: null, ...(p.task_ids?.length ? { project_task_id: { in: p.task_ids } } : {}) };
  const res = await db.clientConnectionGrant.updateMany({ where, data: { revoked_at: new Date(), revoked_by_user_id: actor.id, revoke_reason: p.reason ?? null } });
  await logConnection(db, { kind: "revoked", message: `Autorização de uso de "${conn.label}" ${p.task_ids?.length ? "reduzida" : "removida do projeto"}${p.reason ? `: ${safeText(p.reason)}` : ""}.`, connectionId: conn.id, companyId: conn.company_id, projectId: p.project_id, actor, detail: { task_ids: p.task_ids ?? null, count: res.count } });
  return res.count;
}

/** Onde a conexão está sendo usada. */
export async function usageOf(db: Db, connectionId: string) {
  const grants = await db.clientConnectionGrant.findMany({ where: { connection_id: connectionId, revoked_at: null } });
  const reqs = await db.projectConnectionRequirement.findMany({ where: { connection_id: connectionId } });
  const projectIds = [...new Set([...grants.map((g) => g.project_id), ...reqs.map((r) => r.project_id)])];
  const projects = await db.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, title: true, project_code: true } });
  const taskIds = [...new Set(grants.map((g) => g.project_task_id).filter((x): x is string => !!x))];
  const tasks = taskIds.length ? await db.projectTask.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true, project_id: true } }) : [];
  return {
    projects: projects.map((p) => ({ ...p, scope: grants.filter((g) => g.project_id === p.id).map((g) => ({ scope: g.scope, task_id: g.project_task_id })) })),
    tasks, requirements: reqs.map((r) => ({ id: r.id, label: r.label, project_id: r.project_id, project_product_id: r.project_product_id, status: r.status })),
  };
}

/** A conexão está autorizada para esta tarefa (mesmo projeto e dentro do escopo)? Outro projeto NUNCA herda. */
export async function grantCovers(db: Db, connectionId: string, projectId: string, taskId: string, executorId?: string | null, executorBound = false): Promise<boolean> {
  const grants = await db.clientConnectionGrant.findMany({ where: { connection_id: connectionId, project_id: projectId, revoked_at: null, OR: [{ project_task_id: null }, { project_task_id: taskId }] } });
  if (grants.length === 0) return false;
  if (!executorBound || !executorId) return true;
  return grants.some((g) => g.executor_user_id === executorId);
}

/** Procura conexão compatível já existente (mesma empresa e tipo) antes de pedir uma nova. */
export async function findReusableConnections(db: Db, owner: Owner, connectionTypeId: number, projectId?: string | null) {
  if (!owner.company_id && !owner.agency_id) return [];
  const rows = await db.clientConnection.findMany({
    where: { AND: [ownerWhere(owner), { connection_type_id: connectionTypeId, status: { notIn: ["revoked", "removed"] } }] },
    include: { grants: { where: { revoked_at: null } } },
    orderBy: { updated_at: "desc" },
  });
  return rows.map((c) => ({
    id: c.id, label: c.label, account_label: c.account_label, external_id: c.external_id, status: c.status, status_label: CONNECTION_STATE_LABEL[c.status as ConnectionState] ?? c.status,
    permission_level: c.permission_level, valid_now: connectionSatisfies(c),
    authorized_in_project: projectId ? c.grants.some((g) => g.project_id === projectId) : false,
    authorized_elsewhere: c.grants.some((g) => g.project_id !== projectId),
  }));
}

// ── Validação ───────────────────────────────────────────────────────────────
export interface ValidationInput {
  result: "valid" | "incomplete" | "invalid" | "needs_correction";
  evidence?: string | null; problem?: string | null; correction_needed?: string | null; next_revalidation_at?: Date | null; mode?: "manual" | "automatic" | "automatic_with_human";
  integration?: string | null;
  /** Nova data de expiração ao validar (renovação). Sem ela, uma data já vencida é limpa. */
  expires_at?: Date | null;
}

async function affectedTasks(db: Db, connectionId: string) {
  const reqs = await db.projectConnectionRequirement.findMany({ where: { connection_id: connectionId }, select: { id: true } });
  if (!reqs.length) return [];
  const rules = await db.projectDependencyRule.findMany({ where: { target_connection_req_id: { in: reqs.map((r) => r.id) } }, select: { task_id: true } });
  return [...new Set(rules.map((r) => r.task_id))];
}

/** Grava o resultado de uma validação. A IA NUNCA chama isto (só pessoa autorizada ou integração oficial). */
export async function recordValidation(db: Db, actor: Actor, connectionId: string, v: ValidationInput) {
  if (!actor.id && !actor.integration) throw new ConnectionError("Toda validação precisa de um responsável (pessoa ou integração oficial).", 422, "validator_required");
  if (actor.role === "ai") throw new ConnectionError("A IA não pode validar conexões.", 403, "ai_cannot_validate");
  const c = await db.clientConnection.findUnique({ where: { id: connectionId } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  if (["revoked", "removed"].includes(c.status)) throw new ConnectionError("Conexão revogada/removida.", 409, "connection_closed");
  if (v.result === "valid" && !v.evidence?.trim()) throw new ConnectionError("Informe a evidência da validação (o que foi conferido).", 422, "evidence_required");
  if (v.result !== "valid" && !(v.problem?.trim() || v.correction_needed?.trim())) throw new ConnectionError("Descreva o problema encontrado e a correção necessária.", 422, "problem_required");
  const tasks = await affectedTasks(db, connectionId);
  const status: ConnectionState = v.result === "valid" ? "valid" : v.result;
  await db.clientConnectionValidation.create({
    data: {
      connection_id: connectionId, mode: v.mode ?? (actor.integration ? "automatic" : "manual"), result: v.result, actor_user_id: actor.id, actor_integration: actor.integration ?? null,
      evidence: v.evidence ? safeText(v.evidence) : null, problem: v.problem ? safeText(v.problem) : null, correction_needed: v.correction_needed ? safeText(v.correction_needed) : null,
      next_revalidation_at: v.next_revalidation_at ?? null, affected_tasks_json: JSON.stringify(tasks),
    },
  });
  await db.clientConnection.update({
    where: { id: connectionId },
    data: {
      status, last_problem: v.result === "valid" ? null : safeText(v.problem ?? ""), correction_needed: v.result === "valid" ? null : safeText(v.correction_needed ?? ""),
      evidence: v.evidence ? safeText(v.evidence) : c.evidence,
      ...(v.result === "valid" ? { last_validated_at: new Date(), validated_by_user_id: actor.id, validated_by_integration: actor.integration ?? null, next_revalidation_at: v.next_revalidation_at ?? null, expires_at: v.expires_at !== undefined ? v.expires_at : c.expires_at && c.expires_at > new Date() ? c.expires_at : null } : {}),
    },
  });
  await logConnection(db, { kind: "validated", message: `Validação de "${c.label}": ${CONNECTION_STATE_LABEL[status]}.`, connectionId, companyId: c.company_id, actor, detail: { result: v.result, mode: v.mode ?? (actor.integration ? "automatic" : "manual"), tasks_affected: tasks.length } });
  return { status, affected_task_ids: tasks };
}

/** O modo de validação mais exigente entre as exigências ligadas à conexão (manual > automática+humana > automática). */
async function strictestMode(db: Db, connectionId: string, typeAuto: boolean): Promise<"manual" | "automatic_with_human" | "automatic"> {
  const reqs = await db.projectConnectionRequirement.findMany({ where: { connection_id: connectionId }, select: { requirement_id: true } });
  const defs = reqs.length ? await db.catalog2ConnectionRequirement.findMany({ where: { id: { in: reqs.map((r) => r.requirement_id) } }, select: { validation_mode: true } }) : [];
  const modes = defs.map((d) => d.validation_mode);
  if (modes.includes("manual")) return "manual";
  if (modes.includes("automatic_with_human")) return "automatic_with_human";
  if (modes.length && modes.every((m) => m === "automatic")) return "automatic";
  return typeAuto ? "automatic_with_human" : "manual";
}

/**
 * Validação AUTOMÁTICA pelo conector do provedor. Conector indisponível/não configurado NÃO altera o estado (nada de sucesso simulado).
 * Só vira "válida" sozinha se a exigência estiver em modo automático; em "automática com confirmação humana" fica aguardando a pessoa.
 */
export async function runAutoValidation(db: Db, connectionId: string): Promise<{ outcome: VerifyResult["outcome"]; status: ConnectionState; result: VerifyResult }> {
  const c = await db.clientConnection.findUnique({ where: { id: connectionId }, include: { connection_type: true } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  const connector = getConnector(c.connection_type.integration_key);
  // Integração sem a configuração externa necessária: não tenta verificar (nada de sucesso simulado) — a validação é humana.
  const cfg = connectorStatus(connector);
  const result: VerifyResult = cfg.state === "not_configured"
    ? { outcome: "not_configured", scopes: [], problem: `Integração com ${connector.label} ainda não configurada neste ambiente (faltam: ${cfg.missing.join(", ")}): a validação precisa ser manual.` }
    : await connector.verify(db, { id: c.id, external_id: c.external_id, account_label: c.account_label, permission_level: c.permission_level, scopes: parseJsonArray<string>(c.scopes_json) });
  const actor: Actor = { id: null, integration: connector.key, role: "integration" };
  if (result.outcome === "provider_unavailable" || result.outcome === "not_configured") {
    await db.clientConnectionValidation.create({ data: { connection_id: c.id, mode: "automatic", result: result.outcome, actor_integration: connector.key, problem: result.problem ? safeText(result.problem) : null } });
    await logConnection(db, { kind: "validated", message: `Validação automática de "${c.label}" não concluída: ${safeText(result.problem ?? result.outcome)}`, connectionId: c.id, companyId: c.company_id, actor, detail: { outcome: result.outcome } });
    return { outcome: result.outcome, status: c.status as ConnectionState, result };
  }
  if (result.scopes?.length) await db.clientConnection.update({ where: { id: c.id }, data: { scopes_json: JSON.stringify(result.scopes) } });
  const mode = await strictestMode(db, c.id, c.connection_type.supports_auto_validation);
  if (result.outcome === "valid") {
    if (mode === "automatic") {
      await recordValidation(db, actor, c.id, { result: "valid", evidence: result.evidence ?? "Confirmado pela integração oficial.", mode: "automatic" });
      return { outcome: "valid", status: "valid", result };
    }
    // confirmação humana pendente: guarda a evidência da integração e aguarda a pessoa
    await db.clientConnectionValidation.create({ data: { connection_id: c.id, mode: "automatic_with_human", result: "awaiting_human", actor_integration: connector.key, evidence: result.evidence ? safeText(result.evidence) : null } });
    await db.clientConnection.update({ where: { id: c.id }, data: { status: "awaiting_validation", evidence: result.evidence ? safeText(result.evidence) : c.evidence, last_problem: null } });
    await logConnection(db, { kind: "validated", message: `A integração confirmou "${c.label}"; falta a confirmação humana.`, connectionId: c.id, companyId: c.company_id, actor, detail: { mode } });
    return { outcome: "valid", status: "awaiting_validation", result };
  }
  const status = await recordValidation(db, actor, c.id, { result: result.outcome as "incomplete" | "invalid" | "needs_correction", problem: result.problem ?? "Verificação automática falhou.", correction_needed: result.correction ?? "Revise a conexão.", evidence: result.evidence, mode: "automatic" });
  return { outcome: result.outcome, status: status.status, result };
}

// ── OAuth ───────────────────────────────────────────────────────────────────
export async function startOAuth(db: Db, actor: Actor, connectionId: string, permission?: string | null) {
  const c = await db.clientConnection.findUnique({ where: { id: connectionId }, include: { connection_type: true } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  const connector = getConnector(c.connection_type.integration_key);
  if (!connector.supportsOAuth || !connector.buildAuthUrl) throw new ConnectionError("Este tipo de conexão não usa OAuth.", 422, "oauth_not_supported");
  const st = connectorStatus(connector);
  if (st.state === "not_configured") throw new ConnectionError("A integração com este provedor ainda não está configurada neste ambiente.", 503, "connector_not_configured", { missing: st.missing });
  const state = signOAuthState({ connection_id: c.id, user_id: actor.id ?? "", integration: connector.key });
  const url = connector.buildAuthUrl({ state, redirectUri: oauthRedirectUri(), permission: permission ?? c.permission_level });
  await logConnection(db, { kind: "oauth_started", message: `Autorização OAuth iniciada para "${c.label}".`, connectionId: c.id, companyId: c.company_id, actor });
  return { url, scopes: connector.scopesFor(permission ?? c.permission_level) };
}

export async function completeOAuth(db: Db, p: { state: string; code?: string | null; error?: string | null }) {
  const st = verifyOAuthState(p.state); // expirado → ConnectionError 410 oauth_expired
  const c = await db.clientConnection.findUnique({ where: { id: st.connection_id }, include: { connection_type: true } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  const actor: Actor = { id: st.user_id || null, role: "client" };
  if (p.error || !p.code) {
    await db.clientConnection.update({ where: { id: c.id }, data: { status: "awaiting_submission", last_problem: "A autorização foi cancelada ou negada.", correction_needed: "Inicie a conexão de novo e aceite as permissões solicitadas." } });
    await logConnection(db, { kind: "oauth_cancelled", message: `Autorização OAuth de "${c.label}" cancelada (${safeText(p.error ?? "sem código")}).`, connectionId: c.id, companyId: c.company_id, actor });
    throw new ConnectionError("A autorização foi cancelada. Nada foi conectado.", 409, "oauth_cancelled");
  }
  const connector = getConnector(c.connection_type.integration_key);
  if (!connector.exchangeCode) throw new ConnectionError("Este tipo de conexão não usa OAuth.", 422, "oauth_not_supported");
  try {
    const tok = await connector.exchangeCode(p.code, oauthRedirectUri());
    await storeSecret(db, c.id, JSON.stringify({ access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: Date.now() + (tok.expires_in ?? 3600) * 1000 }));
    await db.clientConnection.update({ where: { id: c.id }, data: { status: "awaiting_validation", connected_by_user_id: actor.id, scopes_json: tok.scope ? JSON.stringify(String(tok.scope).split(" ")) : c.scopes_json, last_problem: null, correction_needed: null } });
    await logConnection(db, { kind: "authorized", message: `Autorização OAuth de "${c.label}" concluída.`, connectionId: c.id, companyId: c.company_id, actor });
  } catch (e) {
    await db.clientConnection.update({ where: { id: c.id }, data: { status: "awaiting_submission", last_problem: safeText((e as Error).message) } });
    await logConnection(db, { kind: "oauth_failed", message: `Falha ao concluir a autorização de "${c.label}": ${safeText((e as Error).message)}`, connectionId: c.id, companyId: c.company_id, actor });
    throw e instanceof ConnectionError ? e : new ConnectionError("Não foi possível concluir a autorização no provedor. Tente novamente.", 502, "oauth_failed");
  }
  return runAutoValidation(db, c.id);
}

/** Google Ads: pede o vínculo da conta gerenciadora da Allka; o cliente aceita no Google Ads. */
export async function requestManagerLink(db: Db, actor: Actor, connectionId: string) {
  const c = await db.clientConnection.findUnique({ where: { id: connectionId }, include: { connection_type: true } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  const connector = getConnector(c.connection_type.integration_key);
  if (!connector.requestLink) throw new ConnectionError("Este tipo não usa vínculo de conta gerenciadora.", 422, "link_not_supported");
  if (connectorStatus(connector).state === "not_configured") throw new ConnectionError("A conta gerenciadora da Allka ainda não está configurada neste ambiente.", 503, "connector_not_configured", { missing: connectorStatus(connector).missing });
  if (!c.external_id) throw new ConnectionError("Informe o ID da conta do Google Ads.", 422, "external_id_required");
  const r = await connector.requestLink(c.external_id);
  const map: Record<string, ConnectionState> = { pending: "awaiting_submission", active: "awaiting_validation", refused: "needs_correction", removed: "removed" };
  await db.clientConnection.update({ where: { id: c.id }, data: { status: map[r.status], evidence: safeText(r.detail ?? r.status), last_problem: r.status === "refused" ? safeText(r.detail ?? "Vínculo recusado.") : null } });
  await logConnection(db, { kind: "requested", message: `Solicitação de vínculo da conta gerenciadora para "${c.label}": ${r.status}.`, connectionId: c.id, companyId: c.company_id, actor, detail: { link: r.status } });
  return r;
}

/** Revoga a conexão: apaga o segredo cifrado, encerra todas as autorizações de uso e registra. */
export async function revokeConnection(db: Db, actor: Actor, id: string, reason: string, opts: { removedExternally?: boolean } = {}) {
  const c = await db.clientConnection.findUnique({ where: { id } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  const tasks = await affectedTasks(db, id);
  await revokeSecret(db, id);
  await db.clientConnectionGrant.updateMany({ where: { connection_id: id, revoked_at: null }, data: { revoked_at: new Date(), revoked_by_user_id: actor.id, revoke_reason: safeText(reason) } });
  await db.clientConnection.update({ where: { id }, data: { status: opts.removedExternally ? "removed" : "revoked", revoked_at: new Date(), revoked_by_user_id: actor.id, revoke_reason: safeText(reason), secret_ref: null } });
  await logConnection(db, { kind: "revoked", message: `Conexão "${c.label}" ${opts.removedExternally ? "removida no provedor" : "revogada"}: ${safeText(reason)}.`, connectionId: id, companyId: c.company_id, actor, detail: { tasks_affected: tasks.length } });
  return { affected_task_ids: tasks };
}

/** Expira o que venceu (expires_at / próxima revalidação). Devolve as conexões afetadas. */
export async function expireDueConnections(db: Db, now = new Date()): Promise<string[]> {
  const due = await db.clientConnection.findMany({
    where: { status: "valid", OR: [{ expires_at: { lte: now } }, { next_revalidation_at: { lte: now } }] }, select: { id: true, label: true, company_id: true, expires_at: true },
  });
  for (const c of due) {
    await db.clientConnection.update({ where: { id: c.id }, data: { status: "expired", last_problem: "A conexão expirou.", correction_needed: "Renove ou reconecte para continuar." } });
    await logConnection(db, { kind: "expired", message: `Conexão "${c.label}" expirou.`, connectionId: c.id, companyId: c.company_id, actor: { id: null, integration: "system", role: "system" } });
  }
  return due.map((c) => c.id);
}

export async function listEvents(db: Db, filter: { connectionId?: string; projectId?: string; pcrId?: string; taskId?: string }, limit = 200) {
  return db.connectionEvent.findMany({
    where: { ...(filter.connectionId ? { connection_id: filter.connectionId } : {}), ...(filter.projectId ? { project_id: filter.projectId } : {}), ...(filter.pcrId ? { project_connection_req_id: filter.pcrId } : {}), ...(filter.taskId ? { project_task_id: filter.taskId } : {}) },
    orderBy: { created_at: "desc" }, take: limit,
  });
}
