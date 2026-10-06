// Conexões e acessos necessários — vocabulário, catálogo global de tipos e regras puras.
// NUNCA guarda senha em campo comum: segredos só em ConnectionSecret (cifrado).
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export class ConnectionError extends Error {
  httpStatus: number;
  code: string;
  details?: unknown;
  constructor(message: string, httpStatus = 422, code = "connection_invalid", details?: unknown) {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
  }
}

export const METHOD_MESSAGE = "Você não precisa compartilhar suas senhas. Utilize uma conexão oficial, convite ou autorização segura.";

/** Ordem de preferência (a mais segura primeiro). */
export const CONNECTION_METHODS = [
  "oauth", "account_link", "manager_account", "partner_business", "user_invite", "temporary_user",
  "revocable_token", "api_key", "secure_browser", "app_password", "plugin", "protected_file", "manual_instruction", "other",
] as const;
export type ConnectionMethod = (typeof CONNECTION_METHODS)[number];
export const CONNECTION_METHOD_LABEL: Record<ConnectionMethod, string> = {
  oauth: "OAuth / integração oficial",
  account_link: "Vinculação de conta",
  manager_account: "Conta gerenciadora",
  partner_business: "Empresa parceira",
  user_invite: "Convite de usuário corporativo da Allka",
  temporary_user: "Usuário temporário (permissão mínima)",
  revocable_token: "Token revogável",
  api_key: "Chave de API / integração por API",
  secure_browser: "Navegador seguro da Allka (login uma vez, uso por tempo autorizado)",
  app_password: "Senha de aplicação",
  plugin: "Integração por plugin",
  protected_file: "Arquivo protegido",
  manual_instruction: "Instrução manual",
  other: "Outro método",
};
/** Métodos que exigem guardar um segredo (cofre cifrado). */
export const SECRET_METHODS: ConnectionMethod[] = ["revocable_token", "api_key", "app_password", "protected_file", "temporary_user"];

// ── Campos que o cliente preenche, definidos por tipo de acesso ──────────────
export const FIELD_TYPES = ["text", "secret", "url", "email", "number", "textarea"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const FIELD_TYPE_LABEL: Record<FieldType, string> = { text: "Texto", secret: "Segredo (cofre cifrado)", url: "Endereço (URL)", email: "E-mail", number: "Número", textarea: "Texto longo" };
export interface FieldDef { key: string; label: string; type: FieldType; required: boolean; help?: string | null }
const SECRET_KEY_LIKE = /(senha|password|passwd|secret|token|api[_-]?key|credencial|authorization)/i;
export function parseFieldDefs(json: string | null | undefined): FieldDef[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v.filter((f) => f && typeof f.key === "string" && typeof f.label === "string") : []; } catch { return []; }
}
/** Valida a definição de campos de um tipo (cadastro pelo administrador). */
export function validateFieldDefs(defs: FieldDef[]): string | null {
  if (defs.length > 20) return "No máximo 20 campos por tipo de acesso.";
  const seen = new Set<string>();
  for (const f of defs) {
    if (!/^[a-z0-9_]{2,40}$/.test(f.key)) return `Identificador de campo inválido ("${f.key}"): use letras minúsculas, números e _.`;
    if (seen.has(f.key)) return `Campo repetido: ${f.key}.`;
    seen.add(f.key);
    if (!f.label?.trim()) return "Todo campo precisa de um nome.";
    if (!(FIELD_TYPES as readonly string[]).includes(f.type)) return `Tipo de campo inválido em "${f.label}".`;
    if (f.type !== "secret" && SECRET_KEY_LIKE.test(f.key)) return `O campo "${f.label}" parece guardar senha/token/chave: use o tipo "Segredo (cofre cifrado)".`;
  }
  return null;
}
/** Separa os valores informados pelo cliente: secretos (cofre) x comuns (guardados no cadastro). */
export function splitFieldValues(defs: FieldDef[], input: { key: string; value: string }[] | null | undefined) {
  const stored: Record<string, string> = {};
  const secrets: [string, string][] = [];
  for (const it of input ?? []) {
    const d = defs.find((x) => x.key === it.key);
    if (!d) throw new ConnectionError(`Campo desconhecido para este tipo de acesso: ${it.key}.`, 422, "connection_field_unknown");
    const v = String(it.value ?? "").trim();
    if (!v) continue;
    if (d.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new ConnectionError(`"${d.label}": e-mail inválido.`, 422, "connection_field_invalid");
    if (d.type === "number" && !Number.isFinite(Number(v))) throw new ConnectionError(`"${d.label}": informe um número.`, 422, "connection_field_invalid");
    if (d.type === "url") { try { new URL(v); } catch { throw new ConnectionError(`"${d.label}": endereço inválido (use https://…).`, 422, "connection_field_invalid"); } }
    if (d.type === "secret") { secrets.push([d.key, v]); stored[d.key] = "__set__"; } else stored[d.key] = v;
  }
  return { stored, secrets, hasAny: Object.keys(stored).length > 0 };
}
export function missingRequiredFields(defs: FieldDef[], storedJson: string | null | undefined): string[] {
  let stored: Record<string, string> = {};
  try { stored = storedJson ? JSON.parse(storedJson) : {}; } catch { stored = {}; }
  return defs.filter((d) => d.required && !stored[d.key]).map((d) => d.label);
}

export const CONNECTION_STATES = [
  "not_requested", "awaiting_submission", "submitted", "awaiting_validation", "valid", "incomplete", "invalid",
  "needs_correction", "expired", "removed", "revoked", "dispensed",
] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];
export const CONNECTION_STATE_LABEL: Record<ConnectionState, string> = {
  not_requested: "Não solicitado",
  awaiting_submission: "Aguardando envio",
  submitted: "Enviado",
  awaiting_validation: "Aguardando validação",
  valid: "Válido",
  incomplete: "Incompleto",
  invalid: "Inválido",
  needs_correction: "Precisa de correção",
  expired: "Expirado",
  removed: "Removido",
  revoked: "Revogado",
  dispensed: "Dispensado",
};
/** Estados em que a conexão atende a dependência (junto com a regra de revalidação). */
export const SATISFYING_STATES: ConnectionState[] = ["valid", "dispensed"];

export const WHEN_NEEDED = [
  "during_checkout", "after_checkout", "before_project_start", "before_task", "before_step", "before_completion",
  "implementation_only", "revalidation_only", "on_condition",
] as const;
export type WhenNeeded = (typeof WHEN_NEEDED)[number];
export const WHEN_NEEDED_LABEL: Record<WhenNeeded, string> = {
  during_checkout: "Durante a contratação",
  after_checkout: "Depois da contratação",
  before_project_start: "Antes do início do projeto",
  before_task: "Antes de determinada tarefa",
  before_step: "Antes de determinada etapa",
  before_completion: "Antes da conclusão",
  implementation_only: "Apenas na implantação",
  revalidation_only: "Apenas na revalidação",
  on_condition: "Quando uma condição ocorrer",
};
export const OBLIGATIONS = ["required", "optional", "conditional"] as const;
export type Obligation = (typeof OBLIGATIONS)[number];
export const OBLIGATION_LABEL: Record<Obligation, string> = { required: "Obrigatória", optional: "Opcional", conditional: "Condicional" };

export const PENDING_BEHAVIORS = ["allow_draft", "block_dependents", "block_checkout", "alert_only"] as const;
export type PendingBehavior = (typeof PENDING_BEHAVIORS)[number];
export const PENDING_BEHAVIOR_LABEL: Record<PendingBehavior, string> = {
  allow_draft: "Permitir preenchimento e salvar rascunho",
  block_dependents: "Permitir contratar e bloquear só as tarefas dependentes (padrão)",
  block_checkout: "Bloquear a conclusão da contratação",
  alert_only: "Somente alertar",
};
export const GRANT_SCOPES = ["task", "selected_tasks", "project"] as const;
export type GrantScope = (typeof GRANT_SCOPES)[number];
export const GRANT_SCOPE_LABEL: Record<GrantScope, string> = {
  task: "Somente nesta tarefa",
  selected_tasks: "Em tarefas selecionadas",
  project: "Em todo este projeto",
};
export const VALIDATION_MODES = ["automatic", "manual", "automatic_with_human"] as const;
export type ValidationMode = (typeof VALIDATION_MODES)[number];
export const DEPENDENCY_KINDS = ["start", "continue", "conclude", "info"] as const;
export type DependencyKind = (typeof DEPENDENCY_KINDS)[number];
export const DEPENDENCY_KIND_LABEL: Record<DependencyKind, string> = {
  start: "Necessária para iniciar",
  continue: "Necessária para continuar",
  conclude: "Necessária para concluir",
  info: "Somente informativa",
};
export const RESPONSIBLE_PARTIES = ["client", "agency", "provider", "allka"] as const;
export const HANDLINGS = ["now", "later", "draft"] as const;

export const ASSET_RULES_CONN = ["first_only", "always", "every_x_days", "on_executor_change", "on_client_change", "none_while_valid", "light_check"] as const;

export const CONNECTION_EVENT_KINDS = [
  "created", "authorized", "used", "validated", "reused", "changed", "expired", "revoked", "dispensed",
  "sensitive_view", "manual_release", "requested", "reminder", "escalated", "blocked", "released", "paused", "resumed",
  "executor_changed", "oauth_started", "oauth_cancelled", "oauth_failed", "guidance",
] as const;

// ── Catálogo global de tipos (semente) ──────────────────────────────────────
interface SeedType {
  key: string; name: string; description: string; icon: string; provider: string | null; integration_key: string | null;
  methods: ConnectionMethod[]; permissions: { key: string; label: string }[]; auto: boolean; instructions: string;
}
const P_RW = [{ key: "read", label: "Somente leitura" }, { key: "standard", label: "Padrão (editar)" }, { key: "admin", label: "Administrador" }];
const P_BASIC = [{ key: "read", label: "Somente leitura" }, { key: "read_write", label: "Leitura e edição" }, { key: "admin", label: "Administrador" }];
const NO_PASSWORD = "Você não precisa compartilhar sua senha. Use a conexão oficial, o convite ou a autorização segura indicada.";

export const CONNECTION_TYPE_SEED: SeedType[] = [
  { key: "google_ads", name: "Google Ads", description: "Conta de anúncios do Google Ads vinculada à conta gerenciadora da Allka.", icon: "megaphone", provider: "google", integration_key: "google_ads", methods: ["manager_account", "oauth", "user_invite"], permissions: P_RW, auto: true, instructions: `Aceite a solicitação de vínculo enviada pela conta gerenciadora da Allka em Admin > Acesso e segurança. ${NO_PASSWORD}` },
  { key: "google_analytics_4", name: "Google Analytics 4", description: "Propriedade do GA4 (leitura/edição).", icon: "bar-chart", provider: "google", integration_key: "google_analytics", methods: ["oauth", "user_invite"], permissions: P_BASIC, auto: true, instructions: `Autorize pela conexão oficial do Google e selecione a propriedade. ${NO_PASSWORD}` },
  { key: "google_tag_manager", name: "Google Tag Manager", description: "Conta, contêiner e workspace do GTM.", icon: "tag", provider: "google", integration_key: "google_tag_manager", methods: ["oauth", "user_invite"], permissions: P_BASIC, auto: true, instructions: `Autorize pela conexão oficial do Google e selecione o contêiner. ${NO_PASSWORD}` },
  { key: "google_search_console", name: "Google Search Console", description: "Propriedade do Search Console.", icon: "search", provider: "google", integration_key: "google_search_console", methods: ["oauth", "user_invite"], permissions: [{ key: "read", label: "Somente leitura" }, { key: "full", label: "Proprietário completo" }], auto: true, instructions: NO_PASSWORD },
  { key: "google_business_profile", name: "Google Business Profile", description: "Perfil da empresa no Google.", icon: "store", provider: "google", integration_key: "google_business_profile", methods: ["oauth", "user_invite"], permissions: [{ key: "manager", label: "Gerente" }, { key: "owner", label: "Proprietário" }], auto: false, instructions: NO_PASSWORD },
  { key: "meta_business_manager", name: "Meta Business Manager", description: "Portfólio empresarial da Meta.", icon: "briefcase", provider: "meta", integration_key: "meta_business", methods: ["partner_business", "oauth"], permissions: P_BASIC, auto: false, instructions: `Compartilhe os ativos com a empresa parceira da Allka no Meta Business Manager. Nunca informe senha do Facebook ou Instagram. ${NO_PASSWORD}` },
  { key: "meta_ad_account", name: "Conta de anúncios da Meta", description: "Conta de anúncios (Meta Ads).", icon: "megaphone", provider: "meta", integration_key: "meta_business", methods: ["partner_business", "oauth"], permissions: [{ key: "analyst", label: "Analista" }, { key: "advertiser", label: "Anunciante" }, { key: "admin", label: "Administrador" }], auto: false, instructions: NO_PASSWORD },
  { key: "facebook_page", name: "Página do Facebook", description: "Página do Facebook da empresa.", icon: "facebook", provider: "meta", integration_key: "meta_business", methods: ["partner_business", "oauth"], permissions: [{ key: "content", label: "Conteúdo" }, { key: "ads", label: "Anúncios" }, { key: "full", label: "Controle total" }], auto: false, instructions: NO_PASSWORD },
  { key: "instagram", name: "Instagram", description: "Perfil profissional do Instagram.", icon: "instagram", provider: "meta", integration_key: "meta_business", methods: ["partner_business", "oauth"], permissions: [{ key: "content", label: "Conteúdo" }, { key: "full", label: "Controle total" }], auto: false, instructions: NO_PASSWORD },
  { key: "pixel_capi", name: "Pixel / Conversions API", description: "Pixel da Meta e/ou Conversions API.", icon: "activity", provider: "meta", integration_key: "meta_business", methods: ["partner_business", "oauth", "manual_instruction"], permissions: [{ key: "read", label: "Somente leitura" }, { key: "manage", label: "Gerenciar" }], auto: false, instructions: NO_PASSWORD },
  { key: "wordpress", name: "WordPress", description: "Site WordPress (usuário temporário, senha de aplicação ou plugin futuro).", icon: "globe", provider: "wordpress", integration_key: "wordpress", methods: ["temporary_user", "app_password", "manual_instruction", "plugin"], permissions: [{ key: "editor", label: "Editor" }, { key: "author", label: "Autor" }, { key: "admin", label: "Administrador" }], auto: false, instructions: "Crie um usuário temporário só para a Allka (ou uma senha de aplicação) — separado da sua senha principal e revogável a qualquer momento." },
  { key: "other_cms", name: "Outro CMS", description: "Outro gerenciador de conteúdo.", icon: "layout", provider: null, integration_key: null, methods: ["temporary_user", "revocable_token", "user_invite", "manual_instruction", "other"], permissions: P_BASIC, auto: false, instructions: NO_PASSWORD },
  { key: "site_landing", name: "Site ou landing page", description: "Endereço e acesso do site ou landing page.", icon: "monitor", provider: null, integration_key: null, methods: ["user_invite", "temporary_user", "manual_instruction", "other"], permissions: P_BASIC, auto: false, instructions: NO_PASSWORD },
  { key: "domain", name: "Domínio", description: "Registro do domínio (DNS).", icon: "link", provider: null, integration_key: null, methods: ["user_invite", "manual_instruction", "other"], permissions: [{ key: "dns", label: "Editar DNS" }, { key: "admin", label: "Administrador" }], auto: false, instructions: "Preferir delegação de acesso ao DNS pelo próprio registrador. " + NO_PASSWORD },
  { key: "hosting", name: "Hospedagem", description: "Painel de hospedagem do site.", icon: "server", provider: null, integration_key: null, methods: ["user_invite", "temporary_user", "revocable_token", "manual_instruction"], permissions: P_BASIC, auto: false, instructions: NO_PASSWORD },
  { key: "crm", name: "CRM", description: "Sistema de CRM do cliente.", icon: "users", provider: null, integration_key: null, methods: ["oauth", "user_invite", "revocable_token", "manual_instruction"], permissions: P_BASIC, auto: false, instructions: NO_PASSWORD },
  { key: "automation_tool", name: "Ferramenta de automação", description: "Plataforma de automação (RD, ActiveCampaign, Zapier…).", icon: "workflow", provider: null, integration_key: null, methods: ["oauth", "user_invite", "revocable_token", "manual_instruction"], permissions: P_BASIC, auto: false, instructions: NO_PASSWORD },
  { key: "social_network", name: "Rede social", description: "Outras redes sociais (LinkedIn, TikTok, YouTube…).", icon: "share-2", provider: null, integration_key: null, methods: ["oauth", "partner_business", "user_invite", "manual_instruction"], permissions: P_BASIC, auto: false, instructions: NO_PASSWORD },
  { key: "email_account", name: "Conta de e-mail", description: "Conta de e-mail corporativa (preferir delegação).", icon: "mail", provider: null, integration_key: null, methods: ["user_invite", "app_password", "manual_instruction"], permissions: [{ key: "delegate", label: "Delegação" }, { key: "send_as", label: "Enviar como" }, { key: "full", label: "Acesso total" }], auto: false, instructions: NO_PASSWORD },
  { key: "file_storage", name: "Armazenamento de arquivos", description: "Pasta compartilhada (Drive, Dropbox…).", icon: "folder", provider: null, integration_key: null, methods: ["oauth", "user_invite", "manual_instruction"], permissions: [{ key: "view", label: "Visualizar" }, { key: "edit", label: "Editar" }], auto: false, instructions: NO_PASSWORD },
  { key: "other", name: "Outro", description: "Outro tipo de conexão ou acesso.", icon: "plug", provider: null, integration_key: null, methods: ["oauth", "user_invite", "temporary_user", "revocable_token", "app_password", "protected_file", "manual_instruction", "other"], permissions: P_BASIC, auto: false, instructions: NO_PASSWORD },
];

/** Garante o catálogo global (idempotente; nunca altera tipo já existente — preserva IDs e edições). */
export async function ensureConnectionTypes(db: Db) {
  let created = 0;
  const gone = new Set((await db.connectionTypeTombstone.findMany({ select: { key: true } })).map((x) => x.key));
  for (const [i, t] of CONNECTION_TYPE_SEED.entries()) {
    if (gone.has(t.key)) continue; // excluído pelo Admin Master: não recria
    const found = await db.connectionType.findUnique({ where: { key: t.key }, select: { id: true } });
    if (found) continue;
    await db.connectionType.create({
      data: {
        key: t.key, name: t.name, description: t.description, icon: t.icon, provider: t.provider, integration_key: t.integration_key,
        allowed_methods_json: JSON.stringify(t.methods), permission_levels_json: JSON.stringify(t.permissions),
        supports_auto_validation: t.auto, default_instructions: t.instructions, is_active: true, sort_order: i + 1,
      },
    });
    created++;
  }
  return created;
}

export function parseJsonArray<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function serializeConnectionType(t: Prisma.ConnectionTypeGetPayload<object>) {
  return {
    id: t.id, key: t.key, name: t.name, description: t.description, icon: t.icon, provider: t.provider, integration_key: t.integration_key,
    allowed_methods: parseJsonArray<string>(t.allowed_methods_json), permission_levels: parseJsonArray<{ key: string; label: string }>(t.permission_levels_json),
    supports_auto_validation: t.supports_auto_validation, default_instructions: t.default_instructions, is_active: t.is_active, sort_order: t.sort_order,
    fields: parseFieldDefs(t.fields_json),
  };
}

// ── Regras puras ────────────────────────────────────────────────────────────

/** Pelo tipo da dependência, qual é o comportamento de bloqueio na regra materializada. */
export function behaviorForKind(kind: DependencyKind): "block_start" | "block_final" | "alert_only" {
  if (kind === "start" || kind === "continue") return "block_start";
  if (kind === "conclude") return "block_final";
  return "alert_only";
}

type ConnLike = { status: string; last_validated_at: Date | null; expires_at: Date | null; next_revalidation_at?: Date | null; revoked_at?: Date | null };

/**
 * A conexão atende à dependência AGORA? Só `valid` (ou dispensada) conta; expirada/revogada nunca;
 * `every_x_days`/`always` respeitam a regra de revalidação da exigência.
 */
export function connectionSatisfies(conn: ConnLike, rule: { asset_rule?: string | null; revalidate_days?: number | null } = {}, now = new Date()): boolean {
  if (conn.status === "dispensed") return true;
  if (conn.status !== "valid" || conn.revoked_at) return false;
  if (conn.expires_at && conn.expires_at <= now) return false;
  if (conn.next_revalidation_at && conn.next_revalidation_at <= now) return false;
  if (rule.asset_rule === "every_x_days" && conn.last_validated_at) {
    const days = Math.max(1, rule.revalidate_days ?? 30);
    if (now.getTime() - conn.last_validated_at.getTime() > days * 86_400_000) return false;
  }
  return true;
}

export const dependencyKey = (taskKey: string, stepKey?: string | null) => `${taskKey}::${stepKey ?? ""}`;

export function slugKey(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "conexao";
}
