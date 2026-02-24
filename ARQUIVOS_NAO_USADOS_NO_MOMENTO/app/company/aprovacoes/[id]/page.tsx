
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
  FileText,
  Upload,
  Eye,
  MessageSquare,
  Paperclip,
  X,
  Star,
  DollarSign,
  Edit,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface Stage {
  id: string
  number: number
  title: string
  status: "completed" | "in-progress" | "pending" | "rejected"
  deliveryDeadline: Date
  executionDeadline: Date
  approvalDeadline: Date
  leader: { name: string; avatar: string }
  items: Array<{
    id: string
    name: string
    type: string
    status: "approved" | "rejected" | "pending"
    fileUrl?: string
  }>
  comments: Array<{
    id: string
    author: string
    role: string
    content: string
    timestamp: Date
    attachments?: Array<{ name: string; url: string }>
  }>
  isEmergency?: boolean
  rejectionCount?: number
  rating?: number
}

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

const TaskDetailPage = () => {
  const params = useParams()
  const navigate = useNavigate()
  const taskId = params.id as string

  const taskBg = "bg-gray-50"

  const [task] = useState({
    taskId: "T19572",
    title: "Card Post Estático ou Motion (8 criativos + 8 copy)",
    project: "Sebrae CE",
    client: "Outros",
    agency: "Sebrae",
    createdAt: new Date("2025-09-30T18:56:00"),
    stages: [
      {
        id: "stage-1",
        number: 1,
        title: "8x Conteúdo e Legenda para Criativo",
        status: "completed" as const,
        deliveryDeadline: new Date("2025-10-06T23:59:00"),
        executionDeadline: new Date("2025-10-06T23:59:00"),
        approvalDeadline: new Date("2025-10-16T23:59:00"),
        leader: { name: "Michelle Teruel", avatar: "" },
        rating: 5,
        items: [
          {
            id: "item-1",
            name: "[T19572 - 8x Conteúdo e Legenda para Criativo] V3",
            type: "ARQUIVO",
            status: "approved" as const,
            fileUrl: "#",
          },
        ],
        comments: [
          {
            id: "c1",
            author: "Michelle Teruel",
            role: "Líder",
            content: "Aprovado! Excelente trabalho na criação do conteúdo.",
            timestamp: new Date("2025-10-06T15:30:00"),
          },
        ],
      },
      {
        id: "stage-2",
        number: 2,
        title: "8x Criativo Estático ou Motion",
        status: "in-progress" as const,
        deliveryDeadline: new Date("2025-10-07T18:00:00"),
        executionDeadline: new Date("2025-10-07T18:00:00"),
        approvalDeadline: new Date("2025-10-21T23:59:00"),
        leader: { name: "Samuel Gouvea", avatar: "" },
        items: [
          {
            id: "item-2",
            name: "[T19572 - 8x Criativo Estático ou Motion] V3",
            type: "ARQUIVO",
            status: "pending" as const,
            fileUrl: "#",
          },
        ],
        comments: [
          {
            id: "c2",
            author: "Samuel Gouvea",
            role: "Líder",
            content: "Aguardando revisão dos criativos enviados.",
            timestamp: new Date("2025-10-07T14:20:00"),
          },
        ],
        isEmergency: true,
        rejectionCount: 3,
      },
    ] as Stage[],
  })

  const [expandedStages, setExpandedStages] = useState(new Set(["stage-2"]))
  const [newComment, setNewComment] = useState("")
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionComment, setRejectionComment] = useState("")
  const [rejectionFiles, setRejectionFiles] = useState<File[]>([])

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

  const handleDuplicateStage = (stageId: string) => {
    console.log("Duplicating stage:", stageId)
    // Logic to duplicate the stage would go here
  }

  const handleRejectStage = () => {
    // Logic to reject stage with comment and files
    console.log("Rejecting stage with:", { rejectionComment, rejectionFiles })
    setShowRejectDialog(false)
    setRejectionComment("")
    setRejectionFiles([])
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setRejectionFiles(Array.from(e.target.files))
    }
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
              {task.stages.some((s) => s.isEmergency) && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">EMERGENCIAL</Badge>
              )}
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
                  {formatDeadline(task.createdAt)}
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
              {/* Progress line */}
              <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                  style={{
                    width: `${(task.stages.filter((s) => s.status === "completed").length / task.stages.length) * 100}%`,
                  }}
                />
              </div>

              {/* Stage indicators */}
              <div className="relative flex justify-between">
                {task.stages.map((stage, index) => (
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
                        <span className="font-bold">{stage.number}</span>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p
                        className={`text-sm font-medium ${stage.status === "in-progress" ? "text-blue-600" : "text-gray-600"}`}
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
          <TabsList className="grid w-full grid-cols-4 mb-6 text-xs">
            <TabsTrigger value="stages" className="text-xs">
              Etapas ({task.stages.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-xs">
              Comentários ({task.stages.reduce((acc, s) => acc + s.comments.length, 0)})
            </TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs">
              Anexos
            </TabsTrigger>
            <TabsTrigger value="info" className="text-xs">
              Informações Gerais
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="space-y-4">
            {task.stages.map((stage) => (
              <Card
                key={stage.id}
                className={`shadow-sm border ${stage.status === "completed" ? "bg-gray-50" : "bg-white"}`}
              >
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50/50 transition-all py-4"
                  onClick={() => toggleStageExpansion(stage.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {stage.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                      <h3 className="text-base font-semibold text-gray-900">
                        Nº {stage.number}. {stage.title}
                      </h3>
                      {stage.rating && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {Array.from({ length: stage.rating }).map((_, i) => (
                            <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      {expandedStages.has(stage.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {expandedStages.has(stage.id) && (
                  <CardContent className="space-y-6 pt-0">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-600 font-medium">Status</span>
                            <Badge className="bg-yellow-500 text-white font-semibold text-xs px-3 py-1">
                              APROVAÇÃO PENDENTE - AGÊNCIA
                            </Badge>
                            {stage.rejectionCount && stage.rejectionCount > 0 && (
                              <Badge className="bg-pink-500 text-white font-semibold text-xs px-2 py-1">
                                {stage.rejectionCount}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 mb-1">Prazo de Entrega</p>
                              <p className="font-semibold text-gray-900">{formatDeadline(stage.deliveryDeadline)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Prazo de Execução</p>
                              <p className="font-semibold text-gray-900">{formatDeadline(stage.executionDeadline)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Prazo de Aprovação</p>
                              <p className="font-semibold text-gray-900">{formatDeadline(stage.approvalDeadline)}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500 mb-1">Líder</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-blue-600">{stage.leader.name}</span>
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <MessageSquare className="h-3 w-3 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 flex-shrink-0">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white h-9 w-9 p-0">
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white h-9 w-9 p-0">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white h-9 w-9 p-0">
                            <Info className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-4 text-base">Itens entregues para aprovação da etapa</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                Item
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                Tipo
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                Qualificação
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                Agência
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stage.items.map((item) => (
                              <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-8"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      {item.name}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <Info className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className="bg-blue-500 text-white font-medium text-xs">ARQUIVO</Badge>
                                </td>
                                <td className="py-3 px-4">
                                  {item.status === "approved" && (
                                    <Badge className="bg-green-500 text-white font-medium text-xs">APROVADO</Badge>
                                  )}
                                  {item.status === "rejected" && (
                                    <Badge className="bg-red-500 text-white font-medium text-xs">REPROVADO</Badge>
                                  )}
                                  {item.status === "pending" && (
                                    <Badge className="bg-yellow-500 text-white font-medium text-xs">PENDENTE</Badge>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className="bg-yellow-500 text-white font-medium text-xs">PENDENTE</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Comentários ({stage.comments.length})
                      </h4>
                      <div className="space-y-3">
                        {stage.comments.map((comment) => (
                          <div key={comment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-sm">{comment.author}</p>
                                <p className="text-xs text-gray-500">{comment.role}</p>
                              </div>
                              <p className="text-xs text-gray-500">{formatDeadline(comment.timestamp)}</p>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {comment.attachments.map((att, idx) => (
                                  <Badge key={idx} variant="outline" className="flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    {att.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Todos os Comentários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.stages
                    .flatMap((s) => s.comments)
                    .map((comment) => (
                      <div key={comment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-sm">{comment.author}</p>
                            <p className="text-xs text-gray-500">{comment.role}</p>
                          </div>
                          <p className="text-xs text-gray-500">{formatDeadline(comment.timestamp)}</p>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {comment.attachments.map((att, idx) => (
                              <Badge key={idx} variant="outline" className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                {att.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="attachments" className="space-y-4">
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Todos os Anexos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.stages
                    .flatMap((stage) => stage.items.filter((item) => item.fileUrl))
                    .map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span className="font-medium text-sm">{item.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <Button size="sm" variant="outline" className="bg-transparent">
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="info" className="space-y-4">
            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Informações Gerais da Tarefa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Título</h4>
                    <p className="text-gray-700">{task.title}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Projeto</h4>
                    <p className="text-gray-700">{task.project}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Cliente</h4>
                    <p className="text-gray-700">{task.client}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Agência</h4>
                    <p className="text-gray-700">{task.agency}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Data de Criação</h4>
                    <p className="text-gray-700">{formatDeadline(task.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rejeitar Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Rejeição *</Label>
              <Textarea
                placeholder="Descreva o motivo da rejeição e as correções necessárias..."
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Anexar Arquivos (opcional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <Input type="file" multiple onChange={handleFileUpload} className="hidden" id="rejection-files" />
                <label htmlFor="rejection-files" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Clique para selecionar arquivos</p>
                  <p className="text-xs text-gray-500 mt-1">ou arraste e solte aqui</p>
                </label>
              </div>
              {rejectionFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rejectionFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRejectionFiles(rejectionFiles.filter((_, i) => i !== idx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleRejectStage}
              disabled={!rejectionComment.trim()}
            >
              Rejeitar e Enviar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TaskDetailPage
