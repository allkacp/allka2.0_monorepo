export interface UserManagement {
  id: string
  user_id: string
  action: "create" | "update" | "activate" | "deactivate" | "password_reset"
  details: string
  performed_by: string
  performed_at: string
}

export interface AccountPlan {
  id: string
  name: string
  type: "lite" | "start" | "standard" | "growth" | "scale" | "squad" | "enterprise"
  monthly_price: number
  features: string[]
  is_active: boolean
}

export interface AccountBilling {
  id: string
  account_id: string
  plan_id: string
  status: "active" | "suspended" | "cancelled"
  current_period_start: string
  current_period_end: string
  next_billing_date: string
  payment_method?: PaymentMethod
  invoices: Invoice[]
}

export interface PaymentMethod {
  id: string
  type: "credit_card" | "bank_transfer" | "pix"
  last_four?: string
  brand?: string
  is_default: boolean
}

export interface Invoice {
  id: string
  number: string
  amount: number
  status: "paid" | "pending" | "overdue" | "cancelled"
  issue_date: string
  due_date: string
  paid_date?: string
  download_url?: string
}

export interface AcceptedTerms {
  id: string
  account_id: string
  term_type: "privacy_policy" | "terms_of_service" | "data_processing" | "service_agreement"
  term_version: string
  accepted_by: string
  accepted_at: string
  ip_address: string
  user_agent: string
}
