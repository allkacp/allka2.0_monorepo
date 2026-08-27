
// Ex-AlertsHeaderIcon: era um ícone flutuante separado do sino, depois virou
// aba "Alertas" dentro do painel do sino — o responsável rejeitou essa
// versão combinada na revisão visual (ata 2026-08) e pediu um painel de
// verdade separado. Hoje é AlertsPanel (components/alerts-panel.tsx),
// aberto por AlertsFloatingIcon na barra vertical direita. Este arquivo só
// guarda os helpers puros (ícone por tipo, cor/label de severidade e
// criticidade) que AlertsPanel e o resto da plataforma reaproveitam —
// nenhum componente aqui é renderizado diretamente.
import { CheckSquare, Briefcase, DollarSign, Settings, Info, Clock, AlertCircle, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react"
import type { AccountType } from "@/contexts/account-type-context"

// Unified display alert — normalized from both ApiAlert and AgencyAlert
export interface DisplayAlert {
  id: string
  type: string
  severity: "error" | "warning" | "info"
  title: string
  message: string
  // Reparo "Ver alerta" (ata 2026-08): null = sem destino conhecido (Avulso
  // sem referência, ocorrência de Programação, tipo não reconhecido) — o
  // botão "Ver" não deve existir/deve aparecer desabilitado, nunca navegar
  // pra undefined nem abrir aba vazia. Sempre um caminho interno seguro
  // (nunca javascript:/data:/URL externa) — ver systemAlertLink abaixo.
  link: string | null
  count?: number
  created_at?: string
  isSystemAlert: boolean
  // Banner de imagem (ata 2026-08, 5º lote) — só o feed pessoal
  // (GET /api/system-alerts) preenche isso; alertas de agência nunca têm
  // essas propriedades. `image_url` já vem como caminho relativo
  // "/api/system-alerts/:id/image" — resolver com
  // apiClient.resolveAlertImageUrl antes de buscar o blob autenticado.
  has_image?: boolean
  image_url?: string | null
  image_alt?: string | null
  // Resolução formal de alerta crítico (ata 2026-08, 10º lote) — só o feed
  // pessoal preenche isto. `manual_resolved_at` nulo = não resolvido
  // (nunca confundir com o `resolved_at` do motor automático, que este
  // tipo nem expõe). `resolution_action` é a chave fechada
  // ("correcao_aplicada" etc.), `resolvedByName` já vem resolvido em lote
  // pelo backend — nunca um segundo fetch por item.
  manual_resolved_at?: string | null
  resolution_action?: string | null
  resolvedByName?: string | null
  is_archived?: boolean
}

interface ApiAlert {
  id: string
  type: string
  title: string
  message: string
  severity: "info" | "warning" | "error"
  entity_type: string | null
  entity_id: string | null
  // Reparo "Ver alerta": "pai" navegável (ex.: id da tarefa que contém uma
  // etapa) — só preenchido quando entity_id sozinho não basta pra montar o
  // destino. Ver systemAlertLink.
  entity_parent_id?: string | null
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
  // Admin (ata 2026-08, 6º lote — destino "Projeto" do Avulso): rota real
  // já existe (/admin/projetos/:projectId, ver App.tsx), só faltava aqui.
  admin: (id) => `/admin/projetos/${id}`,
}

// Reparo "Ver alerta" (ata 2026-08) — só caminho interno relativo, montado
// exclusivamente pelos builders fechados acima (nunca texto livre/dado do
// usuário). Barreira extra mesmo assim: nunca aceita `javascript:`,
// `data:`, protocolo (`algo:`), URL absoluta (`http://…`) nem
// protocol-relative (`//host`) — só `/algo`.
export function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith("/")) return false
  if (path.startsWith("//")) return false
  if (path.includes(":")) return false
  return true
}

// Só os tipos abaixo têm uma tela real associada — qualquer outro
// (Avulso sem referência, ocorrência de Alerta Programado — `entity_type`
// "alert_schedule", nunca uma tela própria — ou um tipo desconhecido)
// devolve null: o botão "Ver" não deve existir/deve ficar desabilitado,
// nunca navegar pra undefined nem abrir aba vazia. Nunca "/admin/alertas"
// como resposta genérica pra "não sei" — essa rota só existe dentro do
// portal admin; pra qualquer outro account_type ela nem carrega.
export function systemAlertLink(
  entity_type: string | null,
  entity_id: string | null,
  accountType: AccountType,
  entity_parent_id?: string | null,
): string | null {
  let path: string | null = null

  if (entity_type === "project_task") {
    path = entity_id && TASK_LINK_BUILDERS[accountType] ? TASK_LINK_BUILDERS[accountType]!(entity_id) : TASKS_ROUTE_BY_ACCOUNT_TYPE[accountType]
  } else if (entity_type === "project_task_stage") {
    // Etapa: a plataforma não tem tela exclusiva de etapa — abre a TAREFA
    // que contém a etapa (entity_parent_id, resolvido no backend na hora
    // de criar a ocorrência), nunca inventa uma página. Sem parent id
    // conhecido (ocorrência antiga, anterior a este reparo), cai na lista
    // geral de tarefas do próprio portal — nunca em branco.
    path = entity_parent_id && TASK_LINK_BUILDERS[accountType]
      ? TASK_LINK_BUILDERS[accountType]!(entity_parent_id)
      : TASKS_ROUTE_BY_ACCOUNT_TYPE[accountType]
  } else if (entity_type === "project") {
    path = entity_id && PROJECT_LINK_BUILDERS[accountType] ? PROJECT_LINK_BUILDERS[accountType]!(entity_id) : TASKS_ROUTE_BY_ACCOUNT_TYPE[accountType]
  }
  // entity_type null (Avulso sem referência), "alert_schedule" (ocorrência
  // de Programação — nunca teve tela própria) ou qualquer tipo não
  // reconhecido: sem destino, `path` continua null.

  if (!path || !isSafeInternalPath(path)) return null
  return path
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

// ─── Criticidade (ata 2026-08: "separar alertas de notificações") ──────────
//
// A reunião pediu literalmente verde/amarelo/vermelho para a criticidade do
// ALERTA — distinto de `severity` (info/warning/error), que já existe no
// banco mas comunica o "tom" da mensagem (inclusive de notificações comuns)
// e é colorido vermelho/âmbar/azul, não verde/amarelo/vermelho. Em vez de
// criar uma coluna nova só pra isso, `criticality` é derivado
// determinísticamente do `severity` já existente — vale só para alertas
// (a aba Alertas usa isso; a de Notificações nunca chama estes helpers),
// nunca para notificação comum, e nunca precisa de migration/backfill:
// todo SystemAlert (antigo ou novo) já tem `severity`.
export type Criticality = "verde" | "amarelo" | "vermelho"

export const criticalityFromSeverity: Record<DisplayAlert["severity"], Criticality> = {
  info: "verde",
  warning: "amarelo",
  error: "vermelho",
}

export const criticalityLabel: Record<Criticality, string> = {
  verde: "Verde",
  amarelo: "Amarelo",
  vermelho: "Vermelho",
}

// Texto de apoio pro tooltip de cada nível — nunca comunique só pela cor.
export const criticalityDescription: Record<Criticality, string> = {
  verde: "Informativo ou atenção leve, sem urgência imediata.",
  amarelo: "Requer atenção — prazo próximo ou pendência relevante.",
  vermelho: "Crítico — vencido, bloqueador ou exige intervenção rápida.",
}

export const criticalityIcon: Record<Criticality, React.ElementType> = {
  verde: CheckCircle2,
  amarelo: AlertTriangle,
  vermelho: AlertOctagon,
}

// Chip sólido — cor própria de criticidade, para não confundir com o azul
// de `severityBadgeColor` (que significa outra coisa).
//
// Amarelo usa `yellow-*`, nunca `amber-*` — correção pedida pelo responsável
// depois da revisão visual do lote anterior (âmbar lia como laranja). Texto
// escuro (`yellow-900`/`yellow-950`) sobre fundo amarelo sólido: branco sobre
// yellow-400/500 não tem contraste suficiente (WCAG), então este é o único
// badge de criticidade que não usa texto branco.
export const criticalityBadgeColor: Record<Criticality, string> = {
  verde: "bg-emerald-600 text-white border-transparent dark:bg-emerald-500",
  amarelo: "bg-yellow-400 text-yellow-900 border-transparent dark:bg-yellow-500 dark:text-yellow-950",
  vermelho: "bg-red-600 text-white border-transparent dark:bg-red-500",
}

// Resolução formal de alerta crítico (ata 2026-08, 10º lote) — espelha
// EXATAMENTE RESOLUTION_ACTIONS/RESOLUTION_ACTION_LABEL do backend
// (system-alerts.ts). Única fonte de rótulos — nunca duplicar strings
// soltas no formulário/lista.
export const RESOLUTION_ACTIONS = [
  "correcao_aplicada",
  "responsavel_acionado",
  "processo_ajustado",
  "falso_positivo",
  "outra_acao",
] as const
export type ResolutionAction = (typeof RESOLUTION_ACTIONS)[number]
export const RESOLUTION_ACTION_LABEL: Record<ResolutionAction, string> = {
  correcao_aplicada: "Correção aplicada",
  responsavel_acionado: "Responsável acionado",
  processo_ajustado: "Processo ajustado",
  falso_positivo: "Alerta identificado como falso positivo",
  outra_acao: "Outra ação",
}

// Faixa lateral (borda esquerda) — identifica a criticidade sem pintar o
// card inteiro (pedido do responsável: "não pinte todo o painel de forma
// pesada"). Usado em AlertsPanel junto com um card neutro (branco/slate).
export const criticalityAccentBorder: Record<Criticality, string> = {
  verde: "border-l-emerald-500",
  amarelo: "border-l-yellow-400",
  vermelho: "border-l-red-500",
}

