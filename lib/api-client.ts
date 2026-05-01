// ─── Allka API Client ─────────────────────────────────────────────────────────
// Authenticated HTTP client for the Allka platform backend.
// Token is stored in localStorage under "allka_token".

import { mockApiClient } from "../dev-mocks/mock-api-client";

const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_URL) ||
  "/api";

const TOKEN_KEY = "allka_token";

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
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        msg = j.error || j.message || msg;
        // Append field-specific validation details when present
        if (j.details && typeof j.details === "object") {
          const fieldErrors = Object.entries(
            j.details as Record<string, string[]>,
          )
            .filter(([, v]) => Array.isArray(v) && v.length > 0)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("; ");
          if (fieldErrors) msg += ` — ${fieldErrors}`;
        }
      } catch {}
      throw new Error(msg);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  private get<T = any>(path: string, params?: Record<string, any>) {
    return this.request<T>("GET", path, undefined, params);
  }
  private post<T = any>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }
  private put<T = any>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }
  private patch<T = any>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }
  private del<T = any>(path: string) {
    return this.request<T>("DELETE", path);
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const res = await this.post("/auth/login", { email, password });
    if (res?.token) this.setToken(res.token);
    return res;
  }

  async logout() {
    const res = await this.post("/auth/logout");
    this.clearToken();
    return res;
  }

  async getCurrentUser() {
    return this.get("/auth/me");
  }

  // ─── Users ────────────────────────────────────────────────────────────────
  async getUsers(filters?: Record<string, any>) {
    return this.get("/users", filters);
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

  async deleteUser(id: string | number) {
    return this.del(`/users/${id}`);
  }

  // ─── Companies ────────────────────────────────────────────────────────────
  async getCompanies(filters?: Record<string, any>) {
    return this.get("/clients", filters);
  }

  async getCompany(id: string | number) {
    return this.get(`/clients/${id}`);
  }

  async createCompany(data: Record<string, any>) {
    return this.post("/clients", data);
  }

  async updateCompany(id: string | number, data: Record<string, any>) {
    return this.put(`/clients/${id}`, data);
  }

  async deleteCompany(id: string | number) {
    return this.del(`/clients/${id}`);
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

  // ─── Projects ─────────────────────────────────────────────────────────────
  async getProjects(filters?: Record<string, any>) {
    return this.get("/projects", filters);
  }

  async getProject(id: string | number) {
    return this.get(`/projects/${id}`);
  }

  async createProject(data: Record<string, any>) {
    return this.post("/projects", data);
  }

  async updateProject(id: string | number, data: Record<string, any>) {
    return this.put(`/projects/${id}`, data);
  }

  async deleteProject(id: string | number) {
    return this.del(`/projects/${id}`);
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

  async getMyTasks() {
    return this.get("/tasks", { my: "true", limit: "10" });
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

  async deleteNomade(id: string | number) {
    return this.del(`/nomades/${id}`);
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
  async getAgencies(filters?: Record<string, any>) {
    return this.get("/agencies", filters);
  }

  async getAgency(id: string | number) {
    return this.get(`/agencies/${id}`);
  }

  // ─── Partners ─────────────────────────────────────────────────────────────
  async getPartners(filters?: Record<string, any>) {
    return this.get("/partners", filters);
  }

  async getPartnerMe() {
    return this.get("/partners/me");
  }

  async getPartnerCommissions(id: string | number) {
    const path =
      String(id) === "me"
        ? "/partners/me/commissions"
        : `/partners/${id}/commissions`;
    return this.get(path);
  }

  async createPartner(data: Record<string, any>) {
    return this.post("/partners", data);
  }

  async updatePartner(id: string | number, data: Record<string, any>) {
    return this.put(`/partners/${id}`, data);
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

  // Coupons are campaigns of type "coupon"
  async getCoupons(filters?: Record<string, any>) {
    return this.getCampaigns({ ...filters, type: "coupon" });
  }

  async createCoupon(data: Record<string, any>) {
    return this.createCampaign({ ...data, type: "coupon" });
  }

  async updateCoupon(id: string | number, data: Record<string, any>) {
    return this.updateCampaign(id, data);
  }

  async deleteCoupon(id: string | number) {
    return this.deleteCampaign(id);
  }

  // ─── Financial / Invoices ─────────────────────────────────────────────────
  async getInvoices(filters?: Record<string, any>) {
    return this.get("/billing", filters);
  }

  async getInvoice(id: string | number) {
    return this.get(`/billing/${id}`);
  }

  async createInvoice(data: Record<string, any>) {
    return this.post("/billing", data);
  }

  async updateInvoice(id: string | number, data: Record<string, any>) {
    return this.put(`/billing/${id}`, data);
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

  async requestWithdrawal(data: Record<string, any>) {
    return this.post("/financial/withdrawals", data);
  }

  async createWithdrawal(data: Record<string, any>) {
    return this.requestWithdrawal(data);
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

  async getMyEnrollments(userId?: string | number) {
    return this.get("/allkademy/enrollments/me");
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
  async launchProjectTask(id: string) {
    return this.patch(`/project-tasks/${id}/launch`, {});
  }
  async releaseProjectTask(id: string) {
    return this.patch(`/project-tasks/${id}/release`, {});
  }
  async getProjectTaskStages(id: string) {
    return this.get(`/project-tasks/${id}/stages`);
  }
  async getProjectTaskBriefing(id: string) {
    return this.get(`/project-tasks/${id}/briefing`);
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
}

// Em modo mock (Vite --mode mock OU VITE_USE_MOCKS=true), troca pelo mock client.
// Assim não depende de alias do Vite funcionar corretamente.
const env = (import.meta as any).env ?? {};
const useMocks = env.MODE === "mock" || env.VITE_USE_MOCKS === "true";
export const apiClient: any = useMocks ? mockApiClient : new ApiClient();
