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
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    this.setToken(result.token);
    return result;
  }

  async logout() {
    return this.request("/auth/logout", { method: "POST" });
  }

  async getCurrentUser() {
    return this.request("/auth/me");
  }

  // Clients methods
  async getClients() {
    return this.request("/clients");
  }

  async getClient(id: number) {
    return this.request(`/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: number, data: any) {
    return this.request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: number) {
    return this.request(`/clients/${id}`, { method: "DELETE" });
  }

  // Projects methods
  async getProjects(filters?: Record<string, any>) {
    const params = filters ? `?${new URLSearchParams(filters)}` : "";
    return this.request(`/projects${params}`);
  }

  async getProject(id: number) {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: any) {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: number, data: any) {
    return this.request(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: number) {
    return this.request(`/projects/${id}`, { method: "DELETE" });
  }

  async getProjectTasks(projectId: number) {
    return this.request(`/projects/${projectId}/tasks`);
  }

  // Tasks methods
  async getTasks(filters?: Record<string, any>) {
    const params = filters ? `?${new URLSearchParams(filters)}` : "";
    return this.request(`/tasks${params}`);
  }

  async getTask(id: number) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: any) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: number, data: any) {
    return this.request(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: number) {
    return this.request(`/tasks/${id}`, { method: "DELETE" });
  }

  async updateTaskStatus(id: number, status: string) {
    return this.request(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // Dashboard methods
  async getDashboardStats() {
    return this.request("/dashboard/stats");
  }

  async getRecentActivities() {
    return this.request("/dashboard/recent-activities");
  }

  async getMyTasks() {
    return this.request("/dashboard/my-tasks");
  }

  // Users methods
  async getUsers(filters?: Record<string, any>) {
    const params = filters ? `?${new URLSearchParams(filters)}` : "";
    return this.request(`/users${params}`);
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

  // Companies methods
  async getCompanies(filters?: Record<string, any>) {
    const params = filters ? `?${new URLSearchParams(filters)}` : "";
    return this.request(`/clients${params}`);
  }

  async getCompany(id: string) {
    return this.request(`/clients/${id}`);
  }

  async createCompany(data: any) {
    return this.request("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: any) {
    return this.request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: string) {
    return this.request(`/clients/${id}`, { method: "DELETE" });
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
  return new ApiClient();
}

export const apiClient = createClient();
