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
  Sliders,
  Building2,
  Briefcase,
  Users,
  Handshake,
  ChevronDown,
  ChevronUp,
  Check,
  X as XIcon,
  Info,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { NotificationMessageModal } from "@/components/admin/notification-message-modal"
import { NotificationRuleModal } from "@/components/admin/notification-rule-modal"
import { NotificationHistoryModal } from "@/components/admin/notification-history-modal"
import type { NotificationMessage, NotificationRule, NotificationHistory } from "@/types/terms"
import { PageHeader } from "@/components/page-header"

const DEFAULT_PRECONFIGS = {
  agency: {
    email: true, whatsapp: true, inapp: true, push: true,
    events: [
      { id: "welcome", label: "Boas-vindas", email: true, whatsapp: true, inapp: true, push: false, customizable: false },
      { id: "project_created", label: "Novo projeto criado", email: true, whatsapp: false, inapp: true, push: true, customizable: true },
      { id: "task_due", label: "Tarefa próxima do prazo", email: true, whatsapp: true, inapp: true, push: true, customizable: true },
      { id: "task_approved", label: "Tarefa aprovada", email: true, whatsapp: false, inapp: true, push: false, customizable: true },
      { id: "invoice_due", label: "Fatura próxima do vencimento", email: true, whatsapp: true, inapp: true, push: false, customizable: false },
      { id: "level_up", label: "Evolução de nível (Bronze → Prata...)", email: true, whatsapp: true, inapp: true, push: true, customizable: false },
    ],
  },
  company: {
    email: true, whatsapp: false, inapp: true, push: true,
    events: [
      { id: "welcome", label: "Boas-vindas", email: true, whatsapp: false, inapp: true, push: false, customizable: false },
      { id: "project_update", label: "Atualização de projeto", email: true, whatsapp: false, inapp: true, push: true, customizable: true },
      { id: "invoice_created", label: "Nova fatura gerada", email: true, whatsapp: false, inapp: true, push: false, customizable: false },
      { id: "task_review", label: "Tarefa aguardando revisão", email: true, whatsapp: false, inapp: true, push: true, customizable: true },
    ],
  },
  nomad: {
    email: true, whatsapp: true, inapp: true, push: true,
    events: [
      { id: "welcome", label: "Boas-vindas", email: true, whatsapp: true, inapp: true, push: false, customizable: false },
      { id: "task_available", label: "Nova tarefa disponível", email: false, whatsapp: true, inapp: true, push: true, customizable: true },
      { id: "task_approved", label: "Entrega aprovada", email: true, whatsapp: true, inapp: true, push: true, customizable: true },
      { id: "payment_released", label: "Pagamento liberado", email: true, whatsapp: true, inapp: true, push: true, customizable: false },
      { id: "level_up", label: "Evolução de nível", email: true, whatsapp: true, inapp: true, push: true, customizable: false },
    ],
  },
  partner: {
    email: true, whatsapp: false, inapp: true, push: false,
    events: [
      { id: "welcome", label: "Boas-vindas", email: true, whatsapp: false, inapp: true, push: false, customizable: false },
      { id: "agency_signup", label: "Nova agência cadastrada", email: true, whatsapp: false, inapp: true, push: false, customizable: true },
      { id: "commission_released", label: "Comissão liberada", email: true, whatsapp: false, inapp: true, push: false, customizable: false },
    ],
  },
}

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

  // Pré-configurações
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [preconfigs, setPreconfigs] = useState(DEFAULT_PRECONFIGS)

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

  const channelMeta = {
    email:        { label: "E-mail",   color: "#3b82f6", icon: Mail },
    whatsapp:     { label: "WhatsApp", color: "#22c55e", icon: MessageCircle },
    in_app_popup: { label: "In-App",   color: "#8b5cf6", icon: Bell },
    in_app_banner:{ label: "In-App",   color: "#8b5cf6", icon: Bell },
    push:         { label: "Push",     color: "#f59e0b", icon: Bell },
  }

  const typeMeta = {
    agency:  { label: "Agência",  color: "#f97316" },
    company: { label: "Empresa",  color: "#a855f7" },
    nomad:   { label: "Nômade",   color: "#3b82f6" },
    partner: { label: "Parceiro", color: "#22c55e" },
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950">
      {/* ── Header gradient ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-5">
          <PageHeader
            title="Central de Notificações"
            description="Automações, modelos e pré-configurações por tipo de usuário"
            actions={<>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowHistoryModal(true)}>
                <Calendar className="h-3.5 w-3.5" />Histórico
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 btn-brand border-0" onClick={() => setShowMessageModal(true)}>
                <Plus className="h-3.5 w-3.5" />Novo Modelo
              </Button>
            </>}
          />
        </div>

        {/* KPI strip */}
        <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Modelos ativos", value: messages.filter(m => m.is_active).length, total: messages.length, icon: MessageSquare, gradient: "from-blue-500 to-blue-600", light: "bg-blue-50 text-blue-600" },
            { label: "Automações ativas", value: rules.filter(r => r.is_active).length, total: rules.length, icon: Play, gradient: "from-violet-500 to-violet-600", light: "bg-violet-50 text-violet-600" },
            { label: "Enviadas hoje", value: "247", total: "+18%", icon: Send, gradient: "from-emerald-500 to-emerald-600", light: "bg-emerald-50 text-emerald-600" },
            { label: "Taxa de abertura", value: "68%", total: "+5% esta semana", icon: TrendingUp, gradient: "from-amber-500 to-orange-500", light: "bg-amber-50 text-amber-600" },
          ].map(({ label, value, total, icon: Icon, gradient, light }) => (
            <div key={label} className="flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} shrink-0`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{label}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white leading-tight tabular-nums">{value}</p>
                <p className="text-[10px] text-slate-400">{total}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5">
      <Tabs defaultValue="defaults" className="space-y-5">
        <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 h-auto gap-1 rounded-xl">
          <TabsTrigger value="defaults" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2">
            <Sliders className="h-3.5 w-3.5" />Pré-configurações
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2">
            <MessageSquare className="h-3.5 w-3.5" />Modelos
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2">
            <Zap className="h-3.5 w-3.5" />Automações
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-sm px-4 py-2">
            <TrendingUp className="h-3.5 w-3.5" />Análises
          </TabsTrigger>
        </TabsList>

        {/* ── PRÉ-CONFIGURAÇÕES ─────────────────────────────────────────── */}
        <TabsContent value="defaults" className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Pré-configurações por Tipo de Usuário</h2>
              <p className="text-xs text-slate-400 mt-0.5">Defina quais notificações cada tipo de usuário recebe por padrão. Usuários ajustam apenas os eventos marcados como <span className="text-blue-500 font-medium">Personalizável</span>.</p>
            </div>
          </div>
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-3">
              {(() => {
                const userTypes = [
                  { key: "agency",  label: "Agência",   icon: Building2,  color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" },
                  { key: "company", label: "Empresa",   icon: Briefcase,  color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" },
                  { key: "nomad",   label: "Nômade",    icon: Users,      color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-200" },
                  { key: "partner", label: "Parceiro",  icon: Handshake,  color: "text-emerald-500",bg: "bg-emerald-50",border: "border-emerald-200" },
                ]
                const channels = [
                  { key: "email",    label: "E-mail",   color: "#3b82f6" },
                  { key: "whatsapp", label: "WhatsApp", color: "#22c55e" },
                  { key: "inapp",    label: "In-App",   color: "#8b5cf6" },
                  { key: "push",     label: "Push",     color: "#f59e0b" },
                ]
                const toggleChannel = (type: string, channel: string) =>
                  setPreconfigs(prev => ({ ...prev, [type]: { ...prev[type], [channel]: !prev[type][channel] } }))
                const toggleEvent = (type: string, eventId: string, channel: string) =>
                  setPreconfigs(prev => ({
                    ...prev,
                    [type]: { ...prev[type], events: prev[type].events.map(e => e.id === eventId ? { ...e, [channel]: !e[channel] } : e) }
                  }))

                return userTypes.map(({ key, label, icon: Icon, color, bg, border }) => {
                  const cfg = preconfigs[key]
                  const isExpanded = expandedType === key
                  const enabledChannels = channels.filter(c => cfg[c.key])
                  return (
                    <div key={key} className={`rounded-xl border ${border} overflow-hidden`}>
                      <button onClick={() => setExpandedType(isExpanded ? null : key)}
                        className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-slate-50/60 transition-colors text-left">
                        <div className={`p-2 rounded-lg ${bg} shrink-0`}><Icon className={`h-4 w-4 ${color}`} /></div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{cfg.events.length} eventos · canais ativos: {enabledChannels.map(c => c.label).join(", ") || "nenhum"}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {channels.map(c => (
                            <button key={c.key} onClick={e => { e.stopPropagation(); toggleChannel(key, c.key) }}
                              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                              style={cfg[c.key] ? { borderColor: c.color + "55", background: c.color + "15", color: c.color } : { borderColor: "#e2e8f0", color: "#94a3b8" }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", display: "inline-block", background: cfg[c.key] ? c.color : "#cbd5e1" }} />
                              {c.label}
                            </button>
                          ))}
                        </div>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                      </button>
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/40">
                          <div className="px-5 py-3 flex items-center gap-2">
                            <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <p className="text-[11px] text-slate-400">Eventos marcados como <strong>Fixo</strong> não podem ser alterados pelo usuário. <strong>Personalizável</strong> = o usuário pode ligar/desligar nas próprias configurações.</p>
                          </div>
                          <div className="overflow-x-auto"><table className="w-full text-xs min-w-[600px]">
                            <thead>
                              <tr className="border-t border-slate-100">
                                <th className="text-left px-5 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-1/2">Evento</th>
                                {channels.map(c => <th key={c.key} className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.color }}>{c.label}</th>)}
                                <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Usuário pode editar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {cfg.events.map(ev => (
                                <tr key={ev.id} className="bg-white hover:bg-slate-50/50">
                                  <td className="px-5 py-2.5 font-medium text-slate-700">{ev.label}</td>
                                  {channels.map(c => (
                                    <td key={c.key} className="px-3 py-2.5 text-center">
                                      <button onClick={() => toggleEvent(key, ev.id, c.key)}>
                                        {ev[c.key] ? <Check className="h-4 w-4 mx-auto" style={{ color: c.color }} /> : <XIcon className="h-3.5 w-3.5 mx-auto text-slate-200" />}
                                      </button>
                                    </td>
                                  ))}
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${ev.customizable ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                                      {ev.customizable ? "Sim" : "Fixo"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table></div>
                          <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
                            <Button size="sm" className="h-7 text-xs btn-brand border-0">Salvar alterações</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MODELOS ───────────────────────────────────────────────────────── */}
        <TabsContent value="messages" className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Modelos de Mensagem</h2>
              <p className="text-xs text-slate-400 mt-0.5">Mensagens reutilizáveis com variáveis dinâmicas por canal</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs w-52" />
              </div>
              <Button size="sm" className="h-8 text-xs gap-1.5 btn-brand border-0" onClick={() => setShowMessageModal(true)}>
                <Plus className="h-3.5 w-3.5" />Novo Modelo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {messages.filter(m => !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.title.toLowerCase().includes(searchTerm.toLowerCase())).map(message => (
              <div key={message.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className={`p-2 rounded-xl shrink-0 ${message.message_type === "html" ? "bg-blue-50" : "bg-slate-100"}`}>
                  <MessageSquare className={`h-4 w-4 ${message.message_type === "html" ? "text-blue-500" : "text-slate-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{message.name}</p>
                    <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${message.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {message.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{message.message_type.toUpperCase()}</span>
                    {message.has_images && <span className="text-[10px] bg-indigo-50 text-indigo-500 font-semibold px-1.5 py-0.5 rounded">IMG</span>}
                    {message.has_videos && <span className="text-[10px] bg-red-50 text-red-500 font-semibold px-1.5 py-0.5 rounded">VID</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{message.title}</p>
                </div>
                <p className="text-[11px] text-slate-400 shrink-0">{new Date(message.created_at).toLocaleDateString("pt-BR")}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-7 w-7 p-0 shrink-0 rounded-lg"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelectedMessage(message); setShowMessageModal(true) }}><Edit className="mr-2 h-3.5 w-3.5" />Editar</DropdownMenuItem>
                    <DropdownMenuItem><Send className="mr-2 h-3.5 w-3.5" />Enviar Teste</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-3.5 w-3.5" />Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-12 flex flex-col items-center gap-3 text-slate-400">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm">Nenhum modelo criado</p>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowMessageModal(true)}>Criar primeiro modelo</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── AUTOMAÇÕES ────────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-4 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Automações de Disparo</h2>
              <p className="text-xs text-slate-400 mt-0.5">Gerenciadas pelo admin — usuários recebem conforme pré-configurações</p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5 btn-brand border-0" onClick={() => setShowRuleModal(true)}>
              <Plus className="h-3.5 w-3.5" />Nova Automação
            </Button>
          </div>

          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>Somente o admin controla estas automações.</strong> Usuários não visualizam nem editam regras — recebem notificações conforme as pré-configurações da aba anterior.
            </p>
          </div>

          <div className="space-y-2">
            {rules.map(rule => {
              const message = messages.find(m => m.id === rule.message_id)
              const enabledChannels = rule.channels.filter(c => c.is_enabled)
              return (
                <div key={rule.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                  {/* Status toggle */}
                  <button onClick={() => setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))}
                    className={`p-2 rounded-xl shrink-0 transition-colors ${rule.is_active ? "bg-violet-100 hover:bg-violet-200" : "bg-slate-100 hover:bg-slate-200"}`}>
                    {rule.is_active ? <Play className="h-4 w-4 text-violet-600" /> : <Pause className="h-4 w-4 text-slate-400" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{rule.name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${rule.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                        {rule.is_active ? "Ativa" : "Pausada"}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{rule.trigger_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {message && <p className="text-xs text-slate-400 truncate">Modelo: <span className="text-slate-600 dark:text-slate-300">{message.name}</span></p>}
                      <div className="flex gap-1">
                        {rule.target_account_types.map(t => (
                          <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
                            style={{ borderColor: (typeMeta[t]?.color ?? "#94a3b8") + "55", color: typeMeta[t]?.color ?? "#94a3b8", background: (typeMeta[t]?.color ?? "#94a3b8") + "15" }}>
                            {typeMeta[t]?.label ?? t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Channel pills */}
                  <div className="flex gap-1 shrink-0">
                    {enabledChannels.map(c => {
                      const meta = channelMeta[c.type] ?? { label: c.type, color: "#94a3b8", icon: Bell }
                      const CIcon = meta.icon
                      return (
                        <span key={c.type} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: meta.color + "15", color: meta.color }}>
                          <CIcon className="h-3 w-3" />{meta.label}
                        </span>
                      )
                    })}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-7 w-7 p-0 shrink-0 rounded-lg"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedRule(rule); setShowRuleModal(true) }}><Edit className="mr-2 h-3.5 w-3.5" />Editar</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600"><Trash2 className="mr-2 h-3.5 w-3.5" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
            {rules.length === 0 && (
              <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-12 flex flex-col items-center gap-3 text-slate-400">
                <Zap className="h-8 w-8" />
                <p className="text-sm">Nenhuma automação criada</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── ANÁLISES ──────────────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="space-y-4 pb-6">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Performance de Envios</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Canal performance */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Performance por Canal</p>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: "E-mail", rate: 68, rateLabel: "68% abertura", sent: "1.247 enviados", color: "#3b82f6" },
                  { icon: MessageCircle, label: "WhatsApp", rate: 89, rateLabel: "89% entrega", sent: "456 enviados", color: "#22c55e" },
                  { icon: Bell, label: "In-App", rate: 92, rateLabel: "92% visualização", sent: "789 enviados", color: "#8b5cf6" },
                  { icon: Bell, label: "Push", rate: 54, rateLabel: "54% abertura", sent: "312 enviados", color: "#f59e0b" },
                ].map(({ icon: Icon, label, rate, rateLabel, sent, color }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" style={{ color }} />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{rateLabel}</span>
                        <span className="text-[10px] text-slate-400 ml-2">{sent}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top messages */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Modelos Mais Enviados</p>
              <div className="space-y-3">
                {(messages.length > 0 ? messages : [{ id: "x1", name: "Boas-vindas Agência", title: "Bem-vindo à Allka!", sends: 892 }, { id: "x2", name: "Projeto Atrasado", title: "Atenção: Projeto com atraso", sends: 341 }]).slice(0, 4).map((message, index) => (
                  <div key={message.id} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-500 shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{message.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{message.title}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums shrink-0">{(message as any).sends ?? Math.floor(Math.random() * 500 + 100)}</span>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Total hoje", value: "247" },
                  { label: "Esta semana", value: "1.842" },
                  { label: "Este mês", value: "8.341" },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums">{value}</p>
                    <p className="text-[10px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>

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
