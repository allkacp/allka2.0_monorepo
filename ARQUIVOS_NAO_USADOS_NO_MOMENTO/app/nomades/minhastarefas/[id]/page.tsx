
import type React from "react"

import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Download,
  User,
  Calendar,
  Building2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  MessageSquare,
  Paperclip,
  X,
  DollarSign,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const taskBackgrounds = [
  "bg-gradient-to-br from-blue-50 via-blue-100 to-purple-50",
  "bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50",
  "bg-gradient-to-br from-green-50 via-green-100 to-teal-50",
  "bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-50",
  "bg-gradient-to-br from-pink-50 via-pink-100 to-rose-50",
  "bg-gradient-to-br from-indigo-50 via-indigo-100 to-blue-50",
  "bg-gradient-to-br from-teal-50 via-teal-100 to-cyan-50",
  "bg-gradient-to-br from-cyan-50 via-cyan-100 to-sky-50",
]

const getTaskBackground = (id: string) => {
  const index = Number.parseInt(id) || 0
  return taskBackgrounds[index % taskBackgrounds.length]
}

interface Stage {
  id: string
  number: number
  title: string
  status: "completed" | "in-progress" | "pending" | "rejected"
  deliveryDeadline: Date
  payment: number
  description: string
  requirements: string[]
  deliverables: Array<{
    id: string
    name: string
    uploaded: boolean
    fileUrl?: string
  }>
  feedback?: Array<{
    id: string
    author: string
    content: string
    timestamp: Date
    attachments?: Array<{ name: string; url: string }>
  }>
}

export default function NomadeTaskDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const taskId = params.id as string

  const taskBg = "bg-gray-50"

  const [task] = useState({
    taskId: "T19572",
    title: "Copywriting - Landing Page",
    category: "Copywriting",
    client: "StartupXYZ",
    project: "Campanha Q4 2025",
    payment: 312,
    bonus: 25,
    status: "in-progress" as const,
    createdAt: new Date("2025-10-01T10:00:00"),
    deadline: new Date("2025-10-10T23:59:00"),
    rating: 4.8,
    stages: [
      {
        id: "stage-1",
        number: 1,
        title: "Pesquisa e Briefing",
        status: "completed" as const,
        deliveryDeadline: new Date("2025-10-03T23:59:00"),
        payment: 100,
        description: "Realizar pesquisa de mercado e criar briefing detalhado",
        requirements: ["Análise de concorrentes", "Definição de público-alvo", "Tom de voz"],
        deliverables: [
          { id: "d1", name: "Briefing Completo.pdf", uploaded: true, fileUrl: "#" },
          { id: "d2", name: "Pesquisa de Mercado.pdf", uploaded: true, fileUrl: "#" },
        ],
        feedback: [
          {
            id: "f1",
            author: "Maria Silva",
            content: "Excelente trabalho! O briefing está muito completo e bem estruturado.",
            timestamp: new Date("2025-10-04T10:30:00"),
          },
        ],
      },
      {
        id: "stage-2",
        number: 2,
        title: "Criação de Copy",
        status: "in-progress" as const,
        deliveryDeadline: new Date("2025-10-07T23:59:00"),
        payment: 212,
        description: "Desenvolver textos persuasivos para landing page",
        requirements: ["Headline impactante", "CTAs claros", "Benefícios destacados", "Prova social"],
        deliverables: [
          { id: "d3", name: "Copy Landing Page V1.docx", uploaded: false },
          { id: "d4", name: "Variações de Headlines.docx", uploaded: false },
        ],
      },
    ] as Stage[],
  })

  const [expandedStages, setExpandedStages] = useState(new Set(["stage-2"]))
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadComment, setUploadComment] = useState("")

  const formatDeadline = (date: Date) => {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOverdue = (date: Date) => {
    return date < new Date()
  }

  const toggleStageExpansion = (stageId: string) => {
    const newExpandedStages = new Set(expandedStages)
    if (newExpandedStages.has(stageId)) {
      newExpandedStages.delete(stageId)
    } else {
      newExpandedStages.add(stageId)
    }
    setExpandedStages(newExpandedStages)
  }

  const getStageStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStageStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 text-white text-xs">CONCLUÍDA</Badge>
      case "in-progress":
        return <Badge className="bg-blue-500 text-white text-xs">EM ANDAMENTO</Badge>
      case "rejected":
        return <Badge className="bg-red-500 text-white text-xs">REPROVADA</Badge>
      default:
        return <Badge className="bg-gray-500 text-white text-xs">PENDENTE</Badge>
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files))
    }
  }

  const handleSubmitDelivery = () => {
    console.log("Submitting delivery:", { uploadFiles, uploadComment })
    setShowUploadDialog(false)
    setUploadFiles([])
    setUploadComment("")
  }

  return (
    <div className={`min-h-screen ${taskBg}`}>
      <div className="bg-white/95 backdrop-blur-sm border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto pt-2 px-6 pb-2">
          <div className="flex items-center gap-2 mb-1.5">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-xs h-7">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Voltar
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <h1 className="text-sm font-semibold text-gray-700 truncate">
                [{task.taskId}] {task.title}
              </h1>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {task.category}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {task.project}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.client}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDeadline(task.deadline)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <DollarSign className="h-3 w-3" />
                  R$ {task.payment} (+{task.bonus}%)
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7 bg-transparent flex-shrink-0">
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto pt-6 px-6 pb-12">
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-base">Progresso das Etapas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{
                    width: `${(task.stages.filter((s) => s.status === "completed").length / task.stages.length) * 100}%`,
                  }}
                />
              </div>

              <div className="relative flex justify-between">
                {task.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex flex-col items-center"
                    style={{ width: `${100 / task.stages.length}%` }}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-4 bg-white transition-all duration-300 ${
                        stage.status === "completed"
                          ? "border-green-500 text-green-500"
                          : stage.status === "in-progress"
                            ? "border-blue-500 text-blue-500 ring-4 ring-blue-100"
                            : stage.status === "rejected"
                              ? "border-red-500 text-red-500"
                              : "border-gray-300 text-gray-400"
                      }`}
                    >
                      {stage.status === "completed" ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : stage.status === "rejected" ? (
                        <XCircle className="h-6 w-6" />
                      ) : (
                        <span className="font-bold text-sm">{stage.number}</span>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p
                        className={`text-xs font-medium ${stage.status === "in-progress" ? "text-blue-600" : "text-gray-600"}`}
                      >
                        Etapa {stage.number}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 max-w-[120px]">{stage.title}</p>
                      {stage.status === "in-progress" && (
                        <Badge className="mt-2 bg-blue-500 text-white text-xs">Atual</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="stages" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 text-xs">
            <TabsTrigger value="stages" className="text-xs">
              Etapas ({task.stages.length})
            </TabsTrigger>
            <TabsTrigger value="requirements" className="text-xs">
              Requisitos
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs">
              Informações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="space-y-4">
            {task.stages.map((stage) => (
              <Card key={stage.id} className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50/50 transition-all"
                  onClick={() => toggleStageExpansion(stage.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStageStatusIcon(stage.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold">
                            Etapa {stage.number}: {stage.title}
                          </h3>
                          {getStageStatusBadge(stage.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            R$ {stage.payment}
                          </span>
                          <span>•</span>
                          <span
                            className={
                              isOverdue(stage.deliveryDeadline)
                                ? "text-red-600 font-medium flex items-center gap-1"
                                : ""
                            }
                          >
                            {isOverdue(stage.deliveryDeadline) && <AlertTriangle className="h-3 w-3" />}
                            Prazo: {formatDeadline(stage.deliveryDeadline)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">
                      {expandedStages.has(stage.id) ? "Recolher" : "Expandir"}
                    </Button>
                  </div>
                </CardHeader>

                {expandedStages.has(stage.id) && (
                  <CardContent className="space-y-5">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Descrição</h4>
                      <p className="text-xs text-gray-700">{stage.description}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Requisitos
                      </h4>
                      <ul className="space-y-1.5">
                        {stage.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Entregas
                      </h4>
                      <div className="space-y-2">
                        {stage.deliverables.map((deliverable) => (
                          <div
                            key={deliverable.id}
                            className="flex items-center justify-between p-3 border rounded-lg bg-white"
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-gray-400" />
                              <span className="text-xs font-medium">{deliverable.name}</span>
                            </div>
                            {deliverable.uploaded ? (
                              <Badge className="bg-green-500 text-white text-xs">Enviado</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs bg-transparent"
                                onClick={() => {
                                  setSelectedStage(stage.id)
                                  setShowUploadDialog(true)
                                }}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                Enviar
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {stage.feedback && stage.feedback.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Feedback do Cliente
                        </h4>
                        <div className="space-y-2">
                          {stage.feedback.map((fb) => (
                            <div key={fb.id} className="p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-start justify-between mb-1.5">
                                <p className="font-semibold text-xs">{fb.author}</p>
                                <p className="text-xs text-gray-500">{formatDeadline(fb.timestamp)}</p>
                              </div>
                              <p className="text-xs text-gray-700">{fb.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="requirements" className="space-y-4">
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Todos os Requisitos</CardTitle>
              </CardHeader>
              <CardContent>
                {task.stages.map((stage) => (
                  <div key={stage.id} className="mb-5 last:mb-0">
                    <h4 className="font-semibold text-sm mb-2">
                      Etapa {stage.number}: {stage.title}
                    </h4>
                    <ul className="space-y-1.5">
                      {stage.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Informações da Tarefa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-gray-600 mb-1">ID da Tarefa</p>
                    <p className="font-semibold">{task.taskId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Categoria</p>
                    <p className="font-semibold">{task.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Cliente</p>
                    <p className="font-semibold">{task.client}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Projeto</p>
                    <p className="font-semibold">{task.project}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Pagamento Total</p>
                    <p className="font-semibold text-green-600">R$ {task.payment}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Bônus</p>
                    <p className="font-semibold text-green-600">+{task.bonus}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Criada em</p>
                    <p className="font-semibold">{formatDeadline(task.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Prazo Final</p>
                    <p className="font-semibold">{formatDeadline(task.deadline)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Enviar Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Arquivos *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <Input type="file" multiple onChange={handleFileUpload} className="hidden" id="upload-files" />
                <label htmlFor="upload-files" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Clique para selecionar arquivos</p>
                  <p className="text-xs text-gray-500 mt-1">ou arraste e solte aqui</p>
                </label>
              </div>
              {uploadFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <span>{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== idx))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Comentário (opcional)</Label>
              <Textarea
                placeholder="Adicione observações sobre a entrega..."
                value={uploadComment}
                onChange={(e) => setUploadComment(e.target.value)}
                rows={4}
                className="resize-none text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              onClick={handleSubmitDelivery}
              disabled={uploadFiles.length === 0}
            >
              Enviar Entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
