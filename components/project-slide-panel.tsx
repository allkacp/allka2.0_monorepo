// @ts-nocheck
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X, User, Users, DollarSign, Calendar, ListChecks, AlertCircle, FolderKanban, Clock, Download, FileText, CheckCircle2, ChevronRight, Star, Edit, Camera, ZoomIn, Crosshair, Trash2 } from 'lucide-react'
import { type Project } from "@/lib/api"
import { cn } from "@/lib/utils"
import React, { useRef, useState } from "react"
import { TaskDetailSlidePanel } from "@/components/task-detail-slide-panel"
import { useSidebar } from "@/contexts/sidebar-context"
import { PaymentConfiguration } from "@/components/payment-configuration"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"

interface TaskItem {
  id: string
  title: string
  completed: boolean
  deliverable?: string
  approved?: boolean
  approvedAt?: string
}

interface TaskFile {
  id: string
  name: string
  size: string
  uploadedAt: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  assignee: string
  dueDate: string
  items?: TaskItem[]
  files?: TaskFile[]
}

interface ProjectFile {
  id: string
  name: string
  type: string
  size: string
  uploadedAt: string
  uploadedBy: string
  approved?: boolean
  approvedAt?: string
}

interface ProjectSlidePanelProps {
  open: boolean
  onClose: () => void
  onEdit?: () => void
  project?: Project
  tasks?: Task[]
  files?: ProjectFile[]
}

const statusColors = {
  planning: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels = {
  planning: "Planejamento",
  active: "Ativo",
  on_hold: "Em Espera",
  completed: "Concluído",
  cancelled: "Cancelado",
}

const priorityColors = {
  high: "text-red-600 bg-red-50",
  medium: "text-yellow-600 bg-yellow-50",
  low: "text-blue-600 bg-blue-50",
}

const priorityLabels = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
}

const taskStatusColors = {
  pending: "text-gray-600 bg-gray-100",
  in_progress: "text-blue-600 bg-blue-100",
  completed: "text-green-600 bg-green-100",
}

const taskStatusLabels = {
  pending: "Pendente",
  in_progress: "Em Progresso",
  completed: "Concluída",
}

export function ProjectSlidePanel({ open, onClose, onEdit, project, tasks = [], files = [] }: ProjectSlidePanelProps) {
  const { sidebarWidth } = useSidebar()
  const [activeTab, setActiveTab] = React.useState<"overview" | "tasks" | "approved" | "files" | "payments">("overview")
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
  const [selectedProductFilter, setSelectedProductFilter] = React.useState<string>("all")
  const [selectedTaskFilter, setSelectedTaskFilter] = React.useState<string>("all")
  const [expandedProducts, setExpandedProducts] = React.useState<Record<string, boolean>>({})
  const [expandedTasks, setExpandedTasks] = React.useState<Record<string, boolean>>({})

  // Avatar / crop state
  const [avatar, setAvatar] = useState<string | null>(null)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [originalRawSrc, setOriginalRawSrc] = useState<string | null>(null)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const CROP_SIZE = 192

  const formatCurrency = (value?: number) => {
    if (!value) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getTaskStats = () => {
    const completed = tasks.filter(t => t.status === "completed").length
    const total = tasks.length
    const progress = total > 0 ? (completed / total) * 100 : 0
    return { completed, total, progress }
  }

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄"
    if (type.includes("image")) return "🖼️"
    if (type.includes("doc")) return "📝"
    return "📎"
  }

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const getTaskRating = (status: string) => {
    return status === "completed" ? 5 : 0
  }

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500 text-white hover:bg-green-600"
      case "pending": return "bg-yellow-500 text-white hover:bg-yellow-600"
      case "rejected": return "bg-red-500 text-white hover:bg-red-600"
      default: return "bg-blue-500 text-white hover:bg-blue-600"
    }
  }

  const getApprovalStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "APROVADO"
      case "pending": return "PENDENTE"
      case "rejected": return "REJEITADO"
      default: return "ARQUIVO"
    }
  }

  const approvedFilesByTask = React.useMemo(() => {
    const result: Record<string, any[]> = {}
    
    tasks.forEach(task => {
      if (task.items) {
        task.items.forEach(item => {
          if (item.completed && item.deliverable) {
            if (!result[task.id]) {
              result[task.id] = []
            }
            result[task.id].push({
              taskTitle: task.title,
              itemTitle: item.title,
              fileName: item.deliverable,
              approvedAt: item.approvedAt,
            })
          }
        })
      }
    })
    
    return result
  }, [tasks])

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    // Don't close the project panel, just layer the task panel on top
  }

  const handleTaskPanelClose = () => {
    setSelectedTask(null)
  }

  // Avatar handlers
  const handleAvatarClick = () => {
    if (avatar) { setShowAvatarMenu((p) => !p) } else { fileInputRef.current?.click() }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      setRawImageSrc(src)
      setOriginalRawSrc(src)
      setCropZoom(1)
      setCropOffset({ x: 0, y: 0 })
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
  }
  const handleCropConfirm = () => {
    const img = cropImgRef.current
    if (!img) return
    const canvas = document.createElement("canvas")
    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext("2d")!
    ctx.beginPath()
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    const fitScale = Math.min(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight)
    const drawW = img.naturalWidth * fitScale * cropZoom
    const drawH = img.naturalHeight * fitScale * cropZoom
    const dx = CROP_SIZE / 2 + cropOffset.x - drawW / 2
    const dy = CROP_SIZE / 2 + cropOffset.y - drawH / 2
    ctx.drawImage(img, dx, dy, drawW, drawH)
    setAvatar(canvas.toDataURL("image/jpeg", 0.92))
    setCropOpen(false)
    setRawImageSrc(null)
  }

  const getProductsWithTasks = () => {
    const products = [
      {
        id: "prod1",
        name: "Desenvolvimento de Landing Page",
        tasks: tasks.filter(t => t.priority === "high"),
      },
      {
        id: "prod2", 
        name: "Sistema de Gestão",
        tasks: tasks.filter(t => t.priority === "medium"),
      },
      {
        id: "prod3",
        name: "App Mobile",
        tasks: tasks.filter(t => t.priority === "low"),
      },
    ].filter(p => p.tasks.length > 0)
    
    return products
  }

  const getProductProgress = (productTasks: Task[]) => {
    if (productTasks.length === 0) return 0
    const completed = productTasks.filter(t => t.status === "completed").length
    return (completed / productTasks.length) * 100
  }

  const getTaskProgress = (task: Task) => {
    if (!task.items || task.items.length === 0) return task.status === "completed" ? 100 : 0
    const completed = task.items.filter(i => i.completed).length
    return (completed / task.items.length) * 100
  }

  const getStepStatusBadge = (item: TaskItem) => {
    if (item.completed) {
      return <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">Finalizada</Badge>
    }
    return <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">Em Execução</Badge>
  }

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }))
  }

  const toggleTaskInProgress = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  if (!project) return null

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 flex flex-col gap-0 !w-auto !max-w-none"
          style={{ left: `${sidebarWidth}px`, width: `calc(100vw - ${sidebarWidth}px)`, maxWidth: `calc(100vw - ${sidebarWidth}px)` }}
        >
          <div className="relative flex flex-col h-full overflow-hidden">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            {/* Brand Header */}
            <ModalBrandHeader
              onClose={onClose}
              right={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={cn("text-xs font-semibold", statusColors[project.status as keyof typeof statusColors])}>
                    {statusLabels[project.status as keyof typeof statusLabels]}
                  </Badge>
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors border border-white/20"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  )}
                </div>
              }
              left={
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Avatar Section */}
                  <button
                    onClick={handleAvatarClick}
                    className="relative h-16 w-16 rounded-full bg-white/15 border-2 border-white/30 flex-shrink-0 group overflow-hidden hover:border-white/60 transition-all"
                  >
                    {avatar ? (
                      <img src={avatar} alt="projeto" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-500">
                        <FolderKanban className="h-7 w-7 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="h-4 w-4 text-white" />
                      <span className="text-[9px] text-white/90 font-medium mt-0.5">{avatar ? "Editar" : "Foto"}</span>
                    </div>
                  </button>

                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-base truncate">{project.name}</h2>
                    {project.description && (
                      <p className="text-white/60 text-xs truncate mt-0.5">{project.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {project.client?.name && (
                        <span className="text-white/70 text-xs flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {project.client.name}
                        </span>
                      )}
                      {project.end_date && (
                        <span className="text-white/70 text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(project.end_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              }
            />

            {/* Avatar menu */}
            {showAvatarMenu && avatar && (
              <>
                <div className="absolute inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                <div className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-w-[172px]" style={{ top: 108, left: 22 }}>
                  <button
                    onClick={() => { setShowAvatarMenu(false); setTimeout(() => fileInputRef.current?.click(), 10) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-gray-400" />
                    Nova foto
                  </button>
                  {originalRawSrc && (
                    <button
                      onClick={() => { setShowAvatarMenu(false); setRawImageSrc(originalRawSrc); setCropZoom(1); setCropOffset({ x: 0, y: 0 }); setCropOpen(true) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                    >
                      <ZoomIn className="h-3.5 w-3.5 text-gray-400" />
                      Reposicionar
                    </button>
                  )}
                  <button
                    onClick={() => { setShowAvatarMenu(false); setAvatar(null); setOriginalRawSrc(null) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover foto
                  </button>
                </div>
              </>
            )}

            {/* Crop overlay */}
            {cropOpen && rawImageSrc && (
              <div className="absolute inset-0 z-50 flex flex-col bg-black/90">
                <div className="flex-shrink-0 px-6 pt-5 pb-2 text-center">
                  <p className="text-white text-sm font-semibold">Ajustar foto do projeto</p>
                  <p className="text-white/50 text-xs mt-0.5">Arraste para reposicionar · use o zoom para ajustar</p>
                </div>
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <div
                    className="relative flex-shrink-0"
                    style={{ width: CROP_SIZE, height: CROP_SIZE }}
                    onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y }) }}
                    onMouseMove={(e) => { if (!isDragging) return; setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                  >
                    <img ref={cropImgRef} src={rawImageSrc} alt="crop" draggable={false}
                      style={{ transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: "center", userSelect: "none", width: "100%", height: "100%", objectFit: "contain", opacity: 0.35 }}
                    />
                    <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `circle(${CROP_SIZE / 2}px at 50% 50%)`, pointerEvents: "none" }}>
                      <img src={rawImageSrc} alt="crop-bright" draggable={false}
                        style={{ transform: `translate(${cropOffset.x}px,${cropOffset.y}px) scale(${cropZoom})`, transformOrigin: "center", userSelect: "none", width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-white/60 pointer-events-none" style={{ borderRadius: "50%" }} />
                  </div>
                </div>
                <div className="flex-shrink-0 px-6 pb-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <Camera className="h-4 w-4 text-white/60 flex-shrink-0" />
                    <input type="range" min={0.1} max={3} step={0.01} value={cropZoom} onChange={(e) => setCropZoom(parseFloat(e.target.value))} className="flex-1 accent-white" />
                    <button onClick={() => setCropOffset({ x: 0, y: 0 })} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0" title="Centralizar">
                      <Crosshair className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setCropOpen(false); setRawImageSrc(null) }} className="flex-1 h-9 rounded-lg border border-white/20 text-white/70 text-sm hover:bg-white/10 transition-colors">Cancelar</button>
                    <button onClick={handleCropConfirm} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-violet-700 transition-colors">Usar esta foto</button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs + Content */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
                <div className="flex-shrink-0 bg-white px-[50px] pt-0 pb-[10px] overflow-x-auto">
                  <TabsList className="grid w-max grid-cols-5 gap-1 bg-transparent p-0 h-auto">
                    <TabsTrigger
                      value="overview"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <FolderKanban className="h-3.5 w-3.5" />
                      Visão Geral
                    </TabsTrigger>
                    <TabsTrigger
                      value="tasks"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <ListChecks className="h-3.5 w-3.5" />
                      Tarefas{tasks.length > 0 && ` (${tasks.length})`}
                    </TabsTrigger>
                    <TabsTrigger
                      value="approved"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovados
                    </TabsTrigger>
                    <TabsTrigger
                      value="files"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Arquivos
                    </TabsTrigger>
                    <TabsTrigger
                      value="payments"
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Pagamentos
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                  <div className="p-5">
                    <TabsContent value="overview" className="mt-0">
                      <div className="space-y-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-gray-600 font-medium">Cliente</span>
                        </div>
                        <p className="font-semibold text-sm">{project.client?.name}</p>
                        <p className="text-xs text-gray-500">{project.client?.email}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-600 font-medium">Gerente</span>
                        </div>
                        <p className="font-semibold text-sm">{project.manager?.name}</p>
                        <p className="text-xs text-gray-500">{project.manager?.email}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-gray-600 font-medium">Orçamento</span>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(project.budget)}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-orange-600" />
                          <span className="text-xs text-gray-600 font-medium">Período</span>
                        </div>
                        <p className="text-xs">
                          {formatDate(project.start_date)} - {formatDate(project.end_date)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {tasks.length > 0 && (
                  <>
                    <Separator className="dark:bg-gray-800" />
                    <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <ListChecks className="w-5 h-5 text-indigo-600" />
                          <CardTitle className="text-base">Progresso do Projeto</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {getProductsWithTasks().map((product) => {
                          const productProgress = getProductProgress(product.tasks)
                          const isExpanded = expandedProducts[product.id]

                          return (
                            <div key={product.id} className="border rounded-lg overflow-hidden">
                              {/* Product Header */}
                              <button
                                onClick={() => toggleProduct(product.id)}
                                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                    <ChevronRight className="w-4 h-4 text-indigo-600" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <h4 className="font-semibold text-sm text-gray-900">{product.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Progress value={productProgress} className="h-1.5 flex-1 max-w-[200px]" />
                                      <span className="text-xs font-medium text-indigo-600">{productProgress.toFixed(0)}%</span>
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {product.tasks.filter(t => t.status === "completed").length}/{product.tasks.length} tarefas
                                </Badge>
                              </button>

                              {/* Product Tasks */}
                              {isExpanded && (
                                <div className="p-3 space-y-2 bg-white">
                                  {product.tasks.map((task) => {
                                    const taskProgress = getTaskProgress(task)
                                    const isTaskExpanded = expandedTasks[task.id]

                                    return (
                                      <div key={task.id} className="border rounded-md overflow-hidden">
                                        {/* Task Header */}
                                        <button
                                          onClick={() => toggleTaskInProgress(task.id)}
                                          className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 flex-1">
                                            <div className={`transform transition-transform ${isTaskExpanded ? 'rotate-90' : ''}`}>
                                              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                            </div>
                                            <div className="flex-1 text-left">
                                              <p className="font-medium text-sm text-gray-900">{task.title}</p>
                                              <div className="flex items-center gap-2 mt-1">
                                                <Progress value={taskProgress} className="h-1 flex-1 max-w-[150px]" />
                                                <span className="text-xs text-gray-600">{taskProgress.toFixed(0)}%</span>
                                              </div>
                                            </div>
                                          </div>
                                          <Badge className={taskStatusColors[task.status as keyof typeof taskStatusColors]}>
                                            {taskStatusLabels[task.status as keyof typeof taskStatusLabels]}
                                          </Badge>
                                        </button>

                                        {/* Task Steps/Items */}
                                        {isTaskExpanded && task.items && task.items.length > 0 && (
                                          <div className="p-2 bg-white space-y-1.5">
                                            <p className="text-xs font-semibold text-gray-500 uppercase px-2">Etapas</p>
                                            {task.items.map((item) => (
                                              <div
                                                key={item.id}
                                                className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                                              >
                                                <div className="flex items-center gap-2 flex-1">
                                                  {item.completed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                  ) : (
                                                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                                                  )}
                                                  <span className="text-sm text-gray-700">{item.title}</span>
                                                </div>
                                                {getStepStatusBadge(item)}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
                    </TabsContent>

                    <TabsContent value="tasks" className="mt-0">
                      <div className="space-y-3">
                {tasks.length > 0 ? (
                  <>
                    {tasks.map((task) => (
                      <Card 
                        key={task.id} 
                        className="hover:shadow-md transition-all border-l-4 border-l-blue-400 shadow-sm cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                {task.title}
                                {task.status === "completed" && (
                                  <div className="flex gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                  </div>
                                )}
                                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                              </h4>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`${taskStatusColors[task.status as keyof typeof taskStatusColors]} text-xs px-2 py-0.5`}>
                                  {taskStatusLabels[task.status as keyof typeof taskStatusLabels]}
                                </Badge>
                                <Badge className={`${priorityColors[task.priority as keyof typeof priorityColors]} text-xs px-2 py-0.5`}>
                                  {priorityLabels[task.priority as keyof typeof priorityLabels]}
                                </Badge>
                                <span className="text-gray-600 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {task.assignee}
                                </span>
                                <span className="text-gray-600 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(task.dueDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <Card className="border-2 border-dashed shadow-sm">
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-semibold mb-1">Nenhuma tarefa cadastrada</p>
                      <p className="text-xs text-gray-500">
                        As tarefas deste projeto aparecerão aqui quando forem criadas
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
                    </TabsContent>

                    <TabsContent value="approved" className="mt-0">
                      <div>
                {Object.keys(approvedFilesByTask).length > 0 ? (
                  <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-4">
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600 mb-2 block">Filtrar por Tarefa (Produto)</label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant={selectedTaskFilter === "all" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedTaskFilter("all")}
                              className={selectedTaskFilter === "all" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                            >
                              Todas
                            </Button>
                            {Object.keys(approvedFilesByTask).map((taskId) => {
                              const taskTitle = approvedFilesByTask[taskId][0]?.taskTitle
                              return (
                                <Button
                                  key={taskId}
                                  variant={selectedTaskFilter === taskId ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedTaskFilter(taskId)}
                                  className={selectedTaskFilter === taskId ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                                >
                                  {taskTitle}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {selectedTaskFilter === "all" ? (
                          Object.entries(approvedFilesByTask).map(([taskId, taskFiles]) => (
                            <div key={taskId} className="space-y-2">
                              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md mt-2">
                                Produto: {taskFiles[0].taskTitle}
                              </p>
                              {taskFiles.map((file, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{file.fileName}</p>
                                      <p className="text-xs text-gray-500">
                                        <span className="font-medium">Etapa:</span> {file.itemTitle}
                                        {file.approvedAt && ` • Aprovado em ${formatDate(file.approvedAt)}`}
                                      </p>
                                    </div>
                                  </div>
                                  <Button size="sm" variant="ghost" className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <>
                            {approvedFilesByTask[selectedTaskFilter] && (
                              <>
                                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md mb-2">
                                  Produto: {approvedFilesByTask[selectedTaskFilter][0].taskTitle}
                                </p>
                                {approvedFilesByTask[selectedTaskFilter].map((file, idx) => (
                                  <div 
                                    key={idx}
                                    className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.fileName}</p>
                                        <p className="text-xs text-gray-500">
                                          <span className="font-medium">Etapa:</span> {file.itemTitle}
                                          {file.approvedAt && ` • Aprovado em ${formatDate(file.approvedAt)}`}
                                        </p>
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100">
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed shadow-sm">
                    <CardContent className="p-8 text-center">
                      <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-semibold mb-1">Nenhum arquivo aprovado</p>
                      <p className="text-xs text-gray-500">
                        Os arquivos aprovados aparecerão aqui
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
                    </TabsContent>

                    <TabsContent value="files" className="mt-0">
                      <div>
                {files.length > 0 ? (
                  <Card className="border-l-4 border-l-pink-500 shadow-sm">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-2xl">{getFileIcon(file.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.size} • {formatDate(file.uploadedAt)} • {file.uploadedBy}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="shrink-0">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed shadow-sm">
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-semibold mb-1">Nenhum arquivo do projeto</p>
                      <p className="text-xs text-gray-500">
                        Os arquivos do projeto aparecerão aqui
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-0">
                      <PaymentConfiguration projectId={project.id} projectName={project.name} />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <TaskDetailSlidePanel
        open={!!selectedTask}
        onClose={handleTaskPanelClose}
        task={selectedTask || undefined}
      />
    </>
  )
}
