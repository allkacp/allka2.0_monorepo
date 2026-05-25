// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lock,
  Share2,
  Eye,
  MessageSquare,
  AlertTriangle,
  Clock,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Token shape (mirrors ShareConfig in dashboard/page.tsx) ─────────────────
type ShareConfig = {
  target: { id: string; title: string; type: "widget" | "dashboard" };
  permission: "view" | "comment";
  pin: string | null;
  expiry: string | null;
  issued: string;
};

type PageState = "loading" | "pin_required" | "expired" | "invalid" | "ready";

// ─── Minimal mock data generator (mirrors generateDashboardData) ──────────────
const generateShareData = () => ({
  revenue: {
    total: 270800,
    growth: 12.4,
    recurring: 198400,
    oneTime: 72400,
    projected: 310000,
  },
  mrr: {
    value: 198400,
    growth: 8.2,
    trendData: [155000, 162000, 169000, 175000, 183000, 198400],
  },
  churn: {
    rate: 3.2,
    inactiveAccounts: 14,
    cancelledProjects: 7,
    revenueChurn: 6380,
    revenueChurnRate: 3.2,
  },
  averageTicket: {
    general: 4680,
    growth: 5.1,
    perProject: 3240,
    trendData: [4100, 4250, 4380, 4510, 4620, 4680],
  },
  ltv: {
    value: 28600,
    agencies: 42000,
    leadPremium: 35000,
    nomades: 18000,
    hist0to1k: 12,
    hist1kto5k: 28,
    hist5kto15k: 45,
    hist15kplus: 15,
  },
  activeProjects: {
    total: 147,
    inProgress: 89,
    delivered: 43,
    pending: 15,
    growth: 6.8,
  },
  tasks: {
    total: 384,
    done: 218,
    inProgress: 96,
    pending: 70,
    completionRate: 56.8,
  },
  accountsReceivable: {
    total: 89400,
    creditPlans: 52000,
    postPaid: 28000,
    others: 9400,
    received: 43200,
    growth: 4.2,
  },
  nomads: {
    total: 312,
    active: 248,
    newThisMonth: 34,
    growth: 12.2,
    avgRating: 4.7,
  },
  partnerProgram: {
    activePartners: 48,
    totalReferrals: 186,
    conversionRate: 24.2,
    partnerRevenue: 38400,
  },
  statusOverview: {
    active: 84,
    trial: 12,
    suspended: 6,
    cancelled: 4,
    total: 106,
  },
  creditPlans: {
    active: 62,
    totalValue: 52000,
    avgValue: 839,
    overdue: 5,
  },
  platformActivities: {
    logins: 1248,
    projectsCreated: 47,
    tasksCompleted: 218,
    messagesExchanged: 3840,
  },
});

// ─── Widget title map ─────────────────────────────────────────────────────────
const WIDGET_TITLES: Record<string, string> = {
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
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
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    destructive: "text-red-600 bg-red-50 dark:bg-red-950/30",
    info: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  };
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          {Icon && (
            <div className={cn("p-2 rounded-lg shrink-0", colorMap[color])}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium",
            trend >= 0 ? "text-emerald-600" : "text-red-500"
          )}>
            {trend >= 0
              ? <ArrowUpRight className="h-3 w-3" />
              : <ArrowDownRight className="h-3 w-3" />
            }
            {Math.abs(trend)}% vs período anterior
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Single widget renderers (read-only) ─────────────────────────────────────

function WidgetRevenue({ data }: { data: ReturnType<typeof generateShareData> }) {
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

function WidgetMrr({ data }: { data: ReturnType<typeof generateShareData> }) {
  const d = data.mrr;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard label="MRR Atual" value={`R$ ${d.value.toLocaleString("pt-BR")}`} icon={TrendingUp} trend={d.growth} color="primary" />
        <KpiCard label="Crescimento Mensal" value={`+${d.growth}%`} icon={BarChart2} color="success" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Tendência 6 meses</p>
        <div className="flex items-end gap-1 h-14">
          {d.trendData.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="bg-primary/70 rounded-sm"
                style={{ height: `${Math.round((v / Math.max(...d.trendData)) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          {d.trendData.map((_, i) => <span key={i}>M{i + 1}</span>)}
        </div>
      </div>
    </div>
  );
}

function WidgetChurn({ data }: { data: ReturnType<typeof generateShareData> }) {
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

function WidgetAverageTicket({ data }: { data: ReturnType<typeof generateShareData> }) {
  const d = data.averageTicket;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard label="Ticket Médio Geral" value={`R$ ${d.general.toLocaleString("pt-BR")}`} icon={DollarSign} trend={d.growth} color="success" />
      <KpiCard label="Ticket por Projeto" value={`R$ ${d.perProject.toLocaleString("pt-BR")}`} icon={Briefcase} color="primary" />
      <KpiCard label="Crescimento" value={`+${d.growth}%`} icon={TrendingUp} color="info" />
    </div>
  );
}

function WidgetLtv({ data }: { data: ReturnType<typeof generateShareData> }) {
  const d = data.ltv;
  return (
    <div className="space-y-4">
      <KpiCard label="LTV Médio" value={`R$ ${d.value.toLocaleString("pt-BR")}`} icon={Target} color="primary" />
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Distribuição por Valor</p>
        {[
          { label: "R$ 0–1k", value: d.hist0to1k, color: "bg-blue-400" },
          { label: "R$ 1k–5k", value: d.hist1kto5k, color: "bg-blue-500" },
          { label: "R$ 5k–15k", value: d.hist5kto15k, color: "bg-primary" },
          { label: "R$ 15k+", value: d.hist15kplus, color: "bg-purple-500" },
        ].map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">{row.value} clientes</span>
            </div>
            <MiniBar value={row.value} max={d.hist5kto15k} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WidgetActiveProjects({ data }: { data: ReturnType<typeof generateShareData> }) {
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

function WidgetTasks({ data }: { data: ReturnType<typeof generateShareData> }) {
  const d = data.tasks;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total" value={String(d.total)} icon={Layers} color="primary" />
        <KpiCard label="Concluídas" value={String(d.done)} icon={CheckCircle2} color="success" />
        <KpiCard label="Em Andamento" value={String(d.inProgress)} icon={Activity} color="info" />
        <KpiCard label="Pendentes" value={String(d.pending)} icon={Clock} color="warning" />
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Conclusão</span>
          <span className="font-semibold">{d.completionRate}%</span>
        </div>
        <MiniBar value={d.completionRate} max={100} color="bg-emerald-500" />
      </div>
    </div>
  );
}

function WidgetAccountsReceivable({ data }: { data: ReturnType<typeof generateShareData> }) {
  const d = data.accountsReceivable;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Total a Receber" value={`R$ ${d.total.toLocaleString("pt-BR")}`} icon={DollarSign} trend={d.growth} color="success" />
        <KpiCard label="Recebido" value={`R$ ${d.received.toLocaleString("pt-BR")}`} icon={CheckCircle2} color="primary" />
      </div>
      <div className="space-y-2">
        {[
          { label: "Planos de Crédito", value: d.creditPlans, color: "bg-blue-500" },
          { label: "Pós-pagos", value: d.postPaid, color: "bg-emerald-500" },
          { label: "Outros", value: d.others, color: "bg-amber-500" },
        ].map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">R$ {row.value.toLocaleString("pt-BR")}</span>
            </div>
            <MiniBar value={row.value} max={d.total} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WidgetNomads({ data }: { data: ReturnType<typeof generateShareData> }) {
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

function WidgetPartnerProgram({ data }: { data: ReturnType<typeof generateShareData> }) {
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

function WidgetStatusOverview({ data }: { data: ReturnType<typeof generateShareData> }) {
  const d = data.statusOverview;
  const rows = [
    { label: "Ativas", value: d.active, color: "bg-emerald-500" },
    { label: "Trial", value: d.trial, color: "bg-blue-500" },
    { label: "Suspensas", value: d.suspended, color: "bg-amber-500" },
    { label: "Canceladas", value: d.cancelled, color: "bg-red-500" },
  ];
  return (
    <div className="space-y-3">
      <KpiCard label="Total de Contas" value={String(d.total)} icon={Users} color="primary" />
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
            <MiniBar value={row.value} max={d.total} color={row.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function WidgetCreditPlans({ data }: { data: ReturnType<typeof generateShareData> }) {
  const d = data.creditPlans;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KpiCard label="Ativos" value={String(d.active)} icon={CreditCard} color="primary" />
      <KpiCard label="Valor Total" value={`R$ ${d.totalValue.toLocaleString("pt-BR")}`} icon={DollarSign} color="success" />
      <KpiCard label="Valor Médio" value={`R$ ${d.avgValue.toLocaleString("pt-BR")}`} icon={BarChart2} color="info" />
      <KpiCard label="Em Atraso" value={String(d.overdue)} icon={AlertTriangle} color="warning" />
    </div>
  );
}

function WidgetPlatformActivities({ data }: { data: ReturnType<typeof generateShareData> }) {
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

// Full dashboard summary (when type === "dashboard")
function FullDashboardView({ data }: { data: ReturnType<typeof generateShareData> }) {
  return (
    <div className="space-y-8">
      <Section title="Financeiro">
        <WidgetRevenue data={data} />
      </Section>
      <Section title="Recorrência & Churn">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold mb-3">MRR</p>
            <WidgetMrr data={data} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">CHURN</p>
            <WidgetChurn data={data} />
          </div>
        </div>
      </Section>
      <Section title="Ticket & LTV">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold mb-3">Ticket Médio</p>
            <WidgetAverageTicket data={data} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">LTV</p>
            <WidgetLtv data={data} />
          </div>
        </div>
      </Section>
      <Section title="Projetos & Tarefas">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold mb-3">Projetos Ativos</p>
            <WidgetActiveProjects data={data} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Tarefas</p>
            <WidgetTasks data={data} />
          </div>
        </div>
      </Section>
      <Section title="Contas & Status">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold mb-3">À Receber</p>
            <WidgetAccountsReceivable data={data} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Visão Geral por Status</p>
            <WidgetStatusOverview data={data} />
          </div>
        </div>
      </Section>
      <Section title="Nômades & Parceiros">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold mb-3">Nômades</p>
            <WidgetNomads data={data} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Programa Partner</p>
            <WidgetPartnerProgram data={data} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 pb-1 border-b">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Single widget dispatcher ─────────────────────────────────────────────────
function SingleWidgetView({
  widgetId,
  data,
}: {
  widgetId: string;
  data: ReturnType<typeof generateShareData>;
}) {
  switch (widgetId) {
    case "revenue":
      return <WidgetRevenue data={data} />;
    case "mrr":
      return <WidgetMrr data={data} />;
    case "churn":
      return <WidgetChurn data={data} />;
    case "averageTicket":
      return <WidgetAverageTicket data={data} />;
    case "ltv":
      return <WidgetLtv data={data} />;
    case "activeProjectsWidget":
      return <WidgetActiveProjects data={data} />;
    case "tasks":
      return <WidgetTasks data={data} />;
    case "accountsReceivable":
      return <WidgetAccountsReceivable data={data} />;
    case "nomads":
    case "nomadsIndicators":
      return <WidgetNomads data={data} />;
    case "partnerProgram":
      return <WidgetPartnerProgram data={data} />;
    case "statusOverview":
      return <WidgetStatusOverview data={data} />;
    case "creditPlans":
      return <WidgetCreditPlans data={data} />;
    case "platformActivities":
      return <WidgetPlatformActivities data={data} />;
    default:
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Widget <strong>{widgetId}</strong> não tem visualização disponível neste link compartilhado.
          </AlertDescription>
        </Alert>
      );
  }
}

// ─── State screens ────────────────────────────────────────────────────────────

function FullscreenFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function InvalidScreen({ message }: { message: string }) {
  return (
    <FullscreenFrame>
      <Card className="text-center shadow-lg">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{message}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique se o link está correto ou solicite um novo ao remetente.
            </p>
          </div>
        </CardContent>
      </Card>
    </FullscreenFrame>
  );
}

function ExpiredScreen({ issuedAt }: { issuedAt?: string }) {
  return (
    <FullscreenFrame>
      <Card className="text-center shadow-lg">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Link Expirado</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Este link de compartilhamento expirou e não está mais disponível.
            </p>
            {issuedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Gerado em: {format(new Date(issuedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </FullscreenFrame>
  );
}

function PinScreen({
  value,
  onChange,
  onSubmit,
  error,
  targetTitle,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: boolean;
  targetTitle: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <FullscreenFrame>
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-lg">Acesso Protegido</CardTitle>
          <p className="text-sm text-muted-foreground">
            Este conteúdo requer um PIN para ser acessado.
          </p>
          <p className="text-xs font-medium mt-1">{targetTitle}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="share-pin-input" className="text-sm">
              PIN de 4 dígitos
            </Label>
            <Input
              id="share-pin-input"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={value}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                onChange(v);
                if (error) onChange(v); // reset error on change
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && value.length === 4) onSubmit();
              }}
              placeholder="••••"
              className={cn(
                "text-center tracking-[0.5em] text-xl font-bold",
                error && "border-destructive focus-visible:ring-destructive",
              )}
            />
            {error && (
              <p className="text-xs text-destructive text-center">PIN incorreto. Tente novamente.</p>
            )}
          </div>
          <Button
            className="w-full"
            onClick={onSubmit}
            disabled={value.length !== 4}
          >
            <Eye className="h-4 w-4 mr-2" />
            Acessar
          </Button>
        </CardContent>
      </Card>
    </FullscreenFrame>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardSharePage() {
  const { token } = useParams<{ token: string }>();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [config, setConfig] = useState<ShareConfig | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [comment, setComment] = useState("");
  const [commentSubmitted, setCommentSubmitted] = useState(false);

  const data = useMemo(() => generateShareData(), []);

  // Parse + validate token on mount
  useEffect(() => {
    if (!token) {
      setPageState("invalid");
      return;
    }
    try {
      const json = decodeURIComponent(escape(atob(token)));
      const parsed: ShareConfig = JSON.parse(json);

      if (!parsed.target?.id || !parsed.permission) {
        setPageState("invalid");
        return;
      }

      // Check expiry
      if (parsed.expiry && new Date(parsed.expiry) < new Date()) {
        setConfig(parsed);
        setPageState("expired");
        return;
      }

      setConfig(parsed);
      setPageState(parsed.pin ? "pin_required" : "ready");
    } catch {
      setPageState("invalid");
    }
  }, [token]);

  const handlePinSubmit = () => {
    if (!config) return;
    if (config.pin === pinInput) {
      setPinError(false);
      setPageState("ready");
    } else {
      setPinError(true);
    }
  };

  // ── Render gates ──

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pageState === "invalid") {
    return <InvalidScreen message="Link Inválido ou Corrompido" />;
  }

  if (pageState === "expired") {
    return <ExpiredScreen issuedAt={config?.issued} />;
  }

  if (pageState === "pin_required") {
    return (
      <PinScreen
        value={pinInput}
        onChange={(v) => {
          setPinInput(v);
          if (pinError) setPinError(false);
        }}
        onSubmit={handlePinSubmit}
        error={pinError}
        targetTitle={config?.target.title ?? ""}
      />
    );
  }

  // ── Ready state ──

  const issuedAt = config?.issued ? new Date(config.issued) : null;
  const expiresAt = config?.expiry ? new Date(config.expiry) : null;
  const widgetTitle = WIDGET_TITLES[config.target.id] ?? config.target.title;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
              <Share2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">
                {config.target.type === "dashboard"
                  ? config.target.title
                  : widgetTitle}
              </p>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                {config.target.type === "widget" ? "Widget compartilhado" : "Dashboard compartilhado"}
                {issuedAt && ` · ${format(issuedAt, "dd/MM/yyyy", { locale: ptBR })}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {config.permission === "comment" ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                Comentar
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs">
                <Eye className="h-3 w-3" />
                Visualização
              </Badge>
            )}
            {expiresAt && (
              <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
                <Clock className="h-3 w-3" />
                Expira {format(expiresAt, "dd/MM", { locale: ptBR })}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold">
            {config.target.type === "dashboard"
              ? config.target.title
              : widgetTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {config.target.type === "widget"
              ? "Dados do widget em modo somente leitura"
              : "Visão geral do dashboard em modo somente leitura"}
          </p>
        </div>

        {config.target.type === "widget" ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{widgetTitle}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Somente leitura
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <SingleWidgetView widgetId={config.target.id} data={data} />
            </CardContent>
          </Card>
        ) : (
          <FullDashboardView data={data} />
        )}

        {/* Comment box (only when permission === "comment") */}
        {config.permission === "comment" && (
          <Card className="mt-8 shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Deixar um Comentário
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {commentSubmitted ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm py-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Comentário enviado com sucesso!
                </div>
              ) : (
                <>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva seu comentário ou anotação sobre esses dados..."
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (comment.trim()) setCommentSubmitted(true);
                    }}
                    disabled={!comment.trim()}
                  >
                    Enviar Comentário
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>Powered by <strong className="text-foreground">Allka</strong></span>
          <span>Link público · {config.permission === "view" ? "Somente visualização" : "Visualização + Comentários"}</span>
        </div>
      </footer>
    </div>
  );
}
