
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Rocket,
  Plus,
  Edit,
  Trash2,
  Eye,
  GripVertical,
  FileText,
  Video,
  ImageIcon,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  UserCheck,
  Briefcase,
  ArrowUp,
  ArrowDown,
  Play,
} from "lucide-react"

type ContentType = "slide" | "video" | "text"
type AccountType = "admin" | "company" | "agency" | "nomad"

interface ContentElement {
  id: string
  type: ContentType
  title: string
  content: string
  duration?: number
  order: number
}

interface OnboardingCircuit {
  id: string
  name: string
  accountType: AccountType
  description: string
  elements: ContentElement[]
  isActive: boolean
  completionRate: number
  totalUsers: number
}

const mockCircuits: OnboardingCircuit[] = [
  {
    id: "1",
    name: "Boas-vindas Admin",
    accountType: "admin",
    description: "Circuito de onboarding para administradores do sistema",
    elements: [
      { id: "1", type: "slide", title: "Bem-vindo ao ALLKA", content: "Introdução ao sistema", order: 1 },
      { id: "2", type: "video", title: "Tour pela plataforma", content: "https://...", duration: 180, order: 2 },
      { id: "3", type: "text", title: "Primeiros passos", content: "Guia de configuração inicial", order: 3 },
    ],
    isActive: true,
    completionRate: 87,
    totalUsers: 23,
  },
  {
    id: "2",
    name: "Onboarding Empresas",
    accountType: "company",
    description: "Circuito de onboarding para empresas clientes",
    elements: [
      { id: "4", type: "slide", title: "Bem-vindo", content: "Introdução para empresas", order: 1 },
      { id: "5", type: "video", title: "Como criar projetos", content: "https://...", duration: 240, order: 2 },
    ],
    isActive: true,
    completionRate: 92,
    totalUsers: 156,
  },
  {
    id: "3",
    name: "Onboarding Agências",
    accountType: "agency",
    description: "Circuito de onboarding para agências parceiras",
    elements: [
      { id: "6", type: "slide", title: "Bem-vindo", content: "Introdução para agências", order: 1 },
      { id: "7", type: "text", title: "Programa de parceria", content: "Detalhes do programa", order: 2 },
    ],
    isActive: true,
    completionRate: 78,
    totalUsers: 45,
  },
  {
    id: "4",
    name: "Onboarding Nômades",
    accountType: "nomad",
    description: "Circuito de onboarding para profissionais nômades",
    elements: [
      { id: "8", type: "video", title: "Como funciona", content: "https://...", duration: 300, order: 1 },
      { id: "9", type: "slide", title: "Suas primeiras tarefas", content: "Guia inicial", order: 2 },
    ],
    isActive: true,
    completionRate: 95,
    totalUsers: 234,
  },
]

const accountTypeIcons = {
  admin: Users,
  company: Building2,
  agency: Briefcase,
  nomad: UserCheck,
}

const accountTypeLabels = {
  admin: "Admin",
  company: "Empresa",
  agency: "Agência",
  nomad: "Nômade",
}

const contentTypeIcons = {
  slide: FileText,
  video: Video,
  text: ImageIcon,
}

export default function OnboardingPage() {
  const [circuits, setCircuits] = useState<OnboardingCircuit[]>(mockCircuits)
  const [selectedCircuit, setSelectedCircuit] = useState<OnboardingCircuit | null>(null)
  const [isCircuitDialogOpen, setIsCircuitDialogOpen] = useState(false)
  const [isElementDialogOpen, setIsElementDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const totalCircuits = circuits.length
  const activeCircuits = circuits.filter((c) => c.isActive).length
  const avgCompletionRate = Math.round(circuits.reduce((acc, c) => acc + c.completionRate, 0) / circuits.length)
  const totalUsers = circuits.reduce((acc, c) => acc + c.totalUsers, 0)

  const moveElement = (circuitId: string, elementId: string, direction: "up" | "down") => {
    setCircuits((prev) =>
      prev.map((circuit) => {
        if (circuit.id !== circuitId) return circuit

        const elements = [...circuit.elements].sort((a, b) => a.order - b.order)
        const index = elements.findIndex((e) => e.id === elementId)

        if ((direction === "up" && index === 0) || (direction === "down" && index === elements.length - 1)) {
          return circuit
        }

        const newIndex = direction === "up" ? index - 1 : index + 1
        ;[elements[index], elements[newIndex]] = [elements[newIndex], elements[index]]

        elements.forEach((el, idx) => {
          el.order = idx + 1
        })

        return { ...circuit, elements }
      }),
    )
  }

  return (
    <div className="min-h-screen p-6 bg-slate-200 px-0 py-0 py-0">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Onboarding
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie circuitos de onboarding para diferentes tipos de conta</p>
          </div>
          <Dialog open={isCircuitDialogOpen} onOpenChange={setIsCircuitDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-brand">
                <Plus className="h-4 w-4 mr-2" />
                Novo Circuito
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Circuito</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Circuito</Label>
                  <Input placeholder="Ex: Onboarding Empresas Premium" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Conta</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="company">Empresa</SelectItem>
                      <SelectItem value="agency">Agência</SelectItem>
                      <SelectItem value="nomad">Nômade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea placeholder="Descreva o objetivo deste circuito de onboarding" rows={3} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCircuitDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button className="btn-brand">Criar Circuito</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Circuitos</p>
                <p className="text-2xl font-bold text-gray-900">{totalCircuits}</p>
              </div>
              <Rocket className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Circuitos Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activeCircuits}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-gray-900">{avgCompletionRate}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Circuits by Account Type */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
            <TabsTrigger value="company">Empresas</TabsTrigger>
            <TabsTrigger value="agency">Agências</TabsTrigger>
            <TabsTrigger value="nomad">Nômades</TabsTrigger>
          </TabsList>

          {["all", "admin", "company", "agency", "nomad"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {circuits
                  .filter((circuit) => tab === "all" || circuit.accountType === tab)
                  .map((circuit) => {
                    const Icon = accountTypeIcons[circuit.accountType]
                    return (
                      <Card key={circuit.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="space-y-4">
                          {/* Circuit Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                                <Icon className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold text-gray-900">{circuit.name}</h3>
                                  <Badge variant={circuit.isActive ? "default" : "secondary"}>
                                    {circuit.isActive ? "Ativo" : "Inativo"}
                                  </Badge>
                                  <Badge variant="outline">{accountTypeLabels[circuit.accountType]}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">{circuit.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {circuit.elements.length} elementos
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {circuit.totalUsers} usuários
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {circuit.completionRate}% conclusão
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCircuit(circuit)
                                  setIsPreviewOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 bg-transparent"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Content Elements */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-700">Elementos do Circuito</h4>
                              <Dialog open={isElementDialogOpen} onOpenChange={setIsElementDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar Elemento
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Adicionar Elemento</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Tipo de Conteúdo</Label>
                                      <Select>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="slide">Slide</SelectItem>
                                          <SelectItem value="video">Vídeo</SelectItem>
                                          <SelectItem value="text">Texto</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Título</Label>
                                      <Input placeholder="Ex: Bem-vindo ao ALLKA" />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Conteúdo</Label>
                                      <Textarea placeholder="Conteúdo do elemento" rows={4} />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Duração (segundos) - Opcional</Label>
                                      <Input type="number" placeholder="180" />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setIsElementDialogOpen(false)}>
                                        Cancelar
                                      </Button>
                                      <Button className="btn-brand">
                                        Adicionar
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="space-y-2">
                              {circuit.elements
                                .sort((a, b) => a.order - b.order)
                                .map((element, index) => {
                                  const ContentIcon = contentTypeIcons[element.type]
                                  return (
                                    <div
                                      key={element.id}
                                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                                      <div className="p-2 bg-white rounded-lg">
                                        <ContentIcon className="h-4 w-4 text-gray-600" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{element.title}</p>
                                        <p className="text-xs text-gray-500">
                                          {element.type === "video" && element.duration
                                            ? `${Math.floor(element.duration / 60)}:${(element.duration % 60).toString().padStart(2, "0")}`
                                            : element.type}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => moveElement(circuit.id, element.id, "up")}
                                          disabled={index === 0}
                                        >
                                          <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => moveElement(circuit.id, element.id, "down")}
                                          disabled={index === circuit.elements.length - 1}
                                        >
                                          <ArrowDown className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                Preview: {selectedCircuit?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedCircuit && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedCircuit.description}</p>
                </div>
                <div className="space-y-3">
                  {selectedCircuit.elements
                    .sort((a, b) => a.order - b.order)
                    .map((element, index) => {
                      const ContentIcon = contentTypeIcons[element.type]
                      return (
                        <div key={element.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full text-sm font-semibold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <ContentIcon className="h-5 w-5 text-gray-600" />
                                <h4 className="font-semibold text-gray-900">{element.title}</h4>
                                {element.duration && (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {Math.floor(element.duration / 60)}:
                                    {(element.duration % 60).toString().padStart(2, "0")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{element.content}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
