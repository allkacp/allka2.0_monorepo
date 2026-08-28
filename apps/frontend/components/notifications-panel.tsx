// Lote de correção visual (ata 2026-08, revisão do responsável) — extraído
// de notification-preferences-panel.tsx (agora removido). O painel
// combinado tinha uma aba "Alertas" misturada com Notificações no mesmo
// componente/painel; o responsável rejeitou isso explicitamente ("os dois
// acionadores abrem o mesmo painel/modal, apenas mudando a aba"). Este
// componente é EXCLUSIVO de notificações: fonte de dados, loading, erro,
// filtros e configurações próprios, sem nenhuma aba pra Alertas (ver
// alerts-panel.tsx pro painel irmão, de verdade separado).
import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useChat } from "@/contexts/chat-context"
import {
  Bell, Mail, MessageSquare, Smartphone,
  Settings, CheckCheck, Info, Plus,
  Users, Edit, Trash2, Archive, ArchiveRestore,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeaderSlideScreen } from "@/components/header-slide-screen"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { NotificationGroupRequestModal } from "@/components/modals/notification-group-request-modal"
import { apiClient } from "@/lib/api-client"
import { alertIcon } from "@/components/alerts-header-icon"
import { cn } from "@/lib/utils"

/* ─── Catálogo de tipos de evento (fixo, usado pela aba Preferências —
   NotificationPreference é a tabela real por trás dela). Exclusivo de
   Notificações — nenhum item aqui é sobre criticidade/alerta. ──────────── */
const PREF_GROUPS = [
  { key: "tarefas",   label: "Tarefas",    color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500",
    items: [
      { id: "task-assigned", label: "Tarefa atribuída",       desc: "Quando uma tarefa é atribuída a mim" },
      { id: "task-approved", label: "Tarefa aprovada",         desc: "Quando minha entrega é aprovada" },
      { id: "task-returned", label: "Tarefa devolvida",        desc: "Entrega devolvida com observações" },
      { id: "task-due",      label: "Prazo se aproximando",    desc: "24h antes do vencimento" },
    ]},
  { key: "projetos",  label: "Projetos",   color: "bg-violet-50 text-violet-700",  dot: "bg-violet-500",
    items: [
      { id: "proj-new",    label: "Novo projeto",              desc: "Projeto criado para minha agência" },
      { id: "proj-update", label: "Atualização de projeto",    desc: "Mudança de status no projeto" },
    ]},
  { key: "financeiro",label: "Financeiro", color: "bg-blue-50 text-blue-700",      dot: "bg-blue-500",
    items: [
      { id: "inv-due",  label: "Fatura próxima do vencimento", desc: "3 dias antes do vencimento" },
      { id: "inv-paid", label: "Pagamento confirmado",          desc: "Quando pagamento é registrado" },
    ]},
  { key: "sistema",   label: "Sistema",    color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400",
    items: [
      { id: "sys-update", label: "Atualizações da plataforma", desc: "Novidades e manutenções" },
      { id: "sys-level",  label: "Evolução de nível",          desc: "Quando sua agência sobe de nível" },
    ]},
]

interface PrefGovernanceEntry {
  standard_name: string
  mandatory: boolean
  personal_prefs_allowed: boolean
  locked_channels: string[]
  toggleable_channels: string[]
  min_severity: string | null
  reason: string
}

type PrefChannel = "email" | "whatsapp" | "push"
const PREF_CHANNELS: { key: PrefChannel; label: string; Icon: typeof Mail; color: string }[] = [
  { key: "email", label: "E-mail", Icon: Mail, color: "#3b82f6" },
  { key: "whatsapp", label: "WhatsApp", Icon: MessageSquare, color: "#22c55e" },
  { key: "push", label: "Push", Icon: Smartphone, color: "#8b5cf6" },
]

function prefsKey(eventType: string, channel: string) {
  return `${eventType}:${channel}`
}

interface SystemAlertItem {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  is_read: boolean
}

interface GroupSummary {
  id: string
  name: string
  description: string | null
  purpose?: string | null
  member_count: number
  created_at: string
  status?: string
  requested_by_id?: string | null
  rejection_reason?: string | null
  conversation_id?: string | null
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

/* ─── Component ──────────────────────────────────────────────────────────── */
interface NotificationsPanelProps {
  open?: boolean
  onClose?: () => void
  initialTab?: "inbox" | "prefs" | "groups"
}

export function NotificationsPanel({
  open = false, onClose, initialTab = "inbox",
}: NotificationsPanelProps) {
  const location = useLocation()

  // Tabs controlado: o gatilho "Configurações" no menu do usuário precisa
  // conseguir abrir sempre na aba "prefs" mesmo que o painel já esteja
  // aberto em "inbox" — com defaultValue isso só valia no primeiro mount.
  const [activeTab, setActiveTab] = useState(initialTab)
  useEffect(() => {
    if (open) setActiveTab(initialTab)
  }, [open, initialTab])

  /* ── Inbox — SystemAlert filtrado por category="notificacao". ──────────── */
  const [alerts, setAlerts] = useState<SystemAlertItem[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const unreadCount = alerts.filter((a) => !a.is_read).length

  // Filtros + paginação server-side (ata 2026-08, bloco 2/5). Escopo pessoal
  // — nunca mistura com Alertas (category="notificacao" sempre).
  const [nq, setNq] = useState("")
  const [nFrom, setNFrom] = useState("")
  const [nTo, setNTo] = useState("")
  const [nRead, setNRead] = useState<"" | "true" | "false">("")
  const [nPage, setNPage] = useState(1)
  const [nTotalPages, setNTotalPages] = useState(1)
  const [nTotal, setNTotal] = useState(0)
  const nFiltersActive = !!(nq.trim() || nFrom || nTo || nRead)
  const clearNFilters = () => { setNq(""); setNFrom(""); setNTo(""); setNRead(""); setNPage(1) }

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true)
    setAlertsError(false)
    try {
      const res: any = await apiClient.getSystemAlerts({
        category: "notificacao",
        is_archived: showArchived ? "true" : "false",
        ...(nq.trim() ? { q: nq.trim() } : {}),
        ...(nFrom ? { date_from: nFrom } : {}),
        ...(nTo ? { date_to: nTo } : {}),
        ...(nRead ? { is_read: nRead } : {}),
        page: nPage,
        page_size: 30,
      })
      setAlerts(res?.data ?? [])
      setNTotalPages(res?.total_pages ?? 1)
      setNTotal(res?.total ?? 0)
    } catch {
      setAlerts([])
      setAlertsError(true)
    } finally {
      setAlertsLoading(false)
    }
  }, [showArchived, nq, nFrom, nTo, nRead, nPage])

  useEffect(() => {
    if (open) void fetchAlerts()
  }, [open, fetchAlerts])

  // Voltar pra página 1 quando um filtro muda (evita "página 3 vazia").
  useEffect(() => { setNPage(1) }, [nq, nFrom, nTo, nRead, showArchived])

  async function markRead(id: string) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)))
    try {
      await apiClient.markSystemAlertRead(id)
    } catch {}
  }

  async function markAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })))
    try {
      await apiClient.markAllSystemAlertsRead({ category: "notificacao" })
    } catch {}
  }

  async function toggleArchive(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    try {
      if (showArchived) await apiClient.unarchiveSystemAlert(id)
      else await apiClient.archiveSystemAlert(id)
    } catch {
      void fetchAlerts()
    }
  }

  /* ── Preferências — tabela real NotificationPreference. ─────────────────── */
  const [prefsMap, setPrefsMap] = useState<Map<string, boolean>>(new Map())
  // Governança do Admin Master (ata 2026-08, bloco 2/5): event_types de
  // padrões obrigatórios com canais travados + motivo pra UI explicar.
  const [prefsGovernance, setPrefsGovernance] = useState<Record<string, PrefGovernanceEntry>>({})

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await apiClient.getNotificationPreferences()
      const map = new Map<string, boolean>()
      for (const row of res?.data ?? []) map.set(prefsKey(row.event_type, row.channel), row.enabled)
      setPrefsMap(map)
      setPrefsGovernance(((res as any)?.governance ?? {}) as Record<string, PrefGovernanceEntry>)
    } catch {}
  }, [])

  useEffect(() => {
    if (open) void fetchPreferences()
  }, [open, fetchPreferences])

  // "in_app" nunca aparece na tabela como desligável — sempre true. Os
  // demais, sem linha salva ainda = nunca foram ligados (nunca inferir "on"
  // por padrão pra um canal que nunca disparou de verdade).
  function isChannelEnabled(eventType: string, channel: PrefChannel): boolean {
    return prefsMap.get(prefsKey(eventType, channel)) ?? false
  }

  async function setChannel(eventType: string, channel: PrefChannel, enabled: boolean) {
    setPrefsMap((prev) => new Map(prev).set(prefsKey(eventType, channel), enabled))
    try {
      await apiClient.updateNotificationPreference(eventType, { [channel]: enabled })
    } catch {
      setPrefsMap((prev) => new Map(prev).set(prefsKey(eventType, channel), !enabled))
    }
  }

  /* ── Grupos (ciclo de aprovação — ata 2026-08, bloco 3/5) ──────────── */
  const navigate = useNavigate()
  const { openChat, openRoom } = useChat()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [groupsRole, setGroupsRole] = useState<"master" | "leader" | "other">("other")
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<GroupSummary | null>(null)

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const res = await apiClient.getNotificationGroupsList()
      setGroups((res?.data ?? []) as GroupSummary[])
      setGroupsRole(res?.role ?? "other")
    } catch {
      setGroups([])
    } finally {
      setGroupsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void fetchGroups()
  }, [open, fetchGroups])

  function openGroupChat(g: GroupSummary) {
    if (!g.conversation_id) return
    openChat()
    openRoom(g.conversation_id)
  }

  async function confirmCancelRequest() {
    if (!cancelTarget) return
    try {
      await apiClient.cancelNotificationGroupRequest(cancelTarget.id)
    } finally {
      setCancelTarget(null)
      await fetchGroups()
    }
  }

  return (
    <>
      <HeaderSlideScreen
        open={open}
        onClose={onClose}
        title="Notificações"
        subtitle="Eventos da plataforma e suas preferências"
        pin={{
          id: "global-notificacoes",
          label: "Notificações",
          icon: Bell,
          path: location.pathname,
          activateKey: "open-notificacoes",
        }}
      >
        <div className="flex flex-col flex-1 min-h-0 w-full">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 min-h-0 flex flex-col">
            <div className="px-5 pt-4 pb-1 shrink-0">
              {/* Sem aba "Alertas" aqui de propósito — nunca deve ser possível
                  trocar de Notificações pra Alertas dentro deste painel. Sem
                  aba "Regras" também (removida antes por redundância com
                  Preferências — não volta). */}
              <TabsList className="w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-auto gap-1">
                <TabsTrigger value="inbox"
                  className="flex-1 gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm py-2">
                  <Bell className="h-3.5 w-3.5" />
                  Notificações
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="prefs"
                  className="flex-1 gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm py-2">
                  <Settings className="h-3.5 w-3.5" />Preferências
                </TabsTrigger>
                <TabsTrigger value="groups"
                  className="flex-1 gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm py-2">
                  <Users className="h-3.5 w-3.5" />Grupos
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="inbox" className="flex-1 min-h-0 overflow-y-auto mt-0">
              <InboxTab
                alerts={alerts}
                loading={alertsLoading}
                error={alertsError}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                markRead={markRead}
                markAllRead={markAllRead}
                toggleArchive={toggleArchive}
                filterProps={{
                  q: nq, setQ: setNq,
                  from: nFrom, setFrom: setNFrom,
                  to: nTo, setTo: setNTo,
                  read: nRead, setRead: setNRead,
                  active: nFiltersActive, clear: clearNFilters,
                  page: nPage, totalPages: nTotalPages, total: nTotal, setPage: setNPage,
                }}
              />
            </TabsContent>

            <TabsContent value="prefs" className="flex-1 min-h-0 overflow-y-auto mt-0">
              <PrefsTab isChannelEnabled={isChannelEnabled} setChannel={setChannel} governance={prefsGovernance} />
            </TabsContent>

            <TabsContent value="groups" className="flex-1 min-h-0 overflow-y-auto mt-0">
              <GroupsTab
                groups={groups}
                role={groupsRole}
                loading={groupsLoading}
                onRequest={() => setRequestModalOpen(true)}
                onOpenAdmin={() => navigate("/admin/grupos-notificacao")}
                onCancelRequest={setCancelTarget}
                onOpenChat={openGroupChat}
              />
            </TabsContent>
          </Tabs>
        </div>
      </HeaderSlideScreen>
      <NotificationGroupRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequested={() => void fetchGroups()}
      />
      <ConfirmationDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancelRequest()}
        title={`Cancelar solicitação "${cancelTarget?.name ?? ""}"`}
        message="A solicitação sai da fila do Admin Master. Você pode solicitar de novo depois."
        confirmText="Cancelar solicitação"
        destructive
      />
    </>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

interface InboxFilterProps {
  q: string; setQ: (v: string) => void
  from: string; setFrom: (v: string) => void
  to: string; setTo: (v: string) => void
  read: "" | "true" | "false"; setRead: (v: "" | "true" | "false") => void
  active: boolean; clear: () => void
  page: number; totalPages: number; total: number; setPage: (v: number) => void
}

function InboxTab({
  alerts, loading, error, showArchived, setShowArchived, markRead, markAllRead, toggleArchive, filterProps,
}: {
  alerts: SystemAlertItem[]
  loading: boolean
  error: boolean
  showArchived: boolean
  setShowArchived: (v: boolean) => void
  markRead: (id: string) => void
  markAllRead: () => void
  toggleArchive: (id: string) => void
  filterProps: InboxFilterProps
}) {
  const unreadCount = alerts.filter((n) => !n.is_read).length
  const f = filterProps
  const inputCls = "h-8 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-slate-700 dark:text-slate-200"
  return (
    <div>
      <div className="flex items-center gap-1.5 px-5 pt-3">
        <Button size="sm" variant={showArchived ? "ghost" : "secondary"} className="h-7 text-xs px-2.5" onClick={() => setShowArchived(false)}>
          Ativos
        </Button>
        <Button size="sm" variant={showArchived ? "secondary" : "ghost"} className="h-7 text-xs px-2.5 gap-1" onClick={() => setShowArchived(true)}>
          <Archive className="h-3 w-3" />
          Arquivados
        </Button>
      </div>

      {/* Filtros — busca / data / lida-não lida. Server-side, antes da paginação. */}
      <div className="flex flex-wrap items-end gap-2 px-5 pt-2.5">
        <input
          type="search"
          aria-label="Buscar notificações"
          placeholder="Buscar..."
          value={f.q}
          onChange={(e) => f.setQ(e.target.value)}
          className={cn(inputCls, "flex-1 min-w-[130px]")}
        />
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400">De</span>
          <input type="date" aria-label="Data inicial" value={f.from} max={f.to || undefined} onChange={(e) => f.setFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-slate-400">Até</span>
          <input type="date" aria-label="Data final" value={f.to} min={f.from || undefined} onChange={(e) => f.setTo(e.target.value)} className={inputCls} />
        </label>
        <select aria-label="Situação de leitura" value={f.read} onChange={(e) => f.setRead(e.target.value as "" | "true" | "false")} className={inputCls}>
          <option value="">Lidas e não lidas</option>
          <option value="false">Só não lidas</option>
          <option value="true">Só lidas</option>
        </select>
        {f.active && (
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={f.clear}>
            Limpar filtros
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <span className="text-sm font-semibold text-slate-800 dark:text-white">
          {showArchived
            ? `${alerts.length} arquivado${alerts.length !== 1 ? "s" : ""}`
            : unreadCount > 0 ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}` : "Tudo lido"}
        </span>
        {!showArchived && unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <CheckCheck className="h-3.5 w-3.5" />Marcar todas como lidas
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 text-center py-10">Não foi possível carregar as notificações agora.</p>
      )}
      {!error && loading && alerts.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>
      )}
      {!error && !loading && alerts.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-10">
          {f.active
            ? "Nenhuma notificação encontrada com esses filtros."
            : showArchived ? "Nenhuma notificação arquivada." : "Nenhuma notificação por aqui."}
        </p>
      )}
      {!error && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {alerts.map((n) => {
            const isRead = n.is_read
            const Icon = alertIcon(n.type)
            return (
              <div key={n.id}
                className={cn(
                  "w-full flex items-start gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                  !isRead && "bg-blue-50/60 dark:bg-blue-950/15"
                )}>
                <button onClick={() => !isRead && markRead(n.id)} className="flex items-start gap-3 flex-1 min-w-0 text-left">
                  <div className="mt-2 shrink-0">
                    <div className={cn("h-2 w-2 rounded-full", !isRead ? "bg-blue-500" : "bg-transparent")} />
                  </div>
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !isRead ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleArchive(n.id)}
                  className="h-7 w-7 p-0 shrink-0 opacity-60 hover:opacity-100"
                  title={showArchived ? "Desarquivar" : "Arquivar"}
                >
                  {showArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {!error && f.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>{f.total} · página {f.page} de {f.totalPages}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={f.page <= 1} onClick={() => f.setPage(f.page - 1)}>Anterior</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={f.page >= f.totalPages} onClick={() => f.setPage(f.page + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function PrefsTab({
  isChannelEnabled, setChannel, governance,
}: {
  isChannelEnabled: (eventType: string, channel: PrefChannel) => boolean
  setChannel: (eventType: string, channel: PrefChannel, enabled: boolean) => void
  governance: Record<string, PrefGovernanceEntry>
}) {
  return (
    <div className="p-5 space-y-6">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Canais</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 px-2.5 py-1 rounded-full">
            <Bell className="h-3 w-3" />Dentro da plataforma — sempre ativo
          </span>
          {PREF_CHANNELS.map(({ key, label, Icon }) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full">
              <Icon className="h-3 w-3" />{label} — não enviado ainda
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipos de notificação</p>
        {PREF_GROUPS.map(group => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.color}`}>{group.label}</span>
            </div>
            <div className="space-y-1.5">
              {group.items.map(item => {
                const gov = governance[item.id]
                return (
                <div key={item.id}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800/50 transition-colors flex-wrap",
                    gov ? "border-amber-200 dark:border-amber-900/40" : "border-slate-100 dark:border-slate-800 hover:border-slate-200",
                  )}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", group.dot)} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                      {gov && (
                        <p className="text-[10px] text-amber-600 mt-1 inline-flex items-center gap-1">
                          <Info className="h-2.5 w-2.5" />
                          {gov.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {PREF_CHANNELS.map(({ key, Icon }) => {
                      const locked = gov ? !gov.toggleable_channels.includes(key) : false
                      return (
                        <label
                          key={key}
                          className={cn("flex items-center gap-1", locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer")}
                          title={locked ? gov!.reason : `${key} (não enviado ainda)`}
                        >
                          <Icon className="h-3 w-3 text-slate-400" />
                          <Switch
                            checked={isChannelEnabled(item.id, key)}
                            onCheckedChange={(v) => setChannel(item.id, key, v)}
                            disabled={locked}
                            className="scale-75"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Cada troca salva na hora. Só o aviso "dentro da plataforma" já envia de verdade hoje — os
          outros canais ficam guardados pra quando existir envio real por e-mail/WhatsApp/push.
        </p>
      </div>
    </div>
  )
}

const GROUP_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-600",
}
const GROUP_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando aprovação",
  active: "Ativo",
  rejected: "Rejeitado",
  archived: "Arquivado",
}

function GroupsTab({
  groups, role, loading, onRequest, onOpenAdmin, onCancelRequest, onOpenChat,
}: {
  groups: GroupSummary[]
  role: "master" | "leader" | "other"
  loading: boolean
  onRequest: () => void
  onOpenAdmin: () => void
  onCancelRequest: (g: GroupSummary) => void
  onOpenChat: (g: GroupSummary) => void
}) {
  if (loading && groups.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-10">Carregando...</p>
  }

  if (role === "master") {
    const pend = groups.filter((g) => g.status === "pending").length
    return (
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/40">
          <Info className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
          <p className="text-xs text-violet-700 dark:text-violet-300">
            Você gerencia os Grupos de Notificação na central do Admin Master — aprovar/rejeitar solicitações, arquivar e ver a auditoria.
          </p>
        </div>
        {pend > 0 && (
          <p className="text-xs font-medium text-amber-600">{pend} solicitação{pend !== 1 ? "ões" : ""} aguardando sua decisão.</p>
        )}
        <Button size="sm" className="btn-brand border-0 text-xs" onClick={onOpenAdmin}>
          Abrir central de Grupos de Notificação
        </Button>
      </div>
    )
  }

  const canRequest = role === "leader"
  const mine = groups.filter((g) => g.status !== "rejected" || role === "leader")

  return (
    <div className="p-5 space-y-4">
      {canRequest && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Meus grupos e solicitações</p>
          <Button size="sm" className="h-7 text-xs gap-1.5 btn-brand border-0" onClick={onRequest}>
            <Plus className="h-3.5 w-3.5" /> Solicitar grupo
          </Button>
        </div>
      )}

      {mine.length === 0 && (
        <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-8 flex flex-col items-center gap-2 text-center">
          <Users className="h-7 w-7 text-slate-300" />
          <p className="text-xs font-medium text-slate-500">
            {canRequest ? "Você ainda não solicitou nenhum grupo." : "Você não participa de nenhum grupo de notificação."}
          </p>
          {canRequest && (
            <Button size="sm" variant="outline" className="text-xs mt-1" onClick={onRequest}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Solicitar grupo
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {mine.map((g) => (
          <div key={g.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">{g.name}</span>
              {g.status && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", GROUP_STATUS_BADGE[g.status])}>
                  {GROUP_STATUS_LABEL[g.status] ?? g.status}
                </span>
              )}
              <span className="text-[10px] text-slate-400">{g.member_count} membro{g.member_count !== 1 ? "s" : ""}</span>
            </div>
            {g.purpose && <p className="text-xs text-slate-500 mt-1">{g.purpose}</p>}
            {g.status === "rejected" && g.rejection_reason && (
              <p className="text-xs text-red-600 mt-1">Motivo da rejeição: {g.rejection_reason}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {g.status === "pending" && canRequest && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => onCancelRequest(g)}>
                  Cancelar solicitação
                </Button>
              )}
              {g.status === "active" && g.conversation_id && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onOpenChat(g)}>
                  <Users className="h-3 w-3" /> Abrir chat
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
