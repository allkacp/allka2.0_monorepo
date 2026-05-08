import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { adaptApiProject, type FrontendProject } from "@/lib/project-adapter"

interface UseProjectsOptions {
  companyId?: string | number
}

interface UseProjectsReturn {
  projects: FrontendProject[]
  loading: boolean
  error: string | null
  refetch: () => void
  setProjects: React.Dispatch<React.SetStateAction<FrontendProject[]>>
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { companyId } = options
  const [projects, setProjects] = useState<FrontendProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: Record<string, string> = {}
      if (companyId) filters.client_id = String(companyId)
      // Request a large page to get all projects (pagination handled in frontend)
      filters.limit = "1000"

      const response: any = await apiClient.getProjects(filters)
      const adapted = (response.data || []).map(adaptApiProject)
      setProjects(adapted)
    } catch (err: any) {
      console.error("[useProjects] API error:", err.message)
      setError(err.message)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { projects, loading, error, refetch: fetchProjects, setProjects }
}
