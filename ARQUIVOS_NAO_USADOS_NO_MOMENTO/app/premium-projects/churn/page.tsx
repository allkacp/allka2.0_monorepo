
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  AlertTriangle,
  Calendar,
  Building,
  FileText,
  TrendingDown,
  History,
  ArrowRight,
  CheckCircle,
} from "lucide-react"
import type { PremiumProject, ChurnEvent, ProjectRedistribution, PartnerAgency } from "@/types/premium-project"

import { ChurnManagement } from "@/components/premium-projects/churn-management"

// Mock data para desenvolvimento
const mockAgencies: PartnerAgency[] = [
  {
    id: "pa1",
    name: "Digital Solutions Agency",
    partner_level: "premium",
    contact_person: "Ana Silva",
    email: "ana@digitalsolutions.com",
    phone: "+55 11 97777-0001",
    active_projects: 8,
    satisfaction_rating: 4.8,
  },
  {
    id: "pa2",
    name: "Creative Partners",
    partner_level: "elite",
    contact_person: "Roberto Costa",
    email: "roberto@creativepartners.com",
    phone: "+55 11 97777-0002",
    active_projects: 12,
    satisfaction_rating: 4.9,
  },
  {
    id: "pa3",
    name: "Innovation Hub",
    partner_level: "premium",
    contact_person: "Mariana Santos",
    email: "mariana@innovationhub.com",
    phone: "+55 11 97777-0003",
    active_projects: 6,
    satisfaction_rating: 4.6,
  },
]

const mockProjects: PremiumProject[] = [
  {
    id: "1",
    title: "Transformação Digital - TechCorp",
    description: "Projeto completo de transformação digital",
    client: {
      id: "c1",
      name: "João Empresário",
      email: "joao@techcorp.com",
      phone: "+55 11 98888-0001",
      company: "TechCorp Ltda",
      segment: "Tecnologia",
      created_from_lead: true,
      potential_value: 150000,
      contact_preference: "email",
    },
    status: "ativo",
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
    partner_agency: mockAgencies[0],
    proposal_date: "2024-01-15",
    start_date: "2024-01-20",
    reports: [],
    history: [],
    conversion_probability: 90,
    satisfaction_score: 4.5,
    churn_risk: "low",
  },
  {
    id: "2",
    title: "E-commerce Premium - StartupXYZ",
    description: "Desenvolvimento de plataforma e-commerce",
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
    partner_agency: mockAgencies[1],
    proposal_date: "2024-01-10",
    start_date: "2024-01-20",
    reports: [],
    history: [],
    conversion_probability: 90,
    satisfaction_score: 4.7,
    churn_risk: "low",
  },
]

const mockChurnHistory: ChurnEvent[] = [
  {
    id: "churn1",
    partner_agency_id: "pa-old-1",
    reason: "Baixa performance nos últimos 6 meses",
    date: "2024-01-10",
    affected_projects: ["proj1", "proj2", "proj3"],
    redistribution_plan: [
      {
        project_id: "proj1",
        from_agency_id: "pa-old-1",
        to_agency_id: "pa1",
        redistribution_date: "2024-01-10",
        reason: "Churn da agência anterior",
        client_notified: true,
      },
    ],
  },
]

export default function ChurnManagementPage() {
  const [projects, setProjects] = useState<PremiumProject[]>(mockProjects)
  const [agencies, setAgencies] = useState<PartnerAgency[]>(mockAgencies)
  const [churnHistory, setChurnHistory] = useState<ChurnEvent[]>(mockChurnHistory)

  const handleProcessChurn = async (churnData: any) => {
    console.log("[v0] Processing churn:", churnData)

    const newChurnEvent: ChurnEvent = {
      id: `churn-${Date.now()}`,
      partner_agency_id: churnData.partner_agency_id,
      reason: churnData.reason,
      date: new Date().toISOString().split("T")[0],
      affected_projects: churnData.affected_projects,
      redistribution_plan: churnData.redistribution_plan,
    }

    setChurnHistory((prev) => [newChurnEvent, ...prev])

    // Remove agency from active agencies
    setAgencies((prev) => prev.filter((a) => a.id !== churnData.partner_agency_id))

    // Here you would make an API call to process the churn
    // await apiClient.processChurnEvent(churnData)
  }

  const handleRedistributeProjects = async (redistributions: ProjectRedistribution[]) => {
    console.log("[v0] Redistributing projects:", redistributions)

    // Update projects with new agencies
    setProjects((prev) =>
      prev.map((project) => {
        const redistribution = redistributions.find((r) => r.project_id === project.id)
        if (redistribution) {
          const newAgency = agencies.find((a) => a.id === redistribution.to_agency_id)
          if (newAgency) {
            return { ...project, partner_agency: newAgency, updated_at: new Date().toISOString() }
          }
        }
        return project
      }),
    )

    // Here you would make an API call to redistribute projects
    // await apiClient.redistributeProjects(redistributions)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const getTotalActiveProjects = () => {
    return projects.filter((p) => p.status === "ativo").length
  }

  const getTotalActiveValue = () => {
    return projects.filter((p) => p.status === "ativo").reduce((total, p) => total + p.value, 0)
  }

  const getChurnRate = () => {
    // Simplified calculation - in real app would be based on historical data
    return ((churnHistory.length / (agencies.length + churnHistory.length)) * 100).toFixed(1)
  }

  return (
    <div className="space-y-6 my-0 px-1 py-1 mx-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Churn - Agências Partner</h1>
          <p className="text-gray-600 mt-1">
            Gerencie a saída de agências Partner e redistribuição de projetos premium
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agências Ativas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencies.length}</div>
            <p className="text-xs text-muted-foreground">
              {agencies.filter((a) => a.partner_level === "elite").length} Elite,{" "}
              {agencies.filter((a) => a.partner_level === "premium").length} Premium
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalActiveProjects()}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(getTotalActiveValue())} em valor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getChurnRate()}%</div>
            <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos de Churn</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{churnHistory.length}</div>
            <p className="text-xs text-muted-foreground">Total histórico</p>
          </CardContent>
        </Card>
      </div>

      {/* Churn Management Component */}
      <ChurnManagement
        projects={projects}
        agencies={agencies}
        onProcessChurn={handleProcessChurn}
        onRedistributeProjects={handleRedistributeProjects}
      />

      {/* Churn History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Churn
          </CardTitle>
          <CardDescription>Registro de todas as saídas de agências Partner e redistribuições</CardDescription>
        </CardHeader>
        <CardContent>
          {churnHistory.length > 0 ? (
            <div className="space-y-4">
              {churnHistory.map((event) => (
                <Card key={event.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium">Saída de Agência</span>
                          <Badge variant="destructive" className="text-xs">
                            {event.affected_projects.length} projetos afetados
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{event.reason}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{event.redistribution_plan.length} redistribuições</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          Processado
                        </Badge>
                      </div>
                    </div>

                    {/* Redistribution Details */}
                    {event.redistribution_plan.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">
                          Redistribuições Realizadas
                        </Label>
                        <div className="space-y-2">
                          {event.redistribution_plan.slice(0, 3).map((redistribution, index) => {
                            const toAgency = agencies.find((a) => a.id === redistribution.to_agency_id)
                            return (
                              <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                                <span className="flex-1">Projeto {redistribution.project_id}</span>
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                <span className="font-medium">{toAgency?.name || "Agência não encontrada"}</span>
                                {redistribution.client_notified && <CheckCircle className="h-3 w-3 text-green-500" />}
                              </div>
                            )
                          })}
                          {event.redistribution_plan.length > 3 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{event.redistribution_plan.length - 3} redistribuições adicionais
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum evento de churn</h3>
              <p className="text-gray-600">Não há registros de saídas de agências Partner no sistema</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
