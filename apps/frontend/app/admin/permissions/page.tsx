// @ts-nocheck
import { useState, useRef } from "react"
import { ExportButton } from "@/components/export-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NeonBadge } from "@/components/neon-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PermissionProfileSlidePanel } from "@/components/permission-profile-slide-panel"
import {
  Search, Plus, Users, Shield, Settings, BarChart3, Edit, Trash2,
  Building2, Briefcase, Compass, Store, DollarSign, Lock, FileText, LayoutDashboard, Minus,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ─── Shared module/action meta (mirrors slide panel) ─────────────────────────────
type Scope = "none" | "own" | "all"
interface ModulePerm { view: Scope; create: Scope; edit: Scope; delete: Scope }

const MODULES = [
  { key: "dashboard",   label: "Dashboard",    icon: LayoutDashboard, group: "Visão Geral"    },
  { key: "users",       label: "Usuários",      icon: Users,           group: "Gestão"         },
  { key: "companies",   label: "Empresas",      icon: Building2,       group: "Gestão"         },
  { key: "agencies",    label: "Agências",      icon: Briefcase,       group: "Gestão"         },
  { key: "nomades",     label: "Nômades",       icon: Compass,         group: "Gestão"         },
  { key: "projects",    label: "Projetos",      icon: Briefcase,       group: "Operações"      },
  { key: "products",    label: "Produtos",      icon: Store,           group: "Operações"      },
  { key: "financial",   label: "Financeiro",    icon: DollarSign,      group: "Financeiro"     },
  { key: "reports",     label: "Relatórios",    icon: BarChart3,       group: "Financeiro"     },
  { key: "settings",    label: "Configurações", icon: Settings,        group: "Administração"  },
  { key: "permissions", label: "Permissões",    icon: Lock,            group: "Administração"  },
  { key: "terms",       label: "Termos",        icon: FileText,        group: "Administração"  },
]
const ACTIONS: { key: keyof ModulePerm; label: string }[] = [
  { key: "view",   label: "Visualizar" },
  { key: "create", label: "Criar"      },
  { key: "edit",   label: "Editar"     },
  { key: "delete", label: "Excluir"    },
]
const GROUPS = Array.from(new Set(MODULES.map((m) => m.group)))

function scopeSummary(perms: Record<string, ModulePerm>) {
  let own = 0; let all = 0
  MODULES.forEach((m) => ACTIONS.forEach((a) => {
    const v = perms?.[m.key]?.[a.key] ?? "none"
    if (v === "own") own++
    if (v === "all") all++
  }))
  return { own, all, total: MODULES.length * ACTIONS.length }
}

// ─── Read-only scope cell ───────────────────────────────────────────────────
function ReadonlyScopeCell({ value }: { value: Scope }) {
  if (value === "own")
    return <NeonBadge color="blue" className="text-[10px] font-bold">Próprios</NeonBadge>
  if (value === "all")
    return <NeonBadge color="emerald" className="text-[10px] font-bold">Todos</NeonBadge>
  return (
    <span className="w-5 h-5 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto">
      <Minus className="h-2.5 w-2.5 text-slate-300" />
    </span>
  )
}

interface PermissionProfile {
  id: number
  name: string
  description: string
  users: number
  permissions: Record<string, ModulePerm>
}

// ─── Stat card — saturated gradient recipe (matches admin/empresas & admin/clientes) ──
const STAT_COLOR_MAP: Record<string, { gradient: string; darkGradient: string; borderClass: string }> = {
  blue: {
    gradient: "from-blue-500 to-blue-700",
    darkGradient: "dark:from-blue-800 dark:to-blue-950",
    borderClass: "border-2 border-blue-300/70 dark:border-blue-800/70",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    darkGradient: "dark:from-emerald-800 dark:to-teal-900",
    borderClass: "border-2 border-emerald-300/70 dark:border-emerald-800/70",
  },
  violet: {
    gradient: "from-violet-500 to-purple-700",
    darkGradient: "dark:from-violet-800 dark:to-purple-950",
    borderClass: "border-2 border-violet-300/70 dark:border-violet-800/70",
  },
  orange: {
    gradient: "from-orange-500 to-rose-600",
    darkGradient: "dark:from-orange-800 dark:to-rose-900",
    borderClass: "border-2 border-orange-300/70 dark:border-orange-800/70",
  },
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: keyof typeof STAT_COLOR_MAP
}) {
  const colors = STAT_COLOR_MAP[color]
  return (
    <div
      className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.darkGradient} ${colors.borderClass} shadow-lg hover:shadow-xl`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">{label}</span>
          <div className="bg-white/20 rounded-md p-1">
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    </div>
  )
}

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<PermissionProfile | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  const ALL: Scope = "all"; const OWN: Scope = "own"; const NONE: Scope = "none"
  type P = Record<string, ModulePerm>
  const fullModule = (v: Scope = ALL): ModulePerm => ({ view: v, create: v, edit: v, delete: v })

  // NOTE: mock data — no backend endpoint for permission profiles exists yet;
  // this whole page renders from this hardcoded array (out of scope to wire up here).
  const mockProfiles: PermissionProfile[] = [
    {
      id: 1, name: "Super Admin", description: "Acesso irrestrito a toda a plataforma", users: 2,
      permissions: Object.fromEntries(MODULES.map((m) => [m.key, fullModule(ALL)])) as P,
    },
    {
      id: 2, name: "Gerente de Operações", description: "Gestão de projetos, nômades e empresas", users: 5,
      permissions: {
        dashboard:   { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        users:       { view: ALL,  create: OWN,  edit: OWN,  delete: NONE },
        companies:   { view: ALL,  create: NONE, edit: OWN,  delete: NONE },
        agencies:    { view: ALL,  create: NONE, edit: OWN,  delete: NONE },
        nomades:     { view: ALL,  create: ALL,  edit: ALL,  delete: NONE },
        projects:    { view: ALL,  create: ALL,  edit: ALL,  delete: OWN  },
        products:    { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        financial:   { view: OWN,  create: NONE, edit: NONE, delete: NONE },
        reports:     { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        settings:    { view: NONE, create: NONE, edit: NONE, delete: NONE },
        permissions: { view: NONE, create: NONE, edit: NONE, delete: NONE },
        terms:       { view: NONE, create: NONE, edit: NONE, delete: NONE },
      } as P,
    },
    {
      id: 3, name: "Analista Financeiro", description: "Relatórios e dados financeiros da plataforma", users: 3,
      permissions: {
        dashboard:   { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        users:       { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        companies:   { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        agencies:    { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        nomades:     { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        projects:    { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        products:    { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        financial:   { view: ALL,  create: OWN,  edit: OWN,  delete: NONE },
        reports:     { view: ALL,  create: ALL,  edit: ALL,  delete: NONE },
        settings:    { view: NONE, create: NONE, edit: NONE, delete: NONE },
        permissions: { view: NONE, create: NONE, edit: NONE, delete: NONE },
        terms:       { view: ALL,  create: NONE, edit: NONE, delete: NONE },
      } as P,
    },
    {
      id: 4, name: "Empresa Básico", description: "Perfil padrão para usuários de empresa", users: 18,
      permissions: {
        dashboard:   { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        users:       { view: OWN,  create: NONE, edit: OWN,  delete: NONE },
        companies:   { view: OWN,  create: NONE, edit: OWN,  delete: NONE },
        agencies:    { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        nomades:     { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        projects:    { view: OWN,  create: OWN,  edit: OWN,  delete: OWN  },
        products:    { view: ALL,  create: NONE, edit: NONE, delete: NONE },
        financial:   { view: OWN,  create: NONE, edit: NONE, delete: NONE },
        reports:     { view: OWN,  create: NONE, edit: NONE, delete: NONE },
        settings:    { view: NONE, create: NONE, edit: NONE, delete: NONE },
        permissions: { view: NONE, create: NONE, edit: NONE, delete: NONE },
        terms:       { view: OWN,  create: NONE, edit: NONE, delete: NONE },
      } as P,
    },
  ]

  const handleCreateProfile = () => {
    setSelectedProfile(null)
    setIsPanelOpen(true)
  }

  const handleEditProfile = (profile: PermissionProfile) => {
    setSelectedProfile(profile)
    setIsPanelOpen(true)
  }

  const handleSaveProfile = (profileData: any) => {
    setIsPanelOpen(false)
  }

  const filteredProfiles = mockProfiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const stats = [
    { label: "Total de Perfis", value: mockProfiles.length, icon: Shield, color: "blue" as const },
    {
      label: "Usuários com Perfil",
      value: mockProfiles.reduce((acc, p) => acc + p.users, 0),
      icon: Users,
      color: "emerald" as const,
    },
    { label: "Módulos Configuráveis", value: MODULES.length, icon: Settings, color: "violet" as const },
  ]

  return (
    <div className="space-y-3" ref={pageRef}>
      <PageHeader
        title="Gestão de Permissões"
        description="Configure perfis de acesso e permissões granulares"
        actions={<>
          <ExportButton pageRef={pageRef} filename="permissoes" />
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCreateProfile}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Novo Perfil
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar novo perfil de permissão</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />

      <Accordion type="single" collapsible className="mb-1">
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="bg-white hover:bg-slate-50 rounded-lg px-4 py-3 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Estatísticas e Métricas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {stats.map((stat, index) => (
                <StatCard key={index} label={stat.label} value={stat.value} icon={stat.icon} color={stat.color} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-2">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar perfis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="all">Perfis de Acesso</TabsTrigger>
                <TabsTrigger value="matrix">Matriz de Permissões</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-2 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredProfiles.map((profile) => {
                    const sm = scopeSummary(profile.permissions)
                    return (
                      <Card
                        key={profile.id}
                        className="hover:shadow-md transition-shadow border-slate-200 overflow-hidden"
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between px-4 pt-4 pb-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)" }}>
                              <Shield className="h-4.5 w-4.5 text-blue-300" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800 leading-tight">{profile.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{profile.description}</p>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleEditProfile(profile)}
                                    className="h-7 w-7 flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">Editar perfil</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="h-7 w-7 flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-rose-500 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">Excluir perfil</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-2 px-4 py-2 border-t border-b border-slate-100 bg-slate-50">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">{profile.users} usuários</span>
                          <span className="mx-1 text-slate-200">·</span>
                          {sm.all > 0 && (
                            <NeonBadge color="emerald" className="text-[10px] font-bold">
                              {sm.all} Todos
                            </NeonBadge>
                          )}
                          {sm.own > 0 && (
                            <NeonBadge color="blue" className="text-[10px] font-bold">
                              {sm.own} Próprios
                            </NeonBadge>
                          )}
                          <span className="ml-auto text-[10px] text-slate-400">{sm.all + sm.own}/{sm.total} ativas</span>
                        </div>

                        {/* Module quick-grid */}
                        <div className="px-4 py-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Módulos</p>
                          <div className="flex flex-wrap gap-1">
                            {MODULES.map((mod) => {
                              const perm = profile.permissions?.[mod.key]
                              if (!perm) return null
                              const hasAny = Object.values(perm).some((v) => v !== "none")
                              const isAll  = Object.values(perm).every((v) => v === "all")
                              if (!hasAny) return null
                              return (
                                <NeonBadge
                                  key={mod.key}
                                  color={isAll ? "emerald" : "blue"}
                                  className="text-[10px] font-medium"
                                >
                                  {mod.label}
                                </NeonBadge>
                              )
                            })}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              <TabsContent value="matrix" className="mt-4">
                {filteredProfiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum perfil encontrado.</p>
                ) : (
                  <div className="space-y-4">
                    {filteredProfiles.map((profile) => (
                      <Card key={profile.id} className="overflow-hidden border-slate-200">
                        {/* Profile header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3"
                          style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)" }}
                        >
                          <Shield className="h-4 w-4 text-blue-300" />
                          <p className="text-sm font-semibold text-white">{profile.name}</p>
                          <p className="text-xs text-slate-400 ml-1">— {profile.description}</p>
                          <button
                            onClick={() => handleEditProfile(profile)}
                            className="ml-auto p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Read-only matrix */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 border-r border-slate-200" style={{ width: 180 }}>Módulo</th>
                                {ACTIONS.map((a) => (
                                  <th key={a.key} className="text-center px-2 py-2 text-xs font-semibold text-slate-500 border-r border-slate-200 last:border-r-0" style={{ width: 110 }}>
                                    {a.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {GROUPS.map((group) => {
                                const groupMods = MODULES.filter((m) => m.group === group)
                                const groupHasAny = groupMods.some((m) =>
                                  ACTIONS.some((a) => (profile.permissions?.[m.key]?.[a.key] ?? "none") !== "none")
                                )
                                if (!groupHasAny) return null
                                return [
                                  <tr key={`hdr-${group}`}>
                                    <td colSpan={ACTIONS.length + 1} className="px-4 py-1 bg-slate-50 border-y border-slate-100">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group}</span>
                                    </td>
                                  </tr>,
                                  ...groupMods.map((mod, idx) => {
                                    const Icon = mod.icon
                                    const perm = profile.permissions?.[mod.key]
                                    const hasAny = perm && ACTIONS.some((a) => perm[a.key] !== "none")
                                    if (!hasAny) return null
                                    return (
                                      <tr
                                        key={mod.key}
                                        className={`border-b border-slate-100 ${
                                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                        }`}
                                      >
                                        <td className="px-4 py-2 border-r border-slate-100">
                                          <div className="flex items-center gap-2">
                                            <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700">{mod.label}</span>
                                          </div>
                                        </td>
                                        {ACTIONS.map((action) => (
                                          <td key={action.key} className="px-2 py-2 border-r border-slate-100 last:border-r-0 text-center">
                                            <ReadonlyScopeCell value={perm?.[action.key] ?? "none"} />
                                          </td>
                                        ))}
                                      </tr>
                                    )
                                  }),
                                ]
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <PermissionProfileSlidePanel
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        profile={selectedProfile}
        onSave={handleSaveProfile}
      />
    </div>
  )
}
