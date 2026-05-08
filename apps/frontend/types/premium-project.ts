export interface PremiumProject {
  id: string
  title: string
  description: string
  client: PremiumClient
  status: PremiumProjectStatus
  value: number
  created_at: string
  updated_at: string

  // Responsáveis
  commercial_admin: CommercialAdmin
  partner_agency: PartnerAgency

  // Datas importantes
  proposal_date: string
  negotiation_start?: string
  payment_due_date?: string
  start_date?: string
  completion_date?: string

  // Relatórios e acompanhamento
  reports: ProjectReport[]
  last_report_date?: string
  next_report_due?: string

  // Histórico de movimentações
  history: ProjectHistory[]

  // Métricas
  conversion_probability?: number
  satisfaction_score?: number
  churn_risk?: "low" | "medium" | "high"
}

export type PremiumProjectStatus =
  | "elaborado"
  | "em_negociacao"
  | "perdido"
  | "aguardando_pagamento"
  | "ativo"
  | "inadimplente"
  | "cancelado"
  | "concluido"

export interface PremiumClient {
  id: string
  name: string
  email: string
  phone: string
  company: string
  segment: string
  created_from_lead: boolean
  lead_id?: string
  potential_value: number
  contact_preference: "email" | "phone" | "whatsapp"
}

export interface CommercialAdmin {
  id: string
  name: string
  email: string
  phone: string
  active_projects: number
  conversion_rate: number
}

export interface PartnerAgency {
  id: string
  name: string
  partner_level: "basic" | "premium" | "elite"
  contact_person: string
  email: string
  phone: string
  active_projects: number
  satisfaction_rating: number
}

export interface ProjectReport {
  id: string
  project_id: string
  reporter_type: "commercial_admin" | "partner_agency"
  reporter_id: string
  report_date: string

  // Conteúdo do relatório
  status_update: string
  client_satisfaction: number // 1-5
  challenges: string
  next_steps: string
  completion_percentage: number

  // Métricas específicas
  budget_status: "on_track" | "over_budget" | "under_budget"
  timeline_status: "on_time" | "delayed" | "ahead"

  // Anexos
  attachments?: ReportAttachment[]
}

export interface ReportAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
}

export interface ProjectHistory {
  id: string
  project_id: string
  action: string
  description: string
  user_id: string
  user_name: string
  user_type: "admin" | "commercial" | "partner"
  timestamp: string
  metadata?: Record<string, any>
}

export interface ChurnEvent {
  id: string
  partner_agency_id: string
  reason: string
  date: string
  affected_projects: string[]
  redistribution_plan: ProjectRedistribution[]
}

export interface ProjectRedistribution {
  project_id: string
  from_agency_id: string
  to_agency_id: string
  redistribution_date: string
  reason: string
  client_notified: boolean
}

export interface PremiumProjectFilters {
  status: PremiumProjectStatus | "all"
  commercial_admin: string | "all"
  partner_agency: string | "all"
  value_range: {
    min: number
    max: number
  }
  date_range: {
    start: string
    end: string
  }
  churn_risk: "low" | "medium" | "high" | "all"
}

export interface PremiumProjectStats {
  total_projects: number
  active_projects: number
  total_value: number
  conversion_rate: number
  average_project_value: number
  projects_by_status: Record<PremiumProjectStatus, number>
  top_performing_agencies: PartnerAgency[]
  top_performing_admins: CommercialAdmin[]
}
