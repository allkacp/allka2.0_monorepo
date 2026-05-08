export type TaskExecutionStatus =
  | "draft" // Rascunho
  | "launched" // Lançamento
  | "in_progress" // Em Execução
  | "returned" // Devolvida
  | "paused" // Pausada
  | "agency_approval" // Aprovação da Agência
  | "client_approval" // Aprovação do Cliente
  | "approved" // Aprovada
  | "rejected" // Reprovada
  | "expired" // Expirada

export type TaskExecutionPriority = "low" | "medium" | "high" | "urgent" | "emergency"

export type TaskExecutionType = "regular" | "qualification_test" | "learning_circuit"

export interface TaskExecution {
  id: string
  template_id: string
  template_name: string
  project_id?: string
  project_name?: string
  client_id: string
  client_name: string
  agency_id?: string
  agency_name?: string
  nomad_id?: string
  nomad_name?: string
  status: TaskExecutionStatus
  priority: TaskExecutionPriority
  title: string
  description: string
  briefing: string
  instructions: string
  requirements: Record<string, any>
  deliverables: string[]
  estimated_hours: number
  deadline: string
  emergency_deadline?: string
  price: number
  emergency_price?: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  approved_at?: string
  is_emergency: boolean
  is_overdue: boolean
  days_until_deadline: number
  linked_tasks: string[] // IDs of linked tasks
  auto_trigger_next: boolean
  chat_messages: TaskChatMessage[]
  history: TaskHistoryEntry[]
  attachments: TaskAttachment[]

  task_type: TaskExecutionType
  is_qualification_test: boolean
  qualification_category?: string
  learning_circuit?: LearningCircuitStep[]
  qualification_checklist?: QualificationChecklistItem[]
  test_submission?: QualificationTestSubmission
  leader_review?: LeaderQualificationReview
}

export interface LearningCircuitStep {
  id: string
  type: "text" | "video" | "document" | "commitment_term"
  title: string
  content: string
  url?: string
  duration?: number
  completed: boolean
  completed_at?: string
}

export interface QualificationChecklistItem {
  id: string
  criterion: string
  description: string
  weight: number
  required: boolean
  checked: boolean
  leader_notes?: string
}

export interface QualificationTestSubmission {
  id: string
  nomad_id: string
  submitted_at: string
  deliverables: TaskAttachment[]
  nomad_notes?: string
  status: "submitted" | "under_review" | "approved" | "rejected" | "needs_adjustment"
}

export interface LeaderQualificationReview {
  id: string
  leader_id: string
  leader_name: string
  reviewed_at: string
  decision: "approved" | "rejected" | "needs_adjustment"
  overall_score: number
  checklist_results: Record<string, boolean>
  feedback: string
  improvement_suggestions?: string
  contact_made: boolean
  contact_notes?: string
}

export interface QuestionBankItem {
  id: string
  question: string
  type: "text" | "textarea" | "select" | "multiselect" | "file" | "date" | "number"
  category: string
  tags: string[]
  options?: string[]
  required: boolean
  ai_fillable: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface DynamicQuestionnaire {
  id: string
  task_template_id: string
  name: string
  description: string
  questions: QuestionBankItem[]
  conditional_logic: QuestionnaireLogic[]
  created_at: string
  updated_at: string
}

export interface QuestionnaireLogic {
  id: string
  condition: string // e.g., "if variation includes 'premium'"
  action: "show_question" | "hide_question" | "require_question"
  target_question_id: string
  value?: any
}

export interface TaskChatMessage {
  id: string
  task_id: string
  sender_id: string
  sender_name: string
  sender_role: "client" | "nomad" | "agency" | "ai"
  message: string
  ai_optimized?: boolean
  created_at: string
  attachments?: string[]
}

export interface TaskHistoryEntry {
  id: string
  task_id: string
  user_id: string
  user_name: string
  action: string
  description: string
  old_value?: any
  new_value?: any
  created_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  filename: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: string
  uploaded_at: string
}

export interface TaskQuestionnaireField {
  id: string
  name: string
  label: string
  type: "text" | "textarea" | "select" | "multiselect" | "file" | "date" | "number"
  required: boolean
  options?: string[]
  ai_fillable: boolean
  ai_filled_value?: any
  user_value?: any
}

export interface TaskQuestionnaire {
  task_id: string
  fields: TaskQuestionnaireField[]
  ai_completion_percentage: number
  requires_review: boolean
  completed_at?: string
}

export interface TaskFilters {
  status?: TaskExecutionStatus[]
  priority?: TaskExecutionPriority[]
  client_id?: string
  agency_id?: string
  nomad_id?: string
  project_id?: string
  date_range?: {
    start: string
    end: string
  }
  search?: string
  is_overdue?: boolean
  is_emergency?: boolean
  quick_filter?: "overdue" | "completed" | "due_soon" | "emergency" | "my_tasks"
}
