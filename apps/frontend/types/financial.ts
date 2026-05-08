export interface WithdrawalRequestExtended {
  id: number
  agency_id: number
  agency_name: string
  agency_cnpj: string
  amount: number
  status: "aguardando_analise" | "pagamento_agendado" | "pagamento_efetuado" | "cancelado" | "reprovado"
  requested_at: string
  invoice_url?: string
  notes?: string
  processed_by?: number
  processed_at?: string
  payment_scheduled_date?: string
  payment_completed_date?: string
  rejection_reason?: string
  correction_deadline?: string
  omie_payment_id?: string
  bank_account: {
    bank_name: string
    agency: string
    account: string
    account_type: "checking" | "savings"
    cnpj: string
  }
  // Campos para automação de prazos
  analysis_deadline: string // 3 dias úteis
  payment_deadline?: string // 7 dias úteis após aprovação
  auto_cancel_date?: string // 7 dias após reprovação
}

export interface OmiePaymentOrder {
  id: string
  withdrawal_request_id: number
  amount: number
  recipient: {
    name: string
    cnpj: string
    bank_account: {
      bank_code: string
      agency: string
      account: string
      account_type: "checking" | "savings"
    }
  }
  scheduled_date: string
  status: "pending" | "sent" | "completed" | "failed"
  created_at: string
  sent_at?: string
  completed_at?: string
  error_message?: string
}

export interface FinancialStats {
  total_pending_amount: number
  total_requests_count: number
  requests_by_status: {
    aguardando_analise: number
    pagamento_agendado: number
    pagamento_efetuado: number
    cancelado: number
    reprovado: number
  }
  overdue_analysis: number // Solicitações com prazo de análise vencido
  overdue_payment: number // Pagamentos com prazo vencido
  monthly_volume: number
  average_processing_time: number // em dias
}
