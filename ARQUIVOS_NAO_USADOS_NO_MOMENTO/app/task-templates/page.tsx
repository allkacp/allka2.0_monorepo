
import { useState, useMemo } from "react"
import { Plus, Search, Copy, Edit, Play, BarChart3, Star, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { TaskTemplate, TaskTemplateAnalytics } from "@/types/task-template"

// Mock data
const mockTemplates: TaskTemplate[] = [
  {
    id: "1",
    name: "Landing Page Responsiva",
    description: "Criação de landing page responsiva com foco em conversão",
    category: "Web Development",
    complexity: "intermediate",
    base_price: 800,
    emergency_multiplier: 1.5,
    revision_time_hours: 4,
    estimated_hours: 16,
    execution_instructions: "Desenvolver landing page seguindo as diretrizes de UX/UI fornecidas...",
    briefing_instructions: "Forneça informações sobre público-alvo, objetivos de conversão...",
    prerequisite_tasks: [],
    triggers_tasks: ["2"],
    ranking_criteria: {
      weight_task_rating: 40,
      weight_availability: 20,
      weight_project_history: 25,
      weight_overall_score: 15,
      min_task_rating: 4.0,
      min_overall_score: 4.2,
      min_available_hours: 20,
      required_qualifications: ["web_development", "responsive_design"],
      prefer_project_experience: true,
      prefer_category_specialist: true,
    },
    qualification_test_id: "test_1",
    stats: {
      total_executions: 45,
      average_completion_time: 14.5,
      average_rating: 4.6,
      success_rate: 92,
      average_revisions: 1.2,
      performance_by_level: {
        silver: { avg_time: 18, avg_rating: 4.2, completion_rate: 88 },
        gold: { avg_time: 14, avg_rating: 4.7, completion_rate: 95 },
        diamond: { avg_time: 12, avg_rating: 4.9, completion_rate: 98 },
      },
      last_30_days: {
        executions: 8,
        avg_rating: 4.7,
        issues: 1,
      },
    },
    is_active: true,
    requires_approval: false,
    max_revisions: 3,
    tags: ["landing-page", "responsive", "conversion"],
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z",
    created_by: "admin_1",
  },
  {
    id: "2",
    name: "Integração de Analytics",
    description: "Implementação de Google Analytics e Facebook Pixel",
    category: "Web Development",
    complexity: "basic",
    base_price: 300,
    emergency_multiplier: 2.0,
    revision_time_hours: 2,
    estimated_hours: 6,
    execution_instructions: "Implementar códigos de tracking seguindo as melhores práticas...",
    briefing_instructions: "Forneça acesso às contas do Google Analytics e Facebook Ads...",
    prerequisite_tasks: ["1"],
    triggers_tasks: [],
    ranking_criteria: {
      weight_task_rating: 50,
      weight_availability: 15,
      weight_project_history: 20,
      weight_overall_score: 15,
      min_task_rating: 4.2,
      min_overall_score: 4.0,
      min_available_hours: 8,
      required_qualifications: ["analytics", "tracking"],
      prefer_project_experience: false,
      prefer_category_specialist: true,
    },
    stats: {
      total_executions: 32,
      average_completion_time: 5.8,
      average_rating: 4.8,
      success_rate: 96,
      average_revisions: 0.8,
      performance_by_level: {
        silver: { avg_time: 7, avg_rating: 4.5, completion_rate: 92 },
        gold: { avg_time: 5.5, avg_rating: 4.9, completion_rate: 98 },
        diamond: { avg_time: 4.5, avg_rating: 5.0, completion_rate: 100 },
      },
      last_30_days: {
        executions: 6,
        avg_rating: 4.9,
        issues: 0,
      },
    },
    is_active: true,
    requires_approval: false,
    max_revisions: 2,
    tags: ["analytics", "tracking", "integration"],
    created_at: "2024-01-16T09:00:00Z",
    updated_at: "2024-01-18T11:20:00Z",
    created_by: "admin_1",
  },
]

const mockAnalytics: Record<string, TaskTemplateAnalytics> = {
  "1": {
    template_id: "1",
    efficiency_trend: [85, 87, 89, 92, 88, 91, 94, 96, 93, 95, 97, 92],
    quality_trend: [4.2, 4.3, 4.4, 4.5, 4.4, 4.6, 4.7, 4.6, 4.8, 4.7, 4.6, 4.6],
    demand_trend: [3, 4, 5, 6, 4, 7, 8, 6, 9, 7, 8, 8],
    vs_category_average: {
      completion_time: -12, // 12% faster
      rating: 8, // 8% higher rating
      success_rate: 5, // 5% higher success rate
    },
    common_revision_reasons: [
      { reason: "Ajustes de responsividade", frequency: 35, avg_resolution_time: 2.5 },
      { reason: "Mudanças de cor/fonte", frequency: 28, avg_resolution_time: 1.8 },
      { reason: "Otimização de velocidade", frequency: 22, avg_resolution_time: 3.2 },
    ],
    top_performers: [
      { nomade_id: "n1", nomade_name: "Carlos Silva", executions: 8, avg_rating: 4.9, avg_time: 12.5 },
      { nomade_id: "n2", nomade_name: "Ana Costa", executions: 6, avg_rating: 4.8, avg_time: 13.2 },
      { nomade_id: "n3", nomade_name: "Pedro Santos", executions: 5, avg_rating: 4.7, avg_time: 14.1 },
    ],
    optimization_suggestions: [
      "Considere criar template específico para mobile-first",
      "Adicione checklist de performance no briefing",
      "Implemente revisão automática de responsividade",
    ],
    pricing_recommendations: {
      suggested_price: 850,
      confidence: 87,
      reasoning: "Alta demanda e performance acima da média justificam aumento de 6.25%",
    },
  },
}

const complexityColors = {
  basic: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-orange-100 text-orange-800",
  premium: "bg-purple-100 text-purple-800",
}

export default function TaskTemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(mockTemplates)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedComplexity, setSelectedComplexity] = useState<string>("all")
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = selectedCategory === "all" || template.category === selectedCategory
      const matchesComplexity = selectedComplexity === "all" || template.complexity === selectedComplexity

      return matchesSearch && matchesCategory && matchesComplexity
    })
  }, [templates, searchTerm, selectedCategory, selectedComplexity])

  // Get unique categories
  const categories = Array.from(new Set(templates.map((t) => t.category)))

  const handleDuplicateTemplate = (template: TaskTemplate) => {
    const newTemplate: TaskTemplate = {
      ...template,
      id: `${template.id}_copy_${Date.now()}`,
      name: `${template.name} (Cópia)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTemplates([...templates, newTemplate])
  }

  const handleToggleActive = (templateId: string) => {
    setTemplates(templates.map((t) => (t.id === templateId ? { ...t, is_active: !t.is_active } : t)))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modelos de Tarefas</h1>
          <p className="text-gray-600 mt-1">Gerencie modelos de tarefas e configure distribuição automática</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowAnalytics(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Modelo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Modelos</p>
                <p className="text-2xl font-bold text-blue-600">{templates.length}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Play className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Modelos Ativos</p>
                <p className="text-2xl font-bold text-green-600">{templates.filter((t) => t.is_active).length}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Execuções (30d)</p>
                <p className="text-2xl font-bold text-purple-600">
                  {templates.reduce((acc, t) => acc + t.stats.last_30_days.executions, 0)}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating Médio</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {(templates.reduce((acc, t) => acc + t.stats.average_rating, 0) / templates.length).toFixed(1)}
                </p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar modelos por nome, descrição ou tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedComplexity} onValueChange={setSelectedComplexity}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Complexidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as complexidades</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="intermediate">Intermediário</SelectItem>
                <SelectItem value="advanced">Avançado</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
                  <CardDescription className="text-sm">{template.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {!template.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Inativo
                    </Badge>
                  )}
                  <Badge className={complexityColors[template.complexity]}>{template.complexity}</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Pricing and Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Preço Base</p>
                  <p className="font-semibold text-green-600">R$ {template.base_price}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tempo Estimado</p>
                  <p className="font-semibold">{template.estimated_hours}h</p>
                </div>
                <div>
                  <p className="text-gray-600">Rating Médio</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="font-semibold">{template.stats.average_rating}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600">Taxa de Sucesso</p>
                  <p className="font-semibold text-green-600">{template.stats.success_rate}%</p>
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Execuções (30d)</span>
                  <span>{template.stats.last_30_days.executions}</span>
                </div>
                <Progress value={(template.stats.last_30_days.executions / 10) * 100} className="h-1" />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {template.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.tags.length - 3}
                  </Badge>
                )}
              </div>

              {/* Chain Info */}
              {(template.prerequisite_tasks.length > 0 || template.triggers_tasks.length > 0) && (
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  {template.prerequisite_tasks.length > 0 && (
                    <p>↳ Depende de {template.prerequisite_tasks.length} tarefa(s)</p>
                  )}
                  {template.triggers_tasks.length > 0 && <p>→ Dispara {template.triggers_tasks.length} tarefa(s)</p>}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(template)} className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDuplicateTemplate(template)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant={template.is_active ? "outline" : "default"}
                  size="sm"
                  onClick={() => handleToggleActive(template.id)}
                >
                  {template.is_active ? "Pausar" : "Ativar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum modelo encontrado</h3>
            <p className="text-gray-600 mb-4">Não encontramos modelos que correspondam aos filtros selecionados.</p>
            <Button
              onClick={() => {
                setSearchTerm("")
                setSelectedCategory("all")
                setSelectedComplexity("all")
              }}
            >
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Details Modal */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.name}</DialogTitle>
              <DialogDescription>{selectedTemplate.description}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">Geral</TabsTrigger>
                <TabsTrigger value="instructions">Instruções</TabsTrigger>
                <TabsTrigger value="ranking">Ranking</TabsTrigger>
                <TabsTrigger value="chain">Cadeia</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Modelo</Label>
                    <Input id="name" defaultValue={selectedTemplate.name} />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select defaultValue={selectedTemplate.category}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Web Development">Web Development</SelectItem>
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="base_price">Preço Base (R$)</Label>
                    <Input id="base_price" type="number" defaultValue={selectedTemplate.base_price} />
                  </div>
                  <div>
                    <Label htmlFor="estimated_hours">Horas Estimadas</Label>
                    <Input id="estimated_hours" type="number" defaultValue={selectedTemplate.estimated_hours} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" defaultValue={selectedTemplate.description} />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="is_active" defaultChecked={selectedTemplate.is_active} />
                  <Label htmlFor="is_active">Modelo Ativo</Label>
                </div>
              </TabsContent>

              <TabsContent value="instructions" className="space-y-4">
                <div>
                  <Label htmlFor="execution_instructions">Instruções de Execução (Para Nômades)</Label>
                  <Textarea
                    id="execution_instructions"
                    defaultValue={selectedTemplate.execution_instructions}
                    rows={6}
                    placeholder="Instruções detalhadas sobre como executar esta tarefa..."
                  />
                </div>

                <div>
                  <Label htmlFor="briefing_instructions">Instruções de Briefing (Para Clientes)</Label>
                  <Textarea
                    id="briefing_instructions"
                    defaultValue={selectedTemplate.briefing_instructions}
                    rows={6}
                    placeholder="Instruções sobre quais informações o cliente deve fornecer..."
                  />
                </div>
              </TabsContent>

              <TabsContent value="ranking" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Peso - Rating da Tarefa (%)</Label>
                    <Input type="number" defaultValue={selectedTemplate.ranking_criteria.weight_task_rating} />
                  </div>
                  <div>
                    <Label>Peso - Disponibilidade (%)</Label>
                    <Input type="number" defaultValue={selectedTemplate.ranking_criteria.weight_availability} />
                  </div>
                  <div>
                    <Label>Rating Mínimo da Tarefa</Label>
                    <Input type="number" step="0.1" defaultValue={selectedTemplate.ranking_criteria.min_task_rating} />
                  </div>
                  <div>
                    <Label>Score Geral Mínimo</Label>
                    <Input
                      type="number"
                      step="0.1"
                      defaultValue={selectedTemplate.ranking_criteria.min_overall_score}
                    />
                  </div>
                </div>

                <div>
                  <Label>Qualificações Obrigatórias</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.ranking_criteria.required_qualifications.map((qual) => (
                      <Badge key={qual} variant="outline">
                        {qual}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chain" className="space-y-4">
                <div>
                  <Label>Tarefas Pré-requisito</Label>
                  <p className="text-sm text-gray-600 mb-2">Tarefas que devem ser concluídas antes desta</p>
                  {selectedTemplate.prerequisite_tasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTemplate.prerequisite_tasks.map((taskId) => (
                        <div key={taskId} className="flex items-center justify-between p-2 border rounded">
                          <span>Tarefa ID: {taskId}</span>
                          <Button variant="outline" size="sm">
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma tarefa pré-requisito</p>
                  )}
                </div>

                <div>
                  <Label>Tarefas Disparadas</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Tarefas que serão iniciadas automaticamente após a conclusão desta
                  </p>
                  {selectedTemplate.triggers_tasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTemplate.triggers_tasks.map((taskId) => (
                        <div key={taskId} className="flex items-center justify-between p-2 border rounded">
                          <span>Tarefa ID: {taskId}</span>
                          <Button variant="outline" size="sm">
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhuma tarefa disparada</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                {mockAnalytics[selectedTemplate.id] && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600">vs Categoria</p>
                          <p className="text-lg font-bold text-green-600">
                            {mockAnalytics[selectedTemplate.id].vs_category_average.completion_time > 0 ? "+" : ""}
                            {mockAnalytics[selectedTemplate.id].vs_category_average.completion_time}% tempo
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600">Rating vs Média</p>
                          <p className="text-lg font-bold text-blue-600">
                            +{mockAnalytics[selectedTemplate.id].vs_category_average.rating}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600">Taxa de Sucesso</p>
                          <p className="text-lg font-bold text-purple-600">
                            +{mockAnalytics[selectedTemplate.id].vs_category_average.success_rate}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Top Performers</h4>
                      <div className="space-y-2">
                        {mockAnalytics[selectedTemplate.id].top_performers.map((performer) => (
                          <div
                            key={performer.nomade_id}
                            className="flex items-center justify-between p-3 border rounded"
                          >
                            <div>
                              <p className="font-medium">{performer.nomade_name}</p>
                              <p className="text-sm text-gray-600">{performer.executions} execuções</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{performer.avg_rating} ⭐</p>
                              <p className="text-sm text-gray-600">{performer.avg_time}h média</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Sugestões de Otimização</h4>
                      <div className="space-y-2">
                        {mockAnalytics[selectedTemplate.id].optimization_suggestions.map((suggestion, index) => (
                          <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm">{suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Cancelar
              </Button>
              <Button>Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
