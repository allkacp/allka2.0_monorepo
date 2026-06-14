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
      // Auto-logout on 401: clear token and emit event for App.tsx to handle navigation
      if (res.status === 401) {
        this.clearToken();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("allka:unauthorized"));
        }
      }
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

  async getRevenue(from?: string, to?: string) {
    return this.get("/dashboard/revenue", { from, to });
  }

  async getDashboardWidgets(from: Date, to: Date) {
    return this.post("/dashboard/widgets", { from: from.toISOString(), to: to.toISOString() });
  }

  async getDRE(from?: string, to?: string) {
    return this.get("/dashboard/dre", { from, to });
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
  async launchProjectTask(id: string) {
    return this.patch(`/project-tasks/${id}/launch`, {});
  }
  async releaseProjectTask(id: string) {
    return this.patch(`/project-tasks/${id}/release`, {});
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
  async getProjectTaskAttachments(id: string, type?: string) {
    return this.get(
      `/project-tasks/${id}/attachments`,
      type ? { type } : undefined,
    );
  }
  async saveProjectTaskBriefing(id: string, body: { answers: any[] }) {
    return this.put(`/project-tasks/${id}/briefing`, body);
  }
  async submitProjectTaskBriefing(id: string, body: { answers: any[] }) {
    return this.patch(`/project-tasks/${id}/submit-briefing`, body);
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
}

// Em modo mock (Vite --mode mock OU VITE_USE_MOCKS=true), troca pelo mock client.
// Assim não depende de alias do Vite funcionar corretamente.
const env = (import.meta as any).env ?? {};
const isAgencyPreviewRoute =
  env.DEV && typeof window !== "undefined" &&
  (window.location.pathname.startsWith("/agency") ||
    window.location.pathname.startsWith("/agencia"));
const useMocks =
  env.MODE === "mock" ||
  env.VITE_USE_MOCKS === "true" ||
  isAgencyPreviewRoute;
export const apiClient: any = useMocks ? mockApiClient : new ApiClient();
