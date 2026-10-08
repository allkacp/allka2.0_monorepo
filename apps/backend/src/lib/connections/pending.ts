// Pendências acionáveis, lembretes com escalonamento e a orientação da IA (sem autonomia decisória).
import type { Prisma, PrismaClient } from "@prisma/client";
import { CONNECTION_METHOD_LABEL, CONNECTION_STATE_LABEL, DEPENDENCY_KIND_LABEL, WHEN_NEEDED_LABEL, parseJsonArray, type ConnectionState } from "./catalog";
import { evaluateConnectionRule, PAUSED_STATUS } from "./flow";
import { clientUsersOfProject, logConnection } from "./core";
import { safeText } from "./secrets";

type Db = PrismaClient | Prisma.TransactionClient;

export interface Viewer { id: string; role?: string | null; account_type?: string | null }
export type ViewerKind = "admin" | "leader" | "nomad" | "agency" | "company" | "other";

export function viewerKind(v: Viewer): ViewerKind {
  const r = v.role ?? "", a = v.account_type ?? "";
  if (a === "admin" || r === "admin") return "admin";
  if (a === "lider" || r === "lider") return "leader";
  if (a === "nomades" || r === "nomad") return "nomad";
  if (a === "agencias" || r === "agency_admin" || r === "agency_user") return "agency";
  if (a === "empresas" || r === "company_admin" || r === "company_user") return "company";
  return "other";
}

const DONE_STATES = ["valid", "dispensed"];

interface PendingItem {
  id: string; label: string; connection_type: { id: number; key: string; name: string };
  product: string | null; project: { id: string; title: string; code: string | null };
  tasks: { id: string; title: string; kind: string | null; kind_label: string; state: string; reason: string }[];
  responsible: { user_id: string | null; name: string | null; party: string };
  status: string; status_label: string; problem: string | null; correction: string | null;
  pending_since: Date; pending_minutes: number; last_request_at: Date | null; reminder_count: number;
  impact: string; paused_tasks: number; action: { kind: string; label: string; url: string };
  when_needed: string; when_label: string; method: string; method_label: string; permission_level: string; handling: string; light_check_pending: boolean; connection_id: string | null;
}

/** Itens pendentes (um por conexão exigida), já filtrados pela visão de quem pergunta. */
export async function listPendingItems(db: Db, viewer: Viewer, filter: { projectId?: string; includeDone?: boolean } = {}): Promise<PendingItem[]> {
  const kind = viewerKind(viewer);
  const user = await db.user.findUnique({ where: { id: viewer.id }, select: { company_id: true, agency_id: true } });
  const myNomadeId = kind === "nomad" ? (await db.nomade.findUnique({ where: { user_id: viewer.id }, select: { id: true } }))?.id ?? null : null;
  const pcrs = await db.projectConnectionRequirement.findMany({
    where: { condition_active: true, ...(filter.projectId ? { project_id: filter.projectId } : {}) },
    orderBy: { created_at: "asc" },
  });
  const out: PendingItem[] = [];
  for (const pcr of pcrs) {
    const rules = await db.projectDependencyRule.findMany({ where: { target_connection_req_id: pcr.id, target_kind: "connection" } });
    const tasks = rules.length ? await db.projectTask.findMany({ where: { id: { in: rules.map((r) => r.task_id) } }, select: { id: true, title: true, status: true, nomade_responsavel_id: true, lider_responsavel_id: true } }) : [];
    const evals = await Promise.all(rules.map(async (r) => ({ r, e: await evaluateConnectionRule(db, r), t: tasks.find((t) => t.id === r.task_id)! })));
    const unmet = evals.filter((x) => !x.e.satisfied);
    const done = DONE_STATES.includes(pcr.status) && unmet.length === 0 && !pcr.light_check_pending;
    if (done && !filter.includeDone) continue;
    const project = await db.project.findUnique({ where: { id: pcr.project_id }, select: { id: true, title: true, project_code: true, company_id: true, client_id: true, agency_id: true } });
    if (!project) continue;
    // visão por perfil
    if (kind === "company" && !(user?.company_id && (project.company_id === user.company_id || project.client_id === user.company_id))) continue;
    if (kind === "agency" && !(user?.agency_id && project.agency_id === user.agency_id)) continue;
    if (kind === "leader" && !tasks.some((t) => t.lider_responsavel_id === viewer.id)) continue;
    if (kind === "nomad" && !(myNomadeId && tasks.some((t) => t.nomade_responsavel_id === myNomadeId))) continue;
    if (kind === "other") continue;
    const def = await db.catalog2ConnectionRequirement.findUnique({ where: { id: pcr.requirement_id }, include: { connection_type: true } });
    if (!def) continue;
    if (!def.visible_to_client && (kind === "company" || kind === "agency")) continue;
    const ppRow = await db.projectProduct.findUnique({ where: { id: pcr.project_product_id }, select: { catalog2_product_id: true } });
    const prod = ppRow?.catalog2_product_id ? await db.catalog2Product.findUnique({ where: { id: ppRow.catalog2_product_id }, select: { internal_name: true } }) : null;
    const conn = pcr.connection_id ? await db.clientConnection.findUnique({ where: { id: pcr.connection_id } }) : null;
    const paused = tasks.filter((t) => t.status === PAUSED_STATUS).length;
    const external = kind === "company" || kind === "agency";
    const state = (conn?.status ?? pcr.status) as ConnectionState;
    const needsAuth = unmet.some((x) => x.e.state === "not_authorized");
    const action = (() => {
      const base = `/conexoes?pendencia=${pcr.id}`;
      if (pcr.light_check_pending) return { kind: "light_check", label: external ? "Aguardando conferência da Allka" : "Fazer conferência leve", url: base };
      if (!conn) return { kind: "connect", label: external ? "Conectar agora" : "Cobrar o cliente", url: base };
      if (needsAuth) return { kind: "authorize", label: external ? "Autorizar o uso" : "Autorizar executor/uso", url: base };
      if (["needs_correction", "incomplete", "invalid"].includes(state)) return { kind: "fix", label: external ? "Corrigir a conexão" : "Ver correção pedida", url: base };
      if (["expired", "revoked", "removed"].includes(state)) return { kind: "reconnect", label: "Reconectar", url: base };
      if (["submitted", "awaiting_validation"].includes(state)) return { kind: external ? "wait" : "validate", label: external ? "Aguardando validação" : "Validar conexão", url: base };
      return { kind: "connect", label: "Conectar agora", url: base };
    })();
    const since = pcr.last_request_at ?? pcr.created_at;
    out.push({
      id: pcr.id, label: pcr.label, connection_type: { id: def.connection_type.id, key: def.connection_type.key, name: def.connection_type.name },
      product: prod?.internal_name ?? null, project: { id: project.id, title: project.title, code: project.project_code ?? null },
      tasks: (unmet.length ? unmet : evals).map((x) => ({ id: x.t.id, title: x.t.title, kind: x.r.connection_dep_kind, kind_label: DEPENDENCY_KIND_LABEL[(x.r.connection_dep_kind ?? "start") as keyof typeof DEPENDENCY_KIND_LABEL] ?? "", state: x.e.state, reason: x.e.reason })),
      responsible: { user_id: pcr.responsible_user_id, name: pcr.responsible_name, party: external ? "client" : "client" },
      status: state, status_label: CONNECTION_STATE_LABEL[state] ?? state, problem: conn?.last_problem ?? null, correction: conn?.correction_needed ?? null,
      pending_since: since, pending_minutes: Math.max(0, Math.round((Date.now() - since.getTime()) / 60_000)), last_request_at: pcr.last_request_at, reminder_count: pcr.reminder_count,
      impact: unmet.some((x) => x.r.behavior !== "alert_only") ? `${unmet.filter((x) => x.r.behavior !== "alert_only").length} atividade(s) bloqueada(s)${paused ? `, ${paused} pausada(s) por dependência externa` : ""}.` : "Sem atividade bloqueada no momento (somente informativa).",
      paused_tasks: paused, action, when_needed: def.when_needed, when_label: WHEN_NEEDED_LABEL[def.when_needed as keyof typeof WHEN_NEEDED_LABEL] ?? def.when_needed,
      method: def.method, method_label: CONNECTION_METHOD_LABEL[def.method as keyof typeof CONNECTION_METHOD_LABEL] ?? def.method, permission_level: def.permission_level,
      handling: pcr.handling, light_check_pending: pcr.light_check_pending, connection_id: pcr.connection_id,
    });
  }
  return out;
}

// ── Lembretes ────────────────────────────────────────────────────────────────
const DEFAULT_INTERVAL_H = 72, DEFAULT_LIMIT = 5, DEFAULT_ESCALATE_AFTER = 3;

/** Envia os lembretes devidos. Para sozinho quando a exigência é resolvida (válida/dispensada) ou o limite é atingido; escalona ao líder/admin. */
export async function runConnectionReminders(db: Db, now = new Date(), opts: { pcrIds?: string[] } = {}): Promise<{ sent: number; escalated: number }> {
  const out = { sent: 0, escalated: 0 };
  const pcrs = await db.projectConnectionRequirement.findMany({ where: { condition_active: true, status: { notIn: ["valid", "dispensed", "not_requested"] }, ...(opts.pcrIds ? { id: { in: opts.pcrIds } } : {}) } });
  for (const pcr of pcrs) {
    const rules = await db.projectDependencyRule.findMany({ where: { target_connection_req_id: pcr.id, target_kind: "connection", behavior: { in: ["block_start", "block_final", "block_stage"] } } });
    if (rules.length === 0) continue;
    const unmet = [];
    for (const r of rules) if (!(await evaluateConnectionRule(db, r)).satisfied) unmet.push(r);
    if (unmet.length === 0) continue;
    const def = await db.catalog2ConnectionRequirement.findUnique({ where: { id: pcr.requirement_id } });
    const interval = (def?.reminder_interval_hours ?? DEFAULT_INTERVAL_H) * 3_600_000;
    const limit = def?.reminder_limit ?? DEFAULT_LIMIT;
    if (pcr.reminder_count >= limit) continue;
    const last = pcr.last_reminder_at ?? pcr.last_request_at ?? pcr.created_at;
    if (now.getTime() - last.getTime() < interval) continue;
    const project = await db.project.findUnique({ where: { id: pcr.project_id }, select: { id: true, title: true, company_id: true, client_id: true, admin_responsible_user_id: true } });
    const tasks = await db.projectTask.findMany({ where: { id: { in: unmet.map((r) => r.task_id) } }, select: { id: true, title: true, lider_responsavel_id: true } });
    const clients = pcr.responsible_user_id ? [pcr.responsible_user_id] : (await clientUsersOfProject(db, pcr.project_id)).slice(0, 5);
    const n = pcr.reminder_count + 1;
    const escalate = n > (def?.escalate_after_reminders ?? DEFAULT_ESCALATE_AFTER);
    const msg = `Falta a conexão "${pcr.label}" em "${project?.title ?? "projeto"}": ${tasks.map((t) => t.title).slice(0, 3).join(", ")} aguarda(m). Lembrete ${n}.`;
    for (const uid of clients) {
      await db.systemAlert.create({ data: { type: "conexao_lembrete", title: "Conexão pendente", message: safeText(msg), severity: "warning", category: "alerta", entity_type: "project_connection_requirement", entity_id: pcr.id, user_id: uid, action_url: `/conexoes?pendencia=${pcr.id}` } }).catch(() => {});
      await db.connectionReminder.create({ data: { project_connection_req_id: pcr.id, recipient_user_id: uid, message: safeText(msg), escalated: false } });
      out.sent++;
    }
    if (escalate) {
      for (const uid of new Set([project?.admin_responsible_user_id, ...tasks.map((t) => t.lider_responsavel_id)].filter((x): x is string => !!x))) {
        await db.systemAlert.create({ data: { type: "conexao_escalonamento", title: "Conexão pendente escalonada", message: safeText(`${msg} O cliente não respondeu aos lembretes anteriores.`), severity: "high", category: "alerta", entity_type: "project_connection_requirement", entity_id: pcr.id, user_id: uid, action_url: `/conexoes?pendencia=${pcr.id}` } }).catch(() => {});
        await db.connectionReminder.create({ data: { project_connection_req_id: pcr.id, recipient_user_id: uid, message: safeText(msg), escalated: true } });
        out.escalated++;
      }
    }
    await db.projectConnectionRequirement.update({ where: { id: pcr.id }, data: { reminder_count: n, last_reminder_at: now, ...(escalate ? { escalated_at: now } : {}) } });
    await db.projectTaskExternalBlock.updateMany({ where: { project_connection_req_id: pcr.id, resolved_at: null }, data: { reminders_sent: { increment: 1 } } });
    await logConnection(db, { kind: escalate ? "escalated" : "reminder", message: `Lembrete ${n} de "${pcr.label}" enviado${escalate ? " (escalonado ao líder/administrador)" : ""}.`, pcrId: pcr.id, projectId: pcr.project_id, actor: { id: null, integration: "system", role: "system" } });
  }
  return out;
}

export async function reminderHistory(db: Db, pcrId: string) {
  return db.connectionReminder.findMany({ where: { project_connection_req_id: pcrId }, orderBy: { created_at: "desc" }, take: 100 });
}

/** Manutenção periódica: expira o que venceu, recalcula o impacto e envia lembretes. */
export async function runConnectionMaintenance(db: PrismaClient, now = new Date()) {
  const { expireDueConnections } = await import("./core");
  const { recalcConnection } = await import("./flow");
  const expired = await expireDueConnections(db, now);
  for (const id of expired) await recalcConnection(db, id, { id: null, integration: "system", role: "system" });
  const health = await recheckValidConnections(db, now);
  const reminders = await runConnectionReminders(db, now);
  return { expired: expired.length, ...reminders, health_checked: health.checked, health_broken: health.broken };
}

// ── IA orientadora (sem autonomia) ────────────────────────────────────────────
export interface Guidance {
  source: "deterministic" | "ai";
  can_decide: false;
  summary: string; how_to_connect: string[]; missing: string[]; error_explained: string | null; fix: string | null;
  suggested_responsible: string; impact: string; next_step: string; reminder_draft: string; ai_text?: string; ai_simulated?: boolean;
  forbidden: string[];
}

export const AI_FORBIDDEN_ACTIONS = ["validar conexão", "liberar atividade", "visualizar segredo", "alterar permissão", "revogar acesso", "ignorar dependência", "encerrar pendência sem evidência"];

/** Orientação determinística (a fonte da verdade continua sendo as regras). A IA, quando existir, só reescreve o texto. */
export async function buildGuidance(db: Db, pcrId: string, viewer: Viewer): Promise<Guidance> {
  const items = await listPendingItems(db, viewer, { includeDone: true });
  const item = items.find((i) => i.id === pcrId);
  if (!item) throw Object.assign(new Error("Pendência não encontrada."), { httpStatus: 404 });
  const def = await db.catalog2ConnectionRequirement.findFirst({ where: { id: (await db.projectConnectionRequirement.findUniqueOrThrow({ where: { id: pcrId } })).requirement_id }, include: { connection_type: true } });
  const missing: string[] = [];
  if (!item.connection_id) missing.push("A conexão ainda não foi criada/enviada.");
  if (item.tasks.some((t) => t.state === "not_authorized")) missing.push("Falta autorizar o uso da conexão nesta tarefa ou projeto.");
  if (item.light_check_pending) missing.push("Falta a conferência leve.");
  if (["needs_correction", "incomplete", "invalid"].includes(item.status)) missing.push(`A conexão precisa ser corrigida${item.correction ? `: ${safeText(item.correction)}` : "."}`);
  if (["expired", "revoked", "removed"].includes(item.status)) missing.push("A conexão não vale mais: é preciso renovar ou reconectar.");
  if (["submitted", "awaiting_validation"].includes(item.status)) missing.push("Falta a validação por uma pessoa autorizada da Allka.");
  const how = [
    `Use ${item.method_label.toLowerCase()} para "${item.connection_type.name}" com permissão "${item.permission_level}".`,
    def?.connection_type.default_instructions ?? "Você não precisa compartilhar suas senhas. Utilize uma conexão oficial, convite ou autorização segura.",
    ...(def?.instructions ? [def.instructions] : []),
    "Nunca envie senha em mensagens, comentários ou no briefing.",
  ];
  const external = ["company", "agency"].includes(viewerKind(viewer));
  const next = item.action.kind === "connect" ? "Conecte agora ou escolha uma conexão existente." : item.action.kind === "fix" ? `Corrija: ${item.correction ?? "revise os dados da conexão"}.` : item.action.kind === "validate" ? "Confira a conexão e registre a validação com evidência." : item.action.kind === "authorize" ? "Autorize o uso (e o novo executor, se houver)." : item.action.kind === "reconnect" ? "Refaça a conexão pelo caminho oficial." : "Aguarde a validação.";
  return {
    source: "deterministic", can_decide: false,
    summary: `${item.label}: ${item.status_label}. ${item.impact}`, how_to_connect: how, missing,
    error_explained: item.problem ? `O provedor/validador informou: ${safeText(item.problem)}` : null, fix: item.correction ? safeText(item.correction) : null,
    suggested_responsible: item.responsible.name ?? (external ? "Quem administra a conta do cliente" : "Responsável pelo projeto na Allka"),
    impact: item.impact, next_step: next,
    reminder_draft: `Olá! Para seguirmos com "${item.tasks[0]?.title ?? item.label}", precisamos da conexão "${item.label}". ${how[1]} Não é necessário enviar senha.`,
    forbidden: AI_FORBIDDEN_ACTIONS,
  };
}

/** Perfil padrão de QA (sem autonomia). Definição estável usada pelo seed. */
export const CONNECTION_AI_PROFILE = {
  name: "Orientador de conexões (QA)",
  purpose: "connections_orchestration",
  description: "Explica como conectar, interpreta erros e resume pendências. NÃO valida, NÃO libera atividade, NÃO vê segredos, NÃO altera permissões e NÃO encerra pendências.",
  base_instructions: [
    "Você é o orientador de Conexões e acessos da Allka. Sua função é apenas orientar em linguagem simples.",
    "Você PODE: explicar como conectar; apontar informação faltante; interpretar erros; orientar correções; resumir pendências; identificar bloqueios; sugerir responsável; preparar lembretes; informar impacto; indicar o próximo passo.",
    "Você NÃO PODE: validar conexão; liberar atividade; ver segredos; alterar permissões; revogar acessos; ignorar dependência; encerrar pendência sem evidência.",
    "Nunca peça nem repita senhas, tokens ou chaves. As regras determinísticas da plataforma são a fonte da verdade; você só redige a orientação.",
  ].join("\n"),
  input_format: "Resumo estruturado da pendência (sem segredos).",
  output_format: "Texto curto e direto em português do Brasil.",
  requires_human_review: true,
  knowledge: { content_base: null, research_documents: [], specialized_instructions: [], authorized_sources: [], knowledge_version: null, purpose_profile: "connections_orchestration" },
} as const;

export async function ensureConnectionAiProfile(db: Db) {
  const found = await db.catalog2AIProfile.findFirst({ where: { purpose: CONNECTION_AI_PROFILE.purpose, is_system: true } });
  if (found) return found;
  return db.catalog2AIProfile.create({
    data: {
      name: CONNECTION_AI_PROFILE.name, description: CONNECTION_AI_PROFILE.description, base_instructions: CONNECTION_AI_PROFILE.base_instructions, input_format: CONNECTION_AI_PROFILE.input_format,
      output_format: CONNECTION_AI_PROFILE.output_format, requires_human_review: true, allowed_actors: "leader", is_active: true, purpose: CONNECTION_AI_PROFILE.purpose, is_system: true,
      knowledge_json: JSON.stringify(CONNECTION_AI_PROFILE.knowledge), fixed_cost_per_run: 0, max_runs_per_task: 20, on_failure: "forward_human", fallback_human: true,
    },
  });
}

/** Reescreve a orientação com a IA quando houver provedor (ou adaptador de QA). Nunca altera estado; falha silenciosa cai no texto determinístico. */
export async function guidanceWithAI(db: Db, pcrId: string, viewer: Viewer): Promise<Guidance> {
  const g = await buildGuidance(db, pcrId, viewer);
  try {
    const profile = await db.catalog2AIProfile.findFirst({ where: { purpose: CONNECTION_AI_PROFILE.purpose, is_system: true, is_active: true } });
    if (!profile) return g;
    const { invokeTaskAIAdapter, isTaskAIAdapterSimulated } = await import("../task-ai");
    const { providerConfigured } = await import("../catalog2-ai-providers");
    // Chamada ao provedor real só quando habilitada de forma explícita (custo e envio de dados); adaptador simulado (QA/testes) sempre pode.
    const live = process.env.CONNECTIONS_AI_GUIDANCE === "true" && providerConfigured(profile.provider);
    if (!isTaskAIAdapterSimulated() && !live) return g;
    const r = await invokeTaskAIAdapter({
      systemInstruction: `${profile.base_instructions}\nResponda apenas com a orientação ao usuário.`,
      prompt: safeText(JSON.stringify({ resumo: g.summary, falta: g.missing, erro: g.error_explained, correcao: g.fix, proximo_passo: g.next_step, impacto: g.impact })),
      model: profile.model,
    } as never);
    return { ...g, source: "ai", ai_simulated: isTaskAIAdapterSimulated(), ai_text: safeText(r.text || "") };
  } catch {
    return g;
  }
}

export { parseJsonArray };

// ── Checagem ATIVA: avisa na hora quando uma conexão que estava boa parou de funcionar ───────────────────────────────────────────
const HEALTH_INTERVAL_H = Number(process.env.CONNECTION_HEALTH_HOURS ?? 24);

/**
 * Reconfere, no provedor, as conexões válidas com validação antiga (a cada HEALTH_INTERVAL_H horas). Se o provedor RECUSAR (senha trocada, acesso removido…),
 * a conexão sai de "válida", o motivo fica registrado, as tarefas que dependiam dela são pausadas e o cliente, o dono e o líder/administrador recebem aviso.
 * Provedor fora do ar, não configurado ou sem resposta clara NÃO derruba nada (só tenta de novo na próxima rodada).
 */
export async function recheckValidConnections(db: PrismaClient, now = new Date()): Promise<{ checked: number; broken: number }> {
  const { getConnector, connectorStatus } = await import("./connectors");
  const { recordValidation } = await import("./core");
  const { recalcConnection } = await import("./flow");
  const out = { checked: 0, broken: 0 };
  const cutoff = new Date(now.getTime() - HEALTH_INTERVAL_H * 3_600_000);
  const due = await db.clientConnection.findMany({
    where: { status: "valid", OR: [{ last_validated_at: null }, { last_validated_at: { lte: cutoff } }] },
    include: { connection_type: true }, take: 200,
  });
  for (const c of due) {
    const connector = getConnector(c.connection_type.integration_key);
    if (connector.key === "none" || connectorStatus(connector).state === "not_configured") continue;
    out.checked++;
    let result;
    try { result = await connector.verify(db, { id: c.id, external_id: c.external_id, account_label: c.account_label, permission_level: c.permission_level, scopes: [] }); } catch { continue; }
    if (result.outcome === "valid") { await db.clientConnection.update({ where: { id: c.id }, data: { last_validated_at: now } }); continue; }
    if (result.outcome !== "invalid" && result.outcome !== "needs_correction") continue; // fora do ar / dúvida: não derruba
    const actor = { id: null, integration: connector.key, role: "integration" };
    await recordValidation(db, actor, c.id, { result: result.outcome, problem: result.problem ?? "O provedor deixou de aceitar esta conexão.", correction_needed: result.correction ?? "Reconecte para continuar.", mode: "automatic" });
    await recalcConnection(db, c.id, { id: null, integration: "system", role: "system" });
    out.broken++;
    const msg = `A conexão "${c.label}" (${connector.label}) parou de funcionar: ${safeText(result.problem ?? "o provedor recusou o acesso")} ${safeText(result.correction ?? "Reconecte para as atividades continuarem.")}`;
    const owners = new Set<string>([c.owner_user_id, c.connected_by_user_id, c.provided_by_user_id].filter((x): x is string => !!x));
    const people = await db.user.findMany({ where: { is_active: true, OR: [...(c.company_id ? [{ company_id: c.company_id }] : []), ...(c.agency_id ? [{ agency_id: c.agency_id }] : [])] }, select: { id: true }, take: 5 });
    people.forEach((p) => owners.add(p.id));
    for (const uid of owners) await db.systemAlert.create({ data: { type: "conexao_desconectada", title: "Conexão desconectada", message: msg, severity: "high", category: "alerta", entity_type: "client_connection", entity_id: c.id, user_id: uid, action_url: `/conexoes?conexao=${c.id}` } }).catch(() => {});
  }
  return out;
}
