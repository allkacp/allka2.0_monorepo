// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Send,
  Trash2,
  MessageSquare,
  Calendar,
  TrendingUp,
  Mail,
  MessageCircle,
  Bell,
  Play,
  Pause,
} from "lucide-react"
import { NotificationMessageModal } from "@/components/admin/notification-message-modal"
import { NotificationRuleModal } from "@/components/admin/notification-rule-modal"
import { NotificationHistoryModal } from "@/components/admin/notification-history-modal"
import type { NotificationMessage, NotificationRule, NotificationHistory } from "@/types/terms"

export default function NotificationsManagementPage() {
  const [messages, setMessages] = useState<NotificationMessage[]>([])
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [history, setHistory] = useState<NotificationHistory[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMessage, setSelectedMessage] = useState<NotificationMessage | null>(null)
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mock data - replace with API calls
  const mockMessages: NotificationMessage[] = [
    {
      id: "msg-1",
      name: "Boas-vindas Agência",
      title: "Bem-vindo à Allka!",
      content: "Olá {user_name}, seja bem-vindo à plataforma Allka...",
      message_type: "html",
      has_images: true,
      has_videos: false,
      is_active: true,
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-20T14:30:00Z",
      created_by: "admin-1",
      attachments: [],
    },
    {
      id: "msg-2",
      name: "Projeto Atrasado",
      title: "Atenção: Projeto com atraso",
      content: "Seu projeto {project_name} está com {delay_days} dias de atraso...",
      message_type: "text",
      has_images: false,
      has_videos: false,
      is_active: true,
      created_at: "2024-01-18T09:00:00Z",
      updated_at: "2024-01-18T09:00:00Z",
      created_by: "admin-2",
      attachments: [],
    },
  ]

  const mockRules: NotificationRule[] = [
    {
      id: "rule-1",
      message_id: "msg-1",
      name: "Boas-vindas Automático",
      is_active: true,
      target_account_types: ["agency"],
      target_account_levels: [],
      target_project_status: [],
      target_custom_filters: {},
      channels: [
        { type: "email", is_enabled: true, config: {} },
        { type: "in_app_popup", is_enabled: true, config: {} },
      ],
      trigger_type: "event",
      trigger_config: { event: "account_created" },
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
      created_by: "admin-1",
    },
    {
      id: "rule-2",
      message_id: "msg-2",
      name: "Alerta Projeto Atrasado",
      is_active: true,
      target_account_types: ["agency"],
      target_account_levels: [],
      target_project_status: ["em_andamento"],
      target_custom_filters: {},
      channels: [
        { type: "email", is_enabled: true, config: {} },
        { type: "whatsapp", is_enabled: true, config: {} },
      ],
      trigger_type: "conditional",
      trigger_config: { condition: "project_overdue", days: 3 },
      created_at: "2024-01-18T09:00:00Z",
      updated_at: "2024-01-18T09:00:00Z",
      created_by: "admin-2",
    },
  ]

  const mockHistory: NotificationHistory[] = [
    {
      id: "hist-1",
      rule_id: "rule-1",
      message_id: "msg-1",
      recipient_id: "agency-123",
      recipient_name: "João Silva",
      recipient_email: "joao@empresa.com",
      channel: "email",
      status: "delivered",
      sent_at: "2024-01-20T10:30:00Z",
      delivered_at: "2024-01-20T10:31:00Z",
      opened_at: "2024-01-20T11:15:00Z",
      metadata: {},
    },
  ]

  useEffect(() => {
    // Simulate API calls
    setTimeout(() => {
      setMessages(mockMessages)
      setRules(mockRules)
      setHistory(mockHistory)
      setLoading(false)
    }, 1000)
  }, [])

  const getChannelIcon = (channel: string) => {
    const icons = {
      email: Mail,
      whatsapp: MessageCircle,
      in_app_popup: Bell,
      in_app_banner: Bell,
      push: Bell,
    }
    const Icon = icons[channel as keyof typeof icons] || Bell
    return <Icon className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    const colors = {
      sent: "bg-blue-100 text-blue-800",
      delivered: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      opened: "bg-purple-100 text-purple-800",
      clicked: "bg-orange-100 text-orange-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Módulo de Notificações</h1>
          <p className="text-muted-foreground">Central de automação de comunicação da Allka</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowHistoryModal(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button onClick={() => setShowMessageModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Mensagem
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Ativas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messages.filter((m) => m.is_active).length}</div>
            <p className="text-xs text-muted-foreground">{messages.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.filter((r) => r.is_active).length}</div>
            <p className="text-xs text-muted-foreground">{rules.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas Hoje</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">+18% vs ontem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">+5% vs semana passada</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="rules">Regras de Disparo</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens Cadastradas</CardTitle>
              <CardDescription>Gerencie todas as mensagens disponíveis para envio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar mensagens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mídia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{message.name}</TableCell>
                      <TableCell>{message.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{message.message_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {message.has_images && (
                            <Badge variant="secondary" className="text-xs">
                              IMG
                            </Badge>
                          )}
                          {message.has_videos && (
                            <Badge variant="secondary" className="text-xs">
                              VID
                            </Badge>
                          )}
                          {!message.has_images && !message.has_videos && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={message.is_active ? "default" : "secondary"}>
                          {message.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(message.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMessage(message)
                                setShowMessageModal(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar Teste
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Regras de Disparo</CardTitle>
                  <CardDescription>Configure quando e para quem as mensagens devem ser enviadas</CardDescription>
                </div>
                <Button onClick={() => setShowRuleModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Público-Alvo</TableHead>
                    <TableHead>Canais</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => {
                    const message = messages.find((m) => m.id === rule.message_id)
                    return (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{message?.name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {rule.target_account_types.map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {rule.channels
                              .filter((c) => c.is_enabled)
                              .map((channel) => (
                                <div key={channel.type} className="flex items-center">
                                  {getChannelIcon(channel.type)}
                                </div>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.trigger_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant={rule.is_active ? "default" : "secondary"}>
                              {rule.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Toggle rule status
                                const updatedRules = rules.map((r) =>
                                  r.id === rule.id ? { ...r, is_active: !r.is_active } : r,
                                )
                                setRules(updatedRules)
                              }}
                            >
                              {rule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRule(rule)
                                  setShowRuleModal(true)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">68% abertura</div>
                      <div className="text-sm text-muted-foreground">1,247 enviados</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">89% entrega</div>
                      <div className="text-sm text-muted-foreground">456 enviados</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <span>In-App</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">92% visualização</div>
                      <div className="text-sm text-muted-foreground">789 enviados</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagens Mais Enviadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.slice(0, 3).map((message, index) => (
                    <div key={message.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{message.name}</div>
                        <div className="text-sm text-muted-foreground">{message.title}</div>
                      </div>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <NotificationMessageModal
        open={showMessageModal}
        onOpenChange={setShowMessageModal}
        message={selectedMessage}
        onSave={(messageData) => {
          if (selectedMessage) {
            // Edit existing message
            const updatedMessages = messages.map((m) => (m.id === selectedMessage.id ? { ...m, ...messageData } : m))
            setMessages(updatedMessages)
          } else {
            // Create new message
            const newMessage: NotificationMessage = {
              id: `msg-${Date.now()}`,
              ...messageData,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: "current-admin",
              attachments: [],
            } as NotificationMessage
            setMessages([...messages, newMessage])
          }
          setSelectedMessage(null)
          setShowMessageModal(false)
        }}
      />

      <NotificationRuleModal
        open={showRuleModal}
        onOpenChange={setShowRuleModal}
        rule={selectedRule}
        messages={messages}
        onSave={(ruleData) => {
          if (selectedRule) {
            // Edit existing rule
            const updatedRules = rules.map((r) => (r.id === selectedRule.id ? { ...r, ...ruleData } : r))
            setRules(updatedRules)
          } else {
            // Create new rule
            const newRule: NotificationRule = {
              id: `rule-${Date.now()}`,
              ...ruleData,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by: "current-admin",
            } as NotificationRule
            setRules([...rules, newRule])
          }
          setSelectedRule(null)
          setShowRuleModal(false)
        }}
      />

      <NotificationHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        history={history}
        messages={messages}
        rules={rules}
      />
    </div>
  )
}
