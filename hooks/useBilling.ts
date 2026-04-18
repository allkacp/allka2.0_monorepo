import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export function useBilling(filters?: Record<string, any>) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [iRes, sRes]: any[] = await Promise.all([
        apiClient.getInvoices(filters),
        apiClient.getBillingStats(),
      ])
      setInvoices(iRes.data || [])
      setTotal(iRes.total || 0)
      setStats(sRes)
    } catch (err: any) {
      console.error("[useBilling] API error:", err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const createInvoice = useCallback(async (data: any) => {
    const result: any = await apiClient.createInvoice(data)
    await fetchInvoices()
    return result
  }, [fetchInvoices])

  const updateInvoice = useCallback(async (id: string, data: any) => {
    const result: any = await apiClient.updateInvoice(id, data)
    await fetchInvoices()
    return result
  }, [fetchInvoices])

  const deleteInvoice = useCallback(async (id: string) => {
    await apiClient.deleteInvoice(id)
    await fetchInvoices()
  }, [fetchInvoices])

  return { invoices, stats, total, loading, error, refetch: fetchInvoices, createInvoice, updateInvoice, deleteInvoice }
}
