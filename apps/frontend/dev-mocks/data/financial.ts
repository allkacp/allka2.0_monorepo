// Mock financial data — invoices, withdrawals, billing stats
export type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled";
export type WithdrawalStatus = "pending" | "processing" | "paid" | "rejected";

export interface MockInvoice {
  id: string;
  number: string;
  project_id: number | null;
  project_name: string | null;
  company_id: string | null;
  company_name: string | null;
  amount: number;
  status: InvoiceStatus;
  due_date: string;
  paid_at: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MockWithdrawal {
  id: string;
  nomade_id: string;
  nomade_name: string;
  amount: number;
  status: WithdrawalStatus;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  pix_key: string | null;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

export interface MockFinancialStats {
  total_revenue: number;
  revenue_this_month: number;
  revenue_last_month: number;
  pending_invoices: number;
  overdue_invoices: number;
  pending_withdrawals: number;
  total_paid_to_nomades: number;
  mrr: number;
}

export const mockInvoices: MockInvoice[] = [
  {
    id: "1",
    number: "NF-2026-001",
    project_id: 1,
    project_name: "Redesign Site Coca-Cola Brasil",
    company_id: "1",
    company_name: "Coca-Cola Brasil",
    amount: 28000.00,
    status: "paid",
    due_date: "2026-02-15T00:00:00Z",
    paid_at: "2026-02-14T10:30:00Z",
    description: "Contrato de redesign — 1ª parcela",
    created_at: "2026-01-15T09:00:00Z",
    updated_at: "2026-02-14T10:30:00Z",
  },
  {
    id: "2",
    number: "NF-2026-002",
    project_id: 2,
    project_name: "App Mobile Starbucks",
    company_id: "2",
    company_name: "Starbucks Coffee",
    amount: 45000.00,
    status: "pending",
    due_date: "2026-04-30T00:00:00Z",
    paid_at: null,
    description: "Desenvolvimento de app — 1ª parcela",
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-03-01T09:00:00Z",
  },
  {
    id: "3",
    number: "NF-2026-003",
    project_id: 3,
    project_name: "Campanha Google Workspace",
    company_id: "3",
    company_name: "Google Brasil",
    amount: 18500.00,
    status: "paid",
    due_date: "2026-03-01T00:00:00Z",
    paid_at: "2026-02-28T16:00:00Z",
    description: "Estratégia de marketing digital — mensal",
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-02-28T16:00:00Z",
  },
  {
    id: "4",
    number: "NF-2026-004",
    project_id: 4,
    project_name: "Treinamento Interno Netflix",
    company_id: "4",
    company_name: "Netflix Brasil",
    amount: 12000.00,
    status: "overdue",
    due_date: "2026-03-15T00:00:00Z",
    paid_at: null,
    description: "Treinamento de liderança — módulo 1",
    created_at: "2026-02-10T09:00:00Z",
    updated_at: "2026-03-16T08:00:00Z",
  },
  {
    id: "5",
    number: "NF-2026-005",
    project_id: 5,
    project_name: "Identidade Visual Nubank",
    company_id: "5",
    company_name: "Nubank",
    amount: 35000.00,
    status: "pending",
    due_date: "2026-05-20T00:00:00Z",
    paid_at: null,
    description: "Rebranding completo — 1ª parcela",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  },
  {
    id: "6",
    number: "NF-2025-089",
    project_id: null,
    project_name: null,
    company_id: "6",
    company_name: "Magazine Luiza",
    amount: 9500.00,
    status: "paid",
    due_date: "2025-12-10T00:00:00Z",
    paid_at: "2025-12-08T14:00:00Z",
    description: "Consultoria estratégica — dezembro/2025",
    created_at: "2025-11-10T09:00:00Z",
    updated_at: "2025-12-08T14:00:00Z",
  },
  {
    id: "7",
    number: "NF-2026-006",
    project_id: null,
    project_name: null,
    company_id: "7",
    company_name: "Ambev",
    amount: 22000.00,
    status: "cancelled",
    due_date: "2026-03-31T00:00:00Z",
    paid_at: null,
    description: "Projeto cancelado por acordo mútuo",
    created_at: "2026-02-20T09:00:00Z",
    updated_at: "2026-03-10T11:00:00Z",
  },
];

export const mockWithdrawals: MockWithdrawal[] = [
  {
    id: "1",
    nomade_id: "7",
    nomade_name: "André Lima",
    amount: 4500.00,
    status: "paid",
    bank_name: "Itaú",
    bank_agency: "1234",
    bank_account: "56789-0",
    pix_key: null,
    requested_at: "2026-03-05T10:00:00Z",
    processed_at: "2026-03-06T14:00:00Z",
    notes: null,
  },
  {
    id: "2",
    nomade_id: "1",
    nomade_name: "Lucas Ferreira",
    amount: 2800.00,
    status: "pending",
    bank_name: null,
    bank_agency: null,
    bank_account: null,
    pix_key: "lucas.ferreira@allka.com",
    requested_at: "2026-04-02T09:00:00Z",
    processed_at: null,
    notes: null,
  },
  {
    id: "3",
    nomade_id: "3",
    nomade_name: "Rafael Mendes",
    amount: 3200.00,
    status: "processing",
    bank_name: "Nubank",
    bank_agency: "0001",
    bank_account: "12345678-9",
    pix_key: null,
    requested_at: "2026-04-01T08:00:00Z",
    processed_at: null,
    notes: "Aguardando confirmação bancária",
  },
  {
    id: "4",
    nomade_id: "5",
    nomade_name: "Diego Almeida",
    amount: 1600.00,
    status: "rejected",
    bank_name: "Bradesco",
    bank_agency: "5678",
    bank_account: "98765-4",
    pix_key: null,
    requested_at: "2026-03-15T10:00:00Z",
    processed_at: "2026-03-16T09:00:00Z",
    notes: "Dados bancários inválidos — solicitar correção",
  },
];

export const mockFinancialStats: MockFinancialStats = {
  total_revenue: 488500.00,
  revenue_this_month: 78500.00,
  revenue_last_month: 62000.00,
  pending_invoices: 2,
  overdue_invoices: 1,
  pending_withdrawals: 2,
  total_paid_to_nomades: 84200.00,
  mrr: 72000.00,
};
