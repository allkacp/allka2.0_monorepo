// Project Configuration Types
export interface ProjectConfiguration {
  id: number
  project_id: number

  // Identification
  responsible_users: number[]

  // Files and Documents
  auto_save_attachments: boolean
  file_categories: string[]

  // Vault (Encrypted Storage)
  vault_enabled: boolean
  vault_permissions: VaultPermission[]

  // Payment Modalities
  payment_mode: PaymentMode
  payment_config: PaymentConfiguration

  // Automations
  auto_task_distribution: boolean
  auto_approval_on_timeout: boolean
  auto_approval_timeout_hours: number

  created_at: string
  updated_at: string
}

export type PaymentMode = "SQUAD" | "POST_PAID" | "EXTERNAL" | "INTERNAL"

export interface PaymentConfiguration {
  // SQUAD Configuration
  squad_members?: number[]
  squad_distribution?: "equal" | "weighted"
  squad_weights?: Record<number, number>

  // POST_PAID Configuration
  post_paid_rate?: number
  post_paid_currency?: string

  // EXTERNAL Configuration (Barter/Free)
  external_type?: "barter" | "free" | "partnership"
  external_description?: string

  // INTERNAL Configuration
  internal_department?: string
  internal_cost_center?: string
}

export interface VaultPermission {
  id: number
  project_id: number
  user_id: number
  permission_type: "read" | "write" | "admin"
  granted_by: number
  granted_at: string
}

export interface ProjectVaultItem {
  id: number
  project_id: number
  title: string
  type: "password" | "api_key" | "certificate" | "note"
  encrypted_content: string
  metadata?: Record<string, any>
  created_by: number
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: number
  project_id: number
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  category?: string
  source: "manual" | "task_attachment" | "ai_generated"
  source_task_id?: number
  uploaded_by: number
  uploaded_at: string
}

export interface ProjectAutomationRule {
  id: number
  project_id: number
  rule_type: "task_distribution" | "approval_timeout" | "notification"
  conditions: Record<string, any>
  actions: Record<string, any>
  enabled: boolean
  created_by: number
  created_at: string
}
