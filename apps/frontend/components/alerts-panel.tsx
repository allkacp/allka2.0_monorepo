// Lote de correção visual (ata 2026-08, revisão do responsável) — extraído
// de notification-preferences-panel.tsx (agora removido). Antes, Alertas
// era só uma aba dentro do painel do sino; o responsável rejeitou isso
// ("os dois acionadores abrem o mesmo painel/modal, apenas mudando a
// aba") e pediu um painel de verdade separado, aberto pela barra vertical
// direita (não mais ao lado do sino no cabeçalho). Este componente é
// EXCLUSIVO de alertas: fonte de dados, loading, erro e filtros próprios —
// nenhuma aba pra Notificações aqui.
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle, Archive, ArchiveRestore, ArrowRight, Bot, CheckCircle2, Info, ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HeaderSlideScreen } from "@/components/header-slide-screen"
import { AlertBannerImage } from "@/components/alert-banner-image"
import { AlertDetailDrawer } from "@/components/alert-detail-drawer"
import { AlertResolveModal, type AlertResolveTarget } from "@/components/alert-resolve-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { apiClient, ApiError } from "@/lib/api-client"
import {
  alertIcon, systemAlertLink, isSafeInternalPath, TASKS_ROUTE_BY_ACCOUNT_TYPE, type DisplayAlert,
  criticalityFromSeverity, criticalityLabel, criticalityDescription,
  criticalityIcon, criticalityBadgeColor, criticalityAccentBorder, type Criticality,
  RESOLUTION_ACTION_LABEL,
} from "@/components/alerts-header-icon"
import { useAccountType } from "@/contexts/account-type-context"
import { canManageAlertsAdmin } from "@/lib/admin-permissions"
import { AlertsAdminCenter } from "@/components/alerts-admin-center"
import { AlertsMonitoringView } from "@/components/alerts-monitoring-view"
import {
  AlertFilterBar,
  EMPTY_ALERT_FILTERS,
  alertFiltersFromParams,
  alertFiltersToQuery,
  hasActiveAlertFilters,
} from "@/components/alert-filter-bar"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface AlertsPanelProps {
  open?: boolean
  onClose?: () => void
}

export function AlertsPanel({ open = false, onClose }: AlertsPanelProps) {
  const { accountType } = useAccountType()
  const isAgency = accountType === "agencias"

  // Central de Alertas (ata 2026-08) — "Gerenciar" só existe pra Admin
  // Master de verdade (nunca a regra do avô de requirePermission, nunca
  // manipulando estado/aba: a visibilidade aqui é só sinal de UI, o backend
  // reaplica a mesma regra estrita via requireAdminMaster em toda rota
  // /system-alerts/admin/*). Volta pra "feed" sempre que o painel fecha, pra
  // nunca reabrir direto na área administrativa por engano.
  const [isMaster, setIsMaster] = useState(false)
  // "Monitoramento" (ata 2026-08, bloco 2/5) só aparece pra quem tem função
  // real de acompanhamento — a sonda é o próprio backend (GET /monitoring/
  // summary responde 403 pra usuário final). Nunca por role no frontend.
  const [canMonitor, setCanMonitor] = useState(false)
  const [view, setView] = useState<"feed" | "monitor" | "manage">("feed")
  useEffect(() => {
    if (!open) {
      setView("feed")
      return
    }
    let cancelled = false
    apiClient
      .getCurrentUser()
      .then((me: any) => {
        if (!cancelled) setIsMaster(canManageAlertsAdmin(accountType, me?.admin_profile))
      })
      .catch(() => {
        if (!cancelled) setIsMaster(false)
      })
    Promise.resolve(apiClient.getAlertMonitoringSummary?.())
      .then((res) => {
        if (!cancelled) setCanMonitor(!!res)
      })
      .catch(() => {
        if (!cancelled) setCanMonitor(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, accountType])

  const [alerts, setAlerts] = useState<DisplayAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  // Ativos/Resolvidos/Arquivados (ata 2026-08, 10º lote) — antes só havia
  // Ativos/Arquivados (showArchived: boolean); "Resolvidos" é uma
  // categoria própria, nunca sinônimo de arquivado (um alerta resolvido
  // NÃO vai automaticamente pra Arquivados).
  const [tab, setTab] = useState<"ativos" | "resolvidos" | "arquivados">("ativos")
  const [dismissed, setDismissed] = useState<string[]>([])
  const [resolveTarget, setResolveTarget] = useState<AlertResolveTarget | null>(null)
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const { toast } = useToast()

  // "Detalhes" (ata 2026-08, 8º lote) — painel próprio, separado de "Ver
  // origem". Abre por CIMA da Central (StandardModalDialog já cuida do
  // z-index) sem fechá-la, restaura o foco ao elemento que abriu ao
  // fechar (comportamento padrão do Dialog/Radix).
  const [detailAlertId, setDetailAlertId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // ── Filtros + paginação (ata 2026-08, bloco 2/5) — persistidos na URL, ──
  // sobrevivem a F5 e voltar/avançar. As abas Ativos/Resolvidos/Arquivados
  // continuam sendo o recorte de "situação"; o filtro adiciona busca, data,
  // severidade e origem, tudo aplicado NO SERVIDOR antes da paginação.
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => alertFiltersFromParams(searchParams), [searchParams])
  const filtersActive = hasActiveAlertFilters(filters)
  const pageParam = Math.max(1, Number(searchParams.get("page") || "1") || 1)
  const PAGE_SIZE = 50
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  function patchParams(mut: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(searchParams)
    mut(sp)
    setSearchParams(sp, { replace: false })
  }
  function applyFeedFilters(next: typeof filters) {
    patchParams((sp) => {
      for (const k of ["q", "date_from", "date_to", "severity", "situacao", "origem"]) sp.delete(k)
      for (const [k, v] of Object.entries(alertFiltersToQuery(next))) sp.set(k, v)
      sp.set("page", "1")
    })
  }
  function clearFeedFilters() {
    applyFeedFilters(EMPTY_ALERT_FILTERS)
  }

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      if (isAgency) {
        const res = await apiClient.getAgencyAlerts()
        const raw: any[] = res?.data ?? []
        setAlerts(raw.map((a) => ({
          id: a.id, type: a.type, severity: a.severity, title: a.title,
          // Mesma barreira de destino interno aplicada aqui — `a.link` vem
          // de um sistema separado (alertas de agência), nunca confiado
          // sem passar pela mesma validação (reparo "Ver alerta").
          message: a.description, link: typeof a.link === "string" && isSafeInternalPath(a.link) ? a.link : null,
          count: a.count, isSystemAlert: false,
        })))
      } else {
        // Ativos/Resolvidos/Arquivados (ata 2026-08, 10º lote) — cada aba é
        // uma combinação própria de is_archived/resolved, nunca sobreposta:
        // Resolvidos ignora is_archived (mostra mesmo se depois arquivado —
        // resolvido é a situação PRIMÁRIA, ver prioridade no backend);
        // Arquivados exclui resolvidos pra não duplicar a mesma linha nas
        // duas abas.
        const filtersByTab = {
          ativos: { is_read: false, is_archived: "false", resolved: "false" },
          resolvidos: { is_archived: "all", resolved: "true" },
          arquivados: { is_archived: "true", resolved: "false" },
        } as const
        const res: any = await apiClient.getSystemAlerts({
          category: "alerta",
          ...filtersByTab[tab],
          ...alertFiltersToQuery(filters),
          page: pageParam,
          page_size: PAGE_SIZE,
        })
        setTotalPages(res?.total_pages ?? 1)
        setTotalCount(res?.total ?? 0)
        const raw: any[] = res?.data ?? []
        setAlerts(raw.map((a) => ({
          id: a.id, type: a.type, severity: a.severity, title: a.title,
          message: a.message, link: systemAlertLink(a.entity_type, a.entity_id, accountType, a.entity_parent_id),
          created_at: a.created_at, isSystemAlert: true,
          has_image: a.has_image, image_url: a.image_url, image_alt: a.image_alt,
          manual_resolved_at: a.manual_resolved_at ?? null,
          resolution_action: a.resolution_action ?? null,
          resolvedByName: a.resolved_by?.name ?? null,
          is_archived: !!a.is_archived,
          automatic_resolved_at: a.automatic_resolved_at ?? null,
          automatic_resolution_reason: a.automatic_resolution_reason ?? null,
          automatic_resolution_message: a.automatic_resolution_message ?? null,
          condition_controlled: !!a.condition_controlled,
          disposal_blocked: !!a.disposal_blocked,
        })))
      }
    } catch {
      setAlerts([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [isAgency, accountType, tab, filters, pageParam])

  useEffect(() => {
    if (open) void fetchAlerts()
  }, [open, fetchAlerts])

  useEffect(() => {
    setDismissed([])
  }, [tab, filters, pageParam])

  const activeAlerts = alerts.filter((a) => !dismissed.includes(a.id))

  // Regra principal do 10º lote: um alerta vermelho/crítico ainda sem
  // resolução formal nunca oferece dispensar/arquivar (nem no frontend,
  // nem só escondendo — o backend recusa a mesma coisa com 409, essa
  // função só evita a viagem de rede na maioria dos casos e mostra
  // "Resolver alerta" no lugar).
  function precisaResolverAntes(alert: DisplayAlert): boolean {
    // Alerta automático de tarefa é controlado pela condição real — nunca
    // oferece "Resolver alerta" (ata 2026-08): o backend recusa a resolução
    // manual com 409, e o card mostra a orientação de resolução automática.
    if (alert.condition_controlled) return false
    // Vermelho já resolvido — manualmente OU pelo motor (condição real
    // deixou de existir, ata 2026-08 bloco 1/2) — não oferece mais
    // "Resolver alerta".
    return alert.severity === "error" && !alert.manual_resolved_at && !alert.automatic_resolved_at
  }

  // Orientação compacta de como o alerta automático de tarefa será
  // encerrado — visível sempre (não depende de hover, funciona no mobile).
  function orientacaoResolucaoAutomatica(alert: DisplayAlert): string {
    if (alert.type === "task.due_soon") {
      return "O alerta será encerrado quando a tarefa for entregue/concluída, cancelada, sair da janela de aviso ou passar para atraso."
    }
    return "Conclua ou entregue a tarefa, cancele-a ou regularize o prazo."
  }

  function openResolveModal(alert: DisplayAlert) {
    setResolveTarget({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      originLink: alert.link,
    })
    setResolveModalOpen(true)
  }

  function handleResolved(alertId: string) {
    // Sai de Ativos sem reload — se a aba atual for Resolvidos, o item some
    // até o próximo fetch (comportamento aceitável: quem resolveu está na
    // aba Ativos no fluxo normal). Preserva filtro/rolagem/Central aberta.
    setDismissed((prev) => [...prev, alertId])
    toast({ title: "Alerta resolvido e registrado no histórico." })
  }

  async function dismiss(alert: DisplayAlert) {
    if (alert.isSystemAlert && alert.disposal_blocked) {
      toast({ title: "Este alerta crítico continuará ativo até que a situação real da tarefa seja regularizada." })
      return
    }
    if (alert.isSystemAlert && precisaResolverAntes(alert)) {
      openResolveModal(alert)
      return
    }
    setDismissed((prev) => [...prev, alert.id])
    if (alert.isSystemAlert) {
      try {
        await apiClient.markSystemAlertRead(alert.id)
      } catch (err) {
        setDismissed((prev) => prev.filter((id) => id !== alert.id))
        if (err instanceof ApiError && err.status === 409 && err.data?.requires_resolution) {
          openResolveModal(alert)
        } else {
          toast({ title: "Não foi possível dispensar este alerta.", variant: "destructive" })
        }
      }
    }
  }

  async function toggleArchive(alert: DisplayAlert) {
    if (alert.disposal_blocked && tab !== "arquivados") {
      toast({ title: "Este alerta crítico continuará ativo até que a situação real da tarefa seja regularizada." })
      return
    }
    if (tab !== "arquivados" && precisaResolverAntes(alert)) {
      openResolveModal(alert)
      return
    }
    setDismissed((prev) => [...prev, alert.id])
    try {
      if (tab === "arquivados") await apiClient.unarchiveSystemAlert(alert.id)
      else await apiClient.archiveSystemAlert(alert.id)
    } catch (err) {
      setDismissed((prev) => prev.filter((id) => id !== alert.id))
      if (err instanceof ApiError && err.status === 409 && err.data?.requires_resolution) {
        openResolveModal(alert)
      } else {
        toast({ title: "Não foi possível arquivar este alerta.", variant: "destructive" })
      }
    }
  }

  async function dismissAll() {
    // Nunca dispensa em lote (nem esconde localmente) um crítico que o
    // servidor vai preservar: vermelho manual sem resolução formal OU
    // vermelho automático de tarefa com condição ativa. O backend recusa
    // ambos no PATCH /read-all — esta filtragem só evita sumir com o card
    // antes do próximo fetch.
    setDismissed(alerts.filter((a) => !precisaResolverAntes(a) && !a.disposal_blocked).map((a) => a.id))
    if (!isAgency) {
      try {
        const res: any = await apiClient.markAllSystemAlertsRead({ category: "alerta" })
        if (res?.message) toast({ title: res.message })
      } catch {}
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


  return (
    <>
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
        {/* "Gerenciar" só aparece pra Admin Master de verdade — nunca uma
            segunda fonte de verdade: é a mesma checagem (canManageAlertsAdmin)
            usada pra travar a área inteira, não um estado independente que
            alguém pudesse manipular via devtools pra "ver" o botão sem ter
            a permissão real (o backend re-checa tudo de qualquer forma). */}
        {(isMaster || canMonitor) && (
          <div className="flex items-center gap-1.5 px-5 pt-3 pb-1 shrink-0 flex-wrap" role="tablist" aria-label="Áreas do painel de Alertas">
            <button
              role="tab"
              aria-selected={view === "feed"}
              onClick={() => setView("feed")}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                view === "feed"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
              )}
            >
              Meus Alertas
            </button>
            {canMonitor && (
              <button
                role="tab"
                aria-selected={view === "monitor"}
                onClick={() => setView("monitor")}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                  view === "monitor"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
                )}
              >
                Monitoramento
              </button>
            )}
            {isMaster && (
              <button
                role="tab"
                aria-selected={view === "manage"}
                onClick={() => setView("manage")}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                  view === "manage"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
                )}
              >
                Gerenciar
              </button>
            )}
          </div>
        )}

        {view === "monitor" && canMonitor ? (
          <AlertsMonitoringView />
        ) : view === "manage" && isMaster ? (
          <AlertsAdminCenter />
        ) : (
        <>
        <div className="flex items-center justify-between px-5 pt-3 gap-2 shrink-0">
          {!isAgency ? (
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Situação dos alertas">
              <Button size="sm" variant={tab === "ativos" ? "secondary" : "ghost"} className="h-7 text-xs px-2.5" onClick={() => setTab("ativos")} role="tab" aria-selected={tab === "ativos"}>
                Ativos
              </Button>
              <Button size="sm" variant={tab === "resolvidos" ? "secondary" : "ghost"} className="h-7 text-xs px-2.5 gap-1" onClick={() => setTab("resolvidos")} role="tab" aria-selected={tab === "resolvidos"}>
                <CheckCircle2 className="h-3 w-3" />
                Resolvidos
              </Button>
              <Button size="sm" variant={tab === "arquivados" ? "secondary" : "ghost"} className="h-7 text-xs px-2.5 gap-1" onClick={() => setTab("arquivados")} role="tab" aria-selected={tab === "arquivados"}>
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

        {/* Busca / data / origem — server-side, antes da paginação, na URL. */}
        <AlertFilterBar
          value={filters}
          onChange={applyFeedFilters}
          onClear={clearFeedFilters}
          showSituacao={false}
          showSeverity={false}
          showOrigem
        />

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
              {filtersActive
                ? "Nenhum alerta encontrado com esses filtros."
                : tab === "arquivados"
                  ? "Nenhum alerta arquivado."
                  : tab === "resolvidos"
                    ? "Nenhum alerta resolvido ainda."
                    : "Nenhum alerta ativo no momento."}
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
                      {/* Badge "Resolvido" com data (ata 2026-08, 10º
                          lote) — a severidade original (vermelho) continua
                          visível acima; resolvido nunca esconde/troca a
                          criticidade, só adiciona esta informação. */}
                      {/* Resolução automática pelo motor (ata 2026-08, bloco
                          1/2) — badge própria "Resolvido automaticamente" +
                          autor "Motor da Allka" + motivo legível. A
                          severidade original (acima) nunca é escondida. Só
                          aparece quando NÃO houve resolução manual (a humana
                          tem prioridade e usa o bloco abaixo). */}
                      {alert.automatic_resolved_at && !alert.manual_resolved_at && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <Badge variant="outline" className="text-[10px] gap-1 border-sky-300 text-sky-700 dark:border-sky-700 dark:text-sky-400">
                            <Bot className="h-3 w-3" />
                            Resolvido automaticamente em {new Date(alert.automatic_resolved_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                          </Badge>
                          <span className="text-[10px] text-slate-400">por Motor da Allka</span>
                          {alert.automatic_resolution_message && (
                            <span className="text-[10px] text-slate-400">— {alert.automatic_resolution_message}</span>
                          )}
                        </div>
                      )}
                      {alert.manual_resolved_at && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Resolvido em {new Date(alert.manual_resolved_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                          </Badge>
                          {alert.resolvedByName && (
                            <span className="text-[10px] text-slate-400">por {alert.resolvedByName}</span>
                          )}
                          {alert.resolution_action && (
                            // keyof typeof (nunca "as ResolutionAction"):
                            // um registro histórico pode ter uma ação que
                            // não está mais em RESOLUTION_ACTIONS (ex.:
                            // "responsavel_acionado", removida das opções
                            // de NOVAS resoluções no 11º lote) — o rótulo
                            // ainda precisa ser lido corretamente.
                            <span className="text-[10px] text-slate-400">— {RESOLUTION_ACTION_LABEL[alert.resolution_action as keyof typeof RESOLUTION_ACTION_LABEL] ?? alert.resolution_action}</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{alert.message}</p>
                      {/* Alerta automático de tarefa ainda ativo (ata
                          2026-08): explica que a resolução é automática —
                          nunca há "Resolver alerta". Texto sempre visível
                          (sem hover), essencial no mobile. */}
                      {alert.isSystemAlert && alert.condition_controlled && !alert.automatic_resolved_at && !alert.manual_resolved_at && (
                        <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 px-2 py-1.5">
                          <Bot className="h-3 w-3 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-sky-800 dark:text-sky-300">Resolução automática</p>
                            <p className="text-[10px] text-sky-700/90 dark:text-sky-300/80">{orientacaoResolucaoAutomatica(alert)}</p>
                          </div>
                        </div>
                      )}
                      {/* Automático vermelho + condição ATIVA (ata 2026-08):
                          não pode ser dispensado/arquivado até a tarefa ser
                          regularizada. Rótulo e explicação sempre visíveis
                          (sem hover — funciona no mobile). */}
                      {alert.isSystemAlert && alert.disposal_blocked && (
                        <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 px-2 py-1.5">
                          <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Acompanhamento obrigatório</p>
                            <p className="text-[10px] text-amber-700/90 dark:text-amber-300/80">Este alerta permanecerá ativo até que a situação da tarefa seja regularizada.</p>
                          </div>
                        </div>
                      )}
                      {alert.isSystemAlert && alert.has_image && alert.image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden">
                          <AlertBannerImage
                            src={apiClient.resolveAlertImageUrl(alert.image_url)}
                            alt={alert.image_alt}
                          />
                        </div>
                      )}
                      {alert.created_at && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(alert.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* "Detalhes" (ata 2026-08, 8º lote) — separado de
                          "Ver origem": abre a visualização completa (com
                          histórico) SEM sair da Central, num painel por
                          cima (StandardModalDialog). Só pra SystemAlert de
                          verdade — alertas de agência (getAgencyAlerts,
                          outro subsistema) não têm detalhe/histórico
                          próprios ainda. */}
                      {alert.isSystemAlert && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 px-2"
                          onClick={() => {
                            setDetailAlertId(alert.id)
                            setDetailOpen(true)
                          }}
                        >
                          Detalhes
                        </Button>
                      )}
                      {/* Reparo "Ver alerta" (ata 2026-08): link real <a>,
                          nunca navigate()/onClose() — abre em nova aba,
                          mantém a Central aberta na aba original, sem
                          loading (destino já é conhecido antes do clique),
                          sem depender de pop-up assíncrono. Renomeado pra
                          "Ver origem" (8º lote) — "Ver" sozinho ficou
                          ambíguo depois de "Detalhes" existir ao lado.
                          Alerta sem destino conhecido (Avulso sem
                          referência, ocorrência de Programação) nunca
                          mostra um botão funcional — desabilitado, com
                          explicação. */}
                      {alert.link ? (
                        <a
                          href={alert.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            // clientEventId novo por clique — a garantia
                            // real contra clique duplo é o índice único no
                            // servidor (ver AlertDetailDrawer/ata 2026-08,
                            // 9º lote), não uma checagem local.
                            if (alert.isSystemAlert) apiClient.recordSystemAlertEvent(alert.id, "origin_clicked", crypto.randomUUID()).catch(() => {})
                          }}
                          className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                        >
                          Ver origem
                          <ArrowRight className="h-3 w-3" />
                        </a>
                      ) : (
                        // Reparo "Ver desabilitado sem explicação" (ata
                        // 2026-08, 7º lote): antes era um <Button disabled>
                        // — HTML nativo remove elementos disabled da ordem
                        // de tabulação, então quem navega por teclado nunca
                        // conseguia focar isto pra revelar o tooltip (e
                        // parecia um botão "Ver" quebrado). Agora é um
                        // elemento de verdade FOCÁVEL (tabIndex, sem
                        // `disabled`), com o texto "Sem destino" sempre
                        // visível (nunca depende de hover — funciona igual
                        // no mobile, onde não existe hover) e a explicação
                        // completa acessível via Tooltip (mouse/teclado) E
                        // via aria-describedby (leitor de tela), que o
                        // Radix conecta automaticamente ao focar o trigger.
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                tabIndex={0}
                                aria-disabled="true"
                                className="inline-flex items-center gap-1 text-xs h-7 px-2 rounded-md text-slate-400 dark:text-slate-500 cursor-default select-none outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600"
                              >
                                <Info className="h-3 w-3" aria-hidden="true" />
                                Sem destino
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-55">
                              Este alerta é informativo e não possui uma tela vinculada.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {/* Automático vermelho com condição ativa (ata
                          2026-08): NENHUMA ação de ocultar — nem Resolver,
                          nem Arquivar, nem X. Só a situação real da tarefa
                          o encerra. O rótulo "Acompanhamento obrigatório"
                          fica no corpo do card (sempre visível). */}
                      {alert.isSystemAlert && alert.disposal_blocked ? null : alert.isSystemAlert && precisaResolverAntes(alert) ? (
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2.5 gap-1 bg-red-600 hover:bg-red-700 text-white border-0"
                          onClick={() => openResolveModal(alert)}
                        >
                          Resolver alerta
                        </Button>
                      ) : (
                        <>
                          {alert.isSystemAlert && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleArchive(alert)}
                              className="h-7 w-7 p-0 opacity-60 hover:opacity-100"
                              title={tab === "arquivados" ? "Desarquivar" : "Arquivar"}
                            >
                              {tab === "arquivados" ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
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
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {!isAgency && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0 text-xs text-slate-500">
            <span>
              {totalCount} alerta{totalCount !== 1 ? "s" : ""} · página {pageParam} de {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={pageParam <= 1}
                onClick={() => patchParams((sp) => sp.set("page", String(pageParam - 1)))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={pageParam >= totalPages}
                onClick={() => patchParams((sp) => sp.set("page", String(pageParam + 1)))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </HeaderSlideScreen>
    <AlertDetailDrawer
      alertId={detailAlertId}
      open={detailOpen}
      onClose={() => setDetailOpen(false)}
      accountType={accountType}
    />
    <AlertResolveModal
      open={resolveModalOpen}
      onClose={() => setResolveModalOpen(false)}
      target={resolveTarget}
      onResolved={(alertId) => handleResolved(alertId)}
    />
    </>
  )
}
