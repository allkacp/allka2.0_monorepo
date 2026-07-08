// @ts-nocheck
import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAccountType } from "@/contexts/account-type-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { SidebarSettingsModal } from "@/components/modals/sidebar-settings-modal";
import { apiClient } from "@/lib/api-client";
import { useAgencia } from "@/contexts/agencia-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Sparkles,
  ChevronDown,
  Calculator,
  Tag,
  Share2,
  Rocket,
  GripVertical,
  Package,
  ClipboardList,
  Play,
  RotateCcw,
  Trophy,
  Zap,
  Lock,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const navigationConfig = {
  empresas: {
    company: [
      {
        name: "Dashboard",
        href: "/company/dashboard",
        icon: LayoutDashboard,
        current: true,
      },
      {
        name: "Clientes",
        href: "/company/clientes",
        icon: Building2,
        current: false,
      },
      {
        name: "Projetos",
        href: "/company/projetos",
        icon: FolderOpen,
        current: false,
      },
      {
        name: "Tarefas",
        href: "/company/tarefas",
        icon: CheckSquare,
        current: false,
      },
      {
        name: "Catálogo de Produtos",
        href: "/company/produtos",
        icon: Package,
        current: false,
      },
      {
        name: "Relatórios",
        href: "/company/relatorios",
        icon: BarChart3,
        current: false,
      },
    ],
    "in-house": [],
  },
  agencias: [
    {
      name: "Dashboard",
      href: "/agency/dashboard",
      icon: LayoutDashboard,
      current: true,
    },
    {
      name: "Clientes",
      href: "/agency/clientes",
      icon: Building2,
      current: false,
    },
    {
      name: "Projetos",
      href: "/agency/projetos",
      icon: FolderOpen,
      current: false,
    },
    {
      name: "Catálogo",
      href: "/agency/catalogo",
      icon: Package,
      current: false,
    },
    {
      name: "Tarefas",
      href: "/agency/tarefas",
      icon: CheckSquare,
      current: false,
    },
    {
      name: "Financeiro",
      href: "/agency/financeiro",
      icon: Wallet,
      current: false,
    },
    {
      name: "Relatórios",
      href: "/agency/relatorios",
      icon: BarChart3,
      current: false,
    },
  ],
  parceiro: [
    {
      name: "Dashboard",
      href: "/partner/dashboard",
      icon: LayoutDashboard,
      current: true,
    },
    {
      name: "Clientes",
      href: "/partner/clientes",
      icon: Building2,
      current: false,
    },
    {
      name: "Agências",
      href: "/partner/agencias",
      icon: Building2,
      current: false,
    },
    {
      name: "Projetos",
      href: "/partner/projetos",
      icon: FolderOpen,
      current: false,
    },
    {
      name: "Comissões",
      href: "/partner/comissoes",
      icon: TrendingUp,
      current: false,
    },
    { name: "Saques", href: "/partner/saques", icon: Wallet, current: false },
    { name: "Relatórios", href: "/partner/relatorios", icon: BarChart3, current: false },
  ],
  nomades: [
    {
      name: "Dashboard",
      href: "/nomad/dashboard",
      icon: LayoutDashboard,
      current: true,
    },
    {
      name: "Tarefas Disponíveis",
      href: "/nomades/tarefasdisponiveis",
      icon: Target,
      current: false,
      badge: "18",
    },
    {
      name: "Minhas Tarefas",
      href: "/nomades/minhastarefas",
      icon: CheckSquare,
      current: false,
      badge: "6",
    },
    {
      name: "Habilitações",
      href: "/nomades/habilitacoes",
      icon: Award,
      current: false,
    },
    {
      name: "Histórico",
      href: "/nomades/historico",
      icon: History,
      current: false,
    },
    { name: "Programa", href: "/nomades/programa", icon: Star, current: false },
    { name: "Ganhos", href: "/nomades/ganhos", icon: Wallet, current: false },
    {
      name: "Perfil",
      href: "/nomades/perfil",
      icon: UserCheck,
      current: false,
    },
    {
      name: "Relatórios",
      href: "/nomades/relatorios",
      icon: BarChart3,
      current: false,
    },
    {
      name: "Allkademy",
      href: "/allkademy",
      icon: BookOpen,
      current: false,
    },
  ],
  lider: [
    {
      name: "Dashboard",
      href: "/leader/dashboard",
      icon: LayoutDashboard,
      current: true,
    },
    {
      name: "Projetos",
      href: "/leader/projetos",
      icon: FolderOpen,
      current: false,
    },
    {
      name: "Para Qualificar",
      href: "/leader/qualificacao",
      icon: CheckSquare,
      current: false,
    },
    {
      name: "Em Execução",
      href: "/leader/tarefas",
      icon: Play,
      current: false,
    },
    {
      name: "Devolvidas",
      href: "/leader/devolvidas",
      icon: RotateCcw,
      current: false,
    },
    {
      name: "Histórico",
      href: "/leader/historico",
      icon: History,
      current: false,
    },
    {
      name: "Nômades",
      href: "/leader/nomades",
      icon: Users,
      current: false,
    },
    {
      name: "Catálogo",
      href: "/leader/catalogo",
      icon: BookOpen,
      current: false,
    },
    {
      name: "Clientes",
      href: "/leader/clientes",
      icon: Building2,
      current: false,
    },
    {
      name: "Perfil",
      href: "/leader/perfil",
      icon: UserCheck,
      current: false,
    },
    {
      name: "Relatórios",
      href: "/leader/relatorios",
      icon: BarChart3,
      current: false,
    },
  ],
  admin: [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      current: true,
    },
    {
      name: "Gestão de Contas",
      icon: Users,
      current: false,
      subitems: [
        {
          name: "Usuários",
          href: "/admin/usuarios",
          icon: Users,
          current: false,
        },
        {
          name: "Clientes",
          href: "/admin/clientes",
          icon: Building2,
          current: false,
        },
        {
          name: "Empresas",
          href: "/admin/empresas",
          icon: Building2,
          current: false,
        },
        {
          name: "Permissões",
          href: "/admin/permissoes",
          icon: Shield,
          current: false,
        },
      ],
    },
    {
      name: "Projetos e Tarefas",
      icon: FolderOpen,
      current: false,
      subitems: [
        {
          name: "Projetos",
          href: "/admin/projetos",
          icon: FolderOpen,
          current: false,
        },
        {
          name: "Tarefas",
          href: "/admin/tarefas",
          icon: CheckSquare,
          current: false,
        },
      ],
    },
    {
      name: "Produtos",
      icon: Package,
      current: false,
      subitems: [
        {
          name: "Cadastro de Produtos",
          href: "/admin/produtos",
          icon: Package,
          current: false,
        },
        {
          name: "Catálogo de Produtos",
          href: "/admin/catalogo-produtos",
          icon: BookOpen,
          current: false,
        },
        {
          name: "Precificação",
          href: "/admin/precificacao",
          icon: Calculator,
          current: false,
        },
        {
          name: "Modelos de Tarefas",
          href: "/admin/modelos-tarefas",
          icon: ClipboardList,
          current: false,
        },
      ],
    },
    {
      name: "Campanhas",
      href: "/admin/campanhas-indicacao",
      icon: Share2,
      current: false,
    },
    {
      name: "Gameficação",
      icon: Star,
      current: false,
      subitems: [
        {
          name: "Níveis Agências",
          href: "/admin/niveis",
          icon: Building2,
          current: false,
        },
        {
          name: "Níveis Nômades",
          href: "/admin/niveis-nomades",
          icon: UserCheck,
          current: false,
        },
        {
          name: "Programa Partner",
          href: "/admin/programa-partner",
          icon: Award,
          current: false,
        },
      ],
    },
    {
      name: "Financeiro",
      href: "/admin/financeiro",
      icon: Wallet,
      current: false,
    },
    {
      name: "Relatórios",
      href: "/admin/relatorios",
      icon: BarChart3,
      current: false,
    },
    {
      name: "Allkademy",
      href: "/admin/allkademy",
      icon: BookOpen,
      current: false,
    },
    {
      name: "Administração",
      icon: Shield,
      current: false,
      subitems: [
        {
          name: "Sistema",
          href: "/admin/sistema",
          icon: Database,
          current: false,
        },
        {
          name: "Disponibilidade",
          href: "/admin/disponibilidade",
          icon: Target,
          current: false,
        },
        {
          name: "Especialidades",
          href: "/admin/especialidades",
          icon: Briefcase,
          current: false,
        },
        {
          name: "Onboarding",
          href: "/admin/onboarding",
          icon: Rocket,
          current: false,
        },
        {
          name: "Configurações",
          href: "/admin/configuracoes",
          icon: Settings,
          current: false,
        },
      ],
    },
  ],
};

const LEVEL_CONFIG_SIDEBAR = {
  bronze: {
    label: "Bronze", emoji: "🥉",
    gradient: "from-amber-500 to-amber-700",
    glow: "shadow-amber-500/40",
    bar: "bg-gradient-to-r from-amber-400 to-amber-600",
    text: "text-amber-300",
    bg: "bg-amber-500/20",
    border: "border-amber-400/30",
    nextProjectsRequired: 5,
    nextMrrRequired: 5000,
    nextLabel: "Prata",
    benefits: ["Acesso ao catálogo completo", "Suporte por email", "Dashboard básico"],
    nextBenefits: ["Desconto 5% em contratações", "Suporte prioritário", "Relatórios avançados"],
  },
  silver: {
    label: "Prata", emoji: "🥈",
    gradient: "from-slate-300 to-slate-500",
    glow: "shadow-slate-400/40",
    bar: "bg-gradient-to-r from-slate-300 to-slate-500",
    text: "text-slate-300",
    bg: "bg-slate-400/20",
    border: "border-slate-300/30",
    nextProjectsRequired: 15,
    nextMrrRequired: 15000,
    nextLabel: "Ouro",
    benefits: ["Desconto 5% em contratações", "Suporte prioritário", "Relatórios avançados"],
    nextBenefits: ["Desconto 10% em contratações", "Gerente de conta dedicado", "API de integração"],
  },
  gold: {
    label: "Ouro", emoji: "🥇",
    gradient: "from-yellow-400 to-yellow-600",
    glow: "shadow-yellow-500/40",
    bar: "bg-gradient-to-r from-yellow-400 to-yellow-600",
    text: "text-yellow-300",
    bg: "bg-yellow-500/20",
    border: "border-yellow-400/30",
    nextProjectsRequired: 40,
    nextMrrRequired: 50000,
    nextLabel: "Platina",
    benefits: ["Desconto 10% em contratações", "Gerente de conta dedicado", "API de integração"],
    nextBenefits: ["Desconto 15% em contratações", "SLA garantido 24h", "White-label disponível"],
  },
  platinum: {
    label: "Platina", emoji: "✨",
    gradient: "from-cyan-400 to-sky-600",
    glow: "shadow-cyan-500/40",
    bar: "bg-gradient-to-r from-cyan-400 to-sky-600",
    text: "text-cyan-300",
    bg: "bg-cyan-500/20",
    border: "border-cyan-400/30",
    nextProjectsRequired: 100,
    nextMrrRequired: 150000,
    nextLabel: "Diamante",
    benefits: ["Desconto 15% em contratações", "SLA garantido 24h", "White-label disponível"],
    nextBenefits: ["Desconto 20% em contratações", "Suporte 24/7", "Acesso beta a novos recursos"],
  },
  diamond: {
    label: "Diamante", emoji: "💎",
    gradient: "from-violet-400 to-purple-600",
    glow: "shadow-violet-500/40",
    bar: "bg-gradient-to-r from-violet-400 to-purple-600",
    text: "text-violet-300",
    bg: "bg-violet-500/20",
    border: "border-violet-400/30",
    nextProjectsRequired: null,
    nextMrrRequired: null,
    nextLabel: null,
    benefits: ["Desconto 20% em contratações", "Suporte 24/7 dedicado", "Acesso beta a novos recursos", "Co-marketing com a Allka"],
    nextBenefits: [],
  },
} as const;

const LEVEL_CONFIG_NOMAD_SIDEBAR = {
  bronze:   { label: "Bronze",   emoji: "🥉", gradient: "from-amber-500 to-amber-700",   bar: "bg-gradient-to-r from-amber-400 to-amber-600",   text: "text-amber-300",  bg: "bg-amber-500/20",  border: "border-amber-400/30",  nextLabel: "Silver",   nextTasksRequired: 20  },
  silver:   { label: "Silver",   emoji: "🥈", gradient: "from-slate-300 to-slate-500",   bar: "bg-gradient-to-r from-slate-300 to-slate-500",   text: "text-slate-300",  bg: "bg-slate-400/20",  border: "border-slate-300/30",  nextLabel: "Gold",     nextTasksRequired: 50  },
  gold:     { label: "Gold",     emoji: "🥇", gradient: "from-yellow-400 to-yellow-600", bar: "bg-gradient-to-r from-yellow-400 to-yellow-600", text: "text-yellow-300", bg: "bg-yellow-500/20", border: "border-yellow-400/30", nextLabel: "Platinum", nextTasksRequired: 100 },
  platinum: { label: "Platinum", emoji: "✨", gradient: "from-sky-300 to-sky-500",       bar: "bg-gradient-to-r from-sky-300 to-sky-500",       text: "text-sky-300",    bg: "bg-sky-500/20",    border: "border-sky-300/30",    nextLabel: "Diamond",  nextTasksRequired: 200 },
  diamond:  { label: "Diamond",  emoji: "💎", gradient: "from-violet-400 to-purple-600", bar: "bg-gradient-to-r from-violet-400 to-purple-600", text: "text-violet-300", bg: "bg-violet-500/20", border: "border-violet-400/30", nextLabel: null,       nextTasksRequired: null },
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasMoreContent, setHasMoreContent] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [adminProjectCount, setAdminProjectCount] = useState<number | null>(null);
  const [adminCompanyCount, setAdminCompanyCount] = useState<number | null>(null);
  const [adminUserCount, setAdminUserCount] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [draggedSubitem, setDraggedSubitem] = useState<{
    parentIndex: number;
    subIndex: number;
  } | null>(null);
  const [dragOverSubitem, setDragOverSubitem] = useState<{
    parentIndex: number;
    subIndex: number;
  } | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const sidebarRootRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{ x: number; startW: number } | null>(null);
  const COLLAPSE_THRESHOLD = 180;

  const location = useLocation();
  const pathname = location.pathname;
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const { accountType, accountSubType } = useAccountType();
  const {
    sidebarSettings,
    agencyProfile,
    userProfile,
    setSidebarCollapsed,
    setSidebarWidth,
    sidebarWidth: ctxWidth,
    previewTheme,
    previewEnabled,
  } = useSidebar();

  const agencia = useAgencia();
  const agenciaLevel = (agencia.profile?.partnerLevel ?? "bronze") as keyof typeof LEVEL_CONFIG_SIDEBAR;
  const agenciaTotalProjects = agencia.profile?.totalProjects ?? 0;
  const agenciaMrr = agencia.profile?.currentMrr ?? 0;

  const [nomadUser, setNomadUser] = useState<{ name?: string; level?: string; nivel?: string; doneTasks?: number } | null>(null);
  useEffect(() => {
    if (accountType !== "nomades") return;
    try {
      const u = JSON.parse(localStorage.getItem("allka_user") || "{}");
      setNomadUser(u);
    } catch { setNomadUser({}); }
  }, [accountType]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (collapsed) return;
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, startW: ctxWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    // Disable CSS transition during drag so the sidebar follows the cursor instantly
    if (sidebarRootRef.current) sidebarRootRef.current.style.transition = "none";
    const onMove = (mv: MouseEvent) => {
      if (!isResizingRef.current || !resizeStartRef.current) return;
      const newW = resizeStartRef.current.startW + (mv.clientX - resizeStartRef.current.x);
      // Auto-collapse when dragged below threshold
      if (newW < COLLAPSE_THRESHOLD) {
        isResizingRef.current = false;
        resizeStartRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (sidebarRootRef.current) sidebarRootRef.current.style.transition = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setCollapsed(true);
        setSidebarCollapsed(true);
        localStorage.setItem("sidebar-collapsed", JSON.stringify(true));
        window.dispatchEvent(new CustomEvent("sidebar-collapsed-change", { detail: { collapsed: true } }));
        return;
      }
      setSidebarWidth(newW);
    };
    const onUp = () => {
      isResizingRef.current = false;
      resizeStartRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // Re-enable CSS transition after drag
      if (sidebarRootRef.current) sidebarRootRef.current.style.transition = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Decide which theme to use: preview or saved
  const appliedTheme = previewTheme || sidebarSettings;

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed !== null) {
      const isCollapsed = JSON.parse(savedCollapsed);
      setCollapsed(isCollapsed);
      setSidebarCollapsed(isCollapsed);
    }

    const savedOrder = localStorage.getItem(`sidebar-order-${accountType}`);
    if (savedOrder) {
      try {
        setCustomOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error("Failed to parse saved order:", e);
      }
    }
  }, [accountType]);

  useEffect(() => {
    if (accountType !== "admin") return;
    let cancelled = false;
    Promise.all([
      apiClient.getProjects({ limit: "1" }).catch(() => null),
      apiClient.getCompanies({ limit: "1" }).catch(() => null),
      apiClient.getUsers({ limit: "1" }).catch(() => null),
    ]).then(([projects, companies, users]: any[]) => {
      if (cancelled) return;
      if (projects?.total !== undefined) setAdminProjectCount(projects.total);
      if (companies?.total !== undefined) setAdminCompanyCount(companies.total);
      if (users?.total !== undefined) setAdminUserCount(users.total);
    });
    return () => {
      cancelled = true;
    };
  }, [accountType]);

  const getNavigationItems = () => {
    // Admin users see all menu items
    if (accountType === "admin") {
      return navigationConfig.admin.map((item: any) => {
        if (item.name === "Projetos e Tarefas" && item.subitems) {
          return {
            ...item,
            subitems: item.subitems.map((sub: any) => {
              if (sub.href === "/admin/projetos") {
                return {
                  ...sub,
                  badge: adminProjectCount !== null ? String(adminProjectCount) : undefined,
                };
              }
              return sub;
            }),
          };
        }
        if (item.name === "Gestão de Contas" && item.subitems) {
          return {
            ...item,
            subitems: item.subitems.map((sub: any) => {
              if (sub.href === "/admin/empresas") {
                return {
                  ...sub,
                  badge: adminCompanyCount !== null ? String(adminCompanyCount) : undefined,
                };
              }
              if (sub.href === "/admin/usuarios") {
                return {
                  ...sub,
                  badge: adminUserCount !== null ? String(adminUserCount) : undefined,
                };
              }
              return sub;
            }),
          };
        }
        return item;
      });
    }

    // Regular users see only their account type menu
    if (accountType === "empresas") {
      return navigationConfig.empresas[accountSubType || "company"];
    }

    if (accountType === "lider") {
      return navigationConfig.lider;
    }

    return navigationConfig[accountType] || [];
  };

  const toggleCollapsed = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    setSidebarCollapsed(newCollapsed);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newCollapsed));
    window.dispatchEvent(
      new CustomEvent("sidebar-collapsed-change", {
        detail: { collapsed: newCollapsed },
      }),
    );
  };

  const navigation = (() => {
    const baseItems = getNavigationItems();

    if (customOrder.length === 0) {
      return baseItems;
    }

    const itemMap = new Map(baseItems.map((item) => [item.name, item]));

    const reordered = customOrder
      .map((name) => itemMap.get(name))
      .filter(Boolean) as any[];

    const orderedNames = new Set(customOrder);
    const newItems = baseItems.filter((item) => !orderedNames.has(item.name));

    return [...reordered, ...newItems];
  })();

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDragEnd = () => {
    if (draggedItem === null || dragOverItem === null) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const items = [...navigation];
    const draggedItemContent = items[draggedItem];
    items.splice(draggedItem, 1);
    items.splice(dragOverItem, 0, draggedItemContent);

    const itemNames = items.map((item) => item.name);
    setCustomOrder(itemNames);
    localStorage.setItem(
      `sidebar-order-${accountType}`,
      JSON.stringify(itemNames),
    );
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleSubitemDragStart = (
    e: React.DragEvent,
    parentIndex: number,
    subIndex: number,
  ) => {
    e.stopPropagation();
    setDraggedSubitem({ parentIndex, subIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSubitemDragOver = (
    e: React.DragEvent,
    parentIndex: number,
    subIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSubitem({ parentIndex, subIndex });
  };

  const handleSubitemDragEnd = () => {
    if (
      !draggedSubitem ||
      !dragOverSubitem ||
      draggedSubitem.parentIndex !== dragOverSubitem.parentIndex
    ) {
      setDraggedSubitem(null);
      setDragOverSubitem(null);
      return;
    }

    const items = [...navigation];
    const parentItem = items[draggedSubitem.parentIndex];
    if (!parentItem.subitems) return;

    const subitems = [...parentItem.subitems];
    const draggedSubitemContent = subitems[draggedSubitem.subIndex];
    subitems.splice(draggedSubitem.subIndex, 1);
    subitems.splice(dragOverSubitem.subIndex, 0, draggedSubitemContent);

    items[draggedSubitem.parentIndex] = { ...parentItem, subitems };

    const itemNames = items.map((item) => item.name);
    setCustomOrder(itemNames);
    localStorage.setItem(
      `sidebar-order-${accountType}`,
      JSON.stringify(itemNames),
    );
    setDraggedSubitem(null);
    setDragOverSubitem(null);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
    setDragOverSubitem(null);
  };

  useEffect(() => {
    const navElement = navRef.current;
    if (navElement) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = navElement;
        setIsScrolled(scrollTop > 10);
        setHasMoreContent(scrollTop + clientHeight < scrollHeight - 10);
      };

      handleScroll();
      navElement.addEventListener("scroll", handleScroll);
      return () => navElement.removeEventListener("scroll", handleScroll);
    }
  }, [navigation]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName],
    );
  };

  useEffect(() => {
    navigation.forEach((item: any) => {
      if (item.subitems) {
        const hasActiveSubitem = item.subitems.some(
          (subitem: any) => pathname === subitem.href,
        );
        if (hasActiveSubitem && !expandedItems.includes(item.name)) {
          setExpandedItems((prev) => [...prev, item.name]);
        }
      }
    });
  }, [pathname, navigation]);

  // Sync brand-gradient button CSS vars with the sidebar theme
  useEffect(() => {
    const bg = appliedTheme?.backgroundColor || "";
    const root = document.documentElement;
    if (!bg || bg === "bg-slate-900") {
      root.style.setProperty("--btn-g-from", "#000000");
      root.style.setProperty("--btn-g-mid", "#1a2a6f");
      root.style.setProperty("--btn-g-to", "#c81a7f");
    } else if (
      bg.includes("green") ||
      bg.includes("emerald") ||
      bg.includes("teal")
    ) {
      root.style.setProperty("--btn-g-from", "#064e3b");
      root.style.setProperty("--btn-g-mid", "#065f46");
      root.style.setProperty("--btn-g-to", "#0ea5e9");
    } else if (
      bg.includes("purple") ||
      bg.includes("violet") ||
      bg.includes("fuchsia")
    ) {
      root.style.setProperty("--btn-g-from", "#1e1b4b");
      root.style.setProperty("--btn-g-mid", "#4c1d95");
      root.style.setProperty("--btn-g-to", "#ec4899");
    } else if (
      bg.includes("red") ||
      bg.includes("rose") ||
      bg.includes("orange")
    ) {
      root.style.setProperty("--btn-g-from", "#1c0505");
      root.style.setProperty("--btn-g-mid", "#7f1d1d");
      root.style.setProperty("--btn-g-to", "#f97316");
    } else if (
      bg.includes("slate") ||
      bg.includes("gray") ||
      bg.includes("neutral") ||
      bg.includes("stone") ||
      bg.includes("zinc")
    ) {
      root.style.setProperty("--btn-g-from", "#0f172a");
      root.style.setProperty("--btn-g-mid", "#1e293b");
      root.style.setProperty("--btn-g-to", "#6366f1");
    } else if (bg.includes("indigo")) {
      root.style.setProperty("--btn-g-from", "#1e1b4b");
      root.style.setProperty("--btn-g-mid", "#3730a3");
      root.style.setProperty("--btn-g-to", "#c81a7f");
    } else {
      // blue (default) or unknown
      root.style.setProperty("--btn-g-from", "#000000");
      root.style.setProperty("--btn-g-mid", "#1a2a6f");
      root.style.setProperty("--btn-g-to", "#c81a7f");
    }
  }, [appliedTheme?.backgroundColor]);

  const getSidebarStyle = (): React.CSSProperties => {
    // Default style when no background is set or it's the default
    if (
      !appliedTheme.backgroundColor ||
      appliedTheme.backgroundColor === "bg-slate-900"
    ) {
      return {
        background:
          "linear-gradient(to bottom, #0b1336 0%, #12205e 28%, #2d1a6e 52%, #7d1b6a 78%, #c81a7f 100%)",
      };
    }

    // For image modes: return dominant color as base (image is rendered in a separate overlay div)
    if (
      appliedTheme.backgroundMode === "image" ||
      appliedTheme.backgroundMode === "image+gradient"
    ) {
      const dominant = appliedTheme.dominantImageColor;
      if (dominant) {
        if (dominant.startsWith("custom-gradient:"))
          return { background: dominant.replace("custom-gradient:", "") };
        return { background: dominant };
      }
      return { background: "#0a1628" };
    }

    // Handle gradient backgrounds
    if (
      appliedTheme.backgroundColor.includes("gradient") ||
      appliedTheme.backgroundColor.includes("custom-gradient:")
    ) {
      if (appliedTheme.backgroundColor.startsWith("custom-gradient:")) {
        return {
          background: appliedTheme.backgroundColor.replace(
            "custom-gradient:",
            "",
          ),
        };
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
      };

      return {
        background:
          gradientMap[appliedTheme.backgroundColor] ||
          appliedTheme.backgroundColor.replace("bg-", ""),
      };
    }

    // Solid color
    return { background: "var(--app-brand-gradient)" };
  };

  // Build background image layer style (applied to an absolute div, keeping sidebar content unaffected by opacity)
  const getImageLayerStyle = (): React.CSSProperties | null => {
    if (
      (appliedTheme.backgroundMode !== "image" &&
        appliedTheme.backgroundMode !== "image+gradient") ||
      !appliedTheme.backgroundImage
    )
      return null;

    const pos = appliedTheme.imagePosition || "center";
    const align = appliedTheme.imageAlignment || "center";
    const scale = appliedTheme.imageScale || 100;
    const opacity = (appliedTheme.imageOpacity ?? 100) / 100;

    const layers: string[] = [];
    const sizes: string[] = [];
    const positions: string[] = [];
    const repeats: string[] = [];

    // Color overlay (top layer)
    if (appliedTheme.imageOverlay && appliedTheme.imageOverlay !== "none") {
      const alpha = (appliedTheme.overlayIntensity || 30) / 100;
      const oc =
        appliedTheme.imageOverlay === "blue"
          ? `rgba(30,58,138,${alpha})`
          : appliedTheme.imageOverlay === "purple"
            ? `rgba(88,28,135,${alpha})`
            : `rgba(236,72,153,${alpha})`;
      layers.push(`linear-gradient(${oc}, ${oc})`);
      sizes.push("100% 100%");
      positions.push("0 0");
      repeats.push("no-repeat");
    }

    // Dark scrim for image+gradient mode (improves readability)
    if (appliedTheme.backgroundMode === "image+gradient") {
      layers.push("linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.55))");
      sizes.push("100% 100%");
      positions.push("0 0");
      repeats.push("no-repeat");
    }

    // The image itself (bottom layer)
    layers.push(`url(${appliedTheme.backgroundImage})`);
    sizes.push(`${scale}%`);
    positions.push(`${align} ${pos}`);
    repeats.push("no-repeat");

    return {
      backgroundImage: layers.join(", "),
      backgroundSize: sizes.join(", "),
      backgroundPosition: positions.join(", "),
      backgroundRepeat: repeats.join(", "),
      opacity,
    };
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative group/sbhover h-screen flex-shrink-0">
        <div
          ref={sidebarRootRef}
          data-sidebar-root
          className={cn(
            "flex flex-col h-screen text-white transition-all duration-300 relative overflow-hidden brand-surface",
            !appliedTheme.backgroundColor.includes("gradient") &&
              !appliedTheme.backgroundColor.includes("custom-gradient:") &&
              appliedTheme.backgroundColor !== "bg-slate-900" &&
              appliedTheme.backgroundColor,
          )}
          style={{
            ...getSidebarStyle(),
            width: collapsed ? 72 : ctxWidth,
            minWidth: collapsed ? 72 : ctxWidth,
          }}
        >
          {/* Background image overlay — rendered as first child so content stays fully visible */}
          {(() => {
            const imgStyle = getImageLayerStyle();
            if (!imgStyle) return null;
            return (
              <div
                className="absolute inset-0 pointer-events-none"
                style={imgStyle}
              />
            );
          })()}

          {/* Resize handle */}
          {!collapsed && (
            <div
              onMouseDown={handleResizeMouseDown}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize z-50 hover:bg-white/30 transition-colors"
            />
          )}
          <div
            className={cn(
              "relative flex items-center border-b border-white/10 backdrop-blur-sm transition-all duration-300 group",
              collapsed
                ? "justify-center py-1 px-3 flex-col"
                : "justify-between px-2 py-2 flex-row",
            )}
          >
            <div className="relative flex items-center">
              {collapsed ? (
                <img
                  src={sidebarSettings.sidebarFavicon || "/logo-allka-icon.png"}
                  alt="ALLKA"
                  className="h-20 w-20 object-contain transition-all duration-300 drop-shadow-lg"
                />
              ) : (
                <img
                  src={sidebarSettings.sidebarLogo || "/logo-allka-full.png"}
                  alt="ALLKA Logo"
                  className="h-10 w-auto object-contain transition-all duration-300 drop-shadow-lg"
                />
              )}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-0">
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
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {accountType === "nomades" && !collapsed && nomadUser && (() => {
            const rawLevel = (nomadUser.level ?? nomadUser.nivel ?? "bronze").toLowerCase();
            const lvl = LEVEL_CONFIG_NOMAD_SIDEBAR[rawLevel as keyof typeof LEVEL_CONFIG_NOMAD_SIDEBAR] ?? LEVEL_CONFIG_NOMAD_SIDEBAR.bronze;
            const doneTasks = nomadUser.doneTasks ?? 0;
            const nextReq = lvl.nextTasksRequired;
            const progress = nextReq ? Math.min(100, Math.round((doneTasks / nextReq) * 100)) : 100;
            const nomadName = nomadUser.name ?? nomadUser.nome ?? "Nômade";
            const initials = nomadName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div className="relative px-2 py-2 border-b border-white/10 backdrop-blur-sm">
                <Link
                  to="/nomad/dashboard"
                  className="w-full group relative overflow-hidden rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-300 p-3 border border-white/10 hover:border-white/20 block"
                >
                  <div className="relative flex items-center space-x-3 mb-2.5">
                    <div className="relative shrink-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-white bg-gradient-to-br ${lvl.gradient} ring-2 ring-white/20`}>
                        {initials}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-blue-100 transition-colors">
                        {nomadName}
                      </p>
                      <div className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${lvl.bg} ${lvl.border} border ${lvl.text}`}>
                        <span>{lvl.emoji}</span>
                        <span>{lvl.label}</span>
                      </div>
                    </div>
                    <Trophy className={`h-4 w-4 shrink-0 ${lvl.text} opacity-60`} />
                  </div>
                  {nextReq ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/50">Progresso → {lvl.nextLabel}</span>
                        <span className={`text-[10px] font-bold ${lvl.text}`}>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${lvl.bar} transition-all duration-700`} style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-[10px] text-white/40">{doneTasks}/{nextReq} tarefas · ver dashboard</p>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 text-[10px] ${lvl.text} font-semibold`}>
                      <Sparkles className="h-3 w-3" />
                      Nível máximo atingido!
                    </div>
                  )}
                </Link>
              </div>
            );
          })()}

          {accountType === "agencias" && !collapsed && (() => {
            const lvl = LEVEL_CONFIG_SIDEBAR[agenciaLevel];
            const nextReq = lvl.nextProjectsRequired;
            const progress = nextReq
              ? Math.min(100, Math.round((agenciaTotalProjects / nextReq) * 100))
              : 100;
            return (
              <div className="relative px-2 py-2 border-b border-white/10 backdrop-blur-sm">
                <button
                  onClick={() => setAgencyModalOpen(true)}
                  className="w-full group relative overflow-hidden rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-300 p-3 border border-white/10 hover:border-white/20"
                >
                  {/* Agency name + avatar row */}
                  <div className="relative flex items-center space-x-3 mb-2.5">
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10 ring-2 ring-white/20 group-hover:ring-white/30 transition-all duration-300">
                        <AvatarImage src={agencyProfile.logo || "/placeholder.svg"} alt={agencyProfile.name} />
                        <AvatarFallback className="bg-linear-to-br from-blue-600 to-pink-500 text-white">
                          <Building2 className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-blue-100 transition-colors">
                        {agencyProfile.name}
                      </p>
                      <div className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${lvl.bg} ${lvl.border} border ${lvl.text}`}>
                        <span>{lvl.emoji}</span>
                        <span>{lvl.label}</span>
                      </div>
                    </div>
                    <Trophy className={`h-4 w-4 shrink-0 ${lvl.text} opacity-60`} />
                  </div>

                  {/* Progress bar to next level */}
                  {nextReq ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white/50">
                          Progresso → {lvl.nextLabel}
                        </span>
                        <span className={`text-[10px] font-bold ${lvl.text}`}>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${lvl.bar} transition-all duration-700`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40">
                        {agenciaTotalProjects}/{nextReq} projetos · clique para ver requisitos
                      </p>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1.5 text-[10px] ${lvl.text} font-semibold`}>
                      <Sparkles className="h-3 w-3" />
                      Nível máximo atingido!
                    </div>
                  )}
                </button>
              </div>
            );
          })()}

          <nav
            ref={navRef}
            className={cn(
              "relative flex-1 px-2 py-4 space-y-1 backdrop-blur-sm overflow-y-auto sidebar-scrollbar scroll-fade-top scroll-fade-bottom",
              isScrolled && "scrolled",
              hasMoreContent && "has-more",
            )}
          >
            {navigation.map((item: any, index: number) => {
              if (item.subitems) {
                const isExpanded = expandedItems.includes(item.name);
                const hasActiveSubitem = item.subitems.some(
                  (subitem: any) => pathname === subitem.href,
                );

                if (collapsed) {
                  return (
                    <Popover
                      key={item.name}
                      open={openPopover === item.name}
                      onOpenChange={(open) =>
                        setOpenPopover(open ? item.name : null)
                      }
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
                            dragOverItem === index &&
                              "border-t-2 border-white/50",
                            draggedItem === index && "opacity-50",
                          )}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  "w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200",
                                  hasActiveSubitem
                                    ? "bg-white/20 text-white shadow-lg backdrop-blur-sm"
                                    : "text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                                )}
                              >
                                <item.icon className="h-5 w-5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {item.name}
                            </TooltipContent>
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
                          <div className="px-3 py-2 text-xs font-semibold text-white/90 border-b border-white/10 mb-2">
                            {item.name}
                          </div>
                          {item.subitems.map((subitem: any) => {
                            const isActive = pathname === subitem.href;
                            const isNavigatingHere = navigatingTo === subitem.href;
                            return (
                              <Link
                                key={subitem.name}
                                to={subitem.href}
                                onClick={() => {
                                  setOpenPopover(null);
                                  if (pathname !== subitem.href) setNavigatingTo(subitem.href);
                                }}
                                className={cn(
                                  "flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                                  isActive || isNavigatingHere
                                    ? "bg-white/15 text-white shadow-md"
                                    : "text-white/70 hover:bg-white/10 hover:text-white",
                                )}
                              >
                                {isNavigatingHere ? (
                                  <span className="h-4 w-4 mr-3 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                                ) : (
                                  <subitem.icon className="h-4 w-4 mr-3 shrink-0" />
                                )}
                                <span className="flex-1 truncate">
                                  {subitem.name}
                                </span>
                                {isNavigatingHere ? (
                                  <span className="text-[10px] text-white/50 animate-pulse">carregando...</span>
                                ) : subitem.badge ? (
                                  <Badge
                                    variant="secondary"
                                    className="bg-white/20 text-white text-xs"
                                  >
                                    {subitem.badge}
                                  </Badge>
                                ) : null}
                              </Link>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
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
                        "w-full flex items-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group",
                        hasActiveSubitem
                          ? "text-white shadow-lg backdrop-blur-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                      )}
                      style={
                        hasActiveSubitem
                          ? {
                              background:
                                "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, color-mix(in srgb, var(--app-brand-active, #c81a7f) 35%, transparent) 100%)",
                            }
                          : {}
                      }
                    >
                      <GripVertical className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" />
                      <item.icon className="h-5 w-5 mr-3" />
                      <span className="truncate text-left mr-1">
                        {item.name}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isExpanded && "transform rotate-180",
                        )}
                      />
                    </button>

                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-white/25 pl-2">
                        {item.subitems.map((subitem: any, subIndex: number) => {
                          const isActive = pathname === subitem.href;
                          return (
                            <div
                              key={subitem.name}
                              draggable
                              onDragStart={(e) =>
                                handleSubitemDragStart(e, index, subIndex)
                              }
                              onDragOver={(e) =>
                                handleSubitemDragOver(e, index, subIndex)
                              }
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
                              <Link
                                to={subitem.href}
                                onClick={() => {
                                  if (pathname !== subitem.href) setNavigatingTo(subitem.href);
                                }}
                                className={cn(
                                  "flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 group",
                                  isActive || navigatingTo === subitem.href
                                    ? "text-white shadow-md"
                                    : "text-white/70 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                                )}
                                style={
                                  isActive || navigatingTo === subitem.href
                                    ? {
                                        background:
                                          "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, color-mix(in srgb, var(--app-brand-active, #c81a7f) 35%, transparent) 100%)",
                                      }
                                    : {}
                                }
                              >
                                <GripVertical className="h-3 w-3 mr-1 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" />
                                {navigatingTo === subitem.href ? (
                                  <span className="h-4 w-4 mr-3 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                                ) : (
                                  <subitem.icon className="h-4 w-4 mr-3 shrink-0" />
                                )}
                                <span className="flex-1 truncate">
                                  {subitem.name}
                                </span>
                                {navigatingTo === subitem.href ? (
                                  <span className="text-[10px] text-white/50 animate-pulse">carregando...</span>
                                ) : subitem.badge ? (
                                  <Badge
                                    variant="secondary"
                                    className={
                                      isActive
                                        ? "text-white text-xs font-semibold px-2 border-0"
                                        : "bg-white/15 text-white/70 text-xs font-semibold px-2 border-0"
                                    }
                                    style={
                                      isActive
                                        ? {
                                            backgroundColor:
                                              "var(--app-brand-active, #c81a7f)",
                                          }
                                        : {}
                                    }
                                  >
                                    {subitem.badge}
                                  </Badge>
                                ) : null}
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = pathname === item.href;
              const isNavigatingHere = navigatingTo === item.href;
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
                      <Link
                        to={item.href}
                        onClick={() => {
                          if (pathname !== item.href) setNavigatingTo(item.href);
                        }}
                        className={cn(
                          "flex items-center px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group",
                          isActive || isNavigatingHere
                            ? "text-white shadow-lg backdrop-blur-sm"
                            : "text-white/80 hover:bg-white/10 hover:text-white backdrop-blur-sm",
                          collapsed && "justify-center",
                        )}
                        style={
                          isActive || isNavigatingHere
                            ? {
                                background:
                                  "linear-gradient(90deg, rgba(255,255,255,0.08) 0%, color-mix(in srgb, var(--app-brand-active, #c81a7f) 35%, transparent) 100%)",
                              }
                            : {}
                        }
                      >
                        {!collapsed && (
                          <GripVertical className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" />
                        )}
                        {isNavigatingHere ? (
                          <span
                            className={cn(
                              "h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0",
                              !collapsed && "mr-3",
                            )}
                          />
                        ) : (
                          <item.icon
                            className={cn("h-5 w-5 shrink-0", !collapsed && "mr-3")}
                          />
                        )}
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.name}</span>
                            {isNavigatingHere && (
                              <span className="text-[10px] text-white/60 font-normal animate-pulse">
                                carregando...
                              </span>
                            )}
                            {!isNavigatingHere && item.badge && (
                              <Badge
                                variant="secondary"
                                className={
                                  isActive
                                    ? "text-white text-xs font-semibold px-2 border-0"
                                    : "bg-white/15 text-white/70 text-xs font-semibold px-2 border-0"
                                }
                                style={
                                  isActive
                                    ? {
                                        backgroundColor:
                                          "var(--app-brand-active, #c81a7f)",
                                      }
                                    : {}
                                }
                              >
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
                            <Badge
                              variant="secondary"
                              className="bg-white/20 text-white text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom role pill */}
        {!collapsed && (
          <div className="px-3 pb-4 pt-2 shrink-0">
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/18 border border-white/15 backdrop-blur-sm transition-all duration-200 group"
            >
              <div className="h-7 w-7 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
                <Shield className="h-3.5 w-3.5 text-sky-300" />
              </div>
              <span className="flex-1 text-left text-xs font-semibold text-white/90 truncate capitalize">
                {accountType === "admin"
                  ? "Administrador"
                  : accountType === "agencias"
                    ? "Agência"
                    : accountType === "empresas"
                      ? "Empresa"
                      : accountType === "nomades"
                        ? "Nômade"
                        : "Parceiro"}
              </span>
              <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
              <ChevronDown className="h-3 w-3 text-white/50 shrink-0 group-hover:text-white/80 transition-colors" />
            </button>
          </div>
        )}

        {/* Floating hover buttons outside sidebar, right side, only when collapsed */}
        {collapsed && (
          <div
            className="absolute top-0 left-full flex flex-col gap-1 px-1 pt-3 pb-2 rounded-r-xl opacity-0 group-hover/sbhover:opacity-100 transition-opacity duration-200 z-[60] pointer-events-none group-hover/sbhover:pointer-events-auto brand-surface"
            style={getSidebarStyle()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapsed}
                  className="text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 p-2 rounded-full h-8 w-8 flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-white/90 text-gray-900 text-xs font-medium"
              >
                Expandir Sidebar
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsModalOpen(true)}
                  className="text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 p-2 rounded-full h-8 w-8 flex items-center justify-center"
                >
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-white/90 text-gray-900 text-xs font-medium"
              >
                Personalizar Cores
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Modals */}
      <SidebarSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* Agency Level Modal */}
      {accountType === "agencias" && (() => {
        const lvl = LEVEL_CONFIG_SIDEBAR[agenciaLevel];
        const levels = Object.entries(LEVEL_CONFIG_SIDEBAR) as [keyof typeof LEVEL_CONFIG_SIDEBAR, typeof LEVEL_CONFIG_SIDEBAR[keyof typeof LEVEL_CONFIG_SIDEBAR]][];
        const currentLevelIndex = levels.findIndex(([key]) => key === agenciaLevel);
        const nextReq = lvl.nextProjectsRequired;
        const progressProjects = nextReq ? Math.min(100, Math.round((agenciaTotalProjects / nextReq) * 100)) : 100;
        const nextMrrReq = lvl.nextMrrRequired;
        const progressMrr = nextMrrReq ? Math.min(100, Math.round((agenciaMrr / nextMrrReq) * 100)) : 100;
        const overallProgress = Math.max(progressProjects, progressMrr);
        const fmtBRL = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`;

        return (
          <Dialog open={agencyModalOpen} onOpenChange={setAgencyModalOpen}>
            <DialogContent
              className="!fixed !top-3 !bottom-3 !right-3 !translate-x-0 !translate-y-0 !max-w-none !w-auto flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl"
              style={{ left: "calc(var(--sidebar-width, 240px) + 6px)" }}
            >
              {/* Hero header — fixed height */}
              <div className={`bg-linear-to-br ${lvl.gradient} px-8 pt-8 pb-6 text-white relative overflow-hidden shrink-0`}>
                <div className="absolute -top-8 -right-8 text-[180px] opacity-[0.07] select-none leading-none">{lvl.emoji}</div>
                <DialogHeader className="relative">
                  <div className="flex items-start gap-5">
                    <div className={`w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-5xl shadow-2xl ${lvl.glow} shrink-0`}>
                      {lvl.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Nível atual</p>
                      <DialogTitle className="text-4xl font-black text-white leading-none">{lvl.label}</DialogTitle>
                      <p className="text-white/70 text-sm mt-1.5">{agencyProfile.name}</p>
                    </div>
                    {agenciaLevel !== "diamond" && (
                      <div className="text-right shrink-0">
                        <p className="text-white/60 text-xs mb-1">Progresso → {lvl.nextLabel}</p>
                        <p className="text-5xl font-black text-white leading-none">{overallProgress}<span className="text-2xl text-white/50">%</span></p>
                      </div>
                    )}
                  </div>

                  {/* Progress bars */}
                  {nextReq && (
                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <div className="bg-white/10 rounded-xl p-3.5">
                        <div className="flex justify-between text-xs text-white/70 mb-2">
                          <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Projetos ativos</span>
                          <span className="font-bold text-white">{agenciaTotalProjects} / {nextReq}</span>
                        </div>
                        <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progressProjects}%` }} />
                        </div>
                        <p className="text-[10px] text-white/50 mt-1">faltam {Math.max(0, nextReq - agenciaTotalProjects)} projetos</p>
                      </div>
                      {nextMrrReq && (
                        <div className="bg-white/10 rounded-xl p-3.5">
                          <div className="flex justify-between text-xs text-white/70 mb-2">
                            <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> MRR mensal</span>
                            <span className="font-bold text-white">{fmtBRL(agenciaMrr)} / {fmtBRL(nextMrrReq)}</span>
                          </div>
                          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progressMrr}%` }} />
                          </div>
                          <p className="text-[10px] text-white/50 mt-1">faltam {fmtBRL(Math.max(0, nextMrrReq - agenciaMrr))}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {agenciaLevel === "diamond" && (
                    <div className="mt-4 bg-white/10 rounded-xl px-5 py-3 text-sm text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Você está no nível máximo — parabéns!
                    </div>
                  )}
                </DialogHeader>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto bg-card p-6 space-y-8">

                {/* All levels — large cards */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Trophy className="h-3.5 w-3.5" /> Todos os níveis
                  </p>
                  <div className="grid grid-cols-5 gap-4">
                    {levels.map(([key, cfg], i) => {
                      const isUnlocked = i <= currentLevelIndex;
                      const isCurrent = i === currentLevelIndex;
                      const reqToReach = i === 0 ? null : {
                        projects: levels[i - 1][1].nextProjectsRequired,
                        mrr: levels[i - 1][1].nextMrrRequired,
                      };
                      const progressToThis = reqToReach?.projects
                        ? Math.min(100, Math.round((agenciaTotalProjects / reqToReach.projects) * 100))
                        : 0;

                      return (
                        <Tooltip key={key} delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "relative rounded-2xl border-2 p-5 flex flex-col items-center gap-3 cursor-default transition-all duration-300 group",
                              isCurrent && `border-transparent bg-gradient-to-br ${cfg.gradient} text-white shadow-xl`,
                              isUnlocked && !isCurrent && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:shadow-md",
                              !isUnlocked && "border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/70 hover:shadow-md",
                            )}>
                              {!isUnlocked && (
                                <div className="absolute top-3 right-3 opacity-40 group-hover:opacity-70 transition-opacity">
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                              )}
                              {isUnlocked && !isCurrent && (
                                <div className="absolute top-3 right-3">
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                </div>
                              )}

                              <span className={cn("text-4xl transition-all duration-300", !isUnlocked && "grayscale group-hover:grayscale-0")}>{cfg.emoji}</span>
                              <span className={cn(
                                "text-sm font-bold text-center",
                                isCurrent ? "text-white" : "text-foreground",
                              )}>{cfg.label}</span>

                              {!isUnlocked && reqToReach?.projects && (
                                <div className="w-full space-y-1">
                                  <div className="h-1.5 bg-border/60 rounded-full overflow-hidden">
                                    <div className={`h-full ${cfg.bar} rounded-full transition-all duration-700`} style={{ width: `${progressToThis}%` }} />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground text-center">{progressToThis}% completo</p>
                                </div>
                              )}
                              {isCurrent && (
                                <span className="text-[10px] font-bold bg-white/25 text-white rounded-full px-2.5 py-0.5">Atual</span>
                              )}
                              {isUnlocked && !isCurrent && (
                                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full px-2.5 py-0.5">✓ Desbloqueado</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={8} className="w-56 p-4 space-y-3">
                            <div className="flex items-center gap-2.5 pb-2 border-b">
                              <span className="text-2xl">{cfg.emoji}</span>
                              <div>
                                <p className="font-bold text-sm">{cfg.label}</p>
                                {isUnlocked
                                  ? <p className="text-[10px] text-emerald-600 font-semibold">✓ Desbloqueado</p>
                                  : <p className="text-[10px] text-muted-foreground">Bloqueado</p>}
                              </div>
                            </div>
                            {!isUnlocked && reqToReach && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-foreground">Para desbloquear:</p>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <div className="flex justify-between">
                                    <span>📁 Projetos</span>
                                    <span className="font-semibold text-foreground">{agenciaTotalProjects}/{reqToReach.projects}</span>
                                  </div>
                                  {reqToReach.mrr && (
                                    <div className="flex justify-between">
                                      <span>📈 MRR</span>
                                      <span className="font-semibold text-foreground">{fmtBRL(agenciaMrr)}/{fmtBRL(reqToReach.mrr)}</span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground/60 italic">Atinja qualquer um dos dois</p>
                              </div>
                            )}
                            <div className="space-y-1 border-t pt-2">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Benefícios</p>
                              {cfg.benefits.map((b, bi) => (
                                <p key={bi} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-emerald-500 mt-0.5 shrink-0">•</span>{b}
                                </p>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                {/* Benefits grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Benefícios ativos — {lvl.label}
                    </h3>
                    <div className="space-y-2.5">
                      {lvl.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>

                  {lvl.nextBenefits.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        O que você ganha em {lvl.nextLabel}
                      </h3>
                      <div className="space-y-2.5">
                        {lvl.nextBenefits.map((b, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            {b}
                          </div>
                        ))}
                      </div>
                      {nextReq && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                          Faltam {Math.max(0, nextReq - agenciaTotalProjects)} projetos ou {nextMrrReq ? fmtBRL(Math.max(0, nextMrrReq - agenciaMrr)) + " em MRR" : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 p-5 flex flex-col items-center justify-center gap-3">
                      <span className="text-5xl">🏆</span>
                      <p className="text-sm font-bold text-violet-700 dark:text-violet-300 text-center">Elite Allka</p>
                      <p className="text-xs text-muted-foreground text-center">Você é parte da elite da plataforma. Obrigado por crescer com a Allka!</p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-center text-muted-foreground/50">
                  Passe o mouse sobre os níveis para ver requisitos e benefícios detalhados
                </p>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </TooltipProvider>
  );
}
