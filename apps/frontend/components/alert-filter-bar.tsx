import { useId } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Barra de filtros compartilhada por "Meus Alertas", "Monitoramento" e
// "Notificações" (ata 2026-08, bloco 2/5). Componente controlado — quem usa
// mantém o estado (e persiste na URL). Os filtros aqui só montam o objeto;
// a filtragem/paginação é 100% no servidor.

export interface AlertFilters {
  q: string
  date_from: string
  date_to: string
  severity: "" | "info" | "warning" | "error"
  situacao: "" | "ativo" | "resolvido" | "arquivado" | "dispensado" | "expirado"
  origem: "" | "automatico" | "manual" | "programado"
}

export const EMPTY_ALERT_FILTERS: AlertFilters = {
  q: "",
  date_from: "",
  date_to: "",
  severity: "",
  situacao: "",
  origem: "",
}

export function alertFiltersToQuery(f: AlertFilters): Record<string, string> {
  const out: Record<string, string> = {}
  if (f.q.trim()) out.q = f.q.trim()
  if (f.date_from) out.date_from = f.date_from
  if (f.date_to) out.date_to = f.date_to
  if (f.severity) out.severity = f.severity
  if (f.situacao) out.situacao = f.situacao
  if (f.origem) out.origem = f.origem
  return out
}

export function alertFiltersFromParams(params: URLSearchParams): AlertFilters {
  return {
    q: params.get("q") ?? "",
    date_from: params.get("date_from") ?? "",
    date_to: params.get("date_to") ?? "",
    severity: (params.get("severity") as AlertFilters["severity"]) || "",
    situacao: (params.get("situacao") as AlertFilters["situacao"]) || "",
    origem: (params.get("origem") as AlertFilters["origem"]) || "",
  }
}

export function hasActiveAlertFilters(f: AlertFilters): boolean {
  return Object.values(alertFiltersToQuery(f)).length > 0
}

interface AlertFilterBarProps {
  value: AlertFilters
  onChange: (next: AlertFilters) => void
  onClear: () => void
  /** "situacao" não faz sentido no Monitoramento com abas próprias — ocultável. */
  showSituacao?: boolean
  showOrigem?: boolean
  showSeverity?: boolean
  className?: string
}

const selectCls =
  "h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-slate-700 dark:text-slate-200"

export function AlertFilterBar({
  value,
  onChange,
  onClear,
  showSituacao = true,
  showOrigem = true,
  showSeverity = true,
  className,
}: AlertFilterBarProps) {
  const idBase = useId()
  const set = <K extends keyof AlertFilters>(key: K, v: AlertFilters[K]) => onChange({ ...value, [key]: v })
  const active = hasActiveAlertFilters(value)

  return (
    <div className={cn("flex flex-wrap items-end gap-2 px-5 pt-2.5", className)}>
      <div className="relative min-w-[150px] flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="search"
          aria-label="Buscar por título ou mensagem"
          placeholder="Buscar..."
          value={value.q}
          onChange={(e) => set("q", e.target.value)}
          className="w-full h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-2 text-slate-700 dark:text-slate-200"
        />
      </div>

      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] text-slate-400">De</span>
        <input
          type="date"
          aria-label="Data inicial"
          value={value.date_from}
          max={value.date_to || undefined}
          onChange={(e) => set("date_from", e.target.value)}
          className={selectCls}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-[10px] text-slate-400">Até</span>
        <input
          type="date"
          aria-label="Data final"
          value={value.date_to}
          min={value.date_from || undefined}
          onChange={(e) => set("date_to", e.target.value)}
          className={selectCls}
        />
      </label>

      {showSeverity && (
        <select
          aria-label="Severidade"
          id={`${idBase}-sev`}
          value={value.severity}
          onChange={(e) => set("severity", e.target.value as AlertFilters["severity"])}
          className={selectCls}
        >
          <option value="">Toda severidade</option>
          <option value="info">Verde (info)</option>
          <option value="warning">Amarelo (aviso)</option>
          <option value="error">Vermelho (crítico)</option>
        </select>
      )}

      {showSituacao && (
        <select
          aria-label="Situação"
          value={value.situacao}
          onChange={(e) => set("situacao", e.target.value as AlertFilters["situacao"])}
          className={selectCls}
        >
          <option value="">Toda situação</option>
          <option value="ativo">Ativo</option>
          <option value="resolvido">Resolvido</option>
          <option value="arquivado">Arquivado</option>
          <option value="dispensado">Dispensado</option>
          <option value="expirado">Expirado</option>
        </select>
      )}

      {showOrigem && (
        <select
          aria-label="Origem"
          value={value.origem}
          onChange={(e) => set("origem", e.target.value as AlertFilters["origem"])}
          className={selectCls}
        >
          <option value="">Toda origem</option>
          <option value="automatico">Automático</option>
          <option value="manual">Manual</option>
          <option value="programado">Programado</option>
        </select>
      )}

      {active && (
        <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={onClear}>
          <X className="h-3 w-3" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
