
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, ArrowUp, ArrowDown, Users, CheckCircle, Settings, BarChart3 } from "lucide-react"
import type { MatchQueueEntry, MatchQueueStats, QueueMovement, DistributionAttempt } from "@/types/match-queue"

export default function MatchQueuePage() {
  const [queueEntries, setQueueEntries] = useState<MatchQueueEntry[]>([])
  const [stats, setStats] = useState<MatchQueueStats | null>(null)
  const [movements, setMovements] = useState<QueueMovement[]>([])
  const [distributions, setDistributions] = useState<DistributionAttempt[]>([])
  const [selectedEntry, setSelectedEntry] = useState<MatchQueueEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Filtros
  const [filters, setFilters] = useState({
    partner_level: "all",
    match_status: "all",
    capacity_status: "all",
    report_status: "all",
    search: "",
  })

  // Mock data - Em produção, viria da API
  useEffect(() => {
    const mockQueue: MatchQueueEntry[] = [
      {
        id: "1",
        agency_id: "agency_1",
        agency_name: "Creative Partners",
        partner_level: "elite",
        position: 1,
        match_enabled: true,
        has_pending_reports: false,
        pending_reports_count: 0,
        last_report_date: "2024-01-15",
        active_projects: 3,
        max_capacity: 8,
        satisfaction_rating: 4.8,
        completion_rate: 95,
        last_project_assigned: "2024-01-10",
        total_projects_assigned: 24,
        joined_queue: "2023-06-15",
        is_new_partner: false,
      },
      {
        id: "2",
        agency_id: "agency_2",
        agency_name: "Digital Solutions",
        partner_level: "premium",
        position: 2,
        match_enabled: true,
        has_pending_reports: true,
        pending_reports_count: 2,
        last_report_date: "2024-01-05",
        active_projects: 5,
        max_capacity: 6,
        satisfaction_rating: 4.2,
        completion_rate: 88,
        total_projects_assigned: 18,
        joined_queue: "2023-08-20",
        is_new_partner: false,
      },
      {
        id: "3",
        agency_id: "agency_3",
        agency_name: "Innovation Hub",
        partner_level: "basic",
        position: 3,
        match_enabled: false,
        has_pending_reports: false,
        pending_reports_count: 0,
        active_projects: 2,
        max_capacity: 4,
        satisfaction_rating: 4.5,
        completion_rate: 92,
        total_projects_assigned: 8,
        joined_queue: "2024-01-01",
        is_new_partner: true,
        temporary_suspension: {
          reason: "Aguardando documentação",
          until: "2024-01-25",
          suspended_by: "admin_1",
        },
      },
    ]

    const mockStats: MatchQueueStats = {
      total_agencies: 15,
      active_agencies: 12,
      suspended_agencies: 3,
      new_partners_count: 2,
      agencies_by_level: {
        basic: 6,
        premium: 5,
        elite: 4,
      },
      average_satisfaction: 4.4,
      average_completion_rate: 91,
      total_projects_distributed: 156,
      agencies_with_pending_reports: 4,
      agencies_at_capacity: 2,
    }

    setQueueEntries(mockQueue)
    setStats(mockStats)
    setIsLoading(false)
  }, [])

  const filteredEntries = queueEntries.filter((entry) => {
    if (filters.partner_level !== "all" && entry.partner_level !== filters.partner_level) return false
    if (filters.match_status !== "all") {
      if (filters.match_status === "enabled" && !entry.match_enabled) return false
      if (filters.match_status === "disabled" && entry.match_enabled) return false
    }
    if (filters.capacity_status !== "all") {
      const capacityRatio = entry.active_projects / entry.max_capacity
      if (filters.capacity_status === "available" && capacityRatio >= 0.8) return false
      if (filters.capacity_status === "at_capacity" && (capacityRatio < 0.8 || capacityRatio > 1)) return false
      if (filters.capacity_status === "over_capacity" && capacityRatio <= 1) return false
    }
    if (filters.report_status !== "all") {
      if (filters.report_status === "up_to_date" && entry.has_pending_reports) return false
      if (filters.report_status === "pending" && !entry.has_pending_reports) return false
    }
    if (filters.search && !entry.agency_name.toLowerCase().includes(filters.search.toLowerCase())) return false

    return true
  })

  const moveAgency = (agencyId: string, direction: "up" | "down") => {
    setQueueEntries((prev) => {
      const newEntries = [...prev]
      const index = newEntries.findIndex((e) => e.id === agencyId)
      if (index === -1) return prev

      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= newEntries.length) return prev

      // Trocar posições
      const temp = newEntries[index]
      newEntries[index] = newEntries[targetIndex]
      newEntries[targetIndex] = temp

      // Atualizar números de posição
      newEntries[index].position = index + 1
      newEntries[targetIndex].position = targetIndex + 1

      return newEntries
    })
  }

  const toggleMatchStatus = (agencyId: string) => {
    setQueueEntries((prev) =>
      prev.map((entry) => (entry.id === agencyId ? { ...entry, match_enabled: !entry.match_enabled } : entry)),
    )
  }

  const getStatusBadge = (entry: MatchQueueEntry) => {
    if (entry.temporary_suspension) {
      return <Badge variant="destructive">Suspenso</Badge>
    }
    if (!entry.match_enabled) {
      return <Badge variant="secondary">Inativo</Badge>
    }
    if (entry.has_pending_reports) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          Pendências
        </Badge>
      )
    }
    if (entry.active_projects >= entry.max_capacity) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-700">
          Capacidade Máxima
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="bg-green-500">
        Ativo
      </Badge>
    )
  }

  const getLevelBadge = (level: string) => {
    const colors = {
      basic: "bg-gray-500",
      premium: "bg-blue-500",
      elite: "bg-purple-500",
    }
    return <Badge className={colors[level as keyof typeof colors]}>{level.toUpperCase()}</Badge>
  }

  if (isLoading) {
    return (
      <div className="space-y-6 my-0 px-1 py-1 mx-3.5">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 my-0 px-1 py-1 mx-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fila de Match</h1>
          <p className="text-gray-600 mt-1">Distribuição automatizada de projetos premium para agências Partner</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurar Regras
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Regras de Distribuição</DialogTitle>
                <DialogDescription>Configure os critérios para distribuição automática de projetos</DialogDescription>
              </DialogHeader>
              {/* Conteúdo das regras seria implementado aqui */}
              <div className="p-4 text-center text-gray-500">
                Interface de configuração de regras em desenvolvimento
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Agências</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_agencies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_agencies} ativas, {stats.suspended_agencies} suspensas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos Distribuídos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_projects_distributed}</div>
              <p className="text-xs text-muted-foreground">Este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfação Média</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.average_satisfaction.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">{stats.average_completion_rate}% taxa de conclusão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.agencies_with_pending_reports}</div>
              <p className="text-xs text-muted-foreground">Agências com pendências</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Buscar Agência</Label>
              <Input
                id="search"
                placeholder="Nome da agência..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="level">Nível Partner</Label>
              <Select
                value={filters.partner_level}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, partner_level: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Níveis</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="match">Status Match</Label>
              <Select
                value={filters.match_status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, match_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="enabled">Ativo</SelectItem>
                  <SelectItem value="disabled">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="capacity">Capacidade</Label>
              <Select
                value={filters.capacity_status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, capacity_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="at_capacity">Na Capacidade</SelectItem>
                  <SelectItem value="over_capacity">Acima da Capacidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reports">Reports</Label>
              <Select
                value={filters.report_status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, report_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="up_to_date">Em Dia</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fila de Agências */}
      <Card>
        <CardHeader>
          <CardTitle>Fila de Distribuição</CardTitle>
          <CardDescription>Ordem de prioridade para distribuição de novos projetos premium</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  entry.match_enabled && !entry.temporary_suspension ? "bg-white" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl font-bold text-gray-400 w-8">#{entry.position}</div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{entry.agency_name}</h3>
                      {getLevelBadge(entry.partner_level)}
                      {getStatusBadge(entry)}
                      {entry.is_new_partner && (
                        <Badge variant="outline" className="border-green-500 text-green-700">
                          Novo Partner
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>
                        Projetos: {entry.active_projects}/{entry.max_capacity}
                      </span>
                      <span>Satisfação: {entry.satisfaction_rating}/5</span>
                      <span>Conclusão: {entry.completion_rate}%</span>
                      {entry.has_pending_reports && (
                        <span className="text-yellow-600">{entry.pending_reports_count} reports pendentes</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => moveAgency(entry.id, "up")} disabled={index === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveAgency(entry.id, "down")}
                    disabled={index === filteredEntries.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>

                  <Button
                    variant={entry.match_enabled ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleMatchStatus(entry.id)}
                    disabled={!!entry.temporary_suspension}
                  >
                    {entry.match_enabled ? "Desativar" : "Ativar"}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Detalhes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{entry.agency_name}</DialogTitle>
                        <DialogDescription>Detalhes da agência na fila de match</DialogDescription>
                      </DialogHeader>

                      <Tabs defaultValue="info" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="info">Informações</TabsTrigger>
                          <TabsTrigger value="performance">Performance</TabsTrigger>
                          <TabsTrigger value="history">Histórico</TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Posição na Fila</Label>
                              <p className="text-2xl font-bold">#{entry.position}</p>
                            </div>
                            <div>
                              <Label>Nível Partner</Label>
                              <p>{getLevelBadge(entry.partner_level)}</p>
                            </div>
                            <div>
                              <Label>Projetos Ativos</Label>
                              <p>
                                {entry.active_projects} de {entry.max_capacity}
                              </p>
                            </div>
                            <div>
                              <Label>Total Distribuído</Label>
                              <p>{entry.total_projects_assigned} projetos</p>
                            </div>
                          </div>

                          {entry.temporary_suspension && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <h4 className="font-semibold text-red-800">Suspensão Temporária</h4>
                              <p className="text-red-600">{entry.temporary_suspension.reason}</p>
                              <p className="text-sm text-red-500">
                                Até: {new Date(entry.temporary_suspension.until).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="performance" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Satisfação do Cliente</Label>
                              <p className="text-2xl font-bold">{entry.satisfaction_rating}/5</p>
                            </div>
                            <div>
                              <Label>Taxa de Conclusão</Label>
                              <p className="text-2xl font-bold">{entry.completion_rate}%</p>
                            </div>
                          </div>

                          {entry.has_pending_reports && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h4 className="font-semibold text-yellow-800">Reports Pendentes</h4>
                              <p className="text-yellow-600">
                                {entry.pending_reports_count} relatórios aguardando envio
                              </p>
                              <p className="text-sm text-yellow-500">
                                Último report:{" "}
                                {entry.last_report_date
                                  ? new Date(entry.last_report_date).toLocaleDateString()
                                  : "Nunca"}
                              </p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="history" className="space-y-4">
                          <div className="text-center text-gray-500 py-8">
                            Histórico de movimentações em desenvolvimento
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
