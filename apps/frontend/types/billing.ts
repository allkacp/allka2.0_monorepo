export interface Invoice {
  id: string
  client_id: string
  client_name: string
  client_email: string
  client_phone?: string
  client_company?: string
  type: "project" | "credit_plan" | "post_paid"
  amount: number
  due_date: string
  created_at: string
  status: "pending" | "overdue" | "paid" | "cancelled"
  overdue_days: number
  description: string
  reference_id?: string // Project ID, Plan ID, etc.
  checkout_url?: string
  payment_method?: string
  paid_at?: string
  notes?: string
}

export interface BillingStats {
  total_pending: number
  total_overdue: number
  total_amount_pending: number
  total_amount_overdue: number
  overdue_0_30: number
  overdue_31_60: number
  overdue_61_90: number
  overdue_90_plus: number
}

export interface BillingFilters {
  date_range: {
    start: string
    end: string
  }
  type: "all" | "project" | "credit_plan" | "post_paid"
  status: "all" | "pending" | "overdue"
  overdue_range: "all" | "0-30" | "31-60" | "61-90" | "90+"
  search: string
}

export interface NotificationTemplate {
  id: string
  name: string
  type: "email" | "sms" | "whatsapp"
  trigger_days: number // Days overdue to trigger
  subject: string
  content: string
  is_active: boolean
}
