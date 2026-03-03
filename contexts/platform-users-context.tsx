import React, { createContext, useContext, useState, useCallback } from "react"
import type {
  User,
  Permission,
  CompanyAssociation,
  CompanyLink,
  CompanyPermissions,
  ProjectMembership,
} from "@/types/user"
import { DEFAULT_COMPANY_PERMISSIONS, ADMIN_COMPANY_PERMISSIONS, MOCK_COMPANY_PROJECTS } from "@/types/user"

// Searchable companies for linking users — mirrors mockCompanies in app/admin/empresas/page.tsx
export const MOCK_COMPANIES = [
  { id: 1,  name: "Coca-Cola Brasil",       document: "12.345.678/0001-90" },
  { id: 2,  name: "Starbucks Coffee",        document: "98.765.432/0001-10" },
  { id: 3,  name: "Fundação Wikimedia",      document: "23.456.789/0001-01" },
  { id: 4,  name: "Agência Criativa Hub",    document: "34.567.890/0001-22" },
  { id: 5,  name: "Nomade Freelancer Co",    document: "45.678.901/0001-33" },
  { id: 6,  name: "Notion Workspace",        document: "56.789.012/0001-44" },
  { id: 7,  name: "Studio Mídias Sociais",   document: "67.890.123/0001-55" },
  { id: 8,  name: "Spotify Brasil",          document: "78.901.234/0001-66" },
  { id: 9,  name: "FreelanceFlow",           document: "89.012.345/0001-77" },
  { id: 10, name: "Meta Business",           document: "90.123.456/0001-88" },
  { id: 11, name: "Pixel & Cia Design",      document: "01.234.567/0001-99" },
  { id: 12, name: "Nômade Criativo 360",     document: "11.222.333/0001-44" },
  { id: 13, name: "Google Brasil",           document: "22.333.444/0001-55" },
  { id: 14, name: "MarcaForte Agência",      document: "33.444.555/0001-66" },
  { id: 15, name: "Slack do Brasil",         document: "44.555.666/0001-77" },
  { id: 16, name: "Minha Startup SaaS",      document: "55.666.777/0001-88" },
  { id: 17, name: "Conecta Agências",        document: "66.777.888/0001-99" },
]

let assocIdCounter = 100

function makeAdminAssoc(
  companyId: number,
  companyName: string,
  userId: number,
  projectMemberships: ProjectMembership[] = []
): CompanyAssociation {
  return {
    id: assocIdCounter++,
    user_id: userId,
    company_id: companyId,
    company_name: companyName,
    role: "company_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    company_permissions: { ...ADMIN_COMPANY_PERMISSIONS },
    project_memberships: projectMemberships,
    is_active: true,
    joined_at: "2023-06-15",
  }
}

function makeUserAssoc(
  companyId: number,
  companyName: string,
  userId: number,
  projectMemberships: ProjectMembership[] = []
): CompanyAssociation {
  return {
    id: assocIdCounter++,
    user_id: userId,
    company_id: companyId,
    company_name: companyName,
    role: "company_user",
    permissions: ["view_projects"],
    company_permissions: { ...DEFAULT_COMPANY_PERMISSIONS },
    project_memberships: projectMemberships,
    is_active: true,
    joined_at: "2023-09-05",
  }
}

// Initial mock data shared with admin/usuarios page
const initialMockUsers: User[] = [
  {
    id: 1,
    email: "carlos.silva@techcorp.com",
    name: "Carlos Silva",
    phone: "+55 11 98765-4321",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    is_admin: true,
    is_active: true,
    created_at: "2023-06-15",
    updated_at: "2024-01-20",
    online_status: "online",
    last_login: "2024-01-22T14:30:00",
    company_associations: [
      makeAdminAssoc(1, "Coca-Cola Brasil", 1, [
        { project_id: 101, project_name: "Campanha Verão", permissions: ["admin"] },
        { project_id: 102, project_name: "Rebranding 2024", permissions: ["view", "edit", "approve_deliveries"] },
      ]),
    ],
  },
  {
    id: 2,
    email: "ana.santos@allka.com",
    name: "Ana Santos",
    phone: "+55 21 99876-5432",
    account_type: "nomades",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2023-07-01",
    updated_at: "2024-01-15",
    online_status: "offline",
    last_login: "2024-01-21T09:15:00",
  },
  {
    id: 3,
    email: "joao.costa@partner.com",
    name: "João Costa",
    phone: "+55 11 97654-3210",
    account_type: "agencias",
    account_sub_type: null,
    agency_id: 1,
    role: "agency_admin",
    permissions: ["view_projects", "create_projects"],
    is_admin: false,
    is_active: false,
    created_at: "2023-08-10",
    updated_at: "2024-01-10",
    online_status: "offline",
    last_login: "2024-01-10T16:45:00",
  },
  {
    id: 4,
    email: "maria.oliveira@empresa.com",
    name: "Maria Oliveira",
    phone: "+55 85 98123-4567",
    account_type: "empresas",
    account_sub_type: "company",
    company_id: 2,
    role: "company_user",
    permissions: ["view_projects", "view_catalog"],
    is_admin: false,
    is_active: true,
    created_at: "2023-09-05",
    updated_at: "2024-01-18",
    online_status: "busy",
    last_login: "2024-01-22T11:20:00",
    company_associations: [
      makeUserAssoc(2, "Starbucks Coffee", 4, [
        { project_id: 201, project_name: "Produto Lançamento", permissions: ["view", "create_tasks"] },
      ]),
    ],
  },
  {
    id: 5,
    email: "pedro.santos@allka.com",
    name: "Pedro Santos",
    phone: "+55 11 96543-2109",
    account_type: "nomades",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2023-10-12",
    updated_at: "2024-01-22",
    online_status: "away",
    last_login: "2024-01-22T08:00:00",
  },
  {
    id: 6,
    email: "lucas.ferreira@techcorp.com",
    name: "Lucas Ferreira",
    phone: "+55 31 99999-8888",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_user",
    permissions: ["view_projects", "view_catalog"],
    is_admin: false,
    is_active: true,
    created_at: "2023-11-03",
    updated_at: "2024-01-21",
    online_status: "online",
    last_login: "2024-01-22T13:45:00",
    company_associations: [
      makeUserAssoc(1, "Coca-Cola Brasil", 6, [
        { project_id: 101, project_name: "Campanha Verão", permissions: ["view", "edit"] },
        { project_id: 103, project_name: "Social Media Q1", permissions: ["view"] },
      ]),
    ],
  },
  {
    id: 7,
    email: "juliana.rocha@allka.com",
    name: "Juliana Rocha",
    phone: "+55 47 97777-6666",
    account_type: "nomades",
    account_sub_type: null,
    role: "nomad",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: false,
    created_at: "2023-12-01",
    updated_at: "2024-01-15",
    online_status: "offline",
    last_login: "2024-01-19T10:30:00",
  },
  {
    id: 8,
    email: "rafael.souza@partner.com",
    name: "Rafael Souza",
    phone: "+55 62 98765-4321",
    account_type: "agencias",
    account_sub_type: null,
    agency_id: 2,
    role: "agency_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-05",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T15:20:00",
  },
  {
    id: 9,
    email: "camila.silva@empresa.com",
    name: "Camila Silva",
    phone: "+55 75 96543-2109",
    account_type: "empresas",
    account_sub_type: "company",
    company_id: 3,
    role: "company_user",
    permissions: ["view_projects"],
    is_admin: false,
    is_active: true,
    created_at: "2024-01-08",
    updated_at: "2024-01-22",
    online_status: "busy",
    last_login: "2024-01-22T12:00:00",
    company_associations: [
      makeUserAssoc(3, "Fundação Wikimedia", 9, [
        { project_id: 301, project_name: "Identidade Visual", permissions: ["view"] },
      ]),
    ],
  },
  {
    id: 10,
    email: "diego.costa@techcorp.com",
    name: "Diego Costa",
    phone: "+55 11 95432-1098",
    account_type: "empresas",
    account_sub_type: "in-house",
    company_id: 1,
    role: "company_admin",
    permissions: ["view_projects", "create_projects", "manage_users"],
    is_admin: true,
    is_active: true,
    created_at: "2024-01-10",
    updated_at: "2024-01-22",
    online_status: "online",
    last_login: "2024-01-22T16:30:00",
    company_associations: [
      makeAdminAssoc(1, "Coca-Cola Brasil", 10, [
        { project_id: 101, project_name: "Campanha Verão", permissions: ["admin"] },
        { project_id: 102, project_name: "Rebranding 2024", permissions: ["admin"] },
        { project_id: 103, project_name: "Social Media Q1", permissions: ["admin"] },
      ]),
      makeUserAssoc(4, "Agência Criativa Hub", 10, []),
    ],
  },
]

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
  const [users, setUsers] = useState<User[]>(initialMockUsers)

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
