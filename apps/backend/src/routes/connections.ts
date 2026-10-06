import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser, projectVisibleToUser } from "../lib/project-scope";
import { CONNECTION_METHODS, ConnectionError, GRANT_SCOPES, HANDLINGS, parseJsonArray, parseFieldDefs, serializeConnectionType, ensureConnectionTypes, CONNECTION_STATE_LABEL, WHEN_NEEDED_LABEL, type ConnectionState } from "../lib/connections/catalog";
import {
  completeOAuth, createConnection, findReusableConnections, grantConnection, listEvents, logConnection, markSubmitted, ownerOfProject, recordValidation, requestManagerLink, revokeConnection, revokeGrants,
  runAutoValidation, serializeConnection, startOAuth, updateConnection, usageOf, type Actor,
} from "../lib/connections/core";
import {
  activateCondition, authorizeExecutor, confirmLightCheck, dispenseRequirement, linkConnection, manualRelease, recalcConnection, recalcProjectConnections, setHandling, taskConnectionView,
} from "../lib/connections/flow";
import { buildGuidance, guidanceWithAI, listPendingItems, reminderHistory, runConnectionMaintenance, viewerKind, type Viewer } from "../lib/connections/pending";
import { assertNoSecretInPlainFields } from "../lib/connections/secrets";
import { listConnectors } from "../lib/connections/connectors";
import { quoteRequirementsView, saveQuoteChoice } from "../lib/connections/quote";
import { resolveClientContext } from "../lib/catalog2-client";

// Conexões e acessos necessários (cliente, agência, executor, líder e administrador). NUNCA devolve segredo.
const router = Router();

const isStaff = (u?: Viewer) => ["admin", "leader"].includes(viewerKind(u as Viewer));
const actorOf = (req: Request): Actor => ({ id: req.user!.id, role: viewerKind(req.user as Viewer) });

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ConnectionError) { res.status(err.httpStatus).json({ error: err.message, code: err.code, ...(err.details ? { details: err.details } : {}) }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}

async function userCompany(userId: string) {
  return (await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true, agency_id: true } })) ?? { company_id: null, agency_id: null };
}
/** Staff vê tudo; empresa só a própria; agência só as suas e as empresas de projetos da sua agência. */
async function canSeeOwner(req: Request, owner: { company_id?: string | null; agency_id?: string | null }): Promise<boolean> {
  if (isStaff(req.user as Viewer)) return true;
  const me = await userCompany(req.user!.id);
  if (owner.company_id && me.company_id === owner.company_id) return true;
  if (owner.agency_id && me.agency_id === owner.agency_id) return true;
  if (owner.company_id && me.agency_id) return !!(await prisma.project.findFirst({ where: { agency_id: me.agency_id, OR: [{ company_id: owner.company_id }, { client_id: owner.company_id }] }, select: { id: true } }));
  return false;
}
async function assertOwner(req: Request, owner: { company_id?: string | null; agency_id?: string | null }) {
  if (!(await canSeeOwner(req, owner))) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
}
async function assertProject(req: Request, projectId: string) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new ConnectionError("Projeto não encontrado.", 404, "project_not_found");
  if (isStaff(req.user as Viewer)) return p;
  if (viewerKind(req.user as Viewer) === "nomad") {
    const nomade = await prisma.nomade.findUnique({ where: { user_id: req.user!.id }, select: { id: true } });
    const mine = nomade ? await prisma.projectTask.findFirst({ where: { project_id: projectId, nomade_responsavel_id: nomade.id }, select: { id: true } }) : null;
    if (mine) return p;
  }
  if (!(await projectVisibleToUser(prisma, req.user!, p))) throw new ConnectionError("Projeto não encontrado.", 404, "project_not_found");
  return p;
}
async function loadConn(req: Request, id = req.params.id as string) {
  const c = await prisma.clientConnection.findUnique({ where: { id } });
  if (!c) throw new ConnectionError("Conexão não encontrada.", 404, "connection_not_found");
  await assertOwner(req, c);
  return c;
}
async function loadPcr(req: Request, id = req.params.pcrId as string) {
  const p = await prisma.projectConnectionRequirement.findUnique({ where: { id } });
  if (!p) throw new ConnectionError("Exigência de conexão não encontrada.", 404, "requirement_not_found");
  await assertProject(req, p.project_id);
  return p;
}
const staffOnly = (req: Request) => { if (!isStaff(req.user as Viewer)) throw new ConnectionError("Somente a Allka (líder/administrador) pode fazer isto.", 403, "staff_only"); };

// ── OAuth (callback público: o provedor navega o usuário até aqui; o estado assinado protege contra forjamento) ──
router.get("/oauth/callback", async (req, res, next) => {
  try {
    const q = z.object({ state: z.string().min(1), code: z.string().optional(), error: z.string().optional(), format: z.string().optional() }).parse(req.query);
    let payload: unknown = null; let failure: ConnectionError | null = null;
    try { payload = await completeOAuth(prisma, { state: q.state, code: q.code, error: q.error }); } catch (e) { if (e instanceof ConnectionError) failure = e; else throw e; }
    if (q.format === "json") {
      if (failure) { res.status(failure.httpStatus).json({ error: failure.message, code: failure.code }); return; }
      res.json({ ok: true, result: payload }); return;
    }
    const base = process.env.FRONTEND_URL || "http://localhost:8082";
    res.redirect(`${base}/conexoes?oauth=${failure ? failure.code : "ok"}`);
  } catch (e) { handle(e, res, next); }
});

router.use(verifyToken);

router.get("/types", async (_req, res, next) => {
  try {
    await ensureConnectionTypes(prisma);
    res.json({ data: (await prisma.connectionType.findMany({ where: { is_active: true }, orderBy: [{ sort_order: "asc" }, { id: "asc" }] })).map(serializeConnectionType) });
  } catch (e) { handle(e, res, next); }
});
router.get("/connectors", (req, res) => { res.json({ data: listConnectors() }); });

// ── Conexões da empresa ──
router.get("/", async (req, res, next) => {
  try {
    const me = await userCompany(req.user!.id);
    const owner = typeof req.query.company_id === "string" ? { company_id: req.query.company_id } : typeof req.query.agency_id === "string" ? { agency_id: req.query.agency_id } : me.company_id ? { company_id: me.company_id } : me.agency_id ? { agency_id: me.agency_id } : null;
    if (!owner) throw new ConnectionError("Informe company_id ou agency_id.", 400, "company_required");
    await assertOwner(req, owner);
    const rows = await prisma.clientConnection.findMany({ where: owner.company_id ? { company_id: owner.company_id } : { agency_id: owner.agency_id }, orderBy: { created_at: "desc" }, select: { id: true } });
    res.json({ data: await Promise.all(rows.map((r) => serializeConnection(prisma, r.id))) });
  } catch (e) { handle(e, res, next); }
});

const createSchema = z.object({
  company_id: z.string().optional(), agency_id: z.string().optional(), connection_type_id: z.number().int().optional(), connection_type_key: z.string().optional(), method: z.enum(CONNECTION_METHODS).optional(),
  label: z.string().trim().max(191).optional(), account_label: z.string().trim().max(191).nullish(), external_id: z.string().trim().max(500).nullish(), permission_level: z.string().max(60).nullish(),
  scopes: z.array(z.string()).optional(), owner_user_id: z.string().nullish(), provided_by_user_id: z.string().nullish(), secret_value: z.string().max(4000).nullish(),
  fields: z.array(z.object({ key: z.string().max(60), value: z.string().max(4000) })).max(30).optional(),
  expires_at: z.string().datetime({ offset: true }).nullish(),
});
router.post("/", async (req, res, next) => {
  try {
    const d = createSchema.parse(req.body);
    const me = await userCompany(req.user!.id);
    const owner = d.company_id ? { company_id: d.company_id } : d.agency_id ? { agency_id: d.agency_id } : me.company_id ? { company_id: me.company_id } : me.agency_id ? { agency_id: me.agency_id } : null;
    if (!owner) throw new ConnectionError("Informe company_id ou agency_id.", 400, "company_required");
    await assertOwner(req, owner);
    const c = await prisma.$transaction((tx) => createConnection(tx, actorOf(req), { ...d, ...owner, expires_at: d.expires_at ? new Date(d.expires_at) : null }));
    res.status(201).json(await serializeConnection(prisma, c.id));
  } catch (e) { handle(e, res, next); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    if (isStaff(req.user as Viewer)) await logConnection(prisma, { kind: "sensitive_view", message: "Detalhes da conexão visualizados pela equipe.", connectionId: c.id, companyId: c.company_id, actor: actorOf(req) });
    res.json(await serializeConnection(prisma, c.id));
  } catch (e) { handle(e, res, next); }
});
router.patch("/:id", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const d = z.object({ label: z.string().trim().max(191).optional(), account_label: z.string().trim().max(191).nullish(), external_id: z.string().trim().max(500).nullish(), permission_level: z.string().max(60).nullish(), secret_value: z.string().max(4000).nullish(), fields: z.array(z.object({ key: z.string().max(60), value: z.string().max(4000) })).max(30).optional(), expires_at: z.string().datetime({ offset: true }).nullish() }).parse(req.body);
    await prisma.$transaction((tx) => updateConnection(tx, actorOf(req), c.id, { ...d, expires_at: d.expires_at === undefined ? undefined : d.expires_at ? new Date(d.expires_at) : null }));
    await recalcConnection(prisma, c.id, actorOf(req));
    res.json(await serializeConnection(prisma, c.id));
  } catch (e) { handle(e, res, next); }
});
router.post("/:id/submit", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    await prisma.$transaction((tx) => markSubmitted(tx, actorOf(req), c.id));
    await recalcConnection(prisma, c.id, actorOf(req));
    res.json(await serializeConnection(prisma, c.id));
  } catch (e) { handle(e, res, next); }
});
router.post("/:id/oauth/start", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const d = z.object({ permission_level: z.string().nullish() }).parse(req.body ?? {});
    res.json(await startOAuth(prisma, actorOf(req), c.id, d.permission_level));
  } catch (e) { handle(e, res, next); }
});
router.post("/:id/google-ads/link", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const r = await requestManagerLink(prisma, actorOf(req), c.id);
    await recalcConnection(prisma, c.id, actorOf(req));
    res.json(r);
  } catch (e) { handle(e, res, next); }
});
// Validação AUTOMÁTICA (conector). Conector indisponível/não configurado não altera o estado e não simula sucesso.
router.post("/:id/verify", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const r = await runAutoValidation(prisma, c.id);
    const impact = await recalcConnection(prisma, c.id, { id: null, integration: "system", role: "system" });
    res.json({ outcome: r.outcome, status: r.status, problem: r.result.problem ?? null, correction: r.result.correction ?? null, excessive_permissions: r.result.excessive ?? [], impact });
  } catch (e) { handle(e, res, next); }
});
// Validação MANUAL / confirmação humana. Só pessoa autorizada (a IA nunca valida).
router.post("/:id/validate", async (req, res, next) => {
  try {
    staffOnly(req);
    const c = await loadConn(req);
    assertNoSecretInPlainFields(req.body);
    const d = z.object({
      result: z.enum(["valid", "incomplete", "invalid", "needs_correction"]), evidence: z.string().max(2000).nullish(), problem: z.string().max(2000).nullish(), correction_needed: z.string().max(2000).nullish(),
      next_revalidation_at: z.string().datetime({ offset: true }).nullish(), expires_at: z.string().datetime({ offset: true }).nullish(), mode: z.enum(["manual", "automatic_with_human"]).optional(),
    }).parse(req.body);
    const r = await prisma.$transaction((tx) => recordValidation(tx, actorOf(req), c.id, { ...d, next_revalidation_at: d.next_revalidation_at ? new Date(d.next_revalidation_at) : null, expires_at: d.expires_at === undefined ? undefined : d.expires_at ? new Date(d.expires_at) : null }));
    const impact = await recalcConnection(prisma, c.id, actorOf(req));
    res.json({ status: r.status, affected_task_ids: r.affected_task_ids, impact });
  } catch (e) { handle(e, res, next); }
});
router.post("/:id/revoke", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const d = z.object({ reason: z.string().trim().min(3).max(500), removed_externally: z.boolean().optional() }).parse(req.body);
    const r = await prisma.$transaction((tx) => revokeConnection(tx, actorOf(req), c.id, d.reason, { removedExternally: d.removed_externally }));
    const impact = await recalcConnection(prisma, c.id, actorOf(req));
    res.json({ ...r, impact });
  } catch (e) { handle(e, res, next); }
});
router.post("/:id/grants", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const d = z.object({ project_id: z.string().min(1), scope: z.enum(GRANT_SCOPES), task_ids: z.array(z.string()).optional(), executor_user_id: z.string().nullish() }).parse(req.body);
    await assertProject(req, d.project_id);
    await prisma.$transaction((tx) => grantConnection(tx, actorOf(req), { connection_id: c.id, ...d }));
    const impact = await recalcConnection(prisma, c.id, actorOf(req));
    res.status(201).json({ connection: await serializeConnection(prisma, c.id), impact });
  } catch (e) { handle(e, res, next); }
});
router.post("/:id/grants/revoke", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const d = z.object({ project_id: z.string().min(1), task_ids: z.array(z.string()).optional(), reason: z.string().max(500).optional() }).parse(req.body);
    await assertProject(req, d.project_id);
    const n = await prisma.$transaction((tx) => revokeGrants(tx, actorOf(req), { connection_id: c.id, ...d }));
    const impact = await recalcConnection(prisma, c.id, actorOf(req));
    res.json({ revoked: n, impact });
  } catch (e) { handle(e, res, next); }
});
router.get("/:id/usage", async (req, res, next) => { try { const c = await loadConn(req); res.json(await usageOf(prisma, c.id)); } catch (e) { handle(e, res, next); } });
router.get("/:id/events", async (req, res, next) => {
  try {
    const c = await loadConn(req);
    const rows = await listEvents(prisma, { connectionId: c.id });
    res.json({ data: rows });
  } catch (e) { handle(e, res, next); }
});
router.get("/:id/validations", async (req, res, next) => {
  try { const c = await loadConn(req); res.json({ data: await prisma.clientConnectionValidation.findMany({ where: { connection_id: c.id }, orderBy: { created_at: "desc" } }) }); } catch (e) { handle(e, res, next); }
});

// ── Exigências do projeto (contratação) ──
router.get("/projects/:projectId/requirements", async (req, res, next) => {
  try {
    const project = await assertProject(req, req.params.projectId as string);
    const items = await listPendingItems(prisma, req.user as Viewer, { projectId: project.id, includeDone: true });
    res.json({ message: "Você não precisa compartilhar suas senhas. Utilize uma conexão oficial, convite ou autorização segura.", data: items });
  } catch (e) { handle(e, res, next); }
});
router.get("/requirements/:pcrId", async (req, res, next) => {
  try {
    const pcr = await loadPcr(req);
    const def = await prisma.catalog2ConnectionRequirement.findUnique({ where: { id: pcr.requirement_id }, include: { connection_type: true } });
    const ownerP = await ownerOfProject(prisma, pcr.project_id);
    const items = await listPendingItems(prisma, req.user as Viewer, { projectId: pcr.project_id, includeDone: true });
    res.json({
      item: items.find((i) => i.id === pcr.id) ?? null,
      instructions: [def?.connection_type.default_instructions, def?.instructions].filter(Boolean),
      reuse_candidates: await findReusableConnections(prisma, ownerP, pcr.connection_type_id, pcr.project_id),
      allowed_methods: parseJsonArray<string>(def?.connection_type.allowed_methods_json),
      permission_levels: parseJsonArray<{ key: string; label: string }>(def?.connection_type.permission_levels_json),
      fields: parseFieldDefs(def?.connection_type.fields_json),
      reminders: await reminderHistory(prisma, pcr.id), events: await listEvents(prisma, { pcrId: pcr.id }, 100),
    });
  } catch (e) { handle(e, res, next); }
});
router.post("/requirements/:pcrId/link", async (req, res, next) => {
  try {
    const pcr = await loadPcr(req);
    const d = z.object({ connection_id: z.string().min(1), scope: z.enum(GRANT_SCOPES), task_ids: z.array(z.string()).optional(), executor_user_id: z.string().nullish() }).parse(req.body);
    await assertOwner(req, await prisma.clientConnection.findUniqueOrThrow({ where: { id: d.connection_id } }));
    res.json(await prisma.$transaction((tx) => linkConnection(tx, actorOf(req), pcr.id, d)));
  } catch (e) { handle(e, res, next); }
});
// Atalho do cliente: cria a conexão e já vincula (conectar agora).
router.post("/requirements/:pcrId/create-and-link", async (req, res, next) => {
  try {
    const pcr = await loadPcr(req);
    const d = createSchema.omit({ company_id: true, connection_type_id: true, connection_type_key: true }).extend({ scope: z.enum(GRANT_SCOPES).default("project"), task_ids: z.array(z.string()).optional() }).parse(req.body);
    const project = await prisma.project.findUniqueOrThrow({ where: { id: pcr.project_id } });
    const companyId = project.company_id ?? project.client_id;
    const agencyId = companyId ? null : project.agency_id;
    if (!companyId && !agencyId) throw new ConnectionError("O projeto não tem empresa cliente nem agência para vincular a conexão.", 422, "project_without_company");
    const { scope, task_ids, ...rest } = d;
    const result = await prisma.$transaction(async (tx) => {
      const c = await createConnection(tx, actorOf(req), { ...rest, company_id: companyId ?? null, agency_id: agencyId ?? null, connection_type_id: pcr.connection_type_id, expires_at: rest.expires_at ? new Date(rest.expires_at) : null });
      const impact = await linkConnection(tx, actorOf(req), pcr.id, { connection_id: c.id, scope, task_ids });
      return { connection_id: c.id, impact };
    });
    res.status(201).json({ ...result, connection: await serializeConnection(prisma, result.connection_id) });
  } catch (e) { handle(e, res, next); }
});
router.post("/requirements/:pcrId/handling", async (req, res, next) => {
  try {
    const pcr = await loadPcr(req);
    const d = z.object({ handling: z.enum(HANDLINGS), responsible_user_id: z.string().nullish(), responsible_name: z.string().max(191).nullish(), invited_email: z.string().email().nullish(), draft: z.unknown().optional() }).parse(req.body);
    assertNoSecretInPlainFields(d);
    await prisma.$transaction((tx) => setHandling(tx, actorOf(req), pcr.id, d));
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.post("/requirements/:pcrId/dispense", async (req, res, next) => {
  try {
    const pcr = await loadPcr(req);
    const d = z.object({ reason: z.string().max(500) }).parse(req.body);
    res.json({ released: await prisma.$transaction((tx) => dispenseRequirement(tx, actorOf(req), pcr.id, d.reason)) });
  } catch (e) { handle(e, res, next); }
});
router.post("/requirements/:pcrId/activate-condition", async (req, res, next) => {
  try { staffOnly(req); const pcr = await loadPcr(req); res.json(await prisma.$transaction((tx) => activateCondition(tx, actorOf(req), pcr.id))); } catch (e) { handle(e, res, next); }
});
router.post("/requirements/:pcrId/light-check", async (req, res, next) => {
  try {
    staffOnly(req);
    const pcr = await loadPcr(req);
    const d = z.object({ note: z.string().max(500).nullish() }).parse(req.body ?? {});
    res.json(await prisma.$transaction((tx) => confirmLightCheck(tx, actorOf(req), pcr.id, d.note)));
  } catch (e) { handle(e, res, next); }
});
router.post("/requirements/:pcrId/authorize-executor", async (req, res, next) => {
  try {
    const pcr = await loadPcr(req);
    const d = z.object({ task_id: z.string().min(1), executor_user_id: z.string().min(1) }).parse(req.body);
    res.json(await prisma.$transaction((tx) => authorizeExecutor(tx, actorOf(req), { pcr_id: pcr.id, ...d })));
  } catch (e) { handle(e, res, next); }
});
router.get("/requirements/:pcrId/reminders", async (req, res, next) => { try { const pcr = await loadPcr(req); res.json({ data: await reminderHistory(prisma, pcr.id) }); } catch (e) { handle(e, res, next); } });
router.post("/rules/:ruleId/release", async (req, res, next) => {
  try {
    staffOnly(req);
    const d = z.object({ reason: z.string().max(500) }).parse(req.body);
    res.json(await prisma.$transaction((tx) => manualRelease(tx, actorOf(req), req.params.ruleId as string, d.reason)));
  } catch (e) { handle(e, res, next); }
});

// ── Contratação: o que será exigido e as escolhas do cliente (rascunho) ──
async function loadQuote(req: Request) {
  const q = await prisma.catalog2Quote.findUnique({ where: { id: req.params.quoteId as string }, select: { id: true, version_id: true, account_kind: true, account_id: true } });
  if (!q) throw new ConnectionError("Cotação não encontrada.", 404, "quote_not_found");
  const ctx = await resolveClientContext(req.user!.id, req.user!.account_type ?? "", req.user!.role ?? "");
  const staff = isStaff(req.user as Viewer);
  if (!staff && !(ctx.account_kind === q.account_kind && ctx.account_id === q.account_id)) throw new ConnectionError("Cotação não encontrada.", 404, "quote_not_found");
  return q;
}
router.get("/quotes/:quoteId/requirements", async (req, res, next) => {
  try { res.json(await quoteRequirementsView(prisma, await loadQuote(req))); } catch (e) { handle(e, res, next); }
});
router.put("/quotes/:quoteId/requirements/:requirementId", async (req, res, next) => {
  try {
    const q = await loadQuote(req);
    const d = z.object({
      handling: z.enum(HANDLINGS), connection_id: z.string().nullish(), grant_scope: z.enum(GRANT_SCOPES).nullish(), task_keys: z.array(z.string()).optional(),
      responsible_user_id: z.string().nullish(), responsible_name: z.string().max(191).nullish(), invited_email: z.string().email().nullish(), draft: z.unknown().optional(),
    }).parse(req.body);
    const row = await saveQuoteChoice(prisma, q, req.params.requirementId as string, req.user!.id, d);
    res.json({ ok: true, id: row.id, handling: row.handling });
  } catch (e) { handle(e, res, next); }
});

// ── Pendências acionáveis (por perfil), tarefa e orientação ──
router.get("/pending/list", async (req, res, next) => {
  try { res.json({ view: viewerKind(req.user as Viewer), data: await listPendingItems(prisma, req.user as Viewer, { projectId: typeof req.query.project_id === "string" ? req.query.project_id : undefined }) }); } catch (e) { handle(e, res, next); }
});
router.get("/pending/:pcrId/guidance", async (req, res, next) => {
  try { const pcr = await loadPcr(req); res.json(await guidanceWithAI(prisma, pcr.id, req.user as Viewer)); } catch (e) { handle(e, res, next); }
});
router.get("/tasks/:taskId", async (req, res, next) => {
  try {
    const t = await prisma.projectTask.findUnique({ where: { id: req.params.taskId as string }, select: { id: true, project_id: true, status: true, due_date: true, original_due_date: true, external_pause_total_minutes: true } });
    if (!t) throw new ConnectionError("Tarefa não encontrada.", 404, "task_not_found");
    await assertProject(req, t.project_id);
    res.json({ task: t, ...(await taskConnectionView(prisma, t.id)) });
  } catch (e) { handle(e, res, next); }
});
router.get("/projects/:projectId/events", async (req, res, next) => {
  try { const p = await assertProject(req, req.params.projectId as string); res.json({ data: await listEvents(prisma, { projectId: p.id }, 300) }); } catch (e) { handle(e, res, next); }
});
router.post("/projects/:projectId/recalculate", async (req, res, next) => {
  try { staffOnly(req); const p = await assertProject(req, req.params.projectId as string); res.json(await recalcProjectConnections(prisma, p.id, actorOf(req))); } catch (e) { handle(e, res, next); }
});
router.post("/maintenance/run", async (req, res, next) => {
  try { if (!isAdminUser(req.user)) throw new ConnectionError("Somente administrador.", 403, "admin_only"); res.json(await runConnectionMaintenance(prisma)); } catch (e) { handle(e, res, next); }
});

export default router;
void CONNECTION_STATE_LABEL; void WHEN_NEEDED_LABEL; void ({} as ConnectionState);
