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
}

interface UseUsersOptions {
  search?: string
  limit?: number
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
  const { search, limit = 1000 } = options
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
      const response: any = await apiClient.getUsers(filters)
      setUsers(response.data || [])
      setTotal(response.total || 0)
    } catch (err: any) {
      console.error("[useUsers] API error:", err.message)
      setError(err.message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [search, limit])

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
