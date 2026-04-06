// @ts-nocheck
import {
  Search, Bell, Menu, X, Wallet, Star, TrendingUp,
  ChevronDown, LogOut, Settings, User, CreditCard,
  FolderOpen, Award, Shield, DollarSign, CheckSquare,
  Building2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAccountType } from "@/contexts/account-type-context"
import { useSidebar } from "@/contexts/sidebar-context"
import { AlertsHeaderIcon } from "@/components/alerts-header-icon"
import { usePartner } from "@/contexts/partner-context"
import { useEmpresa } from "@/contexts/empresa-context"
import { useAgencia } from "@/contexts/agencia-context"

const LEVEL_CONFIG = {
  bronze:   { label: "Bronze",   bg: "bg-amber-100",  text: "text-amber-700"  },
  silver:   { label: "Prata",    bg: "bg-slate-100",  text: "text-slate-600"  },
  gold:     { label: "Ouro",     bg: "bg-yellow-100", text: "text-yellow-700" },
  platinum: { label: "Platina",  bg: "bg-cyan-100",   text: "text-cyan-700"   },
  diamond:  { label: "Diamante", bg: "bg-violet-100", text: "text-violet-700" },
}

const ACCOUNT_CONFIG = {
  admin:    { color: "text-rose-600",   badgeBg: "bg-rose-50",   badgeBorder: "border-rose-200"   },
  nomades:  { color: "text-amber-600",  badgeBg: "bg-amber-50",  badgeBorder: "border-amber-200"  },
  empresas: { color: "text-violet-600", badgeBg: "bg-violet-50", badgeBorder: "border-violet-200" },
  agencias: { color: "text-indigo-600", badgeBg: "bg-indigo-50", badgeBorder: "border-indigo-200" },
  parceiro: { color: "text-blue-600",   badgeBg: "bg-blue-50",   badgeBorder: "border-blue-200"   },
}

function fmtBRL(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
}

function getInitials(name) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)

  const navigate = useNavigate()
  const { accountType, unlockAccountType } = useAccountType()
  const { userProfile } = useSidebar()
  const partner = usePartner()
  const empresa = useEmpresa()
  const agencia = useAgencia()

  const toggleMobileSidebar = () => {
    const sidebar = document.getElementById("mobile-sidebar")
    const overlay = document.getElementById("sidebar-overlay")
    if (sidebar && overlay) {
      if (mobileMenuOpen) {
        sidebar.classList.add("-translate-x-full")
        overlay.classList.add("hidden")
      } else {
        sidebar.classList.remove("-translate-x-full")
        overlay.classList.remove("hidden")
      }
      setMobileMenuOpen(!mobileMenuOpen)
    }
  }

  useEffect(() => {
    const overlay = document.getElementById("sidebar-overlay")
    if (overlay) {
      overlay.addEventListener("click", toggleMobileSidebar)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("simulatedUser")
    unlockAccountType()
    window.location.reload()
  }

  const ctx = (() => {
    if (accountType === "parceiro") {
      const p = partner.profile
      const lvl = LEVEL_CONFIG[p.level ?? "bronze"]
      return {
        name: p.name, email: p.email, initials: getInitials(p.name),
        roleLabel: "Parceiro", levelBadge: lvl,
        wallet: { label: "Saldo disponivel", value: fmtBRL(p.balance), icon: Wallet, color: "text-blue-600" },
        stat: { label: "Total ganho", value: fmtBRL(p.totalEarned), icon: TrendingUp },
        settingsPath: "/parceiro/dashboard",
        menuItems: [
          { label: "Meu Perfil",  icon: User,       path: "/parceiro/dashboard" },
          { label: "Comissoes",   icon: DollarSign, path: "/parceiro/comissoes" },
          { label: "Saques",      icon: Wallet,     path: "/parceiro/saques"    },
          { label: "Agencias",    icon: Building2,  path: "/parceiro/agencias"  },
        ],
      }
    }
    if (accountType === "empresas") {
      const p = empresa.profile
      const activeCount = empresa.projects.filter((x) => !["entregue","cancelado"].includes(x.status)).length
      return {
        name: p.name, email: p.email, initials: getInitials(p.name),
        roleLabel: "Empresa", levelBadge: null,
        wallet: { label: "Total investido", value: fmtBRL(p.totalInvested), icon: CreditCard, color: "text-violet-600" },
        stat: { label: "Projetos ativos", value: String(activeCount), icon: FolderOpen },
        settingsPath: "/empresa/dashboard",
        menuItems: [
          { label: "Minha Empresa", icon: Building2,   path: "/empresa/dashboard" },
          { label: "Projetos",      icon: FolderOpen,  path: "/empresa/projetos"  },
          { label: "Tarefas",       icon: CheckSquare, path: "/empresa/tarefas"   },
          { label: "Faturas",       icon: CreditCard,  path: "/empresa/faturas"   },
        ],
      }
    }
    if (accountType === "agencias") {
      const p = agencia.profile
      return {
        name: p.name, email: p.email, initials: getInitials(p.name),
        roleLabel: "Agencia", levelBadge: null,
        wallet: { label: "MRR mensal", value: fmtBRL(p.currentMrr) + "/mes", icon: TrendingUp, color: "text-indigo-600" },
        stat: { label: "Projetos", value: String(p.totalProjects), icon: FolderOpen },
        settingsPath: "/agencia/dashboard",
        menuItems: [
          { label: "Minha Agencia", icon: Building2,   path: "/agencia/dashboard"  },
          { label: "Projetos",      icon: FolderOpen,  path: "/agencia/projetos"   },
          { label: "Tarefas",       icon: CheckSquare, path: "/agencia/tarefas"    },
          { label: "Financeiro",    icon: Wallet,      path: "/agencia/financeiro" },
        ],
      }
    }
    if (accountType === "nomades") {
      const name = userProfile.name || "Nomade"
      return {
        name, email: userProfile.email || "", initials: getInitials(name),
        roleLabel: "Nomade", levelBadge: null,
        wallet: { label: "Ganhos no mes", value: "R$ 3.280", icon: Wallet, color: "text-amber-600" },
        stat: { label: "Pontos", value: "1.250 pts", icon: Star },
        settingsPath: "/nomades/perfil",
        menuItems: [
          { label: "Meu Perfil",     icon: User,        path: "/nomades/perfil"        },
          { label: "Minhas Tarefas", icon: CheckSquare, path: "/nomades/minhastarefas" },
          { label: "Ganhos",         icon: DollarSign,  path: "/nomades/ganhos"        },
          { label: "Habilitacoes",   icon: Award,       path: "/nomades/habilitacoes"  },
        ],
      }
    }
    const name = userProfile.name || "Admin Sistema"
    return {
      name, email: userProfile.email || "admin@allka.com.br", initials: getInitials(name),
      roleLabel: "Administrador", levelBadge: null,
      wallet: null, stat: null,
      settingsPath: "/admin/configuracoes",
      menuItems: [
        { label: "Meu Perfil",    icon: User,     path: "/admin/dashboard"     },
        { label: "Usuarios",      icon: Shield,   path: "/admin/usuarios"      },
        { label: "Permissoes",    icon: Shield,   path: "/admin/permissoes"    },
        { label: "Configuracoes", icon: Settings, path: "/admin/configuracoes" },
      ],
    }
  })()

  const cfg = ACCOUNT_CONFIG[accountType] ?? ACCOUNT_CONFIG.admin

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 relative z-40 bg-white dark:bg-slate-950 transition-colors duration-200 overflow-visible shadow-sm">
      <div className="flex items-center justify-between h-14 gap-3 overflow-visible">

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="ghost" size="sm" className="lg:hidden p-2 shrink-0" onClick={toggleMobileSidebar}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className={`transition-all duration-200 ${searchFocused ? "flex-1" : "w-56 sm:w-72"}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar..."
                className="pl-9 h-8 text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-slate-800 rounded-full"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">

          {ctx.stat && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-xs">
              <ctx.stat.icon className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">{ctx.stat.value}</span>
              <span className="text-gray-400 hidden lg:inline">{ctx.stat.label}</span>
            </div>
          )}

          {ctx.wallet && (
            <button
              onClick={() => navigate(ctx.menuItems[0]?.path ?? "/")}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all hover:opacity-80 active:scale-95 ${cfg.badgeBg} ${cfg.badgeBorder} ${ctx.wallet.color}`}
            >
              <ctx.wallet.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden md:inline">{ctx.wallet.value}</span>
            </button>
          )}

          <AlertsHeaderIcon />

          <div className="relative">
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none pointer-events-none">
                2
              </span>
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group outline-none">
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-white dark:ring-slate-900 shadow-sm">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="bg-linear-to-br from-blue-600 to-purple-600 text-white text-xs font-bold">
                    {ctx.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left max-w-36">
                  <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-white truncate">{ctx.name}</p>
                  <div className="flex items-center gap-1">
                    <p className={`text-[10px] leading-tight font-medium ${cfg.color}`}>{ctx.roleLabel}</p>
                    {ctx.levelBadge && (
                      <span className={`px-1.5 py-px rounded-full text-[9px] font-bold ${ctx.levelBadge.bg} ${ctx.levelBadge.text}`}>
                        {ctx.levelBadge.label}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block group-hover:text-gray-600 transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1.5 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900">

              <div className={`px-3 py-2.5 rounded-xl mb-1 border ${cfg.badgeBg} ${cfg.badgeBorder}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-linear-to-br from-blue-600 to-purple-600 text-white text-xs font-bold">
                      {ctx.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{ctx.name}</p>
                    <div className="flex items-center gap-1">
                      <p className={`text-[11px] font-medium ${cfg.color}`}>{ctx.roleLabel}</p>
                      {ctx.levelBadge && (
                        <span className={`px-1.5 py-px rounded-full text-[9px] font-bold ${ctx.levelBadge.bg} ${ctx.levelBadge.text}`}>
                          {ctx.levelBadge.label}
                        </span>
                      )}
                    </div>
                    {ctx.email && <p className="text-[10px] text-gray-400 truncate mt-0.5">{ctx.email}</p>}
                  </div>
                </div>
                {ctx.wallet && (
                  <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <ctx.wallet.icon className="h-3.5 w-3.5" />
                      {ctx.wallet.label}
                    </div>
                    <span className={`text-sm font-bold ${ctx.wallet.color}`}>{ctx.wallet.value}</span>
                  </div>
                )}
              </div>

              {ctx.menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                >
                  <item.icon className="h-4 w-4 text-gray-400 shrink-0" />
                  {item.label}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={() => navigate(ctx.settingsPath)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm text-gray-700 dark:text-gray-300"
              >
                <Settings className="h-4 w-4 text-gray-400 shrink-0" />
                Configuracoes
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm text-red-600 dark:text-red-400 hover:bg-red-50 focus:bg-red-50 focus:text-red-600"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
