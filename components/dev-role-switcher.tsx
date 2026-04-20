import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown, Check } from "lucide-react"
import { useAccountType, type AccountType, type AccountSubType } from "@/contexts/account-type-context"

const ROLES: Array<{
  id: string
  label: string
  description: string
  path: string
  loginPath: string
  prefix: string
  color: string
  emoji: string
  accountType: AccountType
  accountSubType: AccountSubType
}> = [
  {
    id: "admin",
    label: "Administrador",
    description: "Painel completo da plataforma",
    path: "/admin/dashboard",
    loginPath: "/login",
    prefix: "/admin",
    color: "bg-rose-500",
    emoji: "🛡️",
    accountType: "admin",
    accountSubType: null,
  },
  {
    id: "nomade",
    label: "Nômade",
    description: "Tarefas, ganhos e habilitações",
    path: "/nomades/dashboard",
    loginPath: "/nomades/login",
    prefix: "/nomades",
    color: "bg-amber-500",
    emoji: "🧭",
    accountType: "nomades",
    accountSubType: null,
  },
  {
    id: "empresa",
    label: "Empresa",
    description: "Projetos, tarefas e faturas",
    path: "/empresa/dashboard",
    loginPath: "/empresa/login",
    prefix: "/empresa",
    color: "bg-violet-500",
    emoji: "🏢",
    accountType: "empresas",
    accountSubType: "company",
  },
  {
    id: "agencia",
    label: "Agência",
    description: "Clientes, projetos e financeiro",
    path: "/agencia/dashboard",
    loginPath: "/agencia/login",
    prefix: "/agencia",
    color: "bg-indigo-500",
    emoji: "💼",
    accountType: "agencias",
    accountSubType: null,
  },
  {
    id: "parceiro",
    label: "Parceiro",
    description: "Comissões, agências e saques",
    path: "/parceiro/dashboard",
    loginPath: "/parceiro/login",
    prefix: "/parceiro",
    color: "bg-blue-500",
    emoji: "🤝",
    accountType: "parceiro",
    accountSubType: null,
  },
]

function getActiveRole(pathname: string) {
  // On login pages, match by loginPath
  const byLogin = ROLES.find((r) => pathname === r.loginPath)
  if (byLogin) return byLogin
  return ROLES.find((r) => pathname.startsWith(r.prefix)) ?? ROLES[0]
}

function isOnLoginPage(pathname: string) {
  return ROLES.some((r) => pathname === r.loginPath)
}

export function DevRoleSwitcher() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setAccountType } = useAccountType()
  const [open, setOpen] = useState(false)

  const active = getActiveRole(pathname)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="fixed bottom-5 left-5 z-9999 flex items-center gap-2 rounded-full
            bg-slate-900 text-white shadow-2xl px-3 py-2 text-xs font-semibold
            hover:bg-slate-800 transition-all border border-white/10"
          title="Trocar tipo de usuário (preview)"
        >
          <span className="text-sm leading-none">{active.emoji}</span>
          <span className="hidden sm:inline max-w-27.5 truncate leading-none">
            {active.label}
          </span>
          <ChevronDown
            className="h-3 w-3 opacity-50 transition-transform"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="top"
        sideOffset={10}
        className="w-72 p-2 rounded-2xl shadow-2xl border border-slate-100 bg-white"
        style={{ zIndex: 9999 }}
      >
        <p className="px-2 pt-1 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          Visualizar como
        </p>

        <div className="space-y-0.5">
          {ROLES.map((role) => {
            const isActive = active.id === role.id
            return (
              <button
                key={role.id}
                onClick={() => {
                  setAccountType(role.accountType, role.accountSubType)
                  // If currently on any login page, navigate to that role's login page
                  // Otherwise navigate to the role's dashboard
                  navigate(isOnLoginPage(pathname) ? role.loginPath : role.path)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                    isActive ? "bg-white/10" : "bg-slate-100"
                  }`}
                >
                  {role.emoji}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{role.label}</p>
                  <p
                    className={`text-[11px] leading-tight mt-0.5 truncate ${
                      isActive ? "text-white/55" : "text-slate-400"
                    }`}
                  >
                    {role.description}
                  </p>
                </div>

                {isActive && (
                  <Check className="h-4 w-4 shrink-0 text-white/60" />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 px-2 pb-1">
          <p className="text-[10px] text-slate-300 text-center">
            🔧 Modo preview — sem autenticação real
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
