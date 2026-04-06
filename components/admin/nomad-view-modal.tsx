// @ts-nocheck
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar, Mail, Star, Eye, Edit, Clock, BarChart3, X,
  DollarSign, CheckCircle2, ListTodo, TrendingUp, Award,
  ShieldCheck, ShieldX, Shield, CheckCircle, XCircle, UserPlus, Send,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Nomad {
  id: number
  name: string
  email: string
  level: string
  specialties: string[]
  taskTypes?: string[]
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
  onInvite?: (nomadId: number, role: "platinum" | "leader") => void
}

const HABILITATION_STATUS_CONFIG = {
  certificado: { label: "Certificado", Icon: ShieldCheck, className: "bg-green-50 text-green-700 border-green-200" },
  pendente: { label: "Pendente", Icon: Shield, className: "bg-amber-50 text-amber-700 border-amber-200" },
  revogado: { label: "Revogado", Icon: ShieldX, className: "bg-red-50 text-red-700 border-red-200" },
}

const EXTRA_TASK_TYPES = ["Redação de Artigos", "Otimização SEO", "Edição de Vídeo"]

function getMockHabilitacoes(nomad: Nomad) {
  const base = nomad.taskTypes?.length ? nomad.taskTypes : ["Criação de Posts", "Design de Logos"]
  const extras = EXTRA_TASK_TYPES.filter((t) => !base.includes(t)).slice(0, Math.max(0, 5 - base.length))
  const all = [...base, ...extras]
  return all.map((tt, i) => ({
    id: i + 1,
    taskType: tt,
    status: base.includes(tt)
      ? nomad.tasksCompleted > 30
        ? "certificado"
        : "pendente"
      : "pendente",
    certifiedAt:
      base.includes(tt) && nomad.tasksCompleted > 30 ? "2025-11-15" : null,
  }))
}

export function NomadViewModal({ nomad, open, onOpenChange, onEdit, onInvite }: NomadViewModalProps) {
  const [habilitacoes, setHabilitacoes] = useState(() => getMockHabilitacoes(nomad))
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteMessage, setInviteMessage] = useState("")
  const [inviteSent, setInviteSent] = useState(false)

  useEffect(() => {
    setHabilitacoes(getMockHabilitacoes(nomad))
    setShowInvitePanel(false)
    setInviteSent(false)
    setInviteMessage("")
  }, [nomad.id])

  const inviteRole =
    nomad.level === "Gold" ? "platinum"
    : nomad.level === "Platinum" ? "leader"
    : null

  const inviteLabel = inviteRole === "platinum" ? "Platinum" : inviteRole === "leader" ? "Líder" : ""

  const INVITE_REQUIREMENTS = {
    platinum: [
      { label: "Nível Gold atual", ok: true },
      { label: `Nota média ≥ 4.5 (atual: ${nomad.rating})`, ok: nomad.rating >= 4.5 },
      { label: `Mín. 60 tarefas (atual: ${nomad.tasksCompleted})`, ok: nomad.tasksCompleted >= 60 },
      { label: "Mín. 20h semanais disponíveis", ok: true },
    ],
    leader: [
      { label: "Nível Platinum atual", ok: true },
      { label: `Nota média ≥ 4.5 (atual: ${nomad.rating})`, ok: nomad.rating >= 4.5 },
      { label: "Mín. 24h semanais disponíveis", ok: true },
    ],
  }

  const handleConfirmInvite = () => {
    if (onInvite && inviteRole) onInvite(nomad.id, inviteRole)
    setInviteSent(true)
    setShowInvitePanel(false)
    setInviteMessage("")
  }

  const handleHabilitacaoAction = (id, action) => {
    setHabilitacoes((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              status: action === "approve" ? "certificado" : "revogado",
              certifiedAt: action === "approve" ? new Date().toISOString().slice(0, 10) : null,
            }
          : h
      )
    )
  }

  const getLevelColor = (level) => {
    switch (level) {
      case "Gold": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "Silver": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
      case "Bronze": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      case "Platinum": return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400"
      case "Diamond": return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400"
      case "Leader": return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "ativo": case "active":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Ativo</Badge>
      case "teste_pendente": case "pending":
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Teste Pendente</Badge>
      case "cadastrado":
        return <Badge className="bg-slate-100 text-slate-700 border-slate-300"><div className="h-2 w-2 rounded-full bg-slate-400 mr-1.5 inline-block"></div>Cadastrado</Badge>
      case "atencao":
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />Atenção</Badge>
      case "sem_tarefas":
        return <Badge className="bg-sky-100 text-sky-800"><Clock className="h-3 w-3 mr-1" />Sem Tarefas</Badge>
      case "inativo": case "inactive":
        return <Badge variant="outline" className="text-gray-600"><div className="h-2 w-2 rounded-full bg-gray-400 mr-1.5 inline-block"></div>Inativo</Badge>
      case "reprovado":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Reprovado</Badge>
      default:
        return <Badge variant="outline">Desconhecido</Badge>
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const monthlyEarnings = 4500
  const pendingTasks = 3
  const completedThisMonth = 12
  const averageTaskValue = nomad.tasksCompleted > 0 ? nomad.earnings / nomad.tasksCompleted : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-0 right-0 z-50 h-[calc(100vh-32px)] bg-background w-200",
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

          <div className="shrink-0 p-8 pb-4 border-b">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Detalhes do Nômade</h2>
            </div>
            <p className="text-muted-foreground">Visualize todas as informações do nômade</p>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-4">
            <Tabs defaultValue="info" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 shrink-0">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="earnings">Ganhos</TabsTrigger>
                <TabsTrigger value="performance">
                  <BarChart3 className="h-4 w-4 mr-1" />Desempenho
                </TabsTrigger>
                <TabsTrigger value="habilitacoes">
                  <ShieldCheck className="h-4 w-4 mr-1" />Habilitações
                </TabsTrigger>
              </TabsList>

              {/* INFO TAB */}
              <TabsContent value="info" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20 ring-4 ring-blue-600/20">
                        <AvatarFallback className="bg-linear-to-br from-blue-600 to-purple-600 text-white text-2xl font-bold">
                          {nomad.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-2xl font-bold">{nomad.name}</h3>
                          {inviteSent && (
                            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-xs">
                              <Send className="h-3 w-3 mr-1" />Convite Enviado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <Badge className={getLevelColor(nomad.level)}>
                            <Award className="h-3 w-3 mr-1" />{nomad.level}
                          </Badge>
                          {getStatusBadge(nomad.status)}
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="font-semibold">{nomad.rating}</span>
                          </div>
                        </div>
                        {inviteRole && !inviteSent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 mt-1"
                            onClick={() => setShowInvitePanel(!showInvitePanel)}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            Convidar para {inviteLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {showInvitePanel && inviteRole && (
                  <Card className="border-2 border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                        <UserPlus className="h-4 w-4" />
                        Confirmar Convite — {inviteLabel}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Requisitos</p>
                        {(INVITE_REQUIREMENTS[inviteRole] || []).map((req, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {req.ok
                              ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                              : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                            <span className={req.ok ? "text-foreground" : "text-red-600"}>{req.label}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mensagem (opcional)</p>
                        <Textarea
                          placeholder={`Escreva uma mensagem de convite para ${nomad.name}...`}
                          value={inviteMessage}
                          onChange={(e) => setInviteMessage(e.target.value)}
                          rows={3}
                          className="text-sm resize-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setShowInvitePanel(false)}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={handleConfirmInvite}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />Enviar Convite
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="h-5 w-5" /><span>Informações de Contato</span>
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
                          <Mail className="h-3.5 w-3.5" /><span>Email</span>
                        </p>
                        <p className="text-base font-medium">{nomad.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Especialidades</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {nomad.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline" className="px-3 py-1">{specialty}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" /><span>Informações da Conta</span>
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

              {/* EARNINGS TAB */}
              <TabsContent value="earnings" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2 border-green-200 bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                        <DollarSign className="h-5 w-5" /><span>Ganhos Mensais</span>
                      </CardTitle>
                      <CardDescription>Ganhos do mês atual</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-green-600">R$ {monthlyEarnings.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground mt-1">{completedThisMonth} tarefas este mês</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
                        <TrendingUp className="h-5 w-5" /><span>Ganhos Totais</span>
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
                      <BarChart3 className="h-5 w-5" /><span>Estatísticas de Ganhos</span>
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
                <Card className="border-2 border-orange-200 bg-linear-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-orange-700 dark:text-orange-400">
                      <ListTodo className="h-5 w-5" /><span>Tarefas Pendentes</span>
                    </CardTitle>
                    <CardDescription>Tarefas aguardando conclusão</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-orange-600">{pendingTasks}</p>
                    <p className="text-sm text-muted-foreground mt-1">Tarefas em andamento</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PERFORMANCE TAB */}
              <TabsContent value="performance" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5" /><span>Avaliação e Desempenho</span>
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
                        <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${(nomad.rating / 5) * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Nível Atual</p>
                        <Badge className={getLevelColor(nomad.level)} variant="outline">
                          <Award className="h-3 w-3 mr-1" />{nomad.level}
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
                      <TrendingUp className="h-5 w-5" /><span>Crescimento</span>
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

              {/* HABILITAÇÕES TAB */}
              <TabsContent value="habilitacoes" className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                      Habilitações por Tipo de Tarefa
                    </CardTitle>
                    <CardDescription>
                      Gerencie as certificações do nômade para cada tipo de tarefa
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {habilitacoes.map((hab) => {
                      const cfg = HABILITATION_STATUS_CONFIG[hab.status] || HABILITATION_STATUS_CONFIG.pendente
                      const { Icon } = cfg
                      return (
                        <div
                          key={hab.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                hab.status === "certificado" ? "text-green-600"
                                : hab.status === "revogado" ? "text-red-500"
                                : "text-amber-600"
                              )}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{hab.taskType}</p>
                              {hab.certifiedAt && hab.status === "certificado" && (
                                <p className="text-[11px] text-muted-foreground">
                                  Certificado em {formatDate(hab.certifiedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                              {cfg.label}
                            </Badge>
                            {hab.status === "pendente" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => handleHabilitacaoAction(hab.id, "approve")}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                  onClick={() => handleHabilitacaoAction(hab.id, "reject")}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />Reprovar
                                </Button>
                              </>
                            )}
                            {hab.status === "certificado" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                onClick={() => handleHabilitacaoAction(hab.id, "revoke")}
                              >
                                <ShieldX className="h-3.5 w-3.5 mr-1" />Revogar
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {habilitacoes.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Nenhuma habilitação registrada para este nômade.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="shrink-0 flex justify-end space-x-2 p-8 pt-4 border-t">
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