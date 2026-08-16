
// Ex-AlertsHeaderIcon: era um ícone flutuante separado do sino, mostrando o
// mesmo feed (SystemAlert) sem nenhuma distinção — virou a aba "Alertas"
// dentro do painel do sino (ver notification-preferences-panel.tsx,
// componente AlertasTab). Este arquivo agora só guarda os helpers puros que
// aquela aba (e o resto da plataforma) reaproveita — nenhum componente aqui
// é mais renderizado diretamente.
import { CheckSquare, Briefcase, DollarSign, Settings, Info, Clock, AlertCircle } from "lucide-react"
import type { AccountType } from "@/contexts/account-type-context"

// Unified display alert — normalized from both ApiAlert and AgencyAlert
export interface DisplayAlert {
  id: string
  type: string
  severity: "error" | "warning" | "info"
  title: string
  message: string
  link: string
  count?: number
  created_at?: string
  isSystemAlert: boolean
}

interface ApiAlert {
  id: string
  type: string
  title: string
  message: string
  severity: "info" | "warning" | "error"
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

interface AgencyAlert {
  id: string
  type: string
  severity: "error" | "warning" | "info"
  title: string
  description: string
  count: number
  link: string
}

export function alertIcon(type: string): React.ElementType {
  if (type.includes("approval") || type.includes("tarefa") || type.includes("task")) return CheckSquare
  if (type.includes("overdue") || type.includes("expired")) return Clock
  if (type.includes("projeto") || type.includes("project")) return Briefcase
  if (type.includes("financ") || type.includes("pagamento")) return DollarSign
  if (type.includes("sistema") || type.includes("system")) return Settings
  if (type.includes("warning")) return AlertCircle
  return Info
}

// Rota da lista de tarefas própria de cada portal — nunca hardcoded pra
// "/agency/...": navegar pra lá quando o usuário não é agência aciona o
// AccountTypeProvider (que infere account_type pela URL quando não há
// perfil de dev simulado salvo, ver contexts/account-type-context.tsx) e
// troca o account_type do app inteiro — bug real reportado (alerta levava
// pra tela errada E "trocava a conta pra Agência" sozinho).
export const TASKS_ROUTE_BY_ACCOUNT_TYPE: Record<AccountType, string> = {
  agencias: "/agency/tarefas",
  admin: "/admin/tarefas",
  empresas: "/company/tarefas",
  nomades: "/nomades/minhastarefas",
  lider: "/leader/tarefas",
}

// Deep-link pra tarefa específica (abre o drawer de detalhe direto), só nos
// portais que já têm essa capacidade — cada um com sua própria convenção de
// URL (agencias/admin usam segmento de path; lider usa query param, igual
// ao resto daquela tela). empresas/nomades ainda não têm um jeito de abrir
// UMA tarefa por id (telas próprias, sem drawer) — cai na lista completa.
const TASK_LINK_BUILDERS: Partial<Record<AccountType, (id: string) => string>> = {
  agencias: (id) => `/agency/tarefas/${id}`,
  admin: (id) => `/admin/tarefas/${id}`,
  lider: (id) => `/leader/tarefas?tarefaId=${id}`,
}

const PROJECT_LINK_BUILDERS: Partial<Record<AccountType, (id: string) => string>> = {
  agencias: (id) => `/agency/projetos/${id}`,
}

export function systemAlertLink(
  entity_type: string | null,
  entity_id: string | null,
  accountType: AccountType,
): string {
  if (entity_type === "project_task") {
    if (entity_id && TASK_LINK_BUILDERS[accountType]) return TASK_LINK_BUILDERS[accountType]!(entity_id)
    return TASKS_ROUTE_BY_ACCOUNT_TYPE[accountType]
  }
  if (entity_type === "project") {
    if (entity_id && PROJECT_LINK_BUILDERS[accountType]) return PROJECT_LINK_BUILDERS[accountType]!(entity_id)
    return TASKS_ROUTE_BY_ACCOUNT_TYPE[accountType]
  }
  return "/admin/alertas"
}

export const severityColor: Record<DisplayAlert["severity"], string> = {
  error: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
  warning: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  info: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
}

// Chip com fundo sólido + texto branco, nunca "outline" transparente — o
// card já é tingido pela cor da severidade (severityColor acima), então um
// badge "outline" na mesma cor virava texto laranja sobre fundo laranja no
// warning (bug real reportado, ilegível).
export const severityBadgeColor: Record<DisplayAlert["severity"], string> = {
  error: "bg-red-600 text-white border-transparent dark:bg-red-500",
  warning: "bg-amber-600 text-white border-transparent dark:bg-amber-500",
  info: "bg-blue-600 text-white border-transparent dark:bg-blue-500",
}

export const severityLabel: Record<DisplayAlert["severity"], string> = {
  error: "Crítico",
  warning: "Atenção",
  info: "Info",
}

