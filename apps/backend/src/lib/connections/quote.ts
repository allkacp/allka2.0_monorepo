// Conexões na CONTRATAÇÃO (antes do pagamento): o que será exigido, escolhas do cliente (rascunho) e a trava opcional do checkout.
import type { Prisma, PrismaClient } from "@prisma/client";
import { ConnectionError, CONNECTION_STATE_LABEL, DEPENDENCY_KIND_LABEL, GRANT_SCOPES, HANDLINGS, OBLIGATION_LABEL, WHEN_NEEDED_LABEL, METHOD_MESSAGE, parseJsonArray, type ConnectionState } from "./catalog";
import { findReusableConnections, ownerMatches, type Owner } from "./core";
import { assertNoSecretInPlainFields, safeText } from "./secrets";
import { CONNECTION_METHOD_LABEL } from "./catalog";

type Db = PrismaClient | Prisma.TransactionClient;

/** A conta que contrata é a dona das conexões que escolher: empresa ou agência. */
export const quoteOwner = (q: { account_kind: string; account_id: string }): Owner => (q.account_kind === "company" ? { company_id: q.account_id } : q.account_kind === "agency" ? { agency_id: q.account_id } : {});

/** Versão sem o módulo ativado → lista vazia (nada aparece para o cliente, nada bloqueia). */
export async function quoteRequirementsView(db: Db, quote: { id: string; version_id: string; account_kind: string; account_id: string }) {
  const version = await db.catalog2ProductVersion.findUnique({ where: { id: quote.version_id }, select: { requires_connections: true } });
  if (!version?.requires_connections) return { requires_connections: false, message: null, data: [] };
  const reqs = await db.catalog2ConnectionRequirement.findMany({ where: { version_id: quote.version_id, visible_to_client: true }, include: { connection_type: true, dependencies: true }, orderBy: { sort_order: "asc" } });
  const tasks = await db.catalog2Task.findMany({ where: { version_id: quote.version_id }, select: { key: true, name: true } });
  const taskName = new Map(tasks.map((t) => [t.key, t.name]));
  const choices = await db.connectionQuoteChoice.findMany({ where: { quote_id: quote.id } });
  const owner = quoteOwner(quote);
  const data = [];
  for (const r of reqs) {
    const choice = choices.find((c) => c.requirement_id === r.id) ?? null;
    data.push({
      requirement_id: r.id, key: r.key, label: r.label || r.connection_type.name, connection_type: { id: r.connection_type.id, key: r.connection_type.key, name: r.connection_type.name, icon: r.connection_type.icon },
      reason: r.reason, when_needed: r.when_needed, when_label: WHEN_NEEDED_LABEL[r.when_needed as keyof typeof WHEN_NEEDED_LABEL], obligation: r.obligation, obligation_label: OBLIGATION_LABEL[r.obligation as keyof typeof OBLIGATION_LABEL],
      method: r.method, method_label: CONNECTION_METHOD_LABEL[r.method as keyof typeof CONNECTION_METHOD_LABEL], permission_level: r.permission_level,
      affected_activities: r.dependencies.map((d) => ({ task_key: d.task_key, task_name: taskName.get(d.task_key) ?? d.task_key, step_key: d.step_key, kind: d.kind, kind_label: DEPENDENCY_KIND_LABEL[d.kind as keyof typeof DEPENDENCY_KIND_LABEL] })),
      can_do_later: r.pending_behavior !== "block_checkout", pending_behavior: r.pending_behavior,
      instructions: [r.connection_type.default_instructions, r.instructions].filter(Boolean),
      default_grant_scope: r.default_grant_scope, allowed_methods: parseJsonArray<string>(r.connection_type.allowed_methods_json), permission_levels: parseJsonArray<{ key: string; label: string }>(r.connection_type.permission_levels_json),
      reuse_candidates: await findReusableConnections(db, owner, r.connection_type_id, null),
      choice: choice ? { handling: choice.handling, connection_id: choice.connection_id, grant_scope: choice.grant_scope, responsible_user_id: choice.responsible_user_id, responsible_name: choice.responsible_name, invited_email: choice.invited_email } : null,
    });
  }
  return { requires_connections: true, message: METHOD_MESSAGE, data };
}

export interface QuoteChoiceInput { handling: (typeof HANDLINGS)[number]; connection_id?: string | null; grant_scope?: (typeof GRANT_SCOPES)[number] | null; task_keys?: string[]; responsible_user_id?: string | null; responsible_name?: string | null; invited_email?: string | null; draft?: unknown }

/** Salva a escolha do cliente (rascunho): usar conexão existente, fazer depois, responsável, convite. Nada é bloqueado aqui. */
export async function saveQuoteChoice(db: Db, quote: { id: string; version_id: string; account_kind: string; account_id: string }, requirementId: string, userId: string, input: QuoteChoiceInput) {
  assertNoSecretInPlainFields(input);
  const req = await db.catalog2ConnectionRequirement.findFirst({ where: { id: requirementId, version_id: quote.version_id }, select: { id: true, connection_type_id: true, pending_behavior: true } });
  if (!req) throw new ConnectionError("Esta exigência não pertence ao produto da cotação.", 404, "requirement_not_found");
  if (input.handling === "later" && req.pending_behavior === "block_checkout" && !input.connection_id) throw new ConnectionError("Esta conexão precisa ser enviada para concluir a contratação.", 409, "connection_required_now");
  if (input.connection_id) {
    const c = await db.clientConnection.findUnique({ where: { id: input.connection_id }, select: { company_id: true, agency_id: true, connection_type_id: true, status: true } });
    if (!c || !ownerMatches(c, quoteOwner(quote))) throw new ConnectionError("Conexão não encontrada para esta conta.", 404, "connection_not_found");
    if (c.connection_type_id !== req.connection_type_id) throw new ConnectionError("Esta conexão é de outro tipo.", 422, "connection_type_mismatch");
    if (["revoked", "removed"].includes(c.status)) throw new ConnectionError("Esta conexão foi revogada/removida.", 409, "connection_closed");
  }
  const draft = input.task_keys?.length || input.draft !== undefined ? JSON.stringify({ ...(input.grant_scope ? { grant_scope: input.grant_scope } : {}), ...(input.task_keys?.length ? { task_keys: input.task_keys } : {}), ...(input.draft !== undefined ? { draft: input.draft } : {}) }) : null;
  const data = { handling: input.handling, connection_id: input.connection_id ?? null, grant_scope: input.grant_scope ?? null, responsible_user_id: input.responsible_user_id ?? null, responsible_name: input.responsible_name ?? null, invited_email: input.invited_email ?? null, draft_json: draft ? safeText(draft) : null, created_by_user_id: userId };
  return db.connectionQuoteChoice.upsert({ where: { quote_id_requirement_id: { quote_id: quote.id, requirement_id: requirementId } }, create: { quote_id: quote.id, requirement_id: requirementId, ...data }, update: data });
}

/** Trava opcional: só quando a exigência foi configurada como "bloquear a conclusão da contratação". */
export async function assertConnectionsForCheckout(db: Db, quoteIds: string[]): Promise<void> {
  const missing: { quote_id: string; requirement: string }[] = [];
  for (const qid of quoteIds) {
    const quote = await db.catalog2Quote.findUnique({ where: { id: qid }, select: { id: true, version_id: true } });
    if (!quote) continue;
    const version = await db.catalog2ProductVersion.findUnique({ where: { id: quote.version_id }, select: { requires_connections: true } });
    if (!version?.requires_connections) continue;
    const reqs = await db.catalog2ConnectionRequirement.findMany({ where: { version_id: quote.version_id, pending_behavior: "block_checkout", obligation: "required" }, include: { connection_type: true } });
    for (const r of reqs) {
      const choice = await db.connectionQuoteChoice.findUnique({ where: { quote_id_requirement_id: { quote_id: qid, requirement_id: r.id } } });
      const conn = choice?.connection_id ? await db.clientConnection.findUnique({ where: { id: choice.connection_id }, select: { status: true } }) : null;
      const ok = !!conn && ["submitted", "awaiting_validation", "valid"].includes(conn.status);
      if (!ok) missing.push({ quote_id: qid, requirement: r.label || r.connection_type.name });
    }
  }
  if (missing.length) throw new ConnectionError(`Para concluir a contratação, envie: ${[...new Set(missing.map((m) => m.requirement))].join(", ")}. Você não precisa compartilhar senhas — use uma conexão oficial.`, 409, "connections_required_for_checkout", { missing });
}

void CONNECTION_STATE_LABEL; void ({} as ConnectionState);

/** Resumo para a página do produto (antes da cotação): sem módulo ativado → { requires_connections:false } e nada é mostrado. */
export async function connectionsPreviewForClient(db: Db, versionId: string) {
  const view = await quoteRequirementsView(db, { id: "preview", version_id: versionId, account_kind: "preview", account_id: "" });
  return {
    requires_connections: view.requires_connections,
    message: view.message,
    items: view.data.map((r) => ({ label: r.label, reason: r.reason, when_label: r.when_label, obligation_label: r.obligation_label, method_label: r.method_label, permission_level: r.permission_level, affected_activities: r.affected_activities.map((a) => a.task_name), can_do_later: r.can_do_later })),
  };
}
