// Allka MVP - API Client utility functions

// Toggle: quando VITE_USE_MOCKS=true, usa dados locais em memória (pasta dev-mocks/).
// Em produção (build pro cPanel) essa variável não existe → usa API real.
// Vite faz tree-shake: se VITE_USE_MOCKS !== "true", o import do mock nem entra no bundle.
import { mockApiClient } from "@/dev-mocks/mock-api-client";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://api-dev.allka.com.vc/api";
const TOKEN_KEY = "allka_token";

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const message =
        body?.error ||
        body?.message ||
        `API Error: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    // 204 No Content
    if (response.status === 204) return undefined as T;

    return response.json();
  }

  private buildQuery(filters?: Record<string, any>): string {
    if (!filters) return "";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────
  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    this.setToken(result.token);
    return result;
  }

  async logout() {
    const result = await this.request("/auth/logout", { method: "POST" });
    this.clearToken();
    return result;
  }

  async getCurrentUser() {
    return this.request("/auth/me");
  }

  // ── Users ────────────────────────────────────────────────────────────────────
  async getUsers(filters?: Record<string, any>) {
    return this.request(`/users${this.buildQuery(filters)}`);
  }

  async getUser(id: string) {
    return this.request(`/users/${id}`);
  }

  async createUser(data: any) {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: any) {
    return this.request(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: "DELETE" });
  }

  // ── Companies / Clients (both map to /clients) ──────────────────────────────
  async getClients(filters?: Record<string, any>) {
    return this.request(`/clients${this.buildQuery(filters)}`);
  }

  async getClient(id: string) {
    return this.request(`/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, { method: "DELETE" });
  }

  // Aliases used by company-facing pages
  async getCompanies(filters?: Record<string, any>) {
    return this.getClients(filters);
  }
  async getCompany(id: string) {
    return this.getClient(id);
  }
  async createCompany(data: any) {
    return this.createClient(data);
  }
  async updateCompany(id: string, data: any) {
    return this.updateClient(id, data);
  }
  async deleteCompany(id: string) {
    return this.deleteClient(id);
  }

  // ── Projects ─────────────────────────────────────────────────────────────────
  async getProjects(filters?: Record<string, any>) {
    return this.request(`/projects${this.buildQuery(filters)}`);
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: any) {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: any) {
    return this.request(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.request(`/projects/${id}`, { method: "DELETE" });
  }

  async getProjectTasks(projectId: string, filters?: Record<string, any>) {
    return this.request(
      `/projects/${projectId}/tasks${this.buildQuery(filters)}`,
    );
  }

  // ── Tasks ────────────────────────────────────────────────────────────────────
  async getTasks(filters?: Record<string, any>) {
    return this.request(`/tasks${this.buildQuery(filters)}`);
  }

  async getTask(id: string) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: any) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any) {
    return this.request(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, { method: "DELETE" });
  }

  async updateTaskStatus(id: string, status: string, feedback?: string) {
    return this.request(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, feedback }),
    });
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  async getDashboardStats() {
    return this.request("/dashboard/stats");
  }

  async getRecentActivities() {
    return this.request("/dashboard/recent-activities");
  }

  async getMyTasks() {
    return this.request("/dashboard/my-tasks");
  }

  // ── Nomades ──────────────────────────────────────────────────────────────────
  async getNomades(filters?: Record<string, any>) {
    return this.request(`/nomades${this.buildQuery(filters)}`);
  }

  async getNomade(id: string) {
    return this.request(`/nomades/${id}`);
  }

  async createNomade(data: any) {
    return this.request("/nomades", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateNomade(id: string, data: any) {
    return this.request(`/nomades/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteNomade(id: string) {
    return this.request(`/nomades/${id}`, { method: "DELETE" });
  }

  async getNomadeWallet(id: string, filters?: Record<string, any>) {
    return this.request(`/nomades/${id}/wallet${this.buildQuery(filters)}`);
  }

  async getNomadeQualifications(id: string) {
    return this.request(`/nomades/${id}/qualifications`);
  }

  async updateNomadeQualification(nomadeId: string, qualId: string, data: any) {
    return this.request(`/nomades/${nomadeId}/qualifications/${qualId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ── Nomade Levels ────────────────────────────────────────────────────────────
  async getNomadeLevels() {
    return this.request("/nomade-levels");
  }

  async getNomadeLevel(id: string) {
    return this.request(`/nomade-levels/${id}`);
  }

  async createNomadeLevel(data: any) {
    return this.request("/nomade-levels", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateNomadeLevel(id: string, data: any) {
    return this.request(`/nomade-levels/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteNomadeLevel(id: string) {
    return this.request(`/nomade-levels/${id}`, { method: "DELETE" });
  }

  // ── Levels (aliases for nomade-levels, used by admin/niveis & use-pricing) ──
  async getLevels(filters?: Record<string, any>) {
    return this.request(`/nomade-levels${this.buildQuery(filters)}`);
  }
  async createLevel(data: any) {
    return this.createNomadeLevel(data);
  }
  async updateLevel(id: string, data: any) {
    return this.updateNomadeLevel(id, data);
  }
  async deleteLevel(id: string) {
    return this.deleteNomadeLevel(id);
  }

  // ── Agencies ─────────────────────────────────────────────────────────────────
  async getAgencies(filters?: Record<string, any>) {
    return this.request(`/agencies${this.buildQuery(filters)}`);
  }

  async getAgency(id: string) {
    return this.request(`/agencies/${id}`);
  }

  async createAgency(data: any) {
    return this.request("/agencies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAgency(id: string, data: any) {
    return this.request(`/agencies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAgency(id: string) {
    return this.request(`/agencies/${id}`, { method: "DELETE" });
  }

  // ── Products ─────────────────────────────────────────────────────────────────
  async getProducts(filters?: Record<string, any>) {
    return this.request(`/products${this.buildQuery(filters)}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, { method: "DELETE" });
  }

  async createProductVariation(productId: string, data: any) {
    return this.request(`/products/${productId}/variations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteProductVariation(productId: string, variationId: string) {
    return this.request(`/products/${productId}/variations/${variationId}`, {
      method: "DELETE",
    });
  }

  async createProductAddon(productId: string, data: any) {
    return this.request(`/products/${productId}/addons`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteProductAddon(productId: string, addonId: string) {
    return this.request(`/products/${productId}/addons/${addonId}`, {
      method: "DELETE",
    });
  }

  // ── Specialties ──────────────────────────────────────────────────────────────
  async getSpecialties(filters?: Record<string, any>) {
    return this.request(`/specialties${this.buildQuery(filters)}`);
  }

  async getSpecialty(id: string) {
    return this.request(`/specialties/${id}`);
  }

  async createSpecialty(data: any) {
    return this.request("/specialties", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSpecialty(id: string, data: any) {
    return this.request(`/specialties/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSpecialty(id: string) {
    return this.request(`/specialties/${id}`, { method: "DELETE" });
  }

  // ── Financial (Withdrawals) ──────────────────────────────────────────────────
  async getWithdrawals(filters?: Record<string, any>) {
    return this.request(`/financial/withdrawals${this.buildQuery(filters)}`);
  }

  async getWithdrawal(id: string) {
    return this.request(`/financial/withdrawals/${id}`);
  }

  async createWithdrawal(data: any) {
    return this.request("/financial/withdrawals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWithdrawal(id: string, data: any) {
    return this.request(`/financial/withdrawals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteWithdrawal(id: string) {
    return this.request(`/financial/withdrawals/${id}`, { method: "DELETE" });
  }

  async getFinancialStats() {
    return this.request("/financial/stats");
  }

  // ── Billing (Invoices) ───────────────────────────────────────────────────────
  async getInvoices(filters?: Record<string, any>) {
    return this.request(`/billing/invoices${this.buildQuery(filters)}`);
  }

  async getInvoice(id: string) {
    return this.request(`/billing/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.request("/billing/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: any) {
    return this.request(`/billing/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`/billing/invoices/${id}`, { method: "DELETE" });
  }

  async getBillingStats() {
    return this.request("/billing/stats");
  }

  // ── Terms ────────────────────────────────────────────────────────────────────
  async getTerms() {
    return this.request("/terms");
  }

  async getTerm(id: string) {
    return this.request(`/terms/${id}`);
  }

  async createTerm(data: any) {
    return this.request("/terms", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTerm(id: string, data: any) {
    return this.request(`/terms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTerm(id: string) {
    return this.request(`/terms/${id}`, { method: "DELETE" });
  }

  async acceptTerm(termId: string) {
    return this.request(`/terms/${termId}/accept`, { method: "POST" });
  }

  async checkTermAccepted(termId: string) {
    return this.request(`/terms/${termId}/accepted`);
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────
  async getConversations() {
    return this.request("/chat/conversations");
  }

  async createConversation(data: any) {
    return this.request("/chat/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMessages(conversationId: string) {
    return this.request(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  // ── Allkademy ────────────────────────────────────────────────────────────────
  async getCourses(filters?: Record<string, any>) {
    return this.request(`/allkademy/courses${this.buildQuery(filters)}`);
  }

  async getCourse(id: string) {
    return this.request(`/allkademy/courses/${id}`);
  }

  async createCourse(data: any) {
    return this.request("/allkademy/courses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCourse(id: string, data: any) {
    return this.request(`/allkademy/courses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCourse(id: string) {
    return this.request(`/allkademy/courses/${id}`, { method: "DELETE" });
  }

  async createCourseModule(courseId: string, data: any) {
    return this.request(`/allkademy/courses/${courseId}/modules`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createLesson(moduleId: string, data: any) {
    return this.request(`/allkademy/modules/${moduleId}/lessons`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async enrollCourse(courseId: string) {
    return this.request(`/allkademy/courses/${courseId}/enroll`, {
      method: "POST",
    });
  }

  async getMyEnrollments() {
    return this.request("/allkademy/enrollments");
  }

  async updateEnrollmentProgress(courseId: string, progress: number) {
    return this.request(`/allkademy/enrollments/${courseId}/progress`, {
      method: "PUT",
      body: JSON.stringify({ progress }),
    });
  }

  // ── Partners ─────────────────────────────────────────────────────────────────
  async getPartners(filters?: Record<string, any>) {
    return this.request(`/partners${this.buildQuery(filters)}`);
  }

  async getPartnerMe() {
    return this.request("/partners/me");
  }

  async getPartner(id: string) {
    return this.request(`/partners/${id}`);
  }

  async createPartner(data: any) {
    return this.request("/partners", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePartner(id: string, data: any) {
    return this.request(`/partners/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getPartnerCommissions(
    partnerId: string,
    filters?: Record<string, any>,
  ) {
    return this.request(
      `/partners/${partnerId}/commissions${this.buildQuery(filters)}`,
    );
  }

  // ── Campaigns ────────────────────────────────────────────────────────────────
  async getCampaigns(filters?: Record<string, any>) {
    return this.request(`/campaigns${this.buildQuery(filters)}`);
  }

  async getCampaign(id: string) {
    return this.request(`/campaigns/${id}`);
  }

  async createCampaign(data: any) {
    return this.request("/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: any) {
    return this.request(`/campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string) {
    return this.request(`/campaigns/${id}`, { method: "DELETE" });
  }

  // ── Coupons (campaigns with type=coupon) ─────────────────────────────────────
  async getCoupons(filters?: Record<string, any>) {
    return this.request(`/campaigns${this.buildQuery({ ...filters, type: "coupon" })}`);
  }
  async createCoupon(data: any) {
    return this.createCampaign({ ...data, type: "coupon" });
  }
  async updateCoupon(id: string, data: any) {
    return this.updateCampaign(id, data);
  }
  async deleteCoupon(id: string) {
    return this.deleteCampaign(id);
  }

  // ── Permissions ──────────────────────────────────────────────────────────────
  async getPermissionProfiles() {
    return this.request("/permissions/profiles");
  }

  async getPermissionProfile(id: string) {
    return this.request(`/permissions/profiles/${id}`);
  }

  async createPermissionProfile(data: any) {
    return this.request("/permissions/profiles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePermissionProfile(id: string, data: any) {
    return this.request(`/permissions/profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePermissionProfile(id: string) {
    return this.request(`/permissions/profiles/${id}`, { method: "DELETE" });
  }

  async updateProfilePermissions(profileId: string, permissions: any[]) {
    return this.request(`/permissions/profiles/${profileId}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    });
  }

  // ── Reports ──────────────────────────────────────────────────────────────────
  async getReportSummary() {
    return this.request("/reports/summary");
  }

  async getReportNomades(filters?: Record<string, any>) {
    return this.request(`/reports/nomades${this.buildQuery(filters)}`);
  }

  async getReportFinancial() {
    return this.request("/reports/financial");
  }
}

// Toggle: quando VITE_USE_MOCKS=true, usa dados locais em memória (pasta dev-mocks/).
// Em produção (build pro cPanel) essa variável não existe → usa API real.
// O Vite faz tree-shake e NÃO inclui os mocks no bundle de produção.
function createClient() {
  if (import.meta.env.VITE_USE_MOCKS === "true") {
    console.info("[Allka] 🟡 Usando MOCK API Client (dados locais em memória)");
    return mockApiClient;
  }
  console.info("[Allka] 🟢 Usando API REAL:", API_BASE_URL);
  return new ApiClient();
}

export const apiClient = createClient() as ApiClient;
