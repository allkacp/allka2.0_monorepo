export interface UserLGPD {
  consent_given: boolean;
  consent_date: string;
  consent_version: string;
  legal_basis:
    | "consent"
    | "contract"
    | "legitimate_interest"
    | "legal_obligation";
  data_retention_until: string;
  communication_opt_in: boolean;
  data_export_requested: boolean;
  data_export_requested_at?: string;
  deletion_requested: boolean;
  deletion_requested_at?: string;
  data_processing_purposes: string[];
  consent_history: { date: string; version: string; action: string }[];
}

export interface CompanyLGPD {
  dpo_name: string;
  dpo_email: string;
  dpo_phone?: string;
  privacy_policy_accepted: boolean;
  policy_accepted_at: string;
  policy_version: string;
  data_processing_purposes: string[];
  security_incidents: {
    date: string;
    description: string;
    resolved: boolean;
  }[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  account_type: AccountType;
  account_sub_type: AccountSubType | null;
  company_id?: string;
  agency_id?: string;
  role: UserRole;
  permissions: Permission[];
  is_admin: boolean;
  is_active: boolean;
  last_project_date?: string;
  created_at: string;
  updated_at: string;
  online_status?: "online" | "offline" | "busy" | "away";
  last_login?: string;
  address?: {
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    latitude?: number;
    longitude?: number;
  };
  company_associations?: CompanyAssociation[];
  agency_associations?: AgencyAssociation[];
  active_company_id?: string;
  active_agency_id?: string;
  company?: Company;
  agency?: Agency;
  lgpd?: UserLGPD;
}

// Per-company category-based permissions (managed by company admin/responsible)
export interface CompanyPermission {
  id: string;
  name: string;
  enabled: boolean;
}

export interface CompanyPermissions {
  gestao: CompanyPermission[];
  tasks: CompanyPermission[];
  projects: CompanyPermission[];
  users: CompanyPermission[];
}

export const DEFAULT_COMPANY_PERMISSIONS: CompanyPermissions = {
  gestao: [
    { id: "hire_services", name: "Contratar serviços", enabled: false },
    { id: "insert_credit", name: "Inserir crédito", enabled: false },
    { id: "approve_payments", name: "Aprovar pagamentos", enabled: false },
  ],
  tasks: [
    { id: "create_tasks", name: "Criar tarefas", enabled: false },
    { id: "approve_tasks", name: "Aprovar tarefas", enabled: false },
    { id: "edit_tasks", name: "Editar tarefas", enabled: false },
    { id: "delete_tasks", name: "Excluir tarefas", enabled: false },
  ],
  projects: [
    { id: "create_projects", name: "Criar projetos", enabled: false },
    { id: "edit_projects", name: "Editar projetos", enabled: false },
    { id: "delete_projects", name: "Excluir projetos", enabled: false },
  ],
  users: [
    { id: "create_users", name: "Criar usuários", enabled: false },
    { id: "edit_users", name: "Editar usuários", enabled: false },
    { id: "block_users", name: "Bloquear usuários", enabled: false },
  ],
};

// Admin company permissions (all enabled by default)
export const ADMIN_COMPANY_PERMISSIONS: CompanyPermissions = {
  gestao: [
    { id: "hire_services", name: "Contratar serviços", enabled: true },
    { id: "insert_credit", name: "Inserir crédito", enabled: true },
    { id: "approve_payments", name: "Aprovar pagamentos", enabled: true },
  ],
  tasks: [
    { id: "create_tasks", name: "Criar tarefas", enabled: true },
    { id: "approve_tasks", name: "Aprovar tarefas", enabled: true },
    { id: "edit_tasks", name: "Editar tarefas", enabled: true },
    { id: "delete_tasks", name: "Excluir tarefas", enabled: true },
  ],
  projects: [
    { id: "create_projects", name: "Criar projetos", enabled: true },
    { id: "edit_projects", name: "Editar projetos", enabled: true },
    { id: "delete_projects", name: "Excluir projetos", enabled: true },
  ],
  users: [
    { id: "create_users", name: "Criar usuários", enabled: true },
    { id: "edit_users", name: "Editar usuários", enabled: true },
    { id: "block_users", name: "Bloquear usuários", enabled: true },
  ],
};

// Granular permissions a user can hold on a specific project
export type ProjectPermission =
  | "view"
  | "edit"
  | "create_tasks"
  | "delete_tasks"
  | "approve_deliveries"
  | "manage_finances"
  | "manage_team"
  | "admin";

export const ALL_PROJECT_PERMISSIONS: {
  id: ProjectPermission;
  label: string;
  description: string;
}[] = [
  {
    id: "view",
    label: "Visualizar",
    description: "Ver o projeto e suas tarefas",
  },
  {
    id: "edit",
    label: "Editar",
    description: "Editar dados e configurações do projeto",
  },
  {
    id: "create_tasks",
    label: "Criar Tarefas",
    description: "Criar novas tarefas no projeto",
  },
  {
    id: "delete_tasks",
    label: "Excluir Tarefas",
    description: "Remover tarefas do projeto",
  },
  {
    id: "approve_deliveries",
    label: "Aprovar Entregas",
    description: "Validar e aprovar entregas",
  },
  {
    id: "manage_finances",
    label: "Gerenciar Finanças",
    description: "Ver e editar dados financeiros do projeto",
  },
  {
    id: "manage_team",
    label: "Gerenciar Equipe",
    description: "Adicionar/remover membros do projeto",
  },
  {
    id: "admin",
    label: "Administrador",
    description: "Acesso total ao projeto",
  },
];

// A user's membership in a specific project (within a company context)
export interface ProjectMembership {
  project_id: number;
  project_name: string;
  permissions: ProjectPermission[];
}

export interface CompanyAssociation {
  id: number;
  user_id: number;
  company_id: number;
  company_name: string;
  role: UserRole;
  /** Platform-level flat permissions (managed by platform admin only) */
  permissions: Permission[];
  /** Company-level category permissions (managed by company admin/responsible) */
  company_permissions: CompanyPermissions;
  /** Per-project permissions within this company */
  project_memberships: ProjectMembership[];
  is_active: boolean;
  joined_at: string;
}

/** Lightweight version used in context/UI when full Company object isn't needed */
export interface CompanyLink {
  company_id: number;
  company_name: string;
  role: UserRole;
  company_permissions: CompanyPermissions;
  project_memberships: ProjectMembership[];
  is_active: boolean;
  joined_at: string;
}

/** Project list per company - populated from API */
export const MOCK_COMPANY_PROJECTS: Record<
  number,
  { id: number; name: string; status: string }[]
> = {};

export interface AgencyAssociation {
  id: number;
  user_id: number;
  agency_id: number;
  agency: Agency;
  role: UserRole;
  permissions: Permission[];
  is_active: boolean;
  joined_at: string;
}

export interface Company {
  id: number;
  name: string;
  email: string;
  phone?: string;
  document: string;
  account_type: "dependent" | "independent";
  agency_id?: number;
  is_active: boolean;
  last_project_date?: string;
  ai_knowledge_base: AIKnowledgeBase;
  created_at: string;
  updated_at: string;
  agency?: Agency;
  users: User[];
  projects: Project[];
}

export interface Agency {
  id: number;
  name: string;
  email: string;
  phone?: string;
  document: string;
  partner_level: "basic" | "premium" | "elite";
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  companies: Company[];
  users: User[];
}

export interface AIKnowledgeBase {
  id: number;
  company_id: number;
  summary: string;
  briefing_history: BriefingHistory[];
  contracting_patterns: ContractingPattern[];
  guidelines: Guideline[];
  last_updated: string;
  auto_generated: boolean;
}

export interface BriefingHistory {
  id: number;
  project_name: string;
  brief_summary: string;
  key_requirements: string[];
  date: string;
}

export interface ContractingPattern {
  service_type: string;
  frequency: number;
  average_budget: number;
  preferred_timeline: string;
}

export interface Guideline {
  category: string;
  description: string;
  importance: "high" | "medium" | "low";
}

export type AccountType =
  | "empresas"
  | "agencias"
  | "nomades"
  | "admin"
  | "parceiro";
export type AccountSubType = "company" | "in-house" | null;

export type UserRole =
  | "company_admin"
  | "company_user"
  | "agency_admin"
  | "agency_user"
  | "nomad"
  | "admin"
  | "partner";

export type Permission =
  | "view_projects"
  | "create_projects"
  | "edit_projects"
  | "cancel_projects"
  | "view_catalog"
  | "purchase_services"
  | "manage_users"
  | "view_payments"
  | "manage_payments"
  | "approve_deliveries"
  | "access_ai_knowledge"
  | "edit_ai_knowledge"
  | "view_analytics"
  | "admin_access"
  | "view_partner_dashboard"
  | "request_withdrawal";

export interface Project {
  id: number;
  name: string;
  description?: string;
  company_id: number;
  status: "active" | "completed" | "paused" | "cancelled";
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}
