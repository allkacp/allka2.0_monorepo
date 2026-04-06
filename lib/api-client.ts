// Allka MVP - API Client utility functions

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Auth methods
  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async logout() {
    return this.request("/auth/logout", { method: "POST" })
  }

  async getCurrentUser() {
    return this.request("/auth/me")
  }

  // Clients methods
  async getClients() {
    return this.request("/clients")
  }

  async getClient(id: number) {
    return this.request(`/clients/${id}`)
  }

  async createClient(data: any) {
    return this.request("/clients", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateClient(id: number, data: any) {
    return this.request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteClient(id: number) {
    return this.request(`/clients/${id}`, { method: "DELETE" })
  }

  // Projects methods
  async getProjects(filters?: Record<string, any>) {
    const params = filters ? `?${new URLSearchParams(filters)}` : ""
    return this.request(`/projects${params}`)
  }

  async getProject(id: number) {
    return this.request(`/projects/${id}`)
  }

  async createProject(data: any) {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateProject(id: number, data: any) {
    return this.request(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteProject(id: number) {
    return this.request(`/projects/${id}`, { method: "DELETE" })
  }

  async getProjectTasks(projectId: number) {
    return this.request(`/projects/${projectId}/tasks`)
  }

  // Tasks methods
  async getTasks(filters?: Record<string, any>) {
    const params = filters ? `?${new URLSearchParams(filters)}` : ""
    return this.request(`/tasks${params}`)
  }

  async getTask(id: number) {
    return this.request(`/tasks/${id}`)
  }

  async createTask(data: any) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateTask(id: number, data: any) {
    return this.request(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteTask(id: number) {
    return this.request(`/tasks/${id}`, { method: "DELETE" })
  }

  async updateTaskStatus(id: number, status: string) {
    return this.request(`/tasks/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    })
  }

  // Dashboard methods
  async getDashboardStats() {
    return this.request("/dashboard/stats")
  }

  async getRecentActivities() {
    return this.request("/dashboard/recent-activities")
  }

  async getMyTasks() {
    return this.request("/dashboard/my-tasks")
  }
}

export const apiClient = new ApiClient()
