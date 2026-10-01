// Conectores DESACOPLADOS por provedor. Um conector sem a configuração externa necessária (credenciais do app OAuth,
// developer token, conta gerenciadora…) fica em "não configurado": NUNCA simula uma conexão bem-sucedida.
import jwt from "jsonwebtoken";
import type { Prisma, PrismaClient } from "@prisma/client";
import { config } from "../../config";
import { ConnectionError } from "./catalog";
import { readSecretForConnector, safeText, storeSecret } from "./secrets";

type Db = PrismaClient | Prisma.TransactionClient;
type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }>;

let fetchImpl: FetchLike = (url, init) => fetch(url, init as RequestInit) as unknown as ReturnType<FetchLike>;
/** Só para testes: troca o transporte HTTP (os testes NÃO simulam conexão — exercitam as respostas de erro/sucesso do provedor). */
export function setConnectorFetch(f: FetchLike | null) {
  fetchImpl = f ?? ((url, init) => fetch(url, init as RequestInit) as unknown as ReturnType<FetchLike>);
}

export type VerifyOutcome = "valid" | "incomplete" | "invalid" | "needs_correction" | "provider_unavailable" | "not_configured";
export interface VerifyResult {
  outcome: VerifyOutcome;
  scopes: string[];
  problem?: string;
  correction?: string;
  evidence?: string;
  /** Permissão concedida além do necessário (menor privilégio). */
  excessive?: string[];
}
export interface ConnectionCtx {
  id: string; external_id: string | null; account_label: string | null; permission_level: string | null; scopes: string[];
}

export interface Connector {
  key: string;
  provider: string;
  label: string;
  requiredEnv: string[];
  supportsOAuth: boolean;
  scopesFor(permission: string | null): string[];
  buildAuthUrl?(p: { state: string; redirectUri: string; permission: string | null }): string;
  exchangeCode?(code: string, redirectUri: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string }>;
  verify(db: Db, ctx: ConnectionCtx): Promise<VerifyResult>;
  requestLink?(customerId: string): Promise<{ status: "pending" | "active" | "refused" | "removed"; detail?: string }>;
  linkStatus?(customerId: string): Promise<{ status: "pending" | "active" | "refused" | "removed" | "none"; detail?: string }>;
}

const env = (k: string) => process.env[k]?.trim() || "";
const missingEnv = (c: Connector) => c.requiredEnv.filter((k) => !env(k));
export const connectorStatus = (c: Connector) => ({ key: c.key, provider: c.provider, label: c.label, state: missingEnv(c).length === 0 ? ("configured" as const) : ("not_configured" as const), missing: missingEnv(c), supports_oauth: c.supportsOAuth });

// ── Google (OAuth comum + adaptadores) ──────────────────────────────────────
const GOOGLE_SCOPES: Record<string, { read: string[]; write: string[] }> = {
  google_ads: { read: ["https://www.googleapis.com/auth/adwords"], write: ["https://www.googleapis.com/auth/adwords"] },
  google_analytics: { read: ["https://www.googleapis.com/auth/analytics.readonly"], write: ["https://www.googleapis.com/auth/analytics.edit"] },
  google_tag_manager: { read: ["https://www.googleapis.com/auth/tagmanager.readonly"], write: ["https://www.googleapis.com/auth/tagmanager.edit.containers"] },
  google_search_console: { read: ["https://www.googleapis.com/auth/webmasters.readonly"], write: ["https://www.googleapis.com/auth/webmasters"] },
  google_business_profile: { read: ["https://www.googleapis.com/auth/business.manage"], write: ["https://www.googleapis.com/auth/business.manage"] },
};
const isReadLevel = (p: string | null) => !p || /^(read|view|analyst|viewer)$/.test(p);
/** Menor privilégio: leitura pede só escopo de leitura; edição pede o escopo mínimo de edição (nunca administração). */
export function googleScopesFor(key: string, permission: string | null): string[] {
  const s = GOOGLE_SCOPES[key];
  if (!s) return [];
  return isReadLevel(permission) ? s.read : s.write;
}

async function googleToken(db: Db, connectionId: string): Promise<string | null> {
  const raw = await readSecretForConnector(db, connectionId);
  if (!raw) return null;
  let tok: { access_token: string; refresh_token?: string; expires_at?: number };
  try { tok = JSON.parse(raw); } catch { return null; }
  if (tok.expires_at && tok.expires_at > Date.now() + 60_000) return tok.access_token;
  if (!tok.refresh_token) return tok.expires_at && tok.expires_at <= Date.now() ? null : tok.access_token;
  const r = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_OAUTH_CLIENT_ID"), client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"), refresh_token: tok.refresh_token, grant_type: "refresh_token" }).toString(),
  });
  if (!r.ok) return null;
  const j = await r.json();
  await storeSecret(db, connectionId, JSON.stringify({ access_token: j.access_token, refresh_token: tok.refresh_token, expires_at: Date.now() + (j.expires_in ?? 3600) * 1000 }));
  return j.access_token as string;
}

function googleConnector(key: string, label: string, extraEnv: string[], verifyApi: (token: string, ctx: ConnectionCtx) => Promise<{ found: boolean; detail?: string }>): Connector {
  return {
    key, provider: "google", label, supportsOAuth: true,
    requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", ...extraEnv],
    scopesFor: (p) => googleScopesFor(key, p),
    buildAuthUrl: ({ state, redirectUri, permission }) => {
      const q = new URLSearchParams({ client_id: env("GOOGLE_OAUTH_CLIENT_ID"), redirect_uri: redirectUri, response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "false", scope: googleScopesFor(key, permission).join(" "), state });
      return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
    },
    exchangeCode: async (code, redirectUri) => {
      const r = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: env("GOOGLE_OAUTH_CLIENT_ID"), client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"), redirect_uri: redirectUri, grant_type: "authorization_code" }).toString(),
      });
      if (!r.ok) throw new ConnectionError("O Google recusou o código de autorização (pode ter expirado). Tente conectar de novo.", 422, "oauth_exchange_failed");
      return r.json();
    },
    async verify(db, ctx) {
      const token = await googleToken(db, ctx.id);
      if (!token) return { outcome: "needs_correction", scopes: [], problem: "A autorização do Google expirou ou foi removida.", correction: "Conecte novamente pela autorização oficial do Google." };
      let granted: string[] = [];
      try {
        const ti = await fetchImpl(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
        if (ti.status >= 500) return { outcome: "provider_unavailable", scopes: [], problem: "O Google está indisponível no momento." };
        if (!ti.ok) return { outcome: "invalid", scopes: [], problem: "O Google não reconhece mais esta autorização.", correction: "Conecte novamente." };
        granted = String((await ti.json()).scope ?? "").split(" ").filter(Boolean);
      } catch (e) { return { outcome: "provider_unavailable", scopes: [], problem: safeText((e as Error).message) }; }
      const wanted = googleScopesFor(key, ctx.permission_level);
      const missing = wanted.filter((w) => !granted.includes(w));
      if (missing.length) return { outcome: "incomplete", scopes: granted, problem: "A autorização não concedeu todas as permissões necessárias.", correction: "Refaça a conexão marcando todas as permissões solicitadas.", evidence: `faltando: ${missing.join(", ")}` };
      const excessive = granted.filter((g) => g.startsWith("https://www.googleapis.com/auth/") && !wanted.includes(g) && !/userinfo|openid|email|profile/.test(g));
      try {
        const api = await verifyApi(token, ctx);
        if (!api.found) return { outcome: "needs_correction", scopes: granted, problem: api.detail ?? "A conta/propriedade escolhida não está acessível por esta autorização.", correction: "Selecione a conta correta ou conceda acesso a ela.", excessive };
        return { outcome: "valid", scopes: granted, evidence: api.detail ?? "Acesso confirmado pela API do provedor.", excessive };
      } catch (e) { return { outcome: "provider_unavailable", scopes: granted, problem: safeText((e as Error).message) }; }
    },
  };
}

const bearer = (t: string, extra: Record<string, string> = {}) => ({ authorization: `Bearer ${t}`, ...extra });

const googleAds = googleConnector("google_ads", "Google Ads", ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_MANAGER_CUSTOMER_ID"], async (token, ctx) => {
  const r = await fetchImpl("https://googleads.googleapis.com/v17/customers:listAccessibleCustomers", { headers: bearer(token, { "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN") }) });
  if (r.status >= 500) throw new Error("Google Ads indisponível");
  if (!r.ok) return { found: false, detail: "O Google Ads recusou a consulta de contas acessíveis." };
  const names: string[] = (await r.json()).resourceNames ?? [];
  const id = (ctx.external_id ?? "").replace(/\D/g, "");
  return { found: !!id && names.some((n) => n.endsWith(`/${id}`)), detail: `Conta ${id} ${names.some((n) => n.endsWith(`/${id}`)) ? "acessível" : "não encontrada"} entre ${names.length} conta(s) acessíveis.` };
});
// Conta gerenciadora da Allka: solicitação de vínculo, aceite pelo cliente e estados pendente/ativo/recusado/removido.
const adsLinkStatus = (s: string): "pending" | "active" | "refused" | "removed" | "none" =>
  ({ PENDING: "pending", ACTIVE: "active", REFUSED: "refused", CANCELED: "removed", CANCELLED: "removed", INACTIVE: "removed", UNKNOWN: "none" } as Record<string, "pending" | "active" | "refused" | "removed" | "none">)[String(s).toUpperCase()] ?? "none";
const googleAdsOauthVerify = googleAds.verify.bind(googleAds);
googleAds.verify = async (db, ctx) => {
  if (!(await readSecretForConnector(db, ctx.id)) && ctx.external_id && googleAds.linkStatus) {
    try {
      const l = await googleAds.linkStatus(ctx.external_id);
      if (l.status === "active") return { outcome: "valid", scopes: [], evidence: `Vínculo da conta gerenciadora da Allka ATIVO com a conta ${ctx.external_id}.` };
      if (l.status === "pending") return { outcome: "incomplete", scopes: [], problem: "O vínculo foi solicitado, mas o cliente ainda não o aceitou no Google Ads.", correction: "Peça ao responsável pela conta que aceite a solicitação de vínculo em Google Ads > Administrador > Acesso e segurança." };
      if (l.status === "refused") return { outcome: "needs_correction", scopes: [], problem: "O cliente recusou o vínculo.", correction: "Confirme a conta correta e envie a solicitação novamente." };
      if (l.status === "removed") return { outcome: "invalid", scopes: [], problem: "O vínculo foi removido.", correction: "Solicite o vínculo novamente." };
      return { outcome: "needs_correction", scopes: [], problem: "Não existe vínculo entre a conta gerenciadora da Allka e esta conta.", correction: "Envie a solicitação de vínculo." };
    } catch (e) { return { outcome: "provider_unavailable", scopes: [], problem: safeText((e as Error).message) }; }
  }
  return googleAdsOauthVerify(db, ctx);
};
googleAds.requestLink = async (customerId) => {
  const mgr = env("GOOGLE_ADS_MANAGER_CUSTOMER_ID").replace(/\D/g, "");
  const token = env("GOOGLE_ADS_MANAGER_ACCESS_TOKEN");
  const r = await fetchImpl(`https://googleads.googleapis.com/v17/customers/${mgr}/customerClientLinks:mutate`, {
    method: "POST", headers: bearer(token, { "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN"), "content-type": "application/json", "login-customer-id": mgr }),
    body: JSON.stringify({ operation: { create: { clientCustomer: `customers/${customerId.replace(/\D/g, "")}`, status: "PENDING" } } }),
  });
  if (r.status >= 500) throw new ConnectionError("O Google Ads está indisponível no momento. Tente novamente.", 503, "provider_unavailable");
  if (!r.ok) return { status: "refused", detail: "O Google Ads recusou a solicitação de vínculo." };
  return { status: "pending", detail: "Solicitação enviada: o cliente precisa aceitá-la no Google Ads." };
};
googleAds.linkStatus = async (customerId) => {
  const mgr = env("GOOGLE_ADS_MANAGER_CUSTOMER_ID").replace(/\D/g, "");
  const token = env("GOOGLE_ADS_MANAGER_ACCESS_TOKEN");
  const q = `SELECT customer_client_link.status FROM customer_client_link WHERE customer_client_link.client_customer = 'customers/${customerId.replace(/\D/g, "")}'`;
  const r = await fetchImpl(`https://googleads.googleapis.com/v17/customers/${mgr}/googleAds:search`, {
    method: "POST", headers: bearer(token, { "developer-token": env("GOOGLE_ADS_DEVELOPER_TOKEN"), "content-type": "application/json", "login-customer-id": mgr }), body: JSON.stringify({ query: q }),
  });
  if (r.status >= 500) throw new ConnectionError("O Google Ads está indisponível no momento.", 503, "provider_unavailable");
  if (!r.ok) return { status: "none", detail: "Não foi possível consultar o vínculo." };
  const row = ((await r.json()).results ?? [])[0];
  return { status: adsLinkStatus(row?.customerClientLink?.status ?? "UNKNOWN") };
};

const ga4 = googleConnector("google_analytics", "Google Analytics 4", [], async (token, ctx) => {
  const r = await fetchImpl("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", { headers: bearer(token) });
  if (r.status >= 500) throw new Error("Google Analytics indisponível");
  if (!r.ok) return { found: false, detail: "O Google Analytics recusou a consulta." };
  const accounts: any[] = (await r.json()).accountSummaries ?? [];
  const props = accounts.flatMap((a) => (a.propertySummaries ?? []).map((p: any) => String(p.property).replace("properties/", "")));
  const id = (ctx.external_id ?? "").replace(/^properties\//, "");
  return { found: !!id && props.includes(id), detail: `Propriedade ${id}: ${props.includes(id) ? "acessível" : "não encontrada"}.` };
});
const gtm = googleConnector("google_tag_manager", "Google Tag Manager", [], async (token, ctx) => {
  const r = await fetchImpl("https://tagmanager.googleapis.com/tagmanager/v2/accounts", { headers: bearer(token) });
  if (r.status >= 500) throw new Error("Google Tag Manager indisponível");
  if (!r.ok) return { found: false, detail: "O Tag Manager recusou a consulta." };
  const accs: any[] = (await r.json()).account ?? [];
  return { found: accs.length > 0 && (!ctx.external_id || accs.some((a) => String(a.accountId) === ctx.external_id || ctx.external_id!.includes(String(a.accountId)))), detail: `${accs.length} conta(s) do GTM acessível(is).` };
});
const gsc = googleConnector("google_search_console", "Google Search Console", [], async (token, ctx) => {
  const r = await fetchImpl("https://www.googleapis.com/webmasters/v3/sites", { headers: bearer(token) });
  if (!r.ok) return { found: false, detail: "O Search Console recusou a consulta." };
  const sites: any[] = (await r.json()).siteEntry ?? [];
  return { found: !!ctx.external_id && sites.some((s) => s.siteUrl === ctx.external_id), detail: `${sites.length} propriedade(s) acessível(is).` };
});
const gbp = googleConnector("google_business_profile", "Google Business Profile", [], async () => ({ found: true, detail: "Autorização confirmada (conferência do perfil é humana)." }));

// ── Meta: empresa parceira / autorização oficial (nunca senha) ──────────────
const meta: Connector = {
  key: "meta_business", provider: "meta", label: "Meta Business", supportsOAuth: false,
  requiredEnv: ["META_APP_ID", "META_APP_SECRET", "ALLKA_META_BUSINESS_ID"],
  scopesFor: (p) => (isReadLevel(p) ? ["ads_read", "business_management"] : ["ads_management", "business_management"]),
  async verify() {
    // Sem a configuração do app/portfólio da Allka não há como confirmar o vínculo: a validação é humana.
    if (missingEnv(meta).length) return { outcome: "not_configured", scopes: [], problem: "Integração com a Meta ainda não configurada neste ambiente: a validação precisa ser manual." };
    return { outcome: "incomplete", scopes: [], problem: "A confirmação automática do vínculo empresarial ainda depende de revisão humana.", evidence: "Conector Meta configurado; confirmação humana pendente." };
  },
};

// ── WordPress: usuário temporário / senha de aplicação ─────────────────────
const wordpress: Connector = {
  key: "wordpress", provider: "wordpress", label: "WordPress", supportsOAuth: false, requiredEnv: [],
  scopesFor: () => [],
  async verify(db, ctx) {
    const site = (ctx.external_id ?? "").replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(site)) return { outcome: "needs_correction", scopes: [], problem: "Informe o endereço completo do site (https://…).", correction: "Edite a conexão e informe a URL do WordPress." };
    const secret = await readSecretForConnector(db, ctx.id);
    if (!secret || !ctx.account_label) return { outcome: "incomplete", scopes: [], problem: "Falta o usuário ou a senha de aplicação.", correction: "Informe o usuário temporário e a senha de aplicação (protegida em cofre)." };
    try {
      const r = await fetchImpl(`${site}/wp-json/wp/v2/users/me?context=edit`, { headers: { authorization: `Basic ${Buffer.from(`${ctx.account_label}:${secret}`).toString("base64")}` } });
      if (r.status >= 500) return { outcome: "provider_unavailable", scopes: [], problem: "O site não respondeu (erro do servidor)." };
      if (r.status === 401 || r.status === 403) return { outcome: "invalid", scopes: [], problem: "O WordPress recusou o usuário ou a senha de aplicação.", correction: "Gere uma nova senha de aplicação para o usuário temporário e informe de novo." };
      if (!r.ok) return { outcome: "needs_correction", scopes: [], problem: `O site respondeu ${r.status}: confira a URL e se a API REST está ativa.` };
      const me = await r.json();
      const roles: string[] = me.roles ?? [];
      return { outcome: "valid", scopes: roles, evidence: `Login confirmado como "${me.slug ?? ctx.account_label}" (papéis: ${roles.join(", ") || "n/d"}).`, excessive: roles.includes("administrator") && ctx.permission_level !== "admin" ? ["administrator"] : [] };
    } catch (e) { return { outcome: "provider_unavailable", scopes: [], problem: `Não foi possível alcançar o site: ${safeText((e as Error).message)}` }; }
  },
};

const generic: Connector = { key: "none", provider: "manual", label: "Validação manual", supportsOAuth: false, requiredEnv: [], scopesFor: () => [], async verify() { return { outcome: "not_configured", scopes: [], problem: "Sem integração automática para este tipo: a validação é manual." }; } };

const REGISTRY: Record<string, Connector> = { google_ads: googleAds, google_analytics: ga4, google_tag_manager: gtm, google_search_console: gsc, google_business_profile: gbp, meta_business: meta, wordpress };

export const getConnector = (integrationKey: string | null | undefined): Connector => (integrationKey && REGISTRY[integrationKey]) || generic;
export const listConnectors = () => Object.values(REGISTRY).map(connectorStatus);

// ── OAuth: estado assinado (CSRF), expiração e cancelamento ──────────────────
const STATE_TTL_S = 10 * 60;
export interface OAuthStatePayload { connection_id: string; user_id: string; integration: string }
export const signOAuthState = (p: OAuthStatePayload) => jwt.sign({ ...p, aud: "conn-oauth" }, config.JWT_SECRET, { expiresIn: STATE_TTL_S });
export function verifyOAuthState(token: string): OAuthStatePayload {
  try {
    const d = jwt.verify(token, config.JWT_SECRET, { audience: "conn-oauth" }) as OAuthStatePayload;
    return { connection_id: d.connection_id, user_id: d.user_id, integration: d.integration };
  } catch (e) {
    if ((e as Error).name === "TokenExpiredError") throw new ConnectionError("O link de autorização expirou. Inicie a conexão novamente.", 410, "oauth_expired");
    throw new ConnectionError("Autorização inválida.", 400, "oauth_state_invalid");
  }
}
export const oauthRedirectUri = () => env("CONNECTIONS_OAUTH_REDIRECT_URI") || `${env("PUBLIC_API_URL") || "http://localhost:3001"}/api/connections/oauth/callback`;
