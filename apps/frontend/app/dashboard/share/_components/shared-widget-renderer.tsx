// @ts-nocheck
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FilterState } from "@/lib/share-token";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Briefcase,
  Activity,
  CheckCircle2,
  BarChart2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CreditCard,
  Target,
  ShieldCheck,
  Clock,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Period scaling (placeholder until real API exists) ───────────────────────
// Maps period type → fraction of monthly baseline, so data visually responds
// to filter changes. Swap generateShareData() for a real fetch when backend lands.
const PERIOD_SCALE: Record<string, number> = {
  today: 0.03,
  yesterday: 0.03,
  last_7_days: 0.22,
  last_30_days: 1.0,
  this_month: 0.92,
  last_month: 0.88,
  last_quarter: 3.1,
  last_90_days: 2.9,
  this_year: 11.2,
  custom: 1.0,
};

// ─── Mock data shape ──────────────────────────────────────────────────────────
// Will be replaced with real API data once backend share endpoint exists.
export const generateShareData = (filters?: FilterState) => {
  const scale = PERIOD_SCALE[filters?.periodType ?? "last_30_days"] ?? 1.0;
  const n = (base: number) => Math.round(base * scale);
  const pct = (base: number) =>
    parseFloat((base * (scale < 1 ? 0.8 : Math.min(scale, 1.5))).toFixed(1));

  return ({
  revenue: {
    total: n(270800),
    growth: pct(12.4),
    recurring: n(198400),
    oneTime: n(72400),
    projected: n(310000),
  },
  mrr: {
    value: n(198400),
    growth: pct(8.2),
    trendData: [155000, 162000, 169000, 175000, 183000, 198400].map(n),
  },
  churn: {
    rate: pct(3.2),
    inactiveAccounts: n(14),
    cancelledProjects: n(7),
    revenueChurn: n(6380),
    revenueChurnRate: pct(3.2),
  },
  averageTicket: {
    general: n(4680),
    growth: pct(5.1),
    perProject: n(3240),
    trendData: [4100, 4250, 4380, 4510, 4620, 4680].map(n),
  },
  ltv: {
    value: n(28600),
    agencies: n(42000),
    leadPremium: n(35000),
    nomades: n(18000),
    hist0to1k: Math.max(1, n(12)),
    hist1kto5k: Math.max(1, n(28)),
    hist5kto15k: Math.max(1, n(45)),
    hist15kplus: Math.max(1, n(15)),
  },
  activeProjects: {
    total: n(147),
    inProgress: n(89),
    delivered: n(43),
    pending: n(15),
    growth: pct(6.8),
  },
  tasks: {
    total: n(384),
    done: n(218),
    inProgress: n(96),
    pending: n(70),
    completionRate: pct(56.8),
  },
  accountsReceivable: {
    total: n(89400),
    creditPlans: n(52000),
    postPaid: n(28000),
    others: n(9400),
    received: n(43200),
    growth: pct(4.2),
  },
  nomads: {
    total: n(312),
    active: n(248),
    newThisMonth: Math.max(0, n(34)),
    growth: pct(12.2),
    avgRating: 4.7,
  },
  partnerProgram: {
    activePartners: n(48),
    totalReferrals: n(186),
    conversionRate: pct(24.2),
    partnerRevenue: n(38400),
  },
  statusOverview: {
    active: n(84),
    trial: n(12),
    suspended: n(6),
    cancelled: n(4),
    total: n(106),
  },
  creditPlans: {
    active: n(62),
    totalValue: n(52000),
    avgValue: 839,
    overdue: Math.max(0, n(5)),
  },
  platformActivities: {
    logins: n(1248),
    projectsCreated: Math.max(0, n(47)),
    tasksCompleted: Math.max(0, n(218)),
    messagesExchanged: n(3840),
  },
});};

export type ShareData = ReturnType<typeof generateShareData>;

// ─── Widget title map ─────────────────────────────────────────────────────────
export const WIDGET_TITLES: Record<string, string> = {
  metrics: "Métricas Principais",
  revenue: "Receita",
  mrr: "MRR (Receita Recorrente)",
  churn: "CHURN",
  averageTicket: "Ticket Médio",
  ltv: "LTV (Lifetime Value)",
  activeProjectsWidget: "Projetos Ativos",
  tasks: "Tarefas (Resumo)",
  accountsReceivable: "À Receber",
  nomads: "Nômades",
  nomadsIndicators: "Indicadores dos Nômades",
  partnerProgram: "Programa Partner",
  statusOverview: "Visão Geral por Status",
  creditPlans: "Planos de Crédito",
  platformActivities: "Atividades da Plataforma",
  nomadsRanking: "Ranking de Nômades",
  agenciesRanking: "Ranking de Agências",
  activeUsers: "Usuários Ativos",
  activity: "Atividade Recente",
  alerts: "Alertas Rápidos",
  cmv: "CMV",
  userDistribution: "Distribuição de Usuários",
};

// ─── Color palette for KPI cards ──────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  primary:
    "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/60",
  success:
    "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
  warning:
    "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
  destructive:
    "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40",
  info:
    "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
  purple:
    "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40",
};

// ─── Base UI components ───────────────────────────────────────────────────────

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  color = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ElementType;
  trend?: number;
  color?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 truncate">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground leading-none">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-lg shrink-0", COLOR_MAP[color])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-semibold",
            trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
          )}
        >
          {trend >= 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {Math.abs(trend)}% vs período anterior
        </div>
      )}
    </div>
  );
}

export function MiniBar({
  value,
  max,
  color = "bg-primary",
  label,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-foreground">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Section wrapper used in FullDashboardView ────────────────────────────────
export function WidgetSection({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        {accent && (
          <div
            className="w-1 h-4 rounded-full shrink-0"
            style={{ background: accent }}
          />
        )}
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </h2>
        <div className="flex-1 h-px bg-border/50" />
      </div>
      {children}
    </section>
  );
}

// ─── Widget card wrapper (for single widget page) ─────────────────────────────
export function WidgetCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          Somente leitura
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Individual widget renderers ──────────────────────────────────────────────

export function WidgetRevenue({ data }: { data: ShareData }) {
  const d = data.revenue;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Receita Total" value={`R$ ${d.total.toLocaleString("pt-BR")}`} icon={DollarSign} trend={d.growth} color="success" />
      <KpiCard label="Receita Recorrente" value={`R$ ${d.recurring.toLocaleString("pt-BR")}`} icon={TrendingUp} color="primary" />
      <KpiCard label="Receita Avulsa" value={`R$ ${d.oneTime.toLocaleString("pt-BR")}`} icon={CreditCard} color="info" />
      <KpiCard label="Projeção" value={`R$ ${d.projected.toLocaleString("pt-BR")}`} icon={Target} color="purple" />
    </div>
  );
}

export function WidgetMrr({ data }: { data: ShareData }) {
  const d = data.mrr;
  const maxVal = Math.max(...d.trendData);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard label="MRR Atual" value={`R$ ${d.value.toLocaleString("pt-BR")}`} icon={TrendingUp} trend={d.growth} color="primary" />
        <KpiCard label="Crescimento Mensal" value={`+${d.growth}%`} icon={BarChart2} color="success" />
      </div>
      <div className="bg-muted/30 rounded-xl p-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Tendência 6 meses
        </p>
        <div className="flex items-end gap-1.5 h-16">
          {d.trendData.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end gap-1">
              <div
                className="rounded-t transition-all duration-300"
                style={{
                  height: `${Math.round((v / maxVal) * 100)}%`,
                  background: i === d.trendData.length - 1
                    ? "linear-gradient(180deg, #c81a7f 0%, #1a2a6f 100%)"
                    : "linear-gradient(180deg, #94a3b8 0%, #cbd5e1 100%)",
                  minHeight: 4,
                }}
              />
              <span className="text-[9px] text-muted-foreground text-center">
                M{i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WidgetChurn({ data }: { data: ShareData }) {
  const d = data.churn;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Taxa de Churn" value={`${d.rate}%`} icon={TrendingDown} color="destructive" />
      <KpiCard label="Contas Inativas" value={String(d.inactiveAccounts)} icon={Users} color="warning" />
      <KpiCard label="Proj. Cancelados" value={String(d.cancelledProjects)} icon={XCircle} color="destructive" />
      <KpiCard label="Rev. Churn" value={`R$ ${d.revenueChurn.toLocaleString("pt-BR")}`} icon={DollarSign} color="warning" />
    </div>
  );
}

export function WidgetAverageTicket({ data }: { data: ShareData }) {
  const d = data.averageTicket;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard label="Ticket Médio Geral" value={`R$ ${d.general.toLocaleString("pt-BR")}`} icon={DollarSign} trend={d.growth} color="success" />
      <KpiCard label="Ticket por Projeto" value={`R$ ${d.perProject.toLocaleString("pt-BR")}`} icon={Briefcase} color="primary" />
      <KpiCard label="Crescimento" value={`+${d.growth}%`} icon={TrendingUp} color="info" />
    </div>
  );
}

export function WidgetLtv({ data }: { data: ShareData }) {
  const d = data.ltv;
  const rows = [
    { label: "R$ 0–1k", value: d.hist0to1k, color: "bg-blue-400" },
    { label: "R$ 1k–5k", value: d.hist1kto5k, color: "bg-blue-500" },
    { label: "R$ 5k–15k", value: d.hist5kto15k, color: "bg-primary" },
    { label: "R$ 15k+", value: d.hist15kplus, color: "bg-violet-500" },
  ];
  return (
    <div className="space-y-4">
      <KpiCard label="LTV Médio" value={`R$ ${d.value.toLocaleString("pt-BR")}`} icon={Target} color="primary" />
      <div className="space-y-2.5">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Distribuição por Valor
        </p>
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground">{row.value} clientes</span>
            </div>
            <MiniBar value={row.value} max={d.hist5kto15k} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetActiveProjects({ data }: { data: ShareData }) {
  const d = data.activeProjects;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Total" value={String(d.total)} icon={Briefcase} trend={d.growth} color="primary" />
      <KpiCard label="Em Andamento" value={String(d.inProgress)} icon={Activity} color="info" />
      <KpiCard label="Entregues" value={String(d.delivered)} icon={CheckCircle2} color="success" />
      <KpiCard label="Pendentes" value={String(d.pending)} icon={Clock} color="warning" />
    </div>
  );
}

export function WidgetTasks({ data }: { data: ShareData }) {
  const d = data.tasks;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total" value={String(d.total)} icon={Layers} color="primary" />
        <KpiCard label="Concluídas" value={String(d.done)} icon={CheckCircle2} color="success" />
        <KpiCard label="Em Andamento" value={String(d.inProgress)} icon={Activity} color="info" />
        <KpiCard label="Pendentes" value={String(d.pending)} icon={Clock} color="warning" />
      </div>
      <div className="bg-muted/30 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">Taxa de conclusão</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {d.completionRate}%
          </span>
        </div>
        <MiniBar value={d.completionRate} max={100} color="bg-emerald-500" />
      </div>
    </div>
  );
}

export function WidgetAccountsReceivable({ data }: { data: ShareData }) {
  const d = data.accountsReceivable;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total a Receber" value={`R$ ${d.total.toLocaleString("pt-BR")}`} icon={DollarSign} trend={d.growth} color="success" />
        <KpiCard label="Recebido" value={`R$ ${d.received.toLocaleString("pt-BR")}`} icon={CheckCircle2} color="primary" />
      </div>
      <div className="bg-muted/30 rounded-xl p-4 space-y-2.5">
        {[
          { label: "Planos de Crédito", value: d.creditPlans, color: "bg-blue-500" },
          { label: "Pós-pagos", value: d.postPaid, color: "bg-emerald-500" },
          { label: "Outros", value: d.others, color: "bg-amber-500" },
        ].map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground">
                R$ {row.value.toLocaleString("pt-BR")}
              </span>
            </div>
            <MiniBar value={row.value} max={d.total} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetNomads({ data }: { data: ShareData }) {
  const d = data.nomads;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Total" value={String(d.total)} icon={Users} color="primary" />
      <KpiCard label="Ativos" value={String(d.active)} icon={Activity} trend={d.growth} color="success" />
      <KpiCard label="Novos este mês" value={String(d.newThisMonth)} icon={TrendingUp} color="info" />
      <KpiCard label="Avaliação Média" value={String(d.avgRating)} icon={Target} color="purple" />
    </div>
  );
}

export function WidgetPartnerProgram({ data }: { data: ShareData }) {
  const d = data.partnerProgram;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Partners Ativos" value={String(d.activePartners)} icon={ShieldCheck} color="primary" />
      <KpiCard label="Indicações" value={String(d.totalReferrals)} icon={Users} color="info" />
      <KpiCard label="Conv. Rate" value={`${d.conversionRate}%`} icon={TrendingUp} color="success" />
      <KpiCard label="Receita Partner" value={`R$ ${d.partnerRevenue.toLocaleString("pt-BR")}`} icon={DollarSign} color="purple" />
    </div>
  );
}

export function WidgetStatusOverview({ data }: { data: ShareData }) {
  const d = data.statusOverview;
  const rows = [
    { label: "Ativas", value: d.active, color: "bg-emerald-500" },
    { label: "Trial", value: d.trial, color: "bg-blue-500" },
    { label: "Suspensas", value: d.suspended, color: "bg-amber-500" },
    { label: "Canceladas", value: d.cancelled, color: "bg-red-500" },
  ];
  return (
    <div className="space-y-4">
      <KpiCard label="Total de Contas" value={String(d.total)} icon={Users} color="primary" />
      <div className="bg-muted/30 rounded-xl p-4 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold text-foreground">{row.value}</span>
            </div>
            <MiniBar value={row.value} max={d.total} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WidgetCreditPlans({ data }: { data: ShareData }) {
  const d = data.creditPlans;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Ativos" value={String(d.active)} icon={CreditCard} color="primary" />
      <KpiCard label="Valor Total" value={`R$ ${d.totalValue.toLocaleString("pt-BR")}`} icon={DollarSign} color="success" />
      <KpiCard label="Valor Médio" value={`R$ ${d.avgValue.toLocaleString("pt-BR")}`} icon={BarChart2} color="info" />
      <KpiCard label="Em Atraso" value={String(d.overdue)} icon={AlertTriangle} color="destructive" />
    </div>
  );
}

export function WidgetPlatformActivities({ data }: { data: ShareData }) {
  const d = data.platformActivities;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Logins" value={d.logins.toLocaleString("pt-BR")} icon={Users} color="primary" />
      <KpiCard label="Projetos Criados" value={String(d.projectsCreated)} icon={Briefcase} color="info" />
      <KpiCard label="Tarefas Concluídas" value={String(d.tasksCompleted)} icon={CheckCircle2} color="success" />
      <KpiCard label="Mensagens" value={d.messagesExchanged.toLocaleString("pt-BR")} icon={MessageSquare} color="purple" />
    </div>
  );
}

// ─── Widget dispatcher ────────────────────────────────────────────────────────

export function SharedWidgetRenderer({
  widgetId,
  data,
}: {
  widgetId: string;
  data: ShareData;
}) {
  switch (widgetId) {
    case "revenue":         return <WidgetRevenue data={data} />;
    case "mrr":             return <WidgetMrr data={data} />;
    case "churn":           return <WidgetChurn data={data} />;
    case "averageTicket":   return <WidgetAverageTicket data={data} />;
    case "ltv":             return <WidgetLtv data={data} />;
    case "activeProjectsWidget": return <WidgetActiveProjects data={data} />;
    case "tasks":           return <WidgetTasks data={data} />;
    case "accountsReceivable": return <WidgetAccountsReceivable data={data} />;
    case "nomads":
    case "nomadsIndicators": return <WidgetNomads data={data} />;
    case "partnerProgram":  return <WidgetPartnerProgram data={data} />;
    case "statusOverview":  return <WidgetStatusOverview data={data} />;
    case "creditPlans":     return <WidgetCreditPlans data={data} />;
    case "platformActivities": return <WidgetPlatformActivities data={data} />;
    default:
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Widget <strong>{widgetId}</strong> não tem visualização disponível.
          </p>
        </div>
      );
  }
}

// ─── Full dashboard view ──────────────────────────────────────────────────────
// Sections use accent colors derived from the Allka brand gradient.
const SECTION_ACCENTS = [
  "linear-gradient(180deg, #1a2a6f 0%, #3a4a9f 100%)",
  "#c81a7f",
  "linear-gradient(180deg, #1a2a6f 0%, #c81a7f 100%)",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
];

export function SharedFullDashboardView({ data }: { data: ShareData }) {
  return (
    <div className="space-y-10">
      <WidgetSection title="Financeiro" accent={SECTION_ACCENTS[0]}>
        <WidgetRevenue data={data} />
      </WidgetSection>

      <WidgetSection title="Recorrência & Churn" accent={SECTION_ACCENTS[1]}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">MRR</p>
            <WidgetMrr data={data} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">CHURN</p>
            <WidgetChurn data={data} />
          </div>
        </div>
      </WidgetSection>

      <WidgetSection title="Ticket & LTV" accent={SECTION_ACCENTS[2]}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Ticket Médio</p>
            <WidgetAverageTicket data={data} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">LTV</p>
            <WidgetLtv data={data} />
          </div>
        </div>
      </WidgetSection>

      <WidgetSection title="Projetos & Tarefas" accent={SECTION_ACCENTS[3]}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Projetos Ativos</p>
            <WidgetActiveProjects data={data} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Tarefas</p>
            <WidgetTasks data={data} />
          </div>
        </div>
      </WidgetSection>

      <WidgetSection title="Contas & Status" accent={SECTION_ACCENTS[4]}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">À Receber</p>
            <WidgetAccountsReceivable data={data} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Visão por Status</p>
            <WidgetStatusOverview data={data} />
          </div>
        </div>
      </WidgetSection>

      <WidgetSection title="Nômades & Parceiros" accent={SECTION_ACCENTS[5]}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Nômades</p>
            <WidgetNomads data={data} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Programa Partner</p>
            <WidgetPartnerProgram data={data} />
          </div>
        </div>
      </WidgetSection>

      <WidgetSection title="Plataforma" accent={SECTION_ACCENTS[6]}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Planos de Crédito</p>
            <WidgetCreditPlans data={data} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground/70">Atividades</p>
            <WidgetPlatformActivities data={data} />
          </div>
        </div>
      </WidgetSection>
    </div>
  );
}
