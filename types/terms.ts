export interface Term {
  id: string
  name: string
  version: string
  content: string
  type: "privacy_policy" | "terms_of_service" | "data_processing" | "service_agreement" | "custom"
  is_active: boolean
  is_mandatory: boolean
  created_at: string
  updated_at: string
  created_by: string

  /**
   * Define quem deve aceitar este termo:
   * - "empresa"  → apenas o usuário master/inicial da empresa (ao criar a conta)
   * - "usuario"  → todos os usuários da plataforma
   */
  acceptance_level: "empresa" | "usuario"

  /**
   * Tipos de conta que devem receber este termo.
   * Admin nunca recebe termos de aceite.
   */
  target_account_types: ("empresas" | "agencias" | "nomades")[]

  // Conditional rules
  conditions: TermCondition[]
}

export interface TermCondition {
  id: string
  term_id: string
  condition_type: "account_type" | "account_level" | "feature_access" | "project_type"
  condition_value: string
  is_required: boolean
  created_at: string
}

export interface TermAcceptance {
  id: string
  term_id: string
  term_name: string
  term_version: string
  user_id: string
  user_name: string
  user_email: string
  account_id: string
  account_type: "empresas" | "agencias" | "nomades" | "admin"
  acceptance_level: "empresa" | "usuario"
  accepted_at: string
  ip_address: string
  user_agent: string
  acceptance_method: "web" | "mobile" | "api"
  is_current: boolean
}

export interface NotificationMessage {
  id: string
  name: string
  title: string
  content: string
  message_type: "text" | "html" | "rich"
  has_images: boolean
  has_videos: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string

  // Media attachments
  attachments: NotificationAttachment[]
}

export interface NotificationAttachment {
  id: string
  message_id: string
  type: "image" | "video" | "document"
  url: string
  filename: string
  size: number
  created_at: string
}

export interface NotificationRule {
  id: string
  message_id: string
  name: string
  is_active: boolean

  // Target audience
  target_account_types: string[]
  target_account_levels: string[]
  target_project_status: string[]
  target_custom_filters: Record<string, any>

  // Delivery channels
  channels: NotificationChannel[]

  // Triggers
  trigger_type: "manual" | "event" | "scheduled" | "conditional"
  trigger_config: Record<string, any>

  created_at: string
  updated_at: string
  created_by: string
}

export interface NotificationChannel {
  type: "email" | "whatsapp" | "in_app_popup" | "in_app_banner" | "push"
  is_enabled: boolean
  config: Record<string, any>
}

export interface NotificationTrigger {
  id: string
  rule_id: string
  event_type: string
  event_config: Record<string, any>
  delay_minutes: number
  is_active: boolean
}

export interface NotificationHistory {
  id: string
  rule_id: string
  message_id: string
  recipient_id: string
  recipient_name: string
  recipient_email: string
  channel: string
  status: "sent" | "delivered" | "failed" | "opened" | "clicked"
  sent_at: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  error_message?: string
  metadata: Record<string, any>
}
