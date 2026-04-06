
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAccountType } from "@/contexts/account-type-context"
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
  Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const mobileNavigationConfig = {
  empresas: {
    company: [
      { name: "Dashboard", href: "/company/dashboard", icon: LayoutDashboard, label: "Início" },
      { name: "Projetos", href: "/company/projetos", icon: FolderOpen, label: "Projetos", badge: "8" },
      { name: "Aprovações", href: "/company/aprovacoes", icon: CheckSquare, label: "Aprovações", badge: "3" },
      { name: "Pagamentos", href: "/company/pagamentos", icon: CreditCard, label: "Pagamentos" },
      { name: "Menu", href: "#", icon: Menu, label: "Menu", isMenu: true },
    ],
    "in-house": [
      { name: "Dashboard", href: "/in-house/dashboard", icon: LayoutDashboard, label: "Início" },
      { name: "Catálogo", href: "/in-house/catalogo", icon: Briefcase, label: "Catálogo" },
      { name: "Projetos", href: "/in-house/projetos", icon: FolderOpen, label: "Projetos", badge: "12" },
      { name: "Equipe", href: "/in-house/equipe", icon: Users, label: "Equipe", badge: "8" },
      { name: "Menu", href: "#", icon: Menu, label: "Menu", isMenu: true },
    ],
  },
  agencias: [
    { name: "Dashboard", href: "/agencias/dashboard", icon: LayoutDashboard, label: "Início" },
    { name: "Clientes", href: "/agencias/clientes", icon: Building2, label: "Clientes", badge: "15" },
    { name: "Projetos", href: "/agencias/projetos", icon: FolderOpen, label: "Projetos", badge: "24" },
    { name: "Partner", href: "/agencias/programa", icon: Award, label: "Partner" },
    { name: "Menu", href: "#", icon: Menu, label: "Menu", isMenu: true },
  ],
  nomades: [
    { name: "Dashboard", href: "/nomades/dashboard", icon: LayoutDashboard, label: "Início" },
    { name: "Tarefas", href: "/nomades/tarefasdisponiveis", icon: Target, label: "Tarefas", badge: "18" },
    { name: "Minhas", href: "/nomades/minhastarefas", icon: CheckSquare, label: "Minhas", badge: "6" },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet, label: "Ganhos" },
    { name: "Menu", href: "#", icon: Menu, label: "Menu", isMenu: true },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, label: "Início" },
    { name: "Usuários", href: "/admin/usuarios", icon: Users, label: "Usuários", badge: "1.2k" },
    { name: "Empresas", href: "/admin/empresas", icon: Building2, label: "Empresas", badge: "89" },
    { name: "Config", href: "/admin/configuracoes", icon: BarChart3, label: "Config" },
    { name: "Menu", href: "#", icon: Menu, label: "Menu", isMenu: true },
  ],
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

  // Auto-hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
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
    // Admin users see admin menu
    if (accountType === "admin") {
      return mobileNavigationConfig.admin
    }

    // Regular users see only their account type menu
    if (accountType === "empresas") {
      const subType = accountSubType || "company"
      const items = mobileNavigationConfig.empresas[subType as keyof typeof mobileNavigationConfig.empresas]
      return items || mobileNavigationConfig.empresas.company
    }

    const items = mobileNavigationConfig[accountType as keyof typeof mobileNavigationConfig]

    // Ensure we always return an array
    if (Array.isArray(items)) {
      return items
    }

    // Fallback to empresas company if something goes wrong
    return mobileNavigationConfig.empresas.company
  }

  const navigation = getNavigationItems()

  const handleItemClick = (item: any) => {
    if (item.isMenu) {
      onMenuClick()
    }
  }

  return (
    <div
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 mobile-nav-blur border-t border-gray-200 mobile-nav-transition",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

      <div className="flex items-center justify-around px-2 py-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href && !item.isMenu
          const Icon = item.icon

          return (
            <div key={item.name} className="flex-1">
              {item.isMenu ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-16 px-1 py-2 rounded-xl transition-all duration-200",
                    "text-gray-600 hover:text-blue-600 hover:bg-blue-50 active:scale-95",
                  )}
                >
                  <div className="relative">
                    <Icon className="h-6 w-6 mb-1" />
                  </div>
                  <span className="text-xs font-medium leading-none">{item.label}</span>
                </Button>
              ) : (
                <Link to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-16 px-1 py-2 rounded-xl transition-all duration-200 active:scale-95",
                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600 hover:bg-blue-50",
                  )}
                >
                  <div className="relative">
                    <Icon className="h-6 w-6 mb-1" />
                    {item.badge && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold bg-red-500 text-white border-2 border-white"
                      >
                        {item.badge.length > 2 ? "9+" : item.badge}
                      </Badge>
                    )}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span
                    className={cn("text-xs font-medium leading-none", isActive ? "text-blue-600" : "text-gray-600")}
                  >
                    {item.label}
                  </span>
                </Link>
              )}
            </div>
          )
        })}
      </div>

      <div className="h-safe-area-inset-bottom bg-white/95" />
    </div>
  )
}
