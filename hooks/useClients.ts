import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export interface ApiClient {
  id: string
  name: string
  email: string
  phone?: string | null
  created_at: string
  updated_at?: string
}

interface UseClientsReturn {
  clients: ApiClient[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<ApiClient[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response: any = await apiClient.getClients()
      const data = Array.isArray(response) ? response : response.data || []
      setClients(data)
      setTotal(Array.isArray(response) ? data.length : response.total || data.length)
    } catch (err: any) {
      console.error("[useClients] API error:", err.message)
      setError(err.message)
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return { clients, total, loading, error, refetch: fetchClients }
}
