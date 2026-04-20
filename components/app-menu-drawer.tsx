
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAccountType } from "@/contexts/account-type-context"
import { useSidebar } from "@/contexts/sidebar-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  Wallet,
  Settings,
  Building2,
  UserCheck,
  TrendingUp,
  Award,
  Shield,
  Database,
  FileText,
  CreditCard,
  Target,
  Briefcase,
  Star,
  BarChart3,
  BookOpen,
  X,
  History,
  ChevronDown,
  Calculator,
  Tag,
  Share2,
  Rocket,
  Package,
  LogOut,
} from "lucide-react"

const navigationConfig = {
  empresas: {
    company: [
      { name: "Dashboard", href: "/company/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600" },
      {
        name: "Projetos",
        href: "/company/projetos",
        icon: FolderOpen,
        badge: "8",
        color: "from-purple-500 to-purple-600",
      },
      {
        name: "Aprovações",
        href: "/company/aprovacoes",
        icon: CheckSquare,
        badge: "3",
        color: "from-green-500 to-green-600",
      },
      { name: "Pagamentos", href: "/company/pagamentos", icon: CreditCard, color: "from-orange-500 to-orange-600" },
      { name: "Relatórios", href: "/company/relatorios", icon: FileText, color: "from-pink-500 to-pink-600" },
      { name: "Allkademy", href: "/allkademy", icon: BookOpen, color: "from-indigo-500 to-indigo-600" },
    ],
    "in-house": [
      { name: "Dashboard", href: "/in-house/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600" },
      { name: "Catálogo", href: "/in-house/catalogo", icon: Briefcase, color: "from-indigo-500 to-indigo-600" },
      {
        name: "Projetos",
        href: "/in-house/projetos",
        icon: FolderOpen,
        badge: "12",
        color: "from-purple-500 to-purple-600",
      },
      { name: "Equipe", href: "/in-house/equipe", icon: Users, badge: "8", color: "from-green-500 to-green-600" },
      { name: "Financeiro", href: "/in-house/financeiro", icon: Wallet, color: "from-orange-500 to-orange-600" },
      { name: "Relatórios", href: "/in-house/relatorios", icon: BarChart3, color: "from-pink-500 to-pink-600" },
      { name: "Allkademy", href: "/allkademy", icon: BookOpen, color: "from-cyan-500 to-cyan-600" },
      { name: "Configurações", href: "/in-house/configuracoes", icon: Settings, color: "from-slate-500 to-slate-600" },
    ],
  },
  agencias: [
    { name: "Dashboard", href: "/agencias/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600" },
    { name: "Perfil", href: "/agencias/perfil", icon: Building2, color: "from-indigo-500 to-indigo-600" },
    {
      name: "Clientes",
      href: "/agencias/clientes",
      icon: Building2,
      badge: "15",
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Projetos",
      href: "/agencias/projetos",
      icon: FolderOpen,
      badge: "24",
      color: "from-green-500 to-green-600",
    },
    { name: "Equipe", href: "/agencias/equipe", icon: Users, badge: "8", color: "from-pink-500 to-pink-600" },
    { name: "Programa", href: "/agencias/programa", icon: Award, color: "from-amber-500 to-amber-600" },
    {
      name: "Lideradas",
      href: "/agencias/lideradas",
      icon: TrendingUp,
      badge: "5",
      color: "from-orange-500 to-orange-600",
    },
    { name: "Financeiro", href: "/agencias/financeiro", icon: Wallet, color: "from-emerald-500 to-emerald-600" },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen, color: "from-cyan-500 to-cyan-600" },
    { name: "Configurações", href: "/agencias/configuracoes", icon: Settings, color: "from-slate-500 to-slate-600" },
  ],
  nomades: [
    { name: "Dashboard", href: "/nomades/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600" },
    {
      name: "Tarefas Disponíveis",
      href: "/nomades/tarefasdisponiveis",
      icon: Target,
      badge: "18",
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Minhas Tarefas",
      href: "/nomades/minhastarefas",
      icon: CheckSquare,
      badge: "6",
      color: "from-green-500 to-green-600",
    },
    { name: "Habilitações", href: "/nomades/habilitacoes", icon: Award, color: "from-amber-500 to-amber-600" },
    { name: "Histórico", href: "/nomades/historico", icon: History, color: "from-orange-500 to-orange-600" },
    { name: "Programa", href: "/nomades/programa", icon: Star, color: "from-pink-500 to-pink-600" },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet, color: "from-emerald-500 to-emerald-600" },
    { name: "Perfil", href: "/nomades/perfil", icon: UserCheck, color: "from-cyan-500 to-cyan-600" },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen, color: "from-indigo-500 to-indigo-600" },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, color: "from-blue-500 to-blue-600" },
    {
      name: "Gestão de Contas",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      subitems: [
        { name: "Empresas", href: "/admin/empresas", icon: Building2, badge: "32" },
        { name: "Usuários", href: "/admin/usuarios", icon: Users, badge: "589" },
        { name: "Permissões", href: "/admin/permissoes", icon: Shield },
      ],
    },
    {
      name: "Gestão de Projetos",
      icon: FolderOpen,
      color: "from-green-500 to-green-600",
      subitems: [
        { name: "Projetos", href: "/admin/projetos", icon: FolderOpen, badge: "156" },
        { name: "Produtos", href: "/admin/produtos", icon: Package },
        { name: "Precificação", href: "/admin/precificacao", icon: Calculator },
        { name: "Campanhas", href: "/admin/campanhas-indicacao", icon: Share2 },
      ],
    },
    {
      name: "Gameficação",
      icon: Star,
      color: "from-amber-500 to-amber-600",
      subitems: [
        { name: "Níveis Agências", href: "/admin/niveis", icon: Building2 },
        { name: "Níveis Nômades", href: "/admin/niveis-nomades", icon: UserCheck },
      ],
    },
    { name: "Financeiro", href: "/admin/financeiro", icon: Wallet, color: "from-emerald-500 to-emerald-600" },
    { name: "Relatórios", href: "/admin/relatorios", icon: BarChart3, color: "from-pink-500 to-pink-600" },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen, color: "from-cyan-500 to-cyan-600" },
    {
      name: "Administração",
      icon: Shield,
      color: "from-slate-500 to-slate-600",
      subitems: [
        { name: "Sistema", href: "/admin/sistema", icon: Database },
        { name: "Disponibilidade", href: "/admin/disponibilidade", icon: Target },
        { name: "Especialidades", href: "/admin/especialidades", icon: Briefcase },
        { name: "Onboarding", href: "/admin/onboarding", icon: Rocket },
        { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
      ],
    },
  ],
}

interface AppMenuDrawerProps {
  open: boolean
  onClose: () => void
}

export function AppMenuDrawer({ open, onClose }: AppMenuDrawerProps) {
  const location = useLocation()
  const pathname = location.pathname
  const { accountType, accountSubType } = useAccountType()
  const { userProfile } = useSidebar()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const getNavigationItems = () => {
    if (accountType === "admin") {
      return navigationConfig.admin
    }
    if (accountType === "empresas") {
      return navigationConfig.empresas[accountSubType || "company"]
    }
    return navigationConfig[accountType] || []
  }

  const navigation = getNavigationItems()

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName) ? prev.filter((name) => name !== itemName) : [...prev, itemName],
    )
  }

  useEffect(() => {
    navigation.forEach((item: any) => {
      if (item.subitems) {
        const hasActiveSubitem = item.subitems.some((subitem: any) => pathname === subitem.href)
        if (hasActiveSubitem && !expandedItems.includes(item.name)) {
          setExpandedItems((prev) => [...prev, item.name])
        }
      }
    })
  }, [pathname, navigation])

  if (!open) return null

  return (
    <>
      <div
        className="xl:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="xl:hidden fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
        <div className="pointer-events-auto w-full h-[95vh] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col">
          {/* Header - Banking app style */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-4 ring-white/20">
                  <AvatarImage src={userProfile.avatar.startsWith("data:") ? userProfile.avatar : undefined} />
                  <AvatarFallback className="bg-blue-700 text-white font-bold text-lg">
                    {userProfile.avatar.length <= 2
                      ? userProfile.avatar
                      : userProfile.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  {accountType === "admin" && (
                    <p className="text-white font-semibold text-lg">{userProfile.name}</p>
                  )}
                  <p className="text-white/80 text-sm">
                    {accountType === "admin" ? (userProfile.job_title || userProfile.role) : userProfile.role}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 h-auto"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Navigation Grid - App style */}
          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {navigation.map((item: any) => {
                if (item.subitems) {
                  const isExpanded = expandedItems.includes(item.name)
                  const hasActiveSubitem = item.subitems.some((subitem: any) => pathname === subitem.href)
                  const Icon = item.icon

                  return (
                    <div key={item.name} className="col-span-3">
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 active:scale-95",
                          hasActiveSubitem
                            ? `bg-gradient-to-br ${item.color} shadow-lg`
                            : "bg-white/5 hover:bg-white/10",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-xl", hasActiveSubitem ? "bg-white/20" : "bg-white/10")}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-white font-medium text-sm">{item.name}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-white/70 transition-transform duration-300",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>

                      {isExpanded && (
                        <div className="grid grid-cols-3 gap-3 mt-3 ml-4">
                          {item.subitems.map((subitem: any) => {
                            const isActive = pathname === subitem.href
                            const SubIcon = subitem.icon

                            return (
                              <Link
                                key={subitem.name}
                                to={subitem.href}
                                onClick={onClose}
                                className={cn(
                                  "relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 active:scale-95",
                                  isActive
                                    ? "bg-gradient-to-br from-white/20 to-white/10 shadow-lg"
                                    : "bg-white/5 hover:bg-white/10",
                                )}
                              >
                                <SubIcon className="h-5 w-5 text-white mb-2" />
                                <span className="text-white/90 text-[10px] font-medium text-center leading-tight">
                                  {subitem.name}
                                </span>
                                {subitem.badge && (
                                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-slate-950">
                                    {subitem.badge}
                                  </Badge>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 active:scale-95",
                      isActive ? `bg-gradient-to-br ${item.color} shadow-lg scale-105` : "bg-white/5 hover:bg-white/10",
                    )}
                  >
                    <Icon className="h-6 w-6 text-white mb-2" />
                    <span className="text-white text-xs font-medium text-center leading-tight">{item.name}</span>
                    {item.badge && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-slate-950">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 pt-4 border-t border-white/10 bg-black/20">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white/10 rounded-xl p-4"
              onClick={onClose}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
