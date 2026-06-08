import { useState, useCallback } from "react"
import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react"
import React from "react"

export type SortDirection = "asc" | "desc"

// Re-export the new drop-in component so pages only need one import
export { SortableHeader } from "@/components/sortable-header"
export type { ColumnType, SortableHeaderProps } from "@/components/sortable-header"

/**
 * Detects an ISO date string like "2026-04-17" or "2026-04-17T..."
 */
function isISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(s)
}

/**
 * Detects a pt-BR date string like "17/04/2026"
 */
function isPtBRDate(s: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(s)
}

/**
 * Converts "17/04/2026" → "2026-04-17" for comparison
 */
function ptBRToISO(s: string): string {
  const [d, m, y] = s.split("/")
  return `${y}-${m}-${d}`
}

function isNumericString(value: string): boolean {
  return /^-?\d+(?:[.,]\d+)?$/.test(value)
}

function toNumericValue(value: string): number {
  return Number(value.replace(",", "."))
}

/**
 * Universal comparator used by sortData
 */
function compareValues(aVal: any, bVal: any, dir: SortDirection): number {
  // Nulls / undefined always go last
  if (aVal == null && bVal == null) return 0
  if (aVal == null) return 1
  if (bVal == null) return -1

  // Numbers
  if (typeof aVal === "number" && typeof bVal === "number") {
    return dir === "asc" ? aVal - bVal : bVal - aVal
  }

  // Booleans
  if (typeof aVal === "boolean" && typeof bVal === "boolean") {
    const n = (v: boolean) => (v ? 1 : 0)
    return dir === "asc" ? n(aVal) - n(bVal) : n(bVal) - n(aVal)
  }

  const aStr = String(aVal)
  const bStr = String(bVal)

  // Numeric strings like "1", "9", "10" or "12,5"
  if (isNumericString(aStr) && isNumericString(bStr)) {
    const diff = toNumericValue(aStr) - toNumericValue(bStr)
    return dir === "asc" ? diff : -diff
  }

  // ISO dates ("2026-04-17" or "2026-04-17T...")
  if (isISODate(aStr) && isISODate(bStr)) {
    const diff = new Date(aStr).getTime() - new Date(bStr).getTime()
    return dir === "asc" ? diff : -diff
  }

  // pt-BR dates ("17/04/2026")
  if (isPtBRDate(aStr) && isPtBRDate(bStr)) {
    const diff = new Date(ptBRToISO(aStr)).getTime() - new Date(ptBRToISO(bStr)).getTime()
    return dir === "asc" ? diff : -diff
  }

  // Strings (locale-aware, case-insensitive)
  const cmp = aStr.localeCompare(bStr, "pt-BR", { sensitivity: "base" })
  return dir === "asc" ? cmp : -cmp
}

export function useSorting<T extends Record<string, any>>() {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection>("asc")
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  /** Toggle or explicitly set the sort for a column. */
  const handleSort = useCallback((key: keyof T, dir?: SortDirection) => {
    if (dir !== undefined) {
      setSortKey(key)
      setSortDir(dir)
      return
    }
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return key
      }
      setSortDir("asc")
      return key
    })
  }, [])

  const sortData = useCallback(
    <U extends T>(data: U[]): U[] => {
      // 1. Apply column-level filters (AND logic)
      let result: U[] = data
      for (const [field, selected] of Object.entries(columnFilters)) {
        if (selected.length > 0) {
          result = result.filter((row) =>
            selected.includes(String(row[field as keyof U] ?? ""))
          )
        }
      }
      // 2. Sort
      if (!sortKey) return result
      return [...result].sort((a, b) =>
        compareValues(a[sortKey as keyof U], b[sortKey as keyof U], sortDir)
      )
    },
    [sortKey, sortDir, columnFilters],
  )

  /** Toggle a value in/out of a column's active filter set. */
  const toggleColumnFilter = useCallback((field: string, value: string) => {
    setColumnFilters((prev) => {
      const current = prev[field] ?? []
      const has     = current.includes(value)
      const next    = has ? current.filter((v) => v !== value) : [...current, value]
      if (next.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [field]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [field]: next }
    })
  }, [])

  /** Remove all active filters for a column. */
  const clearColumnFilter = useCallback((field: string) => {
    setColumnFilters((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }, [])

  return { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter }
}

/**
 * Sort icon component — shows neutral / up / down based on current sort state.
 * Usage: <SortIcon field="name" sortKey={sortKey} sortDir={sortDir} />
 */
export function SortIcon({
  field,
  sortKey,
  sortDir,
}: {
  field: string
  sortKey: string | null
  sortDir: SortDirection
}) {
  if (sortKey !== field) {
    return React.createElement(ChevronsUpDown, {
      className: "h-3 w-3 text-slate-300 ml-1 inline-block shrink-0",
    })
  }
  if (sortDir === "asc") {
    return React.createElement(ChevronUp, {
      className: "h-3 w-3 text-blue-500 ml-1 inline-block shrink-0",
    })
  }
  return React.createElement(ChevronDown, {
    className: "h-3 w-3 text-blue-500 ml-1 inline-block shrink-0",
  })
}
