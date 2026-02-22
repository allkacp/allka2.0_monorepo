export interface UserManagement {
  id: number
  user_id: number
  action: "create" | "update" | "activate" | "deactivate" | "password_reset"
  details: string
  performed_by: number
  performed_at: string
}

export interface AccountPlan {
  id: number
  name: string
  type: "lite" | "start" | "standard" | "growth" | "scale" | "squad" | "enterprise"
  monthly_price: number
  features: string[]
  is_active: boolean
}

export interface AccountBilling {
  id: number
  account_id: number
  plan_id: number
  status: "active" | "suspended" | "cancelled"
  current_period_start: string
  current_period_end: string
  next_billing_date: string
  payment_method?: PaymentMethod
  invoices: Invoice[]
}

export interface PaymentMethod {
  id: number
  type: "credit_card" | "bank_transfer" | "pix"
  last_four?: string
  brand?: string
  is_default: boolean
}

export interface Invoice {
  id: number
  number: string
  amount: number
  status: "paid" | "pending" | "overdue" | "cancelled"
  issue_date: string
  due_date: string
  paid_date?: string
  download_url?: string
}

export interface AcceptedTerms {
  id: number
  account_id: number
  term_type: "privacy_policy" | "terms_of_service" | "data_processing" | "service_agreement"
  term_version: string
  accepted_by: number
  accepted_at: string
  ip_address: string
  user_agent: string
}
