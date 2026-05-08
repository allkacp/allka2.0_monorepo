export interface MatchQueueEntry {
  id: string
  agency_id: string
  agency_name: string
  partner_level: "basic" | "premium" | "elite"
  position: number

  // Status e requisitos
  match_enabled: boolean
  has_pending_reports: boolean
  pending_reports_count: number
  last_report_date?: string

  // Capacidade e performance
  active_projects: number
  max_capacity: number
  satisfaction_rating: number
  completion_rate: number

  // Histórico de distribuição
  last_project_assigned?: string
  total_projects_assigned: number

  // Timestamps
  joined_queue: string
  last_position_change?: string

  // Flags de controle
  is_new_partner: boolean
  temporary_suspension?: {
    reason: string
    until: string
    suspended_by: string
  }
}

export interface ProjectDistributionRule {
  id: string
  name: string
  description: string

  // Critérios de valor
  min_project_value: number
  max_project_value: number

  // Níveis de partner compatíveis
  compatible_levels: ("basic" | "premium" | "elite")[]

  // Requisitos adicionais
  max_pending_reports: number
  min_satisfaction_rating: number
  min_completion_rate: number

  // Configurações
  priority_weight: number
  is_active: boolean
  created_by: string
  created_at: string
}

export interface DistributionAttempt {
  id: string
  project_id: string
  project_value: number

  // Resultado da distribuição
  status: "success" | "failed" | "manual_override"
  assigned_agency_id?: string
  assigned_agency_name?: string

  // Processo de seleção
  eligible_agencies: string[]
  selection_criteria: string
  queue_position_at_time: number

  // Timestamps
  attempted_at: string
  completed_at?: string

  // Metadados
  distribution_rule_id: string
  automated: boolean
  assigned_by?: string
  failure_reason?: string
}

export interface QueueMovement {
  id: string
  agency_id: string
  agency_name: string

  // Movimento
  action: "position_change" | "suspension" | "reactivation" | "manual_redistribution" | "new_entry"
  from_position?: number
  to_position?: number

  // Contexto
  reason: string
  performed_by: string
  performed_at: string

  // Dados adicionais
  affected_projects?: string[]
  metadata?: Record<string, any>
}

export interface MatchQueueStats {
  total_agencies: number
  active_agencies: number
  suspended_agencies: number
  new_partners_count: number

  // Distribuição por nível
  agencies_by_level: {
    basic: number
    premium: number
    elite: number
  }

  // Performance
  average_satisfaction: number
  average_completion_rate: number
  total_projects_distributed: number

  // Alertas
  agencies_with_pending_reports: number
  agencies_at_capacity: number
}

export interface MatchQueueFilters {
  partner_level: "basic" | "premium" | "elite" | "all"
  match_status: "enabled" | "disabled" | "all"
  capacity_status: "available" | "at_capacity" | "over_capacity" | "all"
  report_status: "up_to_date" | "pending" | "overdue" | "all"
  position_range: {
    start: number
    end: number
  }
}
