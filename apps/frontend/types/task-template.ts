export interface TaskTemplate {
  id: string
  name: string
  description: string
  category: string
  complexity: "basic" | "intermediate" | "advanced" | "premium"

  // Pricing and timing
  base_price: number
  emergency_multiplier: number // e.g., 1.5 for 50% extra
  revision_time_hours: number
  estimated_hours: number

  // Instructions
  execution_instructions: string // For nomades
  briefing_instructions: string // For clients

  // Task chaining
  prerequisite_tasks: string[] // Task template IDs that must complete first
  triggers_tasks: string[] // Task template IDs that start when this completes

  // Distribution and ranking
  ranking_criteria: TaskRankingCriteria
  qualification_test_id?: string

  // Performance tracking
  stats: TaskTemplateStats

  // Configuration
  is_active: boolean
  requires_approval: boolean
  max_revisions: number
  tags: string[]

  created_at: string
  updated_at: string
  created_by: string
}

export interface TaskRankingCriteria {
  weight_task_rating: number // 0-100, weight for task-specific rating
  weight_availability: number // 0-100, weight for available hours
  weight_project_history: number // 0-100, weight for previous project experience
  weight_overall_score: number // 0-100, weight for general nomade score

  // Requirements
  min_task_rating: number
  min_overall_score: number
  min_available_hours: number
  required_qualifications: string[]

  // Preferences
  prefer_project_experience: boolean
  prefer_category_specialist: boolean
}

export interface TaskTemplateStats {
  total_executions: number
  average_completion_time: number
  average_rating: number
  success_rate: number // % of tasks completed without major issues
  average_revisions: number

  // Performance by nomade level
  performance_by_level: {
    [level: string]: {
      avg_time: number
      avg_rating: number
      completion_rate: number
    }
  }

  // Recent trends
  last_30_days: {
    executions: number
    avg_rating: number
    issues: number
  }
}

export interface TaskExecution {
  id: string
  template_id: string
  project_id: string
  assigned_nomade_id: string

  // Status and timing
  status: "pending" | "in_progress" | "under_review" | "revision_requested" | "completed" | "cancelled"
  priority: "normal" | "urgent" | "emergency"

  // Dates
  assigned_at: string
  started_at?: string
  completed_at?: string
  due_date: string

  // Content
  briefing_data: Record<string, any> // Client-provided briefing
  deliverables: TaskDeliverable[]

  // Feedback and rating
  client_rating?: number
  client_feedback?: string
  nomade_notes?: string

  // Revisions
  revision_count: number
  revision_requests: TaskRevision[]

  // Chain execution
  triggered_by?: string // ID of previous task execution
  triggers_next: string[] // IDs of next task executions

  created_at: string
  updated_at: string
}

export interface TaskDeliverable {
  id: string
  name: string
  description: string
  file_url?: string
  content?: string
  type: "file" | "text" | "link" | "image"

  submitted_at: string
  approved: boolean
  feedback?: string
}

export interface TaskRevision {
  id: string
  requested_at: string
  reason: string
  details: string
  requested_by: string

  resolved_at?: string
  resolution_notes?: string
}

export interface TaskDistributionAttempt {
  id: string
  template_id: string
  execution_id: string

  // Ranking results
  eligible_nomades: NomadeRanking[]
  selected_nomade_id?: string

  // Attempt details
  attempt_number: number
  attempted_at: string
  status: "pending" | "assigned" | "declined" | "timeout" | "failed"

  // Failure handling
  failure_reason?: string
  retry_at?: string
  escalated_to_leader: boolean
}

export interface NomadeRanking {
  nomade_id: string
  nomade_name: string
  nomade_level: string

  // Scoring
  total_score: number
  task_rating_score: number
  availability_score: number
  project_history_score: number
  overall_score: number

  // Details
  available_hours: number
  task_specific_rating: number
  project_experience_count: number
  last_task_completion: string

  // Qualification status
  is_qualified: boolean
  qualification_notes?: string
}

export interface QualificationTest {
  id: string
  name: string
  description: string
  category: string

  // Test content
  questions: TestQuestion[]
  practical_tasks: PracticalTask[]

  // Scoring
  passing_score: number
  max_attempts: number
  time_limit_minutes?: number

  // Results tracking
  total_attempts: number
  pass_rate: number
  average_score: number

  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TestQuestion {
  id: string
  question: string
  type: "multiple_choice" | "text" | "file_upload"
  options?: string[] // For multiple choice
  correct_answer?: string
  points: number
}

export interface PracticalTask {
  id: string
  title: string
  description: string
  instructions: string
  deliverable_type: "file" | "text" | "link"
  points: number
  time_limit_hours?: number
}

export interface TestSubmission {
  id: string
  test_id: string
  nomade_id: string

  // Submission details
  answers: Record<string, any>
  practical_deliverables: Record<string, any>

  // Scoring
  score: number
  passed: boolean
  feedback?: string

  // Timing
  started_at: string
  submitted_at: string
  reviewed_at?: string
  reviewed_by?: string

  attempt_number: number
}

// Widget and analytics types
export interface TaskTemplateAnalytics {
  template_id: string

  // Performance metrics
  efficiency_trend: number[] // Last 12 months
  quality_trend: number[] // Last 12 months
  demand_trend: number[] // Last 12 months

  // Comparative analysis
  vs_category_average: {
    completion_time: number // % difference
    rating: number // % difference
    success_rate: number // % difference
  }

  // Bottlenecks and issues
  common_revision_reasons: Array<{
    reason: string
    frequency: number
    avg_resolution_time: number
  }>

  // Nomade performance
  top_performers: Array<{
    nomade_id: string
    nomade_name: string
    executions: number
    avg_rating: number
    avg_time: number
  }>

  // Recommendations
  optimization_suggestions: string[]
  pricing_recommendations: {
    suggested_price: number
    confidence: number
    reasoning: string
  }
}

export interface TaskChainExecution {
  id: string
  name: string
  project_id: string

  // Chain definition
  tasks: Array<{
    template_id: string
    execution_id?: string
    position: number
    depends_on: number[] // Positions of prerequisite tasks
  }>

  // Status
  status: "pending" | "in_progress" | "completed" | "failed"
  current_task_position: number

  // Progress
  completed_tasks: number
  total_tasks: number
  estimated_completion: string

  created_at: string
  updated_at: string
}
