import type { SocialLink } from "@/components/company-social-links-manager";

/**
 * Tipo único da empresa como ela aparece na área administrativa.
 *
 * Antes existiam três declarações separadas do mesmo conceito — uma na página
 * `admin/empresas`, uma no painel de ver e outra no painel de editar — e elas
 * foram divergindo: `social_links` com e sem `order`, métricas de uso ora
 * obrigatórias ora não, `"all"` (que é valor de filtro) dentro da união de
 * tipo da entidade. Passar a empresa da página para os painéis só funcionava
 * com conversão forçada, o que escondia qualquer divergência nova.
 *
 * Este arquivo é o lugar de fazer a mudança quando um campo novo aparecer.
 */

/** O que a empresa é. `"all"` não entra aqui: é filtro, não tipo. */
export type CompanyType = "company" | "agency" | "nomad";

/** Situação da empresa. Mesmo caso: `"all"` é filtro. */
export type CompanyStatus = "active" | "inactive" | "pending";

/** Valor aceito pelos seletores de filtro da listagem. */
export type CompanyTypeFilter = CompanyType | "all";
export type CompanyStatusFilter = CompanyStatus | "all";

export interface CompanyLGPDInfo {
  dpo_name?: string;
  dpo_email?: string;
  dpo_phone?: string;
  privacy_policy_accepted: boolean;
  policy_accepted_at?: string;
  policy_version?: string;
  data_processing_purposes?: string[];
  security_incidents?: {
    date: string;
    description: string;
    resolved: boolean;
  }[];
}

export interface Company {
  /** Sequencial de exibição (emp_1, emp_2...), usado na URL e na tela. */
  id: number;
  /**
   * Id real do registro na API (cuid). O `id` acima é só o sequencial — usá-lo
   * numa chamada de API não encontra nada.
   */
  _apiId?: string;
  sequence_number?: number;

  name: string;
  legal_name?: string;
  type: CompanyType;
  status: CompanyStatus;
  email: string;
  phone: string;
  phone_secondary?: string;
  whatsapp?: string;
  website?: string;
  document: string;
  /** Mesmo dado de `document`, com o nome que os exports usam. */
  cnpj?: string;
  ie?: string;
  location: string;
  segment?: string;
  description?: string;
  observations?: string;

  /** Plano contratado, quando a empresa tem um. */
  plan?: string;
  account_type?: "premium" | "independent";
  partner_level?: string;
  program_level?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  is_partner?: boolean;
  /** Situação no programa de parceria, quando houve convite. */
  partner_status?: string;

  users_count: number;
  projects_count: number;
  created_at: string;
  /**
   * Métricas de uso: dependem de telemetria e a API nem sempre devolve.
   * Por isso são opcionais — declará-las obrigatórias fazia toda conversão
   * vinda do adapter falhar.
   */
  users_online?: number;
  mau?: number;
  dau?: number;
  /** Contadores alternativos usados pelos exports do painel de editar. */
  activeUsers?: number;
  totalUsers?: number;
  projects?: number;

  bitrix_id?: string;
  asaas_id?: string;
  avatar?: string;
  logo?: string;

  // ── Endereço ────────────────────────────────────────────────────────────
  address?: string;
  zip_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;

  // ── Recebimento ─────────────────────────────────────────────────────────
  pix_key?: string;
  pix_type?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: string;

  admin_notes?: string;
  internal_notes?: string;
  social_links?: SocialLink[];
  lgpd?: CompanyLGPDInfo;

  // ── Contato comercial ───────────────────────────────────────────────────
  commercial_contact_name?: string;
  commercial_contact_role?: string;
  commercial_contact_email?: string;
  commercial_contact_phone?: string;
  commercial_contact_whatsapp?: string;
  commercial_contact_preferred_channel?: string;
  commercial_contact_notes?: string;

  // ── Contato financeiro ──────────────────────────────────────────────────
  financial_contact_name?: string;
  financial_contact_role?: string;
  financial_contact_email?: string;
  financial_contact_phone?: string;
  financial_contact_whatsapp?: string;
  financial_contact_preferred_channel?: string;
  financial_contact_notes?: string;
  financial_contact_user_id?: string;
  use_master_as_financial_fallback?: boolean;
}
