// API client for Allka platform
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api-dev.allka.com.vc/api"

export interface User {
  id: number
  name: string
  email: string
  role: "admin" | "manager" | "user"
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  name: string
  email: string
  phone?: string
  company?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  name: string
  description?: string
  client_id: number
  manager_id: number
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"
  start_date?: string
  end_date?: string
  budget?: number
  created_at: string
  updated_at: string
  client?: Client
  manager?: User
}

export interface Task {
  id: number
  title: string
  description?: string
  project_id: number
  assigned_to?: number
  status: "todo" | "in_progress" | "review" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string
  created_at: string
  updated_at: string
  assignee?: User
}

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Projects API
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>("/projects")
  }

  async getProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}`)
  }

  async createProject(project: Omit<Project, "id" | "created_at" | "updated_at">): Promise<Project> {
    return this.request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    })
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(project),
    })
  }

  async deleteProject(id: number): Promise<void> {
    return this.request<void>(`/projects/${id}`, {
      method: "DELETE",
    })
  }

  // Tasks API
  async getProjectTasks(projectId: number): Promise<Task[]> {
    return this.request<Task[]>(`/projects/${projectId}/tasks`)
  }

  async createTask(task: Omit<Task, "id" | "created_at" | "updated_at">): Promise<Task> {
    return this.request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    })
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(task),
    })
  }

  // Clients API
  async getClients(): Promise<Client[]> {
    return this.request<Client[]>("/clients")
  }

  // Users API
  async getUsers(): Promise<User[]> {
    return this.request<User[]>("/users")
  }
}

export const apiClient = new ApiClient()
