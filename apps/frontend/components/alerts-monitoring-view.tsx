import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle, Bot, Clock, ExternalLink, ShieldAlert, User2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiClient, ApiError } from "@/lib/api-client"
import {
  AlertFilterBar,
  EMPTY_ALERT_FILTERS,
  alertFiltersFromParams,
  alertFiltersToQuery,
  type AlertFilters,
} from "@/components/alert-filter-bar"
import { AlertDetailDrawer } from "@/components/alert-detail-drawer"
import { useAccountType } from "@/contexts/account-type-context"
import { cn } from "@/lib/utils"

// Aba "Monitoramento" da Central (ata 2026-08, bloco 2/5): alertas CRÍTICOS
// de TERCEIROS dentro da autoridade real de quem pergunta. Só leitura —
// abrir Detalhes / abrir origem / filtrar. Nunca resolver/dispensar/arquivar
// alerta de outra pessoa (o backend não tem rota pra isso e recusa).

const PAGE_SIZE = 20

function humanDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  return `${d} dia${d !== 1 ? "s" : ""}`
}

interface MonitoringRow {
  id: string
  title: string
  severity: string
  created_at: string
  open_ms: number
  situacao: string
  recipient: { id: string | null; name: string | null; email: string | null } | null
  is_general: boolean
  project: { id: string; name: string } | null
  task: { id: string; title: string } | null
  origin: string
  rule: { id: string; name: string; trigger_type: string; standard: string } | null
  condition_controlled: boolean
  disposal_blocked: boolean
  resolved_at: string | null
  resolution_kind: "manual" | "automatica" | null
  resolved_by: { id: string | null; name: string | null } | null
  automatic_resolution_message: string | null
}

const SITUACAO_LABEL: Record<string, string> = {
  ativo: "Ativo",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
  dispensado: "Dispensado",
  expirado: "Expirado",
}

export function AlertsMonitoringView() {
  const { accountType } = useAccountType()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => alertFiltersFromParams(searchParams), [searchParams])
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1)

  const [rows, setRows] = useState<MonitoringRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [scopeNote, setScopeNote] = useState<string | null>(null)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof apiClient.getAlertMonitoringSummary>> | null>(null)
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error" | "forbidden">("loading")
  const [detailId, setDetailId] = useState<string | null>(null)

  const applyFilters = (next: AlertFilters) => {
    const q = alertFiltersToQuery(next)
    const sp = new URLSearchParams(searchParams)
    for (const k of ["q", "date_from", "date_to", "severity", "situacao", "origem"]) sp.delete(k)
    for (const [k, v] of Object.entries(q)) sp.set(k, v)
    sp.set("page", "1")
    setSearchParams(sp, { replace: false })
  }
  const clearFilters = () => applyFilters(EMPTY_ALERT_FILTERS)
  const goToPage = (p: number) => {
    const sp = new URLSearchParams(searchParams)
    sp.set("page", String(p))
    setSearchParams(sp, { replace: false })
  }

  const load = useCallback(async () => {
    setStatus("loading")
    const query = { ...alertFiltersToQuery(filters), page: String(page), page_size: String(PAGE_SIZE) }
    try {
      const [list, sum] = await Promise.all([
        apiClient.getAlertMonitoring(query),
        apiClient.getAlertMonitoringSummary(alertFiltersToQuery(filters)).catch(() => null),
      ])
      setRows((list.data ?? []) as MonitoringRow[])
      setTotal(list.total ?? 0)
      setTotalPages(list.total_pages ?? 1)
      setScopeNote(list.scope_note ?? null)
      setSummary(sum)
      setStatus((list.data?.length ?? 0) === 0 ? "empty" : "ok")
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setStatus("forbidden")
        return
      }
      setStatus("error")
    }
  }, [filters, page])

  useEffect(() => {
    void load()
  }, [load])

  if (status === "forbidden") {
    return (
      <p className="text-sm text-slate-400 text-center py-10 px-6">
        Você não tem função de acompanhamento — o Monitoramento não está disponível para o seu acesso.
      </p>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Indicadores — contagens reais, respeitam os mesmos filtros/escopo */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-5 pt-3 shrink-0">
          <SummaryChip label="Críticos ativos" value={summary.criticos_ativos} tone="red" />
          <SummaryChip label="Resolvidos no período" value={summary.resolvidos_no_periodo} tone="green" />
          <SummaryChip label="Automáticos pendentes" value={summary.automaticos_pendentes} tone="amber" />
          <SummaryChip label="Manuais pendentes" value={summary.manuais_pendentes} tone="amber" />
          <SummaryChip
            label="Alerta mais antigo em aberto"
            value={summary.oldest_open_ms != null ? humanDuration(summary.oldest_open_ms) : "—"}
            tone="slate"
          />
        </div>
      )}
      {scopeNote && (
        <p className="text-[11px] text-slate-400 px-5 pt-2">{scopeNote}</p>
      )}

      <AlertFilterBar value={filters} onChange={applyFilters} onClear={clearFilters} showSituacao showOrigem showSeverity />

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-4 space-y-2">
        {status === "loading" && <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>}
        {status === "error" && (
          <div className="text-center py-10">
            <p className="text-sm text-red-500">Não foi possível carregar o Monitoramento agora.</p>
            <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => void load()}>
              Tentar novamente
            </Button>
          </div>
        )}
        {status === "empty" && (
          <p className="text-sm text-slate-400 text-center py-10">Nenhum alerta crítico no escopo com esses filtros.</p>
        )}
        {status === "ok" &&
          rows.map((r) => (
            <div
              key={r.id}
              className={cn(
                "rounded-xl border border-l-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-3 shadow-sm",
                r.situacao === "resolvido" ? "border-l-emerald-400" : "border-l-red-500",
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{r.title}</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                      {SITUACAO_LABEL[r.situacao] ?? r.situacao}
                    </Badge>
                    {r.disposal_blocked && (
                      <Badge className="text-[10px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-200">
                        <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                        Acompanhamento obrigatório
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <User2 className="h-3 w-3" />
                      {r.is_general ? "Alerta geral" : r.recipient?.name || r.recipient?.email || "—"}
                    </span>
                    {r.project && <span>Projeto: {r.project.name}</span>}
                    {r.task && <span>Tarefa: {r.task.title}</span>}
                    <span>Origem: {r.origin}{r.rule ? ` · ${r.rule.standard}` : ""}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {r.resolved_at ? "Ficou aberto " : "Em aberto há "}
                      {humanDuration(r.open_ms)}
                    </span>
                    {r.resolved_at && (
                      <span className="inline-flex items-center gap-1">
                        {r.resolution_kind === "automatica" ? <Bot className="h-3 w-3" /> : null}
                        Resolvido {r.resolution_kind === "automatica" ? "pelo Motor da Allka" : `por ${r.resolved_by?.name ?? "—"}`}
                        {" · "}
                        {new Date(r.resolved_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetailId(r.id)}>
                      Detalhes
                    </Button>
                    {r.task && (
                      <a
                        href={`/admin/tarefas/${r.task.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver origem
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      {status === "ok" && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-2 border-t border-slate-100 dark:border-slate-800 shrink-0 text-xs text-slate-500">
          <span>
            {total} alerta{total !== 1 ? "s" : ""} · página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Anterior
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      <AlertDetailDrawer alertId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} accountType={accountType} />
    </div>
  )
}

function SummaryChip({ label, value, tone }: { label: string; value: number | string; tone: "red" | "green" | "amber" | "slate" }) {
  const toneCls = {
    red: "text-red-600 dark:text-red-400",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    slate: "text-slate-600 dark:text-slate-300",
  }[tone]
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5">
      <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
      <p className={cn("text-sm font-semibold", toneCls)}>{value}</p>
    </div>
  )
}
