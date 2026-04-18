import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export function useReports() {
  const [summary, setSummary] = useState<any>(null)
  const [financial, setFinancial] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, financialRes]: any[] = await Promise.all([
        apiClient.getReportSummary(),
        apiClient.getReportFinancial(),
      ])
      setSummary(summaryRes)
      setFinancial(financialRes)
    } catch (err: any) {
      console.error("[useReports] API error:", err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  return { summary, financial, loading, error, refetch: fetchReports }
}
