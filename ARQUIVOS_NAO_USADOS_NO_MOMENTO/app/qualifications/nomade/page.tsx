
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Play, FileText, CheckCircle, Search, Award } from "lucide-react"

// Mock data for nomad view
const availableTests = [
  {
    id: "1",
    category: "Design Gráfico",
    title: "Criação de Logo e Identidade Visual",
    description: "Teste prático para avaliar habilidades em design de marca",
    difficulty: "Intermediário",
    duration: "2-3 horas",
    tags: ["Logo", "Identidade Visual", "Branding"],
    learningContent: [
      { type: "text", title: "Fundamentos de Design", duration: 15 },
      { type: "video", title: "Tutorial Illustrator", duration: 30 },
      { type: "document", title: "Brief do Cliente", duration: 10 },
    ],
    requirements: ["Adobe Illustrator", "Conhecimento em tipografia", "Portfolio básico"],
  },
  {
    id: "2",
    category: "Copywriting",
    title: "Redação de Landing Page",
    description: "Avaliação de habilidades em copy persuasivo",
    difficulty: "Básico",
    duration: "1-2 horas",
    tags: ["Landing Page", "Copy", "Conversão"],
    learningContent: [
      { type: "text", title: "Técnicas de Persuasão", duration: 20 },
      { type: "video", title: "Estrutura de Landing Page", duration: 25 },
      { type: "document", title: "Exemplos de Referência", duration: 15 },
    ],
    requirements: ["Conhecimento em marketing", "Experiência com textos persuasivos"],
  },
  {
    id: "3",
    category: "Social Media",
    title: "Estratégia de Conteúdo Instagram",
    description: "Criação de estratégia e conteúdo para Instagram",
    difficulty: "Intermediário",
    duration: "2-4 horas",
    tags: ["Instagram", "Estratégia", "Conteúdo"],
    learningContent: [
      { type: "text", title: "Algoritmo do Instagram", duration: 25 },
      { type: "video", title: "Criação de Conteúdo", duration: 35 },
      { type: "document", title: "Templates e Exemplos", duration: 15 },
    ],
    requirements: ["Conhecimento em redes sociais", "Noções de design"],
  },
]

const myQualifications = [
  {
    id: "1",
    testTitle: "Criação de Logo e Identidade Visual",
    category: "Design Gráfico",
    status: "approved",
    submissionDate: "2024-01-15",
    feedback: "Excelente trabalho! Demonstrou domínio das ferramentas e criatividade.",
    score: 95,
  },
  {
    id: "2",
    testTitle: "Redação de Landing Page",
    category: "Copywriting",
    status: "in_review",
    submissionDate: "2024-02-08",
    feedback: null,
    score: null,
  },
]

export default function NomadeQualificationsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [selectedTag, setSelectedTag] = useState("all")
  const [showLearningCircuit, setShowLearningCircuit] = useState(false)
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)

  const categories = ["all", "Design Gráfico", "Copywriting", "Social Media", "Desenvolvimento Web"]
  const difficulties = ["all", "Básico", "Intermediário", "Avançado"]
  const allTags = ["all", ...Array.from(new Set(availableTests.flatMap((test) => test.tags)))]

  const filteredTests = availableTests.filter((test) => {
    const matchesSearch =
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || test.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === "all" || test.difficulty === selectedDifficulty
    const matchesTag = selectedTag === "all" || test.tags.includes(selectedTag)

    return matchesSearch && matchesCategory && matchesDifficulty && matchesTag
  })

  const getStatusColor = (status: string) => {
    const colors = {
      approved: "bg-green-100 text-green-800 border-green-200",
      in_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      adjustments_needed: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return colors[status as keyof typeof colors] || colors.in_review
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      Básico: "bg-green-100 text-green-800 border-green-200",
      Intermediário: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Avançado: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[difficulty as keyof typeof colors] || colors["Básico"]
  }

  const startLearningCircuit = (test: any) => {
    setSelectedTest(test)
    setCurrentStep(1)
    setShowLearningCircuit(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Habilitações Disponíveis</h1>
        <p className="text-gray-600 mt-1">Qualifique-se em novas áreas e expanda suas oportunidades.</p>
      </div>

      {/* My Qualifications Summary */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Minhas Qualificações</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {myQualifications.filter((q) => q.status === "approved").length}
              </p>
              <p className="text-sm text-gray-600">Aprovadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {myQualifications.filter((q) => q.status === "in_review").length}
              </p>
              <p className="text-sm text-gray-600">Em Análise</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{availableTests.length - myQualifications.length}</p>
              <p className="text-sm text-gray-600">Disponíveis</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar testes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "Todas as Categorias" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty === "all" ? "Todas" : difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag === "all" ? "Todas as Tags" : tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Available Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTests.map((test) => (
          <Card key={test.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">{test.category}</Badge>
                <Badge className={getDifficultyColor(test.difficulty)}>{test.difficulty}</Badge>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{test.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{test.description}</p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Duração estimada:</span>
                  <span className="font-medium">{test.duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Conteúdo de aprendizado:</span>
                  <span className="font-medium">{test.learningContent.length} módulos</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Tags:</p>
                <div className="flex flex-wrap gap-1">
                  {test.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Requisitos:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {test.requirements.map((req, index) => (
                    <li key={index}>• {req}</li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={() => startLearningCircuit(test)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Qualificação
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Qualifications History */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Histórico de Qualificações</h2>
          <div className="space-y-4">
            {myQualifications.map((qualification) => (
              <div key={qualification.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{qualification.testTitle}</h4>
                  <Badge className={getStatusColor(qualification.status)}>
                    {qualification.status === "approved"
                      ? "Aprovado"
                      : qualification.status === "in_review"
                        ? "Em Análise"
                        : qualification.status === "rejected"
                          ? "Reprovado"
                          : "Ajustes Necessários"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{qualification.category}</span>
                  <span>Enviado em: {new Date(qualification.submissionDate).toLocaleDateString()}</span>
                </div>
                {qualification.score && (
                  <div className="flex items-center mb-2">
                    <Award className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm font-medium">Pontuação: {qualification.score}/100</span>
                  </div>
                )}
                {qualification.feedback && (
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-700">{qualification.feedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Circuit Modal */}
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
                    style={{ width: `${(currentStep / (selectedTest.learningContent.length + 1)) * 100}%` }}
                  ></div>
                </div>

                {/* Current Step Content */}
                <div className="min-h-[400px] border border-gray-200 rounded-lg p-6">
                  {currentStep <= selectedTest.learningContent.length ? (
                    <div className="space-y-4">
                      <div className="flex items-center mb-4">
                        {selectedTest.learningContent[currentStep - 1]?.type === "text" && (
                          <FileText className="h-6 w-6 text-blue-500 mr-2" />
                        )}
                        {selectedTest.learningContent[currentStep - 1]?.type === "video" && (
                          <Play className="h-6 w-6 text-red-500 mr-2" />
                        )}
                        {selectedTest.learningContent[currentStep - 1]?.type === "document" && (
                          <BookOpen className="h-6 w-6 text-green-500 mr-2" />
                        )}
                        <h3 className="text-lg font-semibold">
                          {selectedTest.learningContent[currentStep - 1]?.title}
                        </h3>
                      </div>

                      {selectedTest.learningContent[currentStep - 1]?.type === "text" && (
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
                      )}

                      {selectedTest.learningContent[currentStep - 1]?.type === "video" && (
                        <div className="bg-gray-100 rounded-lg p-8 text-center">
                          <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">
                            Vídeo tutorial - {selectedTest.learningContent[currentStep - 1]?.duration} minutos
                          </p>
                          <Button className="mt-4 bg-red-500 hover:bg-red-600 text-white">
                            <Play className="h-4 w-4 mr-2" />
                            Reproduzir Vídeo
                          </Button>
                        </div>
                      )}

                      {selectedTest.learningContent[currentStep - 1]?.type === "document" && (
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
                      )}
                    </div>
                  ) : (
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
                        // Redirect to test execution
                        alert("Redirecionando para execução do teste...")
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
    </div>
  )
}
