
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { X, User, Calendar, ListChecks, Clock, Download, FileText, CheckCircle2, ChevronDown, ChevronUp, Star, AlertCircle } from 'lucide-react'
import { cn } from "@/lib/utils"
import React from "react"
import { useSidebar } from "@/contexts/sidebar-context"

interface TaskItem {
  id: string
  title: string
  completed: boolean
  deliverable?: string
  approved?: boolean
  approvedAt?: string
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
}

interface TaskDetailSlidePanelProps {
  open: boolean
  onClose: () => void
  task?: Task
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

export function TaskDetailSlidePanel({ open, onClose, task }: TaskDetailSlidePanelProps) {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = React.useState<"general" | "delivery" | "history">("delivery")
  
  const { sidebarCollapsed } = useSidebar()

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
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

  const leftPosition = sidebarCollapsed ? "left-16" : "left-64"

  if (!task) return null

  return (
    <>
      <div
        className={`fixed ${leftPosition} top-0 right-0 bottom-0 bg-black/70 backdrop-blur-sm transition-all duration-200 z-[80] ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed top-0 right-0 h-[calc(100%-32px)] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800",
          "transition-transform duration-500 ease-in-out z-[90]",
          leftPosition,
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <ListChecks className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{task.title}</h2>
                {task.status === "completed" && (
                  <div className="flex gap-0.5 shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                )}
              </div>
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 hover:bg-white/50 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Status:</span>
              <Badge className={cn("font-semibold text-xs", taskStatusColors[task.status as keyof typeof taskStatusColors])}>
                {taskStatusLabels[task.status as keyof typeof taskStatusLabels]}
              </Badge>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 font-medium">Prazo:</span>
              <span className="font-semibold text-gray-900">{formatDate(task.dueDate)}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2 text-xs">
              <User className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 font-medium">Líder:</span>
              <span className="font-semibold text-blue-600">{task.assignee}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Prioridade:</span>
              <Badge className={cn("text-xs font-semibold", priorityColors[task.priority as keyof typeof priorityColors])}>
                {priorityLabels[task.priority as keyof typeof priorityLabels]}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveTab("general")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold transition-all relative",
              activeTab === "general"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
            )}
          >
            Dados Gerais
            {activeTab === "general" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
          <button
            onClick={() => setActiveTab("delivery")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold transition-all relative",
              activeTab === "delivery"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
            )}
          >
            Etapas de Entrega
            {activeTab === "delivery" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold transition-all relative",
              activeTab === "history"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
            )}
          >
            Histórico
            {activeTab === "history" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600" />}
          </button>
        </div>

        <ScrollArea className="flex-1">
          {activeTab === "general" && (
            <div className="p-5">
              <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Informações da Tarefa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prioridade</p>
                      <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                        {priorityLabels[task.priority as keyof typeof priorityLabels]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Responsável</p>
                      <p className="text-sm font-medium">{task.assignee}</p>
                    </div>
                  </div>
                  {task.description && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Descrição</p>
                      <p className="text-sm text-gray-700">{task.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "delivery" && (
            <div className="p-5 space-y-3">
              {task.items && task.items.length > 0 ? (
                <div className="space-y-3">
                  {task.items.map((item, index) => (
                    <Card key={item.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleItemExpansion(item.id)}
                        className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-semibold text-gray-900">Nº {index + 1}. {item.title}</span>
                            {item.completed && (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          {expandedItems[item.id] ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {expandedItems[item.id] && (
                        <div className="border-t bg-gray-50 dark:bg-gray-800 p-4 space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Status</p>
                              <Badge className={item.completed ? "bg-gray-900 text-white" : "bg-yellow-500 text-white"}>
                                {item.completed ? "CONCLUÍDA" : "APROVAÇÃO PENDENTE"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Prazo de Entrega</p>
                              <p className="text-sm font-semibold">{formatDate(task.dueDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Prazo de Aprovação</p>
                              <p className="text-sm font-semibold">{formatDate(task.dueDate)}</p>
                            </div>
                          </div>

                          <Separator />

                          {item.deliverable && (
                            <div>
                              <h4 className="text-sm font-semibold mb-3">Itens entregues para aprovação da etapa</h4>
                              <div className="bg-white dark:bg-slate-900 rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100 dark:bg-gray-700 border-b">
                                    <tr>
                                      <th className="text-left p-3 text-xs font-semibold text-gray-600 dark:text-gray-300">ITEM</th>
                                      <th className="text-left p-3 text-xs font-semibold text-gray-600 dark:text-gray-300">TIPO</th>
                                      <th className="text-left p-3 text-xs font-semibold text-gray-600 dark:text-gray-300">QUALIFICAÇÃO</th>
                                      <th className="text-left p-3 text-xs font-semibold text-gray-600 dark:text-gray-300">AGÊNCIA</th>
                                      <th className="text-left p-3 text-xs font-semibold text-gray-600 dark:text-gray-300">CLIENTE</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                                      <td className="p-3">
                                        <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-blue-600" />
                                          <span className="text-blue-600 font-medium">{item.deliverable}</span>
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <Badge className="bg-blue-500 text-white hover:bg-blue-600">ARQUIVO</Badge>
                                      </td>
                                      <td className="p-3">
                                        <Badge className={getApprovalStatusColor(item.completed ? "approved" : "pending")}>
                                          {getApprovalStatusLabel(item.completed ? "approved" : "pending")}
                                        </Badge>
                                      </td>
                                      <td className="p-3">
                                        <Badge className={getApprovalStatusColor(item.completed ? "approved" : "pending")}>
                                          {getApprovalStatusLabel(item.completed ? "approved" : "pending")}
                                        </Badge>
                                      </td>
                                      <td className="p-3">
                                        <Badge className={getApprovalStatusColor("pending")}>
                                          PENDENTE
                                        </Badge>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center border-2 border-dashed">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-semibold">Nenhuma etapa cadastrada</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="p-5">
              <Card className="p-8 text-center border-2 border-dashed">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-semibold">Histórico em desenvolvimento</p>
              </Card>
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  )
}
