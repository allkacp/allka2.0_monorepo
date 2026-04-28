
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  LayoutDashboard,
  BarChart3,
  DollarSign,
  Activity,
  TrendingUp,
  PieChart,
} from "lucide-react"
import type { DashboardWidget, DashboardLayout } from "@/types/dashboard"

const widgetTypes = [
  { value: "stats", label: "Estatísticas", icon: BarChart3 },
  { value: "chart", label: "Gráfico", icon: PieChart },
  { value: "table", label: "Tabela", icon: LayoutDashboard },
  { value: "activity", label: "Atividades", icon: Activity },
  { value: "progress", label: "Progresso", icon: TrendingUp },
  { value: "metric", label: "Métrica", icon: DollarSign },
]

const accountTypes = [
  { value: "empresas", label: "Empresas" },
  { value: "agencias", label: "Agências" },
  { value: "nomades", label: "Nômades" },
  { value: "admin", label: "Administradores" },
]

const accountLevels = [
  { value: "basic", label: "Básico" },
  { value: "partner", label: "Partner" },
  { value: "premium", label: "Premium" },
  { value: "leader", label: "Líder" },
]

export default function DashboardConfigPage() {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([])
  const [selectedLayout, setSelectedLayout] = useState<DashboardLayout | null>(null)
  const [showWidgetDialog, setShowWidgetDialog] = useState(false)
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null)
  const [loading, setLoading] = useState(true)

  const [newWidget, setNewWidget] = useState({
    type: "stats" as const,
    title: "",
    position: { x: 0, y: 0, width: 4, height: 2 },
    config: {},
    visible: true,
    account_types: [] as string[],
    account_levels: [] as string[],
  })

  useEffect(() => {
    loadDashboardLayouts()
  }, [])

  const loadDashboardLayouts = async () => {
    try {
      setLoading(true)
      // Simulated data - replace with actual API call
      const mockLayouts: DashboardLayout[] = [
        {
          id: "1",
          account_type: "empresas",
          widgets: [
            {
              id: "w1",
              type: "stats",
              title: "Projetos Ativos",
              position: { x: 0, y: 0, width: 3, height: 2 },
              config: { metric: "active_projects", color: "blue" },
              visible: true,
              account_types: ["empresas"],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: "w2",
              type: "chart",
              title: "Receita Mensal",
              position: { x: 3, y: 0, width: 6, height: 4 },
              config: { chart_type: "line", data_source: "monthly_revenue" },
              visible: true,
              account_types: ["empresas"],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          is_default: true,
          created_by: "admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
      setLayouts(mockLayouts)
      setSelectedLayout(mockLayouts[0])
    } catch (error) {
      console.error("Error loading dashboard layouts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWidget = async () => {
    if (!selectedLayout || !newWidget.title.trim()) return

    const widget: DashboardWidget = {
      id: `w${Date.now()}`,
      ...newWidget,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updatedLayout = {
      ...selectedLayout,
      widgets: [...selectedLayout.widgets, widget],
      updated_at: new Date().toISOString(),
    }

    setLayouts(layouts.map((l) => (l.id === selectedLayout.id ? updatedLayout : l)))
    setSelectedLayout(updatedLayout)
    setShowWidgetDialog(false)
    setNewWidget({
      type: "stats",
      title: "",
      position: { x: 0, y: 0, width: 4, height: 2 },
      config: {},
      visible: true,
      account_types: [],
      account_levels: [],
    })
  }

  const handleDeleteWidget = (widgetId: string) => {
    if (!selectedLayout) return

    const updatedLayout = {
      ...selectedLayout,
      widgets: selectedLayout.widgets.filter((w) => w.id !== widgetId),
      updated_at: new Date().toISOString(),
    }

    setLayouts(layouts.map((l) => (l.id === selectedLayout.id ? updatedLayout : l)))
    setSelectedLayout(updatedLayout)
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    if (!selectedLayout) return

    const updatedLayout = {
      ...selectedLayout,
      widgets: selectedLayout.widgets.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w)),
      updated_at: new Date().toISOString(),
    }

    setLayouts(layouts.map((l) => (l.id === selectedLayout.id ? updatedLayout : l)))
    setSelectedLayout(updatedLayout)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Configuração de Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Configure widgets e layouts para cada tipo de conta</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações Globais
          </Button>
          <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Widget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Widget</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="widget-title">Título do Widget</Label>
                    <Input
                      id="widget-title"
                      value={newWidget.title}
                      onChange={(e) => setNewWidget((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Projetos Ativos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="widget-type">Tipo de Widget</Label>
                    <Select
                      value={newWidget.type}
                      onValueChange={(value) => setNewWidget((prev) => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {widgetTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center">
                              <type.icon className="h-4 w-4 mr-2" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Posição X</Label>
                    <Input
                      type="number"
                      value={newWidget.position.x}
                      onChange={(e) =>
                        setNewWidget((prev) => ({
                          ...prev,
                          position: { ...prev.position, x: Number.parseInt(e.target.value) || 0 },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Posição Y</Label>
                    <Input
                      type="number"
                      value={newWidget.position.y}
                      onChange={(e) =>
                        setNewWidget((prev) => ({
                          ...prev,
                          position: { ...prev.position, y: Number.parseInt(e.target.value) || 0 },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Largura</Label>
                    <Input
                      type="number"
                      value={newWidget.position.width}
                      onChange={(e) =>
                        setNewWidget((prev) => ({
                          ...prev,
                          position: { ...prev.position, width: Number.parseInt(e.target.value) || 1 },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Altura</Label>
                    <Input
                      type="number"
                      value={newWidget.position.height}
                      onChange={(e) =>
                        setNewWidget((prev) => ({
                          ...prev,
                          position: { ...prev.position, height: Number.parseInt(e.target.value) || 1 },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newWidget.visible}
                    onCheckedChange={(checked) => setNewWidget((prev) => ({ ...prev, visible: checked }))}
                  />
                  <Label>Widget visível por padrão</Label>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowWidgetDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateWidget}>Criar Widget</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Layout Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LayoutDashboard className="h-5 w-5 mr-2" />
            Layouts por Tipo de Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedLayout?.account_type}
            onValueChange={(value) => {
              const layout = layouts.find((l) => l.account_type === value)
              setSelectedLayout(layout || null)
            }}
          >
            <TabsList className="grid w-full grid-cols-4">
              {accountTypes.map((type) => (
                <TabsTrigger key={type.value} value={type.value}>
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {accountTypes.map((type) => (
              <TabsContent key={type.value} value={type.value} className="mt-6">
                {selectedLayout && selectedLayout.account_type === type.value ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Widgets para {type.label}</h3>
                      <Badge variant="outline">{selectedLayout.widgets.length} widgets</Badge>
                    </div>

                    <div className="grid gap-4">
                      {selectedLayout.widgets.map((widget) => (
                        <Card key={widget.id} className={!widget.visible ? "opacity-50" : ""}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {widgetTypes.find((t) => t.value === widget.type)?.icon && (
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    {(() => {
                                      const IconComponent = widgetTypes.find((t) => t.value === widget.type)?.icon
                                      return IconComponent ? <IconComponent className="h-4 w-4 text-blue-600" /> : null
                                    })()}
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-semibold">{widget.title}</h4>
                                  <p className="text-sm text-gray-600">
                                    {widgetTypes.find((t) => t.value === widget.type)?.label} • Posição:{" "}
                                    {widget.position.x},{widget.position.y} • Tamanho: {widget.position.width}x
                                    {widget.position.height}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => toggleWidgetVisibility(widget.id)}>
                                  {widget.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingWidget(widget)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteWidget(widget.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {selectedLayout.widgets.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <LayoutDashboard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhum widget configurado para este tipo de conta</p>
                          <p className="text-sm">Clique em "Novo Widget" para começar</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Layout não encontrado para {type.label}</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
