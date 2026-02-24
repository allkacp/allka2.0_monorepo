// @ts-nocheck
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Play, FileText, CheckCircle, Clock, Plus, Edit, MessageCircle, Award, Users } from "lucide-react"

// Mock data - would come from API
const testTasks = [
  {
    id: "1",
    category: "Design Gráfico",
    title: "Criação de Logo e Identidade Visual",
    description: "Teste prático para avaliar habilidades em design de marca",
    status: "active",
    applicants: 12,
    approvalRate: 75,
    learningContent: [
      { type: "text", title: "Fundamentos de Design", duration: 15 },
      { type: "video", title: "Tutorial Illustrator", duration: 30 },
      { type: "document", title: "Brief do Cliente", duration: 10 },
    ],
  },
  {
    id: "2",
    category: "Copywriting",
    title: "Redação de Landing Page",
    description: "Avaliação de habilidades em copy persuasivo",
    status: "active",
    applicants: 8,
    approvalRate: 62,
    learningContent: [
      { type: "text", title: "Técnicas de Persuasão", duration: 20 },
      { type: "video", title: "Estrutura de Landing Page", duration: 25 },
      { type: "document", title: "Exemplos de Referência", duration: 15 },
    ],
  },
]

const pendingQualifications = [
  {
    id: "1",
    nomadeName: "Ana Silva",
    category: "Design Gráfico",
    testTitle: "Criação de Logo e Identidade Visual",
    submissionDate: "2024-02-08",
    status: "pending_review",
    progress: 100,
    whatsapp: "+5511999999999",
  },
  {
    id: "2",
    nomadeName: "Carlos Santos",
    category: "Copywriting",
    testTitle: "Redação de Landing Page",
    submissionDate: "2024-02-09",
    status: "in_progress",
    progress: 85,
    whatsapp: "+5511888888888",
  },
]

export default function QualificationsPage() {
  const [activeTab, setActiveTab] = useState("tests")
  const [showCreateTest, setShowCreateTest] = useState(false)
  const [showLearningCircuit, setShowLearningCircuit] = useState(false)
  const [showQualificationChecklist, setShowQualificationChecklist] = useState(false)
  const [showTestExecution, setShowTestExecution] = useState(false)
  const [selectedTest, setSelectedTest] = useState(null)
  const [selectedQualification, setSelectedQualification] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [qualificationComments, setQualificationComments] = useState("")
  const [qualificationCriteria, setQualificationCriteria] = useState([
    { title: "Qualidade do Design", description: "Avaliação da estética e originalidade do design.", status: null },
    { title: "Adequação ao Briefing", description: "Verificação da aderência às instruções do cliente.", status: null },
    {
      title: "Conhecimento Técnico",
      description: "Análise do domínio das ferramentas e técnicas de design.",
      status: null,
    },
  ])

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800 border-green-200",
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      archived: "bg-red-100 text-red-800 border-red-200",
      pending_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
      in_progress: "bg-blue-100 text-blue-800 border-blue-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[status as keyof typeof colors] || colors.draft
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4" />
      case "video":
        return <Play className="h-4 w-4" />
      case "document":
        return <BookOpen className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const handleStartLearningCircuit = (test) => {
    setSelectedTest(test)
    setCurrentStep(1)
    setShowLearningCircuit(true)
  }

  const handleViewQualification = (qualification) => {
    setSelectedQualification(qualification)
    setShowQualificationChecklist(true)
  }

  const updateCriterion = (index, status) => {
    const updatedCriteria = [...qualificationCriteria]
    updatedCriteria[index].status = status
    setQualificationCriteria(updatedCriteria)
  }

  const handleQualificationDecision = (decision) => {
    alert(`Qualification ${decision} for ${selectedQualification.nomadeName}`)
    setShowQualificationChecklist(false)
  }

  return (
    <div className="space-y-6 my-0 px-1 py-1 mx-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Habilitações</h1>
          <p className="text-gray-600 mt-1">Sistema de qualificação e onboarding de nômades.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowCreateTest(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Criar Teste
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Testes Ativos</p>
                <p className="text-3xl font-bold text-gray-900">12</p>
                <p className="text-sm text-green-600">6 categorias</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aguardando Revisão</p>
                <p className="text-3xl font-bold text-gray-900">8</p>
                <p className="text-sm text-orange-600">Requer atenção</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Aprovação</p>
                <p className="text-3xl font-bold text-gray-900">68%</p>
                <p className="text-sm text-gray-600">Últimos 30 dias</p>
              </div>
              <Award className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Novos Qualificados</p>
                <p className="text-3xl font-bold text-gray-900">24</p>
                <p className="text-sm text-green-600">Este mês</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tests">Testes de Qualificação</TabsTrigger>
          <TabsTrigger value="pending">Avaliações Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {testTasks.map((test) => (
              <Card key={test.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">{test.category}</Badge>
                    <Badge className={getStatusColor(test.status)}>
                      {test.status === "active" ? "Ativo" : test.status}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{test.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{test.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{test.applicants}</p>
                      <p className="text-xs text-gray-600">Candidatos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{test.approvalRate}%</p>
                      <p className="text-xs text-gray-600">Aprovação</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700">Circuito de Aprendizado:</h4>
                    {test.learningContent.map((content, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          {getContentIcon(content.type)}
                          <span className="ml-2 text-gray-700">{content.title}</span>
                        </div>
                        <span className="text-gray-500">{content.duration}min</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => handleStartLearningCircuit(test)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {pendingQualifications.map((qualification) => (
                  <div key={qualification.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{qualification.nomadeName}</h4>
                        <p className="text-sm text-gray-600">{qualification.testTitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">{qualification.category}</Badge>
                        <Badge className={getStatusColor(qualification.status)}>
                          {qualification.status === "pending_review" ? "Aguardando Revisão" : "Em Progresso"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Progresso</span>
                          <span className="text-sm font-medium">{qualification.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${qualification.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <span>Enviado em: {new Date(qualification.submissionDate).toLocaleDateString()}</span>
                      <span>WhatsApp: {qualification.whatsapp}</span>
                    </div>

                    {qualification.status === "pending_review" && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-200 bg-transparent"
                        >
                          Solicitar Ajustes
                        </Button>
                        <Button size="sm" variant="outline">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 bg-transparent">
                          Reprovar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Test Modal (simplified representation) */}
      {showCreateTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Criar Novo Teste de Qualificação</h2>
                <Button variant="outline" size="sm" onClick={() => setShowCreateTest(false)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option>Design Gráfico</option>
                    <option>Copywriting</option>
                    <option>Social Media</option>
                    <option>Desenvolvimento Web</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título do Teste</label>
                  <Input placeholder="Ex: Criação de Logo e Identidade Visual" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                  <Textarea placeholder="Descreva o objetivo e escopo do teste..." />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    onClick={() => setShowCreateTest(false)}
                  >
                    Criar Teste
                  </Button>
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowCreateTest(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showLearningCircuit && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Circuito de Aprendizado - {selectedTest.title}</h2>
                <Button variant="outline" size="sm" onClick={() => setShowLearningCircuit(false)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / selectedTest.learningContent.length) * 100}%` }}
                  ></div>
                </div>

                {/* Current Step Content */}
                <div className="min-h-[400px] border border-gray-200 rounded-lg p-6">
                  {selectedTest.learningContent[currentStep - 1]?.type === "text" && (
                    <div className="space-y-4">
                      <div className="flex items-center mb-4">
                        <FileText className="h-6 w-6 text-blue-500 mr-2" />
                        <h3 className="text-lg font-semibold">{selectedTest.learningContent[currentStep - 1].title}</h3>
                      </div>
                      <div className="prose max-w-none">
                        <p>
                          Este é o conteúdo de texto do módulo de aprendizado. Aqui você encontrará informações
                          fundamentais sobre {selectedTest.category.toLowerCase()}.
                        </p>
                        <h4>Conceitos Importantes:</h4>
                        <ul>
                          <li>Fundamentos teóricos da área</li>
                          <li>Melhores práticas do mercado</li>
                          <li>Ferramentas essenciais</li>
                          <li>Metodologias de trabalho</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {selectedTest.learningContent[currentStep - 1]?.type === "video" && (
                    <div className="space-y-4">
                      <div className="flex items-center mb-4">
                        <Play className="h-6 w-6 text-red-500 mr-2" />
                        <h3 className="text-lg font-semibold">{selectedTest.learningContent[currentStep - 1].title}</h3>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-8 text-center">
                        <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                          Vídeo tutorial - {selectedTest.learningContent[currentStep - 1].duration} minutos
                        </p>
                        <Button className="mt-4 bg-red-500 hover:bg-red-600 text-white">
                          <Play className="h-4 w-4 mr-2" />
                          Reproduzir Vídeo
                        </Button>
                      </div>
                    </div>
                  )}

                  {selectedTest.learningContent[currentStep - 1]?.type === "document" && (
                    <div className="space-y-4">
                      <div className="flex items-center mb-4">
                        <BookOpen className="h-6 w-6 text-green-500 mr-2" />
                        <h3 className="text-lg font-semibold">{selectedTest.learningContent[currentStep - 1].title}</h3>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">Documento de Referência</span>
                          <Badge className="bg-green-100 text-green-800">PDF</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Material complementar com exemplos práticos e referências para o teste.
                        </p>
                        <Button variant="outline" className="w-full bg-transparent">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Baixar Documento
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentStep > selectedTest.learningContent.length && (
                    <div className="space-y-4">
                      <div className="flex items-center mb-4">
                        <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                        <h3 className="text-lg font-semibold">Termo de Compromisso</h3>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h4 className="font-semibold mb-3">Compromisso de Qualidade</h4>
                        <div className="space-y-2 text-sm text-gray-700 mb-4">
                          <p>• Comprometo-me a entregar trabalhos de alta qualidade</p>
                          <p>• Respeitarei os prazos estabelecidos para cada projeto</p>
                          <p>• Manterei comunicação clara e profissional</p>
                          <p>• Seguirei as diretrizes e padrões da plataforma</p>
                          <p>• Buscarei sempre a excelência em meus serviços</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="agreement" className="rounded" />
                          <label htmlFor="agreement" className="text-sm">
                            Li e concordo com os termos de compromisso
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentStep} de {selectedTest.learningContent.length + 1}
                  </span>
                  {currentStep <= selectedTest.learningContent.length ? (
                    <Button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Próximo
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setShowLearningCircuit(false)
                        setShowTestExecution(true)
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      Iniciar Teste
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Qualification Checklist Modal */}
      {showQualificationChecklist && selectedQualification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Checklist de Qualificação</h2>
                <Button variant="outline" size="sm" onClick={() => setShowQualificationChecklist(false)}>
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                {/* Candidate Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{selectedQualification.nomadeName}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Categoria:</span>
                      <span className="ml-2 font-medium">{selectedQualification.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Teste:</span>
                      <span className="ml-2 font-medium">{selectedQualification.testTitle}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Data de Envio:</span>
                      <span className="ml-2">
                        {new Date(selectedQualification.submissionDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">WhatsApp:</span>
                      <span className="ml-2">{selectedQualification.whatsapp}</span>
                    </div>
                  </div>
                </div>

                {/* Submitted Work */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Trabalho Enviado</h4>
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Arquivos enviados:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white rounded p-2">
                        <span className="text-sm">logo-final.ai</span>
                        <Button size="sm" variant="outline">
                          Baixar
                        </Button>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded p-2">
                        <span className="text-sm">apresentacao.pdf</span>
                        <Button size="sm" variant="outline">
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Qualification Checklist */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Critérios de Avaliação</h4>
                  {qualificationCriteria.map((criterion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{criterion.title}</p>
                        <p className="text-sm text-gray-600">{criterion.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant={criterion.status === "approved" ? "default" : "outline"}
                          onClick={() => updateCriterion(index, "approved")}
                          className={
                            criterion.status === "approved" ? "bg-green-500 hover:bg-green-600 text-white" : ""
                          }
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant={criterion.status === "rejected" ? "default" : "outline"}
                          onClick={() => updateCriterion(index, "rejected")}
                          className={criterion.status === "rejected" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                        >
                          ✗
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comentários e Feedback</label>
                  <Textarea
                    placeholder="Adicione comentários sobre a qualificação, sugestões de melhoria ou observações..."
                    rows={4}
                    value={qualificationComments}
                    onChange={(e) => setQualificationComments(e.target.value)}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => handleQualificationDecision("approved")}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Nômade
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-orange-600 border-orange-200 bg-transparent"
                    onClick={() => handleQualificationDecision("adjustments")}
                  >
                    Solicitar Ajustes
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => window.open(`https://wa.me/${selectedQualification.whatsapp.replace("+", "")}`)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 bg-transparent"
                    onClick={() => handleQualificationDecision("rejected")}
                  >
                    Reprovar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
