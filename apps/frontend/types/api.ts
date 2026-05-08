// Allka MVP - TypeScript Types for API

export interface User {
  id: number
  email: string
  name: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: number
  name: string
  email?: string
  phone?: string
  company?: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  name: string
  description?: string
  client_id: number
  created_by: number
  status: "active" | "completed" | "paused" | "cancelled"
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
  client?: Client // Populated when needed
}

export interface Task {
  id: number
  title: string
  description?: string
  project_id: number
  assigned_to?: number
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string
  created_by: number
  created_at: string
  updated_at: string
  project?: Project // Populated when needed
  assigned_user?: User // Populated when needed
}

export interface DashboardStats {
  total_projects: number
  active_projects: number
  total_tasks: number
  pending_tasks: number
  completed_tasks: number
  total_clients: number
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// Request types
export interface CreateClientRequest {
  name: string
  email?: string
  phone?: string
  company?: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  client_id: number
  start_date?: string
  end_date?: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  project_id: number
  assigned_to?: number
  priority?: "low" | "medium" | "high" | "urgent"
  due_date?: string
}
