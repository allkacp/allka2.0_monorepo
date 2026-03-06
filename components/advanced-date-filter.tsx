
import * as React from "react"
import { DateRange } from "react-day-picker"
import { Calendar, Download, RotateCw, ChevronDown, FileText, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface AdvancedDateFilterProps {
  dateRange?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  onExport?: (format: "csv" | "excel" | "pdf") => void
  onReset?: () => void
  onLeadFilterChange?: (filter: "all" | "lead" | "non-lead") => void
  leadFilter?: "all" | "lead" | "non-lead"
  isLoading?: boolean
}

const PRESET_RANGES = [
  { label: "Hoje", days: 0 },
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
  { label: "Último ano", days: 365 },
]

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDateDisplay(date: Date | undefined): string {
  if (!date) return ""
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getDaysDifference(from: Date | undefined, to: Date | undefined): number {
  if (!from || !to) return 0
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

export function AdvancedDateFilter({
  dateRange,
  onDateChange,
  onExport,
  onReset,
  onLeadFilterChange,
  leadFilter = "all",
  isLoading = false,
}: AdvancedDateFilterProps) {
  const [open, setOpen] = React.useState(false)
  const [localRange, setLocalRange] = React.useState<DateRange | undefined>(dateRange)
  const [showExportMenu, setShowExportMenu] = React.useState(false)

  React.useEffect(() => {
    setLocalRange(dateRange)
  }, [dateRange])

  const handlePresetClick = (days: number) => {
    const to = new Date()
    const from = addDays(to, -days)
    const newRange = { from, to }
    setLocalRange(newRange)
    onDateChange?.(newRange)
  }

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) return

    if (!localRange?.from) {
      setLocalRange({ from: day, to: day })
      onDateChange?.({ from: day, to: day })
    } else if (!localRange.to) {
      if (day < localRange.from) {
        setLocalRange({ from: day, to: localRange.from })
        onDateChange?.({ from: day, to: localRange.from })
      } else {
        setLocalRange({ ...localRange, to: day })
        onDateChange?.({ ...localRange, to: day })
      }
      setOpen(false)
    } else {
      setLocalRange({ from: day, to: day })
      onDateChange?.({ from: day, to: day })
    }
  }

  const daysDiff = getDaysDifference(localRange?.from, localRange?.to)

  const handleReset = () => {
    setLocalRange(undefined)
    setOpen(false)
    onReset?.()
  }

  return (
    <div className="w-full space-y-3">
      {/* Main Filter Row */}
      <div className="flex flex-col gap-3">
        {/* Top Row: Date Picker + Info Badges */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
          {/* Date Range Picker */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-between gap-2 px-4 py-5 border-2 transition-all min-w-max",
                  "bg-white hover:bg-gray-50 text-left font-medium",
                  open && "border-blue-500 bg-blue-50",
                  dateRange && "border-blue-300 bg-blue-50"
                )}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-500 font-normal">Período</span>
                    {localRange?.from && localRange?.to ? (
                      <span className="text-sm">
                        {formatDateDisplay(localRange.from)} → {formatDateDisplay(localRange.to)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Selecione período</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform flex-shrink-0", open && "rotate-180")} />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0 bg-white shadow-lg border-0 rounded-lg overflow-hidden">
              <div className="flex">
                {/* Presets Sidebar */}
                <div className="w-40 border-r border-gray-200 p-3 bg-gradient-to-b from-gray-50 to-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2 px-2 uppercase tracking-wider">
                    Períodos Rápidos
                  </p>
                  <div className="space-y-1">
                    {PRESET_RANGES.map((preset) => (
                      <button
                        key={preset.days}
                        onClick={() => handlePresetClick(preset.days)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          daysDiff === preset.days
                            ? "bg-blue-500 text-white"
                            : "text-gray-700 hover:bg-white"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-gray-300 mt-3 pt-3">
                    <button
                      onClick={handleReset}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Limpar Filtro
                    </button>
                  </div>
                </div>

                {/* Calendar */}
                <div className="p-4 bg-white">
                  <div className="space-y-4">
                    {/* From Date */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                        Data Inicial
                      </p>
                      <CalendarComponent
                        mode="single"
                        selected={localRange?.from}
                        onSelect={(day) => {
                          if (!localRange?.from || !localRange?.to) {
                            setLocalRange({ from: day, to: day })
                          } else if (day && day <= (localRange?.to || new Date())) {
                            setLocalRange({ from: day, to: localRange.to })
                          }
                        }}
                        disabled={(date) =>
                          localRange?.to ? date > localRange.to : false
                        }
                        className="border-0"
                      />
                    </div>

                    <div className="border-t border-gray-200" />

                    {/* To Date */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">
                        Data Final
                      </p>
                      <CalendarComponent
                        mode="single"
                        selected={localRange?.to}
                        onSelect={(day) => {
                          if (day && localRange?.from && day >= localRange.from) {
                            setLocalRange({ ...localRange, to: day })
                            onDateChange?.({ ...localRange, to: day })
                            setOpen(false)
                          }
                        }}
                        disabled={(date) =>
                          localRange?.from ? date < localRange.from : false
                        }
                        className="border-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Info Badges */}
          {localRange?.from && localRange?.to && (
            <div className="flex gap-2 flex-wrap">
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">
                {daysDiff} dias
              </div>
              <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
                {formatDateDisplay(localRange.from)}
              </div>
              <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-xs font-semibold text-purple-700">
                {formatDateDisplay(localRange.to)}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row: Lead Filters + Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap sm:justify-between">
          {/* Lead Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={leadFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onLeadFilterChange?.("all")}
              className={cn(
                "transition-all font-semibold",
                leadFilter === "all"
                  ? "bg-amber-400 hover:bg-amber-500 text-amber-900"
                  : "bg-white hover:bg-amber-50 text-amber-700 border-2 border-amber-300"
              )}
            >
              Todos
            </Button>
            <Button
              variant={leadFilter === "lead" ? "default" : "outline"}
              size="sm"
              onClick={() => onLeadFilterChange?.("lead")}
              className={cn(
                "transition-all flex items-center gap-1.5 font-semibold",
                leadFilter === "lead"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-white hover:bg-amber-50 text-amber-700 border-2 border-amber-300"
              )}
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Leads</span>
            </Button>
            <Button
              variant={leadFilter === "non-lead" ? "default" : "outline"}
              size="sm"
              onClick={() => onLeadFilterChange?.("non-lead")}
              className={cn(
                "transition-all font-semibold",
                leadFilter === "non-lead"
                  ? "bg-amber-400 hover:bg-amber-500 text-amber-900"
                  : "bg-white hover:bg-amber-50 text-amber-700 border-2 border-amber-300"
              )}
            >
              <span className="hidden sm:inline">Outros</span>
              <span className="sm:hidden">Não-Leads</span>
            </Button>
          </div>

          {/* Export and Reset Buttons */}
          <div className="flex gap-2 flex-wrap">
            {/* Export Menu */}
            <Popover open={showExportMenu} onOpenChange={setShowExportMenu}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 gap-1.5 text-xs px-2.5 font-medium border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm text-slate-600"
                  disabled={isLoading || !localRange?.from}
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Exportar</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" side="bottom" align="end">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onExport?.("csv")
                      setShowExportMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => {
                      onExport?.("excel")
                      setShowExportMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => {
                      onExport?.("pdf")
                      setShowExportMenu(false)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || !localRange?.from}
              className="h-8 gap-1.5 text-xs px-2.5 font-medium border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm text-slate-600"
            >
              <RotateCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Limpar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
