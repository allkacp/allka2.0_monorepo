import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export function useFinancial() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wRes, sRes]: any[] = await Promise.all([
        apiClient.getWithdrawals({ limit: "1000" }),
        apiClient.getFinancialStats(),
      ])
      setWithdrawals(wRes.data || [])
      setTotal(wRes.total || 0)
      setStats(sRes)
    } catch (err: any) {
      console.error("[useFinancial] API error:", err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWithdrawals() }, [fetchWithdrawals])

  const createWithdrawal = useCallback(async (data: any) => {
    const result: any = await apiClient.createWithdrawal(data)
    await fetchWithdrawals()
    return result
  }, [fetchWithdrawals])

  const updateWithdrawal = useCallback(async (id: string, data: any) => {
    const result: any = await apiClient.updateWithdrawal(id, data)
    await fetchWithdrawals()
    return result
  }, [fetchWithdrawals])

  const deleteWithdrawal = useCallback(async (id: string) => {
    await apiClient.deleteWithdrawal(id)
    await fetchWithdrawals()
  }, [fetchWithdrawals])

  return { withdrawals, stats, total, loading, error, refetch: fetchWithdrawals, createWithdrawal, updateWithdrawal, deleteWithdrawal }
}
