import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import type {
  User,
  Permission,
  CompanyAssociation,
  CompanyLink,
  CompanyPermissions,
  ProjectMembership,
} from "@/types/user"
import { DEFAULT_COMPANY_PERMISSIONS, ADMIN_COMPANY_PERMISSIONS, MOCK_COMPANY_PROJECTS } from "@/types/user"

// Backward-compatible export — starts empty, populated from API at runtime
export let MOCK_COMPANIES: { id: number; name: string; document?: string; lgpd?: any }[] = []

interface PlatformUsersContextValue {
  users: User[]
  addUser: (user: User) => void
  updateUser: (id: number, updates: Partial<User>) => void
  updateUserPlatformPermissions: (id: number, permissions: Permission[]) => void
  getUserById: (id: number) => User | undefined
  addCompanyLink: (userId: number, assoc: CompanyAssociation) => void
  removeCompanyLink: (userId: number, companyId: number) => void
  updateCompanyLink: (userId: number, companyId: number, updates: Partial<CompanyAssociation>) => void
  upsertProjectMembership: (userId: number, companyId: number, membership: ProjectMembership) => void
  removeProjectMembership: (userId: number, companyId: number, projectId: number) => void
}

const PlatformUsersContext = createContext<PlatformUsersContextValue | null>(null)

export function PlatformUsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([])

  // Load users and companies from API
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [usersRes, companiesRes] = await Promise.allSettled([
          apiClient.getUsers({ limit: "500" }),
          apiClient.getCompanies({ limit: "500" }),
        ])
        if (cancelled) return
        if (usersRes.status === "fulfilled") {
          const data: any = usersRes.value
          const list = data.data || (Array.isArray(data) ? data : [])
          setUsers(list)
        }
        if (companiesRes.status === "fulfilled") {
          const data: any = companiesRes.value
          const list = data.data || (Array.isArray(data) ? data : [])
          // Update the exported MOCK_COMPANIES array in-place for backward compatibility
          MOCK_COMPANIES.length = 0
          list.forEach((c: any) => MOCK_COMPANIES.push({
            id: Number(c.id),
            name: c.name || "",
            document: c.document || "",
          }))
        }
      } catch (err) {
        console.error("[PlatformUsersProvider] Failed to load:", err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const addUser = useCallback((user: User) => {
    setUsers((prev) => [user, ...prev])
  }, [])

  const updateUser = useCallback((id: number, updates: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)))
  }, [])

  const updateUserPlatformPermissions = useCallback((id: number, permissions: Permission[]) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, permissions, updated_at: new Date().toISOString().split("T")[0] } : u
      )
    )
  }, [])

  const getUserById = useCallback(
    (id: number) => users.find((u) => u.id === id),
    [users]
  )

  const addCompanyLink = useCallback((userId: number, assoc: CompanyAssociation) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u
        const existing = u.company_associations || []
        if (existing.some((a) => a.company_id === assoc.company_id)) return u
        return { ...u, company_associations: [...existing, assoc] }
      })
    )
  }, [])

  const removeCompanyLink = useCallback((userId: number, companyId: number) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u
        return {
          ...u,
          company_associations: (u.company_associations || []).filter(
            (a) => a.company_id !== companyId
          ),
        }
      })
    )
  }, [])

  const updateCompanyLink = useCallback(
    (userId: number, companyId: number, updates: Partial<CompanyAssociation>) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u
          return {
            ...u,
            company_associations: (u.company_associations || []).map((a) =>
              a.company_id === companyId ? { ...a, ...updates } : a
            ),
          }
        })
      )
    },
    []
  )

  const upsertProjectMembership = useCallback(
    (userId: number, companyId: number, membership: ProjectMembership) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u
          return {
            ...u,
            company_associations: (u.company_associations || []).map((a) => {
              if (a.company_id !== companyId) return a
              const others = (a.project_memberships || []).filter(
                (m) => m.project_id !== membership.project_id
              )
              return { ...a, project_memberships: [...others, membership] }
            }),
          }
        })
      )
    },
    []
  )

  const removeProjectMembership = useCallback(
    (userId: number, companyId: number, projectId: number) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u
          return {
            ...u,
            company_associations: (u.company_associations || []).map((a) => {
              if (a.company_id !== companyId) return a
              return {
                ...a,
                project_memberships: (a.project_memberships || []).filter(
                  (m) => m.project_id !== projectId
                ),
              }
            }),
          }
        })
      )
    },
    []
  )

  return (
    <PlatformUsersContext.Provider
      value={{
        users,
        addUser,
        updateUser,
        updateUserPlatformPermissions,
        getUserById,
        addCompanyLink,
        removeCompanyLink,
        updateCompanyLink,
        upsertProjectMembership,
        removeProjectMembership,
      }}
    >
      {children}
    </PlatformUsersContext.Provider>
  )
}

export function usePlatformUsers() {
  const ctx = useContext(PlatformUsersContext)
  if (!ctx) throw new Error("usePlatformUsers must be used inside PlatformUsersProvider")
  return ctx
}
