
import { useState } from "react"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Users, UserCheck, Calendar, TrendingUp, Star, Eye, EyeOff, RotateCcw, Save, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Widget {
  id: string
  title: string
  value: string
  subtitle: string
  change: string
  icon: any
  color: string
  visible: boolean
  description: string
}

interface WidgetManagementPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widgets: Widget[]
  onUpdateWidgets: (widgets: Widget[]) => void
}

const availableWidgets = [
  {
    id: "total-users",
    title: "Total de Usuários",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    description: "Total de usuários cadastrados na plataforma",
  },
  {
    id: "active-90d",
    title: "Usuários Ativos (90d)",
    icon: UserCheck,
    color: "from-green-500 to-green-600",
    description: "Usuários que acessaram a plataforma nos últimos 90 dias",
  },
  {
    id: "mau",
    title: "MAU",
    icon: Calendar,
    color: "from-purple-500 to-purple-600",
    description: "Monthly Active Users - Usuários ativos no último mês",
  },
  {
    id: "dau",
    title: "DAU",
    icon: TrendingUp,
    color: "from-orange-500 to-orange-600",
    description: "Daily Active Users - Usuários ativos hoje",
  },
  {
    id: "nps",
    title: "NPS",
    icon: Star,
    color: "from-yellow-500 to-yellow-600",
    description: "Net Promoter Score - Atualizado trimestralmente via pesquisa Allka",
  },
]

export function WidgetManagementPanel({ open, onOpenChange, widgets, onUpdateWidgets }: WidgetManagementPanelProps) {
  const [localWidgets, setLocalWidgets] = useState<Widget[]>(widgets)
  const [hasChanges, setHasChanges] = useState(false)

  const toggleWidgetVisibility = (id: string) => {
    setLocalWidgets(localWidgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
    setHasChanges(true)
  }

  const showAllWidgets = () => {
    setLocalWidgets(localWidgets.map((w) => ({ ...w, visible: true })))
    setHasChanges(true)
  }

  const hideAllWidgets = () => {
    setLocalWidgets(localWidgets.map((w) => ({ ...w, visible: false })))
    setHasChanges(true)
  }

  const resetToDefault = () => {
    setLocalWidgets(widgets)
    setHasChanges(false)
  }

  const saveChanges = () => {
    onUpdateWidgets(localWidgets)
    setHasChanges(false)
    onOpenChange(false)
  }

  const hiddenWidgetsCount = localWidgets.filter((w) => !w.visible).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 right-0 z-50 h-[calc(100vh-32px)] bg-background w-[800px]",
            "shadow-[rgba(0,0,0,0.2)_-8px_0px_32px_0px,rgba(0,0,0,0.1)_-4px_0px_16px_0px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
            "duration-300 ease-in-out overflow-hidden flex flex-col",
          )}
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Gerenciar Widgets
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">Ative ou desative widgets com um clique</p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border mb-3">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Ações Rápidas</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={showAllWidgets}
                  className="h-7 text-xs text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Mostrar Todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={hideAllWidgets}
                  className="h-7 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900"
                >
                  <EyeOff className="h-3 w-3 mr-1" />
                  Ocultar Todos
                </Button>
              </div>
            </div>

            {localWidgets.map((widget) => {
              const widgetInfo = availableWidgets.find((w) => w.id === widget.id)
              if (!widgetInfo) return null

              return (
                <div
                  key={widget.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:shadow-md",
                    !widget.visible
                      ? "opacity-40 bg-gray-50/50 dark:bg-gray-900/50 border-dashed border-gray-300 dark:border-gray-700"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950",
                  )}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "p-2 rounded-lg bg-gradient-to-br shadow-sm flex-shrink-0",
                        widgetInfo.color,
                        !widget.visible && "opacity-50",
                      )}
                    >
                      <widgetInfo.icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          "font-semibold text-sm truncate",
                          !widget.visible ? "text-gray-500 dark:text-gray-500" : "text-gray-900 dark:text-gray-100",
                        )}
                      >
                        {widgetInfo.title}
                      </h3>
                      <p
                        className={cn(
                          "text-xs mt-0.5 truncate",
                          !widget.visible ? "text-gray-400 dark:text-gray-600" : "text-muted-foreground",
                        )}
                      >
                        {widgetInfo.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={widget.visible}
                    onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                    className="data-[state=checked]:bg-green-600 scale-110"
                  />
                </div>
              )
            })}
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <Badge
                  variant="outline"
                  className="bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 animate-pulse"
                >
                  <Info className="h-3 w-3 mr-1" />
                  Não salvo
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {localWidgets.filter((w) => w.visible).length} de {localWidgets.length} visíveis
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                disabled={!hasChanges}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 bg-transparent"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
              <Button
                onClick={saveChanges}
                disabled={!hasChanges}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
