// D3 — Navegador seguro: perfis (consentimento), autorizações por tempo, sessões, auditoria. Ver lib/secure-browser.ts.
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser } from "../lib/project-scope";
import { ownerOf, sameOwner } from "../lib/internal-tasks";
import {
  CONSENT_TEXT, CONSENT_VERSION, readProfileStateForDriver, runnerExportState, effectiveAllowedHosts, parseHosts, loginExpiresAt, MAX_SESSION_MINUTES_LIMIT, SbError, activeGrantFor, canManageProfile, endSession, getDriver, hashTicket, logEvent, newTicket, profileView, saveProfileState, sessionView, sweepBrowserSessions,
} from "../lib/secure-browser";

const router = Router();

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof SbError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}
const admin = (req: Request) => isAdminUser(req.user!);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ── Página do navegador de demonstração (substituto do navegador real; protegida por ticket da sessão) ──
router.get("/demo/:id", async (req, res, next) => {
  try {
    const s = await prisma.browserSession.findUnique({ where: { id: req.params.id as string }, include: { profile: true } });
    const t = typeof req.query.t === "string" ? req.query.t : "";
    if (!s || s.driver !== "demo" || !s.ticket_hash || hashTicket(t) !== s.ticket_hash) { res.status(404).send("Sessão não encontrada."); return; }
    if (s.status !== "active" || s.expires_at.getTime() < Date.now()) { res.status(410).send("Sessão encerrada."); return; }
    const user = await prisma.user.findUnique({ where: { id: s.user_id }, select: { name: true } });
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", "frame-ancestors *; default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'");
    res.type("html").send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Navegador seguro (demonstração)</title><style>
body{margin:0;font:14px system-ui;background:#0f172a;color:#e2e8f0;user-select:none;-webkit-user-select:none}
.bar{display:flex;gap:8px;align-items:center;padding:8px 12px;background:#1e293b}.url{flex:1;background:#0f172a;border-radius:8px;padding:6px 10px;color:#93c5fd}
.page{position:relative;padding:24px;min-height:70vh}.wm{position:fixed;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:700;color:rgba(255,255,255,.07);transform:rotate(-20deg)}
.box{max-width:640px;background:#1e293b;border-radius:12px;padding:16px}</style></head><body oncopy="return false" oncut="return false" onpaste="return false" oncontextmenu="return false">
<div class="bar"><span>🔒</span><div class="url">${esc(s.profile.start_url)}</div><span id="t"></span></div>
<div class="page"><div class="box"><h2 style="margin:0 0 8px">${esc(s.profile.label)}</h2><p>Esta é a <strong>demonstração</strong> do navegador seguro. No ambiente real, aqui aparece o navegador do servidor já logado na conta do cliente, sem expor senha nem cookie.</p><p>Copiar, colar e baixar ficam bloqueados. Modo: <strong>${s.mode === "setup" ? "login inicial" : "uso"}</strong>.</p></div></div>
<div class="wm">${esc(user?.name ?? "usuário")} · ${esc(s.id.slice(0, 6))}</div>
<script>var exp=${s.expires_at.getTime()};setInterval(function(){var r=Math.max(0,Math.floor((exp-Date.now())/1000));document.getElementById("t").textContent=Math.floor(r/60)+":"+String(r%60).padStart(2,"0")},1000)</script></body></html>`);
  } catch (e) { next(e); }
});

router.use(verifyToken);

// Quem pode receber autorização num perfil: equipe da mesma conta, nômades, líderes e administração (para o seletor da tela).
router.get("/profiles/:id/grantable-users", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    const [team, others] = await Promise.all([
      !p.agency_id && !p.company_id ? Promise.resolve([] as { id: string; name: string }[]) : prisma.user.findMany({ where: p.agency_id ? { OR: [{ agency_id: p.agency_id }, { owned_agency: { is: { id: p.agency_id } } }], is_active: true } : { company_id: p.company_id, is_active: true }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 200 }),
      prisma.user.findMany({ where: { is_active: true, ...(admin(req) ? {} : { OR: [{ account_type: "nomades" }, { account_type: "lider" }, { role: "lider" }, { account_type: "admin" }] }) }, select: { id: true, name: true, account_type: true, role: true }, orderBy: { name: "asc" }, take: admin(req) ? 2000 : 500 }),
    ]);
    const kind = (u: { account_type?: string | null; role?: string | null }) => (u.account_type === "nomades" ? "Nômade" : u.account_type === "admin" || u.role === "admin" ? "Administração" : u.account_type === "agencias" ? "Agência" : u.account_type === "empresas" ? "Empresa" : "Líder");
    const seen = new Set(team.map((t) => t.id));
    res.json({ data: [...team.map((t) => ({ id: t.id, name: t.name, kind: "Equipe da conta" })), ...others.filter((o) => !seen.has(o.id)).map((o) => ({ id: o.id, name: o.name, kind: kind(o) }))] });
  } catch (e) { handle(e, res, next); }
});

router.get("/consent", (_req, res) => { res.json({ version: CONSENT_VERSION, text: CONSENT_TEXT }); });

async function loadProfile(req: Request, id = req.params.id as string) {
  const p = await prisma.browserProfile.findUnique({ where: { id } });
  if (!p) throw new SbError("Perfil não encontrado.", 404, "not_found");
  return p;
}
/** Dono (mesma conta) ou administração; os demais só enxergam o perfil se têm autorização ativa. */
async function access(req: Request, p: { id: string; company_id: string | null; agency_id: string | null }) {
  const manage = await canManageProfile(prisma, req.user!, p);
  const grant = manage ? null : await activeGrantFor(prisma, p.id, req.user!.id);
  return { manage, grant };
}

// ── Perfis ──────────────────────────────────────────────────────────────────
router.get("/profiles", async (req, res, next) => {
  try {
    const me = req.user!;
    const owner = admin(req) ? null : await ownerOf(prisma, me);
    const own = admin(req)
      ? await prisma.browserProfile.findMany({ where: { ...(typeof req.query.agency_id === "string" ? { agency_id: req.query.agency_id } : {}), ...(typeof req.query.company_id === "string" ? { company_id: req.query.company_id } : {}) }, orderBy: { created_at: "desc" }, take: 500 })
      : owner ? await prisma.browserProfile.findMany({ where: owner.agency_id ? { agency_id: owner.agency_id } : { company_id: owner.company_id }, orderBy: { created_at: "desc" }, take: 500 }) : [];
    const grants = await prisma.browserAccessGrant.findMany({ where: { user_id: me.id, revoked_at: null, valid_until: { gt: new Date() } }, include: { profile: true } });
    const ownIds = new Set(own.map((p) => p.id));
    res.json({
      data: [
        ...own.map((p) => ({ ...profileView(p), access: "owner" as const, grant: null })),
        ...grants.filter((g) => !ownIds.has(g.profile_id) && g.profile.status === "active").map((g) => ({ ...profileView(g.profile), access: "grant" as const, grant: { id: g.id, valid_from: g.valid_from, valid_until: g.valid_until, reason: g.reason } })),
      ],
    });
  } catch (e) { handle(e, res, next); }
});
const urlSchema = z.string().trim().max(500).refine((u) => { try { return ["http:", "https:"].includes(new URL(u).protocol); } catch { return false; } }, "Informe um endereço válido (https://…).");
router.post("/profiles", async (req, res, next) => {
  try {
    const d = z.object({ label: z.string().trim().min(2).max(190), start_url: urlSchema, provider_hint: z.string().max(100).nullish(), max_session_minutes: z.number().int().min(5).max(MAX_SESSION_MINUTES_LIMIT).optional(), consent: z.literal(true), connection_id: z.string().max(60).nullish(), agency_id: z.string().optional(), company_id: z.string().optional() }).parse(req.body);
    // Administração sem conta escolhida cria um navegador "da Allka" (sem dono de conta): só a administração gerencia e libera a outras pessoas.
    const owner = admin(req) ? { agency_id: d.agency_id ?? null, company_id: d.agency_id ? null : d.company_id ?? null } : await ownerOf(prisma, req.user!);
    if (!owner) throw new SbError(admin(req) ? "Informe agency_id ou company_id da conta dona." : "Sua conta não está vinculada a uma agência ou empresa.", 400, "owner_required");
    const row = await prisma.browserProfile.create({
      data: { ...owner, label: d.label, start_url: d.start_url, provider_hint: d.provider_hint ?? null, connection_id: d.connection_id ?? null, max_session_minutes: d.max_session_minutes ?? 60, consent_at: new Date(), consent_by_user_id: req.user!.id, consent_version: CONSENT_VERSION, created_by_user_id: req.user!.id },
    });
    await logEvent(prisma, { profileId: row.id, kind: "profile_created", actorId: req.user!.id, detail: { consent_version: CONSENT_VERSION } });
    res.status(201).json(profileView(row));
  } catch (e) { handle(e, res, next); }
});
router.patch("/profiles/:id", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    const d = z.object({ label: z.string().trim().min(2).max(190).optional(), start_url: urlSchema.optional(), max_session_minutes: z.number().int().min(5).max(MAX_SESSION_MINUTES_LIMIT).optional(), allowed_hosts: z.string().max(1000).nullish() }).parse(req.body);
    const row = await prisma.browserProfile.update({ where: { id: p.id }, data: { ...d, ...(d.allowed_hosts !== undefined ? { allowed_hosts: parseHosts(d.allowed_hosts).join(",") || null } : {}) } });
    await logEvent(prisma, { profileId: p.id, kind: "profile_updated", actorId: req.user!.id, detail: d });
    res.json(profileView(row));
  } catch (e) { handle(e, res, next); }
});
// Excluir a conta guardada de vez (dono ou administração): derruba sessões abertas, apaga a sessão guardada, as autorizações e as sessões. O histórico de auditoria fica.
router.delete("/profiles/:id", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    for (const s of await prisma.browserSession.findMany({ where: { profile_id: p.id, status: "active" } })) await endSession(prisma, s.id, "killed", "profile_deleted", req.user!.id);
    await logEvent(prisma, { profileId: p.id, kind: "profile_deleted", actorId: req.user!.id, detail: { label: p.label } });
    await prisma.browserAccessGrant.deleteMany({ where: { profile_id: p.id } });
    await prisma.browserSession.deleteMany({ where: { profile_id: p.id } });
    await prisma.browserProfile.delete({ where: { id: p.id } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
// Revogar o perfil: apaga a sessão guardada, cancela autorizações e derruba sessões abertas.
router.post("/profiles/:id/revoke", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    const now = new Date();
    for (const s of await prisma.browserSession.findMany({ where: { profile_id: p.id, status: "active" } })) await endSession(prisma, s.id, "killed", "profile_revoked", req.user!.id);
    await prisma.browserAccessGrant.updateMany({ where: { profile_id: p.id, revoked_at: null }, data: { revoked_at: now, revoked_by_user_id: req.user!.id } });
    await prisma.browserProfile.update({ where: { id: p.id }, data: { status: "revoked", state_ciphertext: null, state_updated_at: null } });
    await logEvent(prisma, { profileId: p.id, kind: "profile_revoked", actorId: req.user!.id });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Autorizações por tempo ────────────────────────────────────────────────────
router.get("/profiles/:id/grants", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    const rows = await prisma.browserAccessGrant.findMany({ where: { profile_id: p.id }, orderBy: { created_at: "desc" }, take: 200 });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.user_id) } }, select: { id: true, name: true } });
    const nm = new Map(users.map((u) => [u.id, u.name]));
    const now = new Date();
    res.json({ data: rows.map((g) => ({ id: g.id, user_id: g.user_id, user_name: nm.get(g.user_id) ?? "", valid_from: g.valid_from, valid_until: g.valid_until, reason: g.reason, revoked_at: g.revoked_at, active: !g.revoked_at && g.valid_from <= now && g.valid_until > now })) });
  } catch (e) { handle(e, res, next); }
});
router.post("/profiles/:id/grants", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    if (p.status !== "active") throw new SbError("Este perfil foi revogado.", 409, "profile_revoked");
    const d = z.object({ user_id: z.string().min(1), minutes: z.number().int().min(5).max(60 * 24 * 14).optional(), valid_until: z.string().datetime({ offset: true }).optional(), project_task_id: z.string().nullish(), reason: z.string().max(500).nullish() }).parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: d.user_id }, select: { id: true, is_active: true, account_type: true, role: true } });
    if (!target || !target.is_active) throw new SbError("Usuário não encontrado ou inativo.", 404, "user_not_found");
    const tOwner = await ownerOf(prisma, target);
    const sameAccount = !!tOwner && sameOwner({ agency_id: p.agency_id, company_id: p.company_id }, tOwner);
    const ok = admin(req) || sameAccount || ["nomades", "lider", "admin"].includes(target.account_type ?? "") || target.role === "lider" || target.role === "admin";
    if (!ok) throw new SbError("Só é possível autorizar usuários da mesma conta, nômades, líderes ou a administração.", 422, "user_not_allowed");
    const from = new Date();
    const until = d.valid_until ? new Date(d.valid_until) : new Date(from.getTime() + (d.minutes ?? 120) * 60000);
    if (until.getTime() <= from.getTime() || until.getTime() - from.getTime() > 14 * 86400000) throw new SbError("A autorização deve durar de alguns minutos até 14 dias.");
    const g = await prisma.browserAccessGrant.create({ data: { profile_id: p.id, user_id: d.user_id, valid_from: from, valid_until: until, project_task_id: d.project_task_id ?? null, reason: d.reason ?? null, granted_by_user_id: req.user!.id } });
    await logEvent(prisma, { profileId: p.id, kind: "grant_created", actorId: req.user!.id, detail: { grant_id: g.id, user_id: d.user_id, valid_until: until } });
    res.status(201).json({ id: g.id, valid_from: g.valid_from, valid_until: g.valid_until });
  } catch (e) { handle(e, res, next); }
});
// Liberar para um GRUPO inteiro de usuários (só administração): nômades, líderes, administração, agências ou empresas.
const GROUP_WHERE: Record<string, Prisma.UserWhereInput> = {
  nomades: { account_type: "nomades" }, lideres: { OR: [{ account_type: "lider" }, { role: "lider" }] }, administracao: { account_type: "admin" }, agencias: { account_type: "agencias" }, empresas: { account_type: "empresas" },
};
router.post("/profiles/:id/grants/group", async (req, res, next) => {
  try {
    if (!admin(req)) throw new SbError("Só a administração libera para um grupo.", 403, "forbidden");
    const p = await loadProfile(req);
    if (p.status !== "active") throw new SbError("Este perfil foi revogado.", 409, "profile_revoked");
    const d = z.object({ group: z.enum(["nomades", "lideres", "administracao", "agencias", "empresas"]), minutes: z.number().int().min(5).max(60 * 24 * 14).optional(), reason: z.string().max(500).nullish() }).parse(req.body);
    const now = new Date(), until = new Date(now.getTime() + (d.minutes ?? 120) * 60000);
    const users = await prisma.user.findMany({ where: { is_active: true, ...GROUP_WHERE[d.group] }, select: { id: true }, take: 300 });
    const have = new Set((await prisma.browserAccessGrant.findMany({ where: { profile_id: p.id, revoked_at: null, valid_until: { gt: now } }, select: { user_id: true } })).map((g) => g.user_id));
    const todo = users.filter((u) => !have.has(u.id));
    if (todo.length) await prisma.browserAccessGrant.createMany({ data: todo.map((u) => ({ profile_id: p.id, user_id: u.id, valid_from: now, valid_until: until, reason: d.reason ?? `Grupo: ${d.group}`, granted_by_user_id: req.user!.id })) });
    await logEvent(prisma, { profileId: p.id, kind: "grant_created", actorId: req.user!.id, detail: { group: d.group, count: todo.length, valid_until: until } });
    res.status(201).json({ created: todo.length, already_had: users.length - todo.length, valid_until: until });
  } catch (e) { handle(e, res, next); }
});
router.delete("/grants/:id", async (req, res, next) => {
  try {
    const g = await prisma.browserAccessGrant.findUnique({ where: { id: req.params.id as string }, include: { profile: true } });
    if (!g || !(await access(req, g.profile)).manage) throw new SbError("Autorização não encontrada.", 404, "not_found");
    await prisma.browserAccessGrant.update({ where: { id: g.id }, data: { revoked_at: new Date(), revoked_by_user_id: req.user!.id } });
    for (const s of await prisma.browserSession.findMany({ where: { profile_id: g.profile_id, user_id: g.user_id, status: "active", mode: "use" } })) await endSession(prisma, s.id, "killed", "grant_revoked", req.user!.id);
    await logEvent(prisma, { profileId: g.profile_id, kind: "grant_revoked", actorId: req.user!.id, detail: { grant_id: g.id } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Sessões ────────────────────────────────────────────────────────────────────
router.post("/profiles/:id/sessions", async (req, res, next) => {
  try {
    await sweepBrowserSessions(prisma);
    const p = await loadProfile(req);
    const d = z.object({ mode: z.enum(["use", "setup"]).optional() }).parse(req.body ?? {});
    const mode = d.mode ?? "use";
    const { manage, grant } = await access(req, p);
    if (p.status !== "active") throw new SbError("Este perfil foi revogado.", 409, "profile_revoked");
    if (mode === "setup" && !manage) throw new SbError("Só o dono da conta (ou a administração) faz o login inicial.", 403, "forbidden");
    if (mode === "use" && !manage && !grant) {
      await logEvent(prisma, { profileId: p.id, kind: "session_denied", actorId: req.user!.id, detail: { reason: "no_active_grant" } });
      throw new SbError("Você não tem autorização ativa para usar este navegador. Peça ao dono da conta.", 403, "no_grant");
    }
    if (mode === "use" && !p.state_ciphertext && getDriver().name !== "demo") throw new SbError("Ainda não há uma sessão guardada para esta conta: o dono precisa fazer o login inicial.", 409, "no_saved_session");
    const busy = await prisma.browserSession.findFirst({ where: { profile_id: p.id, status: "active" } });
    if (busy) throw new SbError(busy.user_id === req.user!.id ? "Você já tem uma sessão aberta neste perfil." : "Outra pessoa está usando este navegador agora. Tente depois que a sessão terminar.", 409, "profile_busy");
    const now = new Date();
    // Uso: o login guardado vale por "max_session_minutes" a partir de quando o dono logou; passou disso, é obrigatório logar de novo.
    // (Entrar de novo NÃO renova esse prazo.) No login inicial, a sessão dura esse mesmo tempo.
    const loginEnd = mode === "use" ? loginExpiresAt(p) : null;
    if (mode === "use" && loginEnd && loginEnd.getTime() <= now.getTime()) {
      await logEvent(prisma, { profileId: p.id, kind: "session_denied", actorId: req.user!.id, detail: { reason: "login_expired" } });
      throw new SbError("O login desta conta expirou. O dono precisa fazer o login de novo (“Refazer login”).", 409, "login_expired");
    }
    const cap = loginEnd ?? new Date(now.getTime() + p.max_session_minutes * 60000);
    const expires = grant && !manage ? new Date(Math.min(cap.getTime(), grant.valid_until.getTime())) : cap;
    const ticket = newTicket();
    const driver = getDriver();
    const created = await prisma.browserSession.create({ data: { profile_id: p.id, user_id: req.user!.id, grant_id: grant?.id ?? null, mode, expires_at: expires, driver: driver.name, ticket_hash: hashTicket(ticket) } });
    try {
      const storage_state = driver.name === "runner" && mode === "use" ? await readProfileStateForDriver(prisma, p.id) : undefined;
      const started = await driver.start({ id: created.id, profile_id: p.id, mode, start_url: p.start_url, ticket, allowed_hosts: effectiveAllowedHosts(p), restrict: mode === "use", ttl_seconds: Math.max(30, Math.floor((expires.getTime() - Date.now()) / 1000)), storage_state: storage_state ?? undefined });
      await prisma.browserSession.update({ where: { id: created.id }, data: { driver_ref: started.ref } });
      await logEvent(prisma, { profileId: p.id, sessionId: created.id, kind: "session_started", actorId: req.user!.id, detail: { mode, driver: driver.name, expires_at: expires } });
      res.status(201).json({ session: sessionView({ ...created, driver_ref: started.ref }), url: started.url });
    } catch (err) {
      await prisma.browserSession.update({ where: { id: created.id }, data: { status: "failed", ended_at: new Date(), end_reason: "driver_error" } });
      throw err;
    }
  } catch (e) { handle(e, res, next); }
});
async function loadSession(req: Request) {
  const s = await prisma.browserSession.findUnique({ where: { id: req.params.id as string }, include: { profile: true } });
  if (!s) throw new SbError("Sessão não encontrada.", 404, "not_found");
  const manage = (await access(req, s.profile)).manage;
  if (!manage && s.user_id !== req.user!.id) throw new SbError("Sessão não encontrada.", 404, "not_found");
  return { s, manage };
}
router.get("/sessions/mine", async (req, res, next) => {
  try {
    await sweepBrowserSessions(prisma);
    const rows = await prisma.browserSession.findMany({ where: { user_id: req.user!.id }, orderBy: { started_at: "desc" }, take: 50 });
    res.json({ data: rows.map((r) => sessionView(r)) });
  } catch (e) { handle(e, res, next); }
});
router.get("/sessions", async (req, res, next) => {
  try {
    if (!admin(req)) throw new SbError("Só a administração.", 403, "forbidden");
    await sweepBrowserSessions(prisma);
    const rows = await prisma.browserSession.findMany({ where: { status: "active" }, include: { profile: { select: { label: true } } }, orderBy: { started_at: "desc" }, take: 200 });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.user_id) } }, select: { id: true, name: true } });
    const nm = new Map(users.map((u) => [u.id, u.name]));
    res.json({ data: rows.map((r) => ({ ...sessionView(r), profile_label: r.profile.label, user_name: nm.get(r.user_id) ?? "" })) });
  } catch (e) { handle(e, res, next); }
});
router.get("/profiles/:id/sessions", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    await sweepBrowserSessions(prisma);
    const rows = await prisma.browserSession.findMany({ where: { profile_id: p.id }, orderBy: { started_at: "desc" }, take: 100 });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.user_id) } }, select: { id: true, name: true } });
    const nm = new Map(users.map((u) => [u.id, u.name]));
    res.json({ data: rows.map((r) => ({ ...sessionView(r), user_name: nm.get(r.user_id) ?? "" })) });
  } catch (e) { handle(e, res, next); }
});
router.get("/profiles/:id/events", async (req, res, next) => {
  try {
    const p = await loadProfile(req);
    if (!(await access(req, p)).manage) throw new SbError("Perfil não encontrado.", 404, "not_found");
    res.json({ data: await prisma.browserSessionEvent.findMany({ where: { profile_id: p.id }, orderBy: { created_at: "desc" }, take: 200 }) });
  } catch (e) { handle(e, res, next); }
});
router.post("/sessions/:id/heartbeat", async (req, res, next) => {
  try {
    await sweepBrowserSessions(prisma);
    const { s } = await loadSession(req);
    if (s.user_id !== req.user!.id) throw new SbError("Só quem abriu a sessão envia sinal de uso.", 403, "forbidden");
    const row = s.status === "active" ? await prisma.browserSession.update({ where: { id: s.id }, data: { last_activity_at: new Date() } }) : s;
    res.json(sessionView(row));
  } catch (e) { handle(e, res, next); }
});
router.post("/sessions/:id/end", async (req, res, next) => {
  try { const { s } = await loadSession(req); const row = await endSession(prisma, s.id, "ended", "user_ended", req.user!.id); res.json(sessionView(row ?? s)); } catch (e) { handle(e, res, next); }
});
router.post("/sessions/:id/kill", async (req, res, next) => {
  try {
    const { s, manage } = await loadSession(req);
    if (!manage) throw new SbError("Só o dono da conta ou a administração derruba uma sessão.", 403, "forbidden");
    res.json(sessionView((await endSession(prisma, s.id, "killed", "killed_by_manager", req.user!.id)) ?? s));
  } catch (e) { handle(e, res, next); }
});
// Login inicial: no navegador real o servidor exporta a sessão; na demonstração guarda um marcador. Nunca devolve o conteúdo.
router.post("/sessions/:id/save-state", async (req, res, next) => {
  try {
    const { s, manage } = await loadSession(req);
    if (!manage || s.mode !== "setup" || s.status !== "active") throw new SbError("Só em uma sessão de login inicial aberta, pelo dono da conta.", 409, "not_setup");
    if (s.driver === "demo") await saveProfileState(prisma, s.profile_id, { demo: true, saved_at: new Date().toISOString() });
    else if (s.driver === "runner" && s.driver_ref) await saveProfileState(prisma, s.profile_id, await runnerExportState(s.driver_ref));
    else throw new SbError("Este navegador não permite guardar a sessão.", 501, "not_implemented");
    await logEvent(prisma, { profileId: s.profile_id, sessionId: s.id, kind: "state_saved", actorId: req.user!.id });
    await endSession(prisma, s.id, "ended", "setup_done", req.user!.id);
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

export default router;
