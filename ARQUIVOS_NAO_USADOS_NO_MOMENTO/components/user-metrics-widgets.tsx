
import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  Star,
  Settings,
  Eye,
  EyeOff,
  GripVertical,
  Download,
} from "lucide-react"
import { WidgetManagementPanel } from "./widget-management-panel"

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

const defaultWidgets: Widget[] = [
  {
    id: "total-users",
    title: "Total de Usuários",
    value: "2,847",
    subtitle: "Usuários cadastrados",
    change: "+12.5%",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    visible: true,
    description: "Total de usuários cadastrados na plataforma",
  },
  {
    id: "active-90d",
    title: "Usuários Ativos (90d)",
    value: "2,134",
    subtitle: "Últimos 90 dias",
    change: "+8.3%",
    icon: UserCheck,
    color: "from-green-500 to-green-600",
    visible: true,
    description: "Usuários que acessaram a plataforma nos últimos 90 dias",
  },
  {
    id: "mau",
    title: "MAU",
    value: "1,847",
    subtitle: "Usuários ativos mensais",
    change: "+15.2%",
    icon: Calendar,
    color: "from-purple-500 to-purple-600",
    visible: true,
    description: "Monthly Active Users - Usuários ativos no último mês",
  },
  {
    id: "dau",
    title: "DAU",
    value: "623",
    subtitle: "Usuários ativos diários",
    change: "+5.7%",
    icon: TrendingUp,
    color: "from-orange-500 to-orange-600",
    visible: true,
    description: "Daily Active Users - Usuários ativos hoje",
  },
  {
    id: "nps",
    title: "NPS",
    value: "8.7",
    subtitle: "Última pesquisa: Jan/2024",
    change: "+0.3 pts",
    icon: Star,
    color: "from-yellow-500 to-yellow-600",
    visible: true,
    description: "Net Promoter Score - Atualizado trimestralmente via pesquisa Allka",
  },
]

export function UserMetricsWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets)
  const [editMode, setEditMode] = useState(false)
  const [showManagementPanel, setShowManagementPanel] = useState(false)
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null)

  const visibleWidgets = widgets.filter((w) => w.visible)

  const toggleWidgetVisibility = (id: string) => {
    setWidgets(widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
  }

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", widgetId)
  }

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverWidget(widgetId)
  }

  const handleDragLeave = () => {
    setDragOverWidget(null)
  }

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault()

    if (!draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null)
      setDragOverWidget(null)
      return
    }

    const draggedIndex = widgets.findIndex((w) => w.id === draggedWidget)
    const targetIndex = widgets.findIndex((w) => w.id === targetWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newWidgets = [...widgets]
    const [removed] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, removed)

    setWidgets(newWidgets)
    setDraggedWidget(null)
    setDragOverWidget(null)
  }

  const handleDragEnd = () => {
    setDraggedWidget(null)
    setDragOverWidget(null)
  }

  const exportToPDF = async () => {
    try {
      const jsPDF = (await import("jspdf")).default
      const doc = new jsPDF()

      doc.setFontSize(20)
      doc.setTextColor(59, 130, 246)
      doc.text("Dashboard de Métricas de Usuários", 20, 20)

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 30)

      let yPosition = 45
      visibleWidgets.forEach((widget, index) => {
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text(`${index + 1}. ${widget.title}`, 20, yPosition)

        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text(`Valor: ${widget.value}`, 30, yPosition + 7)
        doc.text(`${widget.subtitle}`, 30, yPosition + 14)
        doc.text(`Variação: ${widget.change}`, 30, yPosition + 21)
        doc.text(`Descrição: ${widget.description}`, 30, yPosition + 28)

        yPosition += 40

        if (yPosition > 250 && index < visibleWidgets.length - 1) {
          doc.addPage()
          yPosition = 20
        }
      })

      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      } else {
        yPosition += 10
      }

      doc.setFontSize(16)
      doc.setTextColor(59, 130, 246)
      doc.text("Configurações do Dashboard", 20, yPosition)

      yPosition += 10
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text(`Total de widgets disponíveis: ${widgets.length}`, 20, yPosition)
      doc.text(`Widgets visíveis: ${visibleWidgets.length}`, 20, yPosition + 7)
      doc.text(`Widgets ocultos: ${widgets.length - visibleWidgets.length}`, 20, yPosition + 14)

      doc.save(`dashboard-metricas-${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("[v0] Error generating PDF:", error)
      alert("Erro ao gerar PDF. Por favor, tente novamente.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground text-2xl leading-[1.8rem]">Métricas de Usuários</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Principais indicadores da plataforma</p>
        </div>
        <div className="flex items-center space-x-2">
          {editMode && (
            <Badge variant="outline" className="bg-info-muted text-info-foreground border-info animate-pulse">
              <Settings className="h-3 w-3 mr-1" />
              Modo de Edição
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            className="flex items-center space-x-2 border-success text-success-foreground hover:bg-success-muted hover:scale-105 transition-all bg-transparent"
            title="Exportar dashboard para PDF"
          >
            <Download className="h-4 w-4" />
            <span>Exportar PDF</span>
          </Button>
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="flex items-center space-x-2 transition-all hover:scale-105"
          >
            {editMode ? <Eye className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            <span>{editMode ? "Concluir Edição" : "Editar Widgets"}</span>
          </Button>
          {editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowManagementPanel(true)}
              className="flex items-center space-x-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:scale-105 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950 transition-all"
            >
              <Settings className="h-4 w-4" />
              <span>Gerenciar</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 transition-all duration-300">
        {visibleWidgets.map((widget, index) => (
          <Card
            key={widget.id}
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={(e) => handleDragOver(e, widget.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
            className={`relative overflow-hidden border-2 transition-all duration-200 ${
              editMode
                ? `hover:shadow-xl hover:scale-[1.02] cursor-move border-dashed border-info animate-in fade-in-0 slide-in-from-bottom-4 ${
                    draggedWidget === widget.id ? "opacity-50 scale-95" : ""
                  } ${
                    dragOverWidget === widget.id && draggedWidget !== widget.id
                      ? "border-success shadow-lg shadow-success/50 scale-105"
                      : ""
                  }`
                : "hover:shadow-lg hover:border-border animate-in fade-in-0 slide-in-from-bottom-2"
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {editMode && (
              <>
                <div className="absolute top-2 left-2 z-10 p-1.5 bg-background/95 rounded-lg backdrop-blur-sm shadow-md border cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-info" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleWidgetVisibility(widget.id)}
                  className="absolute top-2 right-2 z-10 h-7 w-7 p-0 bg-background/95 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive hover:scale-110 transition-all shadow-md border"
                  title="Ocultar widget"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </>
            )}
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${widget.color} mb-3 shadow-lg`}>
                <widget.icon className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground leading-none">{widget.title}</p>
                <p className="text-3xl font-bold text-foreground leading-none">{widget.value}</p>
                <p className="text-xs text-muted-foreground leading-none">{widget.subtitle}</p>
                <div className="flex items-center space-x-1 pt-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${
                      widget.change.startsWith("+")
                        ? "bg-success-muted text-success-foreground border-success"
                        : "bg-destructive/10 text-destructive border-destructive"
                    }`}
                  >
                    {widget.change}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editMode && (
        <div className="p-4 bg-gradient-to-r from-info-muted/50 to-primary/5 rounded-lg border-2 border-info/30 shadow-sm animate-in fade-in-0 slide-in-from-top-2">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-info rounded-lg shadow-md">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-info-foreground">Modo de Edição Ativo</p>
              <p className="text-sm text-info-foreground/80 mt-1">
                Arraste os widgets pelo ícone <GripVertical className="inline h-3 w-3 mx-1" /> para reorganizar, clique
                em <EyeOff className="inline h-3 w-3 mx-1" /> para ocultar, ou em "Gerenciar" para adicionar novos
                widgets e visualizar widgets ocultos.
              </p>
            </div>
          </div>
        </div>
      )}

      <WidgetManagementPanel
        open={showManagementPanel}
        onOpenChange={setShowManagementPanel}
        widgets={widgets}
        onUpdateWidgets={setWidgets}
      />
    </div>
  )
}
