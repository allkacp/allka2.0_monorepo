// @ts-nocheck
import { useState, useRef } from "react"
import { ExportButton } from "@/components/export-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PermissionProfileSlidePanel } from "@/components/permission-profile-slide-panel"
import {
  Search, Plus, Users, Shield, Settings, BarChart3, Edit, Trash2,
  Building2, Briefcase, Compass, Store, DollarSign, Lock, FileText, LayoutDashboard, Minus,
} from "lucide-react"

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
    return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Próprios</span>
  if (value === "all")
    return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Todos</span>
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

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<PermissionProfile | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  const ALL: Scope = "all"; const OWN: Scope = "own"; const NONE: Scope = "none"
  type P = Record<string, ModulePerm>
  const fullModule = (v: Scope = ALL): ModulePerm => ({ view: v, create: v, edit: v, delete: v })

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
    { label: "Total de Perfis", value: mockProfiles.length, icon: Shield, color: "blue" },
    {
      label: "Usuários com Perfil",
      value: mockProfiles.reduce((acc, p) => acc + p.users, 0),
      icon: Users,
      color: "green",
    },
    { label: "Módulos Configuráveis", value: MODULES.length, icon: Settings, color: "purple" },
  ]

  return (
    <div className="space-y-3" ref={pageRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gestão de Permissões</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure perfis de acesso e permissões granulares</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton pageRef={pageRef} filename="permissoes" />
          <Button
            onClick={handleCreateProfile}
            className="btn-brand h-9"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Perfil
          </Button>
        </div>
      </div>

      <Accordion type="single" collapsible className="mb-1">
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="bg-white hover:bg-slate-50 rounded-lg px-4 py-3 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Estatísticas e Métricas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                const colorClasses = {
                  blue: {
                    bg: "bg-gradient-to-br from-blue-50 to-blue-100",
                    border: "border-blue-200",
                    icon: "text-blue-600",
                    text: "text-blue-900",
                    value: "text-blue-700",
                  },
                  green: {
                    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
                    border: "border-emerald-200",
                    icon: "text-emerald-600",
                    text: "text-emerald-900",
                    value: "text-emerald-700",
                  },
                  purple: {
                    bg: "bg-gradient-to-br from-violet-50 to-violet-100",
                    border: "border-violet-200",
                    icon: "text-violet-600",
                    text: "text-violet-900",
                    value: "text-violet-700",
                  },
                }[stat.color]

                return (
                  <Card key={index} className={`p-3 ${colorClasses.bg} ${colorClasses.border}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${colorClasses.icon}`} />
                      <span className={`text-xs font-medium ${colorClasses.text}`}>{stat.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${colorClasses.value}`}>{stat.value}</p>
                  </Card>
                )
              })}
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
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleEditProfile(profile)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-2 px-4 py-2 border-t border-b border-slate-100 bg-slate-50">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">{profile.users} usuários</span>
                          <span className="mx-1 text-slate-200">·</span>
                          {sm.all > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              {sm.all} Todos
                            </span>
                          )}
                          {sm.own > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              {sm.own} Próprios
                            </span>
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
                                <span
                                  key={mod.key}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                    isAll
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-blue-50 text-blue-700 border-blue-200"
                                  }`}
                                >
                                  {mod.label}
                                </span>
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
