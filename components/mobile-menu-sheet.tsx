import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAccountType } from "@/contexts/account-type-context"
import { useSidebar } from "@/contexts/sidebar-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
} from "lucide-react"

const navigationConfig = {
  empresas: {
    company: [
      { name: "Dashboard", href: "/company/dashboard", icon: LayoutDashboard },
      { name: "Projetos", href: "/company/projetos", icon: FolderOpen, badge: "8" },
      { name: "Aprovações", href: "/company/aprovacoes", icon: CheckSquare, badge: "3" },
      { name: "Pagamentos", href: "/company/pagamentos", icon: CreditCard },
      { name: "Relatórios", href: "/company/relatorios", icon: FileText },
      { name: "Allkademy", href: "/allkademy", icon: BookOpen },
    ],
    "in-house": [
      { name: "Dashboard", href: "/in-house/dashboard", icon: LayoutDashboard },
      { name: "Catálogo", href: "/in-house/catalogo", icon: Briefcase },
      { name: "Projetos", href: "/in-house/projetos", icon: FolderOpen, badge: "12" },
      { name: "Equipe", href: "/in-house/equipe", icon: Users, badge: "8" },
      { name: "Financeiro", href: "/in-house/financeiro", icon: Wallet },
      { name: "Relatórios", href: "/in-house/relatorios", icon: BarChart3 },
      { name: "Allkademy", href: "/allkademy", icon: BookOpen },
      { name: "Configurações", href: "/in-house/configuracoes", icon: Settings },
    ],
  },
  agencias: [
    { name: "Dashboard", href: "/agencias/dashboard", icon: LayoutDashboard },
    { name: "Perfil", href: "/agencias/perfil", icon: Building2 },
    { name: "Clientes", href: "/agencias/clientes", icon: Building2, badge: "15" },
    { name: "Projetos", href: "/agencias/projetos", icon: FolderOpen, badge: "24" },
    { name: "Equipe", href: "/agencias/equipe", icon: Users, badge: "8" },
    { name: "Programa", href: "/agencias/programa", icon: Award },
    { name: "Lideradas", href: "/agencias/lideradas", icon: TrendingUp, badge: "5" },
    { name: "Financeiro", href: "/agencias/financeiro", icon: Wallet },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
    { name: "Configurações", href: "/agencias/configuracoes", icon: Settings },
  ],
  nomades: [
    { name: "Dashboard", href: "/nomades/dashboard", icon: LayoutDashboard },
    { name: "Tarefas Disponíveis", href: "/nomades/tarefasdisponiveis", icon: Target, badge: "18" },
    { name: "Minhas Tarefas", href: "/nomades/minhastarefas", icon: CheckSquare, badge: "6" },
    { name: "Habilitações", href: "/nomades/habilitacoes", icon: Award },
    { name: "Histórico", href: "/nomades/historico", icon: History },
    { name: "Programa", href: "/nomades/programa", icon: Star },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet },
    { name: "Perfil", href: "/nomades/perfil", icon: UserCheck },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    {
      name: "Gestão de Contas",
      icon: Users,
      subitems: [
        { name: "Empresas", href: "/admin/empresas", icon: Building2, badge: "32" },
        { name: "Usuários", href: "/admin/usuarios", icon: Users, badge: "589" },
        { name: "Permissões", href: "/admin/permissoes", icon: Shield },
      ],
    },
    {
      name: "Gestão de Projetos",
      icon: FolderOpen,
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
      subitems: [
        { name: "Níveis Agências", href: "/admin/niveis", icon: Building2 },
        { name: "Níveis Nômades", href: "/admin/niveis-nomades", icon: UserCheck },
      ],
    },
    { name: "Financeiro", href: "/admin/financeiro", icon: Wallet },
    { name: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
    {
      name: "Administração",
      icon: Shield,
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

interface MobileMenuSheetProps {
  open: boolean
  onClose: () => void
}

export function MobileMenuSheet({ open, onClose }: MobileMenuSheetProps) {
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

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-0 p-0">
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white rounded-t-3xl overflow-hidden">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white text-lg font-semibold">Menu</SheetTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10 p-2">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
            <nav className="space-y-2">
              {navigation.map((item: any) => {
                if (item.subitems) {
                  const isExpanded = expandedItems.includes(item.name)
                  const hasActiveSubitem = item.subitems.some((subitem: any) => pathname === subitem.href)
                  const Icon = item.icon

                  return (
                    <div key={item.name}>
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={cn(
                          "w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95",
                          hasActiveSubitem
                            ? "bg-white/20 text-white shadow-lg"
                            : "text-white/80 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded && "transform rotate-180",
                          )}
                        />
                      </button>

                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/10 pl-2">
                          {item.subitems.map((subitem: any) => {
                            const isActive = pathname === subitem.href
                            const SubIcon = subitem.icon

                            return (
                              <Link
                                key={subitem.name}
                                to={subitem.href}
                                onClick={onClose}
                                className={cn(
                                  "flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95",
                                  isActive
                                    ? "bg-white/15 text-white shadow-md"
                                    : "text-white/70 hover:bg-white/10 hover:text-white",
                                )}
                              >
                                <SubIcon className="h-4 w-4 mr-3" />
                                <span className="flex-1">{subitem.name}</span>
                                {subitem.badge && (
                                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
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
                      "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95",
                      isActive
                        ? "bg-white/20 text-white shadow-lg"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Profile */}
          <div className="p-6 border-t border-white/10 pb-safe-area">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/10">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile.avatar.startsWith("data:") ? userProfile.avatar : undefined} />
                <AvatarFallback className="bg-blue-600 text-white">
                  {userProfile.avatar.length <= 2
                    ? userProfile.avatar
                    : userProfile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {accountType === "admin" && (
                  <p className="text-sm font-medium text-white truncate">{userProfile.name}</p>
                )}
                <p className="text-xs text-white/70 truncate">
                  {accountType === "admin" ? (userProfile.job_title || userProfile.role) : userProfile.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
