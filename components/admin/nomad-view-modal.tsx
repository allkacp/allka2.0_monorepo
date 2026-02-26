
import { Button } from "@/components/ui/button"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  Mail,
  Star,
  Eye,
  Edit,
  Clock,
  BarChart3,
  X,
  DollarSign,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  Award,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Nomad {
  id: number
  name: string
  email: string
  level: string
  specialties: string[]
  tasksCompleted: number
  rating: number
  earnings: number
  status: string
  joinedDate: string
}

interface NomadViewModalProps {
  nomad: Nomad
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function NomadViewModal({ nomad, open, onOpenChange, onEdit }: NomadViewModalProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "Gold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "Silver":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      case "Bronze":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="text-gray-600">
            <div className="h-2 w-2 rounded-full bg-gray-400 mr-1.5"></div>
            Inativo
          </Badge>
        )
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Mock data for demonstration
  const monthlyEarnings = 4500
  const pendingTasks = 3
  const completedThisMonth = 12
  const averageTaskValue = nomad.earnings / nomad.tasksCompleted

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 right-0 z-50 h-[calc(100vh-32px)] bg-background w-[800px]",
            "shadow-[rgba(0,0,0,0.2)_-8px_0px_32px_0px,rgba(0,0,0,0.1)_-4px_0px_16px_0px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100",
            "duration-300 ease-in-out overflow-hidden flex flex-col",
          )}
        >
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="flex-shrink-0 p-8 pb-4 border-b">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Detalhes do Nômade</h2>
            </div>
            <p className="text-muted-foreground">Visualize todas as informações do nômade</p>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-4">
            <Tabs defaultValue="info" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="earnings">Ganhos</TabsTrigger>
                <TabsTrigger value="performance">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Desempenho
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20 ring-4 ring-blue-600/20">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl font-bold">
                          {nomad.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-2xl font-bold">{nomad.name}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getLevelColor(nomad.level)}>
                            <Award className="h-3 w-3 mr-1" />
                            {nomad.level}
                          </Badge>
                          {getStatusBadge(nomad.status)}
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="font-semibold">{nomad.rating}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="h-5 w-5" />
                      <span>Informações de Contato</span>
                    </CardTitle>
                    <CardDescription>Dados de contato do nômade</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Nome Completo</p>
                        <p className="text-base font-medium">{nomad.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground flex items-center space-x-1">
                          <Mail className="h-3.5 w-3.5" />
                          <span>Email</span>
                        </p>
                        <p className="text-base font-medium">{nomad.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Especialidades</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {nomad.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline" className="px-3 py-1">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Informações da Conta</span>
                    </CardTitle>
                    <CardDescription>Data de cadastro e atividade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Cadastrado em</p>
                          <p className="text-base font-medium">{formatDate(nomad.joinedDate)}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Tarefas Concluídas</p>
                          <p className="text-base font-medium">{nomad.tasksCompleted}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="earnings" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                        <DollarSign className="h-5 w-5" />
                        <span>Ganhos Mensais</span>
                      </CardTitle>
                      <CardDescription>Ganhos do mês atual</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-green-600">R$ {monthlyEarnings.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">{completedThisMonth} tarefas este mês</p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
                        <TrendingUp className="h-5 w-5" />
                        <span>Ganhos Totais</span>
                      </CardTitle>
                      <CardDescription>Ganhos acumulados até hoje</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-blue-600">R$ {nomad.earnings.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">{nomad.tasksCompleted} tarefas totais</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Estatísticas de Ganhos</span>
                    </CardTitle>
                    <CardDescription>Análise detalhada dos ganhos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Valor Médio por Tarefa</p>
                        <p className="text-2xl font-bold text-purple-600">R$ {averageTaskValue.toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
                        <p className="text-2xl font-bold text-green-600">98%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-orange-700 dark:text-orange-400">
                      <ListTodo className="h-5 w-5" />
                      <span>Tarefas Pendentes</span>
                    </CardTitle>
                    <CardDescription>Tarefas aguardando conclusão</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-orange-600">{pendingTasks}</p>
                    <p className="text-sm text-muted-foreground mt-1">Tarefas em andamento</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5" />
                      <span>Avaliação e Desempenho</span>
                    </CardTitle>
                    <CardDescription>Métricas de qualidade e satisfação</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Avaliação Média</p>
                        <div className="flex items-center space-x-1">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-2xl font-bold">{nomad.rating}</span>
                          <span className="text-muted-foreground">/5.0</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${(nomad.rating / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Nível Atual</p>
                        <Badge className={getLevelColor(nomad.level)} variant="outline">
                          <Award className="h-3 w-3 mr-1" />
                          {nomad.level}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Tarefas Concluídas</p>
                        <p className="text-xl font-bold">{nomad.tasksCompleted}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Taxa de Sucesso</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: "98%" }}></div>
                      </div>
                      <p className="text-sm text-muted-foreground">98% de tarefas concluídas com sucesso</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Crescimento</span>
                    </CardTitle>
                    <CardDescription>Evolução nos últimos meses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tarefas Concluídas</span>
                        <span className="text-sm font-semibold text-green-600">+15% este mês</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ganhos</span>
                        <span className="text-sm font-semibold text-green-600">+22% este mês</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Avaliação Média</span>
                        <span className="text-sm font-semibold text-green-600">+0.2 este mês</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex-shrink-0 flex justify-end space-x-2 p-8 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={onEdit} className="btn-brand">
              <Edit className="h-4 w-4 mr-2" />
              Editar Nômade
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
