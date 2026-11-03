
// Menu "Mais" do celular/tablet (botão "Mais" da barra de baixo). Pedido do usuário 02/11: menu DESLIZANTE que sobe de
// baixo e mostra TODOS os itens como uma grade de ícones, cada um com o nome do que é — sem sanfonas escondendo itens.
// Os itens vêm do mesmo menu já resolvido pela barra lateral do desktop (lib/navigation-store.ts: permissões, Admin
// Master, Partner, tarefas internas, navegador seguro, Roadmap e a ordem escolhida pelo usuário). A lista própria
// abaixo só é usada se a barra lateral ainda não publicou o menu (ex.: testes) — e não tem contadores inventados.
import { useState, useEffect, useMemo, useRef } from "react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { partnerAgencyExtraItems } from "@/lib/partner-menu"
import { cn } from "@/lib/utils"
import { useAccountType } from "@/contexts/account-type-context"
import { useSidebar } from "@/contexts/sidebar-context"
import { useTheme } from "next-themes"
import { useFontScale } from "@/hooks/useFontScale"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { canOpenRoadmapPanel } from "@/lib/admin-permissions"
import { useOpenRoadmapPanel } from "@/hooks/use-open-roadmap-panel"
import { toast } from "@/hooks/use-toast"
import { useResolvedNavigation, type NavItem } from "@/lib/navigation-store"
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
  Calculator,
  Share2,
  Rocket,
  Package,
  LogOut,
  Home,
  Sun,
  Moon,
  AlertTriangle,
  LifeBuoy,
  Search,
  LayoutGrid,
} from "lucide-react"

const navigationConfig = {
  empresas: {
    company: [
      { name: "Dashboard", href: "/company/dashboard", icon: LayoutDashboard },
      { name: "Projetos", href: "/company/projetos", icon: FolderOpen },
      { name: "Aprovações", href: "/company/tarefas", icon: CheckSquare },
      { name: "Pagamentos", href: "/company/faturas", icon: CreditCard },
      { name: "Relatórios", href: "/company/relatorios", icon: FileText },
      { name: "Allkademy", href: "/allkademy", icon: BookOpen },
    ],
    "in-house": [],
  },
  agencias: [
    { name: "Dashboard", href: "/agency/dashboard", icon: LayoutDashboard },
    { name: "Clientes", href: "/agency/clientes", icon: Building2 },
    { name: "Projetos", href: "/agency/projetos", icon: FolderOpen },
    { name: "Financeiro", href: "/agency/financeiro", icon: Wallet },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
  ],
  nomades: [
    { name: "Dashboard", href: "/nomad/dashboard", icon: LayoutDashboard },
    { name: "Tarefas Disponíveis", href: "/nomades/tarefasdisponiveis", icon: Target },
    { name: "Minhas Tarefas", href: "/nomades/minhastarefas", icon: CheckSquare },
    { name: "Qualificações", href: "/nomades/qualificacoes", icon: CheckSquare },
    { name: "Habilitações", href: "/nomades/habilitacoes", icon: Award },
    { name: "Histórico", href: "/nomades/historico", icon: History },
    { name: "Programa", href: "/nomades/programa", icon: Star },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet },
    { name: "Perfil", href: "/nomades/perfil", icon: UserCheck },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
  ],
  parceiro: [
    { name: "Dashboard", href: "/partner/dashboard", icon: Home },
    { name: "Agências", href: "/partner/agencias", icon: Building2 },
    { name: "Projetos", href: "/partner/projetos", icon: FolderOpen },
    { name: "Comissões", href: "/partner/comissoes", icon: TrendingUp },
    { name: "Saques", href: "/partner/saques", icon: Wallet },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
  ],
  lider: [
    { name: "Dashboard", href: "/leader/dashboard", icon: Home },
    { name: "Qualificação", href: "/leader/qualificacao", icon: Award },
    { name: "Tarefas", href: "/leader/tarefas", icon: CheckSquare },
    { name: "Devolvidas", href: "/leader/devolvidas", icon: History },
    { name: "Histórico", href: "/leader/historico", icon: BarChart3 },
    { name: "Perfil", href: "/leader/perfil", icon: UserCheck },
    { name: "Allkademy", href: "/allkademy", icon: BookOpen },
  ],
  admin: [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    {
      name: "Gestão de Contas",
      icon: Users,
      subitems: [
        { name: "Empresas", href: "/admin/empresas", icon: Building2 },
        { name: "Usuários", href: "/admin/usuarios", icon: Users },
        { name: "Permissões", href: "/admin/permissoes", icon: Shield },
      ],
    },
    {
      name: "Gestão de Projetos",
      icon: FolderOpen,
      subitems: [
        { name: "Projetos", href: "/admin/projetos", icon: FolderOpen },
        { name: "Produtos", href: "/admin/cadastro-produtos", icon: Package },
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
    { name: "Allkademy", href: "/admin/allkademy", icon: BookOpen },
    {
      name: "Administração",
      icon: Shield,
      subitems: [
        { name: "Sistema", href: "/admin/sistema", icon: Database },
        { name: "Disponibilidade", href: "/admin/disponibilidade", icon: Target },
        { name: "Especialidades", href: "/admin/especialidades", icon: Briefcase },
        { name: "Onboarding", href: "/admin/onboarding", icon: Rocket },
        { name: "Dashboards Padrão", href: "/admin/dashboard-templates", icon: LayoutDashboard },
        { name: "Configurações", href: "/admin/configuracoes", icon: Settings },
      ],
    },
  ],
}

// "Roadmap e chamados" fica FORA de navigationConfig — sua visibilidade
// depende só de canOpenRoadmapPanelState (permissão granular real,
// independente de account_type), nunca de estar dentro do array "admin".
//
// O alvo do clique difere por account_type (mesma regra do desktop, ver
// components/sidebar.tsx): admin navega para /admin/acesso-chamados (tela de
// gestão — o SSO só dispara de lá, pelo botão "Abrir painel interno"); quem
// não é admin não tem acesso a essa tela (gated a isAdmin em page.tsx), então
// vai direto pro SSO via useOpenRoadmapPanel, mesmo hook do desktop.
const ROADMAP_SIDEBAR_ITEM_DIRECT_SSO = {
  name: "Roadmap e chamados",
  icon: LifeBuoy,
  openInNewTab: true,
}

/** Cores dos ícones (cada seção tem a sua; os atalhos da seção Principal variam). Classes literais para o Tailwind gerar. */
const TILE_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
  "from-slate-500 to-slate-700",
  "from-red-500 to-rose-600",
]

type MenuSection = { title: string; icon: NavItem["icon"]; color: string | null; items: NavItem[] }

/** Seções do menu: "Principal" com os itens soltos e uma seção por grupo do menu (todos os subitens à vista). */
export function buildMenuSections(navigation: NavItem[]): MenuSection[] {
  const main = navigation.filter((item) => !item.subitems?.length)
  const groups = navigation.filter((item) => item.subitems?.length)
  const sections: MenuSection[] = []
  if (main.length) sections.push({ title: groups.length ? "Principal" : "Menu", icon: LayoutGrid, color: null, items: main })
  groups.forEach((group, index) => sections.push({ title: group.name, icon: group.icon, color: TILE_COLORS[(index + 1) % TILE_COLORS.length], items: group.subitems ?? [] }))
  return sections
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

interface AppMenuDrawerProps {
  open: boolean
  onClose: () => void
}

export function AppMenuDrawer({ open, onClose }: AppMenuDrawerProps) {
  const location = useLocation()
  const pathname = location.pathname
  const { accountType, accountSubType, isPartnerActive } = useAccountType()
  const { userProfile } = useSidebar()
  // Aparência: no desktop estes controles vivem na barra flutuante da borda
  // direita, que no celular caía em cima do conteúdo.
  const { theme, setTheme } = useTheme()
  const { increase, decrease } = useFontScale()
  const [query, setQuery] = useState("")
  const published = useResolvedNavigation()

  // Mesma regra do desktop (components/sidebar.tsx): sinal de UI só, o
  // backend (POST .../product-feedback/roadmap-sso/start) é quem realmente
  // decide. Roda pra QUALQUER account_type — canOpenRoadmapPanel() aplica a
  // regra certa internamente (sistema só grandfathera pra admin;
  // central_chamados nunca grandfathera, pra ninguém).
  const [canOpenRoadmapPanelState, setCanOpenRoadmapPanelState] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await apiClient.getCurrentUser()
        const profile = me?.admin_profile
        const pode = canOpenRoadmapPanel(accountType, profile)
        if (!cancelled) setCanOpenRoadmapPanelState(pode)
      } catch {
        if (!cancelled) setCanOpenRoadmapPanelState(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [accountType])

  const roadmapPanel = useOpenRoadmapPanel()
  useEffect(() => {
    if (roadmapPanel.error) {
      toast({ title: "Roadmap e chamados", description: roadmapPanel.error, variant: "destructive" })
    }
  }, [roadmapPanel.error])

  const getNavigationItems = (): NavItem[] => {
    if (accountType === "empresas") {
      return (navigationConfig.empresas as any)[accountSubType || "company"] ?? navigationConfig.empresas.company
    }
    if (accountType === "agencias") {
      // Partner é um upgrade da Agency (PartnerProfile.status "active"),
      // não um account_type separado — anexa os itens exclusivos de
      // Partner ao menu normal da Agency quando ativo.
      if (!isPartnerActive) return navigationConfig.agencias
      // 2026-10-26: a agência Partner vê só Comissões e Saques do Partner (Agências não) — ver lib/partner-menu.ts.
      return [...navigationConfig.agencias, ...partnerAgencyExtraItems(navigationConfig.parceiro)]
    }
    if (accountType === "lider") return navigationConfig.lider
    return (navigationConfig as any)[accountType] || []
  }

  // Menu da barra lateral (já com Roadmap e regras); sem ele, a lista própria + Roadmap pela permissão.
  const navigation: NavItem[] = useMemo(() => {
    if (published.length) return published
    const resolvedItems = getNavigationItems()
    const roadmapSidebarItem: NavItem =
      accountType === "admin"
        ? { name: "Roadmap e chamados", icon: LifeBuoy, href: "/admin/acesso-chamados" }
        : ROADMAP_SIDEBAR_ITEM_DIRECT_SSO
    return canOpenRoadmapPanelState ? [...resolvedItems, roadmapSidebarItem] : resolvedItems
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published, accountType, accountSubType, isPartnerActive, canOpenRoadmapPanelState])

  const sections = useMemo(() => {
    const all = buildMenuSections(navigation)
    const term = normalize(query.trim())
    if (!term) return all
    return all
      .map((section) => ({ ...section, items: section.items.filter((item) => normalize(item.name).includes(term) || normalize(section.title).includes(term)) }))
      .filter((section) => section.items.length > 0)
  }, [navigation, query])

  // Fecha no Escape, trava a rolagem da página por trás e volta a busca ao abrir de novo.
  // O menu é a camada de cima: ouve o Escape na captura e o consome, senão a tela de trás (ex.: o projeto
  // aberto em Tela Slide, que também ouve Escape na window) fechava junto (reteste do Codex, 02/11).
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    setQuery("")
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      onCloseRef.current()
    }
    window.addEventListener("keydown", onKeyDown, true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  // Arrastar para baixo pela alça/cabeçalho fecha o menu (como um painel deslizante de app) — com o dedo OU com
  // o mouse: Pointer Events cobrem os dois. Antes só havia toque, e arrastar com o mouse selecionava o texto
  // (reteste Codex de 02/11). Começar o arrasto em cima do X não conta: ele continua sendo um clique.
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)
  const resetDrag = () => {
    setDragY(0)
    dragStart.current = null
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button, a, input")) return
    dragStart.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current == null) return
    setDragY(Math.max(0, e.clientY - dragStart.current))
  }
  const onPointerUp = () => {
    if (dragY > 90) onClose()
    resetDrag()
  }

  if (!open) return null

  const isActive = (href?: string) => !!href && (pathname === href || pathname.startsWith(`${href}/`))
  // A sigla e o papel vêm do cabeçalho (o mesmo cartão do topo); sem eles ainda, deriva do nome da pessoa.
  const initials =
    userProfile.avatar && userProfile.avatar.length <= 2
      ? userProfile.avatar
      : userProfile.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
  const tileClass = (active: boolean) =>
    cn(
      "group relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 text-center transition-all duration-200 active:scale-95",
      active ? "bg-white/15 ring-1 ring-white/30" : "hover:bg-white/5",
    )

  return (
    <>
      {/* z-95: acima do cabeçalho do topo (z-90). Com z-50 o cabeçalho ficava por cima do fundo e tocar na faixa de
          cima não fechava o menu (reteste Codex de 02/11). */}
      <div
        className="xl:hidden fixed inset-0 z-95 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
        data-testid="app-menu-backdrop"
      />

      <div className="xl:hidden fixed inset-0 z-95 flex items-end justify-center pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-testid="app-menu-sheet"
          className="pointer-events-auto w-full max-w-3xl max-h-[92dvh] bg-linear-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-t-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden flex flex-col"
          style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        >
          {/* Alça + cabeçalho — arrastar para baixo fecha */}
          <div
            className="shrink-0 bg-linear-to-r from-blue-600 to-indigo-600 px-5 pt-2 pb-4 touch-none select-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={resetDrag}
            data-testid="app-menu-handle"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/40" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-11 w-11 shrink-0 ring-4 ring-white/20">
                  <AvatarImage src={userProfile.avatar.startsWith("data:") ? userProfile.avatar : undefined} />
                  <AvatarFallback className="bg-blue-700 text-white font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  {userProfile.name && (
                    <p className="truncate text-base font-semibold text-white">{userProfile.name}</p>
                  )}
                  <p className="truncate text-sm text-white/80">
                    {accountType === "admin" ? (userProfile.job_title || userProfile.role) : userProfile.role}
                  </p>
                </div>
              </div>
              <Button
                ref={closeRef}
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Fechar menu"
                className="h-auto shrink-0 rounded-full p-2 text-white hover:bg-white/20"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-white focus-within:bg-white/20">
              <Search className="h-4 w-4 shrink-0 text-white/70" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no menu"
                aria-label="Buscar no menu"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
              />
            </label>
          </div>

          {/* Grade de ícones por seção — todos os itens à vista, cada um com o nome do que é */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-2">
            {sections.length === 0 && (
              <p className="py-10 text-center text-sm text-white/60">Nenhum item encontrado.</p>
            )}
            {sections.map((section, sectionIndex) => {
              const SectionIcon = section.icon
              return (
                <section key={section.title} className="mb-5" aria-label={section.title} data-testid="app-menu-section">
                  <h2 className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                    {SectionIcon && <SectionIcon className="h-3.5 w-3.5" />}
                    {section.title}
                  </h2>
                  <div className="grid grid-cols-3 gap-1.5 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon ?? LayoutGrid
                      const color = section.color ?? TILE_COLORS[(itemIndex + sectionIndex) % TILE_COLORS.length]
                      const active = isActive(item.href)
                      const content = (
                        <>
                          <span className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br shadow-lg shadow-black/30", color)}>
                            <Icon className="h-6 w-6 text-white" />
                          </span>
                          <span className="line-clamp-2 text-[11px] font-medium leading-tight text-white/90">
                            {item.openInNewTab && roadmapPanel.loading ? "Abrindo..." : item.name}
                          </span>
                          {item.badge && (
                            <span className="absolute right-1 top-1 min-w-5 rounded-full border-2 border-slate-950 bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )
                      if (item.openInNewTab || !item.href) {
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => void roadmapPanel.open()}
                            disabled={roadmapPanel.loading}
                            className={cn(tileClass(false), "disabled:opacity-60")}
                            data-testid="app-menu-tile"
                          >
                            {content}
                          </button>
                        )
                      }
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={tileClass(active)}
                          data-testid="app-menu-tile"
                        >
                          {content}
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {/* Central de Atenções — no desktop tem ícone próprio na barra
                flutuante da direita, escondida no celular por cair em cima do
                conteúdo. Sem esta entrada a tela ficaria inalcançável. */}
            <Link
              to={accountType === "agencias" ? "/agency/tarefas" : "/admin/alertas"}
              onClick={onClose}
              className="mb-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-white hover:bg-white/10"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">Central de Atenções</span>
            </Link>

            {/* Aparência — no desktop estes dois controles ficam na barra
                flutuante da borda direita, que não cabe no celular. */}
            <div className="mb-2">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">Aparência</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="flex-1 justify-start rounded-xl text-white hover:bg-white/10"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
                  {theme === "dark" ? "Modo claro" : "Modo escuro"}
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Diminuir fonte"
                    className="rounded-xl text-white hover:bg-white/10"
                    onClick={decrease}
                  >
                    <span className="text-sm font-bold">A-</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Aumentar fonte"
                    className="rounded-xl text-white hover:bg-white/10"
                    onClick={increase}
                  >
                    <span className="text-base font-bold">A+</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 border-t border-white/10 bg-black/20 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-xl p-3 text-white hover:bg-white/10"
              onClick={() => {
                localStorage.removeItem("simulatedUser")
                localStorage.removeItem("dev_active_profile")
                localStorage.removeItem("allka_token")
                localStorage.setItem("allka_logged_out", "true")
                onClose()
                window.dispatchEvent(new Event("allka:profile-changed"))
                window.location.href = "/login"
              }}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
