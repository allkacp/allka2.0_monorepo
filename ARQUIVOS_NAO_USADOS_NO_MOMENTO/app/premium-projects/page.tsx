
import { useState } from "react"
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
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Phone,
  Mail,
  MessageSquare,
  Eye,
  Edit,
} from "lucide-react"
import type {
  PremiumProject,
  PremiumProjectStatus,
  PremiumProjectFilters,
  PremiumProjectStats,
  ProjectHistory,
  ProjectReport,
} from "@/types/premium-project"

import { StatusFlowManager } from "@/components/premium-projects/status-flow-manager"
import { ProjectReports } from "@/components/premium-projects/project-reports"

// Mock data para desenvolvimento
const mockStats: PremiumProjectStats = {
  total_projects: 24,
  active_projects: 12,
  total_value: 1850000,
  conversion_rate: 68.5,
  average_project_value: 77083,
  projects_by_status: {
    elaborado: 3,
    em_negociacao: 5,
    perdido: 2,
    aguardando_pagamento: 4,
    ativo: 8,
    inadimplente: 1,
    cancelado: 1,
    concluido: 0,
  },
  top_performing_agencies: [],
  top_performing_admins: [],
}

const mockProjects: PremiumProject[] = [
  {
    id: "1",
    title: "Transformação Digital - TechCorp",
    description: "Projeto completo de transformação digital incluindo modernização de sistemas e processos",
    client: {
      id: "c1",
      name: "João Empresário",
      email: "joao@techcorp.com",
      phone: "+55 11 98888-0001",
      company: "TechCorp Ltda",
      segment: "Tecnologia",
      created_from_lead: true,
      lead_id: "lead-001",
      potential_value: 150000,
      contact_preference: "email",
    },
    status: "em_negociacao",
    value: 150000,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T14:30:00Z",
    commercial_admin: {
      id: "ca1",
      name: "Carlos Mendes",
      email: "carlos.mendes@allka.com",
      phone: "+55 11 99999-0001",
      active_projects: 5,
      conversion_rate: 75.5,
    },
    partner_agency: {
      id: "pa1",
      name: "Digital Solutions Agency",
      partner_level: "premium",
      contact_person: "Ana Silva",
      email: "ana@digitalsolutions.com",
      phone: "+55 11 97777-0001",
      active_projects: 8,
      satisfaction_rating: 4.8,
    },
    proposal_date: "2024-01-15",
    negotiation_start: "2024-01-18",
    reports: [],
    history: [],
    conversion_probability: 75,
    satisfaction_score: 4.5,
    churn_risk: "low",
  },
  {
    id: "2",
    title: "E-commerce Premium - StartupXYZ",
    description: "Desenvolvimento de plataforma e-commerce com recursos avançados",
    client: {
      id: "c2",
      name: "Maria Gestora",
      email: "maria@startupxyz.com",
      phone: "+55 11 98888-0002",
      company: "StartupXYZ",
      segment: "E-commerce",
      created_from_lead: true,
      potential_value: 85000,
      contact_preference: "whatsapp",
    },
    status: "ativo",
    value: 85000,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-22T16:45:00Z",
    commercial_admin: {
      id: "ca2",
      name: "Ana Paula Silva",
      email: "ana.silva@allka.com",
      phone: "+55 11 99999-0002",
      active_projects: 3,
      conversion_rate: 82.3,
    },
    partner_agency: {
      id: "pa2",
      name: "Creative Partners",
      partner_level: "elite",
      contact_person: "Roberto Costa",
      email: "roberto@creativepartners.com",
      phone: "+55 11 97777-0002",
      active_projects: 12,
      satisfaction_rating: 4.9,
    },
    proposal_date: "2024-01-10",
    start_date: "2024-01-20",
    reports: [],
    history: [],
    conversion_probability: 90,
    satisfaction_score: 4.7,
    churn_risk: "low",
  },
]

const statusConfig = {
  elaborado: { label: "Elaborado", color: "bg-blue-100 text-blue-800", icon: FileText },
  em_negociacao: { label: "Em Negociação", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  perdido: { label: "Perdido", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  aguardando_pagamento: { label: "Aguardando Pagamento", color: "bg-orange-100 text-orange-800", icon: DollarSign },
  ativo: { label: "Ativo", color: "bg-green-100 text-green-800", icon: CheckCircle },
  inadimplente: { label: "Inadimplente", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-800", icon: AlertTriangle },
  concluido: { label: "Concluído", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
}

export default function PremiumProjectsPage() {
  const [projects, setProjects] = useState<PremiumProject[]>(mockProjects)
  const [stats, setStats] = useState<PremiumProjectStats>(mockStats)
  const [filters, setFilters] = useState<PremiumProjectFilters>({
    status: "all",
    commercial_admin: "all",
    partner_agency: "all",
    value_range: { min: 0, max: 1000000 },
    date_range: { start: "", end: "" },
    churn_risk: "all",
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProject, setSelectedProject] = useState<PremiumProject | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const handleStatusChange = async (projectId: string, newStatus: PremiumProjectStatus, data: any) => {
    console.log("[v0] Changing project status:", { projectId, newStatus, data })

    // Update project in state
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, status: newStatus, ...data, updated_at: new Date().toISOString() }
          : project,
      ),
    )

    // Here you would make an API call to update the project
    // await apiClient.updatePremiumProject(projectId, { status: newStatus, ...data })
  }

  const handleAddHistory = async (projectId: string, historyEntry: Omit<ProjectHistory, "id" | "project_id">) => {
    console.log("[v0] Adding project history:", { projectId, historyEntry })

    // Add history entry to project
    const newHistoryEntry = {
      ...historyEntry,
      id: `history-${Date.now()}`,
      project_id: projectId,
    }

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, history: [...(project.history || []), newHistoryEntry] } : project,
      ),
    )

    // Here you would make an API call to add the history entry
    // await apiClient.addProjectHistory(projectId, historyEntry)
  }

  const handleAddReport = async (projectId: string, reportData: Omit<ProjectReport, "id" | "project_id">) => {
    console.log("[v0] Adding project report:", { projectId, reportData })

    const newReport: ProjectReport = {
      ...reportData,
      id: `report-${Date.now()}`,
      project_id: projectId,
    }

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              reports: [...(project.reports || []), newReport],
              last_report_date: reportData.report_date,
              updated_at: new Date().toISOString(),
            }
          : project,
      ),
    )

    // Here you would make an API call to add the report
    // await apiClient.addProjectReport(projectId, reportData)
  }

  const handleUpdateReport = async (projectId: string, reportId: string, reportData: Partial<ProjectReport>) => {
    console.log("[v0] Updating project report:", { projectId, reportId, reportData })

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              reports: (project.reports || []).map((report) =>
                report.id === reportId ? { ...report, ...reportData } : report,
              ),
              updated_at: new Date().toISOString(),
            }
          : project,
      ),
    )

    // Here you would make an API call to update the report
    // await apiClient.updateProjectReport(projectId, reportId, reportData)
  }

  const handleDeleteReport = async (projectId: string, reportId: string) => {
    console.log("[v0] Deleting project report:", { projectId, reportId })

    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              reports: (project.reports || []).filter((report) => report.id !== reportId),
              updated_at: new Date().toISOString(),
            }
          : project,
      ),
    )

    // Here you would make an API call to delete the report
    // await apiClient.deleteProjectReport(projectId, reportId)
  }

  // Filtrar projetos
  const filteredProjects = projects.filter((project) => {
    if (
      searchTerm &&
      !project.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !project.client.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }
    if (filters.status !== "all" && project.status !== filters.status) return false
    if (filters.commercial_admin !== "all" && project.commercial_admin.id !== filters.commercial_admin) return false
    if (filters.partner_agency !== "all" && project.partner_agency.id !== filters.partner_agency) return false
    if (project.value < filters.value_range.min || project.value > filters.value_range.max) return false
    if (filters.churn_risk !== "all" && project.churn_risk !== filters.churn_risk) return false
    return true
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getContactIcon = (preference: string) => {
    switch (preference) {
      case "email":
        return Mail
      case "phone":
        return Phone
      case "whatsapp":
        return MessageSquare
      default:
        return Mail
    }
  }

  const clearFilters = () => {
    setFilters({
      status: "all",
      commercial_admin: "all",
      partner_agency: "all",
      value_range: { min: 0, max: 1000000 },
      date_range: { start: "", end: "" },
      churn_risk: "all",
    })
    setSearchTerm("")
  }

  const hasActiveFilters = () => {
    return (
      filters.status !== "all" ||
      filters.commercial_admin !== "all" ||
      filters.partner_agency !== "all" ||
      filters.value_range.min > 0 ||
      filters.value_range.max < 1000000 ||
      filters.date_range.start !== "" ||
      filters.date_range.end !== "" ||
      filters.churn_risk !== "all" ||
      searchTerm !== ""
    )
  }

  return (
    <div className="space-y-6 my-0 px-1 py-1 mx-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projetos Premium</h1>
          <p className="text-gray-600 mt-1">Gestão completa do funil de projetos de alto valor</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {hasActiveFilters() && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                !
              </Badge>
            )}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Projeto Premium</DialogTitle>
                <DialogDescription>
                  Converta um lead em projeto premium ou crie um novo projeto do zero
                </DialogDescription>
              </DialogHeader>
              {/* Form para criar novo projeto */}
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Formulário de criação será implementado</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_projects}</div>
            <p className="text-xs text-muted-foreground">{stats.active_projects} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.total_value)}</div>
            <p className="text-xs text-muted-foreground">Média: {formatCurrency(stats.average_project_value)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversion_rate}%</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_projects}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value as PremiumProjectStatus | "all" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="admin">Admin Comercial</Label>
                <Select
                  value={filters.commercial_admin}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, commercial_admin: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os admins" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os admins</SelectItem>
                    {Array.from(new Set(projects.map((p) => p.commercial_admin))).map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="agency">Agência Partner</Label>
                <Select
                  value={filters.partner_agency}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, partner_agency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as agências" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as agências</SelectItem>
                    {Array.from(new Set(projects.map((p) => p.partner_agency))).map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>
                        {agency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="risk">Risco de Churn</Label>
                <Select
                  value={filters.churn_risk}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, churn_risk: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os riscos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os riscos</SelectItem>
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="min-value">Valor Mínimo</Label>
                <Input
                  id="min-value"
                  type="number"
                  value={filters.value_range.min}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      value_range: { ...prev.value_range, min: Number(e.target.value) },
                    }))
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="max-value">Valor Máximo</Label>
                <Input
                  id="max-value"
                  type="number"
                  value={filters.value_range.max}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      value_range: { ...prev.value_range, max: Number(e.target.value) },
                    }))
                  }
                  placeholder="1000000"
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por projeto ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects List */}
      <div className="grid gap-6">
        {filteredProjects.map((project) => {
          const StatusIcon = statusConfig[project.status].icon
          const ContactIcon = getContactIcon(project.client.contact_preference)

          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                      <Badge className={statusConfig[project.status].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[project.status].label}
                      </Badge>
                      {project.churn_risk === "high" && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Alto Risco
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base">{project.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(project.value)}</div>
                    <div className="text-sm text-gray-500">Prob: {project.conversion_probability}%</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Cliente */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Cliente</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ContactIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{project.client.name}</span>
                      </div>
                      <p className="text-sm text-gray-600">{project.client.company}</p>
                      <p className="text-xs text-gray-500">{project.client.segment}</p>
                    </div>
                  </div>

                  {/* Admin Comercial */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Admin Comercial</h4>
                    <div className="space-y-1">
                      <p className="font-medium">{project.commercial_admin.name}</p>
                      <p className="text-sm text-gray-600">
                        {project.commercial_admin.active_projects} projetos ativos
                      </p>
                      <p className="text-xs text-gray-500">
                        Taxa conversão: {project.commercial_admin.conversion_rate}%
                      </p>
                    </div>
                  </div>

                  {/* Agência Partner */}
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">Agência Partner</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.partner_agency.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {project.partner_agency.partner_level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{project.partner_agency.contact_person}</p>
                      <p className="text-xs text-gray-500">
                        Satisfação: {project.partner_agency.satisfaction_rating}/5
                      </p>
                    </div>
                  </div>
                </div>

                {/* Datas importantes */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">Proposta: {formatDate(project.proposal_date)}</span>
                      {project.negotiation_start && (
                        <span className="text-gray-500">Negociação: {formatDate(project.negotiation_start)}</span>
                      )}
                      {project.start_date && (
                        <span className="text-gray-500">Início: {formatDate(project.start_date)}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedProject(project)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum projeto encontrado</h3>
            <p className="text-gray-600 mb-4">
              {hasActiveFilters()
                ? "Tente ajustar os filtros para encontrar projetos"
                : "Comece criando seu primeiro projeto premium"}
            </p>
            {hasActiveFilters() && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProject.title}</DialogTitle>
              <DialogDescription>Detalhes completos do projeto premium</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatusFlowManager
                  project={selectedProject}
                  onStatusChange={handleStatusChange}
                  onAddHistory={handleAddHistory}
                />

                {/* Project Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Projeto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Cliente</Label>
                        <div className="mt-1">
                          <p className="font-medium">{selectedProject.client.name}</p>
                          <p className="text-sm text-gray-600">{selectedProject.client.company}</p>
                          <p className="text-sm text-gray-500">{selectedProject.client.email}</p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Valor do Projeto</Label>
                        <div className="mt-1">
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedProject.value)}</p>
                          <p className="text-sm text-gray-500">
                            Probabilidade: {selectedProject.conversion_probability}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Admin Comercial</Label>
                        <div className="mt-1">
                          <p className="font-medium">{selectedProject.commercial_admin.name}</p>
                          <p className="text-sm text-gray-600">{selectedProject.commercial_admin.email}</p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Agência Partner</Label>
                        <div className="mt-1">
                          <p className="font-medium">{selectedProject.partner_agency.name}</p>
                          <p className="text-sm text-gray-600">{selectedProject.partner_agency.contact_person}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <ProjectReports
                project={selectedProject}
                onAddReport={handleAddReport}
                onUpdateReport={handleUpdateReport}
                onDeleteReport={handleDeleteReport}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
