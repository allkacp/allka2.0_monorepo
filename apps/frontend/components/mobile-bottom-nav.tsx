
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAccountType } from "@/contexts/account-type-context"
import { useSidebar } from "@/contexts/sidebar-context"
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  Wallet,
  Building2,
  Award,
  CreditCard,
  Target,
  Briefcase,
  BarChart3,
  MoreHorizontal,
  Home,
  UserCheck,
  History,
  Star,
  TrendingUp,
} from "lucide-react"

// ─── Configuração de Navegação por Perfil ────────────────────────────────────
const mobileNavigationConfig = {
  empresas: {
    company: [
      { name: "Início", href: "/company/dashboard", icon: Home },
      { name: "Projetos", href: "/company/projetos", icon: FolderOpen },
      { name: "Tarefas", href: "/company/tarefas", icon: CheckSquare },
      { name: "Faturas", href: "/company/faturas", icon: CreditCard },
      { name: "Mais", href: "#", icon: MoreHorizontal, isMenu: true },
    ],
    "in-house": [
      { name: "Início", href: "/in-house/dashboard", icon: Home },
      { name: "Catálogo", href: "/in-house/catalogo", icon: Briefcase },
      { name: "Projetos", href: "/in-house/projetos", icon: FolderOpen },
      { name: "Equipe", href: "/in-house/equipe", icon: Users },
      { name: "Mais", href: "#", icon: MoreHorizontal, isMenu: true },
    ],
  },
  agencias: [
    { name: "Início", href: "/agency/dashboard", icon: Home },
    { name: "Projetos", href: "/agency/projetos", icon: FolderOpen },
    { name: "Tarefas", href: "/agency/tarefas", icon: CheckSquare },
    { name: "Financeiro", href: "/agency/financeiro", icon: Wallet },
    { name: "Mais", href: "#", icon: MoreHorizontal, isMenu: true },
  ],
  nomades: [
    { name: "Início", href: "/nomad/dashboard", icon: Home },
    { name: "Tarefas", href: "/nomades/tarefasdisponiveis", icon: Target },
    { name: "Minhas", href: "/nomades/minhastarefas", icon: CheckSquare },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet },
    { name: "Mais", href: "#", icon: MoreHorizontal, isMenu: true },
  ],
  parceiro: [
    { name: "Início", href: "/partner/dashboard", icon: Home },
    { name: "Projetos", href: "/partner/projetos", icon: FolderOpen },
    { name: "Comissões", href: "/partner/comissoes", icon: TrendingUp },
    { name: "Saques", href: "/partner/saques", icon: Wallet },
    { name: "Mais", href: "#", icon: MoreHorizontal, isMenu: true },
  ],
  lider: [
    { name: "Início", href: "/leader/dashboard", icon: Home },
    { name: "Tarefas", href: "/leader/tarefas", icon: CheckSquare },
    { name: "Qualif.", href: "/leader/qualificacao", icon: Award },
    { name: "Histórico", href: "/leader/historico", icon: History },
    { name: "Mais", href: "#", icon: MoreHorizontal, isMenu: true },
  ],
  admin: [
    { name: "Início", href: "/admin/dashboard", icon: Home },
    { name: "Empresas", href: "/admin/empresas", icon: Building2 },
    { name: "Nômades", href: "/admin/nomades", icon: UserCheck },
    { name: "Projetos", href: "/admin/projetos", icon: FolderOpen },
    { name: "Mais", href: "#", icon: MoreHorizontal, isMenu: true },
  ],
}

// Mapa de gradientes (sincronizado com o sidebar)
const gradientMap: Record<string, string> = {
  "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900": "linear-gradient(135deg, #1e3a8a, #1e40af, #164e63)",
  "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900": "linear-gradient(180deg, #0f172a, #1e3a8a, #312e81)",
  "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800": "linear-gradient(135deg, #312e81, #6b21a8, #1e40af)",
  "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900": "linear-gradient(135deg, #14532d, #065f46, #134e4a)",
  "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900": "linear-gradient(135deg, #581c87, #5b21b6, #312e81)",
  "bg-gradient-to-br from-red-900 via-orange-800 to-amber-900": "linear-gradient(135deg, #7f1d1d, #9a3412, #78350f)",
  "bg-gradient-to-br from-slate-900 via-gray-800 to-zinc-900": "linear-gradient(135deg, #0f172a, #1f2937, #18181b)",
  "bg-gradient-to-tr from-black via-slate-900 to-gray-900": "linear-gradient(135deg, #000000, #0f172a, #111827)",
}

interface MobileBottomNavProps {
  onMenuClick: () => void
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const location = useLocation()
  const pathname = location.pathname
  const { accountType, accountSubType } = useAccountType()
  const { sidebarSettings, previewTheme } = useSidebar()

  // Auto-hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      setLastScrollY(currentScrollY)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const getNavigationItems = () => {
    if (accountType === "admin") return mobileNavigationConfig.admin
    if (accountType === "empresas") {
      const subType = accountSubType || "company"
      return mobileNavigationConfig.empresas[subType as keyof typeof mobileNavigationConfig.empresas]
        ?? mobileNavigationConfig.empresas.company
    }
    const items = mobileNavigationConfig[accountType as keyof typeof mobileNavigationConfig]
    return Array.isArray(items) ? items : mobileNavigationConfig.empresas.company
  }

  const navigation = getNavigationItems()

  // Obtém o estilo de fundo do tema do sidebar
  const appliedTheme = previewTheme || sidebarSettings
  const bg = appliedTheme?.backgroundColor

  const getNavStyle = (): React.CSSProperties => {
    if (!bg || bg === "bg-slate-900") {
      return { background: "linear-gradient(180deg, #0a1628 0%, #000000 100%)" }
    }
    if (bg.startsWith("custom-gradient:")) {
      return { background: bg.replace("custom-gradient:", "") }
    }
    if (bg.includes("gradient")) {
      return { background: gradientMap[bg] || "#0f172a" }
    }
    return {}
  }

  const isGradientBg = !bg || bg === "bg-slate-900" || bg.includes("gradient") || bg.startsWith("custom-gradient:")

  return (
    <div
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 mobile-nav-transition",
        isVisible ? "translate-y-0" : "translate-y-full",
        !isGradientBg && bg,
      )}
      style={getNavStyle()}
    >
      {/* Linha de separação no topo com gradiente sutil */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

      {/* Área de navegação */}
      <div className="flex items-end justify-around px-1 pt-2 pb-1">
        {navigation.map((item) => {
          const isActive = !item.isMenu && (pathname === item.href || (item.href !== "#" && pathname.startsWith(item.href + "/")))
          const Icon = item.icon

          if (item.isMenu) {
            return (
              <button
                key={item.name}
                onClick={onMenuClick}
                className="flex flex-col items-center justify-center flex-1 py-1.5 gap-1 active:scale-90 transition-all duration-150"
                aria-label="Abrir menu"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 text-white/50 hover:text-white/80 hover:bg-white/10">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-white/50 leading-none">{item.name}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1.5 gap-1 active:scale-90 transition-all duration-150"
              aria-label={item.name}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200",
                  isActive
                    ? "bg-white/20 shadow-lg shadow-black/20 scale-110"
                    : "text-white/50 hover:text-white/80 hover:bg-white/10",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive ? "text-white" : "text-white/50",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none transition-all duration-200",
                  isActive ? "text-white font-semibold" : "text-white/50",
                )}
              >
                {item.name}
              </span>
              {/* Indicador de ativo - ponto brilhante */}
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-white opacity-80 mt-0.5" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Safe area para dispositivos com home indicator */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  )
}
