
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Clock,
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Edit,
  User,
  Bot,
  TrendingUp,
  Target,
  Lightbulb,
  Search,
} from "lucide-react"

interface ProjectEvent {
  id: string
  type:
    | "task_created"
    | "task_completed"
    | "task_rejected"
    | "file_uploaded"
    | "comment_added"
    | "status_changed"
    | "ai_insight"
  title: string
  description: string
  user_id?: string
  user_name?: string
  task_id?: string
  task_name?: string
  metadata: Record<string, any>
  created_at: string
  ai_generated?: boolean
}

interface AIInsight {
  id: string
  type: "pattern" | "recommendation" | "risk_alert" | "success_factor"
  title: string
  description: string
  confidence_score: number
  related_events: string[]
  actionable: boolean
  created_at: string
}

interface ProjectAnalytics {
  total_events: number
  task_success_rate: number
  average_completion_time: number
  most_common_rejection_reasons: string[]
  nomad_performance_patterns: {
    nomad_id: string
    nomad_name: string
    success_rate: number
    avg_completion_time: number
    common_issues: string[]
  }[]
  timeline_insights: {
    period: string
    events_count: number
    success_rate: number
  }[]
}

interface ProjectHistoryTabProps {
  projectId: string
}

export default function ProjectHistoryTab({ projectId }: ProjectHistoryTabProps) {
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all")

  useEffect(() => {
    loadProjectHistory()
    loadAIInsights()
    loadAnalytics()
  }, [projectId])

  const loadProjectHistory = async () => {
    try {
      // Mock data - in real app, fetch from API
      const mockEvents: ProjectEvent[] = [
        {
          id: "event-1",
          type: "task_created",
          title: "Nova tarefa criada",
          description: "Tarefa 'Logo Design' foi criada no projeto",
          user_id: "user-1",
          user_name: "João Cliente",
          task_id: "task-1",
          task_name: "Logo Design",
          metadata: { priority: "high", estimated_hours: 16 },
          created_at: "2024-12-26T10:00:00Z",
        },
        {
          id: "event-2",
          type: "task_rejected",
          title: "Tarefa rejeitada",
          description: "Logo Design foi rejeitado - 'Cores não condizem com a marca'",
          user_id: "user-1",
          user_name: "João Cliente",
          task_id: "task-1",
          task_name: "Logo Design",
          metadata: {
            rejection_reason: "Cores não condizem com a marca",
            feedback: "Por favor, usar tons mais corporativos",
            attempt: 1,
          },
          created_at: "2024-12-25T14:30:00Z",
        },
        {
          id: "event-3",
          type: "ai_insight",
          title: "Padrão identificado pela IA",
          description: "IA detectou que 70% das rejeições neste projeto são relacionadas a cores",
          metadata: {
            pattern_type: "rejection_pattern",
            confidence: 85,
            suggestion: "Criar briefing mais detalhado sobre paleta de cores",
          },
          created_at: "2024-12-25T15:00:00Z",
          ai_generated: true,
        },
        {
          id: "event-4",
          type: "file_uploaded",
          title: "Arquivo adicionado",
          description: "Manual de marca.pdf foi adicionado ao projeto",
          user_id: "user-1",
          user_name: "João Cliente",
          metadata: {
            file_name: "Manual de marca.pdf",
            file_size: "2.5MB",
            file_type: "pdf",
          },
          created_at: "2024-12-24T16:20:00Z",
        },
        {
          id: "event-5",
          type: "task_completed",
          title: "Tarefa concluída",
          description: "Website Development foi aprovado e concluído",
          user_id: "user-1",
          user_name: "João Cliente",
          task_id: "task-2",
          task_name: "Website Development",
          metadata: {
            completion_time: 72,
            quality_score: 9.2,
            nomad_rating: 5,
          },
          created_at: "2024-12-23T11:45:00Z",
        },
      ]

      setEvents(mockEvents)
    } catch (error) {
      console.error("Failed to load project history:", error)
    }
  }

  const loadAIInsights = async () => {
    try {
      const mockInsights: AIInsight[] = [
        {
          id: "insight-1",
          type: "pattern",
          title: "Padrão de Rejeições Identificado",
          description:
            "70% das rejeições neste projeto estão relacionadas a especificações de cores. Recomendo criar um briefing mais detalhado sobre paleta de cores.",
          confidence_score: 85,
          related_events: ["event-2"],
          actionable: true,
          created_at: "2024-12-25T15:00:00Z",
        },
        {
          id: "insight-2",
          type: "recommendation",
          title: "Otimização de Cronograma",
          description:
            "Baseado no histórico, tarefas de design têm 30% mais chance de sucesso quando precedidas por upload de referências visuais.",
          confidence_score: 92,
          related_events: ["event-4", "event-5"],
          actionable: true,
          created_at: "2024-12-24T18:00:00Z",
        },
        {
          id: "insight-3",
          type: "success_factor",
          title: "Fator de Sucesso Identificado",
          description:
            "Projetos com documentação detalhada (como manual de marca) têm taxa de aprovação 40% maior na primeira tentativa.",
          confidence_score: 88,
          related_events: ["event-4", "event-5"],
          actionable: false,
          created_at: "2024-12-23T12:00:00Z",
        },
      ]

      setInsights(mockInsights)
    } catch (error) {
      console.error("Failed to load AI insights:", error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const mockAnalytics: ProjectAnalytics = {
        total_events: 15,
        task_success_rate: 78,
        average_completion_time: 48,
        most_common_rejection_reasons: [
          "Cores não condizem com a marca",
          "Layout precisa de ajustes",
          "Falta informações no briefing",
        ],
        nomad_performance_patterns: [
          {
            nomad_id: "nomad-1",
            nomad_name: "João Designer",
            success_rate: 85,
            avg_completion_time: 42,
            common_issues: ["Cores", "Tipografia"],
          },
          {
            nomad_id: "nomad-2",
            nomad_name: "Maria Developer",
            success_rate: 92,
            avg_completion_time: 38,
            common_issues: ["Responsividade"],
          },
        ],
        timeline_insights: [
          { period: "Última semana", events_count: 8, success_rate: 75 },
          { period: "Últimas 2 semanas", events_count: 12, success_rate: 80 },
          { period: "Último mês", events_count: 15, success_rate: 78 },
        ],
      }

      setAnalytics(mockAnalytics)
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (type: string) => {
    const icons = {
      task_created: <FileText className="h-4 w-4 text-blue-500" />,
      task_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
      task_rejected: <AlertTriangle className="h-4 w-4 text-red-500" />,
      file_uploaded: <FileText className="h-4 w-4 text-purple-500" />,
      comment_added: <MessageSquare className="h-4 w-4 text-gray-500" />,
      status_changed: <Edit className="h-4 w-4 text-orange-500" />,
      ai_insight: <Bot className="h-4 w-4 text-blue-500" />,
    }
    return icons[type as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getInsightIcon = (type: string) => {
    const icons = {
      pattern: <TrendingUp className="h-4 w-4 text-blue-500" />,
      recommendation: <Lightbulb className="h-4 w-4 text-yellow-500" />,
      risk_alert: <AlertTriangle className="h-4 w-4 text-red-500" />,
      success_factor: <Target className="h-4 w-4 text-green-500" />,
    }
    return icons[type as keyof typeof icons] || <Bot className="h-4 w-4" />
  }

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = eventTypeFilter === "all" || event.type === eventTypeFilter
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando histórico...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Bot className="h-4 w-4 mr-2" />
            Insights da IA
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Análises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              className="p-2 border rounded-md"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
            >
              <option value="all">Todos os eventos</option>
              <option value="task_created">Tarefas criadas</option>
              <option value="task_completed">Tarefas concluídas</option>
              <option value="task_rejected">Tarefas rejeitadas</option>
              <option value="file_uploaded">Arquivos</option>
              <option value="ai_insight">Insights da IA</option>
            </select>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Card key={event.id} className={event.ai_generated ? "border-l-4 border-l-blue-500" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">{getEventIcon(event.type)}</div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{event.title}</h4>
                        {event.ai_generated && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Bot className="h-3 w-3 mr-1" />
                            IA
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{new Date(event.created_at).toLocaleString("pt-BR")}</span>
                        {event.user_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {event.user_name}
                          </span>
                        )}
                        {event.task_name && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {event.task_name}
                          </span>
                        )}
                      </div>

                      {/* Additional metadata */}
                      {event.type === "task_rejected" && event.metadata.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <strong>Motivo:</strong> {event.metadata.rejection_reason}
                          {event.metadata.feedback && (
                            <div className="mt-1">
                              <strong>Feedback:</strong> {event.metadata.feedback}
                            </div>
                          )}
                        </div>
                      )}

                      {event.type === "task_completed" && event.metadata.quality_score && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                          <strong>Nota de qualidade:</strong> {event.metadata.quality_score}/10
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="space-y-4">
            {insights.map((insight) => (
              <Card key={insight.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    {insight.title}
                    <Badge variant="secondary" className="ml-auto">
                      {insight.confidence_score}% confiança
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{insight.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">{new Date(insight.created_at).toLocaleString("pt-BR")}</div>

                    {insight.actionable && (
                      <Button size="sm" variant="outline">
                        <Target className="h-4 w-4 mr-2" />
                        Aplicar Sugestão
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Taxa de Sucesso</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics.task_success_rate}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Tempo Médio</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics.average_completion_time}h</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Total de Eventos</span>
                    </div>
                    <div className="text-2xl font-bold">{analytics.total_events}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Common Rejection Reasons */}
              <Card>
                <CardHeader>
                  <CardTitle>Principais Motivos de Rejeição</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.most_common_rejection_reasons.map((reason, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">{reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Nomad Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance dos Nômades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.nomad_performance_patterns.map((nomad) => (
                      <div key={nomad.nomad_id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{nomad.nomad_name}</h4>
                          <Badge className="bg-green-100 text-green-800">{nomad.success_rate}% sucesso</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Tempo médio:</span> {nomad.avg_completion_time}h
                          </div>
                          <div>
                            <span className="font-medium">Principais desafios:</span> {nomad.common_issues.join(", ")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
