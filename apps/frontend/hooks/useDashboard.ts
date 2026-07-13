import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export interface DashboardStats {
  companies: { total: number }
  projects: { total: number; active: number; inactive: number; byStatus?: Record<string, number> }
  nomades: { total: number; active: number }
  tasks: { total: number; pending: number; approved: number; completionRate: number }
  financial: { totalRevenue: number; paidInvoices: number; totalInvoices: number; pendingWithdrawals: number; totalWithdrawals: number }
  payments?: { pendingCount: number; pendingAmount: number; paidCount: number; paidAmount: number }
  projectProducts?: { total: number }
  users?: { total: number; active?: number }
  agencies?: { total: number }
  partners?: { total: number }
  catalogProducts?: { total: number }
}

export interface RecentActivity {
  type: string
  id: string
  project_code?: string
  title: string
  subtitle: string | null
  creator?: string | null
  status: string
  date: string
}

interface UseDashboardReturn {
  stats: DashboardStats | null
  activities: RecentActivity[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, activitiesRes]: any = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getRecentActivities(),
      ])
      setStats(statsRes)
      setActivities(activitiesRes || [])
    } catch (err: any) {
      console.error("[useDashboard] API error:", err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { stats, activities, loading, error, refetch: fetchDashboard }
}
