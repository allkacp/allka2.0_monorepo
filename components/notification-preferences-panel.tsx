// @ts-nocheck
import { useState } from "react"
import {
  X,
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

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
}

export function NotificationPreferencesPanel({
  open = false,
  onClose,
  embedded = false,
}: NotificationPreferencesPanelProps) {
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [expandedPreference, setExpandedPreference] = useState<string | null>(null)

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
                <h3 className="text-lg font-semibold text-gray-900">Canais de Notificação</h3>
              </div>
              <p className="text-sm text-gray-600">
                Selecione os canais pelos quais os usuários receberão notificações
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-600" />
                    <div>
                      <Label htmlFor="channel-email" className="font-medium cursor-pointer">
                        E-mail
                      </Label>
                      <p className="text-xs text-gray-500">Notificações por e-mail</p>
                    </div>
                  </div>
                  <Switch
                    id="channel-email"
                    checked={channels.email}
                    onCheckedChange={() => handleToggleChannel("email")}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <div>
                      <Label htmlFor="channel-push" className="font-medium cursor-pointer">
                        Push
                      </Label>
                      <p className="text-xs text-gray-500">Notificações push</p>
                    </div>
                  </div>
                  <Switch
                    id="channel-push"
                    checked={channels.push}
                    onCheckedChange={() => handleToggleChannel("push")}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    <div>
                      <Label htmlFor="channel-inApp" className="font-medium cursor-pointer">
                        In-App
                      </Label>
                      <p className="text-xs text-gray-500">Notificações no app</p>
                    </div>
                  </div>
                  <Switch
                    id="channel-inApp"
                    checked={channels.inApp}
                    onCheckedChange={() => handleToggleChannel("inApp")}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-gray-600" />
                    <div>
                      <Label htmlFor="channel-sms" className="font-medium cursor-pointer">
                        SMS
                      </Label>
                      <p className="text-xs text-gray-500">Notificações por SMS</p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tipos de Notificação e Destinatários</h3>
                <p className="text-sm text-gray-600">Configure quem receberá cada tipo de notificação</p>
              </div>

              {Object.entries(groupedPreferences).map(([category, prefs]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getCategoryColor(category)} text-xs font-medium`}>
                      {getCategoryLabel(category)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {prefs.filter((p) => p.enabled).length} de {prefs.length} ativas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {prefs.map((pref) => (
                      <div key={pref.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
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
                              <p className="text-sm text-gray-500 mt-1">{pref.description}</p>
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
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Destinatários</h4>

                              {/* Send to All Toggle */}
                              <div className="flex items-center justify-between p-3 bg-white border rounded-lg mb-3">
                                <div className="flex items-center space-x-2">
                                  <Users className="h-4 w-4 text-gray-600" />
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
                                  <p className="text-xs text-gray-600 mb-2">
                                    Selecione os grupos que receberão esta notificação:
                                  </p>
                                  {userGroups.map((group) => (
                                    <div
                                      key={group.id}
                                      className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
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
                                          <p className="text-xs text-gray-500">{group.description}</p>
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
                  <h3 className="text-lg font-semibold text-gray-900">Regras de Distribuição</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Crie regras para automatizar a distribuição de notificações
                  </p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </div>

              <div className="space-y-3">
                {distributionRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                          <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                            {rule.enabled ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Bell className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-600">
                              {rule.notificationTypes.length} tipo(s) de notificação
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-xs text-gray-600">
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
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Crie Regras Personalizadas</h4>
                <p className="text-sm text-gray-600 mb-4">
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
                  <h3 className="text-lg font-semibold text-gray-900">Grupos de Usuários</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Gerencie grupos para facilitar a distribuição de notificações
                  </p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Grupo
                </Button>
              </div>

              <div className="grid gap-4">
                {userGroups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Users className="h-5 w-5 text-gray-600" />
                          <h4 className="font-semibold text-gray-900">{group.name}</h4>
                          <Badge className={`${group.color} text-xs`}>{group.userCount} usuários</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{group.description}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Organize Seus Usuários</h4>
                <p className="text-sm text-gray-600 mb-4">
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
        <div className="flex items-center justify-between pt-6 border-t">
          <p className="text-sm text-gray-600">
            {preferences.filter((p) => p.enabled).length} de {preferences.length} notificações ativas
          </p>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
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
        className={`fixed top-0 right-0 h-[calc(100vh-32px)] w-[800px] bg-white shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          open ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Preferências de Notificação</h2>
                <p className="text-sm text-gray-600">Configure as notificações e destinatários</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Preferências salvas com sucesso!</span>
            </div>
          )}

          <Tabs defaultValue="notifications" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4">
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
            <TabsContent value="notifications" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0">
              {/* Notification Channels */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Canais de Notificação</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Selecione os canais pelos quais os usuários receberão notificações
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <div>
                        <Label htmlFor="channel-email" className="font-medium cursor-pointer">
                          E-mail
                        </Label>
                        <p className="text-xs text-gray-500">Notificações por e-mail</p>
                      </div>
                    </div>
                    <Switch
                      id="channel-email"
                      checked={channels.email}
                      onCheckedChange={() => handleToggleChannel("email")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-gray-600" />
                      <div>
                        <Label htmlFor="channel-push" className="font-medium cursor-pointer">
                          Push
                        </Label>
                        <p className="text-xs text-gray-500">Notificações push</p>
                      </div>
                    </div>
                    <Switch
                      id="channel-push"
                      checked={channels.push}
                      onCheckedChange={() => handleToggleChannel("push")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5 text-gray-600" />
                      <div>
                        <Label htmlFor="channel-inApp" className="font-medium cursor-pointer">
                          In-App
                        </Label>
                        <p className="text-xs text-gray-500">Notificações no app</p>
                      </div>
                    </div>
                    <Switch
                      id="channel-inApp"
                      checked={channels.inApp}
                      onCheckedChange={() => handleToggleChannel("inApp")}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-gray-600" />
                      <div>
                        <Label htmlFor="channel-sms" className="font-medium cursor-pointer">
                          SMS
                        </Label>
                        <p className="text-xs text-gray-500">Notificações por SMS</p>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Tipos de Notificação e Destinatários</h3>
                  <p className="text-sm text-gray-600">Configure quem receberá cada tipo de notificação</p>
                </div>

                {Object.entries(groupedPreferences).map(([category, prefs]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getCategoryColor(category)} text-xs font-medium`}>
                        {getCategoryLabel(category)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {prefs.filter((p) => p.enabled).length} de {prefs.length} ativas
                      </span>
                    </div>

                    <div className="space-y-2">
                      {prefs.map((pref) => (
                        <div key={pref.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
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
                                <p className="text-sm text-gray-500 mt-1">{pref.description}</p>
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
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Destinatários</h4>

                                {/* Send to All Toggle */}
                                <div className="flex items-center justify-between p-3 bg-white border rounded-lg mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4 text-gray-600" />
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
                                    <p className="text-xs text-gray-600 mb-2">
                                      Selecione os grupos que receberão esta notificação:
                                    </p>
                                    {userGroups.map((group) => (
                                      <div
                                        key={group.id}
                                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
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
                                            <p className="text-xs text-gray-500">{group.description}</p>
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
                    <h3 className="text-lg font-semibold text-gray-900">Regras de Distribuição</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Crie regras para automatizar a distribuição de notificações
                    </p>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nova Regra
                  </Button>
                </div>

                <div className="space-y-3">
                  {distributionRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                            <Badge variant={rule.enabled ? "default" : "secondary"} className="text-xs">
                              {rule.enabled ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Bell className="h-4 w-4 text-gray-500" />
                              <span className="text-xs text-gray-600">
                                {rule.notificationTypes.length} tipo(s) de notificação
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <span className="text-xs text-gray-600">
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
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Crie Regras Personalizadas</h4>
                  <p className="text-sm text-gray-600 mb-4">
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
                    <h3 className="text-lg font-semibold text-gray-900">Grupos de Usuários</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Gerencie grupos para facilitar a distribuição de notificações
                    </p>
                  </div>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Grupo
                  </Button>
                </div>

                <div className="grid gap-4">
                  {userGroups.map((group) => (
                    <div key={group.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Users className="h-5 w-5 text-gray-600" />
                            <h4 className="font-semibold text-gray-900">{group.name}</h4>
                            <Badge className={`${group.color} text-xs`}>{group.userCount} usuários</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{group.description}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">Organize Seus Usuários</h4>
                  <p className="text-sm text-gray-600 mb-4">
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
          <div className="border-t p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {preferences.filter((p) => p.enabled).length} de {preferences.length} notificações ativas
              </p>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={onClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? "Salvando..." : "Salvar Preferências"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
