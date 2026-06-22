// @ts-nocheck
import { useState } from "react"
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Users,
  UserPlus,
  Settings,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  CheckCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface NotifItem {
  id: string
  type: "task" | "system" | "user" | "project" | "approval"
  title: string
  body: string
  date: string
  read: boolean
}

const MOCK_NOTIFICATIONS: NotifItem[] = [
  {
    id: "ni-1",
    type: "task",
    title: "Tarefa aprovada",
    body: "A tarefa 'Campanha Meta – Junho' foi aprovada com sucesso.",
    date: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "ni-2",
    type: "task",
    title: "Nova tarefa para qualificar",
    body: "Você tem uma tarefa aguardando qualificação: 'SEO On-page – Cliente X'.",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: "ni-3",
    type: "system",
    title: "Atualização da plataforma",
    body: "A plataforma foi atualizada para a versão 2.1.0 com melhorias de performance.",
    date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "ni-4",
    type: "task",
    title: "Tarefa devolvida",
    body: "'Google Ads – E-commerce' foi devolvida com observações do líder.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "ni-5",
    type: "task",
    title: "Entrega recebida",
    body: "Carla Souza enviou a entrega da tarefa 'Relatório Performance – Maio'.",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "ni-6",
    type: "user",
    title: "Novo nômade cadastrado",
    body: "João Silva se cadastrou como nômade na área de Performance.",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "ni-7",
    type: "project",
    title: "Novo projeto criado",
    body: "O projeto 'Marketing Digital Q3 – Allka' foi associado à sua área.",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
  {
    id: "ni-8",
    type: "approval",
    title: "Aprovação pendente",
    body: "'Campanha Instagram – Verão' aguarda sua aprovação há 2 dias.",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
]

const NOTIF_ICON_CFG: Record<NotifItem["type"], { Icon: any; bg: string; text: string }> = {
  task: { Icon: CheckCircle2, bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
  system: { Icon: AlertCircle, bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  user: { Icon: UserPlus, bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  project: { Icon: FolderOpen, bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  approval: { Icon: CheckCircle2, bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min > 0 ? min : 1}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d === 1) return "ontem"
  if (d < 7) return `${d} dias atrás`
  return new Date(dateStr).toLocaleDateString("pt-BR")
}

interface NotificationPreference {
  id: string
  label: string
  description: string
  enabled: boolean
  category: "system" | "users" | "projects" | "approvals"
  recipients: {
    userIds: string[]
    groupIds: string[]
    sendToAll: boolean
  }
}

interface UserGroup {
  id: string
  name: string
  description: string
  userCount: number
  color: string
}

interface DistributionRule {
  id: string
  name: string
  description: string
  notificationTypes: string[]
  recipients: {
    userIds: string[]
    groupIds: string[]
  }
  enabled: boolean
}

interface NotificationPreferencesPanelProps {
  open?: boolean
  onClose?: () => void
  embedded?: boolean
  initialTab?: string
}

export function NotificationPreferencesPanel({
  open = false,
  onClose,
  embedded = false,
  initialTab = "inbox",
}: NotificationPreferencesPanelProps) {
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [expandedPreference, setExpandedPreference] = useState<string | null>(null)
  const [readSet, setReadSet] = useState<Set<string>>(
    new Set(MOCK_NOTIFICATIONS.filter((n) => n.read).map((n) => n.id)),
  )
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !readSet.has(n.id)).length

  const [userGroups] = useState<UserGroup[]>([
    {
      id: "admins",
      name: "Administradores",
      description: "Usuários com acesso administrativo",
      userCount: 5,
      color: "bg-red-100 text-red-700",
    },
    {
      id: "managers",
      name: "Gestores",
      description: "Gestores de projetos e equipes",
      userCount: 12,
      color: "bg-blue-100 text-blue-700",
    },
    {
      id: "finance",
      name: "Financeiro",
      description: "Equipe financeira",
      userCount: 8,
      color: "bg-green-100 text-green-700",
    },
    {
      id: "developers",
      name: "Desenvolvedores",
      description: "Equipe de desenvolvimento",
      userCount: 25,
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: "clients",
      name: "Clientes",
      description: "Clientes da plataforma",
      userCount: 150,
      color: "bg-orange-100 text-orange-700",
    },
  ])

  const [distributionRules, setDistributionRules] = useState<DistributionRule[]>([
    {
      id: "rule-1",
      name: "Alertas Críticos para Admins",
      description: "Todos os alertas de sistema vão para administradores",
      notificationTypes: ["system-alerts", "system-security"],
      recipients: { userIds: [], groupIds: ["admins"] },
      enabled: true,
    },
    {
      id: "rule-2",
      name: "Aprovações para Gestores",
      description: "Notificações de aprovação para gestores e financeiro",
      notificationTypes: ["approval-pending", "approval-approved", "approval-rejected"],
      recipients: { userIds: [], groupIds: ["managers", "finance"] },
      enabled: true,
    },
  ])

  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    // System notifications
    {
      id: "system-updates",
      label: "Atualizações do Sistema",
      description: "Notificações sobre atualizações e manutenções",
      enabled: true,
      category: "system",
      recipients: { userIds: [], groupIds: [], sendToAll: true },
    },
    {
      id: "system-alerts",
      label: "Alertas de Sistema",
      description: "Alertas críticos e avisos importantes",
      enabled: true,
      category: "system",
      recipients: { userIds: [], groupIds: ["admins"], sendToAll: false },
    },
    {
      id: "system-security",
      label: "Segurança",
      description: "Notificações sobre segurança e acessos",
      enabled: true,
      category: "system",
      recipients: { userIds: [], groupIds: ["admins"], sendToAll: false },
    },

    // User notifications
    {
      id: "user-new",
      label: "Novos Usuários",
      description: "Quando um novo usuário se cadastra",
      enabled: true,
      category: "users",
      recipients: { userIds: [], groupIds: ["admins", "managers"], sendToAll: false },
    },
    {
      id: "user-login",
      label: "Logins de Usuários",
      description: "Quando usuários fazem login no sistema",
      enabled: false,
      category: "users",
      recipients: { userIds: [], groupIds: [], sendToAll: false },
    },
    {
      id: "user-changes",
      label: "Alterações de Perfil",
      description: "Quando usuários atualizam seus perfis",
      enabled: true,
      category: "users",
      recipients: { userIds: [], groupIds: ["admins"], sendToAll: false },
    },

    // Project notifications
    {
      id: "project-new",
      label: "Novos Projetos",
      description: "Quando novos projetos são criados",
      enabled: true,
      category: "projects",
      recipients: { userIds: [], groupIds: ["managers", "developers"], sendToAll: false },
    },
    {
      id: "project-updates",
      label: "Atualizações de Projetos",
      description: "Quando projetos são atualizados",
      enabled: true,
      category: "projects",
      recipients: { userIds: [], groupIds: [], sendToAll: true },
    },
    {
      id: "project-completed",
      label: "Projetos Concluídos",
      description: "Quando projetos são finalizados",
      enabled: true,
      category: "projects",
      recipients: { userIds: [], groupIds: ["managers", "clients"], sendToAll: false },
    },

    // Approval notifications
    {
      id: "approval-pending",
      label: "Aprovações Pendentes",
      description: "Quando há aprovações aguardando",
      enabled: true,
      category: "approvals",
      recipients: { userIds: [], groupIds: ["managers", "finance"], sendToAll: false },
    },
    {
      id: "approval-approved",
      label: "Aprovações Concedidas",
      description: "Quando aprovações são concedidas",
      enabled: true,
      category: "approvals",
      recipients: { userIds: [], groupIds: ["managers", "finance"], sendToAll: false },
    },
    {
      id: "approval-rejected",
      label: "Aprovações Rejeitadas",
      description: "Quando aprovações são rejeitadas",
      enabled: true,
      category: "approvals",
      recipients: { userIds: [], groupIds: ["managers", "finance"], sendToAll: false },
    },
  ])

  const [channels, setChannels] = useState({
    email: true,
    push: true,
    inApp: true,
    sms: false,
  })

  const handleTogglePreference = (id: string) => {
    setPreferences((prev) => prev.map((pref) => (pref.id === id ? { ...pref, enabled: !pref.enabled } : pref)))
  }

  const handleToggleChannel = (channel: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }))
  }

  const handleToggleSendToAll = (prefId: string) => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.id === prefId
          ? { ...pref, recipients: { ...pref.recipients, sendToAll: !pref.recipients.sendToAll } }
          : pref,
      ),
    )
  }

  const handleToggleGroup = (prefId: string, groupId: string) => {
    setPreferences((prev) =>
      prev.map((pref) => {
        if (pref.id === prefId) {
          const groupIds = pref.recipients.groupIds.includes(groupId)
            ? pref.recipients.groupIds.filter((id) => id !== groupId)
            : [...pref.recipients.groupIds, groupId]
          return { ...pref, recipients: { ...pref.recipients, groupIds } }
        }
        return pref
      }),
    )
  }

  const handleToggleRule = (ruleId: string) => {
    setDistributionRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule)),
    )
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      if (!embedded) {
        onClose()
      }
    }, 1500)
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      system: "Sistema",
      users: "Usuários",
      projects: "Projetos",
      approvals: "Aprovações",
    }
    return labels[category as keyof typeof labels] || category
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      system: "bg-blue-100 text-blue-700",
      users: "bg-green-100 text-green-700",
      projects: "bg-purple-100 text-purple-700",
      approvals: "bg-orange-100 text-orange-700",
    }
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-700"
  }

  const groupedPreferences = preferences.reduce(
    (acc, pref) => {
      if (!acc[pref.category]) {
        acc[pref.category] = []
      }
      acc[pref.category].push(pref)
      return acc
    },
    {} as Record<string, NotificationPreference[]>,
  )

  if (embedded) {
    return (
      <div className="space-y-6">
        {/* Success Message */}
        {showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Preferências salvas com sucesso!</span>
          </div>
        )}

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Regras de Distribuição</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Grupos</span>
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            {/* Notification Channels */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-foreground">Canais de Notificação</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Selecione os canais pelos quais os usuários receberão notificações
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="channel-email" className="font-medium cursor-pointer">
                        E-mail
                      </Label>
                      <p className="text-xs text-muted-foreground">Notificações por e-mail</p>
                    </div>
                  </div>
                  <Switch
                    id="channel-email"
                    checked={channels.email}
                    onCheckedChange={() => handleToggleChannel("email")}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="channel-push" className="font-medium cursor-pointer">
                        Push
                      </Label>
                      <p className="text-xs text-muted-foreground">Notificações push</p>
                    </div>
                  </div>
                  <Switch
                    id="channel-push"
                    checked={channels.push}
                    onCheckedChange={() => handleToggleChannel("push")}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="channel-inApp" className="font-medium cursor-pointer">
                        In-App
                      </Label>
                      <p className="text-xs text-muted-foreground">Notificações no app</p>
                    </div>
                  </div>
                  <Switch
                    id="channel-inApp"
                    checked={channels.inApp}
                    onCheckedChange={() => handleToggleChannel("inApp")}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label htmlFor="channel-sms" className="font-medium cursor-pointer">
                        SMS
                      </Label>
                      <p className="text-xs text-muted-foreground">Notificações por SMS</p>
                    </div>
                  </div>
                  <Switch id="channel-sms" checked={channels.sms} onCheckedChange={() => handleToggleChannel("sms")} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notification Types with Recipients */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Tipos de Notificação e Destinatários</h3>
                <p className="text-sm text-muted-foreground">Configure quem receberá cada tipo de notificação</p>
              </div>

              {Object.entries(groupedPreferences).map(([category, prefs]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getCategoryColor(category)} text-xs font-medium`}>
                      {getCategoryLabel(category)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {prefs.filter((p) => p.enabled).length} de {prefs.length} ativas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {prefs.map((pref) => (
                      <div key={pref.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 hover:bg-accent/40 transition-colors">
                          <div className="flex items-center space-x-3 flex-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setExpandedPreference(expandedPreference === pref.id ? null : pref.id)}
                            >
                              {expandedPreference === pref.id ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="flex-1">
                              <Label htmlFor={pref.id} className="font-medium cursor-pointer">
                                {pref.label}
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">{pref.description}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                {pref.recipients.sendToAll ? (
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    Todos os usuários
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {pref.recipients.groupIds.length} grupo(s)
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Switch
                            id={pref.id}
                            checked={pref.enabled}
                            onCheckedChange={() => handleTogglePreference(pref.id)}
                          />
                        </div>

                        {expandedPreference === pref.id && (
                          <div className="border-t bg-gray-50 p-4 space-y-4">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-3">Destinatários</h4>

                              {/* Send to All Toggle */}
                              <div className="flex items-center justify-between p-3 bg-white border rounded-lg mb-3">
                                <div className="flex items-center space-x-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <Label htmlFor={`${pref.id}-all`} className="font-medium cursor-pointer">
                                    Enviar para todos os usuários
                                  </Label>
                                </div>
                                <Switch
                                  id={`${pref.id}-all`}
                                  checked={pref.recipients.sendToAll}
                                  onCheckedChange={() => handleToggleSendToAll(pref.id)}
                                />
                              </div>

                              {/* Group Selection */}
                              {!pref.recipients.sendToAll && (
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Selecione os grupos que receberão esta notificação:
                                  </p>
                                  {userGroups.map((group) => (
                                    <div
                                      key={group.id}
                                      className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-accent/40 transition-colors"
                                    >
                                      <div className="flex items-center space-x-3">
                                        <Checkbox
                                          id={`${pref.id}-${group.id}`}
                                          checked={pref.recipients.groupIds.includes(group.id)}
                                          onCheckedChange={() => handleToggleGroup(pref.id, group.id)}
                                        />
                                        <div>
                                          <Label
                                            htmlFor={`${pref.id}-${group.id}`}
                                            className="font-medium cursor-pointer"
                                          >
                                            {group.name}
                                          </Label>
                                          <p className="text-xs text-muted-foreground">{group.description}</p>
                                        </div>
                                      </div>
                                      <Badge className={`${group.color} text-xs`}>{group.userCount} usuários</Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Regras de Distribuição</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crie regras para automatizar a distribuição de notificações
                  </p>
                </div>
                <Button size="sm" className="btn-brand">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </div>

              <div className="space-y-3">
                {distributionRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4 hover:bg-accent/40 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-foreground">{rule.name}</h4>
                          <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                            {rule.enabled ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {rule.notificationTypes.length} tipo(s) de notificação
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {rule.recipients.groupIds.length} grupo(s) de destinatários
                            </span>
                          </div>
                        </div>
                      </div>
                      <Switch checked={rule.enabled} onCheckedChange={() => handleToggleRule(rule.id)} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h4 className="font-semibold text-foreground mb-2">Crie Regras Personalizadas</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure regras automáticas para distribuir notificações específicas para grupos de usuários
                </p>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Nova Regra
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Grupos de Usuários</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerencie grupos para facilitar a distribuição de notificações
                  </p>
                </div>
                <Button size="sm" className="btn-brand">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Grupo
                </Button>
              </div>

              <div className="grid gap-4">
                {userGroups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 hover:bg-accent/40 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <h4 className="font-semibold text-foreground">{group.name}</h4>
                          <Badge className={`${group.color} text-xs`}>{group.userCount} usuários</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h4 className="font-semibold text-foreground mb-2">Organize Seus Usuários</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie grupos personalizados para facilitar o gerenciamento de permissões e notificações
                </p>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Novo Grupo
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer for embedded mode */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <p className="text-sm text-muted-foreground">
            {preferences.filter((p) => p.enabled).length} de {preferences.length} notificações ativas
          </p>
          <Button onClick={handleSave} disabled={saving} className="btn-brand">
            {saving ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </div>
    )
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300" onClick={onClose} />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-[calc(100vh-32px)] w-200 bg-white dark:bg-background shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          open ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
        }`}
      >
        <div className="flex flex-col h-full">
          <ModalBrandHeader
            title="Central de Notificações"
            subtitle="Notificações e preferências da plataforma"
            icon={<Bell />}
            onClose={onClose}
          />

          {/* Success Message */}
          {showSuccess && (
            <div className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-300">Preferências salvas com sucesso!</span>
            </div>
          )}

          <Tabs defaultValue={initialTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 shrink-0">
              <TabsTrigger value="inbox" className="flex items-center gap-1.5">
                <Bell className="h-4 w-4" />
                <span>Notificações</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Regras</span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Grupos</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Inbox Tab ─────────────────────────────────────────── */}
            <TabsContent value="inbox" className="flex-1 overflow-y-auto mt-0">
              {/* inbox header */}
              <div className="flex items-center justify-between px-6 py-3 border-b bg-background sticky top-0 z-10">
                <span className="text-sm font-semibold text-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
                    : "Tudo lido"}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() =>
                      setReadSet(new Set(MOCK_NOTIFICATIONS.map((n) => n.id)))
                    }
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* notification list */}
              <div className="divide-y divide-border">
                {MOCK_NOTIFICATIONS.map((n) => {
                  const isRead = readSet.has(n.id)
                  const cfg = NOTIF_ICON_CFG[n.type]
                  return (
                    <button
                      key={n.id}
                      onClick={() =>
                        setReadSet((prev) => new Set([...prev, n.id]))
                      }
                      className={cn(
                        "w-full flex items-start gap-3 px-6 py-4 text-left hover:bg-muted/50 transition-colors",
                        !isRead && "bg-blue-50/60 dark:bg-blue-950/15",
                      )}
                    >
                      {/* unread dot */}
                      <div className="mt-2 shrink-0">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            !isRead ? "bg-blue-500" : "bg-transparent",
                          )}
                        />
                      </div>
                      {/* icon */}
                      <div
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                          cfg.bg,
                        )}
                      >
                        <cfg.Icon className={cn("h-4 w-4", cfg.text)} />
                      </div>
                      {/* text */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            !isRead
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/80",
                          )}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {timeAgo(n.date)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {MOCK_NOTIFICATIONS.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Sem notificações</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Você está em dia!</p>
                </div>
              )}
            </TabsContent>

            {/* ── Preferences Tab (existing content) ────────────────── */}
            <TabsContent value="notifications" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              {/* Notification Channels */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-foreground">Canais de Notificação</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecione os canais pelos quais os usuários receberão notificações
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="channel-email" className="font-medium cursor-pointer">
                          E-mail
                        </Label>
                        <p className="text-xs text-muted-foreground">Notificações por e-mail</p>
                      </div>
                    </div>
                    <Switch
                      id="channel-email"
                      checked={channels.email}
                      onCheckedChange={() => handleToggleChannel("email")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="channel-push" className="font-medium cursor-pointer">
                          Push
                        </Label>
                        <p className="text-xs text-muted-foreground">Notificações push</p>
                      </div>
                    </div>
                    <Switch
                      id="channel-push"
                      checked={channels.push}
                      onCheckedChange={() => handleToggleChannel("push")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="channel-inApp" className="font-medium cursor-pointer">
                          In-App
                        </Label>
                        <p className="text-xs text-muted-foreground">Notificações no app</p>
                      </div>
                    </div>
                    <Switch
                      id="channel-inApp"
                      checked={channels.inApp}
                      onCheckedChange={() => handleToggleChannel("inApp")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="channel-sms" className="font-medium cursor-pointer">
                          SMS
                        </Label>
                        <p className="text-xs text-muted-foreground">Notificações por SMS</p>
                      </div>
                    </div>
                    <Switch
                      id="channel-sms"
                      checked={channels.sms}
                      onCheckedChange={() => handleToggleChannel("sms")}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Types with Recipients */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Tipos de Notificação e Destinatários</h3>
                  <p className="text-sm text-muted-foreground">Configure quem receberá cada tipo de notificação</p>
                </div>

                {Object.entries(groupedPreferences).map(([category, prefs]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getCategoryColor(category)} text-xs font-medium`}>
                        {getCategoryLabel(category)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {prefs.filter((p) => p.enabled).length} de {prefs.length} ativas
                      </span>
                    </div>

                    <div className="space-y-2">
                      {prefs.map((pref) => (
                        <div key={pref.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4 hover:bg-accent/40 transition-colors">
                            <div className="flex items-center space-x-3 flex-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setExpandedPreference(expandedPreference === pref.id ? null : pref.id)}
                              >
                                {expandedPreference === pref.id ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <div className="flex-1">
                                <Label htmlFor={pref.id} className="font-medium cursor-pointer">
                                  {pref.label}
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">{pref.description}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  {pref.recipients.sendToAll ? (
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      Todos os usuários
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      {pref.recipients.groupIds.length} grupo(s)
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Switch
                              id={pref.id}
                              checked={pref.enabled}
                              onCheckedChange={() => handleTogglePreference(pref.id)}
                            />
                          </div>

                          {expandedPreference === pref.id && (
                            <div className="border-t bg-muted/30 p-4 space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3">Destinatários</h4>

                                {/* Send to All Toggle */}
                                <div className="flex items-center justify-between p-3 bg-card border rounded-lg mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <Label htmlFor={`${pref.id}-all`} className="font-medium cursor-pointer">
                                      Enviar para todos os usuários
                                    </Label>
                                  </div>
                                  <Switch
                                    id={`${pref.id}-all`}
                                    checked={pref.recipients.sendToAll}
                                    onCheckedChange={() => handleToggleSendToAll(pref.id)}
                                  />
                                </div>

                                {/* Group Selection */}
                                {!pref.recipients.sendToAll && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Selecione os grupos que receberão esta notificação:
                                    </p>
                                    {userGroups.map((group) => (
                                      <div
                                        key={group.id}
                                        className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/40 transition-colors"
                                      >
                                        <div className="flex items-center space-x-3">
                                          <Checkbox
                                            id={`${pref.id}-${group.id}`}
                                            checked={pref.recipients.groupIds.includes(group.id)}
                                            onCheckedChange={() => handleToggleGroup(pref.id, group.id)}
                                          />
                                          <div>
                                            <Label
                                              htmlFor={`${pref.id}-${group.id}`}
                                              className="font-medium cursor-pointer"
                                            >
                                              {group.name}
                                            </Label>
                                            <p className="text-xs text-muted-foreground">{group.description}</p>
                                          </div>
                                        </div>
                                        <Badge className={`${group.color} text-xs`}>{group.userCount} usuários</Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rules" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Regras de Distribuição</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Crie regras para automatizar a distribuição de notificações
                    </p>
                  </div>
                  <Button size="sm" className="btn-brand">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nova Regra
                  </Button>
                </div>

                <div className="space-y-3">
                  {distributionRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 hover:bg-accent/40 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-foreground">{rule.name}</h4>
                            <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                              {rule.enabled ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Bell className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {rule.notificationTypes.length} tipo(s) de notificação
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {rule.recipients.groupIds.length} grupo(s) de destinatários
                              </span>
                            </div>
                          </div>
                        </div>
                        <Switch checked={rule.enabled} onCheckedChange={() => handleToggleRule(rule.id)} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">Crie Regras Personalizadas</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configure regras automáticas para distribuir notificações específicas para grupos de usuários
                  </p>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Nova Regra
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Grupos de Usuários</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gerencie grupos para facilitar a distribuição de notificações
                    </p>
                  </div>
                  <Button size="sm" className="btn-brand">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Grupo
                  </Button>
                </div>

                <div className="grid gap-4">
                  {userGroups.map((group) => (
                    <div key={group.id} className="border rounded-lg p-4 hover:bg-accent/40 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <h4 className="font-semibold text-foreground">{group.name}</h4>
                            <Badge className={`${group.color} text-xs`}>{group.userCount} usuários</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-semibold text-foreground mb-2">Organize Seus Usuários</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crie grupos personalizados para facilitar o gerenciamento de permissões e notificações
                  </p>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar Novo Grupo
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-background shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="btn-brand">
                {saving ? "Salvando..." : "Salvar Preferências"}
              </Button>
              <p className="text-sm text-muted-foreground ml-2">
                {preferences.filter((p) => p.enabled).length} de {preferences.length} notificações ativas
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
