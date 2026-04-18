"use client"

import React from "react"
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Check,
  X,
  ListFilter,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type SortDirection = "asc" | "desc"
export type ColumnType = "text" | "number" | "date" | "status"

export interface SortableHeaderProps {
  /** Column display label */
  label: string
  /** Data field key */
  field: string
  /** Column type drives icon + label wording */
  type?: ColumnType
  /** Currently active sort key (null = no sort) */
  sortKey: string | null
  /** Current sort direction */
  sortDir: SortDirection
  /** Called with (field, direction) when user picks a sort option */
  onSort: (field: string, dir: SortDirection) => void
  /** Column-level active filters — field → selected values */
  columnFilters?: Record<string, string[]>
  /** Toggle a filter value for a field */
  onFilter?: (field: string, value: string) => void
  /** Clear all filter values for a field */
  onClearFilter?: (field: string) => void
  /**
   * Unique possible values shown in the filter checkbox list.
   * Provide this to enable the filter section (status / plan / type columns).
   */
  filterValues?: string[]
  className?: string
}

// Human-readable labels for common enum values used across the platform
const VALUE_LABELS: Record<string, string> = {
  active:       "Ativo",
  inactive:     "Inativo",
  pending:      "Pendente",
  in_progress:  "Em andamento",
  completed:    "Concluído",
  cancelled:    "Cancelado",
  approved:     "Aprovado",
  rejected:     "Rejeitado",
  trial:        "Trial",
  suspended:    "Suspenso",
  paid:         "Pago",
  overdue:      "Vencido",
  at_risk:      "Em risco",
  true:         "Ativo",
  false:        "Inativo",
  agency:       "Agência",
  empresa:      "Empresa",
  nomade:       "Nômade",
  parceiro:     "Parceiro",
  admin:        "Admin",
  basic:        "Básico",
  standard:     "Standard",
  premium:      "Premium",
  enterprise:   "Enterprise",
  starter:      "Starter",
  growth:       "Growth",
  scale:        "Scale",
}

function humanize(value: string): string {
  return (
    VALUE_LABELS[String(value)] ??
    String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

const SORT_OPTIONS: Record<ColumnType, { asc: string; desc: string }> = {
  text:       { asc: "A → Z",                 desc: "Z → A" },
  number:     { asc: "Menor → Maior",         desc: "Maior → Menor" },
  date:       { asc: "Mais antiga primeiro",  desc: "Mais recente primeiro" },
  status:     { asc: "A → Z",                 desc: "Z → A" },
}

export function SortableHeader({
  label,
  field,
  type = "text",
  sortKey,
  sortDir,
  onSort,
  columnFilters,
  onFilter,
  onClearFilter,
  filterValues,
  className,
}: SortableHeaderProps) {
  const isActive       = sortKey === field
  const activeFilters  = columnFilters?.[field] ?? []
  const hasActiveFilter = activeFilters.length > 0
  const showFilter     = Boolean(filterValues && filterValues.length > 0 && onFilter)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            // Base layout
            "flex items-center gap-1 outline-none group",
            "uppercase text-xs font-semibold tracking-wide select-none",
            // Interaction
            "transition-colors rounded px-1 -mx-1 py-0.5 cursor-pointer",
            "hover:text-slate-700 dark:hover:text-slate-200",
            // Active / inactive colour
            isActive
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400",
            className,
          )}
        >
          <span>{label}</span>

          {/* Sort direction indicator */}
          <span className="flex items-center gap-0.5">
            {isActive ? (
              sortDir === "asc"
                ? <ChevronUp   className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                : <ChevronDown className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
            )}

            {/* Amber dot = active column filter */}
            {hasActiveFilter && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            )}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-52 z-[9999]">
        {/* Column name as header */}
        <DropdownMenuLabel className="text-xs text-slate-400 font-normal pb-0.5">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* ── Sort ascending ── */}
        <DropdownMenuItem
          onClick={() => onSort(field, "asc")}
          className={cn(
            "flex items-center justify-between gap-2 cursor-pointer text-sm",
            isActive && sortDir === "asc" &&
              "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
          )}
        >
          <span className="flex items-center gap-2">
            <ArrowUpNarrowWide className="h-3.5 w-3.5 shrink-0" />
            {SORT_OPTIONS[type].asc}
          </span>
          {isActive && sortDir === "asc" && (
            <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          )}
        </DropdownMenuItem>

        {/* ── Sort descending ── */}
        <DropdownMenuItem
          onClick={() => onSort(field, "desc")}
          className={cn(
            "flex items-center justify-between gap-2 cursor-pointer text-sm",
            isActive && sortDir === "desc" &&
              "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
          )}
        >
          <span className="flex items-center gap-2">
            <ArrowDownWideNarrow className="h-3.5 w-3.5 shrink-0" />
            {SORT_OPTIONS[type].desc}
          </span>
          {isActive && sortDir === "desc" && (
            <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          )}
        </DropdownMenuItem>

        {/* ── Filter section (status / plan / type columns) ── */}
        {showFilter && (
          <>
            <DropdownMenuSeparator />

            {/* Filter header row */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <ListFilter className="h-3 w-3" />
                Filtrar por valor
              </span>
              {hasActiveFilter && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onClearFilter?.(field)
                  }}
                  className="flex items-center gap-0.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              )}
            </div>

            {/* Per-value checkboxes */}
            {filterValues!.map((val) => (
              <DropdownMenuCheckboxItem
                key={val}
                checked={activeFilters.includes(val)}
                onCheckedChange={() => onFilter!(field, val)}
                className="text-sm"
              >
                {humanize(val)}
              </DropdownMenuCheckboxItem>
            ))}

            {/* Hint when nothing is checked */}
            {!hasActiveFilter && (
              <p className="px-2 pb-1.5 text-xs text-slate-400 italic">
                Selecione para filtrar
              </p>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
