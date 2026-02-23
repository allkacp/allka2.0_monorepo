// @ts-nocheck
import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAccountType } from "@/contexts/account-type-context"
import { useSidebar } from "@/contexts/sidebar-context"
import { AgencyProfileModal } from "@/components/modals/agency-profile-modal"
import { SidebarSettingsModal } from "@/components/modals/sidebar-settings-modal"
import { RegistrationModal } from "@/components/modals/registration-modal"
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
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
  Palette,
  History,
  UserPlus,
  Sparkles,
  ChevronDown,
  Calculator,
  Tag,
  Share2,
  Rocket,
  GripVertical,
  Package,
} from "lucide-react"

const navigationConfig = {
  empresas: {
    company: [
      { name: "Dashboard", href: "/company/dashboard", icon: LayoutDashboard, current: true },
      { name: "Projetos", href: "/company/projetos", icon: FolderOpen, current: false, badge: "8" },
      { name: "Aprovações", href: "/company/aprovacoes", icon: CheckSquare, current: false, badge: "3" },
      { name: "Pagamentos", href: "/company/pagamentos", icon: CreditCard, current: false },
      { name: "Relatórios", href: "/company/relatorios", icon: FileText, current: false },
      { name: "Allkademy", href: "/allkademy", icon: BookOpen, current: false },
    ],
    "in-house": [
      { name: "Dashboard", href: "/in-house/dashboard", icon: LayoutDashboard, current: true },
      { name: "Catálogo", href: "/in-house/catalogo", icon: Briefcase, current: false },
      { name: "Projetos", href: "/in-house/projetos", icon: FolderOpen, current: false, badge: "12" },
      { name: "Equipe", href: "/in-house/equipe", icon: Users, current: false, badge: "8" },
      { name: "Financeiro", href: "/in-house/financeiro", icon: Wallet, current: false },
      { name: "Relatórios", href: "/in-house/relatorios", icon: BarChart3, current: false },
      { name: "Allkademy", href: "/allkademy", icon: BookOpen, current: false },
      { name: "Configurações", href: "/in-house/configuracoes", icon: Settings, current: false },
    ],
  },
  agencias: [
    { name: "Dashboard", href: "/agencias/dashboard", icon: LayoutDashboard, current: true },
    { name: "Perfil", href: "/agencias/perfil", icon: Building2, current: false },
    { name: "Clientes", href: "/agencias/clientes", icon: Building2, current: false, badge: "15" },
    { name: "Projetos", href: "/agencias/projetos", icon: FolderOpen, current: false, badge: "24" },
    { name: "Equipe", href: "/agencias/equipe", icon: Users, current: false, badge: "8" },
    { name: "Programa", href: "/agencias/programa", icon: Award, current: false },
    { name: "Lideradas", href: "/agencias/lideradas", icon: TrendingUp, current: false, badge: "5" },
    { name: "Financeiro", href: "/agencias/financeiro", icon: Wallet, current: false },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen, current: false },
    { name: "Configurações", href: "/agencias/configuracoes", icon: Settings, current: false },
  ],
  nomades: [
    { name: "Dashboard", href: "/nomades/dashboard", icon: LayoutDashboard, current: true },
    { name: "Tarefas Disponíveis", href: "/nomades/tarefasdisponiveis", icon: Target, current: false, badge: "18" },
    { name: "Minhas Tarefas", href: "/nomades/minhastarefas", icon: CheckSquare, current: false, badge: "6" },
    { name: "Habilitações", href: "/nomades/habilitacoes", icon: Award, current: false },
    { name: "Histórico", href: "/nomades/historico", icon: History, current: false },
    { name: "Programa", href: "/nomades/programa", icon: Star, current: false },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet, current: false },
    { name: "Perfil", href: "/nomades/perfil", icon: UserCheck, current: false },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen, current: false },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, current: true },
    {
      name: "Gestão de Contas",
      icon: Users,
      current: false,
      subitems: [
        { name: "Empresas", href: "/admin/empresas", icon: Building2, current: false, badge: "32" },
        { name: "Usuários", href: "/admin/usuarios", icon: Users, current: false, badge: "589" },
        { name: "Permissões", href: "/admin/permissoes", icon: Shield, current: false },
      ],
    },
    {
      name: "Gestão de Projetos",
      icon: FolderOpen,
      current: false,
      subitems: [
        { name: "Projetos", href: "/admin/projetos", icon: FolderOpen, current: false, badge: "156" },
        { name: "Produtos", href: "/admin/produtos", icon: Package, current: false },
        { name: "Precificação", href: "/admin/precificacao", icon: Calculator, current: false },
        { name: "Promoções", href: "/admin/promocoes", icon: Tag, current: false },
        { name: "Campanhas", href: "/admin/campanhas-indicacao", icon: Share2, current: false },
      ],
    },
    {
      name: "Gameficação",
      icon: Star,
      current: false,
      subitems: [
        { name: "Níveis Agências", href: "/admin/niveis", icon: Building2, current: false },
        { name: "Níveis Nômades", href: "/admin/niveis-nomades", icon: UserCheck, current: false },
      ],
    },
    { name: "Financeiro", href: "/admin/financeiro", icon: Wallet, current: false },
    { name: "Relatórios", href: "/admin/relatorios", icon: BarChart3, current: false },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen, current: false },
    {
      name: "Administração",
      icon: Shield,
      current: false,
      subitems: [
        { name: "Sistema", href: "/admin/sistema", icon: Database, current: false },
        { name: "Disponibilidade", href: "/admin/disponibilidade", icon: Target, current: false },
        { name: "Especialidades", href: "/admin/especialidades", icon: Briefcase, current: false },
        { name: "Onboarding", href: "/admin/onboarding", icon: Rocket, current: false },
        { name: "Configurações", href: "/admin/configuracoes", icon: Settings, current: false },
      ],
    },
  ],
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [agencyModalOpen, setAgencyModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [hasMoreContent, setHasMoreContent] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  const [draggedSubitem, setDraggedSubitem] = useState<{ parentIndex: number; subIndex: number } | null>(null)
  const [dragOverSubitem, setDragOverSubitem] = useState<{ parentIndex: number; subIndex: number } | null>(null)
  const [customOrder, setCustomOrder] = useState<string[]>([])
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  const location = useLocation()
  const pathname = location.pathname
  const { accountType, accountSubType } = useAccountType()
  const { sidebarSettings, agencyProfile, userProfile, setSidebarCollapsed, previewTheme, previewEnabled } = useSidebar()

  // Decide which theme to use: preview or saved
  const appliedTheme = previewTheme || sidebarSettings

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed")
    if (savedCollapsed !== null) {
      const isCollapsed = JSON.parse(savedCollapsed)
      setCollapsed(isCollapsed)
      setSidebarCollapsed(isCollapsed)
    }

    const savedOrder = localStorage.getItem(`sidebar-order-${accountType}`)
    if (savedOrder) {
      try {
        setCustomOrder(JSON.parse(savedOrder))
      } catch (e) {
        console.error("Failed to parse saved order:", e)
      }
    }
  }, [accountType])

  const getNavigationItems = () => {
    // Admin users see all menu items
    if (accountType === "admin") {
      return navigationConfig.admin
    }

    // Regular users see only their account type menu
    if (accountType === "empresas") {
      return navigationConfig.empresas[accountSubType || "company"]
    }

    return navigationConfig[accountType] || []
  }

  const toggleCollapsed = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    setSidebarCollapsed(newCollapsed)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newCollapsed))
    window.dispatchEvent(new CustomEvent("sidebar-collapsed-change", { detail: { collapsed: newCollapsed } }))
  }

  const navigation = (() => {
    const baseItems = getNavigationItems()

    if (customOrder.length === 0) {
      return baseItems
    }

    const itemMap = new Map(baseItems.map((item) => [item.name, item]))

    const reordered = customOrder.map((name) => itemMap.get(name)).filter(Boolean) as any[]

    const orderedNames = new Set(customOrder)
    const newItems = baseItems.filter((item) => !orderedNames.has(item.name))

    return [...reordered, ...newItems]
  })()

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverItem(index)
  }

  const handleDragEnd = () => {
    if (draggedItem === null || dragOverItem === null) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    const items = [...navigation]
    const draggedItemContent = items[draggedItem]
    items.splice(draggedItem, 1)
    items.splice(dragOverItem, 0, draggedItemContent)

    const itemNames = items.map((item) => item.name)
    setCustomOrder(itemNames)
    localStorage.setItem(`sidebar-order-${accountType}`, JSON.stringify(itemNames))
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleSubitemDragStart = (e: React.DragEvent, parentIndex: number, subIndex: number) => {
    e.stopPropagation()
    setDraggedSubitem({ parentIndex, subIndex })
    e.dataTransfer.effectAllowed = "move"
  }

  const handleSubitemDragOver = (e: React.DragEvent, parentIndex: number, subIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverSubitem({ parentIndex, subIndex })
  }

  const handleSubitemDragEnd = () => {
    if (!draggedSubitem || !dragOverSubitem || draggedSubitem.parentIndex !== dragOverSubitem.parentIndex) {
      setDraggedSubitem(null)
      setDragOverSubitem(null)
      return
    }

    const items = [...navigation]
    const parentItem = items[draggedSubitem.parentIndex]
    if (!parentItem.subitems) return

    const subitems = [...parentItem.subitems]
    const draggedSubitemContent = subitems[draggedSubitem.subIndex]
    subitems.splice(draggedSubitem.subIndex, 1)
    subitems.splice(dragOverSubitem.subIndex, 0, draggedSubitemContent)

    items[draggedSubitem.parentIndex] = { ...parentItem, subitems }

    const itemNames = items.map((item) => item.name)
    setCustomOrder(itemNames)
    localStorage.setItem(`sidebar-order-${accountType}`, JSON.stringify(itemNames))
    setDraggedSubitem(null)
    setDragOverSubitem(null)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
    setDragOverSubitem(null)
  }

  useEffect(() => {
    const navElement = navRef.current
    if (navElement) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = navElement
        setIsScrolled(scrollTop > 10)
        setHasMoreContent(scrollTop + clientHeight < scrollHeight - 10)
      }

      handleScroll()
      navElement.addEventListener("scroll", handleScroll)
      return () => navElement.removeEventListener("scroll", handleScroll)
    }
  }, [navigation])

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

  const getSidebarStyle = (): React.CSSProperties => {
    // Default style when no background is set or it's the default
    if (!appliedTheme.backgroundColor || appliedTheme.backgroundColor === "bg-slate-900") {
      return {
        background:
          "linear-gradient(to bottom, #000000 0%, #0a1628 8%, #1a2f5a 20%, #2563eb 40%, #3b82f6 60%, #2563eb 80%, #1a2f5a 92%, #0a1628 100%)",
      }
    }

    // Handle background images
    if (appliedTheme.backgroundMode === "image" || appliedTheme.backgroundMode === "image+gradient") {
      if (appliedTheme.backgroundImage) {
        const positionMap = {
          top: "top",
          center: "center",
          bottom: "bottom",
        }

        const alignmentMap = {
          left: "left",
          center: "center",
          right: "right",
        }

        const position = positionMap[appliedTheme.imagePosition || "center"] || "center"
        const alignment = alignmentMap[appliedTheme.imageAlignment || "center"] || "center"
        const scale = (appliedTheme.imageScale || 100) / 100

        const style: React.CSSProperties = {
          backgroundImage: `url(${appliedTheme.backgroundImage})`,
          backgroundSize: `${scale * 100}%`,
          backgroundPosition: `${alignment} ${position}`,
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }

        if (appliedTheme.imageOpacity !== undefined) {
          style.opacity = appliedTheme.imageOpacity / 100
        }

        if (appliedTheme.imageOverlay && appliedTheme.imageOverlay !== "none") {
          const overlayColor =
            appliedTheme.imageOverlay === "blue"
              ? "rgba(30, 58, 138, "
              : appliedTheme.imageOverlay === "purple"
                ? "rgba(88, 28, 135, "
                : "rgba(236, 72, 153, "

          const intensity = (appliedTheme.overlayIntensity || 30) / 100
          style.boxShadow = `inset 0 0 0 9999px ${overlayColor}${intensity})`
        }

        return style
      }
    }

    // Handle gradient backgrounds
    if (
      appliedTheme.backgroundColor.includes("gradient") ||
      appliedTheme.backgroundColor.includes("custom-gradient:")
    ) {
      if (appliedTheme.backgroundColor.startsWith("custom-gradient:")) {
        return {
          background: appliedTheme.backgroundColor.replace("custom-gradient:", ""),
        }
      }

      const gradientMap: Record<string, string> = {
        "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900":
          "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
        "bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900":
          "linear-gradient(to bottom, #0f172a, #1e3a8a, #312e81)",
        "bg-gradient-to-tr from-indigo-900 via-purple-800 to-blue-800":
          "linear-gradient(to top right, #312e81, #6b21a8, #1e40af)",
        "bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900":
          "linear-gradient(to bottom right, #14532d, #065f46, #134e4a)",
        "bg-gradient-to-b from-emerald-900 via-green-800 to-cyan-900":
          "linear-gradient(to bottom, #064e3b, #166534, #164e63)",
        "bg-gradient-to-tr from-teal-900 via-emerald-800 to-green-800":
          "linear-gradient(to top right, #134e4a, #065f46, #166534)",
        "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900":
          "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
        "bg-gradient-to-b from-indigo-900 via-purple-800 to-fuchsia-900":
          "linear-gradient(to bottom, #312e81, #6b21a8, #701a75)",
        "bg-gradient-to-tr from-violet-900 via-purple-800 to-pink-900":
          "linear-gradient(to top right, #4c1d95, #6b21a8, #831843)",
        "bg-gradient-to-br from-red-900 via-orange-800 to-amber-900":
          "linear-gradient(to bottom right, #7f1d1d, #9a3412, #78350f)",
        "bg-gradient-to-b from-orange-900 via-red-800 to-rose-900":
          "linear-gradient(to bottom, #7c2d12, #991b1b, #881337)",
        "bg-gradient-to-tr from-rose-900 via-red-800 to-pink-900":
          "linear-gradient(to top right, #881337, #991b1b, #831843)",
        "bg-gradient-to-br from-slate-900 via-gray-800 to-zinc-900":
          "linear-gradient(to bottom right, #0f172a, #1f2937, #18181b)",
        "bg-gradient-to-b from-neutral-900 via-stone-800 to-slate-900":
          "linear-gradient(to bottom, #171717, #292524, #0f172a)",
        "bg-gradient-to-tr from-black via-slate-900 to-gray-900":
          "linear-gradient(to top right, #000000, #0f172a, #111827)",
      }

      return {
        background: gradientMap[appliedTheme.backgroundColor] || appliedTheme.backgroundColor.replace("bg-", ""),
      }
    }

    return {}
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        data-sidebar-root
        className={cn(
          "flex flex-col h-screen text-white transition-all duration-300 relative overflow-hidden brand-surface",
          !appliedTheme.backgroundColor.includes("gradient") &&
            !appliedTheme.backgroundColor.includes("custom-gradient:") &&
            appliedTheme.backgroundColor !== "bg-slate-900" &&
            appliedTheme.backgroundColor,
          collapsed ? "w-16" : "w-64",
        )}
        style={getSidebarStyle()}
      >
        <div className={cn(
          "relative flex items-center border-b border-white/10 backdrop-blur-sm transition-all duration-300 group",
          collapsed ? "justify-center py-1 px-4 flex-col" : "justify-between p-4 flex-row"
        )}>
          <div className="relative flex items-center justify-center">
            {collapsed ? (
              <>
                <img
                  src="/logo-allka-icon.png"
                  alt="ALLKA"
                  className="h-20 w-20 object-contain transition-all duration-300 drop-shadow-lg"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapsed}
                  className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 p-2 rounded-full opacity-0 group-hover:opacity-100"
                  title="Expandir Sidebar"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <img
                src="/logo-allka-full.png"
                alt="ALLKA Logo"
                className="h-10 w-auto object-contain transition-all duration-300 drop-shadow-lg"
              />
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsModalOpen(true)}
                className="text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 p-2"
                title="Personalizar Sidebar"
              >
                <Palette className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapsed}
                className="hidden lg:flex text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 p-2"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsModalOpen(true)}
                  className="text-white hover:bg-white/10 backdrop-blur-sm transition-all duration-200 p-1.5 h-8 w-8 flex items-center justify-center"
                  title="Personalizar Cores"
                >
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-white/90 text-gray-900 text-xs font-medium">
                Personalizar Cores
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {accountType === "agencias" && !collapsed && (
          <div className="relative px-4 py-3 border-b border-white/10 backdrop-blur-sm">
            <button
              onClick={() => setAgencyModalOpen(true)}
              className="w-full group relative overflow-hidden rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-300 p-3 border border-white/10 hover:border-white/20"
            >
              <div className="relative flex items-center space-x-3">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-12 w-12 ring-2 ring-white/20 group-hover:ring-white/30 transition-all duration-300">
                    <AvatarImage src={agencyProfile.logo || "/placeholder.svg"} alt={agencyProfile.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-pink-500 text-white">
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-pink-500 rounded-full p-1 shadow-lg">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-blue-100 transition-colors">
                    {agencyProfile.name}
                  </p>
                  <Badge className="mt-1 bg-white/20 hover:bg-white/25 text-white border-white/20 text-xs px-2 py-0.5 transition-colors">
                    {agencyProfile.planType}
                  </Badge>
                </div>
              </div>
            </button>
          </div>
        )}

        <nav
          ref={navRef}
          className={cn(
            "relative flex-1 px-3 py-4 space-y-1 backdrop-blur-sm overflow-y-auto sidebar-scrollbar scroll-fade-top scroll-fade-bottom",
            isScrolled && "scrolled",
            hasMoreContent && "has-more",
          )}
        >
          {navigation.map((item: any, index: number) => {
            if (item.subitems) {
              const isExpanded = expandedItems.includes(item.name)
              const hasActiveSubitem = item.subitems.some((subitem: any) => pathname === subitem.href)

              if (collapsed) {
                return (
                  <Popover
                    key={item.name}
                    open={openPopover === item.name}
                    onOpenChange={(open) => setOpenPopover(open ? item.name : null)}
                  >
                    <PopoverTrigger asChild>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragLeave={handleDragLeave}
                        className={cn(
                          "transition-all duration-200",
                          dragOverItem === index && "border-t-2 border-white/50",
                          draggedItem === index && "opacity-50",
                        )}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className={cn(
                                "w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                hasActiveSubitem
                                  ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                                  : "text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                              )}
                            >
                              <item.icon className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">{item.name}</TooltipContent>
                        </Tooltip>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      className="w-64 p-2 bg-slate-900/95 backdrop-blur-xl border-white/10 shadow-2xl"
                      sideOffset={8}
                    >
                      <div className="space-y-1">
                        <div className="px-3 py-2 text-sm font-semibold text-white/90 border-b border-white/10 mb-2">
                          {item.name}
                        </div>
                        {item.subitems.map((subitem: any) => {
                          const isActive = pathname === subitem.href
                          return (
                            <Link
                              key={subitem.name}
                              to={subitem.href}
                              onClick={() => setOpenPopover(null)}
                              className={cn(
                                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-white/15 text-white shadow-md"
                                  : "text-white/70 hover:bg-white/10 hover:text-white",
                              )}
                            >
                              <subitem.icon className="h-4 w-4 mr-3" />
                              <span className="flex-1 truncate">{subitem.name}</span>
                              {subitem.badge && (
                                <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                                  {subitem.badge}
                                </Badge>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              }

              return (
                <div
                  key={item.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "transition-all duration-200",
                    dragOverItem === index && "border-t-2 border-white/50",
                    draggedItem === index && "opacity-50",
                  )}
                >
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={cn(
                      "w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                      hasActiveSubitem
                        ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                    )}
                  >
                    <GripVertical className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" />
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="flex-1 truncate text-left">{item.name}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "transform rotate-180")}
                    />
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/10 pl-2">
                      {item.subitems.map((subitem: any, subIndex: number) => {
                        const isActive = pathname === subitem.href
                        return (
                          <div
                            key={subitem.name}
                            draggable
                            onDragStart={(e) => handleSubitemDragStart(e, index, subIndex)}
                            onDragOver={(e) => handleSubitemDragOver(e, index, subIndex)}
                            onDragEnd={handleSubitemDragEnd}
                            className={cn(
                              "transition-all duration-200",
                              dragOverSubitem?.parentIndex === index &&
                                dragOverSubitem?.subIndex === subIndex &&
                                "border-t-2 border-white/50",
                              draggedSubitem?.parentIndex === index &&
                                draggedSubitem?.subIndex === subIndex &&
                                "opacity-50",
                            )}
                          >
                            <Link to={subitem.href}
                              className={cn(
                                "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                                isActive
                                  ? "bg-white/15 text-white shadow-md backdrop-blur-sm"
                                  : "text-white/70 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                              )}
                            >
                              <GripVertical className="h-3 w-3 mr-1 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" />
                              <subitem.icon className="h-4 w-4 mr-3" />
                              <span className="flex-1 truncate">{subitem.name}</span>
                              {subitem.badge && (
                                <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm text-xs">
                                  {subitem.badge}
                                </Badge>
                              )}
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isActive = pathname === item.href
            return (
              <div
                key={item.name}
                draggable={!collapsed}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
                className={cn(
                  "transition-all duration-200",
                  dragOverItem === index && "border-t-2 border-white/50",
                  draggedItem === index && "opacity-50",
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to={item.href}
                      className={cn(
                        "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                        isActive
                          ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                        collapsed && "justify-center",
                      )}
                    >
                      {!collapsed && (
                        <GripVertical className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" />
                      )}
                      <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <div className="flex items-center gap-2">
                        {item.name}
                        {item.badge && (
                          <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="relative px-4 pb-4 backdrop-blur-sm">
            <Button
              onClick={() => setRegistrationOpen(true)}
              className="w-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all duration-200"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Criar Conta
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AgencyProfileModal open={agencyModalOpen} onClose={() => setAgencyModalOpen(false)} />
      <SidebarSettingsModal open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
      <RegistrationModal open={registrationOpen} onClose={() => setRegistrationOpen(false)} />
    </TooltipProvider>
  )
}
