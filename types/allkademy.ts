export interface Course {
  id: string
  title: string
  description: string
  thumbnail_url: string
  category: CourseCategory
  level: "beginner" | "intermediate" | "advanced"
  duration_minutes: number
  price: number
  is_free: boolean
  access_requirements: AccessRequirement[]
  instructor: {
    name: string
    avatar_url?: string
    bio: string
  }
  status: "draft" | "published" | "archived"
  created_at: string
  updated_at: string

  // Course content
  modules: CourseModule[]

  // Statistics
  stats: {
    total_enrollments: number
    completion_rate: number
    average_rating: number
    total_reviews: number
  }
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
  quiz?: Quiz
  estimated_duration: number
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  description: string
  type: "video" | "text" | "document" | "interactive"
  content_url: string
  duration_minutes: number
  order: number
  is_preview: boolean // Can be viewed without enrollment
  resources: LessonResource[]
}

export interface LessonResource {
  id: string
  lesson_id: string
  title: string
  type: "pdf" | "link" | "download"
  url: string
  description?: string
}

export interface Quiz {
  id: string
  module_id: string
  title: string
  description: string
  questions: QuizQuestion[]
  passing_score: number
  max_attempts: number
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question: string
  type: "multiple_choice" | "true_false" | "text"
  options?: string[]
  correct_answer: string | number
  explanation?: string
  points: number
}

export interface CourseCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  parent_id?: string
  subcategories?: CourseCategory[]
}

export interface AccessRequirement {
  type: "account_type" | "account_level" | "feature_access" | "course_completion"
  value: string
  description: string
}

export interface CourseEnrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at?: string
  progress: number // 0-100
  current_lesson_id?: string
  certificate_url?: string
  payment_status: "free" | "paid" | "pending"
  payment_amount?: number
  payment_date?: string

  // Progress tracking
  lesson_progress: LessonProgress[]
  quiz_attempts: QuizAttempt[]
}

export interface LessonProgress {
  lesson_id: string
  completed: boolean
  completed_at?: string
  watch_time: number // in seconds
  last_position: number // for video lessons
}

export interface QuizAttempt {
  id: string
  quiz_id: string
  enrollment_id: string
  score: number
  max_score: number
  passed: boolean
  attempted_at: string
  answers: QuizAnswer[]
}

export interface QuizAnswer {
  question_id: string
  answer: string | number
  is_correct: boolean
  points_earned: number
}

export interface Certificate {
  id: string
  enrollment_id: string
  course_id: string
  user_id: string
  certificate_url: string
  issued_at: string
  verification_code: string
  is_valid: boolean
}

export interface LearningPath {
  id: string
  title: string
  description: string
  thumbnail_url: string
  courses: Course[]
  estimated_duration: number
  level: "beginner" | "intermediate" | "advanced"
  access_requirements: AccessRequirement[]
  created_at: string
}

export interface UserLearningStats {
  user_id: string
  total_courses_enrolled: number
  total_courses_completed: number
  total_certificates: number
  total_learning_hours: number
  current_streak: number
  longest_streak: number
  favorite_categories: string[]
  skill_levels: Record<string, number>
}
