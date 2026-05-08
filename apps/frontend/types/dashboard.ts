export interface DashboardWidget {
  id: string
  type: "stats" | "chart" | "table" | "activity" | "progress" | "metric"
  title: string
  position: { x: number; y: number; width: number; height: number }
  config: Record<string, any>
  visible: boolean
  account_types: string[]
  account_levels?: string[]
  created_at: string
  updated_at: string
}

export interface DashboardLayout {
  id: string
  account_type: string
  account_level?: string
  widgets: DashboardWidget[]
  is_default: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface WidgetData {
  id: string
  data: any
  last_updated: string
  cache_duration: number
}

export interface DashboardStats {
  total_users: number
  total_projects: number
  total_revenue: number
  active_tasks: number
  completion_rate: number
  growth_metrics: {
    users: number
    projects: number
    revenue: number
  }
}

export interface SavedDashboard {
  id: string
  name: string
  widgets: any[]
  createdAt: string
  updatedAt?: string
  isGlobal?: boolean
  sharedWith?: string[] // Array of professional IDs
  createdBy?: string
}
