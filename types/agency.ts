export interface Agency {
  id: string
  name: string
  cnpj: string
  email: string
  phone: string
  logo?: string // Adicionado campo para logotipo da agência
  address: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  status: "pending" | "active" | "inactive" | "suspended"
  partner_level: "bronze" | "silver" | "gold" | "platinum" | "diamond"
  is_partner: boolean
  created_at: string
  approved_at?: string
  approved_by?: string

  // Wallet information
  wallet: {
    available_balance: number
    pending_balance: number
    total_earned: number
    last_withdrawal?: string
  }

  // Bank account for withdrawals
  bank_account?: {
    bank_name: string
    agency: string
    account: string
    account_type: "checking" | "savings"
    cnpj: string // Must match agency CNPJ
  }

  // Files and documents
  files: AgencyFile[]

  // Statistics
  stats: {
    total_projects: number
    active_projects: number
    mrr: number
    led_agencies: number
    led_agencies_mrr?: number // Tornado opcional para compatibilidade
  }
}

export interface AgencyFile {
  id: string
  agency_id: string
  name: string
  type: "presentation" | "certificate" | "contract" | "pdf" | "image" | "other" // Adicionados tipos pdf e image
  file_url: string
  file_size: number
  uploaded_at: string
  uploaded_by: string
  can_delete: boolean // Only admin can delete
}

export interface WalletTransaction {
  id: string
  agency_id: string
  type: "credit" | "debit" | "withdrawal" | "bonus" | "commission"
  amount: number
  description: string
  reference_id?: string // Project ID, invoice ID, etc.
  status: "pending" | "completed" | "failed" | "cancelled"
  created_at: string
  processed_at?: string
  receipt_url?: string
  notes?: string
  created_by?: string // Admin who made the adjustment
}

export interface WithdrawalRequest {
  id: string
  agency_id: string
  amount: number
  status: "pending" | "approved" | "rejected" | "completed"
  requested_at: string
  invoice_url?: string
  notes?: string
  processed_by?: string
  processed_at?: string
}

export interface PartnerPromotion {
  id: string
  agency_id: string
  promoted_by: string
  promoted_at: string
  terms_accepted: boolean
  terms_accepted_at?: string
  previous_level: string
  new_level: string
  benefits: string[]
}
