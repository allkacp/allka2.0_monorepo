
import { useState, useEffect } from "react"
import { AlertTriangle, ArrowRight, X, MessageSquare, XCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"

interface SystemAlert {
  id: string
  type: "tarefas" | "mensagens" | "financeiro" | "projetos" | "sistema"
  severity: "high" | "medium" | "low"
  title: string
  description: string
  count: number
  link: string
  icon: React.ElementType
}

const mockAlerts: SystemAlert[] = [];

const severityColor: Record<SystemAlert["severity"], string> = {
  high: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300",
  medium: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  low: "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
}

const severityLabel: Record<SystemAlert["severity"], string> = {
  high: "Crítico",
  medium: "Médio",
  low: "Baixo",
}

export function AlertsHeaderIcon() {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const navigate = useNavigate()

  const activeAlerts = mockAlerts.filter((a) => !dismissed.includes(a.id))
  const highCount = activeAlerts.filter((a) => a.severity === "high").length
  const hasAlerts = activeAlerts.length > 0

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissed((prev) => [...prev, id])
  }

  return (
    <>
      {/* Alert icon button */}
      <div className="relative" onMouseEnter={() => setTooltipVisible(true)} onMouseLeave={() => setTooltipVisible(false)}>
        <button
          onClick={() => hasAlerts && setModalOpen(true)}
          className={cn(
            "relative flex items-center justify-center rounded-md transition-all duration-200",
            "h-8 w-8 sm:h-9 sm:w-9",
            hasAlerts
              ? "cursor-pointer text-red-400 hover:bg-white/10"
              : "cursor-default text-white/50",
          )}
          aria-label="Alertas do sistema"
        >
          <AlertTriangle
            className={cn(
              "transition-all duration-200",
              hasAlerts ? "h-5 w-5 sm:h-6 sm:w-6 animate-pulse" : "h-4 w-4 sm:h-5 sm:w-5",
            )}
          />
          {hasAlerts && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {activeAlerts.length}
            </span>
          )}
        </button>

        {/* Tooltip */}
        {tooltipVisible && (
          <div
            className={cn(
              "absolute top-full right-0 mt-2 z-100 w-max max-w-xs rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none",
              "animate-in fade-in-0 zoom-in-95 duration-150",
              hasAlerts
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-100 dark:bg-gray-700",
            )}
          >
            {hasAlerts ? (
              <span>
                <strong>{activeAlerts.length} alerta{activeAlerts.length > 1 ? "s" : ""}</strong>
                {highCount > 0 && <span className="text-red-200"> ({highCount} crítico{highCount > 1 ? "s" : ""})</span>}
                <br />
                <span className="opacity-90">Clique para visualizar</span>
              </span>
            ) : (
              <span>Nenhum alerta no momento</span>
            )}
            {/* Tooltip arrow */}
            <div
              className={cn(
                "absolute -top-1 right-3 h-2 w-2 rotate-45",
                hasAlerts ? "bg-red-600" : "bg-gray-800 dark:bg-gray-700",
              )}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-200 flex items-center justify-center pointer-events-none">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto animate-in fade-in-0 duration-200"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal panel — centered in content area (offset by sidebar width) */}
          <div
            className={cn(
              "relative pointer-events-auto w-full max-w-lg mx-4 rounded-2xl shadow-2xl",
              "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
              "animate-in fade-in-0 zoom-in-95 duration-200",
            )}
            style={{ marginLeft: "calc(var(--sidebar-width, 220px) / 2)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Alertas do Sistema
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeAlerts.length} ite{activeAlerts.length !== 1 ? "ns" : "m"} requirem atenção
                    {highCount > 0 && (
                      <span className="ml-1 text-red-500 font-medium">• {highCount} crítico{highCount > 1 ? "s" : ""}</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Alerts list */}
            <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                  Nenhum alerta ativo no momento.
                </p>
              ) : (
                activeAlerts.map((alert) => {
                  const Icon = alert.icon
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
                          <Badge variant="outline" className="text-xs">
                            {alert.count}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs ml-auto",
                              alert.severity === "high"
                                ? "border-red-400 text-red-600 dark:text-red-400"
                                : alert.severity === "medium"
                                ? "border-amber-400 text-amber-600 dark:text-amber-400"
                                : "border-blue-400 text-blue-600 dark:text-blue-400",
                            )}
                          >
                            {severityLabel[alert.severity]}
                          </Badge>
                        </div>
                        <p className="text-xs mt-1 opacity-80">{alert.description}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs h-7 px-2"
                          onClick={() => {
                            setModalOpen(false)
                            navigate("/admin/alertas")
                          }}
                        >
                          Ver
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleDismiss(alert.id, e)}
                          className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                          title="Dispensar alerta"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {activeAlerts.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => {
                    setDismissed(mockAlerts.map((a) => a.id))
                    setModalOpen(false)
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
                    navigate("/admin/alertas")
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Central de Atenções
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
