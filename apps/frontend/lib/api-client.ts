// ─── Allka API Client ─────────────────────────────────────────────────────────
// Authenticated HTTP client for the Allka platform backend.
// Token is stored in localStorage under "allka_token".

import { mockApiClient } from "../dev-mocks/mock-api-client";

const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_URL) ||
  "/api";

const TOKEN_KEY = "allka_token";

// Erro estruturado — extends Error de propósito, então `catch (err) { err.message }`
// (o padrão usado em toda a base hoje) continua funcionando sem mudança
// nenhuma. Quem precisar dos campos extras (code/client/supportRequestAvailable
// etc., vindos do corpo da resposta) usa `err instanceof ApiError` e lê
// `err.code` / `err.data`.
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  /** Corpo completo (já parseado) da resposta de erro, quando veio JSON válido. */
  data?: Record<string, any>;

  constructor(message: string, status: number, data?: Record<string, any>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = data?.code;
    this.details = data?.details;
    this.data = data;
  }
}

// Ver serializeShareLink em routes/dashboard-shares.ts — status é sempre
// calculado no backend (nunca recomputado aqui) a partir de
// revoked_at/expires_at/deleted_at.
export type DashboardShareLink = {
  id: string;
  token: string;
  slug: string | null;
  targetId: string;
  targetType: "widget" | "dashboard";
  targetTitle: string;
  permission: "view" | "comment";
  hasPin: boolean;
  status: "active" | "expired" | "revoked" | "archived";
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** Só vem preenchido em GET /dashboard-shares?scope=all (Central Geral, admin). */
  creatorName?: string | null;
  creatorEmail?: string | null;
};

// profile: admin | agency | company | nomad | partner | leader (minúsculo,
// mesmo vocabulário de ShareLink.profile — ver DashboardRole no frontend
// pra a versão maiúscula usada nos 6 dashboards).
export type DashboardTemplate = {
  id: string;
  name: string;
  profile: string;
  is_default: boolean;
  is_active: boolean;
  widgets: any[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contents?: DashboardTemplateContent[];
  creator?: { id: string; name: string; email: string } | null;
  _count?: { contents: number };
};

export type DashboardTemplateContent = {
  id: string;
  template_id: string;
  type: "banner" | "notice";
  title: string;
  body: string | null;
  image_storage_key: string | null;
  image_mime_type: string | null;
  link_url: string | null;
  link_label: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  locked: boolean;
  created_at: string;
  updated_at: string;
};

export type ShareLinkActivityEntry = {
  id: string;
  action: string;
  label: string;
  actorName: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type PlannerColumn = {
  id: string;
  label: string;
  color: string;
  position: number;
  /** Coluna principal (Backlog) — não pode ser excluída. Nunca aceito de
   * volta num payload de criação/edição, só lido do backend. */
  isDefault: boolean;
  updatedAt: string;
};

export type PlannerCard = {
  id: string;
  columnId: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  projectId: string | null;
  position: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Card arquivado, com o rótulo da coluna anterior (`null` se a coluna já
 * foi excluída — o card sobrevive, só perde a referência). */
export type PlannerArchivedCard = PlannerCard & { columnLabel: string | null };

class ApiClient {
  // ─── Token Management ─────────────────────────────────────────────────────
  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  }

  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  }

  private getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  // ─── Core Request ──────────────────────────────────────────────────────────
  private async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<T> {
    let url = `${API_BASE_URL}${path}`;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
        )
        .join("&");
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!res.ok) {
      // Auto-logout on 401: clear token and emit event for App.tsx to handle navigation
      if (res.status === 401) {
        this.clearToken();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("allka:unauthorized"));
        }
      }
      let msg = `HTTP ${res.status}`;
      let body: Record<string, any> | undefined;
      try {
        body = await res.json();
        msg = body?.error || body?.message || msg;
        // Append field-specific validation details when present
        if (body?.details && typeof body.details === "object") {
          const fieldErrors = Object.entries(
            body.details as Record<string, string[]>,
          )
            .filter(([, v]) => Array.isArray(v) && v.length > 0)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("; ");
          if (fieldErrors) msg += ` — ${fieldErrors}`;
        }
      } catch {}
      throw new ApiError(msg, res.status, body);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  private get<T = any>(path: string, params?: Record<string, any>, signal?: AbortSignal) {
    return this.request<T>("GET", path, undefined, params, signal);
  }
  private post<T = any>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }
  private put<T = any>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }
  private patch<T = any>(path: string, body?: unknown, params?: Record<string, any>) {
    return this.request<T>("PATCH", path, body, params);
  }
  private del<T = any>(path: string, body?: unknown) {
    return this.request<T>("DELETE", path, body);
  }

  // Upload multipart (não passa por request(): não pode forçar
  // Content-Type: application/json, o fetch precisa gerar o boundary sozinho).
  private async uploadFile<T = any>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append("file", file);
    const token = this.getToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("allka:unauthorized"));
        }
      }
      let msg = `HTTP ${res.status}`;
      let body: Record<string, any> | undefined;
      try {
        body = await res.json();
        msg = body?.error || body?.message || msg;
      } catch {}
      throw new ApiError(msg, res.status, body);
    }
    return res.json();
  }

  // Download autenticado (link direto não funciona: a rota exige Bearer
  // token no header, que um <a href> não envia) — o chamador transforma o
  // Blob num link temporário (URL.createObjectURL) pra disparar o download.
  private async downloadBlob(path: string): Promise<Blob> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status);
    return res.blob();
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string, accessType?: string) {
    const body: Record<string, string> = { email, password };
    if (accessType) body.accessType = accessType;
    const res = await this.post("/auth/login", body);
    if (res?.token) this.setToken(res.token);
    return res;
  }

  async logout() {
    const res = await this.post("/auth/logout");
    this.clearToken();
    return res;
  }

  /**
   * Identifica o tipo de conta (ADMIN/NOMAD/AGENCY/COMPANY/LEADER) a partir
   * do e-mail, sem autenticar — usado pela tela única de login pra trocar de
   * identidade visual automaticamente. Retorna `accessType: null` quando o
   * e-mail não é reconhecido; nunca lança para esse caso (tela não deve
   * quebrar), só em falha de rede/servidor.
   */
  // ─── Dashboard shares ───────────────────────────────────────────────────────

  // Autenticado de propósito: o escopo (qual empresa/agência/nômade os dados
  // pertencem) é sempre resolvido pelo backend a partir de quem está logado,
  // nunca aceito do frontend — ver routes/dashboard-shares.ts.
  async createDashboardShare(payload: {
    targetId: string;
    targetType: "widget" | "dashboard";
    targetTitle: string;
    permission: "view" | "comment";
    pin?: string;
    expiresAt?: string;
    /** URL amigável opcional — omitir = link só por token, como sempre foi. */
    slug?: string;
    profile: string;
    periodType?: string;
    periodFrom?: string;
    periodTo?: string;
    periodLabel?: string;
    allowFilterChanges?: boolean;
  }): Promise<{ token: string; link: DashboardShareLink }> {
    return this.post("/dashboard-shares", payload);
  }

  /** `targetId` filtra pro dashboard/widget atual — ver ShareLinksPanel. */
  async listDashboardShares(targetId?: string): Promise<{ links: DashboardShareLink[] }> {
    const qs = targetId ? `?targetId=${encodeURIComponent(targetId)}` : "";
    return this.get(`/dashboard-shares${qs}`);
  }

  /**
   * Central Geral de Links — `scope: "all"` só tem efeito se o usuário for
   * Admin (o backend confirma de novo, nunca confia nisto vindo do
   * cliente); pra qualquer outro perfil o backend ignora e devolve só os
   * próprios links mesmo assim.
   */
  async listAllDashboardShares(filters?: {
    scope?: "all";
    status?: "active" | "expired" | "revoked";
    permission?: "view" | "comment";
    creatorEmail?: string;
    q?: string;
  }): Promise<{ links: DashboardShareLink[] }> {
    const qs = new URLSearchParams();
    if (filters?.scope) qs.set("scope", filters.scope);
    if (filters?.status) qs.set("status", filters.status);
    if (filters?.permission) qs.set("permission", filters.permission);
    if (filters?.creatorEmail) qs.set("creatorEmail", filters.creatorEmail);
    if (filters?.q) qs.set("q", filters.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.get(`/dashboard-shares${suffix}`);
  }

  /**
   * Só UX (debounce no campo de URL personalizada) — nunca a fonte de
   * verdade. Create/patch sempre revalidam contra a constraint única do
   * banco, então uma corrida entre este check e o submit não reserva nada.
   * `excludeId` evita que o dono do próprio link veja o slug atual dele
   * como "indisponível" ao reabrir a edição.
   */
  async checkDashboardShareSlug(
    slug: string,
    excludeId?: string,
  ): Promise<{ available: boolean; normalized: string; reason?: "invalid" | "taken"; message?: string }> {
    const qs = new URLSearchParams({ slug });
    if (excludeId) qs.set("excludeId", excludeId);
    return this.get(`/dashboard-shares/check-slug?${qs.toString()}`);
  }

  /** Troca a URL personalizada. O slug anterior fica livre (sem alias/redirect). `slug: null` remove. */
  async updateDashboardShareSlug(id: string, slug: string | null): Promise<{ link: DashboardShareLink }> {
    return this.patch(`/dashboard-shares/${id}`, { slug });
  }

  /** Revoga (bloqueia acesso, preserva o registro) — ver routes/dashboard-shares.ts. */
  async revokeDashboardShare(id: string): Promise<{ ok: true; link: DashboardShareLink }> {
    return this.del(`/dashboard-shares/${id}`);
  }

  /** Desfaz a revogação — seguro pela arquitetura (revoked_at é só um timestamp nullable). */
  async reactivateDashboardShare(id: string): Promise<{ link: DashboardShareLink }> {
    return this.post(`/dashboard-shares/${id}/reactivate`);
  }

  /** Altera/remove a validade. `expiresAt: null` = sem expiração. */
  async updateDashboardShareExpiry(
    id: string,
    expiresAt: string | null,
  ): Promise<{ link: DashboardShareLink }> {
    return this.patch(`/dashboard-shares/${id}`, { expiresAt });
  }

  /** Soft-delete — some da lista, mas preserva histórico no banco. */
  async archiveDashboardShare(id: string): Promise<{ ok: true; link: DashboardShareLink }> {
    return this.post(`/dashboard-shares/${id}/archive`);
  }

  /**
   * Edição unificada do link — usada pelo painel "Editar" (URL, Permissão,
   * PIN e Expiração juntos, um único PATCH). Só envie os campos que o
   * usuário de fato mudou; campos omitidos ficam intocados no backend.
   * `pin: "1234"` define/troca (nunca reaproveita o hash antigo);
   * `pin: null` remove a proteção.
   */
  async updateDashboardShare(
    id: string,
    patch: {
      slug?: string | null;
      expiresAt?: string | null;
      permission?: "view" | "comment";
      pin?: string | null;
    },
  ): Promise<{ link: DashboardShareLink }> {
    return this.patch(`/dashboard-shares/${id}`, patch);
  }

  /** Histórico de auditoria do link (item 8) — sobrevive a revogação/arquivamento. */
  async getShareLinkActivity(id: string): Promise<{ activities: ShareLinkActivityEntry[] }> {
    return this.get(`/dashboard-shares/${id}/activity`);
  }

  // ── Dashboard Templates (item 9/10) ─────────────────────────────────────
  async listDashboardTemplates(profile?: string): Promise<{ templates: DashboardTemplate[] }> {
    return this.get("/dashboard-templates", profile ? { profile } : undefined);
  }
  async getDashboardTemplate(id: string): Promise<{ template: DashboardTemplate }> {
    return this.get(`/dashboard-templates/${id}`);
  }
  /** Template default ativo do próprio perfil do usuário — usado pelos 6 dashboards. */
  async resolveDashboardTemplate(profile: string): Promise<{ template: DashboardTemplate | null }> {
    return this.get("/dashboard-templates/resolve", { profile });
  }
  async createDashboardTemplate(data: { name: string; profile: string; widgets: any[] }): Promise<{ template: DashboardTemplate }> {
    return this.post("/dashboard-templates", data);
  }
  async updateDashboardTemplate(id: string, data: { name?: string; widgets?: any[]; is_active?: boolean }): Promise<{ template: DashboardTemplate }> {
    return this.patch(`/dashboard-templates/${id}`, data);
  }
  async duplicateDashboardTemplate(id: string): Promise<{ template: DashboardTemplate }> {
    return this.post(`/dashboard-templates/${id}/duplicate`);
  }
  async setDefaultDashboardTemplate(id: string): Promise<{ template: DashboardTemplate }> {
    return this.post(`/dashboard-templates/${id}/set-default`);
  }
  async deleteDashboardTemplate(id: string): Promise<void> {
    return this.del(`/dashboard-templates/${id}`);
  }
  async createDashboardTemplateContent(
    templateId: string,
    data: Partial<DashboardTemplateContent> & { type: "banner" | "notice"; title: string },
  ): Promise<{ content: DashboardTemplateContent }> {
    return this.post(`/dashboard-templates/${templateId}/contents`, data);
  }
  async updateDashboardTemplateContent(
    contentId: string,
    data: Partial<DashboardTemplateContent>,
  ): Promise<{ content: DashboardTemplateContent }> {
    return this.patch(`/dashboard-templates/contents/${contentId}`, data);
  }
  async deleteDashboardTemplateContent(contentId: string): Promise<void> {
    return this.del(`/dashboard-templates/contents/${contentId}`);
  }
  async uploadDashboardTemplateContentImage(contentId: string, file: File): Promise<{ content: DashboardTemplateContent }> {
    return this.uploadFile(`/dashboard-templates/contents/${contentId}/image`, file);
  }
  /** URL pública (sem auth) da imagem do banner — pronta pra usar em <img src>. */
  dashboardTemplateContentImageUrl(contentId: string): string {
    return `${API_BASE_URL}/dashboard-templates/contents/${contentId}/image`;
  }

  async identifyAccount(
    email: string,
  ): Promise<{ accessType: string | null; isPartner?: boolean }> {
    return this.post("/auth/identify-account", { email });
  }

  // ── Planejador (Admin → Projetos → Planejador) ──────────────────────────
  // Quadro pessoal — escopo (owner) é sempre resolvido pelo backend a
  // partir de quem está autenticado, nunca aceito do frontend.
  async getPlannerBoard(): Promise<{ columns: PlannerColumn[]; cards: PlannerCard[] }> {
    return this.get("/planner/board");
  }
  async createPlannerColumn(data: { label: string; color?: string }): Promise<{ column: PlannerColumn }> {
    return this.post("/planner/columns", data);
  }
  async updatePlannerColumn(id: string, data: { label?: string; color?: string }): Promise<{ column: PlannerColumn }> {
    return this.put(`/planner/columns/${id}`, data);
  }
  async reorderPlannerColumns(orderedIds: string[]): Promise<{ columns: PlannerColumn[] }> {
    return this.put("/planner/columns/reorder", { orderedIds });
  }
  /** Exclusão FÍSICA e irreversível da coluna. Bloqueada pelo backend com
   * 409 se for a coluna principal (`isDefault`) ou se tiver cards ativos —
   * cards arquivados não bloqueiam, sobrevivem com `columnId: null`. */
  async deletePlannerColumn(id: string): Promise<void> {
    return this.del(`/planner/columns/${id}`);
  }
  /** Contagem de cards ativos/arquivados vinculados à coluna — usado na 1ª
   * etapa da confirmação dupla de exclusão, pra mostrar números reais
   * antes do usuário decidir. */
  async getPlannerColumnCounts(id: string): Promise<{ activeCount: number; archivedCount: number }> {
    return this.get(`/planner/columns/${id}/counts`);
  }
  async createPlannerCard(data: {
    columnId: string;
    title: string;
    description?: string;
    priority?: PlannerCard["priority"];
    dueDate?: string | null;
    projectId?: string | null;
  }): Promise<{ card: PlannerCard }> {
    return this.post("/planner/cards", data);
  }
  async updatePlannerCard(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      priority?: PlannerCard["priority"];
      dueDate?: string | null;
      projectId?: string | null;
      /** Última `updatedAt` conhecida pelo cliente — habilita a checagem de conflito (409) no backend. */
      updatedAt?: string;
    },
  ): Promise<{ card: PlannerCard }> {
    return this.put(`/planner/cards/${id}`, data);
  }
  async movePlannerCard(
    id: string,
    data: { columnId: string; position: number; updatedAt?: string },
  ): Promise<{ card: PlannerCard }> {
    return this.put(`/planner/cards/${id}/position`, data);
  }
  /** Arquivamento lógico (reversível) — preenche `archived_at`, nunca
   * apaga a linha. Card continua existindo, some do quadro ativo e
   * aparece em "Cards arquivados"; ver `restorePlannerCard`. */
  async archivePlannerCard(id: string): Promise<{ ok: boolean; card: PlannerCard }> {
    return this.patch(`/planner/cards/${id}/archive`);
  }
  /** Exclusão FÍSICA e irreversível — apaga a linha de `planner_cards` de
   * vez (nunca mais aparece em nenhuma listagem, nunca mais pode ser
   * restaurado). Diferente de `archivePlannerCard`: exige a permissão
   * `projetos:delete`, não `projetos:edit`. Funciona tanto num card ativo
   * quanto num já arquivado. */
  async deletePlannerCard(id: string): Promise<{ ok: boolean }> {
    return this.del(`/planner/cards/${id}`);
  }
  /** `usedFallbackColumn: true` quando a coluna original do card não
   * existia mais e a restauração caiu pro Backlog/coluna padrão. */
  async restorePlannerCard(id: string): Promise<{ ok: boolean; card: PlannerCard; usedFallbackColumn: boolean }> {
    return this.post(`/planner/cards/${id}/restore`);
  }
  async getPlannerArchivedCards(
    page = 1,
    limit = 20,
  ): Promise<{ data: PlannerArchivedCard[]; total: number; page: number; limit: number }> {
    return this.get("/planner/cards/archived", { page, limit });
  }

  // ─── Nômade: o próprio trabalho ───────────────────────────────────────────
  // O nômade não tem acesso a /project-tasks (escopo nega "nomades"); o
  // trabalho dele vem por estas rotas, já recortado por etapa.

  async getMinhasTarefasNomade(escopo: "abertas" | "concluidas" = "abertas") {
    return this.get("/nomades/me/tarefas", { escopo });
  }

  /** Entrega a etapa; o motor abre a seguinte e devolve o que aconteceu. */
  async concluirMinhaEtapa(stageId: string) {
    return this.patch(`/nomades/me/etapas/${stageId}/concluir`, {});
  }

  // Entregas da etapa. O sistema não guarda binário — anexo é sempre uma URL
  // (Drive, Figma, etc.), mesmo padrão do resto da plataforma.
  async getEntregasDaEtapa(stageId: string) {
    return this.get(`/nomades/me/etapas/${stageId}/entregas`);
  }

  async anexarEntregaNaEtapa(
    stageId: string,
    dados: { name: string; url: string; observations?: string },
  ) {
    return this.post(`/nomades/me/etapas/${stageId}/entregas`, dados);
  }

  async removerEntregaDaEtapa(stageId: string, anexoId: string) {
    return this.del(`/nomades/me/etapas/${stageId}/entregas/${anexoId}`);
  }

  /** Números do nômade: alimenta dashboard, ganhos e histórico. */
  async getResumoNomade() {
    return this.get("/nomades/me/resumo");
  }

  /** Etapas abertas que ele pode assumir, filtradas por afinidade. */
  async getTarefasDisponiveisNomade() {
    return this.get("/nomades/me/disponiveis");
  }

  async aceitarEtapa(stageId: string) {
    return this.patch(`/nomades/me/etapas/${stageId}/aceitar`, {});
  }

  /**
   * Habilitações do nômade, já cruzadas com as áreas que existem na
   * plataforma — "não habilitado" é ausência de registro, então quem faz o
   * cruzamento é o backend.
   */
  async getMinhasHabilidades() {
    return this.get("/nomades/me/habilidades");
  }

  /** Cadastro do próprio nômade. */
  async getMeuPerfilNomade() {
    return this.get("/nomades/me");
  }

  /**
   * Edita o próprio cadastro. Só contato, endereço, PIX e preferências — o
   * backend recusa nível/pontuação/status, que não são campo de formulário.
   */
  async atualizarMeuPerfilNomade(dados: Record<string, any>) {
    return this.patch("/nomades/me", dados);
  }

  /** Escada de níveis e a posição do nômade nela. */
  async getMeuPrograma() {
    return this.get("/nomades/me/programa");
  }

  // ─── Habilitações (admin) ──────────────────────────────────────────────────
  // NomadeHabilidade — o que a seleção automática lê para decidir quem recebe
  // cada tarefa (ver backend src/lib/selecionar-nomade.ts). Escrita é restrita
  // a admin no backend.

  /** Áreas canônicas da plataforma, com as categorias de cada uma. */
  async getAreasHabilidade() {
    return this.get("/habilidades/areas");
  }

  async getHabilidadesDoNomade(nomadeId: string) {
    return this.get(`/habilidades/nomade/${nomadeId}`);
  }

  async criarHabilidadeDoNomade(nomadeId: string, dados: Record<string, any>) {
    return this.post(`/habilidades/nomade/${nomadeId}`, dados);
  }

  async atualizarHabilidadeDoNomade(
    nomadeId: string,
    id: string,
    dados: Record<string, any>,
  ) {
    return this.patch(`/habilidades/nomade/${nomadeId}/${id}`, dados);
  }

  async removerHabilidadeDoNomade(nomadeId: string, id: string) {
    return this.del(`/habilidades/nomade/${nomadeId}/${id}`);
  }

  // ─── Aprovação da entrega (dois níveis) ───────────────────────────────────
  // Agência confere primeiro; o cliente depois, quando o produto exige. A
  // tarefa só encerra no último aceite — ver src/lib/stage-engine.ts.

  async aprovarTarefa(taskId: string, nivel?: "agencia" | "cliente") {
    return this.patch(`/project-tasks/${taskId}/aprovar`, nivel ? { nivel } : {});
  }

  /** Devolve para execução com o motivo e reabre a última etapa concluída. */
  async reprovarTarefa(taskId: string, motivo: string, nivel?: "agencia" | "cliente") {
    return this.patch(`/project-tasks/${taskId}/reprovar`, { motivo, ...(nivel ? { nivel } : {}) });
  }

  /** Comprime o prazo e cobra +50% do valor do produto — imediato, não bloqueia. */
  async solicitarEntregaEmergencial(taskId: string) {
    return this.post(`/project-tasks/${taskId}/solicitar-emergencial`, {});
  }

  // ─── Primeiro acesso ──────────────────────────────────────────────────────
  // Usuário sem senha definida (importado da plataforma antiga ou nômade que
  // nunca teve login) chega por link com token e define a própria senha.

  /** Valida o link antes de mostrar o formulário; devolve nome e e-mail. */
  async validarPrimeiroAcesso(token: string) {
    return this.get(`/auth/primeiro-acesso/${encodeURIComponent(token)}`);
  }

  /** Define a senha e já devolve sessão iniciada. */
  async definirSenhaPrimeiroAcesso(token: string, password: string) {
    const res = await this.post("/auth/primeiro-acesso", { token, password });
    if (res?.token) this.setToken(res.token);
    return res;
  }

  async getCurrentUser() {
    return this.get("/auth/me");
  }

  // ─── Users ────────────────────────────────────────────────────────────────
  async getUsers(filters?: Record<string, any>) {
    return this.get("/users", filters);
  }

  // Admin-only — lista todos os usuários de acesso/login da plataforma, já
  // enriquecidos com agency_name/company_name/partner_name/nomad_name/
  // leader_areas. Separado de getUsers() (usado por outros fluxos não-admin,
  // ex.: picker de consultor em criar-projeto).
  async getAdminUsers(filters?: Record<string, any>) {
    return this.get("/admin/users", filters);
  }

  // Admin-only — vincula/desvincula/troca a empresa de um usuário
  // (payload: { link_type: "company" | null, company_id: string | null }).
  async updateAdminUserCompanyLink(id: string | number, data: Record<string, any>) {
    return this.put(`/admin/users/${id}/link`, data);
  }

  // Self-service Company — colaboradores da própria empresa do usuário
  // logado. Nunca aceita company_id (o backend resolve pelo token).
  async getCompanyUsers(filters?: Record<string, any>) {
    return this.get("/company/users", filters);
  }

  async createCompanyUser(data: Record<string, any>) {
    return this.post("/company/users", data);
  }

  async updateCompanyUser(id: string | number, data: Record<string, any>) {
    return this.put(`/company/users/${id}`, data);
  }

  // Self-service Agency — colaboradores da própria agência do usuário
  // logado. Nunca aceita agency_id (o backend resolve pelo token).
  async getAgencyUsers(filters?: Record<string, any>) {
    return this.get("/agency/users", filters);
  }

  async createAgencyUser(data: Record<string, any>) {
    return this.post("/agency/users", data);
  }

  async updateAgencyUser(id: string | number, data: Record<string, any>) {
    return this.put(`/agency/users/${id}`, data);
  }

  async getUser(id: string | number) {
    return this.get(`/users/${id}`);
  }

  async createUser(data: Record<string, any>) {
    return this.post("/users", data);
  }

  async updateUser(id: string | number, data: Record<string, any>) {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id: string | number, reason?: string) {
    return this.del(`/users/${id}`, reason ? { reason } : undefined);
  }

  // ─── Companies ────────────────────────────────────────────────────────────
  async getCompanies(filters?: Record<string, any>) {
    return this.get("/clients", filters);
  }

  async getCompany(id: string | number) {
    return this.get(`/clients/${id}`);
  }

  async getCompanySummary(id: string | number) {
    return this.get(`/clients/${id}/summary`);
  }

  async createCompany(data: Record<string, any>) {
    return this.post("/clients", data);
  }

  async updateCompany(id: string | number, data: Record<string, any>) {
    return this.put(`/clients/${id}`, data);
  }

  async deleteCompany(
    id: string | number,
    userActions?: { userId: string; action: "delete" | "unlink" | "suspend" }[],
  ) {
    return this.del(`/clients/${id}`, { userActions: userActions ?? [] });
  }

  async getCompanyArchives(sequenceNumber: number | string) {
    return this.get(`/clients/archives/${sequenceNumber}`);
  }

  // ─── Company Payment Methods ───────────────────────────────────────────────
  async getPaymentMethods(companyId: string | number) {
    return this.get(`/clients/${companyId}/payment-methods`);
  }

  async addPaymentMethod(
    companyId: string | number,
    data: Record<string, any>,
  ) {
    return this.post(`/clients/${companyId}/payment-methods`, data);
  }

  async setDefaultPaymentMethod(companyId: string | number, pmId: string) {
    return this.patch(
      `/clients/${companyId}/payment-methods/${pmId}/default`,
      {},
    );
  }

  async deletePaymentMethod(companyId: string | number, pmId: string) {
    return this.del(`/clients/${companyId}/payment-methods/${pmId}`);
  }

  // Alias — some components use "client" terminology
  async getClients(filters?: Record<string, any>) {
    return this.getCompanies(filters);
  }
  async getClient(id: string | number) {
    return this.getCompany(id);
  }
  async createClient(data: Record<string, any>) {
    return this.createCompany(data);
  }
  async updateClient(id: string | number, data: Record<string, any>) {
    return this.updateCompany(id, data);
  }
  async deleteClient(id: string | number) {
    return this.deleteCompany(id);
  }

  // ─── Project Clients ──────────────────────────────────────────────────────
  async getProjectClients(filters?: Record<string, any>) {
    return this.get("/clients", filters);
  }

  async getProjectClient(id: string | number) {
    return this.get(`/clients/${id}`);
  }

  async createProjectClient(data: Record<string, any>) {
    return this.post("/clients", data);
  }

  async updateProjectClient(id: string | number, data: Record<string, any>) {
    return this.put(`/clients/${id}`, data);
  }

  async deleteProjectClient(id: string | number) {
    return this.del(`/clients/${id}`);
  }

  // ─── Client Records (entidade real Client, separada de Company) ───────────
  // NÃO confundir com getClients/createClient/getProjectClients/
  // createProjectClient acima — esses são aliases do legado que operam sobre
  // Company via /clients. Client é uma entidade própria (tabela `clients`,
  // vinculada a Agency/Company/Partner via ClientLink), servida por
  // /api/client-records.
  async getClientRecords(filters?: Record<string, any>) {
    return this.get("/client-records", filters);
  }

  async getClientRecord(id: string) {
    return this.get(`/client-records/${id}`);
  }

  async createClientRecord(data: Record<string, any>) {
    return this.post("/client-records", data);
  }

  // Admin-only — edita campos principais do Client (não mexe em vínculo).
  async updateClientRecord(id: string, data: Record<string, any>) {
    return this.put(`/client-records/${id}`, data);
  }

  // Admin-only — define/troca/remove o vínculo do Client com Agency/Company/
  // Partner. Envie { agency_id } ou { company_id } ou { partner_id }, ou
  // {} / campos null pra desvincular.
  async updateClientRecordLink(id: string, data: Record<string, any>) {
    return this.put(`/client-records/${id}/link`, data);
  }

  // ─── Projects ─────────────────────────────────────────────────────────────
  async getProjects(filters?: Record<string, any>) {
    return this.get("/projects", filters);
  }

  async getProject(id: string | number) {
    return this.get(`/projects/${id}`);
  }

  async getProjectLog(id: string | number) {
    return this.get(`/projects/${id}/log`);
  }

  async createProject(data: Record<string, any>) {
    return this.post("/projects", data);
  }

  async checkProjectName(params: {
    title: string;
    client_id?: string;
    agency?: string;
    exclude_id?: string;
  }): Promise<{ duplicate: boolean; conflictId?: string }> {
    const q = new URLSearchParams({ title: params.title });
    if (params.client_id) q.set("client_id", params.client_id);
    if (params.agency) q.set("agency", params.agency);
    if (params.exclude_id) q.set("exclude_id", params.exclude_id);
    return this.get(`/projects/check-name?${q.toString()}`);
  }

  async updateProject(id: string | number, data: Record<string, any>) {
    return this.put(`/projects/${id}`, data);
  }

  // Admin-only — Admins internos ativos elegíveis pra "Admin responsável"
  // do projeto (ata 2026-08).
  async getAdminResponsibleOptions() {
    return this.get("/projects/admin-responsible-options");
  }

  // Admin-only — define/troca/remove o vínculo NOVO do Project com
  // Agency/Company/Partner (agency_id/company_id/partner_id). Não mexe no
  // vínculo legado (agency/client_id). Envie { agency_id } ou { company_id }
  // ou { partner_id }, ou {} / campos null pra desvincular do escopo novo.
  async updateProjectLink(id: string | number, data: Record<string, any>) {
    return this.put(`/projects/${id}/link`, data);
  }

  async deleteProject(id: string | number) {
    return this.del(`/projects/${id}`);
  }

  // Arquivamento (soft state, nunca exclusão física) — motivo obrigatório.
  async archiveProject(id: string | number, reason: string) {
    return this.patch(`/projects/${id}/archive`, { reason });
  }

  // ─── Conexões do projeto (Meta Ads e, no futuro, Google/TikTok) ────────────
  async getProjectConnections(projectId: string | number) {
    return this.get<{
      data: Array<{
        id: string;
        project_id: string;
        provider: string;
        status: "connected" | "expired" | "disconnected" | "error";
        external_account_id: string;
        external_account_name: string | null;
        token_expires_at: string | null;
        last_synced_at: string | null;
        last_error: string | null;
        created_at: string;
      }>;
    }>("/project-connections", { project_id: projectId });
  }
  async getProjectConnectionMetrics(connectionId: string, days = 30) {
    return this.get<{
      data: Array<{
        date: string;
        impressions: number | null;
        clicks: number | null;
        spend: number | null;
        reach: number | null;
        ctr: number | null;
        cpc: number | null;
      }>;
    }>(`/project-connections/${connectionId}/metrics`, { days });
  }
  async disconnectProjectConnection(connectionId: string) {
    return this.del(`/project-connections/${connectionId}`);
  }
  async syncProjectConnectionNow(connectionId: string) {
    return this.post<{ synced: number }>(`/project-connections/${connectionId}/sync`);
  }
  async getMetaAuthorizeUrl(projectId: string | number) {
    return this.get<{ url: string }>("/integrations/meta/authorize-url", { project_id: projectId });
  }

  /** @deprecated Use getProjectTasks(filters) via /project-products/tasks instead */
  async getLegacyProjectTasks(projectId: string | number) {
    return this.get(`/projects/${projectId}/tasks`);
  }

  // ─── Tasks ────────────────────────────────────────────────────────────────
  async getTasks(filters?: Record<string, any>) {
    return this.get("/tasks", filters);
  }

  async getTask(id: string | number) {
    return this.get(`/tasks/${id}`);
  }

  async createTask(data: Record<string, any>) {
    return this.post("/tasks", data);
  }

  async updateTask(id: string | number, data: Record<string, any>) {
    return this.put(`/tasks/${id}`, data);
  }

  async updateTaskStatus(id: string | number, status: string) {
    return this.put(`/tasks/${id}`, { status });
  }

  async deleteTask(id: string | number) {
    return this.del(`/tasks/${id}`);
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  async getDashboardStats() {
    return this.get("/dashboard/stats");
  }

  async getRecentActivities() {
    return this.get("/dashboard/recent-activities");
  }

  async getRevenue(from?: string, to?: string) {
    return this.get("/dashboard/revenue", { from, to });
  }

  async getDashboardWidgets(from: Date, to: Date) {
    return this.post("/dashboard/widgets", { from: from.toISOString(), to: to.toISOString() });
  }

  async getDRE(from?: string, to?: string) {
    return this.get("/dashboard/dre", { from, to });
  }

  async getAdminDashboardWidgets(from: Date, to: Date) {
    return this.get("/dashboard/admin-widgets", {
      from: from.toISOString(),
      to: to.toISOString(),
    });
  }

  async getMyTasks() {
    return this.get("/tasks", { my: "true", limit: "10" });
  }

  // ─── Líder (área-scoped) ──────────────────────────────────────────────────
  async getLiderTaskCounts() {
    return this.get("/lider/tasks/counts");
  }

  async getLiderTasks(filters?: Record<string, any>) {
    return this.get("/lider/tasks", filters);
  }

  async getLiderNomades(filters?: Record<string, any>) {
    return this.get("/lider/nomades", filters);
  }

  // ─── Nomades ──────────────────────────────────────────────────────────────
  async getNomades(filters?: Record<string, any>) {
    return this.get("/nomades", filters);
  }

  async getNomade(id: string | number) {
    return this.get(`/nomades/${id}`);
  }

  async createNomade(data: Record<string, any>) {
    return this.post("/nomades", data);
  }

  async updateNomade(id: string | number, data: Record<string, any>) {
    return this.put(`/nomades/${id}`, data);
  }

  /** Desativar/reativar (reversível) — mantém o perfil (histórico,
   * qualificações, carteira) intacto, só bloqueia/libera o login vinculado. */
  async updateNomadeStatus(id: string | number, status: "ativo" | "inativo", reason?: string) {
    return this.patch(`/nomades/${id}/status`, { status, ...(reason ? { reason } : {}) });
  }

  /** Remove SÓ o perfil profissional — nunca a conta global. Bloqueado
   * (409) quando há histórico real vinculado (carteira, qualificações,
   * saques, tarefas). A conta global vinculada é desativada, nunca apagada. */
  async deleteNomade(id: string | number, reason?: string) {
    return this.del(`/nomades/${id}`, reason ? { reason } : undefined);
  }

  // ─── Nomade Levels ────────────────────────────────────────────────────────
  async getNomadeLevels() {
    return this.get("/nomade-levels");
  }

  async createNomadeLevel(data: Record<string, any>) {
    return this.post("/nomade-levels", data);
  }

  async updateNomadeLevel(id: string | number, data: Record<string, any>) {
    return this.put(`/nomade-levels/${id}`, data);
  }

  async deleteNomadeLevel(id: string | number) {
    return this.del(`/nomade-levels/${id}`);
  }

  // ─── Agencies ─────────────────────────────────────────────────────────────
  /**
   * Emite um link de primeiro acesso para o usuário definir a própria senha.
   * Cada chamada invalida o link anterior — é o comportamento de "reenviar".
   */
  async emitirPrimeiroAcesso(id: string) {
    return this.post(`/users/${id}/primeiro-acesso`, {});
  }

  // ─── Notificações ─────────────────────────────────────────────────────────
  // Só existe um canal de entrega: o aviso dentro da plataforma
  // (system_alerts). Ver o comentário no topo de routes/notifications.ts.
  async getNotificationMessages() {
    return this.get("/notifications/messages");
  }
  async createNotificationMessage(data: Record<string, any>) {
    return this.post("/notifications/messages", data);
  }
  async updateNotificationMessage(id: string, data: Record<string, any>) {
    return this.put(`/notifications/messages/${id}`, data);
  }
  async deleteNotificationMessage(id: string) {
    return this.del(`/notifications/messages/${id}`);
  }
  async sendNotificationMessage(id: string, data: Record<string, any>) {
    return this.post(`/notifications/messages/${id}/send`, data);
  }
  async getNotificationRules() {
    return this.get("/notifications/rules");
  }
  async createNotificationRule(data: Record<string, any>) {
    return this.post("/notifications/rules", data);
  }
  async updateNotificationRule(id: string, data: Record<string, any>) {
    return this.put(`/notifications/rules/${id}`, data);
  }
  async deleteNotificationRule(id: string) {
    return this.del(`/notifications/rules/${id}`);
  }
  async getNotificationHistory(params?: Record<string, any>) {
    return this.get("/notifications/history", params);
  }

  /** Números do programa de parceria (convites, níveis, ganhos). */
  async getPartnerStats() {
    return this.get("/agencies/partner-stats");
  }

  async getAgencies(filters?: Record<string, any>) {
    return this.get("/agencies", filters);
  }

  async getAgency(id: string | number) {
    return this.get(`/agencies/${id}`);
  }

  async createAgency(data: Record<string, any>) {
    return this.post("/agencies", data);
  }

  async updateAgency(id: string, data: Record<string, any>) {
    return this.put(`/agencies/${id}`, data);
  }

  async deleteAgency(id: string) {
    return this.del(`/agencies/${id}`);
  }

  // Convite de Partner — Partner não é mais um cadastro à parte, é um
  // upgrade que uma Agency existente recebe e precisa aceitar/recusar.
  async invitePartner(agencyId: string) {
    return this.post(`/agencies/${agencyId}/partner-invite`, {});
  }

  async acceptPartnerInvite(agencyId: string) {
    return this.post(`/agencies/${agencyId}/partner-invite/accept`, {});
  }

  async declinePartnerInvite(agencyId: string) {
    return this.post(`/agencies/${agencyId}/partner-invite/decline`, {});
  }

  // ─── Partners ─────────────────────────────────────────────────────────────
  async getPartners(filters?: Record<string, any>) {
    return this.get("/partners", filters);
  }

  async getPartnerMe() {
    return this.get("/partners/me");
  }

  async getPartnerCommissions(id: string | number) {
    return this.get(`/partners/${id}/commissions`);
  }

  // Comissões do próprio Partner logado — rota real (/partners/me/commissions).
  // Antes disso o front chamava getPartnerCommissions("me"), que montava
  // "/partners/me/commissions" mas caía silenciosamente em "/:id/commissions"
  // com id="me" (200, lista sempre vazia, nenhum erro).
  async getMyPartnerCommissions() {
    return this.get("/partners/me/commissions");
  }

  async createPartner(data: Record<string, any>) {
    return this.post("/partners", data);
  }

  async updatePartner(id: string | number, data: Record<string, any>) {
    return this.put(`/partners/${id}`, data);
  }

  // Saque do Partner — rota própria (/partners/withdrawals), NÃO
  // /financial/withdrawals (esse é exclusivo do fluxo de Nômade, payload
  // diferente: nomade_id em vez de partner_profile_id).
  async createPartnerWithdrawal(data: Record<string, any>) {
    return this.post("/partners/withdrawals", data);
  }

  async getPartnerWithdrawals() {
    return this.get("/partners/withdrawals");
  }

  // Admin — aprovar/reprovar/pagar saques de Partner. Rota própria
  // (/partners/admin/withdrawals), separada de getWithdrawals/updateWithdrawal
  // (que continuam servindo só o fluxo de Nômade em /financial/withdrawals).
  async getAdminPartnerWithdrawals(filters?: Record<string, any>) {
    return this.get("/partners/admin/withdrawals", filters);
  }

  async updateAdminPartnerWithdrawal(id: string | number, data: Record<string, any>) {
    return this.put(`/partners/admin/withdrawals/${id}`, data);
  }

  // ─── Products ─────────────────────────────────────────────────────────────
  async getProducts(filters?: Record<string, any>) {
    return this.get("/products", filters);
  }

  async getProduct(id: string | number) {
    return this.get(`/products/${id}`);
  }

  async createProduct(data: Record<string, any>) {
    return this.post("/products", data);
  }

  async updateProduct(id: string | number, data: Record<string, any>) {
    return this.put(`/products/${id}`, data);
  }

  async deleteProduct(id: string | number) {
    return this.del(`/products/${id}`);
  }

  async getProductVersions(id: string | number) {
    return this.get(`/products/${id}/versions`);
  }

  async restoreProductVersion(id: string | number, versionId: string) {
    return this.post(`/products/${id}/versions/${versionId}/restore`, {});
  }

  // ─── Product Bundles (combos) ───────────────────────────────────────────────
  async getProductBundles(filters?: Record<string, any>) {
    return this.get("/product-bundles", filters);
  }

  async getProductBundle(id: string) {
    return this.get(`/product-bundles/${id}`);
  }

  async createProductBundle(data: Record<string, any>) {
    return this.post("/product-bundles", data);
  }

  async updateProductBundle(id: string, data: Record<string, any>) {
    return this.put(`/product-bundles/${id}`, data);
  }

  async deleteProductBundle(id: string) {
    return this.del(`/product-bundles/${id}`);
  }

  async contractProductBundle(id: string, data: Record<string, any>) {
    return this.post(`/product-bundles/${id}/contract`, data);
  }

  // ─── IALLKA (assistente IA de montagem de projeto) ─────────────────────────
  async createIallkaSession() {
    return this.post("/iallka/sessions", {});
  }

  async getIallkaSession(id: string) {
    return this.get(`/iallka/sessions/${id}`);
  }

  async sendIallkaMessage(id: string, message: string) {
    return this.post(`/iallka/sessions/${id}/messages`, { message });
  }

  async approveIallkaSession(id: string) {
    return this.post(`/iallka/sessions/${id}/approve`, {});
  }

  // ─── Campaigns ────────────────────────────────────────────────────────────
  async getCampaigns(filters?: Record<string, any>) {
    return this.get("/campaigns", filters);
  }

  async getCampaign(id: string | number) {
    return this.get(`/campaigns/${id}`);
  }

  async createCampaign(data: Record<string, any>) {
    return this.post("/campaigns", data);
  }

  async updateCampaign(id: string | number, data: Record<string, any>) {
    return this.put(`/campaigns/${id}`, data);
  }

  async deleteCampaign(id: string | number) {
    return this.del(`/campaigns/${id}`);
  }

  // ─── Coupons (real entity — apps/backend/src/routes/coupons.ts) ───────────
  async getCoupons(filters?: Record<string, any>) {
    return this.get("/coupons", filters);
  }

  async getCoupon(id: string | number) {
    return this.get(`/coupons/${id}`);
  }

  async createCoupon(data: Record<string, any>) {
    return this.post("/coupons", data);
  }

  async updateCoupon(id: string | number, data: Record<string, any>) {
    return this.put(`/coupons/${id}`, data);
  }

  async deleteCoupon(id: string | number) {
    return this.del(`/coupons/${id}`);
  }

  // ─── Financial / Invoices ─────────────────────────────────────────────────
  async getInvoices(filters?: Record<string, any>) {
    return this.get("/billing/invoices", filters);
  }

  async getInvoice(id: string | number) {
    return this.get(`/billing/invoices/${id}`);
  }

  async createInvoice(data: Record<string, any>) {
    return this.post("/billing/invoices", data);
  }

  async updateInvoice(id: string | number, data: Record<string, any>) {
    return this.put(`/billing/invoices/${id}`, data);
  }

  async deleteInvoice(id: string | number) {
    return this.del(`/billing/invoices/${id}`);
  }

  async getBillingStats(params?: { from?: string; to?: string }) {
    return this.get("/billing/stats", params);
  }

  async getFinancialStats() {
    return this.get("/financial/stats");
  }

  // ─── Withdrawals ──────────────────────────────────────────────────────────
  async getWithdrawals(filters?: Record<string, any>) {
    return this.get("/financial/withdrawals", filters);
  }

  async updateWithdrawal(id: string | number, data: Record<string, any>) {
    return this.put(`/financial/withdrawals/${id}`, data);
  }

  async deleteWithdrawal(id: string | number) {
    return this.del(`/financial/withdrawals/${id}`);
  }

  async requestWithdrawal(data: Record<string, any>) {
    return this.post("/financial/withdrawals", data);
  }

  async createWithdrawal(data: Record<string, any>) {
    return this.requestWithdrawal(data);
  }

  // ─── Expenses (Despesas Operacionais) ────────────────────────────────────
  async getExpenses(filters?: Record<string, any>) {
    return this.get("/expenses", filters);
  }

  async getExpense(id: string) {
    return this.get(`/expenses/${id}`);
  }

  async createExpense(data: Record<string, any>) {
    return this.post("/expenses", data);
  }

  async updateExpense(id: string, data: Record<string, any>) {
    return this.put(`/expenses/${id}`, data);
  }

  async deleteExpense(id: string, only_this = false) {
    return this.del(`/expenses/${id}?only_this=${only_this}`);
  }

  async getExpenseStats(params?: Record<string, any>) {
    return this.get("/expenses/stats", params);
  }

  // ─── Wallets & Ledger ─────────────────────────────────────────────────────
  async getWallets(filters?: Record<string, any>) { return this.get("/wallets", filters); }
  async getWallet(id: string) { return this.get(`/wallets/${id}`); }
  async getWalletStats(params?: Record<string, any>) { return this.get("/wallets/stats", params); }
  async getWalletLedger(id: string, params?: Record<string, any>) { return this.get(`/wallets/${id}/ledger`, params); }
  async getWalletGlobalLedger(params?: Record<string, any>) { return this.get("/wallets/ledger", params); }
  async getWalletProjections(params?: Record<string, any>) { return this.get("/wallets/projections", params); }
  async getWalletConciliation(params?: Record<string, any>) { return this.get("/wallets/conciliation", params); }
  async createWallet(data: Record<string, any>) { return this.post("/wallets", data); }
  async updateWallet(id: string, data: Record<string, any>) { return this.put(`/wallets/${id}`, data); }
  async createWalletAdjustment(id: string, data: Record<string, any>) { return this.post(`/wallets/${id}/adjustment`, data); }

  // ─── Squad ────────────────────────────────────────────────────────────────
  async getSquadStats() { return this.get("/squad/stats"); }
  async getSquadList(params?: Record<string, any>) { return this.get("/squad", params); }
  async getSquad(id: string) { return this.get(`/squad/${id}`); }
  async createSquad(data: Record<string, any>) { return this.post("/squad", data); }
  async updateSquad(id: string, data: Record<string, any>) { return this.put(`/squad/${id}`, data); }
  async deleteSquad(id: string) { return this.del(`/squad/${id}`); }
  async getSquadCycles(id: string, params?: Record<string, any>) { return this.get(`/squad/${id}/cycles`, params); }
  async getSquadCurrentCycle(id: string) { return this.get(`/squad/${id}/current-cycle`); }
  async closeSquadCycle(id: string) { return this.post(`/squad/${id}/close-cycle`, {}); }
  async paySquadInvoice(id: string, data: Record<string, any>) { return this.post(`/squad/${id}/pay-invoice`, data); }
  async squadContract(id: string, data: Record<string, any>) { return this.post(`/squad/${id}/contract`, data); }

  // ─── Agency Leadership & Reports ─────────────────────────────────────────
  async getLedAgencies() {
    return this.get("/agencies/led/list");
  }

  async startLeadingAgency(agencyId: string, data?: Record<string, any>) {
    return this.post(`/agencies/${agencyId}/lead`, data);
  }

  async stopLeadingAgency(agencyId: string) {
    return this.del(`/agencies/${agencyId}/lead`);
  }

  async getAgencyReports(agencyId: string) {
    return this.get(`/agencies/${agencyId}/reports`);
  }

  async createAgencyReport(agencyId: string, data: Record<string, any>) {
    return this.post(`/agencies/${agencyId}/reports`, data);
  }

  async updateAgencyReport(
    agencyId: string,
    reportId: string,
    data: Record<string, any>,
  ) {
    return this.put(`/agencies/${agencyId}/reports/${reportId}`, data);
  }

  async deleteAgencyReport(agencyId: string, reportId: string) {
    return this.del(`/agencies/${agencyId}/reports/${reportId}`);
  }

  // ─── Specialties ──────────────────────────────────────────────────────────
  async getSpecialties(filters?: Record<string, any>) {
    return this.get("/specialties", filters);
  }

  async createSpecialty(data: Record<string, any>) {
    return this.post("/specialties", data);
  }

  async updateSpecialty(id: string | number, data: Record<string, any>) {
    return this.put(`/specialties/${id}`, data);
  }

  async deleteSpecialty(id: string | number) {
    return this.del(`/specialties/${id}`);
  }

  // ─── Terms ────────────────────────────────────────────────────────────────
  async getTerms(filters?: Record<string, any>) {
    return this.get("/terms", filters);
  }

  async getTerm(id: string | number) {
    return this.get(`/terms/${id}`);
  }

  async createTerm(data: Record<string, any>) {
    return this.post("/terms", data);
  }

  async updateTerm(id: string | number, data: Record<string, any>) {
    return this.put(`/terms/${id}`, data);
  }

  async deleteTerm(id: string | number) {
    return this.del(`/terms/${id}`);
  }

  async checkTerms() {
    return this.get("/terms/check");
  }

  async acceptTerm(termId: string | number) {
    return this.post(`/terms/${termId}/accept`);
  }

  async getTermAcceptances(filters?: Record<string, any>) {
    return this.get("/terms/acceptances", filters);
  }

  // ─── Allkademy / Courses ──────────────────────────────────────────────────
  async getCourses(filters?: Record<string, any>) {
    return this.get("/allkademy/courses", filters);
  }

  async getCourse(id: string | number) {
    return this.get(`/allkademy/courses/${id}`);
  }

  async createCourse(data: Record<string, any>) {
    return this.post("/allkademy/courses", data);
  }

  async updateCourse(id: string | number, data: Record<string, any>) {
    return this.put(`/allkademy/courses/${id}`, data);
  }

  async deleteCourse(id: string | number) {
    return this.del(`/allkademy/courses/${id}`);
  }

  async addCourseModule(courseId: string | number, data: Record<string, any>) {
    return this.post(`/allkademy/courses/${courseId}/modules`, data);
  }

  async addModuleLesson(moduleId: string | number, data: Record<string, any>) {
    return this.post(`/allkademy/modules/${moduleId}/lessons`, data);
  }

  async getMyEnrollments(userId?: string | number) {
    return this.get("/allkademy/enrollments");
  }

  async enrollCourse(courseId: string | number, _userId?: string | number) {
    return this.post(`/allkademy/courses/${courseId}/enroll`);
  }

  // ─── Permissions ──────────────────────────────────────────────────────────
  async getPermissionProfiles() {
    return this.get("/permissions/profiles");
  }

  async createPermissionProfile(data: Record<string, any>) {
    return this.post("/permissions/profiles", data);
  }

  async updatePermissionProfile(
    id: string | number,
    data: Record<string, any>,
  ) {
    return this.put(`/permissions/profiles/${id}`, data);
  }

  async deletePermissionProfile(id: string | number) {
    return this.del(`/permissions/profiles/${id}`);
  }

  async updateProfilePermissions(
    profileId: string | number,
    permissions: any[],
  ) {
    return this.post("/permissions", { profile_id: profileId, permissions });
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────
  async getConversations() {
    return this.get("/chat/conversations");
  }

  async createConversation(data: Record<string, any>) {
    return this.post("/chat/conversations", data);
  }

  async getMessages(conversationId: string | number) {
    return this.get(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string | number, content: string) {
    return this.post(`/chat/conversations/${conversationId}/messages`, {
      content,
    });
  }

  // ─── Reports ──────────────────────────────────────────────────────────────
  async getReportSummary() {
    return this.get("/reports/summary");
  }

  async getReportFinancial() {
    return this.get("/reports/financial");
  }

  async getReportConfigs() {
    return this.get("/reports/config");
  }

  async saveReportConfig(reportKey: string, config: Record<string, any>) {
    return this.put(`/reports/config/${encodeURIComponent(reportKey)}`, config);
  }

  async getAvailableReports() {
    return this.get("/reports/available");
  }

  async runIndicator(payload: {
    indicatorId: string;
    startDate: string;
    endDate: string;
    filters?: Record<string, unknown>;
    comparisonMode?: boolean;
  }) {
    return this.post("/reports/indicators/run", payload);
  }

  async runIndicatorBatch(indicators: Array<{
    indicatorId: string;
    startDate: string;
    endDate: string;
    filters?: Record<string, unknown>;
    comparisonMode?: boolean;
  }>) {
    return this.post("/reports/indicators/run/batch", { indicators });
  }

  // ─── Admin report CRUD ─────────────────────────────────────────────────────
  async getAdminReports() {
    return this.get("/admin/reports");
  }

  async createAdminReport(reportKey: string, config: Record<string, unknown>) {
    return this.post("/admin/reports", { report_key: reportKey, ...config });
  }

  async updateAdminReport(reportKey: string, config: Record<string, unknown>) {
    return this.put(`/admin/reports/${encodeURIComponent(reportKey)}`, config);
  }

  async patchAdminReportPermissions(reportKey: string, permissions: Record<string, unknown>) {
    return this.patch(`/admin/reports/${encodeURIComponent(reportKey)}/permissions`, permissions);
  }

  async deleteAdminReport(reportKey: string) {
    return this.del(`/admin/reports/${encodeURIComponent(reportKey)}`);
  }

  async recordUsageEvent(payload: {
    event_type: string;
    route: string;
    session_id?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.post("/reports/usage-event", payload);
  }

  async getLevels(filters?: Record<string, any>) {
    return this.get("/levels", filters);
  }
  async createLevel(data: any) {
    return this.post("/levels", data);
  }
  async updateLevel(id: string, data: any) {
    return this.put(`/levels/${id}`, data);
  }
  async deleteLevel(id: string) {
    return this.del(`/levels/${id}`);
  }

  // ─── Catalog Tasks (Cadastro de Tarefas) ──────────────────────────────────
  async getCatalogTasks(filters?: Record<string, any>) {
    return this.get("/task-templates", filters);
  }
  async getCatalogTask(id: string) {
    return this.get(`/task-templates/${id}`);
  }
  async createCatalogTask(data: Record<string, any>) {
    return this.post("/task-templates", data);
  }
  async updateCatalogTask(id: string, data: Record<string, any>) {
    return this.put(`/task-templates/${id}`, data);
  }
  async updateCatalogTaskStatus(
    id: string,
    status: string,
    is_active?: boolean,
  ) {
    return this.patch(`/task-templates/${id}/status`, { status, is_active });
  }
  async deleteCatalogTask(id: string) {
    return this.del(`/task-templates/${id}`);
  }
  async getCatalogTasksByProduct(productId: string) {
    return this.get(`/task-templates/by-product/${productId}`);
  }
  async linkCatalogTaskToProduct(data: {
    product_id: string;
    catalog_task_id: string;
    sort_order?: number;
    is_mandatory?: boolean;
    phase?: string;
    notes?: string;
  }) {
    return this.post("/task-templates/links", data);
  }
  async unlinkCatalogTask(linkId: string) {
    return this.del(`/task-templates/links/${linkId}`);
  }

  // ─── Project Products (vinculação Projeto ↔ Produto) ────────────────────
  async getProjectProducts(filters?: Record<string, any>) {
    return this.get("/project-products", filters);
  }
  async linkProductToProject(data: {
    project_id: string;
    product_id: string;
    variation_id?: string;
    recurrence_snapshot?: "avulso" | "mensal";
    preco_final_cliente_snapshot?: number;
    comissao_snapshot?: number;
    pagador_snapshot?: "AGENCIA" | "CLIENTE";
    start_date?: string;
    expected_end_date?: string;
  }) {
    return this.post("/project-products", data);
  }
  async updateProjectProduct(id: string, data: Record<string, any>) {
    return this.patch(`/project-products/${id}`, data);
  }
  async unlinkProductFromProject(id: string) {
    return this.del(`/project-products/${id}`);
  }

  // ─── Project Tasks (tarefas em execução geradas de produtos) ─────────────
  async getProjectTasks(filters?: Record<string, any>) {
    return this.get("/project-products/tasks", filters);
  }
  async getProjectTask(id: string) {
    return this.get(`/project-products/tasks/${id}`);
  }
  async updateProjectTask(
    id: string,
    data: {
      status?:
        | "PARA_LANCAMENTO"
        | "EM_LANCAMENTO"
        | "AGUARDANDO_INFORMACOES"
        | "LIBERADA_PARA_EXECUCAO"
        | "EM_EXECUCAO"
        | "EM_REVISAO"
        | "EM_APROVACAO"
        | "CONCLUIDA"
        | "CANCELADA"
        | "AGUARDANDO_NOMADE";
      priority?: "low" | "medium" | "high" | "urgent";
      assignee_id?: string | null;
      responsavel_agencia_id?: string | null;
      nomade_responsavel_id?: string | null;
      due_date?: string | null;
      start_date?: string | null;
      observations?: string | null;
    },
  ) {
    return this.patch(`/project-tasks/${id}`, data);
  }

  // ─── Operational task actions (project-tasks router) ─────────────────────
  async getOperationalTasks(filters?: Record<string, any>) {
    return this.get("/project-tasks", filters);
  }
  // Item único — mesmo modelo/include rico usado pela listagem (project,
  // project_product, stages, briefing_answers, attachments). Nunca usar
  // getTask() (rota /tasks/:id, outro model/router mais pobre) aqui.
  async getOperationalTask(id: string, signal?: AbortSignal) {
    return this.get(`/project-tasks/${id}`, undefined, signal);
  }
  async launchProjectTask(id: string) {
    return this.patch(`/project-tasks/${id}/launch`, {});
  }
  async releaseProjectTask(id: string) {
    return this.patch(`/project-tasks/${id}/release`, {});
  }
  // Transfere uma tarefa paga e não usada pra outro projeto — só admin, nunca
  // gera cobrança nova (ver POST /api/project-tasks/:id/transfer).
  async transferProjectTask(id: string, target_project_id: string) {
    return this.post(`/project-tasks/${id}/transfer`, { target_project_id });
  }
  async getProjectTaskStages(id: string) {
    return this.get(`/project-tasks/${id}/stages`);
  }
  async updateProjectTaskStage(
    taskId: string,
    stageId: string,
    data: { status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "BLOQUEADA" },
  ) {
    return this.patch(`/project-tasks/${taskId}/stages/${stageId}`, data);
  }
  async getProjectTaskBriefing(id: string) {
    return this.get(`/project-tasks/${id}/briefing`);
  }
  async getProjectFiles(projectId: string) {
    return this.get(`/projects/${projectId}/files`);
  }
  // ─── Documentos de contexto do projeto (aba "Documentos") ──────────────────
  // Diferente de getProjectFiles (entregas/referências de tarefas): estes são
  // PDFs/docs/imagens sobre o cliente/projeto em si, que a IA pode usar como
  // base extra ao preencher briefing de tarefas (ver aiFillBriefing abaixo).
  async getProjectDocuments(projectId: string) {
    return this.get(`/projects/${projectId}/documents`);
  }
  async uploadProjectDocument(projectId: string, file: File) {
    return this.uploadFile(`/projects/${projectId}/documents`, file);
  }
  async deleteProjectDocument(projectId: string, documentId: string) {
    return this.del(`/projects/${projectId}/documents/${documentId}`);
  }
  async downloadProjectDocument(projectId: string, documentId: string) {
    return this.downloadBlob(`/projects/${projectId}/documents/${documentId}/download`);
  }
  async getProjectDashboard(projectId: string) {
    return this.get(`/projects/${projectId}/dashboard`);
  }
  async getProjectBilling(projectId: string) {
    return this.get(`/projects/${projectId}/billing`);
  }
  async getProjectCredentials(projectId: string) {
    return this.get(`/projects/${projectId}/credentials`);
  }
  async createProjectCredential(projectId: string, data: Record<string, any>) {
    return this.post(`/projects/${projectId}/credentials`, data);
  }
  async updateProjectCredential(projectId: string, credentialId: string, data: Record<string, any>) {
    return this.patch(`/projects/${projectId}/credentials/${credentialId}`, data);
  }
  async deleteProjectCredential(projectId: string, credentialId: string) {
    return this.del(`/projects/${projectId}/credentials/${credentialId}`);
  }
  async shareProjectCredential(projectId: string, credentialId: string, data: Record<string, any>) {
    return this.post(`/projects/${projectId}/credentials/${credentialId}/share`, data);
  }
  async revokeProjectCredential(projectId: string, credentialId: string) {
    return this.post(`/projects/${projectId}/credentials/${credentialId}/revoke`, {});
  }
  async getProjectTaskAttachments(id: string, type?: string) {
    return this.get(
      `/project-tasks/${id}/attachments`,
      type ? { type } : undefined,
    );
  }
  async saveProjectTaskBriefing(id: string, body: { answers: any[] }) {
    return this.put(`/project-tasks/${id}/briefing`, body);
  }
  // ─── Consultor IA (Gemini, embasado na base PLAC) ──────────────────────────
  async aiFillBriefing(body: {
    free_text: string;
    questions: { question_key: string; question_text: string; type?: string; options?: string[]; required?: boolean }[];
    project_id?: string;
    use_project_documents?: boolean;
  }) {
    return this.post("/ai-consultor/fill-briefing", body);
  }
  async aiImproveAnswer(body: { question_text: string; current_answer?: string; type?: string }) {
    return this.post("/ai-consultor/improve-answer", body);
  }
  async aiImproveProductField(body: {
    field_label: string;
    current_value?: string;
    mode?: "text" | "list";
    length?: "manter" | "curto" | "medio" | "longo";
    approach?: "melhorar" | "recriar";
    context?: {
      name?: string;
      category?: string;
      price?: string | number;
      other_fields?: Record<string, string>;
    };
  }) {
    return this.post("/ai-consultor/improve-product-field", body);
  }
  async aiImproveFeedbackTicket(body: {
    type: string;
    title?: string;
    description?: string;
    steps?: string;
    expected_result?: string;
    actual_result?: string;
  }) {
    return this.post<{
      title: string;
      description: string;
      steps: string;
      expected_result: string;
      actual_result: string;
    }>("/ai-consultor/improve-feedback-ticket", body);
  }
  async aiResearchProductPricing(body: {
    product_name?: string;
    category?: string;
    description?: string;
  }) {
    return this.post("/ai-consultor/research-product-pricing", body);
  }
  async aiResearchSpecialtyMarket(body: {
    specialty_name?: string;
    category?: string;
    description?: string;
  }) {
    return this.post("/ai-consultor/research-specialty-market", body);
  }
  async aiResearchEmergingSpecialties(body: { category_hint?: string }) {
    return this.post("/ai-consultor/research-emerging-specialties", body);
  }
  // ─── Base de Conhecimento IA (admin > Configurações) ───────────────────────
  // "Bancos" de documentos por finalidade de IA (briefing/PLAC, produtos...),
  // consultados pelo Consultor IA acima. Só admin gerencia.
  async getKnowledgeCategories() {
    return this.get("/ai-knowledge-base/categories");
  }
  async createKnowledgeCategory(body: { key: string; name: string; description?: string }) {
    return this.post("/ai-knowledge-base/categories", body);
  }
  async getKnowledgeDocuments(categoryKey: string) {
    return this.get(`/ai-knowledge-base/categories/${categoryKey}/documents`);
  }
  async uploadKnowledgeDocument(categoryKey: string, file: File) {
    return this.uploadFile(`/ai-knowledge-base/categories/${categoryKey}/documents`, file);
  }
  async deleteKnowledgeDocument(documentId: string) {
    return this.del(`/ai-knowledge-base/documents/${documentId}`);
  }
  async downloadKnowledgeDocument(documentId: string) {
    return this.downloadBlob(`/ai-knowledge-base/documents/${documentId}/download`);
  }
  // ─── Uso e Custos de IA (admin > Configurações) ────────────────────────────
  async getAIUsageSummary() {
    return this.get("/ai-usage/summary");
  }
  async updateAIServiceConfig(
    key: string,
    body: { monthly_budget_usd?: number | null; alert_threshold_pct?: number; is_active?: boolean },
  ) {
    return this.put(`/ai-usage/services/${key}`, body);
  }
  async createAIService(body: { key: string; name: string; provider?: string }) {
    return this.post("/ai-usage/services", body);
  }
  async createAIModelPricing(
    serviceKey: string,
    body: {
      model: string;
      pricing_unit: "tokens" | "image" | "video_second" | "request" | "minute";
      input_price_per_million?: number;
      output_price_per_million?: number;
      unit_price?: number;
    },
  ) {
    return this.post(`/ai-usage/services/${serviceKey}/models`, body);
  }
  async updateAIModelPricing(
    pricingId: string,
    body: { input_price_per_million?: number; output_price_per_million?: number; unit_price?: number },
  ) {
    return this.put(`/ai-usage/pricing/${pricingId}`, body);
  }
  async submitProjectTaskBriefing(id: string, body: { answers: any[] }) {
    return this.patch(`/project-tasks/${id}/submit-briefing`, body);
  }
  // Lançamento em lote — produtos "pacote" (2+ tarefas do mesmo ProjectProduct)
  async bulkSubmitProjectTaskBriefing(items: { task_id: string; answers: any[] }[]) {
    return this.patch(`/project-tasks/bulk-submit-briefing`, { items });
  }
  async addProjectTaskAttachment(
    id: string,
    data: {
      type: string;
      name: string;
      url: string;
      size?: number;
      mime_type?: string;
      observations?: string;
    },
  ) {
    return this.post(`/project-tasks/${id}/attachments`, data);
  }
  async deleteProjectTaskAttachment(id: string, attachmentId: string) {
    return this.del(`/project-tasks/${id}/attachments/${attachmentId}`);
  }

  // ─── Payments (Sandbox / Fake Gateway) ────────────────────────────────────
  async fakeSandboxCheckout(data: {
    project_id: string;
    amount: number;
    card_last_digits?: string;
    card_holder?: string;
    notes?: string;
  }) {
    return this.post("/payments/fake-checkout", data);
  }
    async getPayment(id: string | number) {
      return this.get(`/payments/${id}`);
    }

  async getPayments(filters?: Record<string, any>) {
    return this.get("/payments", filters);
  }

  async getSystemAlerts(filters?: Record<string, any>) {
    return this.get("/system-alerts", filters);
  }

  // Monitoramento da liderança (ata 2026-08, bloco 2/5) — alertas críticos
  // de terceiros no escopo autorizado. 403 quando o usuário não tem função
  // de acompanhamento (a aba nem aparece).
  async getAlertMonitoring(filters?: Record<string, any>) {
    return this.get<{
      data: any[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
      scope_level: "master" | "admin" | "leader";
      scope_note: string | null;
    }>("/system-alerts/monitoring", filters);
  }

  async getAlertMonitoringSummary(filters?: Record<string, any>) {
    return this.get<{
      criticos_ativos: number;
      resolvidos_no_periodo: number;
      automaticos_pendentes: number;
      manuais_pendentes: number;
      oldest_open_at: string | null;
      oldest_open_ms: number | null;
      filtered: boolean;
    }>("/system-alerts/monitoring/summary", filters);
  }

  async markSystemAlertRead(id: string) {
    return this.patch(`/system-alerts/${id}/read`, {});
  }

  async markAllSystemAlertsRead(filters?: Record<string, any>) {
    return this.patch("/system-alerts/read-all", {}, filters);
  }

  async getAgencyAlerts() {
    return this.get("/agencies/me/alerts");
  }

  async getUnreadSystemAlertsCount(filters?: Record<string, any>) {
    // bySeverity só vem preenchido quando filters.category === "alerta" — é
    // a quebra por criticidade (info→verde, warning→amarelo, error→vermelho).
    return this.get<{ count: number; bySeverity?: { info: number; warning: number; error: number } }>(
      "/system-alerts/unread-count",
      filters,
    );
  }

  async archiveSystemAlert(id: string) {
    return this.patch(`/system-alerts/${id}/archive`, {});
  }

  async unarchiveSystemAlert(id: string) {
    return this.patch(`/system-alerts/${id}/unarchive`, {});
  }

  // ─── Detalhes e histórico (ata 2026-08, 8º lote) ───────────────────────────
  async getSystemAlertDetail(id: string, signal?: AbortSignal) {
    return this.get(`/system-alerts/${id}`, undefined, signal);
  }

  // "detalhes abertos"/"origem clicada" — eventos de visualização. Nunca
  // disparados por polling/re-render (ver AlertDetailDrawer). A garantia
  // real contra duplicação é o `clientEventId` (ver
  // recordClientTriggeredEventIdempotent no backend, protegido por índice
  // único) — obrigatório aqui, nunca opcional (ata 2026-08, 9º lote:
  // "a proteção não pode depender somente de useRef").
  async recordSystemAlertEvent(id: string, eventType: "details_opened" | "origin_clicked", clientEventId: string) {
    return this.post(`/system-alerts/${id}/events`, { event_type: eventType, client_event_id: clientEventId });
  }

  // Resolução formal de alerta crítico (ata 2026-08, 10º lote). Mesma
  // garantia de idempotência dos eventos: clientActionId obrigatório,
  // gerado uma vez por submissão intencional do formulário — repetir com o
  // MESMO valor (retry, clique duplo) devolve o resultado já existente sem
  // duplicar. Erros usam o corpo da resposta (400/403/404/409) pra
  // mensagens amigáveis — nunca só "request failed".
  async resolveSystemAlert(
    id: string,
    data: { action: string; description: string },
    clientActionId: string,
  ) {
    return this.post(`/system-alerts/${id}/resolve`, {
      action: data.action,
      description: data.description,
      client_action_id: clientActionId,
    });
  }

  // ─── Central de Alertas (Admin Master) — ata 2026-08 ───────────────────────
  async getAdminSystemAlerts(filters?: Record<string, any>) {
    return this.get("/system-alerts/admin", filters);
  }

  async createAdminSystemAlert(data: {
    title: string;
    message: string;
    severity: "info" | "warning" | "error";
    user_id?: string | null;
    image_file_name?: string | null;
    image_alt?: string | null;
    expires_at?: string | null;
    destination_type?: "none" | "project" | "task";
    destination_id?: string | null;
  }) {
    return this.post("/system-alerts/admin", data);
  }

  // Seletor buscável de "Destino opcional" do Avulso (ata 2026-08, 6º lote)
  // — nunca URL/id digitado, só busca por nome/código entre registros
  // reais. Leve e paginado (20 no backend) de propósito.
  async getAlertDestinationOptions(type: "project" | "task", search?: string) {
    return this.get("/system-alerts/admin/destination-options", { type, search });
  }

  async updateAdminSystemAlert(
    id: string,
    data: {
      title?: string;
      message?: string;
      image_file_name?: string | null;
      image_alt?: string | null;
      expires_at?: string | null;
    },
  ) {
    return this.patch(`/system-alerts/admin/${id}`, data);
  }

  // Upload de imagem de alerta (Padrão/Avulso/Programado — ata 2026-08, 4º
  // lote). Retorna { file_name, url } — `file_name` é o que se manda de
  // volta pros endpoints de criação/edição, `url` já vem com o prefixo
  // "/api/..." do backend (ver resolveAlertImageUrl abaixo pra montar o
  // <img src> correto).
  async uploadAlertImage(file: File): Promise<{ file_name: string; url: string }> {
    return this.uploadFile("/system-alerts/admin/images", file);
  }

  // O backend devolve `image_url` já prefixado com "/api/..." (mesmo
  // prefixo que API_BASE_URL normalmente inclui — ver VITE_API_URL nos
  // .env.example, sempre termina em "/api"). Prependar API_BASE_URL direto
  // duplicaria o "/api". Em vez disso, tira o "/api" final de API_BASE_URL
  // (sobra a origem: "" no dev com proxy, ou "https://host" em produção) e
  // prependa só isso.
  resolveAlertImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    const origin = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${origin}${url}`;
  }

  // A rota que serve a imagem exige Bearer token E autorização por recurso
  // (ver GET /system-alerts/:id/image, /admin/standards/:id/image e
  // /admin/schedules/:id/image no backend — cada uma amarrada ao dono do
  // recurso, nunca um nome de arquivo solto) — uma tag <img src="..."> comum
  // não tem como mandar esse header. Cross-origin
  // (frontend:8081 x backend:3001 neste dev, ou domínios diferentes em
  // produção) isso derruba a imagem com ERR_BLOCKED_BY_ORB: o navegador
  // recebe um 401 (corpo JSON) onde esperava bytes de imagem e bloqueia a
  // resposta opaca. Mesmo problema que anexos de projeto já tinham (ver
  // `downloadBlob` acima) — a solução é a mesma: buscar com fetch()
  // autenticado e converter pra Object URL, nunca um <img src> direto pra
  // uma rota protegida por header.
  async fetchAlertImageBlobUrl(resolvedUrl: string): Promise<string> {
    const token = this.getToken();
    const res = await fetch(resolvedUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async reclassifyAdminSystemAlert(id: string, severity: "info" | "warning" | "error") {
    return this.patch(`/system-alerts/admin/${id}/severity`, { severity });
  }

  async archiveAdminSystemAlert(id: string) {
    return this.patch(`/system-alerts/admin/${id}/archive`, {});
  }

  async unarchiveAdminSystemAlert(id: string) {
    return this.patch(`/system-alerts/admin/${id}/unarchive`, {});
  }

  // ─── Padrões e Regras (ata 2026-08, 2º lote) ───────────────────────────────
  async getAdminAlertStandards() {
    return this.get("/system-alerts/admin/standards");
  }
  async updateAdminAlertStandard(
    id: string,
    data: {
      name?: string;
      title?: string;
      message?: string;
      default_severity?: "info" | "warning" | "error";
      is_active?: boolean;
      image_file_name?: string | null;
      image_alt?: string | null;
      // Governança do Admin Master (ata 2026-08, bloco 2/5)
      is_mandatory?: boolean;
      mandatory_min_severity?: "info" | "warning" | "error" | null;
      personal_prefs_allowed?: boolean;
      additional_channels?: string[];
      governed_event_types?: string[];
    },
  ) {
    return this.patch(`/system-alerts/admin/standards/${id}`, data);
  }
  async previewAdminAlertStandard(id: string) {
    return this.post(`/system-alerts/admin/standards/${id}/preview`, {});
  }
  async getAdminAlertRules() {
    return this.get("/system-alerts/admin/rules");
  }
  async updateAdminAlertRule(
    id: string,
    data: {
      is_active?: boolean;
      lead_time_minutes?: number | null;
      severity_override?: "info" | "warning" | "error" | null;
      recipient_roles?: string[];
    },
  ) {
    return this.patch(`/system-alerts/admin/rules/${id}`, data);
  }

  // ─── Alertas Programados (Admin Master) — ata 2026-08, 4º lote ─────────────
  async getAdminAlertSchedules() {
    return this.get("/system-alerts/admin/schedules");
  }

  async createAdminAlertSchedule(data: {
    name: string;
    title: string;
    message: string;
    severity: "info" | "warning" | "error";
    user_id?: string | null;
    image_file_name?: string | null;
    image_alt?: string | null;
    recurrence_type: "once" | "daily" | "weekly";
    weekdays?: number[];
    time_of_day: string;
    timezone: string;
    start_date: string;
    end_date?: string | null;
    occurrence_expires_minutes?: number | null;
  }) {
    return this.post("/system-alerts/admin/schedules", data);
  }

  async updateAdminAlertSchedule(
    id: string,
    data: Partial<{
      name: string;
      title: string;
      message: string;
      severity: "info" | "warning" | "error";
      user_id: string | null;
      image_file_name: string | null;
      image_alt: string | null;
      recurrence_type: "once" | "daily" | "weekly";
      weekdays: number[];
      time_of_day: string;
      timezone: string;
      start_date: string;
      end_date: string | null;
      occurrence_expires_minutes: number | null;
      is_active: boolean;
    }>,
  ) {
    return this.patch(`/system-alerts/admin/schedules/${id}`, data);
  }

  async archiveAdminAlertSchedule(id: string) {
    return this.patch(`/system-alerts/admin/schedules/${id}/archive`, {});
  }

  async previewAdminAlertSchedule(id: string) {
    return this.post(`/system-alerts/admin/schedules/${id}/preview`, {});
  }

  // ─── Preferências pessoais de notificação (evento × canal) ────────────────
  async getNotificationPreferences() {
    return this.get<{
      data: Array<{ event_type: string; channel: string; enabled: boolean }>;
    }>("/notification-preferences");
  }

  async updateNotificationPreference(
    event_type: string,
    channels: Partial<Record<"in_app" | "email" | "whatsapp" | "push", boolean>>,
  ) {
    return this.put("/notification-preferences", { event_type, channels });
  }

  // ─── Grupos pessoais de notificação ────────────────────────────────────────
  async getNotificationGroups() {
    return this.get<{
      data: Array<{ id: string; name: string; description: string | null; member_count: number; created_at: string }>;
    }>("/notification-groups");
  }

  async getNotificationGroupEligibleMembers() {
    return this.get<{ data: Array<{ id: string; name: string; email: string }> }>(
      "/notification-groups/eligible-members",
    );
  }

  async getNotificationGroup(id: string) {
    return this.get(`/notification-groups/${id}`);
  }

  async createNotificationGroup(data: { name: string; description?: string; member_user_ids: string[] }) {
    return this.post("/notification-groups", data);
  }

  async updateNotificationGroup(
    id: string,
    data: { name?: string; description?: string; member_user_ids?: string[] },
  ) {
    return this.put(`/notification-groups/${id}`, data);
  }

  async deleteNotificationGroup(id: string) {
    return this.del(`/notification-groups/${id}`);
  }

  // ─── Ajuda e sugestões (integração Roadmap) ────────────────────────────────
  async getProductFeedbackAccess() {
    return this.get("/product-feedback/access");
  }

  async createProductFeedbackWorkItem(body: {
    clientSubmissionId: string;
    type: "PROBLEM" | "IDEA" | "IMPROVEMENT";
    title: string;
    description: string;
    pathname: string;
    pageTitle?: string;
    steps?: string;
    expectedResult?: string;
    actualResult?: string;
    impact?: string;
  }) {
    return this.post("/product-feedback/work-items", body);
  }

  async getProductFeedbackWorkItems() {
    return this.get("/product-feedback/work-items");
  }

  async getProductFeedbackWorkItem(protocol: string) {
    return this.get(`/product-feedback/work-items/${encodeURIComponent(protocol)}`);
  }

  // ─── Admin > Acesso aos chamados ────────────────────────────────────────────
  async getProductFeedbackAdminConfig() {
    return this.get("/admin/product-feedback/config");
  }

  async updateProductFeedbackAdminConfig(body: { enabled?: boolean; defaultPolicy?: string; reason?: string }) {
    return this.patch("/admin/product-feedback/config", body);
  }

  async getProductFeedbackAdminSummary() {
    return this.get("/admin/product-feedback/summary");
  }

  async getProductFeedbackAdminUsers(params?: Record<string, any>) {
    return this.get("/admin/product-feedback/users", params);
  }

  async setProductFeedbackUserOverride(
    userId: string,
    body: { effect: "ALLOW" | "DENY" | "INHERIT"; expiresAt?: string | null; reason?: string },
  ) {
    return this.put(`/admin/product-feedback/users/${userId}/override`, body);
  }

  async batchSetProductFeedbackOverride(body: {
    userIds: string[];
    effect: "ALLOW" | "DENY" | "INHERIT";
    expiresAt?: string | null;
    reason?: string;
  }) {
    return this.post("/admin/product-feedback/users/batch-override", body);
  }

  async getProductFeedbackGroups() {
    return this.get("/admin/product-feedback/groups");
  }

  async createProductFeedbackGroup(body: {
    name: string;
    effect: "ALLOW" | "DENY";
    priority?: number;
    active?: boolean;
    expiresAt?: string | null;
    reason?: string;
  }) {
    return this.post("/admin/product-feedback/groups", body);
  }

  async updateProductFeedbackGroup(id: string, body: Record<string, any>) {
    return this.patch(`/admin/product-feedback/groups/${id}`, body);
  }

  async getProductFeedbackGroupMembers(id: string) {
    return this.get(`/admin/product-feedback/groups/${id}/members`);
  }

  async archiveProductFeedbackGroup(id: string) {
    return this.del(`/admin/product-feedback/groups/${id}`);
  }

  async addProductFeedbackGroupMembers(id: string, userIds: string[]) {
    return this.post(`/admin/product-feedback/groups/${id}/members`, { userIds });
  }

  async removeProductFeedbackGroupMember(id: string, userId: string) {
    return this.del(`/admin/product-feedback/groups/${id}/members/${userId}`);
  }

  async getProductFeedbackAudit(params?: Record<string, any>) {
    return this.get("/admin/product-feedback/audit", params);
  }

  async simulateProductFeedbackAccess(userId: string) {
    return this.post("/admin/product-feedback/simulate", { userId });
  }

  // Gated by the real granular permission (sistema OR central_chamados),
  // never role/account_type — deliberately NOT under /admin/product-feedback
  // (that prefix's routes require role==="admin" for everything). See
  // apps/backend/src/routes/roadmap-sso.ts.
  // ── Gestão da permissão "central_chamados" (quem vê "Roadmap e chamados"
  // e pode usar o SSO, sem precisar do módulo "sistema" inteiro) ──────────
  async getCentralChamadosUsers(params: { page: number; limit: number; search?: string; filter?: string }) {
    return this.get<{
      items: Array<{
        id: string;
        name: string;
        email: string;
        userCode: string | null;
        accountType: string;
        role: string;
        isActive: boolean;
        status: string;
        profileId: string | null;
        profileName: string | null;
        isDedicatedProfile: boolean;
        hasExplicitCentralChamados: boolean;
        canOpenRoadmap: boolean;
      }>;
      pagination: { page: number; limit: number; total: number };
    }>("/admin/central-chamados/users", params);
  }

  async grantCentralChamados(userId: string, reason?: string) {
    return this.post(`/admin/central-chamados/users/${userId}/grant`, { reason });
  }

  async revokeCentralChamados(userId: string, reason?: string) {
    return this.post(`/admin/central-chamados/users/${userId}/revoke`, { reason });
  }

  async batchGrantCentralChamados(userIds: string[], reason?: string) {
    return this.post<{ granted: number; skipped: Array<{ id: string; name: string; reason: string }> }>(
      "/admin/central-chamados/users/batch-grant",
      { userIds, reason },
    );
  }

  async batchRevokeCentralChamados(userIds: string[], reason?: string) {
    return this.post<{ revoked: number; skipped: Array<{ id: string; name: string; reason: string }> }>(
      "/admin/central-chamados/users/batch-revoke",
      { userIds, reason },
    );
  }

  async getRoadmapSsoBaseUrl() {
    return this.get<{ roadmapInternalUrl: string }>("/product-feedback/roadmap-sso/base-url");
  }

  async startRoadmapSso() {
    return this.post<{ redirectUrl: string }>("/product-feedback/roadmap-sso/start", {});
  }
}

// Em modo mock (Vite --mode mock OU VITE_USE_MOCKS=true), troca pelo mock client.
// Agency usa banco real (mesma fonte que admin/lider). Mocks só quando VITE_USE_MOCKS=true.
const env = (import.meta as any).env ?? {};
const useMocks = env.MODE === "mock" || env.VITE_USE_MOCKS === "true";
export const apiClient: any = useMocks ? mockApiClient : new ApiClient();
