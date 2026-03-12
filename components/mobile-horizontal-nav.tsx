// @ts-nocheck
import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useAccountType } from "@/contexts/account-type-context"
import { LayoutDashboard, Users, FolderOpen, CheckSquare, Wallet, Building2, Award, CreditCard, Target, Briefcase, BarChart3, Menu, UserCheck, TrendingUp, FileText, Star, History, BookOpen, Settings, Shield, Database, Calculator, Tag, Share2, Rocket, Package } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronLeft } from 'lucide-react'

const mobileNavigationConfig = {
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
      { name: "Config", href: "/in-house/configuracoes", icon: Settings },
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
    { name: "Config", href: "/agencias/configuracoes", icon: Settings },
  ],
  nomades: [
    { name: "Dashboard", href: "/nomades/dashboard", icon: LayoutDashboard },
    { name: "Disponíveis", href: "/nomades/tarefasdisponiveis", icon: Target, badge: "18" },
    { name: "Minhas", href: "/nomades/minhastarefas", icon: CheckSquare, badge: "6" },
    { name: "Habilitações", href: "/nomades/habilitacoes", icon: Award },
    { name: "Histórico", href: "/nomades/historico", icon: History },
    { name: "Programa", href: "/nomades/programa", icon: Star },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet },
    { name: "Perfil", href: "/nomades/perfil", icon: UserCheck },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Clientes", href: "/admin/clientes", icon: Building2, badge: "89" },
    { name: "Nômades", href: "/admin/nomades", icon: UserCheck, badge: "456" },
    { name: "Agências", href: "/admin/agencias", icon: Building2, badge: "32" },
    { name: "Internos", href: "/admin/usuarios-internos", icon: Users, badge: "12" },
    { name: "Projetos", href: "/admin/projetos", icon: FolderOpen, badge: "156" },
    { name: "Produtos", href: "/admin/produtos", icon: Package },
    { name: "Preços", href: "/admin/precificacao", icon: Calculator },
    { name: "Campanhas", href: "/admin/campanhas-indicacao", icon: Share2 },
    { name: "Níveis", href: "/admin/niveis", icon: Star },
    { name: "Financeiro", href: "/admin/financeiro", icon: Wallet },
    { name: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
    { name: "Sistema", href: "/admin/sistema", icon: Database },
    { name: "Config", href: "/admin/configuracoes", icon: Settings },
  ],
}

interface MobileHorizontalNavProps {
  onMenuClick: () => void
}

export function MobileHorizontalNav({ onMenuClick }: MobileHorizontalNavProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showLeftGradient, setShowLeftGradient] = useState(false)
  const [showRightGradient, setShowRightGradient] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const pathname = location.pathname
  const { accountType, accountSubType } = useAccountType()

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
    if (accountType === "admin") {
      return mobileNavigationConfig.admin
    }

    if (accountType === "empresas") {
      const subType = accountSubType || "company"
      return mobileNavigationConfig.empresas[subType as keyof typeof mobileNavigationConfig.empresas] || mobileNavigationConfig.empresas.company
    }

    return mobileNavigationConfig[accountType as keyof typeof mobileNavigationConfig] || mobileNavigationConfig.empresas.company
  }

  const navigation = getNavigationItems()

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    setShowLeftGradient(target.scrollLeft > 10)
    setShowRightGradient(target.scrollLeft < target.scrollWidth - target.clientWidth - 10)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartX(e.touches[0].pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 2
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 2
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  return (
    <div
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 border-t border-white/10 shadow-2xl transition-transform duration-300",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />

      <div className="relative">
        {showLeftGradient && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        )}

        {showRightGradient && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-indigo-950 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          id="horizontal-nav-container"
          onScroll={handleScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          className={cn(
            "flex items-center gap-1 px-3 py-3 overflow-x-auto scrollbar-hide scroll-smooth",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 active:scale-95 min-w-[70px]"
          >
            <Menu className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium">Menu</span>
          </Button>

          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={(e) => {
                  if (isDragging) {
                    e.preventDefault()
                  }
                }}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all duration-200 active:scale-95 min-w-[70px] relative",
                  isActive
                    ? "bg-white/20 text-white shadow-lg"
                    : "bg-white/5 hover:bg-white/15 text-white/80",
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 mb-1" />
                  {item.badge && (
                    <Badge className="absolute -top-2 -right-3 h-4 w-4 flex items-center justify-center p-0 text-[9px] font-bold bg-red-500 text-white border border-slate-950">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">{item.name}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-blue-400 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="h-safe-area-inset-bottom bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950" />
    </div>
  )
}
