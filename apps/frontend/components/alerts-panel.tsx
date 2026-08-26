// Lote de correção visual (ata 2026-08, revisão do responsável) — extraído
// de notification-preferences-panel.tsx (agora removido). Antes, Alertas
// era só uma aba dentro do painel do sino; o responsável rejeitou isso
// ("os dois acionadores abrem o mesmo painel/modal, apenas mudando a
// aba") e pediu um painel de verdade separado, aberto pela barra vertical
// direita (não mais ao lado do sino no cabeçalho). Este componente é
// EXCLUSIVO de alertas: fonte de dados, loading, erro e filtros próprios —
// nenhuma aba pra Notificações aqui.
import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Archive, ArchiveRestore, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeaderSlideScreen } from "@/components/header-slide-screen"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiClient } from "@/lib/api-client"
import {
  alertIcon, systemAlertLink, TASKS_ROUTE_BY_ACCOUNT_TYPE, type DisplayAlert,
  criticalityFromSeverity, criticalityLabel, criticalityDescription,
  criticalityIcon, criticalityBadgeColor, criticalityAccentBorder, type Criticality,
} from "@/components/alerts-header-icon"
import { useAccountType } from "@/contexts/account-type-context"
import { cn } from "@/lib/utils"

interface AlertsPanelProps {
  open?: boolean
  onClose?: () => void
}

export function AlertsPanel({ open = false, onClose }: AlertsPanelProps) {
  const { accountType } = useAccountType()
  const navigate = useNavigate()
  const isAgency = accountType === "agencias"

  const [alerts, setAlerts] = useState<DisplayAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      if (isAgency) {
        const res = await apiClient.getAgencyAlerts()
        const raw: any[] = res?.data ?? []
        setAlerts(raw.map((a) => ({
          id: a.id, type: a.type, severity: a.severity, title: a.title,
          message: a.description, link: a.link, count: a.count, isSystemAlert: false,
        })))
      } else {
        const res = await apiClient.getSystemAlerts({
          category: "alerta",
          is_read: showArchived ? undefined : false,
          is_archived: showArchived ? "true" : "false",
          limit: 50,
        })
        const raw: any[] = res?.data ?? []
        setAlerts(raw.map((a) => ({
          id: a.id, type: a.type, severity: a.severity, title: a.title,
          message: a.message, link: systemAlertLink(a.entity_type, a.entity_id, accountType),
          created_at: a.created_at, isSystemAlert: true,
        })))
      }
    } catch {
      setAlerts([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAgency, accountType, showArchived])

  useEffect(() => {
    if (open) void fetchAlerts()
  }, [open, fetchAlerts])

  useEffect(() => {
    setDismissed([])
  }, [showArchived])

  const activeAlerts = alerts.filter((a) => !dismissed.includes(a.id))

  async function dismiss(alert: DisplayAlert) {
    setDismissed((prev) => [...prev, alert.id])
    if (alert.isSystemAlert) {
      try { await apiClient.markSystemAlertRead(alert.id) } catch {}
    }
  }

  async function toggleArchive(alert: DisplayAlert) {
    setDismissed((prev) => [...prev, alert.id])
    try {
      if (showArchived) await apiClient.unarchiveSystemAlert(alert.id)
      else await apiClient.archiveSystemAlert(alert.id)
    } catch {}
  }

  async function dismissAll() {
    setDismissed(alerts.map((a) => a.id))
    if (!isAgency) {
      try { await apiClient.markAllSystemAlertsRead({ category: "alerta" }) } catch {}
    }
  }

  // Filtro por criticidade (Todos/Verde/Amarelo/Vermelho) — informação e
  // configuração exclusiva de alertas, nunca aparece no painel de
  // Notificações.
  const [criticalityFilter, setCriticalityFilter] = useState<"all" | Criticality>("all")
  const visibleAlerts = criticalityFilter === "all"
    ? activeAlerts
    : activeAlerts.filter((a) => criticalityFromSeverity[a.severity] === criticalityFilter)

  const FILTER_OPTIONS: { value: "all" | Criticality; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "verde", label: "Verde" },
    { value: "amarelo", label: "Amarelo" },
    { value: "vermelho", label: "Vermelho" },
  ]

  function handleView(link: string) {
    onClose?.()
    navigate(link)
  }

  return (
    <HeaderSlideScreen
      open={open}
      onClose={onClose}
      title="Alertas"
      subtitle="Situações que precisam de atenção, por criticidade"
      pin={{
        id: "global-alertas",
        label: "Alertas",
        icon: AlertTriangle,
        path: TASKS_ROUTE_BY_ACCOUNT_TYPE[accountType] ?? "/",
        activateKey: "open-alertas",
      }}
    >
      <div className="flex flex-col flex-1 min-h-0 w-full">
        <div className="flex items-center justify-between px-5 pt-3 gap-2 shrink-0">
          {!isAgency ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant={showArchived ? "ghost" : "secondary"} className="h-7 text-xs px-2.5" onClick={() => setShowArchived(false)}>
                Ativos
              </Button>
              <Button size="sm" variant={showArchived ? "secondary" : "ghost"} className="h-7 text-xs px-2.5 gap-1" onClick={() => setShowArchived(true)}>
                <Archive className="h-3 w-3" />
                Arquivados
              </Button>
            </div>
          ) : <div />}
          {activeAlerts.length > 0 && (
            <button onClick={dismissAll} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium whitespace-nowrap">
              Dispensar todos
            </button>
          )}
        </div>

        {/* Filtro por criticidade — nunca só cor: cada opção já é texto. */}
        <div className="flex items-center gap-1.5 px-5 pt-2.5 shrink-0" role="group" aria-label="Filtrar alertas por criticidade">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCriticalityFilter(value)}
              aria-pressed={criticalityFilter === value}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                criticalityFilter === value
                  ? "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && (
            <p className="text-sm text-red-500 text-center py-10">Não foi possível carregar os alertas agora.</p>
          )}
          {!error && loading && alerts.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>
          )}
          {!error && !loading && activeAlerts.length > 0 && visibleAlerts.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-10">Nenhum alerta com essa criticidade.</p>
          )}
          {!error && !loading && alerts.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-10">
              {showArchived ? "Nenhum alerta arquivado." : "Nenhum alerta ativo no momento."}
            </p>
          )}
          {!error && (
            <div className="px-5 pt-3 pb-4 space-y-3">
              {visibleAlerts.map((alert) => {
                const Icon = alertIcon(alert.type)
                const criticality = criticalityFromSeverity[alert.severity]
                const CriticalityIcon = criticalityIcon[criticality]
                return (
                  <div key={alert.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border border-l-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all",
                      criticalityAccentBorder[criticality],
                    )}>
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-slate-500" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{alert.title}</p>
                        {alert.count !== undefined && alert.count > 1 && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">{alert.count}</Badge>
                        )}
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                className={cn("text-xs ml-auto gap-1", criticalityBadgeColor[criticality])}
                                aria-label={`Criticidade: ${criticalityLabel[criticality]} — ${criticalityDescription[criticality]}`}
                              >
                                <CriticalityIcon className="h-3 w-3" aria-hidden="true" />
                                {criticalityLabel[criticality]}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-55">
                              {criticalityDescription[criticality]}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{alert.message}</p>
                      {alert.created_at && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(alert.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 px-2" onClick={() => handleView(alert.link)}>
                        Ver
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      {alert.isSystemAlert && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleArchive(alert)}
                          className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                          title={showArchived ? "Desarquivar" : "Arquivar"}
                        >
                          {showArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismiss(alert)}
                        className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                        title={alert.isSystemAlert ? "Marcar como lido" : "Dispensar"}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </HeaderSlideScreen>
  )
}
