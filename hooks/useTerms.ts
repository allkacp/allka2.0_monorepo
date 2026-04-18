import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export function useTerms() {
  const [terms, setTerms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTerms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response: any = await apiClient.getTerms()
      setTerms(Array.isArray(response) ? response : response.data || [])
    } catch (err: any) {
      console.error("[useTerms] API error:", err.message)
      setError(err.message)
      setTerms([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTerms() }, [fetchTerms])

  const createTerm = useCallback(async (data: any) => {
    const result: any = await apiClient.createTerm(data)
    await fetchTerms()
    return result
  }, [fetchTerms])

  const updateTerm = useCallback(async (id: string, data: any) => {
    const result: any = await apiClient.updateTerm(id, data)
    await fetchTerms()
    return result
  }, [fetchTerms])

  const deleteTerm = useCallback(async (id: string) => {
    await apiClient.deleteTerm(id)
    await fetchTerms()
  }, [fetchTerms])

  const acceptTerm = useCallback(async (termId: string) => {
    const result: any = await apiClient.acceptTerm(termId)
    await fetchTerms()
    return result
  }, [fetchTerms])

  return { terms, loading, error, refetch: fetchTerms, createTerm, updateTerm, deleteTerm, acceptTerm }
}
