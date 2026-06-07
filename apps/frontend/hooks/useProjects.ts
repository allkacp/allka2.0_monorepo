import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api-client"
import { adaptApiProject, type FrontendProject } from "@/lib/project-adapter"

interface UseProjectsOptions {
  companyId?: string | number
  agencyName?: string
}

interface UseProjectsReturn {
  projects: FrontendProject[]
  loading: boolean
  error: string | null
  refetch: () => void
  setProjects: React.Dispatch<React.SetStateAction<FrontendProject[]>>
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { companyId, agencyName } = options
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
      const sorted = [...adapted].sort((left, right) => {
        const leftTime = new Date(left.createdAt || left.createdDate || 0).getTime()
        const rightTime = new Date(right.createdAt || right.createdDate || 0).getTime()
        return rightTime - leftTime
      })
      const scoped = agencyName
        ? sorted.filter((project) => {
            const normalizedProjectAgency = (project.agency || "")
              .trim()
              .toLowerCase()
            const normalizedAgencyName = agencyName.trim().toLowerCase()
            return (
              normalizedProjectAgency === normalizedAgencyName ||
              normalizedProjectAgency.includes(normalizedAgencyName) ||
              normalizedAgencyName.includes(normalizedProjectAgency)
            )
          })
        : sorted
      setProjects(scoped)
    } catch (err: any) {
      console.error("[useProjects] API error:", err.message)
      setError(err.message)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [companyId, agencyName])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { projects, loading, error, refetch: fetchProjects, setProjects }
}
