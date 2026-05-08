export interface AdminProfile {
  id: string
  name: string
  description: string
  is_master: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  users: AdminUser[]
  permissions: AdminPermission[]
}

export interface AdminUser {
  id: number
  name: string
  email: string
  profile_id: string
  is_active: boolean
  last_login?: string
  created_at: string
}

export interface AdminPermission {
  id: string
  profile_id: string
  module: string
  action: PermissionAction
  resource?: string
  conditions?: PermissionCondition[]
}

export type PermissionAction = "view" | "edit" | "create" | "delete" | "not_applicable"

export interface PermissionCondition {
  type: "own_only" | "department_only" | "all"
  value?: string
}

export interface PermissionModule {
  id: string
  name: string
  description: string
  category: string
  resources: PermissionResource[]
}

export interface PermissionResource {
  id: string
  name: string
  description: string
  actions: PermissionAction[]
  conditions?: PermissionCondition[]
}

export interface PermissionMatrix {
  modules: PermissionModule[]
  profiles: AdminProfile[]
  permissions: AdminPermission[]
}

// Predefined modules and resources
export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "clients",
    name: "Clientes",
    description: "Gestão de empresas e contas de clientes",
    category: "user_management",
    resources: [
      {
        id: "client_registration",
        name: "Cadastro de Clientes",
        description: "Criar e gerenciar cadastros de empresas",
        actions: ["view", "edit", "create", "delete"],
      },
      {
        id: "client_projects",
        name: "Projetos de Clientes",
        description: "Gerenciar projetos e contratos",
        actions: ["view", "edit", "create", "delete"],
      },
      {
        id: "client_account_data",
        name: "Dados da Conta",
        description: "Informações financeiras e configurações",
        actions: ["view", "edit", "not_applicable"],
      },
    ],
  },
  {
    id: "users",
    name: "Usuários",
    description: "Gestão de usuários do sistema",
    category: "user_management",
    resources: [
      {
        id: "user_registration",
        name: "Cadastro de Usuários",
        description: "Criar novos usuários no sistema",
        actions: ["view", "edit", "create", "delete"],
      },
      {
        id: "user_deactivation",
        name: "Inativação de Usuários",
        description: "Desativar ou suspender contas",
        actions: ["view", "edit", "not_applicable"],
      },
      {
        id: "user_data_editing",
        name: "Edição de Dados",
        description: "Modificar informações de usuários",
        actions: ["view", "edit", "not_applicable"],
      },
    ],
  },
  {
    id: "nomads",
    name: "Nômades",
    description: "Gestão de profissionais freelancers",
    category: "user_management",
    resources: [
      {
        id: "nomad_registration",
        name: "Cadastro de Nômades",
        description: "Registrar novos profissionais",
        actions: ["view", "edit", "create", "delete"],
      },
      {
        id: "nomad_performance",
        name: "Gestão de Performance",
        description: "Avaliar e monitorar desempenho",
        actions: ["view", "edit", "not_applicable"],
      },
      {
        id: "nomad_qualifications",
        name: "Habilitações",
        description: "Gerenciar certificações e habilidades",
        actions: ["view", "edit", "create", "delete"],
      },
      {
        id: "nomad_data_editing",
        name: "Edição de Dados",
        description: "Modificar informações de nômades",
        actions: ["view", "edit", "not_applicable"],
      },
    ],
  },
  {
    id: "administrators",
    name: "Administradores",
    description: "Gestão de usuários administrativos",
    category: "admin_management",
    resources: [
      {
        id: "admin_registration",
        name: "Cadastro de Administradores",
        description: "Criar novos usuários administrativos",
        actions: ["view", "edit", "create", "delete"],
      },
      {
        id: "permission_management",
        name: "Gestão de Permissões",
        description: "Configurar perfis e permissões",
        actions: ["view", "edit", "create", "delete"],
      },
      {
        id: "profile_editing",
        name: "Edição de Perfis",
        description: "Modificar perfis administrativos",
        actions: ["view", "edit", "not_applicable"],
      },
    ],
  },
  {
    id: "leads",
    name: "Leads",
    description: "Gestão de leads e oportunidades",
    category: "sales_marketing",
    resources: [
      {
        id: "lead_management",
        name: "Gestão de Leads",
        description: "Gerenciar leads e oportunidades",
        actions: ["view", "edit", "create", "delete"],
        conditions: [
          { type: "own_only", value: "Apenas seus próprios leads" },
          { type: "all", value: "Todos os leads da plataforma" },
        ],
      },
    ],
  },
]
