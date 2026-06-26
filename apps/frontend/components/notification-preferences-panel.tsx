// @ts-nocheck
import { useState } from "react"
import {
  Bell, Mail, MessageSquare, Smartphone, CheckCircle2, AlertCircle,
  UserPlus, Settings, FolderOpen, CheckCheck, Zap, Info, Plus,
  Users, Play, Pause, Trash2, Edit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModalBrandHeader } from "@/components/ui/modal-brand-header"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface NotifItem {
  id: string
  type: "task" | "system" | "user" | "project" | "approval"
  title: string
  body: string
  date: string
  read: boolean
}

const MOCK_NOTIFICATIONS: NotifItem[] = [
  { id: "ni-1", type: "task",     title: "Tarefa aprovada",          body: "A tarefa 'Campanha Meta – Junho' foi aprovada com sucesso.",                         date: new Date(Date.now() - 25 * 60 * 1000).toISOString(),          read: false },
  { id: "ni-2", type: "task",     title: "Nova tarefa para qualificar", body: "Você tem uma tarefa aguardando qualificação: 'SEO On-page – Cliente X'.",         date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),      read: false },
  { id: "ni-3", type: "system",   title: "Atualização da plataforma", body: "A plataforma foi atualizada para a versão 2.1.0 com melhorias de performance.",    date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),      read: true  },
  { id: "ni-4", type: "task",     title: "Tarefa devolvida",          body: "'Google Ads – E-commerce' foi devolvida com observações do líder.",                  date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),     read: true  },
  { id: "ni-5", type: "task",     title: "Entrega recebida",          body: "Carla Souza enviou a entrega da tarefa 'Relatório Performance – Maio'.",             date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), read: true  },
  { id: "ni-6", type: "user",     title: "Novo nômade cadastrado",    body: "João Silva se cadastrou como nômade na área de Performance.",                       date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), read: true  },
  { id: "ni-7", type: "project",  title: "Novo projeto criado",       body: "O projeto 'Marketing Digital Q3 – Allka' foi associado à sua área.",                date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), read: true  },
  { id: "ni-8", type: "approval", title: "Aprovação pendente",        body: "'Campanha Instagram – Verão' aguarda sua aprovação há 2 dias.",                     date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), read: true  },
]

const NOTIF_ICON_CFG = {
  task:     { Icon: CheckCircle2, bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600" },
  system:   { Icon: AlertCircle,  bg: "bg-blue-100 dark:bg-blue-900/30",       text: "text-blue-600" },
  user:     { Icon: UserPlus,     bg: "bg-purple-100 dark:bg-purple-900/30",   text: "text-purple-600" },
  project:  { Icon: FolderOpen,   bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-600" },
  approval: { Icon: CheckCircle2, bg: "bg-orange-100 dark:bg-orange-900/30",   text: "text-orange-600" },
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

const MOCK_RULES = [
  { id: "r1", name: "Tarefa atrasada → WhatsApp", desc: "Quando uma tarefa passa do prazo, avisa via WhatsApp", enabled: true,  trigger: "Prazo expirado",    channels: ["WhatsApp"] },
  { id: "r2", name: "Novo projeto → E-mail",      desc: "Quando um novo projeto é aberto, envia e-mail",       enabled: true,  trigger: "Projeto criado",    channels: ["E-mail"] },
  { id: "r3", name: "Aprovação pendente → Push",  desc: "Lembrete diário de aprovações pendentes",             enabled: false, trigger: "Diário (9h)",      channels: ["Push"] },
]

const MOCK_GROUPS = [
  { id: "g1", name: "Líderes de Projeto",  desc: "Responsáveis por aprovar entregas e gerir projetos", members: 3, color: "bg-violet-100 text-violet-700" },
  { id: "g2", name: "Equipe Financeira",   desc: "Responsáveis por faturas e cobranças",                members: 2, color: "bg-blue-100 text-blue-700" },
  { id: "g3", name: "Toda a Agência",      desc: "Todos os membros ativos da agência",                  members: 8, color: "bg-emerald-100 text-emerald-700" },
]

/* ─── Component ──────────────────────────────────────────────────────────── */
interface NotificationPreferencesPanelProps {
  open?: boolean
  onClose?: () => void
  embedded?: boolean
  initialTab?: string
}

export function NotificationPreferencesPanel({
  open = false, onClose, embedded = false, initialTab = "inbox",
}: NotificationPreferencesPanelProps) {
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [readSet, setReadSet] = useState<Set<string>>(
    new Set(MOCK_NOTIFICATIONS.filter(n => n.read).map(n => n.id))
  )
  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !readSet.has(n.id)).length

  const [channels, setChannels] = useState({ email: true, push: true, inApp: true, whatsapp: true })
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(PREF_GROUPS.flatMap(g => g.items.map(i => [i.id, true])))
  )
  const [rules, setRules] = useState(MOCK_RULES)

  const totalActive = Object.values(prefs).filter(Boolean).length
  const totalPrefs  = Object.values(prefs).length

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setShowSuccess(true)
    setTimeout(() => { setShowSuccess(false); if (!embedded) onClose?.() }, 1500)
  }

  if (!embedded && !open) return null

  /* ── Tab bodies ──────────────────────────────────────────────────────── */

  return embedded ? (
    /* ── Embedded mode (inside a page) ─────────────────────────────────── */
    <div className="space-y-4">
      {showSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-emerald-900">Preferências salvas!</span>
        </div>
      )}
      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 mr-1.5" />Notificações</TabsTrigger>
          <TabsTrigger value="notifications"><Settings className="h-3.5 w-3.5 mr-1.5" />Preferências</TabsTrigger>
          <TabsTrigger value="rules"><Zap className="h-3.5 w-3.5 mr-1.5" />Regras</TabsTrigger>
          <TabsTrigger value="groups"><Users className="h-3.5 w-3.5 mr-1.5" />Grupos</TabsTrigger>
        </TabsList>
        <TabsContent value="notifications" className="pt-2">
          <InboxTab notifications={MOCK_NOTIFICATIONS} readSet={readSet} setReadSet={setReadSet} />
        </TabsContent>
        <TabsContent value="notifications" className="pt-2">
          <PrefsTab channels={channels} toggleChannel={k => setChannels(c => ({...c, [k]: !c[k]}))} prefs={prefs} togglePref={id => setPrefs(p => ({...p, [id]: !p[id]}))} />
        </TabsContent>
        <TabsContent value="rules" className="pt-2">
          <RulesTab rules={rules} setRules={setRules} />
        </TabsContent>
        <TabsContent value="groups" className="pt-2">
          <GroupsTab />
        </TabsContent>
      </Tabs>
      <div className="flex items-center justify-between pt-3 border-t">
        <p className="text-xs text-slate-400">{totalActive} de {totalPrefs} notificações ativas</p>
        <Button onClick={handleSave} disabled={saving} className="h-8 text-xs btn-brand border-0">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  ) : (
    /* ── Modal / slide-in panel ─────────────────────────────────────────── */
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div
        className="fixed top-0 bottom-0 right-0 z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl"
        style={{ left: "var(--sidebar-width, 240px)" }}
      >
        <ModalBrandHeader
          title="Central de Notificações"
          subtitle="Notificações e preferências da plataforma"
          icon={<Bell />}
          onClose={onClose}
        />

        {showSuccess && (
          <div className="mx-5 mt-3 mb-1 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3 shrink-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-medium text-emerald-900 dark:text-emerald-300">Preferências salvas!</span>
          </div>
        )}

        {/* Tabs — flex-1 min-h-0 so it shrinks properly */}
        <Tabs defaultValue={initialTab} className="flex-1 min-h-0 flex flex-col">
          <div className="px-5 pt-4 pb-1 shrink-0">
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
              <TabsTrigger value="notifications"
                className="flex-1 gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm py-2">
                <Settings className="h-3.5 w-3.5" />Preferências
              </TabsTrigger>
              <TabsTrigger value="rules"
                className="flex-1 gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm py-2">
                <Zap className="h-3.5 w-3.5" />Regras
              </TabsTrigger>
              <TabsTrigger value="groups"
                className="flex-1 gap-1.5 text-xs rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm py-2">
                <Users className="h-3.5 w-3.5" />Grupos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Each TabsContent scrolls independently */}
          <TabsContent value="inbox" className="flex-1 min-h-0 overflow-y-auto mt-0">
            <InboxTab notifications={MOCK_NOTIFICATIONS} readSet={readSet} setReadSet={setReadSet} />
          </TabsContent>

          <TabsContent value="notifications" className="flex-1 min-h-0 overflow-y-auto mt-0">
            <PrefsTab
              channels={channels}
              toggleChannel={k => setChannels(c => ({...c, [k]: !c[k]}))}
              prefs={prefs}
              togglePref={id => setPrefs(p => ({...p, [id]: !p[id]}))}
            />
          </TabsContent>

          <TabsContent value="rules" className="flex-1 min-h-0 overflow-y-auto mt-0">
            <RulesTab rules={rules} setRules={setRules} />
          </TabsContent>

          <TabsContent value="groups" className="flex-1 min-h-0 overflow-y-auto mt-0">
            <GroupsTab />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 shrink-0 flex items-center gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-9 text-sm">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="h-9 text-sm btn-brand border-0">
            {saving ? "Salvando..." : "Salvar Preferências"}
          </Button>
          <p className="text-xs text-slate-400 ml-auto">{totalActive} de {totalPrefs} notificações ativas</p>
        </div>
      </div>
    </>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function InboxTab({ notifications, readSet, setReadSet }) {
  const unreadCount = notifications.filter(n => !readSet.has(n.id)).length
  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <span className="text-sm font-semibold text-slate-800 dark:text-white">
          {unreadCount > 0 ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}` : "Tudo lido"}
        </span>
        {unreadCount > 0 && (
          <button onClick={() => setReadSet(new Set(notifications.map(n => n.id)))}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <CheckCheck className="h-3.5 w-3.5" />Marcar todas como lidas
          </button>
        )}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.map(n => {
          const isRead = readSet.has(n.id)
          const cfg = NOTIF_ICON_CFG[n.type]
          return (
            <button key={n.id}
              onClick={() => setReadSet(prev => new Set([...prev, n.id]))}
              className={cn(
                "w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                !isRead && "bg-blue-50/60 dark:bg-blue-950/15"
              )}>
              <div className="mt-2 shrink-0">
                <div className={cn("h-2 w-2 rounded-full", !isRead ? "bg-blue-500" : "bg-transparent")} />
              </div>
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                <cfg.Icon className={cn("h-4 w-4", cfg.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm leading-snug", !isRead ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300")}>
                  {n.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.date)}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PrefsTab({ channels, toggleChannel, prefs, togglePref }) {
  return (
    <div className="p-5 space-y-6">
      {/* Channels */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Canais de recebimento</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "email",    label: "E-mail",   Icon: Mail,          color: "#3b82f6" },
            { key: "whatsapp", label: "WhatsApp", Icon: MessageSquare, color: "#22c55e" },
            { key: "push",     label: "Push",     Icon: Bell,          color: "#8b5cf6" },
            { key: "inApp",    label: "In-App",   Icon: Smartphone,    color: "#f59e0b" },
          ].map(({ key, label, Icon, color }) => (
            <button key={key} onClick={() => toggleChannel(key)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                channels[key]
                  ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
                  : "border-dashed border-slate-200 dark:border-slate-700 opacity-50"
              )}>
              <div className="p-1.5 rounded-lg shrink-0" style={{ background: color + "20" }}>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">{label}</span>
              <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                channels[key] ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"
              )}>
                {channels[key] && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Notification type groups */}
      <div className="space-y-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipos de notificação</p>
        {PREF_GROUPS.map(group => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${group.color}`}>{group.label}</span>
              <span className="text-[10px] text-slate-400">{group.items.filter(i => prefs[i.id]).length}/{group.items.length} ativas</span>
            </div>
            <div className="space-y-1.5">
              {group.items.map(item => (
                <div key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", group.dot)} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <Switch checked={prefs[item.id]} onCheckedChange={() => togglePref(item.id)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Alguns eventos essenciais (faturas, segurança) são enviados pelo sistema e não podem ser desativados.
        </p>
      </div>
    </div>
  )
}

function RulesTab({ rules, setRules }) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/40">
        <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          <strong>Regras</strong> são automações pessoais: você define o gatilho (ex: "tarefa atrasada") e o canal de aviso (WhatsApp, e-mail). Cada regra roda automaticamente para sua agência.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{rules.length} regras criadas</p>
        <Button size="sm" className="h-7 text-xs gap-1.5 btn-brand border-0"><Plus className="h-3.5 w-3.5" />Nova Regra</Button>
      </div>

      <div className="space-y-2">
        {rules.map(rule => (
          <div key={rule.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border transition-colors",
              rule.enabled
                ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                : "border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 opacity-70"
            )}>
            <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", rule.enabled ? "bg-violet-100" : "bg-slate-100")}>
              <Zap className={cn("h-3.5 w-3.5", rule.enabled ? "text-violet-600" : "text-slate-400")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{rule.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{rule.desc}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                  Gatilho: {rule.trigger}
                </span>
                {rule.channels.map(ch => (
                  <span key={ch} className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{ch}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={rule.enabled} onCheckedChange={() => setRules(prev => prev.map(r => r.id === rule.id ? {...r, enabled: !r.enabled} : r))} />
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="border border-dashed border-slate-200 rounded-xl py-10 flex flex-col items-center gap-3 text-slate-400">
          <Zap className="h-8 w-8" />
          <p className="text-sm">Nenhuma regra criada</p>
          <Button size="sm" variant="outline" className="text-xs">Criar primeira regra</Button>
        </div>
      )}
    </div>
  )
}

function GroupsTab() {
  const [groups, setGroups] = useState(MOCK_GROUPS)
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/40">
        <Info className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
        <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
          <strong>Grupos</strong> organizam os membros da sua agência. Ao criar uma regra, você pode escolher notificar um grupo inteiro em vez de pessoas uma a uma.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{groups.length} grupos criados</p>
        <Button size="sm" className="h-7 text-xs gap-1.5 btn-brand border-0"><Plus className="h-3.5 w-3.5" />Novo Grupo</Button>
      </div>

      <div className="space-y-2">
        {groups.map(group => (
          <div key={group.id}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 transition-colors">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", group.color)}>
              <Users className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{group.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{group.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{group.members}</span>
              <span className="text-[10px] text-slate-400">membros</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg"><Edit className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-8 flex flex-col items-center gap-2 text-center">
        <Users className="h-7 w-7 text-slate-300" />
        <p className="text-xs font-medium text-slate-500">Crie grupos para facilitar o envio de notificações à sua equipe</p>
        <Button size="sm" variant="outline" className="text-xs mt-1"><Plus className="h-3.5 w-3.5 mr-1.5" />Criar Grupo</Button>
      </div>
    </div>
  )
}
