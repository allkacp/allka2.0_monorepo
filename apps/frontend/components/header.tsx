// @ts-nocheck
import {
  Search,
  Bell,
  Menu,
  X,
  Wallet,
  Star,
  TrendingUp,
  ChevronDown,
  LogOut,
  Settings,
  User,
  CreditCard,
  FolderOpen,
  Award,
  Shield,
  DollarSign,
  CheckSquare,
  Building2,
  Users,
  Briefcase,
  Zap,
  Target,
  Activity,
  Sun,
  Moon,
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Package,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccountType } from "@/contexts/account-type-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { AlertsHeaderIcon } from "@/components/alerts-header-icon";
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel";
import { UserViewSlidePanel } from "@/components/user-view-slide-panel";
import { usePartner } from "@/contexts/partner-context";
import { useEmpresa } from "@/contexts/empresa-context";
import { useAgencia } from "@/contexts/agencia-context";
import { apiClient } from "@/lib/api-client";
import { useSettings } from "@/contexts/settings-context";
import { useProjectBasket } from "@/contexts/project-basket-context";
import { ProjectBasketDrawer } from "@/components/project-basket-drawer";
import { FontScaleControl } from "@/components/font-scale-control";

const LEVEL_CONFIG = {
  bronze: { label: "Bronze", bg: "bg-amber-100", text: "text-amber-700" },
  silver: { label: "Prata", bg: "bg-slate-100", text: "text-slate-600" },
  gold: { label: "Ouro", bg: "bg-yellow-100", text: "text-yellow-700" },
  platinum: { label: "Platina", bg: "bg-cyan-100", text: "text-cyan-700" },
  diamond: { label: "Diamante", bg: "bg-violet-100", text: "text-violet-700" },
};

const ACCOUNT_CONFIG = {
  admin: {
    color: "text-rose-600",
    badgeBg: "bg-rose-50",
    badgeBorder: "border-rose-200",
  },
  nomades: {
    color: "text-amber-600",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
  },
  empresas: {
    color: "text-violet-600",
    badgeBg: "bg-violet-50",
    badgeBorder: "border-violet-200",
  },
  agencias: {
    color: "text-indigo-600",
    badgeBg: "bg-indigo-50",
    badgeBorder: "border-indigo-200",
  },
  parceiro: {
    color: "text-blue-600",
    badgeBg: "bg-blue-50",
    badgeBorder: "border-blue-200",
  },
  lider: {
    color: "text-teal-600",
    badgeBg: "bg-teal-50",
    badgeBorder: "border-teal-200",
  },
};

function fmtBRL(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// "User_00001" → "User_1" — versão reduzida (sem zero à esquerda) do
// user_code, usada como ID amigável em vez do CUID técnico.
function reducedUserCode(code?: string) {
  if (!code) return "";
  const m = /(\d+)\s*$/.exec(code);
  return m ? `User_${parseInt(m[1], 10)}` : code;
}

export function Header({ transparent = false }: { transparent?: boolean } = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<"inbox" | "notifications">("inbox");
  const [profileOpen, setProfileOpen] = useState(false);
  const [selfUser, setSelfUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { type: string; label: string; sub: string; path: string; icon: any; navState?: Record<string, string> }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { accountType, unlockAccountType, previewUserName, previewUserEmail, isPartnerActive } =
    useAccountType();
  const { userProfile, updateUserProfile } = useSidebar();
  const { theme, setTheme } = useSettings();
  const partner = usePartner();
  const empresa = useEmpresa();
  const agencia = useAgencia();
  const basket = useProjectBasket();

  const closeMobileSidebar = useCallback(() => {
    const sidebar = document.getElementById("mobile-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar && overlay) {
      sidebar.classList.add("-translate-x-full");
      overlay.classList.add("hidden");
    }
    setMobileMenuOpen(false);
  }, []);

  const toggleMobileSidebar = () => {
    const sidebar = document.getElementById("mobile-sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar && overlay) {
      if (mobileMenuOpen) {
        closeMobileSidebar();
      } else {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
        setMobileMenuOpen(true);
      }
    }
  };

  // Fecha o sidebar mobile ao clicar no overlay
  useEffect(() => {
    const overlay = document.getElementById("sidebar-overlay");
    if (!overlay) return;
    overlay.addEventListener("click", closeMobileSidebar);
    return () => overlay.removeEventListener("click", closeMobileSidebar);
  }, [closeMobileSidebar]);

  // Fecha o sidebar mobile ao navegar para outra rota
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  // Fetch authenticated user to show real name in greeting (also for admin —
  // previously skipped, which left the header/sidebar stuck on the
  // sidebar-context placeholder default instead of the real logged-in name).
  useEffect(() => {
    apiClient
      .getCurrentUser()
      .then((u: any) => {
        if (u?.name)
          updateUserProfile({
            name: u.name,
            email: u.email || "",
            job_title: u.job_title || "",
            user_code: u.user_code || "",
          });
      })
      .catch(() => {
        /* no token or API unavailable — keep fallback */
      });
  }, []);

  // Close search on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    }
    if (searchOpen) {
      document.addEventListener("mousedown", onClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [searchOpen]);

  // Close search on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Search scope per account type
  const searchScope = (() => {
    const base = (at: string) => `/${at}`;
    if (accountType === "admin")
      return {
        users: true,
        companies: true,
        projects: true,
        usersPath: "/admin/usuarios",
        companiesPath: "/admin/empresas",
        projectsPath: "/admin/projetos",
      };
    if (accountType === "empresas")
      return {
        users: false,
        companies: false,
        projects: true,
        usersPath: "",
        companiesPath: "",
        projectsPath: "/company/projetos",
      };
    if (accountType === "agencias")
      return {
        users: false,
        // Partner é um upgrade da Agency (PartnerProfile.status "active")
        // — quando ativo, a busca também alcança as agências lideradas.
        companies: isPartnerActive,
        projects: true,
        tasks: true,
        usersPath: "",
        companiesPath: isPartnerActive ? "/partner/agencias" : "",
        projectsPath: "/agency/projetos",
        tasksPath: "/agency/tarefas",
      };
    if (accountType === "nomades")
      return {
        users: false,
        companies: false,
        projects: false,
        usersPath: "",
        companiesPath: "",
        projectsPath: "",
      };
    return {
      users: false,
      companies: false,
      projects: false,
      usersPath: "",
      companiesPath: "",
      projectsPath: "",
    };
  })();

  // Debounced live search
  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        const promises: Promise<any>[] = [];
        const keys: string[] = [];
        if (searchScope.users) {
          promises.push(apiClient.getUsers({ search: q }));
          keys.push("users");
        }
        if (searchScope.companies) {
          promises.push(apiClient.getCompanies({ search: q }));
          keys.push("companies");
        }
        if (searchScope.projects) {
          promises.push(apiClient.getProjects({ search: q }));
          keys.push("projects");
        }

        const settled = await Promise.allSettled(promises);
        const results: {
          type: string;
          label: string;
          sub: string;
          path: string;
          icon: any;
        }[] = [];

        settled.forEach((res, i) => {
          if (res.status !== "fulfilled") return;
          const list = Array.isArray(res.value)
            ? res.value
            : ((res.value as any)?.data ?? []);
          const key = keys[i];
          if (key === "users") {
            list.slice(0, 5).forEach((u: any) =>
              results.push({
                type: "Usuário",
                label: u.name,
                sub: u.email ?? u.role ?? "",
                path: searchScope.usersPath,
                icon: User,
              }),
            );
          } else if (key === "companies") {
            list.slice(0, 5).forEach((c: any) =>
              results.push({
                type: "Empresa",
                label: c.name ?? c.nomeFantasia,
                sub: c.email ?? c.cnpj ?? "",
                path: searchScope.companiesPath,
                icon: Building2,
              }),
            );
          } else if (key === "projects") {
            list.slice(0, 5).forEach((p: any) => {
              const title = p.title ?? p.name ?? p.titulo ?? "Projeto";
              results.push({
                type: "Projeto",
                label: title,
                sub: p.client?.name ?? p.status ?? "",
                path: searchScope.projectsPath,
                icon: Briefcase,
                navState: { searchTerm: title },
              });
            });
          }
        });
        // Empresa: também busca tarefas em memória
        if (accountType === "empresas") {
          const q2 = q.toLowerCase();
          empresa.tasks
            .filter((t) =>
              t.name.toLowerCase().includes(q2) ||
              t.projectName.toLowerCase().includes(q2)
            )
            .slice(0, 5)
            .forEach((t) =>
              results.push({
                type: "Tarefa",
                label: t.name,
                sub: t.projectName,
                path: "/company/tarefas",
                icon: CheckSquare,
                navState: { search: t.name },
              })
            );
        }

        // Agency: busca projetos (com searchTerm) e tarefas em memória
        if (accountType === "agencias") {
          const q2 = q.toLowerCase();
          agencia.tasks
            .filter((t) =>
              t.name.toLowerCase().includes(q2) ||
              t.projectName.toLowerCase().includes(q2)
            )
            .slice(0, 5)
            .forEach((t) =>
              results.push({
                type: "Tarefa",
                label: t.name,
                sub: t.projectName,
                path: "/agency/tarefas",
                icon: CheckSquare,
                navState: { search: t.name },
              })
            );
        }

        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [accountType, empresa.tasks, agencia.tasks],
  );

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, doSearch]);

  const openProfile = async () => {
    setProfileOpen(true);
    // Only fetch the real authenticated user for admin.
    // Other account types (empresa, agencia, parceiro, nomades) build their
    // profile object directly from their respective context — so we never
    // accidentally show admin data (e.g. Vinícius Guardia) inside company view.
    if (accountType === "admin" && !selfUser) {
      try {
        const u = await apiClient.getCurrentUser();
        setSelfUser(u);
      } catch {
        /* use fallback */
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("simulatedUser");
    localStorage.removeItem("dev_active_profile");
    localStorage.removeItem("allka_token");
    localStorage.setItem("allka_logged_out", "true");
    unlockAccountType();
    apiClient.clearToken();
    window.dispatchEvent(new Event("allka:profile-changed"));
    window.location.href = "/login";
  };

  const PLACEHOLDER = (role, path) => ({
    name: "Carregando...",
    email: "",
    initials: "..",
    roleLabel: role,
    levelBadge: null,
    wallet: null,
    stat: null,
    points: null,
    level: null,
    nextLevel: null,
    tasks: null,
    settingsPath: path,
    menuItems: [],
  });

  let ctx = (() => {
    if (accountType === "empresas") {
      const p = empresa.profile;
      if (!p) return PLACEHOLDER("Empresa", "/company/dashboard");
      const activeCount = empresa.projects.filter(
        (x) => !["entregue", "cancelado"].includes(x.status),
      ).length;
      return {
        name: p.name,
        email: p.email,
        initials: getInitials(p.name),
        roleLabel: "Company",
        levelBadge: null,
        wallet: {
          label: "Total investido",
          value: fmtBRL(p.totalInvested),
          icon: CreditCard,
          color: "text-violet-600",
        },
        stat: {
          label: "Projetos ativos",
          value: String(activeCount),
          icon: FolderOpen,
        },
        points: null,
        level: null,
        nextLevel: null,
        tasks: `${activeCount} projetos ativos`,
        settingsPath: "/company/dashboard",
        menuItems: [
          {
            label: "Minha Empresa",
            icon: Building2,
            path: "/company/dashboard",
          },
          { label: "Projetos", icon: FolderOpen, path: "/company/projetos" },
          { label: "Tarefas", icon: CheckSquare, path: "/company/tarefas" },
          { label: "Faturas", icon: CreditCard, path: "/company/faturas" },
        ],
      };
    }
    if (accountType === "agencias") {
      const p = agencia.profile;
      if (!p) return PLACEHOLDER("Agência", "/agency/dashboard");
      // Partner é um upgrade da Agency (PartnerProfile.status "active") —
      // quando ativo, anexa os atalhos de Partner ao menu da própria Agency.
      const partnerMenuItems = isPartnerActive
        ? [
            { label: "Comissões", icon: DollarSign, path: "/partner/comissoes" },
            { label: "Saques", icon: Wallet, path: "/partner/saques" },
            { label: "Agências lideradas", icon: Building2, path: "/partner/agencias" },
          ]
        : [];
      return {
        name: p.name,
        email: p.email,
        initials: getInitials(p.name),
        roleLabel: isPartnerActive ? "Agência · Partner" : "Agência",
        levelBadge: null,
        wallet: {
          label: "MRR mensal",
          value: fmtBRL(p.currentMrr) + "/mês",
          icon: TrendingUp,
          color: "text-indigo-600",
        },
        stat: {
          label: "Projetos",
          value: String(p.totalProjects),
          icon: FolderOpen,
        },
        points: null,
        level: null,
        nextLevel: null,
        tasks: `${p.totalProjects} projetos no total`,
        settingsPath: "/agency/dashboard",
        menuItems: [
          {
            label: "Minha Agência",
            icon: Building2,
            path: "/agency/dashboard",
          },
          { label: "Projetos", icon: FolderOpen, path: "/agency/projetos" },
          { label: "Tarefas", icon: CheckSquare, path: "/agency/tarefas" },
          { label: "Financeiro", icon: Wallet, path: "/agency/financeiro" },
          ...partnerMenuItems,
        ],
      };
    }
    if (accountType === "nomades") {
      const name = userProfile.name || "Nômade";
      return {
        name,
        email: userProfile.email || "",
        initials: getInitials(name),
        roleLabel: "Nômade",
        levelBadge: null,
        wallet: {
          label: "Ganhos no mês",
          value: "R$ 3.280",
          icon: Wallet,
          color: "text-amber-600",
        },
        stat: { label: "Pontos", value: "1.250 pts", icon: Star },
        points: "1.250 pts",
        level: "Bronze",
        nextLevel: "Prata",
        tasks: "5 tarefas pendentes",
        settingsPath: "/nomades/perfil",
        menuItems: [
          { label: "Meu Perfil", icon: User, path: "/nomades/perfil" },
          {
            label: "Minhas Tarefas",
            icon: CheckSquare,
            path: "/nomades/minhastarefas",
          },
          { label: "Ganhos", icon: DollarSign, path: "/nomades/ganhos" },
          { label: "Habilitações", icon: Award, path: "/nomades/habilitacoes" },
        ],
      };
    }
    if (accountType === "lider") {
      const name = userProfile.name || "Líder";
      return {
        name,
        email: userProfile.email || "",
        initials: getInitials(name),
        roleLabel: "Líder",
        levelBadge: null,
        wallet: null,
        stat: null,
        points: null,
        level: null,
        nextLevel: null,
        tasks: null,
        settingsPath: "/leader/perfil",
        menuItems: [
          { label: "Meu Perfil", icon: User, path: "/leader/perfil" },
          { label: "Dashboard", icon: Activity, path: "/leader/dashboard" },
          {
            label: "Para Qualificar",
            icon: CheckSquare,
            path: "/leader/qualificacao",
          },
          {
            label: "Tarefas da Área",
            icon: FolderOpen,
            path: "/leader/tarefas",
          },
        ],
      };
    }
    const name = userProfile.name || "Admin Sistema";
    return {
      name,
      email: userProfile.email || "admin@allka.com.br",
      initials: getInitials(name),
      roleLabel: "Administrador",
      levelBadge: null,
      wallet: null,
      stat: null,
      points: null,
      level: "Master",
      nextLevel: null,
      tasks: null,
      settingsPath: "/admin/configuracoes",
      menuItems: [
        { label: "Meu Perfil", icon: User, path: "/admin/dashboard" },
        { label: "Usuários", icon: Shield, path: "/admin/usuarios" },
        { label: "Permissões", icon: Shield, path: "/admin/permissoes" },
        {
          label: "Configurações",
          icon: Settings,
          path: "/admin/configuracoes",
        },
      ],
    };
  })();

  // In dev preview mode, override name/email/initials so the header always
  // shows the selected preview profile — not the real authenticated user.
  if (import.meta.env.DEV && previewUserName && accountType !== "admin") {
    ctx = {
      ...ctx,
      name: previewUserName,
      email: previewUserEmail ?? ctx.email,
      initials: getInitials(previewUserName),
    };
  }

  const cfg = ACCOUNT_CONFIG[accountType] ?? ACCOUNT_CONFIG.admin;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = ctx.name.split(" ")[0];
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hasBottomStats = Boolean(
    ctx.points || ctx.stat || ctx.tasks || ctx.wallet,
  );

  return (
    <>
      {/* search overlay removed — dropdown is now inline below the bar */}

      <header
        className={cn(
          "border-b px-4 sm:px-8 relative z-90 overflow-visible",
          hasBottomStats && "pb-2.5",
          transparent
            ? "border-white/15"
            : "border-white shadow-xl",
        )}
        style={
          transparent
            ? { background: "transparent" }
            : {
                background:
                  "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
              }
        }
      >
        {/* === TOP ROW: greeting + right actions === */}
        <div
          className={cn(
            "flex items-center h-16 gap-4",
            hasBottomStats && "border-b border-white/8",
          )}
        >
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2 text-white/80 hover:bg-white/10 hover:text-white rounded-xl shrink-0"
            onClick={toggleMobileSidebar}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {/* Greeting + date */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div>
              <p className="text-lg font-bold text-white leading-tight tracking-tight">
                {greeting}, {firstName}!
              </p>
              <p className="text-xs text-white/45 leading-tight capitalize mt-0.5">
                {today}
              </p>
            </div>
            {ctx.level && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10 shrink-0">
                <div className="h-6 w-6 rounded-lg bg-yellow-400/20 flex items-center justify-center shrink-0">
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] text-white/45 leading-none">Nível</p>
                  <p className="text-xs font-bold text-white leading-tight">
                    {ctx.level}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="lg:hidden min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {greeting}, {firstName}!
            </p>
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div ref={searchRef} className="relative">
              {/* Input activo */}
              {searchOpen ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/30 text-white md:min-w-80">
                  <Search className="h-4 w-4 shrink-0 text-white/60" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      accountType === "admin"
                        ? "Usuários, empresas, projetos..."
                        : "Buscar projetos, tarefas..."
                    }
                    className="flex-1 text-xs bg-transparent outline-none text-white placeholder:text-white/40 min-w-0"
                  />
                  {searchLoading && (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/50 border-t-transparent animate-spin shrink-0" />
                  )}
                  <button
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                    className="p-0.5 rounded hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5 text-white/50" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all group md:min-w-72"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="hidden md:block text-xs text-white/50 group-hover:text-white/70 transition-colors flex-1">
                    Buscar...
                  </span>
                  <span className="hidden lg:flex items-center gap-0.5 text-[10px] text-white/30 border border-white/15 rounded px-1 py-0.5">
                    ⌘K
                  </span>
                </button>
              )}

              {/* Dropdown de resultados — sem overlay */}
              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[oklch(0.135_0.018_258)] rounded-xl shadow-2xl border border-gray-200 dark:border-[oklch(0.22_0.025_258)] overflow-hidden z-50">
                  <div className="max-h-80 overflow-y-auto">
                    {!searchQuery && (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        <Search className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                        Digite para buscar
                      </div>
                    )}
                    {searchQuery && !searchLoading && searchResults.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        Nenhum resultado para "{searchQuery}"
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="py-1">
                        {["Usuário", "Empresa", "Projeto", "Tarefa"].map((type) => {
                          const group = searchResults.filter((r) => r.type === type);
                          if (!group.length) return null;
                          const GroupIcon =
                            type === "Usuário" ? User
                            : type === "Empresa" ? Building2
                            : type === "Tarefa" ? CheckSquare
                            : Briefcase;
                          return (
                            <div key={type}>
                              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                {type}s
                              </p>
                              {group.map((result, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    navigate(result.path, result.navState ? { state: result.navState } : {});
                                    setSearchOpen(false);
                                    setSearchQuery("");
                                    setSearchResults([]);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                  <div className="h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                    <GroupIcon className="h-3.5 w-3.5 text-gray-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {result.label}
                                    </p>
                                    {result.sub && (
                                      <p className="text-xs text-gray-400 truncate">{result.sub}</p>
                                    )}
                                  </div>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 shrink-0">
                                    {result.type}
                                  </span>
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                    <span>ESC para fechar</span>
                    <span>Enter para navegar</span>
                  </div>
                </div>
              )}
            </div>

            <AlertsHeaderIcon />

            {/* Dark mode toggle — oculto em mobile para economizar espaço */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              className="hidden sm:flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Controle de tamanho de fonte — apenas desktop */}
            <div className="hidden lg:flex">
              <FontScaleControl />
            </div>

            {/* ── Cesta de projeto (oculta para líder) ───────────── */}
            {accountType !== "lider" && (() => {
              const totalItems = basket.getTotalItems();
              const hasItems = totalItems > 0;
              return (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => basket.setOpen(true)}
                    aria-label="Cesta do projeto"
                    className={
                      hasItems
                        ? "relative flex items-center gap-2 h-9 pl-3 pr-3.5 rounded-xl border transition-all duration-200 bg-white/15 border-white/30 text-white hover:bg-white/25 hover:border-white/40 shadow-[0_0_12px_rgba(99,102,241,0.35)]"
                        : "relative flex items-center justify-center h-9 w-9 rounded-xl border transition-all duration-200 bg-white/10 border-white/15 text-white/50 hover:bg-white/20 hover:text-white/80"
                    }
                  >
                    {/* pulse ring when active */}
                    {hasItems && (
                      <span className="absolute inset-0 rounded-xl animate-ping bg-indigo-400/20 pointer-events-none" />
                    )}

                    <Briefcase
                      className={
                        hasItems
                          ? "h-4 w-4 shrink-0 text-indigo-200 drop-shadow-sm"
                          : "h-4 w-4 shrink-0"
                      }
                    />

                    {hasItems && (
                      <span className="flex items-center gap-1 text-xs font-bold leading-none">
                        <span
                          className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-extrabold leading-none"
                          style={{
                            background:
                              "var(--app-brand-button, linear-gradient(135deg, #6366f1 0%, #c81a7f 100%))",
                            color: "#fff",
                          }}
                        >
                          {totalItems}
                        </span>
                        <span className="hidden sm:inline text-[11px] text-white/80 font-semibold">
                          {totalItems === 1 ? "item" : "itens"}
                        </span>
                      </span>
                    )}
                  </button>

                  {/* Tooltip */}
                  <div className="pointer-events-none absolute top-full right-0 mt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-gray-900/95 text-white text-[11px] rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap border border-white/10">
                      {hasItems ? (
                        <>
                          <span className="font-semibold">
                            {totalItems}{" "}
                            {totalItems === 1 ? "produto" : "produtos"} na cesta
                          </span>
                          <br />
                          <span className="text-white/60">
                            Clique para ver e criar projeto
                          </span>
                        </>
                      ) : (
                        <span className="text-white/70">
                          Cesta do projeto vazia
                        </span>
                      )}
                    </div>
                    <div className="absolute -top-1 right-3.5 h-2 w-2 rotate-45 bg-gray-900/95 border-l border-t border-white/10" />
                  </div>
                </div>
              );
            })()}

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setNotifTab("inbox"); setNotifOpen(true); }}
                className="p-0 h-9 w-9 relative text-white/80 hover:bg-white/20 hover:text-white rounded-xl bg-white/10 border border-white/15"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none pointer-events-none">
                  2
                </span>
              </Button>
            </div>

            {/* User card */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-xl hover:bg-white/10 transition-all group outline-none border border-white/15 hover:border-white/30">
                  <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/30 ring-offset-1 ring-offset-transparent">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                      {ctx.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    {accountType === "admin" && (
                      <p className="text-sm font-bold leading-tight text-white truncate max-w-32.5">
                        {ctx.name}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-px rounded-full ${cfg.badgeBg} ${cfg.color} leading-tight`}
                      >
                        {accountType === "admin"
                          ? userProfile.job_title || ctx.roleLabel
                          : ctx.roleLabel}
                      </span>
                      {ctx.levelBadge && (
                        <span
                          className={`px-1.5 py-px rounded-full text-[9px] font-bold ${ctx.levelBadge.bg} ${ctx.levelBadge.text}`}
                        >
                          {ctx.levelBadge.label}
                        </span>
                      )}
                      {ctx.level && !ctx.levelBadge && (
                        <span className="text-[9px] text-white/40">
                          {ctx.level}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-white/40 hidden sm:block group-hover:text-white/70 transition-colors shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={10}
                className="w-72 p-2 rounded-2xl shadow-2xl border border-gray-100 dark:border-border bg-white dark:bg-background"
              >
                <div
                  className={`px-3 py-3 rounded-xl mb-2 border ${cfg.badgeBg} ${cfg.badgeBorder} dark:bg-card dark:border-border`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 shrink-0 ring-2 ring-white shadow-md">
                      <AvatarFallback className="bg-linear-to-br from-blue-600 to-purple-600 text-white text-sm font-bold">
                        {ctx.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      {accountType === "admin" && (
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {ctx.name}
                        </p>
                      )}
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        <p className={`text-[11px] font-semibold ${cfg.color}`}>
                          {accountType === "admin"
                            ? userProfile.job_title || ctx.roleLabel
                            : ctx.roleLabel}
                        </p>
                        {ctx.levelBadge && (
                          <span
                            className={`px-1.5 py-px rounded-full text-[9px] font-bold ${ctx.levelBadge.bg} ${ctx.levelBadge.text}`}
                          >
                            {ctx.levelBadge.label}
                          </span>
                        )}
                        {ctx.level && !ctx.levelBadge && (
                          <span className="text-[10px] text-gray-400">
                            • {ctx.level}
                          </span>
                        )}
                      </div>
                      {ctx.email && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          {ctx.email}
                        </p>
                      )}
                      {userProfile.user_code && (
                        <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                          {reducedUserCode(userProfile.user_code)}
                        </p>
                      )}
                    </div>
                  </div>
                  {(ctx.wallet || ctx.points || ctx.tasks) && (
                    <div className="mt-3 pt-2.5 border-t border-black/8 dark:border-white/10 grid grid-cols-2 gap-2">
                      {ctx.wallet && (
                        <div className="flex items-center gap-1.5">
                          <ctx.wallet.icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <div>
                            <p className="text-[9px] text-gray-400 leading-none">
                              {ctx.wallet.label}
                            </p>
                            <p
                              className={`text-xs font-bold ${ctx.wallet.color} leading-tight`}
                            >
                              {ctx.wallet.value}
                            </p>
                          </div>
                        </div>
                      )}
                      {ctx.points && (
                        <div className="flex items-center gap-1.5">
                          <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-[9px] text-gray-400 leading-none">
                              Pontos
                            </p>
                            <p className="text-xs font-bold text-amber-600 leading-tight">
                              {ctx.points}
                            </p>
                          </div>
                        </div>
                      )}
                      {ctx.tasks && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <Activity className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          <p className="text-[10px] text-gray-500">
                            {ctx.tasks}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DropdownMenuItem
                  onClick={openProfile}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                >
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { setNotifTab("notifications"); setNotifOpen(true); }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                >
                  <Settings className="h-4 w-4 text-gray-400 shrink-0" />
                  Configurações
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

        {/* === BOTTOM ROW: quick stats pills (level moved up next to greeting) === */}
        {hasBottomStats && (
        <div className="hidden lg:flex items-center gap-2 h-12 overflow-x-auto no-scrollbar pt-0.5">
          {ctx.points && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors shrink-0">
              <div className="h-6 w-6 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0">
                <Star className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/45 leading-none">Pontos</p>
                <p className="text-xs font-bold text-white leading-tight">
                  {ctx.points}
                </p>
              </div>
            </div>
          )}
          {ctx.stat && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors shrink-0">
              <div className="h-6 w-6 rounded-lg bg-emerald-400/20 flex items-center justify-center shrink-0">
                <ctx.stat.icon className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/45 leading-none">
                  {ctx.stat.label}
                </p>
                <p className="text-xs font-bold text-white leading-tight">
                  {ctx.stat.value}
                </p>
              </div>
            </div>
          )}
          {ctx.tasks && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors shrink-0">
              <div className="h-6 w-6 rounded-lg bg-blue-400/20 flex items-center justify-center shrink-0">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/45 leading-none">Status</p>
                <p className="text-xs font-bold text-white leading-tight">
                  {ctx.tasks}
                </p>
              </div>
            </div>
          )}
          {ctx.wallet && (
            <button
              onClick={() => navigate(ctx.settingsPath)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/10 hover:bg-white/20 transition-all active:scale-95 shrink-0"
            >
              <div className="h-6 w-6 rounded-lg bg-green-400/20 flex items-center justify-center shrink-0">
                <ctx.wallet.icon className="h-3.5 w-3.5 text-green-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-white/45 leading-none">
                  {ctx.wallet.label}
                </p>
                <p className="text-xs font-bold text-white leading-tight">
                  {ctx.wallet.value}
                </p>
              </div>
            </button>
          )}
        </div>
        )}
      </header>

      <NotificationPreferencesPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        initialTab={notifTab}
      />
      <UserViewSlidePanel
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        viewerRole={
          accountType === "agencias" ? "agency"
          : accountType === "empresas" ? "company"
          : accountType === "nomades" ? "nomad"
          : accountType === "parceiros" ? "partner"
          : "admin"
        }
        agencyFinancial={accountType === "agencias" && agencia.profile ? {
          invoices: agencia.invoices,
          projectRevenue: agencia.projects.reduce((s, p) => s + (p.value ?? 0), 0),
          currentMrr: agencia.profile.currentMrr,
          plan: agencia.profile.plan,
          planDiscount: agencia.profile.planDiscount,
        } : undefined}
        user={(() => {
          // Build profile object from context — each account type uses its own data source.
          if (accountType === "empresas" && empresa.profile) {
            const p = empresa.profile;
            return {
              id: p.id,
              name: p.name,
              email: p.email,
              role: "company_admin",
              account_type: "company",
              cnpj: p.cnpj,
              phone: p.phone,
              is_active: p.status === "active",
              is_admin: false,
              permissions: [],
              created_at: p.createdAt ?? "",
              updated_at: p.createdAt ?? "",
            };
          }
          if (accountType === "agencias" && agencia.profile) {
            const p = agencia.profile;
            return {
              id: p.id,
              name: p.name,
              email: p.email,
              role: "agency_admin",
              account_type: "agency",
              phone: p.phone ?? "",
              is_active: true,
              is_admin: false,
              permissions: [],
              created_at: p.createdAt ?? "",
              updated_at: p.createdAt ?? "",
              currentMrr: p.currentMrr,
              totalProjects: p.totalProjects,
              partnerLevel: p.partnerLevel,
            };
          }
          // admin + nomades: use real authenticated user (or context fallback)
          return (
            selfUser ?? {
              id: 0,
              name: ctx.name,
              email: ctx.email,
              role: accountType,
              account_type: accountType,
              is_active: true,
              is_admin: accountType === "admin",
              permissions: [],
              created_at: "",
              updated_at: "",
            }
          );
        })()}
      />

      {/* ── Basket drawer ─────────────────────────────────────────────── */}
      <ProjectBasketDrawer />
    </>
  );
}
