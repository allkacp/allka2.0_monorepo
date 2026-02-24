
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Filter,
  Bell,
  BarChart3,
  Search,
  Mail,
  MessageSquare,
} from "lucide-react"

// Mock data - would come from API
const availabilityData = [
  {
    id: 1,
    category: "Design Gráfico",
    activeNomades: 45,
    tasksLast30Days: 128,
    availableHours: 180,
    status: "green" as const,
    needsMoreProfessionals: false,
    demandTrend: "+15%",
    averageTaskDuration: 4.2,
    completionRate: 96,
    leader: "Ana Silva",
  },
  {
    id: 2,
    category: "Copywriting",
    activeNomades: 32,
    tasksLast30Days: 95,
    availableHours: 96,
    status: "yellow" as const,
    needsMoreProfessionals: true,
    demandTrend: "+28%",
    averageTaskDuration: 3.8,
    completionRate: 92,
    leader: "Carlos Santos",
  },
  {
    id: 3,
    category: "Social Media",
    activeNomades: 28,
    tasksLast30Days: 156,
    availableHours: 42,
    status: "red" as const,
    needsMoreProfessionals: true,
    demandTrend: "+45%",
    averageTaskDuration: 2.5,
    completionRate: 88,
    leader: "Marina Costa",
  },
  {
    id: 4,
    category: "Desenvolvimento Web",
    activeNomades: 18,
    tasksLast30Days: 34,
    availableHours: 144,
    status: "green" as const,
    needsMoreProfessionals: false,
    demandTrend: "+8%",
    averageTaskDuration: 6.1,
    completionRate: 98,
    leader: "Ricardo Oliveira",
  },
  {
    id: 5,
    category: "Edição de Vídeo",
    activeNomades: 22,
    tasksLast30Days: 67,
    availableHours: 88,
    status: "yellow" as const,
    needsMoreProfessionals: true,
    demandTrend: "+22%",
    averageTaskDuration: 5.0,
    completionRate: 90,
    leader: "Fernanda Lima",
  },
  {
    id: 6,
    category: "Marketing Digital",
    activeNomades: 15,
    tasksLast30Days: 89,
    availableHours: 24,
    status: "red" as const,
    needsMoreProfessionals: true,
    demandTrend: "+67%",
    averageTaskDuration: 3.2,
    completionRate: 85,
    leader: "Gustavo Pereira",
  },
]

const notificationSettings = {
  yellowAlert: { enabled: true, leaders: true, admins: false },
  redAlert: { enabled: true, leaders: true, admins: true, email: true },
  dailyReport: { enabled: true, time: "09:00" },
  weeklyReport: { enabled: true, day: "monday" },
}

export default function AvailabilityPage() {
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    leader: "all",
    minHours: "",
    maxHours: "",
    search: "",
  })

  const [showFilters, setShowFilters] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const filteredData = availabilityData.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false
    if (filters.status !== "all" && item.status !== filters.status) return false
    if (filters.leader !== "all" && item.leader !== filters.leader) return false
    if (filters.minHours && item.availableHours < Number.parseInt(filters.minHours)) return false
    if (filters.maxHours && item.availableHours > Number.parseInt(filters.maxHours)) return false
    if (filters.search && !item.category.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const getStatusColor = (status: string) => {
    const colors = {
      green: "bg-green-100 text-green-800 border-green-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      red: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[status as keyof typeof colors]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "green":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "yellow":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "red":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <CheckCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "green":
        return "Capacidade Adequada"
      case "yellow":
        return "Atenção Necessária"
      case "red":
        return "Capacidade Crítica"
      default:
        return "Status Desconhecido"
    }
  }

  const criticalCategories = filteredData.filter((cat) => cat.status === "red")
  const warningCategories = filteredData.filter((cat) => cat.status === "yellow")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Disponibilidade</h1>
          <p className="text-gray-600 mt-1">Monitore a capacidade da plataforma por categoria de serviço.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={showFilters} onOpenChange={setShowFilters}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {(filters.category !== "all" ||
                  filters.status !== "all" ||
                  filters.leader !== "all" ||
                  filters.minHours ||
                  filters.maxHours ||
                  filters.search) && <Badge className="ml-2 bg-blue-100 text-blue-800">Ativo</Badge>}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Filtros Avançados</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Buscar Categoria</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Digite o nome da categoria..."
                      className="pl-10"
                      value={filters.search}
                      onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {availabilityData.map((item) => (
                        <SelectItem key={item.id} value={item.category}>
                          {item.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="green">Capacidade Adequada</SelectItem>
                      <SelectItem value="yellow">Atenção Necessária</SelectItem>
                      <SelectItem value="red">Capacidade Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="leader">Líder</Label>
                  <Select
                    value={filters.leader}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, leader: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os líderes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os líderes</SelectItem>
                      {Array.from(new Set(availabilityData.map((item) => item.leader))).map((leader) => (
                        <SelectItem key={leader} value={leader}>
                          {leader}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minHours">Horas Mín.</Label>
                    <Input
                      id="minHours"
                      type="number"
                      placeholder="0"
                      value={filters.minHours}
                      onChange={(e) => setFilters((prev) => ({ ...prev, minHours: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxHours">Horas Máx.</Label>
                    <Input
                      id="maxHours"
                      type="number"
                      placeholder="999"
                      value={filters.maxHours}
                      onChange={(e) => setFilters((prev) => ({ ...prev, maxHours: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() =>
                      setFilters({
                        category: "all",
                        status: "all",
                        leader: "all",
                        minHours: "",
                        maxHours: "",
                        search: "",
                      })
                    }
                  >
                    Limpar
                  </Button>
                  <Button className="flex-1" onClick={() => setShowFilters(false)}>
                    Aplicar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Bell className="h-4 w-4 mr-2" />
                Notificações
                {(criticalCategories.length > 0 || warningCategories.length > 0) && (
                  <Badge className="ml-2 bg-red-100 text-red-800">
                    {criticalCategories.length + warningCategories.length}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Configurações de Notificação</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Alertas de Capacidade</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium text-yellow-800">Nível Amarelo</p>
                          <p className="text-sm text-yellow-600">Notificar líderes da categoria</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        <Switch defaultChecked />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-red-800">Nível Vermelho</p>
                            <p className="text-sm text-red-600">Notificar administradores</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          <Switch defaultChecked />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 ml-6">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="font-medium text-red-800">E-mail para Admins</p>
                            <p className="text-sm text-red-600">Envio automático por e-mail</p>
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Relatórios Automáticos</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <p className="font-medium text-blue-800">Relatório Diário</p>
                        <p className="text-sm text-blue-600">Enviado às 09:00</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <p className="font-medium text-blue-800">Relatório Semanal</p>
                        <p className="text-sm text-blue-600">Enviado às segundas-feiras</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                {(criticalCategories.length > 0 || warningCategories.length > 0) && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Alertas Ativos</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {criticalCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-3 p-2 bg-red-50 rounded border border-red-200"
                        >
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">{cat.category}</p>
                            <p className="text-xs text-red-600">
                              Capacidade crítica - {cat.availableHours}h disponíveis
                            </p>
                          </div>
                        </div>
                      ))}
                      {warningCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-3 p-2 bg-yellow-50 rounded border border-yellow-200"
                        >
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">{cat.category}</p>
                            <p className="text-xs text-yellow-600">
                              Atenção necessária - {cat.availableHours}h disponíveis
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Relatório
          </Button>
        </div>
      </div>

      {(criticalCategories.length > 0 || warningCategories.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {criticalCategories.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Capacidade Crítica</h3>
                    <p className="text-sm text-red-600 mt-1">
                      {criticalCategories.length} categoria(s) precisam de atenção imediata
                    </p>
                    <div className="mt-2">
                      {criticalCategories.map((cat, index) => (
                        <Badge key={index} className="mr-2 mb-1 bg-red-100 text-red-800 border-red-200">
                          {cat.category} ({cat.availableHours}h)
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-red-500 mt-2">⚠️ Administradores foram notificados por e-mail</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          )}

          {warningCategories.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800">Atenção Necessária</h3>
                    <p className="text-sm text-yellow-600 mt-1">
                      {warningCategories.length} categoria(s) em estado de alerta
                    </p>
                    <div className="mt-2">
                      {warningCategories.map((cat, index) => (
                        <Badge key={index} className="mr-2 mb-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                          {cat.category} ({cat.availableHours}h)
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-600 mt-2">📱 Líderes das categorias foram notificados</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(filters.category !== "all" ||
        filters.status !== "all" ||
        filters.leader !== "all" ||
        filters.minHours ||
        filters.maxHours ||
        filters.search) && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter className="h-4 w-4" />
          Mostrando {filteredData.length} de {availabilityData.length} categorias
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({ category: "all", status: "all", leader: "all", minHours: "", maxHours: "", search: "" })
            }
          >
            Limpar filtros
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((category, index) => (
          <Card
            key={index}
            className={`border-2 ${
              category.status === "red"
                ? "border-red-200"
                : category.status === "yellow"
                  ? "border-yellow-200"
                  : "border-green-200"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{category.category}</h3>
                {getStatusIcon(category.status)}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{category.activeNomades}</p>
                    <p className="text-xs text-gray-600">Nômades Ativos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{category.tasksLast30Days}</p>
                    <p className="text-xs text-gray-600">Tarefas (30d)</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{category.availableHours}h</p>
                    <p className="text-xs text-gray-600">Disponíveis</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">{category.averageTaskDuration}h</p>
                    <p className="text-xs text-gray-500">Duração Média</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">{category.completionRate}%</p>
                    <p className="text-xs text-gray-500">Taxa Conclusão</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(category.status)}>{getStatusText(category.status)}</Badge>
                    <div className="flex items-center text-sm">
                      <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-gray-600">{category.demandTrend}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Capacidade</span>
                      <span>
                        {Math.min(100, Math.round((category.availableHours / (category.tasksLast30Days * 2)) * 100))}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          category.status === "red"
                            ? "bg-red-500"
                            : category.status === "yellow"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (category.availableHours / (category.tasksLast30Days * 2)) * 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600">
                    Líder: <span className="font-medium">{category.leader}</span>
                  </p>
                </div>

                {category.needsMoreProfessionals && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-800 font-medium">Recomendação: Recrutar mais profissionais</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Demanda crescente de {category.demandTrend} nos últimos 30 dias
                    </p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                    Ver Detalhes
                  </Button>
                  {category.needsMoreProfessionals && (
                    <Button size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
                      Recrutar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resumo Geral da Plataforma</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {filteredData.reduce((acc, cat) => acc + cat.activeNomades, 0)}
              </p>
              <p className="text-sm text-gray-600">Total de Nômades Ativos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {filteredData.reduce((acc, cat) => acc + cat.tasksLast30Days, 0)}
              </p>
              <p className="text-sm text-gray-600">Tarefas Últimos 30 Dias</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {filteredData.reduce((acc, cat) => acc + cat.availableHours, 0)}h
              </p>
              <p className="text-sm text-gray-600">Horas Disponíveis Total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {Math.round(
                  (filteredData.reduce((acc, cat) => acc + cat.tasksLast30Days * cat.averageTaskDuration, 0) /
                    filteredData.reduce((acc, cat) => acc + cat.availableHours, 0)) *
                    100,
                )}
                %
              </p>
              <p className="text-sm text-gray-600">Taxa de Utilização</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{criticalCategories.length + warningCategories.length}</p>
              <p className="text-sm text-gray-600">Alertas Ativos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
