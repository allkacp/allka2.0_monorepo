import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export function usePartners(filters?: Record<string, any>) {
  const [partners, setPartners] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPartners = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response: any = await apiClient.getPartners(filters)
      setPartners(response.data || [])
      setTotal(response.total || 0)
    } catch (err: any) {
      console.error("[usePartners] API error:", err.message)
      setError(err.message)
      setPartners([])
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => { fetchPartners() }, [fetchPartners])

  const createPartner = useCallback(async (data: any) => {
    const result: any = await apiClient.createPartner(data)
    await fetchPartners()
    return result
  }, [fetchPartners])

  const updatePartner = useCallback(async (id: string, data: any) => {
    const result: any = await apiClient.updatePartner(id, data)
    await fetchPartners()
    return result
  }, [fetchPartners])

  return { partners, total, loading, error, refetch: fetchPartners, createPartner, updatePartner }
}
