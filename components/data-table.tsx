
import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, AlertCircle } from "lucide-react"
import { useSorting, SortableHeader } from "@/hooks/useSorting"
import type { ColumnType } from "@/hooks/useSorting"

// Definição dos tipos para as colunas da tabela
export interface DataTableColumn<T = any> {
  field: keyof T
  headerName: string
  width?: number
  renderCell?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
  /** Column type — drives the sort-option labels in the dropdown */
  columnType?: ColumnType
  /** Unique values for status/plan/type columns — enables the filter panel */
  filterValues?: string[]
}

// Definição dos tipos para as ações da linha
export interface DataTableAction<T = any> {
  label: string
  icon?: React.ReactNode
  onClick: (row: T) => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

// Props do componente DataTable
export interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[]
  rows: T[]
  isLoading?: boolean
  error?: Error | string | null
  actions?: DataTableAction<T>[]
  title?: string
  searchable?: boolean
  searchPlaceholder?: string
  onCreateNew?: () => void
  createButtonLabel?: string
  emptyMessage?: string
  className?: string
}

/**
 * Componente DataTable genérico e reutilizável
 *
 * Funcionalidades:
 * - Exibição de dados em tabela
 * - Estados de loading, erro e vazio
 * - Busca integrada (opcional)
 * - Ações personalizáveis por linha
 * - Botão de criação (opcional)
 * - Renderização customizada de células
 */
export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  isLoading = false,
  error = null,
  actions = [],
  title,
  searchable = false,
  searchPlaceholder = "Buscar...",
  onCreateNew,
  createButtonLabel = "Novo",
  emptyMessage = "Nenhum resultado encontrado",
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")
  const { sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter } = useSorting<T>()

  // Filtrar dados baseado no termo de busca
  const filteredRows = searchable
    ? rows.filter((row) =>
        columns.some((column) => {
          const value = row[column.field]
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        }),
      )
    : rows

  // Ordenar dados
  const sortedRows = sortData(filteredRows)

  // Renderizar estado de loading
  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          {title && (
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
                {onCreateNew && <Skeleton className="h-9 w-20 sm:w-24" />}
              </div>
              {searchable && <Skeleton className="h-9 w-full sm:w-80" />}
            </CardHeader>
          )}
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Renderizar estado de erro
  if (error) {
    const errorMessage = typeof error === "string" ? error : error.message || "Falha ao carregar os dados"

    return (
      <div className={className}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-center">Erro ao carregar dados</h3>
            <p className="text-muted-foreground text-center text-sm">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        {title && (
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
              {onCreateNew && (
                <Button onClick={onCreateNew} className="w-full sm:w-auto">
                  {createButtonLabel}
                </Button>
              )}
            </div>

            {searchable && (
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </CardHeader>
        )}

        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <div className="rounded-md border min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead
                        key={String(column.field)}
                        style={{ width: column.width }}
                        className="whitespace-nowrap px-3 sm:px-4"
                      >
                        {column.sortable ? (
                          <SortableHeader
                            label={column.headerName}
                            field={String(column.field)}
                            type={column.columnType ?? "text"}
                            sortKey={sortKey ? String(sortKey) : null}
                            sortDir={sortDir}
                            onSort={(f, d) => handleSort(f as keyof T, d)}
                            columnFilters={columnFilters}
                            onFilter={toggleColumnFilter}
                            onClearFilter={clearColumnFilter}
                            filterValues={column.filterValues}
                          />
                        ) : (
                          column.headerName
                        )}
                      </TableHead>
                    ))}
                    {actions.length > 0 && <TableHead className="whitespace-nowrap px-3 sm:px-4">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                        className="text-center py-8 px-3 sm:px-4"
                      >
                        <div className="text-sm text-muted-foreground">
                          {searchTerm ? "Nenhum resultado encontrado para a busca" : emptyMessage}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRows.map((row, index) => (
                      <TableRow key={row.id || index}>
                        {columns.map((column) => (
                          <TableCell key={String(column.field)} className="px-3 sm:px-4 py-3">
                            <div className="min-w-0">
                              {column.renderCell ? (
                                column.renderCell(row[column.field], row)
                              ) : (
                                <span className="text-sm truncate block">{row[column.field] || "-"}</span>
                              )}
                            </div>
                          </TableCell>
                        ))}
                        {actions.length > 0 && (
                          <TableCell className="px-3 sm:px-4 py-3">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              {actions.map((action, actionIndex) => (
                                <Button
                                  key={actionIndex}
                                  variant={action.variant || "ghost"}
                                  size="sm"
                                  onClick={() => action.onClick(row)}
                                  title={action.label}
                                  className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                                >
                                  {action.icon}
                                  {!action.icon && (
                                    <span className="sr-only sm:not-sr-only sm:ml-2">{action.label}</span>
                                  )}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
