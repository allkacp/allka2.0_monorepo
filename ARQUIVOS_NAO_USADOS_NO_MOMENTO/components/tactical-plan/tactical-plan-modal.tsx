
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Bot, Target } from "lucide-react"

interface TacticalPlanTask {
  id: string
  title: string
  description: string
  estimated_hours: number
  priority: "low" | "medium" | "high" | "urgent"
  dependencies: string[]
  deliverables: string[]
  requirements: Record<string, any>
  suggested_nomad_profile?: string
  ai_generated: boolean
  status: "draft" | "approved" | "rejected" | "needs_review"
  order: number
}

interface TacticalPlan {
  id: string
  project_id: string
  project_name: string
  total_estimated_hours: number
  total_estimated_cost: number
  timeline_days: number
  tasks: TacticalPlanTask[]
  ai_analysis: {
    complexity_score: number
    risk_factors: string[]
    recommendations: string[]
    optimal_team_size: number
  }
  created_at: string
  updated_at: string
}

interface TacticalPlanModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectData: {
    name: string
    description: string
    products: any[]
    files: any[]
    budget?: number
  }
}

export default function TacticalPlanModal({ isOpen, onClose, projectId, projectData }: TacticalPlanModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [tacticalPlan, setTacticalPlan] = useState<TacticalPlan | null>(null)
  const [editingTask, setEditingTask] = useState<TacticalPlanTask | null>(null)
  const [showTaskEditor, setShowTaskEditor] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [planningStep, setPlanningStep] = useState<"chat" | "review" | "approved">("chat")

  // Mock messages for now
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Olá! O planejamento tático com IA será implementado em breve para o projeto "${projectData.name}".`,
    },
  ])

  useEffect(() => {
    if (isOpen && !tacticalPlan) {
      loadExistingPlan()
    }
  }, [isOpen, projectId])

  const loadExistingPlan = async () => {
    try {
      setLoading(true)
      // Check if there's already a tactical plan for this project
      const response = await fetch(`/api/projects/${projectId}/tactical-plan`)
      if (response.ok) {
        const plan = await response.json()
        setTacticalPlan(plan)
        setPlanningStep(plan.status === "approved" ? "approved" : "review")
      }
    } catch (error) {
      console.error("Failed to load tactical plan:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateTacticalPlan = async () => {
    try {
      setLoading(true)

      // Send all project context to AI for analysis
      const response = await fetch(`/api/projects/${projectId}/tactical-plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_data: projectData,
          chat_context: messages,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate tactical plan")

      const generatedPlan = await response.json()
      setTacticalPlan(generatedPlan)
      setPlanningStep("review")

      toast({
        title: "Plano Tático Gerado",
        description: "A IA criou um plano completo baseado nos dados do projeto. Revise e aprove as tarefas.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao gerar plano tático",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return

    try {
      toast({
        title: "Funcionalidade Temporariamente Indisponível",
        description: "O chat com IA será implementado em breve",
        variant: "destructive",
      })
      setChatMessage("")
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive",
      })
    }
  }

  const editTask = (task: TacticalPlanTask) => {
    setEditingTask({ ...task })
    setShowTaskEditor(true)
  }

  const saveTask = () => {
    if (!editingTask || !tacticalPlan) return

    const updatedTasks = tacticalPlan.tasks.map((task) => (task.id === editingTask.id ? editingTask : task))

    setTacticalPlan({
      ...tacticalPlan,
      tasks: updatedTasks,
      total_estimated_hours: updatedTasks.reduce((sum, task) => sum + task.estimated_hours, 0),
    })

    setShowTaskEditor(false)
    setEditingTask(null)

    toast({
      title: "Tarefa Atualizada",
      description: "As alterações foram salvas com sucesso",
    })
  }

  const deleteTask = (taskId: string) => {
    if (!tacticalPlan) return

    const updatedTasks = tacticalPlan.tasks.filter((task) => task.id !== taskId)
    setTacticalPlan({
      ...tacticalPlan,
      tasks: updatedTasks,
      total_estimated_hours: updatedTasks.reduce((sum, task) => sum + task.estimated_hours, 0),
    })

    toast({
      title: "Tarefa Removida",
      description: "A tarefa foi removida do plano",
    })
  }

  const approvePlan = async () => {
    if (!tacticalPlan) return

    try {
      setLoading(true)

      const response = await fetch(`/api/projects/${projectId}/tactical-plan/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tacticalPlan),
      })

      if (!response.ok) throw new Error("Failed to approve plan")

      setPlanningStep("approved")

      toast({
        title: "Plano Aprovado",
        description: "As tarefas foram enviadas para execução e estão disponíveis para distribuição",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao aprovar plano tático",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    }
    return labels[priority as keyof typeof labels] || "Média"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Plano Tático - {projectData.name}
          </DialogTitle>
        </DialogHeader>

        <div className="text-center text-muted-foreground py-8">
          <Bot className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Planejamento Tático com IA</h3>
          <p>Esta funcionalidade será implementada em breve.</p>
          <p className="text-sm mt-2">
            O sistema permitirá criar planos táticos completos com análise de IA, estimativas de tempo e custos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
