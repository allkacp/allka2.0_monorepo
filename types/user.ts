export interface User {
  id: number
  email: string
  name: string
  phone?: string
  account_type: AccountType
  account_sub_type: AccountSubType | null
  company_id?: number
  agency_id?: number
  role: UserRole
  permissions: Permission[]
  is_admin: boolean
  is_active: boolean
  last_project_date?: string
  created_at: string
  updated_at: string
  online_status?: "online" | "offline" | "busy" | "away"
  last_login?: string
  address?: {
    cep: string
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    latitude?: number
    longitude?: number
  }
  company_associations?: CompanyAssociation[]
  agency_associations?: AgencyAssociation[]
  active_company_id?: number
  active_agency_id?: number
  company?: Company
  agency?: Agency
}

export interface CompanyAssociation {
  id: number
  user_id: number
  company_id: number
  company: Company
  role: UserRole
  permissions: Permission[]
  is_active: boolean
  joined_at: string
}

export interface AgencyAssociation {
  id: number
  user_id: number
  agency_id: number
  agency: Agency
  role: UserRole
  permissions: Permission[]
  is_active: boolean
  joined_at: string
}

export interface Company {
  id: number
  name: string
  email: string
  phone?: string
  document: string
  account_type: "dependent" | "independent"
  agency_id?: number
  is_active: boolean
  last_project_date?: string
  ai_knowledge_base: AIKnowledgeBase
  created_at: string
  updated_at: string
  agency?: Agency
  users: User[]
  projects: Project[]
}

export interface Agency {
  id: number
  name: string
  email: string
  phone?: string
  document: string
  partner_level: "basic" | "premium" | "elite"
  commission_rate: number
  is_active: boolean
  created_at: string
  updated_at: string
  companies: Company[]
  users: User[]
}

export interface AIKnowledgeBase {
  id: number
  company_id: number
  summary: string
  briefing_history: BriefingHistory[]
  contracting_patterns: ContractingPattern[]
  guidelines: Guideline[]
  last_updated: string
  auto_generated: boolean
}

export interface BriefingHistory {
  id: number
  project_name: string
  brief_summary: string
  key_requirements: string[]
  date: string
}

export interface ContractingPattern {
  service_type: string
  frequency: number
  average_budget: number
  preferred_timeline: string
}

export interface Guideline {
  category: string
  description: string
  importance: "high" | "medium" | "low"
}

export type AccountType = "empresas" | "agencias" | "nomades" | "admin"
export type AccountSubType = "company" | "in-house" | null

export type UserRole = "company_admin" | "company_user" | "agency_admin" | "agency_user" | "nomad" | "admin"

export type Permission =
  | "view_projects"
  | "create_projects"
  | "edit_projects"
  | "cancel_projects"
  | "view_catalog"
  | "purchase_services"
  | "manage_users"
  | "view_payments"
  | "manage_payments"
  | "approve_deliveries"
  | "access_ai_knowledge"
  | "edit_ai_knowledge"
  | "view_analytics"
  | "admin_access"

export interface Project {
  id: number
  name: string
  description?: string
  company_id: number
  status: "active" | "completed" | "paused" | "cancelled"
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}
