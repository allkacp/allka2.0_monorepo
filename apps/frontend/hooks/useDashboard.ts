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

  // ── Blocos que GET /api/dashboard/stats tambem devolve ────────────────────
  // O tipo acima descrevia so a primeira metade da resposta; a rota manda
  // mais 15 blocos que os dashboards leem. Como os arquivos de dashboard
  // tinham `@ts-nocheck`, o descompasso nunca apareceu — ao remover o
  // supressor, viraram 13 erros de "propriedade nao existe".
  //
  // Todos opcionais porque a resposta varia com o escopo de quem chama.
  revenue?: { total: number; growth?: number; creditPlan?: number; recurring?: number; oneTime?: number; projected?: number }
  mrr?: { total: number; growth?: number; trendData?: number[] }
  churn?: { inactiveAccounts?: number; cancelledProjects?: number; revenueChurn?: number; revenueChurnRate?: number }
  averageTicket?: { general?: number; perProject?: number; trendData?: number[] }
  ltv?: { value: number }
  activeProjects?: { total: number; growth?: number }
  accountsReceivable?: { total: number; received: number }
  nomads?: { total: number; active: number; newInPeriod?: number; growth?: number }
  statusOverview?: { active?: number; trial?: number; suspended?: number; cancelled?: number; total?: number }
  creditPlans?: Record<string, unknown>
  platformActivities?: { actionsExecuted?: number }
  despesasOperacionais?: unknown
  despesasPorCategoria?: unknown
  /**
   * Hoje a rota devolve APENAS `activePartners`. O dashboard do parceiro le
   * `invitesSent`, `accepted` e `mrrGenerated` — que nao vem da API e caem no
   * `?? 0`, ou seja, aparecem zerados. Declarados como opcionais para
   * registrar a lacuna em vez de escondê-la.
   */
  partnerProgram?: {
    activePartners?: number
    total?: number
    invitesSent?: number
    accepted?: number
    mrrGenerated?: number
    diamond?: number
    platinum?: number
    gold?: number
    silver?: number
  }
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
