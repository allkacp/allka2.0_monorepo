/**
 * dashboard-common.tsx — o que os dashboards de Admin, Agência, Empresa,
 * Líder e Parceiro têm em comum.
 *
 * As cinco telas nasceram de copiar-colar: tinham ~85% de código idêntico,
 * incluindo estes tipos, o AlertsCenter inteiro e os utilitários de data,
 * dados manuais e compartilhamento. Um ajuste em qualquer um deles precisava
 * ser repetido cinco vezes — e na prática não era.
 *
 * Fica de fora, porque é legitimamente de cada papel:
 *   - `MetricType` (os nomes das métricas de cada portal)
 *   - `ROLE_WIDGET_IDS` (quais widgets aquele papel enxerga)
 *   - `generateDashboardData` (os dados de cada portal)
 */

import React, { useState } from "react";
import { AlertTriangle, ArrowRight, Bell, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export type WidgetType =
  | "metrics"
  | "activity"
  | "alerts"
  | "performers"
  | "quickActions"
  | "userDistribution"
  | "activeUsers"
  | "systemAlerts"
  | "adminProfiles"
  | "revenue"
  | "activeProjectsWidget"
  | "creditPlans"
  | "mrr"
  | "permissionMatrix"
  | "managementTools"
  | "churn"
  | "averageTicket"
  | "ltv"
  | "cmv"
  | "nomads" // New simplified nomads widget
  | "nomadsIndicators"
  | "tasks"
  | "platformActivities"
  | "nomadsRanking" // Added nomadsRanking widget type
  | "agenciesRanking" // Added agenciesRanking widget type
  | "statusOverview" // Added new status overview widget type
  | "accountsReceivable" // Added new accounts receivable widget type
  | "partnerProgram"; // Partner Program metrics widget

export type WidgetSize = "standard" | "compact";

export interface Widget {
  id: WidgetType;
  order: number;
  visible: boolean;
  customTitle?: string;
  size?: string; // Added to store widget size (e.g., "half", "full")
}

// Define the structure for revenue metric with breakdown
export interface RevenueMetric {
  value: string;
  change: number;
  trend: "up" | "down";
  breakdown?: {
    creditPlan: { value: string; change: number };
    recurring: { value: string; change: number };
    oneTime: { value: string; change: number };
  };
}

export interface RatingBreakdown {
  nomades: { value: number; change: number; trend: "up" | "down" };
  agencies: { value: number; change: number; trend: "up" | "down" };
  leadPremium: { value: number; change: number; trend: "up" | "down" };
  support: { value: number; change: number; trend: "up" | "down" };
  projects: { value: number; change: number; trend: "up" | "down" };
}

export interface MetricCard {
  /** id da métrica; cada dashboard restringe ao seu próprio MetricType */
  id: string;
  order: number;
  visible: boolean;
}

// Define WidgetLibraryItem interface
export interface WidgetLibraryItem {
  id: WidgetType;
  name: string;
  description: string;
  icon: React.ElementType;
  color?: string; // Added to store a color for the widget card
}

// Define WidgetState to unify widget types for rendering
export interface WidgetState {
  id: string; // Unique identifier for each widget instance
  type: WidgetType;
  visible: boolean;
  order: number;
  customTitle?: string;
  colSpan?: 1 | 2 | 3; // How many of the 3 dashboard columns this widget occupies
}

export interface SystemAlert {
  id: string;
  type: "tarefas" | "mensagens" | "financeiro" | "projetos" | "sistema";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  count: number;
  link: string;
  icon: typeof AlertTriangle;
}

// Alerts loaded from API below

export const AlertsCenter = ({ alerts }: { alerts: SystemAlert[] }) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (alerts.length === 0 || dismissed.length === alerts.length) {
    return null;
  }

  const activeAlerts = alerts.filter((alert) => !dismissed.includes(alert.id));
  const highPriorityCount = activeAlerts.filter(
    (a) => a.severity === "high",
  ).length;

  const getSeverityColor = (severity: SystemAlert["severity"]) => {
    switch (severity) {
      case "high":
        return "text-red-700 bg-red-50 border-red-300";
      case "medium":
        return "text-amber-700 bg-amber-50 border-amber-300";
      case "low":
        return "text-blue-700 bg-blue-50 border-blue-300";
      default:
        return "text-blue-700 bg-blue-50 border-blue-300";
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value="alerts"
        className="border-2 border-red-300 bg-red-50 rounded-xl shadow-sm"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-red-100/50 rounded-t-xl transition-colors">
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 rounded-lg bg-red-100">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex items-center justify-between flex-1">
              <div className="text-left">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  Alertas do Sistema
                  <Badge className="ml-2 bg-red-600 text-white hover:bg-red-700">
                    {activeAlerts.length}
                  </Badge>
                  {highPriorityCount > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      ({highPriorityCount} críticos)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-red-600/80 mt-1">
                  Itens que requerem sua atenção imediata
                </p>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2 pt-2">
            {activeAlerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border-2 transition-all shadow-sm hover:shadow-md",
                    getSeverityColor(alert.severity),
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {alert.count}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80 mt-0.5 line-clamp-1">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={alert.link}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                      >
                        Ver
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDismissed([...dismissed, alert.id])}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export const formatDate = (date: Date, formatStr: string) => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  const formatMap: Record<string, string> = {
    "dd/MM/yyyy 'às' HH:mm": `${day}/${month}/${year} às ${hours}:${minutes}`,
    "yyyy-MM-dd-HHmm": `${year}-${month}-${day}-${hours}${minutes}`,
    PPP: `${day} de ${["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][date.getMonth()]} de ${year}`,
  };

  return formatMap[formatStr] || `${day}/${month}/${year}`;
};

// const PageHeader = ({ title, description }: { title: string; description: string }) => (
//   <div className="mb-6">
//     <h1 className="text-3xl font-bold text-blue-600">{title}</h1>
//     <p className="text-sm text-gray-500">{description}</p>
//   </div>
// )

// ─── Historical (manual) data system ────────────────────────────────────────
export type ManualDataEntry = {
  // Financeiro
  revenue_total?: number;
  mrr_total?: number;
  creditPlans_total?: number;
  accountsReceivable_total?: number;
  cmv_totalCosts?: number;
  // Projetos & Tarefas
  activeProjects_total?: number;
  tasks_total?: number;
  tasks_completed?: number;
  tasks_inProgress?: number;
  tasks_slaCompliance?: number;
  // Nômades & Parceiros
  nomads_total?: number;
  nomads_active?: number;
  partnerProgram_total?: number;
  partnerProgram_invitesSent?: number;
  partnerProgram_mrrGenerated?: number;
  // Churn, Ticket & LTV
  churn_revenueChurnRate?: number;
  churn_revenueChurn?: number;
  averageTicket_general?: number;
  ltv_value?: number;
};

export const MANUAL_WIDGET_MAP: Record<keyof ManualDataEntry, string> = {
  revenue_total: "revenue",
  mrr_total: "mrr",
  creditPlans_total: "creditPlans",
  accountsReceivable_total: "accountsReceivable",
  cmv_totalCosts: "cmv",
  activeProjects_total: "activeProjectsWidget",
  tasks_total: "tasks",
  tasks_completed: "tasks",
  tasks_inProgress: "tasks",
  tasks_slaCompliance: "tasks",
  nomads_total: "nomads",
  nomads_active: "nomads",
  partnerProgram_total: "partnerProgram",
  partnerProgram_invitesSent: "partnerProgram",
  partnerProgram_mrrGenerated: "partnerProgram",
  churn_revenueChurnRate: "churn",
  churn_revenueChurn: "churn",
  averageTicket_general: "averageTicket",
  ltv_value: "ltv",
};

export const mergeManualData = (base: any, entry: ManualDataEntry): any => {
  const m = { ...base };
  if (entry.revenue_total != null)
    m.revenue = { ...m.revenue, total: entry.revenue_total };
  if (entry.mrr_total != null) m.mrr = { ...m.mrr, total: entry.mrr_total };
  if (entry.creditPlans_total != null)
    m.creditPlans = { ...m.creditPlans, total: entry.creditPlans_total };
  if (entry.accountsReceivable_total != null)
    m.accountsReceivable = {
      ...m.accountsReceivable,
      total: entry.accountsReceivable_total,
    };
  if (entry.cmv_totalCosts != null)
    m.cmv = { ...m.cmv, totalCosts: entry.cmv_totalCosts };
  if (entry.activeProjects_total != null)
    m.activeProjects = {
      ...m.activeProjects,
      total: entry.activeProjects_total,
    };
  const tasksOverride: any = {};
  if (entry.tasks_total != null) tasksOverride.total = entry.tasks_total;
  if (entry.tasks_completed != null)
    tasksOverride.completed = entry.tasks_completed;
  if (entry.tasks_inProgress != null)
    tasksOverride.inProgress = entry.tasks_inProgress;
  if (entry.tasks_slaCompliance != null)
    tasksOverride.slaCompliance = entry.tasks_slaCompliance;
  if (Object.keys(tasksOverride).length)
    m.tasks = { ...m.tasks, ...tasksOverride };
  if (entry.nomads_total != null)
    m.nomads = { ...m.nomads, total: entry.nomads_total };
  if (entry.nomads_active != null)
    m.nomads = { ...m.nomads, active: entry.nomads_active };
  const ppOverride: any = {};
  if (entry.partnerProgram_total != null)
    ppOverride.total = entry.partnerProgram_total;
  if (entry.partnerProgram_invitesSent != null)
    ppOverride.invitesSent = entry.partnerProgram_invitesSent;
  if (entry.partnerProgram_mrrGenerated != null)
    ppOverride.mrrGenerated = entry.partnerProgram_mrrGenerated;
  if (Object.keys(ppOverride).length)
    m.partnerProgram = { ...m.partnerProgram, ...ppOverride };
  if (entry.churn_revenueChurnRate != null)
    m.churn = { ...m.churn, revenueChurnRate: entry.churn_revenueChurnRate };
  if (entry.churn_revenueChurn != null)
    m.churn = { ...m.churn, revenueChurn: entry.churn_revenueChurn };
  if (entry.averageTicket_general != null)
    m.averageTicket = {
      ...m.averageTicket,
      general: entry.averageTicket_general,
    };
  if (entry.ltv_value != null) m.ltv = { ...m.ltv, value: entry.ltv_value };
  return m;
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Share system ──────────────────────────────────────────────────────────────
export type ShareConfig = {
  target: { id: string; title: string; type: "widget" | "dashboard" };
  permission: "view" | "comment";
  pin?: string;
  expiry?: Date;
  // URL amigável opcional (ver ShareSlugField) — o backend normaliza e
  // valida de novo, isto aqui é só o que o usuário digitou/aceitou da
  // sugestão. Nunca decide autorização, só localização do link.
  slug?: string;
};

// Antes isso montava um payload Base64 decodificável por qualquer um no
// cliente (sem registro no banco — impossível de revogar, e o "escopo" era
// o que o próprio cliente dissesse que era). Agora o link é criado no
// backend: o token é opaco e o escopo (empresa/agência/nômade dona dos
// dados) é resolvido lá a partir de quem está logado, nunca aceito daqui.
// Ver apps/backend/src/routes/dashboard-shares.ts.
export const generatePublicToken = async (
  config: ShareConfig,
  extras?: {
    profile?: string;
    period?: { type: string; from?: string; to?: string; label: string };
    allowFilterChanges?: boolean;
  },
): Promise<{ token: string; slug: string | null; link: import("@/lib/api-client").DashboardShareLink }> => {
  const { apiClient } = await import("@/lib/api-client");
  const { token, link } = await apiClient.createDashboardShare({
    targetId: config.target.id,
    targetType: config.target.type,
    targetTitle: config.target.title,
    permission: config.permission,
    pin: config.pin,
    expiresAt: config.expiry ? config.expiry.toISOString() : undefined,
    slug: config.slug,
    profile: extras?.profile ?? "admin",
    periodType: extras?.period?.type,
    periodFrom: extras?.period?.from,
    periodTo: extras?.period?.to,
    periodLabel: extras?.period?.label,
    allowFilterChanges: extras?.allowFilterChanges,
  });
  // `link` já vem serializado do backend (POST /api/dashboard-shares) — o
  // chamador usa isto pra inserir o novo registro direto no estado da
  // lista de "Links criados" (ver ShareLinksPanel.pendingLink), em vez de
  // depender só de um refetch que pode não disparar se o painel de lista
  // não estiver montado no momento (era a causa da regressão "link
  // criado não aparece na lista sem F5").
  return { token, slug: link?.slug ?? null, link };
};

/** Monta a URL pública final, preferindo o slug amigável quando existir. */
export function buildShareUrl(identifier: { token: string; slug?: string | null }): string {
  return `${window.location.origin}/dashboard/share/${identifier.slug || identifier.token}`;
}
// ───────────────────────────────────────────────────────────────────────────────

