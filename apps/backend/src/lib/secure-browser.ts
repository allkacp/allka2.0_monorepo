// D3 — Navegador seguro: o navegador roda NO SERVIDOR e é mostrado dentro da plataforma; a conta do cliente fica logada nele; quem usa nunca vê senha
// nem cookie. Este módulo é o "plano de controle": perfis com consentimento, autorizações por tempo, sessões com expiração, auditoria e cofre.
// O navegador em si vem de um DRIVER (demo para desenvolver/testar; docker é o esqueleto do real e vem DESLIGADO — ver SECURE_BROWSER_DRIVER).
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import type { Prisma, PrismaClient } from "@prisma/client";
import { ownerOf, sameOwner } from "./internal-tasks";
import { isAdminUser } from "./project-scope";
import { decryptToken, encryptToken, isTokenEncryptionConfigured } from "./token-encryption";

type Db = PrismaClient | Prisma.TransactionClient;

export const CONSENT_VERSION = "v1";
export const CONSENT_TEXT = "Autorizo a Allka a guardar, de forma cifrada, a sessão desta conta no navegador seguro e a permitir que profissionais indicados por mim a usem por tempo determinado, sem acesso à minha senha. Posso revogar a qualquer momento. Todo uso fica registrado.";
export const IDLE_MINUTES = 15;
export const MAX_SESSION_MINUTES_LIMIT = 240;

export class SbError extends Error { constructor(message: string, public httpStatus = 422, public code = "secure_browser") { super(message); } }
export type Actor = { id: string; account_type?: string; role?: string };

export const hashTicket = (t: string) => crypto.createHash("sha256").update(t).digest("hex");
export const newTicket = () => crypto.randomBytes(24).toString("hex");

// ── Drivers ───────────────────────────────────────────────────────────────
export interface DriverSession { allowed_hosts?: string[]; restrict?: boolean; id: string; profile_id: string; mode: string; start_url: string; ticket: string; ttl_seconds?: number; storage_state?: unknown }
export interface Driver { name: string; start(s: DriverSession): Promise<{ ref: string; url: string }>; stop(ref: string): Promise<void> }

export const demoDriver: Driver = {
  name: "demo",
  async start(s) { return { ref: `demo-${s.id}`, url: `/api/secure-browser/demo/${s.id}?t=${s.ticket}` }; },
  async stop() { /* nada a encerrar */ },
};

/**
 * Esqueleto do driver real (contêiner Chromium acessível por navegador, ex.: Neko). DESLIGADO por padrão: só funciona com SECURE_BROWSER_DRIVER=docker,
 * SECURE_BROWSER_DOCKER_IMAGE e acesso ao docker pelo servidor. NÃO foi validado contra um navegador real neste ambiente.
 */
export const dockerDriver: Driver = {
  name: "docker",
  async start(s) {
    const image = process.env.SECURE_BROWSER_DOCKER_IMAGE;
    if (!image) throw new SbError("O navegador seguro real não está configurado neste ambiente (SECURE_BROWSER_DOCKER_IMAGE).", 503, "driver_not_configured");
    const port = 20000 + Math.floor(Math.random() * 20000);
    const name = `sb-${s.id}`;
    const args = ["run", "-d", "--rm", "--name", name, "--shm-size=1g", "--memory=2g", "--cpus=1", "-p", `${port}:8080`, "-e", `NEKO_PASSWORD=${s.ticket}`, "-e", `NEKO_PASSWORD_ADMIN=${crypto.randomBytes(12).toString("hex")}`, image];
    await new Promise<void>((resolve, reject) => execFile("docker", args, { timeout: 30000 }, (err) => (err ? reject(new SbError(`Não foi possível abrir o navegador: ${err.message}`, 503, "driver_failed")) : resolve())));
    return { ref: name, url: `${process.env.SECURE_BROWSER_PUBLIC_BASE ?? "http://localhost"}:${port}` };
  },
  async stop(ref) { await new Promise<void>((resolve) => execFile("docker", ["rm", "-f", ref], { timeout: 20000 }, () => resolve())); },
};
// Driver real: Chromium em contêiner isolado (docker/browser-runner), transmitido por WebSocket. Ativo quando SECURE_BROWSER_RUNNER_URL está definido.
export const runnerBase = () => (process.env.SECURE_BROWSER_RUNNER_URL ?? "").replace(/\/$/, "");
export const runnerSecret = () => process.env.SECURE_BROWSER_RUNNER_SECRET ?? "";
async function runnerCall(path: string, method: string, body?: unknown): Promise<any> {
  let r: Response;
  try {
    r = await fetch(`${runnerBase()}${path}`, { method, headers: { "content-type": "application/json", "x-runner-secret": runnerSecret() }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  } catch { throw new SbError("O navegador seguro está indisponível no momento.", 503, "runner_unavailable"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new SbError(typeof j?.error === "string" ? j.error : "Falha no navegador seguro.", r.status === 503 ? 503 : r.status === 422 ? 422 : 502, "runner_error");
  return j;
}
export const runnerDriver: Driver = {
  name: "runner",
  async start(s) {
    await runnerCall("/sessions", "POST", { allowed_hosts: s.allowed_hosts, restrict: !!s.restrict, id: s.id, start_url: s.start_url, storage_state: s.storage_state ?? undefined, ttl_seconds: s.ttl_seconds ?? 3600 });
    return { ref: s.id, url: `/api/secure-browser/ws/${s.id}?t=${s.ticket}` };
  },
  async stop(ref) { if (ref) await runnerCall(`/sessions/${ref}`, "DELETE").catch(() => null); },
};
export const runnerExportState = async (ref: string): Promise<unknown> => (await runnerCall(`/sessions/${ref}/export-state`, "POST", {})).state;
export function getDriver(): Driver { return runnerBase() ? runnerDriver : process.env.SECURE_BROWSER_DRIVER === "docker" ? dockerDriver : demoDriver; }
const driverByName = (n: string) => (n === "runner" ? runnerDriver : n === "docker" ? dockerDriver : demoDriver);

// ── Auditoria ─────────────────────────────────────────────────────────────
export async function logEvent(db: Db, e: { profileId: string; sessionId?: string | null; kind: string; actorId?: string | null; detail?: unknown }) {
  await db.browserSessionEvent.create({ data: { profile_id: e.profileId, session_id: e.sessionId ?? null, kind: e.kind, actor_user_id: e.actorId ?? null, detail: e.detail ? JSON.stringify(e.detail).slice(0, 4000) : null } });
}

// ── Permissões ────────────────────────────────────────────────────────────
export async function canManageProfile(db: Db, user: Actor, p: { company_id: string | null; agency_id: string | null }): Promise<boolean> {
  if (isAdminUser(user)) return true;
  const o = await ownerOf(db, user);
  return !!o && sameOwner({ agency_id: p.agency_id, company_id: p.company_id }, o);
}
export async function activeGrantFor(db: Db, profileId: string, userId: string, now = new Date()) {
  return db.browserAccessGrant.findFirst({ where: { profile_id: profileId, user_id: userId, revoked_at: null, valid_from: { lte: now }, valid_until: { gt: now } }, orderBy: { valid_until: "desc" } });
}

/** Expira o que passou do prazo ou ficou ocioso e encerra o navegador do servidor. Devolve quantas sessões encerrou. */
export async function sweepBrowserSessions(db: PrismaClient, now = new Date()): Promise<number> {
  const idleLimit = new Date(now.getTime() - IDLE_MINUTES * 60000);
  const rows = await db.browserSession.findMany({ where: { status: "active", OR: [{ expires_at: { lt: now } }, { last_activity_at: { lt: idleLimit } }] }, take: 200 });
  for (const s of rows) {
    const reason = s.expires_at.getTime() < now.getTime() ? "time_limit" : "idle";
    await driverByName(s.driver).stop(s.driver_ref ?? "").catch(() => null);
    await db.browserSession.update({ where: { id: s.id }, data: { status: "expired", ended_at: now, end_reason: reason } });
    await logEvent(db, { profileId: s.profile_id, sessionId: s.id, kind: "session_expired", actorId: null, detail: { reason } });
  }
  return rows.length;
}

export async function endSession(db: PrismaClient, sessionId: string, status: "ended" | "killed" | "expired", reason: string, actorId: string | null) {
  const s = await db.browserSession.findUnique({ where: { id: sessionId } });
  if (!s || s.status !== "active") return s;
  await driverByName(s.driver).stop(s.driver_ref ?? "").catch(() => null);
  const row = await db.browserSession.update({ where: { id: s.id }, data: { status, ended_at: new Date(), end_reason: reason } });
  await logEvent(db, { profileId: s.profile_id, sessionId: s.id, kind: `session_${status}`, actorId, detail: { reason } });
  return row;
}

// ── Cofre do estado da sessão (cookies) — nunca devolvido por API ───────────
export const vaultReady = () => isTokenEncryptionConfigured();
export async function saveProfileState(db: Db, profileId: string, state: unknown) {
  if (!vaultReady()) throw new SbError("O cofre de segredos não está configurado neste ambiente (META_TOKEN_ENCRYPTION_KEY).", 503, "secret_vault_not_configured");
  await db.browserProfile.update({ where: { id: profileId }, data: { state_ciphertext: encryptToken(JSON.stringify(state)), state_updated_at: new Date() } });
}
/** Uso INTERNO do driver real (injetar a sessão no navegador). */
export async function readProfileStateForDriver(db: Db, profileId: string): Promise<unknown | null> {
  const p = await db.browserProfile.findUnique({ where: { id: profileId }, select: { state_ciphertext: true } });
  return p?.state_ciphertext ? JSON.parse(decryptToken(p.state_ciphertext)) : null;
}

/** Domínios irmãos: ao entrar no Instagram/Facebook o login passa por domínios da Meta; o mesmo vale para o Google. */
const SIBLINGS: Array<[RegExp, string[]]> = [
  [/(^|\.)(instagram|facebook|fb|meta)\.com$/, ["instagram.com", "facebook.com", "fb.com", "meta.com"]],
  [/(^|\.)google\.com(\.br)?$/, ["google.com", "google.com.br"]],
];
export function defaultAllowedHosts(startUrl: string): string[] {
  try {
    const h = new URL(startUrl).hostname.toLowerCase().replace(/^www\./, "");
    for (const [re, list] of SIBLINGS) if (re.test(h)) return list;
    return [h];
  } catch { return []; }
}
export const parseHosts = (csv: string | null | undefined) => (csv ?? "").split(",").map((x) => x.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "")).filter(Boolean);
export const effectiveAllowedHosts = (p: { allowed_hosts: string | null; start_url: string }) => { const own = parseHosts(p.allowed_hosts); return own.length ? own : defaultAllowedHosts(p.start_url); };

/** Validade do login guardado: conta a partir do momento em que o dono fez o login (e não a cada vez que alguém entra). */
export const loginExpiresAt = (p: { state_ciphertext: string | null; state_updated_at: Date | null; max_session_minutes: number }) => (p.state_ciphertext && p.state_updated_at ? new Date(p.state_updated_at.getTime() + p.max_session_minutes * 60000) : null);

export function profileView(p: Prisma.BrowserProfileGetPayload<object>) {
  return {
    id: p.id, label: p.label, start_url: p.start_url, provider_hint: p.provider_hint, status: p.status, company_id: p.company_id, agency_id: p.agency_id, connection_id: p.connection_id,
    consent_at: p.consent_at, consent_version: p.consent_version, login_expires_at: loginExpiresAt(p), login_expired: (() => { const e = loginExpiresAt(p); return !!e && e.getTime() <= Date.now() })(), allowed_hosts: effectiveAllowedHosts(p), allowed_hosts_custom: parseHosts(p.allowed_hosts).length > 0, has_saved_session: !!p.state_ciphertext, state_updated_at: p.state_updated_at, max_session_minutes: p.max_session_minutes, created_at: p.created_at,
  };
}
export function sessionView(s: Prisma.BrowserSessionGetPayload<object>, now = new Date()) {
  return { id: s.id, profile_id: s.profile_id, user_id: s.user_id, driver: s.driver, mode: s.mode, status: s.status, started_at: s.started_at, expires_at: s.expires_at, ended_at: s.ended_at, end_reason: s.end_reason, remaining_seconds: s.status === "active" ? Math.max(0, Math.floor((s.expires_at.getTime() - now.getTime()) / 1000)) : 0 };
}
