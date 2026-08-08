
import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, ArrowRight, X, ExternalLink, CheckSquare, Briefcase, DollarSign, Settings, Info, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api-client"
import { useAccountType } from "@/contexts/account-type-context"
import { useGlobalHeaderPanel } from "@/contexts/global-header-panel-context"
import { HeaderSlideScreen } from "@/components/header-slide-screen"

// Unified display alert — normalized from both ApiAlert and AgencyAlert
interface DisplayAlert {
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

function alertIcon(type: string): React.ElementType {
  if (type.includes("approval") || type.includes("tarefa") || type.includes("task")) return CheckSquare
  if (type.includes("overdue") || type.includes("expired")) return Clock
  if (type.includes("projeto") || type.includes("project")) return Briefcase
  if (type.includes("financ") || type.includes("pagamento")) return DollarSign
  if (type.includes("sistema") || type.includes("system")) return Settings
  if (type.includes("warning")) return AlertCircle
  return Info
}

function systemAlertLink(entity_type: string | null): string {
  if (entity_type === "project_task") return "/agency/tarefas"
  if (entity_type === "project") return "/agency/projetos"
  return "/admin/alertas"
}

const severityColor: Record<DisplayAlert["severity"], string> = {
  error: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
  warning: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  info: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
}

const severityLabel: Record<DisplayAlert["severity"], string> = {
  error: "Crítico",
  warning: "Atenção",
  info: "Info",
}

export function AlertsHeaderIcon() {
  const [displayAlerts, setDisplayAlerts] = useState<DisplayAlert[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const { isActive, openPanel, closePanel } = useGlobalHeaderPanel()
  const modalOpen = isActive("alerts")
  const setModalOpen = (v: boolean) => (v ? openPanel("alerts") : closePanel("alerts"))
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const navigate = useNavigate()
  const { accountType } = useAccountType()

  const isAgency = accountType === "agencias"

  const fetchAlerts = useCallback(async () => {
    try {
      if (isAgency) {
        const res = await apiClient.getAgencyAlerts()
        const raw: AgencyAlert[] = res?.data ?? []
        setDisplayAlerts(raw.map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          message: a.description,
          link: a.link,
          count: a.count,
          isSystemAlert: false,
        })))
      } else {
        const res = await apiClient.getSystemAlerts({ is_read: false, limit: 20 })
        const raw: ApiAlert[] = res?.data ?? []
        setDisplayAlerts(raw.map((a) => ({
          id: a.id,
          type: a.type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          link: systemAlertLink(a.entity_type),
          created_at: a.created_at,
          isSystemAlert: true,
        })))
      }
    } catch {
      // silently fail — header icon is non-critical
    }
  }, [isAgency])

  useEffect(() => {
    fetchAlerts()
    const id = setInterval(fetchAlerts, 60_000)
    return () => clearInterval(id)
  }, [fetchAlerts])

  const activeAlerts = displayAlerts.filter((a) => !dismissed.includes(a.id))
  const highCount = activeAlerts.filter((a) => a.severity === "error").length
  const hasAlerts = activeAlerts.length > 0

  const handleDismiss = async (alert: DisplayAlert, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed((prev) => [...prev, alert.id])
    if (alert.isSystemAlert) {
      try { await apiClient.markSystemAlertRead(alert.id) } catch {}
    }
  }

  return (
    <>
      {/* Alert icon — floating, fixo abaixo da Bandeja de Telas */}
      <div
        className="hidden xl:block fixed top-[165px] right-[8px] z-50 group"
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
      >
        <button
          type="button"
          onClick={() => hasAlerts && setModalOpen(true)}
          aria-label="Alertas do sistema"
          className={cn(
            "relative flex items-center justify-center h-10 w-10 transition-colors",
            hasAlerts ? "cursor-pointer text-white/70 hover:text-white" : "cursor-default text-white/40",
          )}
        >
          <AlertTriangle
            className={cn("h-5 w-5 shrink-0", hasAlerts && "animate-pulse")}
          />
          {hasAlerts && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none pointer-events-none">
              {activeAlerts.length}
            </span>
          )}
        </button>

        {/* Tooltip */}
        {tooltipVisible && (
          <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-100 shadow-xl border border-white/10 z-50">
            {hasAlerts ? (
              <>
                <strong>{activeAlerts.length} alerta{activeAlerts.length > 1 ? "s" : ""}</strong>
                {highCount > 0 && <span className="text-red-300"> ({highCount} crítico{highCount > 1 ? "s" : ""})</span>}
              </>
            ) : (
              "Nenhum alerta no momento"
            )}
          </span>
        )}
      </div>

      {/* Tela Slide */}
      <HeaderSlideScreen
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAgency ? "Alertas da Agency" : "Alertas do Sistema"}
        subtitle={
          <>
            {activeAlerts.length} ite{activeAlerts.length !== 1 ? "ns" : "m"} requer{activeAlerts.length !== 1 ? "em" : ""} atenção
            {highCount > 0 && (
              <span className="ml-1 text-red-300 font-medium">• {highCount} crítico{highCount > 1 ? "s" : ""}</span>
            )}
          </>
        }
        footer={
          activeAlerts.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={async () => {
                  setDismissed(displayAlerts.map((a) => a.id))
                  setModalOpen(false)
                  if (!isAgency) {
                    try { await apiClient.markAllSystemAlertsRead() } catch {}
                  }
                }}
              >
                Dispensar todos
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs gap-1.5 btn-brand"
                onClick={() => {
                  setModalOpen(false)
                  navigate(isAgency ? "/agency/tarefas" : "/admin/alertas")
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {isAgency ? "Ver Tarefas" : "Central de Atenções"}
              </Button>
            </div>
          )
        }
      >
          <div className="flex-1 overflow-y-auto p-6 space-y-3 w-full">
              {activeAlerts.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                  Nenhum alerta ativo no momento.
                </p>
              ) : (
                activeAlerts.map((alert) => {
                  const Icon = alertIcon(alert.type)
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border-2 transition-all shadow-sm hover:shadow-md",
                        severityColor[alert.severity],
                      )}
                    >
                      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{alert.title}</p>
                          {alert.count !== undefined && alert.count > 1 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {alert.count}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs ml-auto",
                              alert.severity === "error"
                                ? "border-red-400 text-red-600 dark:text-red-400"
                                : alert.severity === "warning"
                                ? "border-amber-400 text-amber-600 dark:text-amber-400"
                                : "border-blue-400 text-blue-600 dark:text-blue-400",
                            )}
                          >
                            {severityLabel[alert.severity]}
                          </Badge>
                        </div>
                        <p className="text-xs mt-1 opacity-80">{alert.message}</p>
                        {alert.created_at && (
                          <p className="text-[10px] mt-0.5 opacity-50">
                            {new Date(alert.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs h-7 px-2"
                          onClick={() => {
                            setModalOpen(false)
                            navigate(alert.link)
                          }}
                        >
                          Ver
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleDismiss(alert, e)}
                          className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                          title={alert.isSystemAlert ? "Marcar como lido" : "Dispensar"}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
      </HeaderSlideScreen>
    </>
  )
}
