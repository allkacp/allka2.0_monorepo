import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAccountType } from "@/contexts/account-type-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ChevronRight,
  Package,
  BookOpen,
} from "lucide-react";

const horizontalMenuConfig = {
  empresas: {
    company: [
      {
        name: "Dashboard",
        href: "/company/dashboard",
        icon: LayoutDashboard,
        color: "from-blue-500 to-blue-600",
      },
      {
        name: "Projetos",
        href: "/company/projetos",
        icon: FolderOpen,
        badge: "8",
        color: "from-purple-500 to-purple-600",
      },
      {
        name: "Aprovações",
        href: "/company/aprovacoes",
        icon: CheckSquare,
        badge: "3",
        color: "from-green-500 to-green-600",
      },
      {
        name: "Pagamentos",
        href: "/company/pagamentos",
        icon: CreditCard,
        color: "from-orange-500 to-orange-600",
      },
      {
        name: "Relatórios",
        href: "/company/relatorios",
        icon: BarChart3,
        color: "from-pink-500 to-pink-600",
      },
    ],
    "in-house": [
      {
        name: "Dashboard",
        href: "/in-house/dashboard",
        icon: LayoutDashboard,
        color: "from-blue-500 to-blue-600",
      },
      {
        name: "Catálogo",
        href: "/in-house/catalogo",
        icon: Briefcase,
        color: "from-indigo-500 to-indigo-600",
      },
      {
        name: "Projetos",
        href: "/in-house/projetos",
        icon: FolderOpen,
        badge: "12",
        color: "from-purple-500 to-purple-600",
      },
      {
        name: "Equipe",
        href: "/in-house/equipe",
        icon: Users,
        badge: "8",
        color: "from-green-500 to-green-600",
      },
      {
        name: "Financeiro",
        href: "/in-house/financeiro",
        icon: Wallet,
        color: "from-orange-500 to-orange-600",
      },
    ],
  },
  agencias: [
    {
      name: "Dashboard",
      href: "/agencias/dashboard",
      icon: LayoutDashboard,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Clientes",
      href: "/agencias/clientes",
      icon: Building2,
      badge: "15",
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Projetos",
      href: "/agencias/projetos",
      icon: FolderOpen,
      badge: "24",
      color: "from-green-500 to-green-600",
    },
    {
      name: "Partner",
      href: "/agencias/programa",
      icon: Award,
      color: "from-amber-500 to-amber-600",
    },
    {
      name: "Equipe",
      href: "/agencias/equipe",
      icon: Users,
      badge: "8",
      color: "from-pink-500 to-pink-600",
    },
  ],
  nomades: [
    {
      name: "Dashboard",
      href: "/nomades/dashboard",
      icon: LayoutDashboard,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Tarefas",
      href: "/nomades/tarefasdisponiveis",
      icon: Target,
      badge: "18",
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Minhas",
      href: "/nomades/minhastarefas",
      icon: CheckSquare,
      badge: "6",
      color: "from-green-500 to-green-600",
    },
    {
      name: "Ganhos",
      href: "/nomades/ganhos",
      icon: Wallet,
      color: "from-orange-500 to-orange-600",
    },
    {
      name: "Habilitações",
      href: "/nomades/habilitacoes",
      icon: Award,
      color: "from-pink-500 to-pink-600",
    },
  ],
  admin: [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
      color: "from-blue-500 to-blue-600",
    },
    {
      name: "Usuários",
      href: "/admin/clientes",
      icon: Users,
      badge: "89",
      color: "from-purple-500 to-purple-600",
    },
    {
      name: "Projetos",
      href: "/admin/projetos",
      icon: FolderOpen,
      badge: "156",
      color: "from-green-500 to-green-600",
    },
    {
      name: "Gestão",
      href: "/admin/produtos",
      icon: Package,
      color: "from-orange-500 to-orange-600",
    },
    {
      name: "Catálogo",
      href: "/admin/catalogo-produtos",
      icon: BookOpen,
      color: "from-teal-500 to-teal-600",
    },
    {
      name: "Financeiro",
      href: "/admin/financeiro",
      icon: Wallet,
      color: "from-pink-500 to-pink-600",
    },
  ],
};

interface HorizontalMenuBarProps {
  onMenuClick: () => void;
}

export function HorizontalMenuBar({ onMenuClick }: HorizontalMenuBarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { accountType, accountSubType } = useAccountType();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const getNavigationItems = () => {
    if (accountType === "admin") {
      return horizontalMenuConfig.admin;
    }
    if (accountType === "empresas") {
      return horizontalMenuConfig.empresas[accountSubType || "company"];
    }
    return horizontalMenuConfig[accountType] || [];
  };

  const navigation = getNavigationItems();

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftFade(scrollLeft > 10);
      setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    }
  }, [navigation]);

  return (
    <div className="xl:hidden sticky top-0 z-30 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 border-b border-white/10">
      <div className="relative">
        {/* Fade edges */}
        {showLeftFade && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
        )}
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-900 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-3 px-4 py-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex-shrink-0 snap-center relative group",
                  "transition-all duration-300 active:scale-95",
                )}
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center",
                    "w-20 h-20 rounded-2xl",
                    "transition-all duration-300",
                    isActive
                      ? `bg-gradient-to-br ${item.color} shadow-lg scale-105`
                      : "bg-white/10 hover:bg-white/15 backdrop-blur-sm",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 mb-1",
                      isActive ? "text-white" : "text-white/80",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium text-center leading-tight px-1",
                      isActive ? "text-white" : "text-white/80",
                    )}
                  >
                    {item.name}
                  </span>

                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold bg-red-500 text-white border-2 border-slate-900"
                    >
                      {item.badge}
                    </Badge>
                  )}

                  {isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-white rounded-full" />
                  )}
                </div>
              </Link>
            );
          })}

          {/* Menu button */}
          <Button
            onClick={onMenuClick}
            className={cn(
              "flex-shrink-0 snap-center",
              "flex flex-col items-center justify-center",
              "w-20 h-20 rounded-2xl",
              "bg-white/10 hover:bg-white/20 backdrop-blur-sm",
              "transition-all duration-300 active:scale-95",
              "border border-white/20",
            )}
          >
            <Menu className="h-6 w-6 mb-1 text-white" />
            <span className="text-[10px] font-medium text-white text-center leading-tight">
              Todos
            </span>
            <ChevronRight className="h-3 w-3 text-white/60 mt-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
