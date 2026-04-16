import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export interface ApiCompany {
  id: string
  name: string
  cnpj: string | null
  email: string | null
  phone: string | null
  status: string
  segment: string | null
  address: string | null
  description: string | null
  logo: string | null
  website: string | null
  created_at: string
  updated_at: string
}

interface UseCompaniesReturn {
  companies: ApiCompany[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
  createCompany: (data: { name: string; cnpj?: string; email?: string; phone?: string; status?: string; segment?: string; address?: string; description?: string; website?: string }) => Promise<ApiCompany>
  updateCompany: (id: string, data: Partial<ApiCompany>) => Promise<ApiCompany>
  deleteCompany: (id: string) => Promise<void>
}

export function useCompanies(): UseCompaniesReturn {
  const [companies, setCompanies] = useState<ApiCompany[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response: any = await apiClient.getCompanies({ limit: "1000" })
      setCompanies(response.data || [])
      setTotal(response.total || 0)
    } catch (err: any) {
      console.error("[useCompanies] API error:", err.message)
      setError(err.message)
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const createCompany = useCallback(async (data: any) => {
    const result: any = await apiClient.createCompany(data)
    await fetchCompanies()
    return result
  }, [fetchCompanies])

  const updateCompany = useCallback(async (id: string, data: any) => {
    const result: any = await apiClient.updateCompany(id, data)
    await fetchCompanies()
    return result
  }, [fetchCompanies])

  const deleteCompany = useCallback(async (id: string) => {
    await apiClient.deleteCompany(id)
    await fetchCompanies()
  }, [fetchCompanies])

  return { companies, total, loading, error, refetch: fetchCompanies, createCompany, updateCompany, deleteCompany }
}
