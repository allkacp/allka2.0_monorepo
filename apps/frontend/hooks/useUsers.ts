import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"

export interface ApiUser {
  id: string
  email: string
  name: string
  role: string
  account_type: string
  is_active: boolean
  avatar: string | null
  phone: string | null
  created_at: string
  updated_at: string
  // Presentes só quando buscado via admin (ver UseUsersOptions.admin abaixo)
  last_login?: string | null
  company_id?: string | null
  agency_id?: string | null
  agency_name?: string | null
  company_name?: string | null
  partner_profile_id?: string | null
  partner_name?: string | null
  nomad_id?: string | null
  nomad_name?: string | null
  leader_areas?: string[]
  has_profile_link?: boolean | null
  profile_link_type?: string | null
  profile_link_name?: string | null
  profile_link_status?: string | null
}

interface UseUsersOptions {
  search?: string
  limit?: number
  /** Usa GET /api/admin/users (admin-only, com vínculo enriquecido) em vez de GET /api/users. */
  admin?: boolean
  role?: string
  account_type?: string
  /** true → só ativos, false → só inativos, undefined → todos. Enviado como query param real pro backend. */
  is_active?: boolean
}

interface UseUsersReturn {
  users: ApiUser[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
  createUser: (data: { email: string; password: string; name: string; role?: string; account_type?: string; phone?: string }) => Promise<ApiUser>
  updateUser: (id: string, data: Partial<{ email: string; name: string; role: string; account_type: string; is_active: boolean; phone: string; password: string }>) => Promise<ApiUser>
  deleteUser: (id: string) => Promise<void>
}

export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const { search, limit = 1000, admin = false, role, account_type, is_active } = options
  const [users, setUsers] = useState<ApiUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: Record<string, string> = { limit: String(limit) }
      if (search) filters.search = search
      if (role) filters.role = role
      if (account_type) filters.account_type = account_type
      if (is_active !== undefined) filters.is_active = String(is_active)
      const response: any = admin
        ? await apiClient.getAdminUsers(filters)
        : await apiClient.getUsers(filters)
      setUsers(response.data || [])
      setTotal(response.total || 0)
    } catch (err: any) {
      console.error("[useUsers] API error:", err.message)
      setError(err.message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [search, limit, admin, role, account_type, is_active])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const createUser = useCallback(async (data: { email: string; password: string; name: string; role?: string; account_type?: string; phone?: string }) => {
    const result: any = await apiClient.createUser(data)
    await fetchUsers()
    return result
  }, [fetchUsers])

  const updateUser = useCallback(async (id: string, data: any) => {
    const result: any = await apiClient.updateUser(id, data)
    await fetchUsers()
    return result
  }, [fetchUsers])

  const deleteUser = useCallback(async (id: string) => {
    await apiClient.deleteUser(id)
    await fetchUsers()
  }, [fetchUsers])

  return { users, total, loading, error, refetch: fetchUsers, createUser, updateUser, deleteUser }
}
