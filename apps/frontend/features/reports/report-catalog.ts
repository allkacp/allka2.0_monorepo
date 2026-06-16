import {
  DollarSign,
  TrendingUp,
  ReceiptText,
  BarChart3,
  Banknote,
  Activity,
  FolderKanban,
  CheckSquare,
  Users,
  Award,
  Star,
  Megaphone,
  Tag,
  Shield,
  Lock,
  Settings,
  Cpu,
  Building2,
} from "lucide-react";

export interface ReportEntry {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  formats: string[];
}

export interface ReportCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  lightBg: string;
  lightText: string;
  border: string;
  reports: ReportEntry[];
}

import type React from "react";

export const CATEGORIES: ReportCategory[] = [
  {
    id: "financial",
    name: "Financeiro",
    icon: DollarSign,
    gradient: "from-emerald-500 to-emerald-600",
    lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
    lightText: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-700/40",
    reports: [
      { id: "revenue",    name: "Receitas e Faturamento",   desc: "Análise detalhada de receitas por período, empresa e projeto", icon: TrendingUp,  formats: ["PDF", "XLSX"] },
      { id: "invoices",   name: "Faturas e Cobranças",       desc: "Gestão de faturas, inadimplência e histórico de pagamentos",    icon: ReceiptText, formats: ["PDF", "XLSX"] },
      { id: "cashflow",   name: "Fluxo de Caixa",            desc: "Movimentações financeiras, entradas e saídas",                  icon: BarChart3,   formats: ["PDF"] },
      { id: "withdrawals",name: "Saques de Parceiros",       desc: "Solicitações, aprovações e pagamentos de saques",               icon: Banknote,    formats: ["XLSX"] },
    ],
  },
  {
    id: "operations",
    name: "Operações",
    icon: Activity,
    gradient: "from-blue-500 to-blue-600",
    lightBg: "bg-blue-50 dark:bg-blue-950/30",
    lightText: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-700/40",
    reports: [
      { id: "projects",     name: "Projetos e Entregas",         desc: "Status, progresso e métricas de projetos ativos",             icon: FolderKanban, formats: ["PDF", "XLSX"] },
      { id: "tasks",        name: "Tarefas e Atividades",         desc: "Acompanhamento de execução, aprovação e rejeição de tarefas", icon: CheckSquare,  formats: ["PDF", "XLSX"] },
      { id: "availability", name: "Disponibilidade de Nômades",   desc: "Capacidade, alocação e agenda dos profissionais",             icon: Users,        formats: ["PDF"] },
      { id: "performance",  name: "Performance Operacional",       desc: "KPIs operacionais, SLAs e indicadores de qualidade",          icon: BarChart3,    formats: ["PDF"] },
    ],
  },
  {
    id: "users",
    name: "Usuários e Clientes",
    icon: Users,
    gradient: "from-violet-500 to-violet-600",
    lightBg: "bg-violet-50 dark:bg-violet-950/30",
    lightText: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-700/40",
    reports: [
      { id: "companies",    name: "Empresas Clientes",       desc: "Cadastro, status e histórico de empresas parceiras",            icon: Building2, formats: ["PDF", "XLSX"] },
      { id: "nomades",      name: "Nômades e Freelancers",   desc: "Profissionais cadastrados, níveis, performance e atividade",   icon: Users,     formats: ["PDF", "XLSX"] },
      { id: "engagement",   name: "Engajamento de Usuários", desc: "Atividade, retenção e padrões de uso da plataforma",           icon: Activity,  formats: ["PDF"] },
      { id: "satisfaction", name: "Satisfação e NPS",        desc: "Feedback, avaliações e Net Promoter Score",                   icon: Star,      formats: ["PDF"] },
    ],
  },
  {
    id: "gamification",
    name: "Gamificação",
    icon: Award,
    gradient: "from-amber-500 to-amber-600",
    lightBg: "bg-amber-50 dark:bg-amber-950/30",
    lightText: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-700/40",
    reports: [
      { id: "levels",       name: "Níveis e Progressão",    desc: "Evolução de níveis, pontos e histórico de upgrades",    icon: Award,      formats: ["PDF", "XLSX"] },
      { id: "achievements", name: "Conquistas e Badges",    desc: "Sistema de recompensas e conquistas desbloqueadas",     icon: Star,       formats: ["PDF"] },
      { id: "leaderboard",  name: "Ranking e Performance",  desc: "Top performers, classificação e competições internas",  icon: TrendingUp, formats: ["PDF"] },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Megaphone,
    gradient: "from-pink-500 to-rose-600",
    lightBg: "bg-pink-50 dark:bg-pink-950/30",
    lightText: "text-pink-700 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-700/40",
    reports: [
      { id: "campaigns",  name: "Campanhas de Marketing", desc: "Performance de campanhas, alcance e conversão",          icon: Megaphone, formats: ["PDF", "XLSX"] },
      { id: "referrals",  name: "Indicações e Referrals", desc: "Programa de indicação, conversões e recompensas",        icon: Users,     formats: ["XLSX"] },
      { id: "promotions", name: "Promoções e Cupons",     desc: "Uso de descontos, cupons e impacto no faturamento",      icon: Tag,       formats: ["PDF", "XLSX"] },
      { id: "conversion", name: "Conversão e Funil",      desc: "Jornada do cliente, drop-off e taxa de conversão",      icon: BarChart3, formats: ["PDF"] },
    ],
  },
  {
    id: "system",
    name: "Sistema",
    icon: Cpu,
    gradient: "from-slate-500 to-slate-600",
    lightBg: "bg-slate-100 dark:bg-slate-800/50",
    lightText: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-600/40",
    reports: [
      { id: "audit",        name: "Auditoria e Logs",      desc: "Histórico completo de ações, alterações e eventos",       icon: Shield,   formats: ["PDF", "XLSX"] },
      { id: "security",     name: "Segurança e Acessos",   desc: "Tentativas de acesso, permissões e controle de sessões",  icon: Lock,     formats: ["PDF"] },
      { id: "integrations", name: "Integrações e APIs",    desc: "Status, uso e erros das integrações externas",            icon: Settings, formats: ["XLSX"] },
      { id: "perf-sys",     name: "Performance do Sistema",desc: "Tempo de resposta, disponibilidade e uso de recursos",    icon: Cpu,      formats: ["PDF"] },
    ],
  },
];

export const ALL_REPORT_KEYS: string[] = CATEGORIES.flatMap((c) =>
  c.reports.map((r) => r.id),
);
