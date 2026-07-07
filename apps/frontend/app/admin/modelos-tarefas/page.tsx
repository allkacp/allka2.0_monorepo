// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { useNavigate, useParams } from "react-router-dom";
import {
  ClipboardList,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  Filter,
  CheckCircle2,
  Circle,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  FileText,
  Target,
  ListChecks,
  HelpCircle,
  ShieldCheck,
  Info,
  Plus,
  Copy,
  Pencil,
  Boxes,
  Link2,
  PauseCircle,
  PlayCircle,
  Cog,
  Calendar,
  Hash,
  AlertCircle,
  Clock,
  BookOpen,
  Wrench,
  ExternalLink,
  Star,
  Trash2,
  UserCog,
  MoreHorizontal,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CopyLinkButton } from "@/components/copy-link-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import {
  PageLoader,
  ButtonLoader,
  InlineLoader,
} from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";
import { SlidePanel } from "@/components/slide-panel";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { NeonBadge } from "@/components/neon-badge";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";

// --- Types --------------------------------------------------------------------

type ModelStatus = "ativa" | "inativa" | "em_revisao";
type TaskType =
  | "execution"
  | "review"
  | "approval"
  | "qualification"
  | "support";

interface ProductLink {
  id: string;
  product_id: string;
  sort_order: number;
  is_mandatory: boolean;
  phase?: string;
  notes?: string;
  product: { id: string; name: string; category?: string };
}

interface CatalogTask {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  task_type: TaskType;
  description?: string;
  objective?: string;
  default_deadline_days?: number;
  default_priority: string;
  complexity: string;
  estimated_hours?: number;
  responsible_type?: string;
  requires_access: boolean;
  requires_briefing: boolean;
  requires_files: boolean;
  steps?: string;
  checklist?: string;
  briefing_questions?: string;
  required_files?: string;
  execution_rules?: string;
  conclusion_rules?: string;
  internal_guidance?: string;
  status: ModelStatus;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  product_links: ProductLink[];
  _count: { product_links: number };
}

// --- Constants ----------------------------------------------------------------

const STATUS_CONFIG: Record<
  ModelStatus,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  ativa: {
    label: "Ativo",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  inativa: {
    label: "Inativo",
    color: "text-slate-500",
    bg: "bg-slate-100",
    border: "border-slate-200",
    icon: Circle,
  },
  em_revisao: {
    label: "Em Revisão",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Eye,
  },
};

const TYPE_CONFIG: Record<
  TaskType,
  { label: string; color: string; bg: string }
> = {
  execution: { label: "Execução", color: "text-blue-700", bg: "bg-blue-50" },
  review: { label: "Revisão", color: "text-amber-700", bg: "bg-amber-50" },
  approval: {
    label: "Aprovação",
    color: "text-purple-700",
    bg: "bg-purple-50",
  },
  qualification: {
    label: "Qualificação",
    color: "text-teal-700",
    bg: "bg-teal-50",
  },
  support: { label: "Suporte", color: "text-slate-600", bg: "bg-slate-100" },
};

const COMPLEXITY_LABEL: Record<string, string> = {
  basic: "Básica",
  intermediate: "Intermediária",
  advanced: "Avançada",
  premium: "Premium",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const ALL_STATUSES: ModelStatus[] = ["ativa", "inativa", "em_revisao"];

// NeonBadge color mapping — used only for genuinely read-only status/type
// labels (e.g. the drawer header pills). The Select-based status control
// keeps its own sc.bg/sc.color/sc.border classes since that's a change
// control, not a badge.
const STATUS_BADGE_COLOR: Record<ModelStatus, import("@/lib/badge-styles").BadgeColor> = {
  ativa: "emerald",
  inativa: "slate",
  em_revisao: "amber",
};
const TYPE_BADGE_COLOR: Record<TaskType, import("@/lib/badge-styles").BadgeColor> = {
  execution: "blue",
  review: "amber",
  approval: "purple",
  qualification: "teal",
  support: "slate",
};

// Gradient stat-card treatment matching admin/empresas' statColorMap (see
// docs/padrao-tabela-empresas.md) — copied verbatim from admin/clientes'
// StatCard, with an added optional onClick so the cards can still drive the
// existing filter shortcuts without changing any of the visual classes.
const STAT_COLOR_MAP: Record<string, { gradient: string; darkGradient: string; borderClass: string }> = {
  blue: {
    gradient: "from-blue-500 to-blue-700",
    darkGradient: "dark:from-blue-800 dark:to-blue-950",
    borderClass: "border-2 border-blue-300/70 dark:border-blue-800/70",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    darkGradient: "dark:from-emerald-800 dark:to-teal-900",
    borderClass: "border-2 border-emerald-300/70 dark:border-emerald-800/70",
  },
  violet: {
    gradient: "from-violet-500 to-purple-700",
    darkGradient: "dark:from-violet-800 dark:to-purple-950",
    borderClass: "border-2 border-violet-300/70 dark:border-violet-800/70",
  },
  orange: {
    gradient: "from-orange-500 to-rose-600",
    darkGradient: "dark:from-orange-800 dark:to-rose-900",
    borderClass: "border-2 border-orange-300/70 dark:border-orange-800/70",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: number;
  icon: any;
  color: keyof typeof STAT_COLOR_MAP;
  onClick?: () => void;
}) {
  const colors = STAT_COLOR_MAP[color];
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-200 bg-gradient-to-br",
        colors.gradient,
        colors.darkGradient,
        colors.borderClass,
        "shadow-lg hover:shadow-xl",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">{label}</span>
          <div className="bg-white/20 rounded-md p-1">
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

// --- Helpers ------------------------------------------------------------------

function parseJson(data: any): any[] {
  if (!data) return [];
  try {
    const p = typeof data === "string" ? JSON.parse(data) : data;
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function parseStrings(data: any): string[] {
  return parseJson(data).map((i: any) =>
    typeof i === "string"
      ? i
      : i?.label || i?.text || i?.title || i?.question || JSON.stringify(i),
  );
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Stable "mod_tar00001, mod_tar00002, …" display code. The number comes from
// the model's position in creation order (see `codeOrdinals` in the page
// component) — the backend `code` field isn't reliably sequential, so it
// can't be parsed for this.
function formatModelCode(ordinal?: number | null): string {
  if (!ordinal) return "—";
  return `mod_tar${String(ordinal).padStart(5, "0")}`;
}

// --- Sort header --------------------------------------------------------------

function Th({
  label,
  field,
  sortKey,
  sortDir,
  onSort,
  className,
  info,
}: {
  label: string;
  field: string;
  sortKey: string | null;
  sortDir: "asc" | "desc";
  onSort: (f: string) => void;
  className?: string;
  info?: string;
}) {
  const active = sortKey === field;
  return (
    <th
      className={cn(
        "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap select-none",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <button
          onClick={() => onSort(field)}
          className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          {label}
          {active ? (
            sortDir === "asc" ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-30" />
          )}
        </button>
        {info && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-slate-300 dark:text-slate-600 cursor-help text-[10px]">ⓘ</span>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[200px]">{info}</TooltipContent>
          </Tooltip>
        )}
      </span>
    </th>
  );
}

// --- Model Detail Drawer ------------------------------------------------------

function DrawerSection({
  icon,
  title,
  children,
  badge,
}: {
  icon?: any;
  title: string;
  children: any;
  badge?: number | string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-indigo-500">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h3>
        {badge != null && (
          <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ModelDetailDrawer({
  model: initialModel,
  codeOrdinal,
  open,
  onClose,
  onStatusChange,
  onDuplicate,
  updatingId,
}: {
  model: CatalogTask | null;
  codeOrdinal?: number;
  open: boolean;
  onClose: () => void;
  onStatusChange: (model: CatalogTask, status: ModelStatus) => void;
  onDuplicate: (model: CatalogTask) => void;
  updatingId: string | null;
}) {
  const { sidebarWidth, headerHeight, footerHeight } = useAppFrameMetrics();
  const [activeTab, setActiveTab] = useState("overview");
  const [detail, setDetail] = useState<CatalogTask | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !initialModel) return;
    setActiveTab("overview");
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    apiClient
      .getCatalogTask(initialModel.id)
      .then((res) => {
        setDetail((res as any)?.data ?? res ?? initialModel);
      })
      .catch((e) => {
        setDetailError(e?.message || "Erro ao carregar detalhes.");
        setDetail(initialModel);
      })
      .finally(() => setLoadingDetail(false));
  }, [open, initialModel?.id]);

  const model = detail ?? initialModel;
  if (!model) return null;

  const sc = STATUS_CONFIG[model.status] ?? STATUS_CONFIG.ativa;
  const tc = TYPE_CONFIG[model.task_type] ?? TYPE_CONFIG.execution;
  const updating = updatingId === model.id;

  const steps = parseStrings(model.steps);
  const checklist = parseStrings(model.checklist);
  const briefing = parseStrings(model.briefing_questions);
  const rules = parseStrings(model.execution_rules);
  const reqFiles = parseStrings(model.required_files);
  const conclusionRules = parseStrings(model.conclusion_rules);

  const productLinks = model.product_links ?? [];
  const productCount = model._count?.product_links ?? productLinks.length ?? 0;
  const briefingCount =
    briefing.length + rules.length + reqFiles.length + conclusionRules.length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        hideOverlay
        className="p-0 flex flex-col gap-0 z-[70] [&>button:last-child]:top-3 [&>button:last-child]:right-3 [&>button:last-child]:p-1.5 [&>button:last-child]:hover:bg-white/20 [&>button:last-child_svg]:size-4"
        style={{
          left: `${sidebarWidth - 2}px`,
          top: `${headerHeight - 1}px`,
          bottom: `${footerHeight - 1}px`,
          height: "auto",
          width: `calc(100vw - ${sidebarWidth - 2}px)`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{
            background:
              "var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628))",
          }}
        >
          <div className="min-w-0 flex-1 text-sm font-bold text-white truncate">
            {model.name}
            <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">
              {model.category}
              {model.subcategory ? ` · ${model.subcategory}` : ""}
            </p>
          </div>
        </div>

        {/* Identity bar */}
        <div className="shrink-0 px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center shrink-0">
                <ClipboardList className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md tracking-wider">
                  {formatModelCode(codeOrdinal)}
                </span>
                <NeonBadge color={STATUS_BADGE_COLOR[model.status] ?? "emerald"}>
                  {sc.label}
                </NeonBadge>
                <NeonBadge color={TYPE_BADGE_COLOR[model.task_type] ?? "blue"}>
                  {tc.label}
                </NeonBadge>
              </div>
            </div>
            <CopyLinkButton />
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-background shrink-0">
          {[
            {
              value: "overview",
              label: "Visão Geral",
              icon: <Info className="h-3.5 w-3.5" />,
            },
            {
              value: "steps",
              label: "Etapas & Checklist",
              icon: <Layers className="h-3.5 w-3.5" />,
              badge: steps.length + checklist.length || undefined,
            },
            {
              value: "briefing",
              label: "Briefing",
              icon: <BookOpen className="h-3.5 w-3.5" />,
              badge: briefingCount || undefined,
            },
            {
              value: "products",
              label: "Produtos",
              icon: <Package className="h-3.5 w-3.5" />,
              badge: productCount || undefined,
            },
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors",
                activeTab === t.value
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-200 dark:hover:border-slate-700",
              )}
            >
              {t.icon}
              {t.label}
              {t.badge != null && (
                <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* -- BODY ----------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading skeleton */}
          {loadingDetail && (
            <div className="max-w-3xl mx-auto p-6 space-y-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-3">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>
          )}

          {/* Error banner */}
          {detailError && (
            <div className="mx-6 mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Detalhes parciais: {detailError}</span>
            </div>
          )}

          {!loadingDetail && (
            <>
              {/* -- TAB: VISÃO GERAL --------------------------------------- */}
              {activeTab === "overview" && (
                <div className="max-w-3xl mx-auto p-6 space-y-6">
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      <span className="font-semibold">
                        Modelo reutilizável.
                      </span>{" "}
                      Alterações neste modelo podem impactar produtos vinculados
                      e futuras tarefas geradas a partir dele.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Complexidade",
                        value:
                          COMPLEXITY_LABEL[model.complexity] ??
                          model.complexity ??
                          "›",
                        icon: <Star className="h-3.5 w-3.5" />,
                      },
                      {
                        label: "Prioridade",
                        value:
                          PRIORITY_LABEL[model.default_priority] ??
                          model.default_priority ??
                          "›",
                        icon: <Target className="h-3.5 w-3.5" />,
                      },
                      {
                        label: "Prazo padrão",
                        value: model.default_deadline_days
                          ? `${model.default_deadline_days} dias`
                          : "›",
                        icon: <Clock className="h-3.5 w-3.5" />,
                      },
                      {
                        label: "Horas estimadas",
                        value: model.estimated_hours
                          ? `${model.estimated_hours}h`
                          : "›",
                        icon: <Clock className="h-3.5 w-3.5" />,
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5 space-y-1"
                      >
                        <div className="flex items-center gap-1 text-slate-400">
                          {m.icon}
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {m.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <DrawerSection
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    title="Status do modelo"
                  >
                    <div className="flex items-center gap-3">
                      <Select
                        value={model.status}
                        onValueChange={(v) =>
                          onStatusChange(model, v as ModelStatus)
                        }
                        disabled={updating}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-9 text-xs font-semibold border w-44",
                            sc.bg,
                            sc.color,
                            sc.border,
                          )}
                        >
                          {updating ? (
                            <ButtonLoader text="Salvando…" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => {
                            const cfg = STATUS_CONFIG[s];
                            const Icon = cfg.icon;
                            return (
                              <SelectItem key={s} value={s} className="text-xs">
                                <span className="flex items-center gap-1.5">
                                  <Icon className="h-3.5 w-3.5" /> {cfg.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {(model.requires_briefing ||
                        model.requires_access ||
                        model.requires_files) && (
                        <div className="flex flex-wrap gap-1.5">
                          {model.requires_briefing && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                              <HelpCircle className="h-3 w-3" /> Briefing
                            </span>
                          )}
                          {model.requires_access && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="h-3 w-3" /> Acesso
                            </span>
                          )}
                          {model.requires_files && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                              <FileText className="h-3 w-3" /> Arquivos
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </DrawerSection>

                  {model.description && (
                    <DrawerSection
                      icon={<FileText className="h-3.5 w-3.5" />}
                      title="Descrição"
                    >
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {model.description}
                      </p>
                    </DrawerSection>
                  )}

                  {model.objective && (
                    <DrawerSection
                      icon={<Target className="h-3.5 w-3.5" />}
                      title="Objetivo"
                    >
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {model.objective}
                      </p>
                    </DrawerSection>
                  )}

                  {model.internal_guidance && (
                    <DrawerSection
                      icon={<Info className="h-3.5 w-3.5" />}
                      title="Orientação interna"
                    >
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {model.internal_guidance}
                        </p>
                      </div>
                    </DrawerSection>
                  )}

                  {model.notes && (
                    <DrawerSection
                      icon={<FileText className="h-3.5 w-3.5" />}
                      title="Observações internas"
                    >
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {model.notes}
                        </p>
                      </div>
                    </DrawerSection>
                  )}

                  <div className="flex gap-6 text-xs text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Criado:{" "}
                      {fmtDate(model.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Atualizado:{" "}
                      {fmtDate(model.updated_at)}
                    </span>
                  </div>
                </div>
              )}

              {/* -- TAB: ETAPAS & CHECKLIST -------------------------------- */}
              {activeTab === "steps" && (
                <div className="max-w-3xl mx-auto p-6 space-y-8">
                  {steps.length > 0 ? (
                    <DrawerSection
                      icon={<Layers className="h-3.5 w-3.5" />}
                      title="Etapas de execução"
                      badge={steps.length}
                    >
                      <ol className="space-y-3">
                        {steps.map((step, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3"
                          >
                            <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {step}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </DrawerSection>
                  ) : (
                    <div className="flex flex-col items-center py-12 text-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Layers className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">
                        Nenhuma etapa definida para este modelo.
                      </p>
                    </div>
                  )}
                  {checklist.length > 0 && (
                    <DrawerSection
                      icon={<ListChecks className="h-3.5 w-3.5" />}
                      title="Checklist padrão"
                      badge={checklist.length}
                    >
                      <ul className="space-y-2">
                        {checklist.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 bg-slate-50 rounded-lg border border-slate-100 px-4 py-2.5"
                          >
                            <div className="mt-0.5 h-4 w-4 rounded border-2 border-slate-300 shrink-0 flex items-center justify-center">
                              <span className="h-1.5 w-1.5 rounded-sm bg-slate-300" />
                            </div>
                            <span className="text-sm text-slate-700">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </DrawerSection>
                  )}
                  {steps.length === 0 && checklist.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-slate-400">
                        Sem etapas nem checklist definidos.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* -- TAB: BRIEFING ------------------------------------------ */}
              {activeTab === "briefing" && (
                <div className="max-w-3xl mx-auto p-6 space-y-8">
                  {briefing.length > 0 ? (
                    <DrawerSection
                      icon={<HelpCircle className="h-3.5 w-3.5" />}
                      title="Perguntas de briefing"
                      badge={briefing.length}
                    >
                      <ol className="space-y-3">
                        {briefing.map((q, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 bg-blue-50 rounded-xl border border-blue-100 px-4 py-3"
                          >
                            <span className="text-xs font-bold text-blue-500 shrink-0 mt-0.5 w-6 text-center">
                              Q{i + 1}
                            </span>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {q}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </DrawerSection>
                  ) : (
                    <div className="flex flex-col items-center py-10 text-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">
                        Nenhuma pergunta de briefing definida.
                      </p>
                    </div>
                  )}
                  {rules.length > 0 && (
                    <DrawerSection
                      icon={<Wrench className="h-3.5 w-3.5" />}
                      title="Regras de execução"
                      badge={rules.length}
                    >
                      <ul className="space-y-2">
                        {rules.map((r, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 bg-slate-50 rounded-lg border border-slate-100 px-4 py-2.5"
                          >
                            <span className="text-slate-400 shrink-0 font-bold text-sm">
                              —
                            </span>
                            <span className="text-sm text-slate-700">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </DrawerSection>
                  )}
                  {conclusionRules.length > 0 && (
                    <DrawerSection
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      title="Regras de conclusão"
                      badge={conclusionRules.length}
                    >
                      <ul className="space-y-2">
                        {conclusionRules.map((r, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 bg-emerald-50 rounded-lg border border-emerald-100 px-4 py-2.5"
                          >
                            <span className="text-emerald-500 shrink-0 font-bold text-sm">
                              —
                            </span>
                            <span className="text-sm text-slate-700">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </DrawerSection>
                  )}
                  {reqFiles.length > 0 && (
                    <DrawerSection
                      icon={<FileText className="h-3.5 w-3.5" />}
                      title="Arquivos necessários"
                      badge={reqFiles.length}
                    >
                      <ul className="space-y-2">
                        {reqFiles.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-3 bg-slate-50 rounded-lg border border-slate-100 px-4 py-2.5"
                          >
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </DrawerSection>
                  )}
                </div>
              )}

              {/* -- TAB: PRODUTOS ------------------------------------------ */}
              {activeTab === "products" && (
                <div className="max-w-3xl mx-auto p-6 space-y-6">
                  {productLinks.length > 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Este modelo está vinculado a{" "}
                        <span className="font-bold">{productCount}</span>{" "}
                        produto{productCount !== 1 ? "s" : ""}. Alterações
                        impactarão futuras tarefas geradas por eles.
                      </p>
                    </div>
                  )}
                  <DrawerSection
                    icon={<Package className="h-3.5 w-3.5" />}
                    title="Produtos vinculados"
                    badge={productCount}
                  >
                    {productLinks.length > 0 ? (
                      <ul className="space-y-3">
                        {productLinks.map((link) => (
                          <li
                            key={link.id}
                            className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 hover:border-indigo-300 hover:shadow-md transition-all"
                          >
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  {link.product.id}
                                </span>
                                {link.is_mandatory && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
                                    Obrigatória
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {link.product.name}
                              </p>
                              {link.product.category && (
                                <p className="text-xs text-slate-400 truncate">
                                  {link.product.category}
                                </p>
                              )}
                            </div>
                            {link.phase && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full shrink-0 font-medium">
                                {link.phase}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Package className="h-7 w-7 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-600">
                            Nenhum produto vinculado
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Este modelo ainda não está associado a nenhum
                            produto.
                          </p>
                        </div>
                      </div>
                    )}
                  </DrawerSection>
                </div>
              )}
            </>
          )}
        </div>

        {/* -- FOOTER --------------------------------------------------------- */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 gap-1.5 text-slate-500"
            >
              <X className="h-3.5 w-3.5" /> Fechar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDuplicate(model)}
                disabled={updating}
                className="h-9 gap-1.5 text-slate-600"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </Button>
              {model.status !== "em_revisao" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onStatusChange(
                      model,
                      model.status === "ativa" ? "inativa" : "ativa",
                    )
                  }
                  disabled={updating}
                  className={cn(
                    "h-9 gap-1.5",
                    model.status === "ativa"
                      ? "text-red-600 border-red-200 hover:bg-red-50"
                      : "text-emerald-600 border-emerald-200 hover:bg-emerald-50",
                  )}
                >
                  {model.status === "ativa" ? (
                    <>
                      <PauseCircle className="h-3.5 w-3.5" /> Inativar
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-3.5 w-3.5" /> Ativar
                    </>
                  )}
                </Button>
              )}
              {model.status !== "em_revisao" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(model, "em_revisao")}
                  disabled={updating}
                  className="h-9 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  <Eye className="h-3.5 w-3.5" /> Revisar
                </Button>
              )}
              <Button
                size="sm"
                className="h-9 gap-1.5 btn-brand border-0 shadow-md"
                onClick={() => {
                  /* TODO: open edit panel */
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar modelo
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AdminModelosTarefasPage() {
  const { sidebarWidth, headerHeight, footerHeight } = useAppFrameMetrics();
  const [models, setModels] = useState<CatalogTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -- Persisted preferences (localStorage) ----------------------------------
  const PREFS_KEY = "allka_modelos_tarefas_table_settings";
  const ALL_COLUMNS: { key: string; label: string; required?: boolean }[] = [
    { key: "code", label: "Código", required: true },
    { key: "name", label: "Nome do modelo", required: true },
    { key: "category", label: "Categoria" },
    { key: "type", label: "Tipo" },
    { key: "status", label: "Status" },
    { key: "links", label: "Produtos vinculados" },
    { key: "updated_at", label: "Atualizado" },
  ];
  const DEFAULT_VISIBLE = new Set(ALL_COLUMNS.map((c) => c.key));

  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [pageSize, setPageSize] = useItemsPerPage("admin-modelos-tarefas", 25);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(DEFAULT_VISIBLE);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLinkedMode, setFilterLinkedMode] = useState<
    "all" | "linked" | "unlinked"
  >("all");

  // Advanced filters
  type AdvancedFilters = {
    createdFrom: string;
    createdTo: string;
    updatedFrom: string;
    updatedTo: string;
    minLinks: string;
    subcategory: string;
    complexity: string;
  };
  const EMPTY_ADV: AdvancedFilters = {
    createdFrom: "",
    createdTo: "",
    updatedFrom: "",
    updatedTo: "",
    minLinks: "",
    subcategory: "all",
    complexity: "all",
  };
  const [advanced, setAdvanced] = useState<AdvancedFilters>(EMPTY_ADV);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<string | null>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageJumpValue, setPageJumpValue] = useState("");

  // Load prefs once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.pageSize === "number") setPageSize(p.pageSize);
        if (Array.isArray(p.visibleCols))
          setVisibleCols(
            new Set([
              ...ALL_COLUMNS.filter((c) => c.required).map((c) => c.key),
              ...p.visibleCols,
            ]),
          );
        if (typeof p.sortKey === "string" || p.sortKey === null)
          setSortKey(p.sortKey);
        if (p.sortDir === "asc" || p.sortDir === "desc") setSortDir(p.sortDir);
      }
    } catch (_) {}
    setPrefsLoaded(true);
  }, []);

  // Persist prefs
  useEffect(() => {
    if (!prefsLoaded) return;
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          pageSize,
          visibleCols: Array.from(visibleCols),
          sortKey,
          sortDir,
        }),
      );
    } catch (_) {}
  }, [prefsLoaded, pageSize, visibleCols, sortKey, sortDir]);

  const toggleCol = (key: string) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const isCol = (key: string) => visibleCols.has(key);

  // Drawer
  const [selectedModel, setSelectedModel] = useState<CatalogTask | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const { modeloId: urlModeloId } = useParams<{ modeloId?: string }>();

  // Deep-link: open model drawer from URL param
  useEffect(() => {
    if (!urlModeloId) return;
    apiClient
      .getCatalogTask(urlModeloId)
      .then((model: any) => {
        setSelectedModel(model);
        setDrawerOpen(true);
      })
      .catch(() => {
        setSelectedModel({ id: urlModeloId } as any);
        setDrawerOpen(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlModeloId]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // "+" info panel — lightweight read-only summary (name/code/category,
  // requirements, product links) using only real fields already present on
  // the row object, no fabricated data.
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [infoPanelModel, setInfoPanelModel] = useState<CatalogTask | null>(null);
  const openInfoPanel = useCallback((model: CatalogTask) => {
    setInfoPanelModel(model);
    setInfoPanelOpen(true);
  }, []);

  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([loading, visibleCols.size]);

  // Create sheet
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    task_type: "execution" as TaskType,
    description: "",
    objective: "",
    default_deadline_days: "",
    default_priority: "medium",
    complexity: "basic",
    estimated_hours: "",
    responsible_type: "",
    requires_access: false,
    requires_briefing: false,
    requires_files: false,
    internal_guidance: "",
    notes: "",
  });

  const EMPTY_LISTS = {
    steps: [] as string[],
    checklist: [] as string[],
    briefing_questions: [] as string[],
    required_files: [] as string[],
    execution_rules: [] as string[],
    conclusion_rules: [] as string[],
  };
  const [createLists, setCreateLists] = useState(EMPTY_LISTS);
  const [listInputs, setListInputs] = useState<Record<string, string>>({
    steps: "",
    checklist: "",
    briefing_questions: "",
    required_files: "",
    execution_rules: "",
    conclusion_rules: "",
  });

  const addToList = (key: keyof typeof EMPTY_LISTS, value: string) => {
    if (!value.trim()) return;
    setCreateLists((l) => ({ ...l, [key]: [...l[key], value.trim()] }));
    setListInputs((l) => ({ ...l, [key]: "" }));
  };

  const removeFromList = (key: keyof typeof EMPTY_LISTS, index: number) => {
    setCreateLists((l) => ({ ...l, [key]: l[key].filter((_, i) => i !== index) }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      category: "",
      subcategory: "",
      task_type: "execution",
      description: "",
      objective: "",
      default_deadline_days: "",
      default_priority: "medium",
      complexity: "basic",
      estimated_hours: "",
      responsible_type: "",
      requires_access: false,
      requires_briefing: false,
      requires_files: false,
      internal_guidance: "",
      notes: "",
    });
    setCreateLists(EMPTY_LISTS);
    setListInputs({ steps: "", checklist: "", briefing_questions: "", required_files: "", execution_rules: "", conclusion_rules: "" });
  };

  // Fetch
  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getCatalogTasks({ limit: 500 });
      setModels(res?.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Erro desconhecido ao carregar modelos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Derived unique filter options
  const uniqueCategories = useMemo(
    () =>
      Array.from(new Set(models.map((m) => m.category).filter(Boolean))).sort(),
    [models],
  );
  const uniqueSubcategories = useMemo(
    () =>
      Array.from(
        new Set(models.map((m) => m.subcategory).filter(Boolean) as string[]),
      ).sort(),
    [models],
  );
  const uniqueComplexities = useMemo(
    () =>
      Array.from(
        new Set(models.map((m) => m.complexity).filter(Boolean) as string[]),
      ).sort(),
    [models],
  );

  // Stable "mod_tarNNNNN" numbering — the backend `code` field isn't a clean
  // sequence (seed data uses product/task-index strings like "PA0001-T01"),
  // so we derive a stable ordinal from creation order instead of parsing it.
  const codeOrdinals = useMemo(() => {
    const byCreation = [...models].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const map = new Map<string, number>();
    byCreation.forEach((m, i) => map.set(m.id, i + 1));
    return map;
  }, [models]);

  // Stats
  const stats = useMemo(
    () => ({
      total: models.length,
      ativos: models.filter((m) => m.status === "ativa").length,
      inativos: models.filter((m) => m.status === "inativa").length,
      emRevisao: models.filter((m) => m.status === "em_revisao").length,
      vinculados: models.filter(
        (m) => (m._count?.product_links ?? m.product_links?.length ?? 0) > 0,
      ).length,
      totalLinks: models.reduce(
        (sum, m) => sum + (m._count?.product_links ?? m.product_links?.length ?? 0),
        0,
      ),
    }),
    [models],
  );

  // Filter
  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (filterStatus !== "all" && m.status !== filterStatus) return false;
      if (filterType !== "all" && m.task_type !== filterType) return false;
      if (filterCategory !== "all" && m.category !== filterCategory)
        return false;
      const linkCount = m._count?.product_links ?? m.product_links?.length ?? 0;
      if (filterLinkedMode === "linked" && linkCount === 0) return false;
      if (filterLinkedMode === "unlinked" && linkCount > 0) return false;

      // Advanced
      if (advanced.createdFrom) {
        const t = new Date(m.created_at as any).getTime();
        if (!Number.isFinite(t) || t < new Date(advanced.createdFrom).getTime())
          return false;
      }
      if (advanced.createdTo) {
        const t = new Date(m.created_at as any).getTime();
        const end = new Date(advanced.createdTo).getTime() + 86400000 - 1;
        if (!Number.isFinite(t) || t > end) return false;
      }
      if (advanced.updatedFrom) {
        const t = new Date(m.updated_at as any).getTime();
        if (!Number.isFinite(t) || t < new Date(advanced.updatedFrom).getTime())
          return false;
      }
      if (advanced.updatedTo) {
        const t = new Date(m.updated_at as any).getTime();
        const end = new Date(advanced.updatedTo).getTime() + 86400000 - 1;
        if (!Number.isFinite(t) || t > end) return false;
      }
      if (advanced.minLinks) {
        const min = Number(advanced.minLinks);
        if (Number.isFinite(min) && linkCount < min) return false;
      }
      if (
        advanced.subcategory !== "all" &&
        m.subcategory !== advanced.subcategory
      )
        return false;
      if (advanced.complexity !== "all" && m.complexity !== advanced.complexity)
        return false;

      if (search) {
        const q = search.toLowerCase();
        const inName = m.name.toLowerCase().includes(q);
        const inCode = m.code.toLowerCase().includes(q);
        const inCategory = m.category.toLowerCase().includes(q);
        const inType = (m.task_type || "").toLowerCase().includes(q);
        const inDesc = m.description?.toLowerCase().includes(q) ?? false;
        const inProduct =
          m.product_links?.some(
            (l) =>
              l.product?.name?.toLowerCase().includes(q) ||
              l.product?.id?.toLowerCase().includes(q),
          ) ?? false;
        if (
          !inName &&
          !inCode &&
          !inCategory &&
          !inType &&
          !inDesc &&
          !inProduct
        )
          return false;
      }
      return true;
    });
  }, [
    models,
    search,
    filterStatus,
    filterType,
    filterCategory,
    filterLinkedMode,
    advanced,
  ]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "code") {
        av = a.code;
        bv = b.code;
      } else if (sortKey === "name") {
        av = a.name;
        bv = b.name;
      } else if (sortKey === "category") {
        av = a.category;
        bv = b.category;
      } else if (sortKey === "type") {
        av = a.task_type;
        bv = b.task_type;
      } else if (sortKey === "status") {
        av = a.status;
        bv = b.status;
      } else if (sortKey === "links") {
        av = a._count?.product_links ?? 0;
        bv = b._count?.product_links ?? 0;
      } else {
        av = a.updated_at;
        bv = b.updated_at;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  const toggleSort = (field: string) => {
    if (sortKey === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterType("all");
    setFilterCategory("all");
    setFilterLinkedMode("all");
    setAdvanced(EMPTY_ADV);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search ||
    filterStatus !== "all" ||
    filterType !== "all" ||
    filterCategory !== "all" ||
    filterLinkedMode !== "all" ||
    advanced.createdFrom ||
    advanced.createdTo ||
    advanced.updatedFrom ||
    advanced.updatedTo ||
    advanced.minLinks ||
    advanced.subcategory !== "all" ||
    advanced.complexity !== "all",
  );

  const advancedActiveCount =
    (advanced.createdFrom ? 1 : 0) +
    (advanced.createdTo ? 1 : 0) +
    (advanced.updatedFrom ? 1 : 0) +
    (advanced.updatedTo ? 1 : 0) +
    (advanced.minLinks ? 1 : 0) +
    (advanced.subcategory !== "all" ? 1 : 0) +
    (advanced.complexity !== "all" ? 1 : 0);

  const filterActiveCount =
    (filterStatus !== "all" ? 1 : 0) +
    (filterType !== "all" ? 1 : 0) +
    (filterCategory !== "all" ? 1 : 0) +
    (filterLinkedMode !== "all" ? 1 : 0) +
    advancedActiveCount;

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= half + 1) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
      pages.push("...");
    } else if (page >= totalPages - half) {
      pages.push("...");
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++)
        pages.push(i);
    } else {
      pages.push("...");
      for (let i = page - half; i <= page + half; i++) pages.push(i);
      pages.push("...");
    }
    return pages;
  };

  const commitPageJump = () => {
    const n = parseInt(pageJumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
    setPageJumpValue("");
  };

  // Numbered pagination — identical markup/gradient recipe in the top and
  // bottom mirror bars (see docs/padrao-tabela-empresas.md).
  const PaginationControls = () => (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        title="Página anterior"
        className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {getPageNumbers().map((p, idx) =>
        p === "..." ? (
          <span key={`dot-${idx}`} className="text-xs text-slate-300 px-0.5">·</span>
        ) : (
          <button
            key={p}
            onClick={() => setPage(Number(p))}
            title={p === page ? "Página atual" : `Ir para a página ${p}`}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-[8px] text-xs font-bold transition-colors",
              p === page
                ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400",
            )}
            style={p === page ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        title="Próxima página"
        className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-700">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageJumpValue}
                onChange={(e) => setPageJumpValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitPageJump(); }}
                placeholder="Pág."
                aria-label="Ir para a página"
                className="h-7 w-14 text-xs text-center rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={commitPageJump}
                disabled={!pageJumpValue}
                className="group relative h-7 px-2.5 rounded-[8px] text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }}
                />
                <span className="relative z-10 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors">Ir</span>
              </button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">Ir diretamente para uma página</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  const CountText = ({ side = "bottom" as "top" | "bottom" }) => (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-default">
            {(() => {
              const start = sorted.length === 0 ? 0 : Math.min((page - 1) * pageSize + 1, sorted.length);
              const end = Math.min(page * pageSize, sorted.length);
              return (
                <>
                  {start}-{end} de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{sorted.length}</span>{" "}
                  modelo{sorted.length !== 1 ? "s" : ""}
                  {hasActiveFilters && <span className="text-blue-600 ml-1">· filtros ativos</span>}
                </>
              );
            })()}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          Intervalo de modelos exibido nesta página, do total filtrado ({models.length} no total)
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Create new model
  const handleCreateModel = async () => {
    if (!createForm.name.trim() || !createForm.category.trim()) return;
    setCreating(true);
    try {
      const created = await apiClient.createCatalogTask({
        name: createForm.name.trim(),
        category: createForm.category.trim(),
        subcategory: createForm.subcategory.trim() || undefined,
        task_type: createForm.task_type,
        description: createForm.description.trim() || undefined,
        objective: createForm.objective.trim() || undefined,
        default_deadline_days: createForm.default_deadline_days
          ? Number(createForm.default_deadline_days)
          : undefined,
        default_priority: createForm.default_priority,
        complexity: createForm.complexity,
        estimated_hours: createForm.estimated_hours
          ? Number(createForm.estimated_hours)
          : undefined,
        responsible_type: createForm.responsible_type.trim() || undefined,
        requires_access: createForm.requires_access,
        requires_briefing: createForm.requires_briefing,
        requires_files: createForm.requires_files,
        steps: createLists.steps.length
          ? JSON.stringify(createLists.steps)
          : undefined,
        checklist: createLists.checklist.length
          ? JSON.stringify(createLists.checklist)
          : undefined,
        briefing_questions: createLists.briefing_questions.length
          ? JSON.stringify(createLists.briefing_questions)
          : undefined,
        required_files: createLists.required_files.length
          ? JSON.stringify(createLists.required_files)
          : undefined,
        execution_rules: createLists.execution_rules.length
          ? JSON.stringify(createLists.execution_rules)
          : undefined,
        conclusion_rules: createLists.conclusion_rules.length
          ? JSON.stringify(createLists.conclusion_rules)
          : undefined,
        internal_guidance: createForm.internal_guidance.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        status: "em_revisao",
        is_active: false,
      });
      setCreateOpen(false);
      resetCreateForm();
      await fetchModels();
      // Open drawer for new model
      if (created?.id) {
        const full = await apiClient.getCatalogTask(created.id);
        setSelectedModel(full as CatalogTask);
        setDrawerOpen(true);
        navigate(`/admin/modelos-tarefas/${created.id}`, { replace: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  // Duplicate model
  const handleDuplicate = async (model: CatalogTask) => {
    setUpdatingId(model.id);
    try {
      await apiClient.createCatalogTask({
        name: `${model.name} (cópia)`,
        category: model.category,
        subcategory: model.subcategory,
        task_type: model.task_type,
        description: model.description,
        objective: model.objective,
        default_deadline_days: model.default_deadline_days,
        default_priority: model.default_priority as any,
        complexity: model.complexity as any,
        estimated_hours: model.estimated_hours,
        responsible_type: model.responsible_type,
        requires_access: model.requires_access,
        requires_briefing: model.requires_briefing,
        requires_files: model.requires_files,
        steps: model.steps,
        checklist: model.checklist,
        briefing_questions: model.briefing_questions,
        required_files: model.required_files,
        execution_rules: model.execution_rules,
        conclusion_rules: model.conclusion_rules,
        internal_guidance: model.internal_guidance,
        notes: model.notes,
        status: "em_revisao",
        is_active: false,
      });
      await fetchModels();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  // Status change
  const handleStatusChange = async (
    model: CatalogTask,
    newStatus: ModelStatus,
  ) => {
    if (model.status === newStatus) return;
    setUpdatingId(model.id);
    try {
      await apiClient.updateCatalogTaskStatus(
        model.id,
        newStatus,
        newStatus === "ativa",
      );
      setModels((prev) =>
        prev.map((m) =>
          m.id === model.id
            ? { ...m, status: newStatus, is_active: newStatus === "ativa" }
            : m,
        ),
      );
      if (selectedModel?.id === model.id) {
        setSelectedModel((prev) =>
          prev
            ? { ...prev, status: newStatus, is_active: newStatus === "ativa" }
            : prev,
        );
      }
    } catch (_) {
    } finally {
      setUpdatingId(null);
    }
  };

  // -- Render ------------------------------------------------------------------
  return (
    <TooltipProvider>
      <div className="flex-1 space-y-5 p-4 md:p-8">
        <PageHeader
          title="Modelos de Tarefas"
          description="Gerencie modelos reutilizáveis vinculados aos produtos da plataforma."
          actions={<>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={fetchModels}
                    disabled={loading}
                    className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all disabled:opacity-50"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <RefreshCw className={cn("relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors", loading && "animate-spin")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Atualizar</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setCreateOpen(true)}
                    className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                    <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                      Novo Modelo
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar novo modelo de tarefa</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>}
        />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                Não foi possível carregar os modelos de tarefas.
              </p>
              <p className="text-xs text-red-500 mt-0.5 truncate">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchModels}
              className="shrink-0 text-red-700"
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Stat cards — gradient cards matching admin/empresas & admin/clientes */}
        {!loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Total de modelos"
              value={stats.total}
              icon={ClipboardList}
              color="blue"
              onClick={() => clearFilters()}
            />
            <StatCard
              label="Modelos ativos"
              value={stats.ativos}
              icon={CheckCircle2}
              color="emerald"
              onClick={() => {
                clearFilters();
                setFilterStatus("ativa");
              }}
            />
            <StatCard
              label="Vinculados a produtos"
              value={stats.vinculados}
              icon={Boxes}
              color="violet"
              onClick={() => {
                clearFilters();
                setFilterLinkedMode("linked");
              }}
            />
            <StatCard
              label="Total de vínculos com produtos"
              value={stats.totalLinks}
              icon={Link2}
              color="orange"
            />
          </div>
        )}

        {/* Main Card — search + filters/config icons + pagination + table, all in one card matching admin/empresas */}
        {!loading && !error && (
          <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
            {/* Row 1 — search + icon toolbar buttons */}
            <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome, categoria ou produto..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 h-9 text-sm w-full"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="ml-auto flex items-center gap-2">
                <IconToolbarButton
                  icon={Filter}
                  tooltip={filterActiveCount > 0 ? `Filtros (${filterActiveCount} ativos)` : "Filtros"}
                  onClick={() => setFiltersPanelOpen(true)}
                />
                <IconToolbarButton
                  icon={Cog}
                  tooltip="Configurar colunas"
                  onClick={() => setColConfigOpen(true)}
                />
              </div>
            </div>

            {/* Row 2 — items-per-page + count + scrollbar mirror + numbered pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
              <div className="flex items-center gap-3">
                <ItemsPerPageSelect
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                  variant="top"
                />
                <CountText side="bottom" />
              </div>

              {hasHorizontalOverflow && (
                <div
                  ref={topScrollRef}
                  onScroll={handleTopBarScroll}
                  title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                  className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
                  style={{ height: 12 }}
                >
                  <div style={{ minWidth: 800, height: 1 }} />
                </div>
              )}

              {totalPages > 1 && <PaginationControls />}
            </div>

            {models.length === 0 ? (
              <div className="p-16 flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <ClipboardList className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-700 mb-1">
                    Nenhum modelo de tarefa encontrado.
                  </h2>
                  <p className="text-sm text-slate-400 max-w-sm mx-auto">
                    Modelos de tarefas são estruturas reutilizáveis vinculadas a
                    produtos. Crie um modelo para começar.
                  </p>
                </div>
              </div>
            ) : sorted.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-center gap-3">
                <Filter className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">
                  Nenhum modelo com os filtros aplicados.
                </p>
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 underline hover:no-underline"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <>
            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="overflow-x-auto allka-table-scroll-body"
            >
              <table className="w-full text-sm min-w-[800px]">
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    background: "var(--table-head)",
                    boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                  }}
                >
                  <tr>
                    <th
                      className="px-1 py-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center"
                      style={{
                        position: "sticky",
                        left: 0,
                        top: 0,
                        zIndex: 3,
                        minWidth: 84,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                        borderRight: "1px solid rgba(100,116,139,0.18)",
                      }}
                    >
                      Ações
                    </th>
                    {isCol("code") && (
                      <Th
                        label="Código"
                        field="code"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="pl-4 w-28"
                        info="Código sequencial do modelo de tarefa."
                      />
                    )}
                    {isCol("name") && (
                      <Th
                        label="Nome do modelo"
                        field="name"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="min-w-[200px]"
                        info="Nome do modelo de tarefa reutilizável."
                      />
                    )}
                    {isCol("category") && (
                      <Th
                        label="Categoria"
                        field="category"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="min-w-[130px]"
                        info="Categoria/agrupamento do modelo."
                      />
                    )}
                    {isCol("type") && (
                      <Th
                        label="Tipo"
                        field="type"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="w-36"
                        info="Tipo de tarefa gerada a partir deste modelo."
                      />
                    )}
                    {isCol("status") && (
                      <Th
                        label="Status"
                        field="status"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="w-32"
                        info="Situação atual do modelo: ativo, inativo ou em revisão."
                      />
                    )}
                    {isCol("links") && (
                      <Th
                        label="Produtos vinculados"
                        field="links"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="w-40"
                        info="Quantidade de produtos do catálogo que usam este modelo."
                      />
                    )}
                    {isCol("updated_at") && (
                      <Th
                        label="Atualizado"
                        field="updated_at"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="w-32"
                        info="Data da última atualização do modelo."
                      />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((model, i) => {
                    const sc =
                      STATUS_CONFIG[model.status] ?? STATUS_CONFIG.ativa;
                    const tc =
                      TYPE_CONFIG[model.task_type] ?? TYPE_CONFIG.execution;
                    const linkCount =
                      model._count?.product_links ??
                      model.product_links?.length ??
                      0;
                    const updatingThis = updatingId === model.id;
                    const isEven = i % 2 === 0;
                    return (
                      <tr
                        key={model.id}
                        className={cn(
                          "group transition-colors",
                          isEven
                            ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                            : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]",
                        )}
                      >
                        {/* Ações — pinned, matching the doc's exact recipe */}
                        <td
                          className={cn(
                            "px-1 py-2 transition-colors",
                            isEven
                              ? "bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                              : "bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]",
                          )}
                          style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 84, borderRight: "1px solid rgba(100,116,139,0.18)" }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInfoPanel(model);
                                    }}
                                    className="h-[21px] w-[21px] flex items-center justify-center rounded-full bg-[#2558FF] text-white shadow-[0_2px_6px_rgba(37,88,255,0.35)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:shadow-[0_2px_10px_rgba(110,44,150,0.5)] transition-all"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">Mais informações</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setSelectedModel(model);
                                      setDrawerOpen(true);
                                      navigate(`/admin/modelos-tarefas/${model.id}`, { replace: true });
                                    }}
                                    className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">Ver detalhes</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-slate-400 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150">
                                  <span className="sr-only">Mais ações</span>
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-56 rounded-xl p-1.5 shadow-lg border-slate-200/70 dark:border-slate-700/60">
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-lg py-2 px-2.5 text-sm cursor-pointer"
                                  onClick={() => handleDuplicate(model)}
                                  disabled={updatingThis}
                                >
                                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30 shrink-0">
                                    <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  </span>
                                  Duplicar modelo
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-lg py-2 px-2.5 text-sm cursor-pointer"
                                  onClick={() => handleStatusChange(model, "ativa")}
                                  disabled={model.status === "ativa"}
                                >
                                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  </span>
                                  Marcar como ativo
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-lg py-2 px-2.5 text-sm cursor-pointer"
                                  onClick={() => handleStatusChange(model, "inativa")}
                                  disabled={model.status === "inativa"}
                                >
                                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                                    <Circle className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                  </span>
                                  Marcar como inativo
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2.5 rounded-lg py-2 px-2.5 text-sm cursor-pointer"
                                  onClick={() => handleStatusChange(model, "em_revisao")}
                                  disabled={model.status === "em_revisao"}
                                >
                                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30 shrink-0">
                                    <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  </span>
                                  Enviar p/ revisão
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>

                        {/* Código */}
                        {isCol("code") && (
                          <td className="px-3 py-3 pl-4">
                            <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                              {formatModelCode(codeOrdinals.get(model.id))}
                            </span>
                          </td>
                        )}

                        {/* Nome */}
                        {isCol("name") && (
                          <td className="px-3 py-3">
                            <button
                              className="text-left w-full"
                              onClick={() => {
                                setSelectedModel(model);
                                setDrawerOpen(true);
                                navigate(`/admin/modelos-tarefas/${model.id}`, {
                                  replace: true,
                                });
                              }}
                            >
                              <p className="font-medium text-slate-800 dark:text-slate-100 leading-snug hover:text-blue-600 transition-colors line-clamp-1">
                                {model.name}
                              </p>
                              {model.description && (
                                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                  {model.description}
                                </p>
                              )}
                            </button>
                          </td>
                        )}

                        {/* Categoria */}
                        {isCol("category") && (
                          <td className="px-3 py-3">
                            <span className="text-sm text-slate-600 line-clamp-1">
                              {model.category}
                            </span>
                            {model.subcategory && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {model.subcategory}
                              </p>
                            )}
                          </td>
                        )}

                        {/* Tipo */}
                        {isCol("type") && (
                          <td className="px-3 py-3">
                            <NeonBadge color={TYPE_BADGE_COLOR[model.task_type] ?? "blue"}>
                              {tc.label}
                            </NeonBadge>
                          </td>
                        )}

                        {/* Status */}
                        {isCol("status") && (
                          <td className="px-3 py-3">
                            {updatingThis ? (
                              <InlineLoader
                                text="..."
                                className="py-1 justify-start"
                              />
                            ) : (
                              <Select
                                value={model.status}
                                onValueChange={(v) =>
                                  handleStatusChange(model, v as ModelStatus)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-7 text-[11px] font-semibold border w-[110px]",
                                    sc.bg,
                                    sc.color,
                                    sc.border,
                                  )}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ALL_STATUSES.map((s) => {
                                    const cfg = STATUS_CONFIG[s];
                                    const Icon = cfg.icon;
                                    return (
                                      <SelectItem
                                        key={s}
                                        value={s}
                                        className="text-xs"
                                      >
                                        <span className="flex items-center gap-1.5">
                                          <Icon className="h-3 w-3" />{" "}
                                          {cfg.label}
                                        </span>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        )}

                        {/* Produtos vinculados */}
                        {isCol("links") && (
                          <td className="px-3 py-3">
                            {linkCount > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    onClick={() => {
                                      setSelectedModel(model);
                                      setDrawerOpen(true);
                                      navigate(
                                        `/admin/modelos-tarefas/${model.id}`,
                                        { replace: true },
                                      );
                                    }}
                                  >
                                    <Package className="h-3.5 w-3.5" />
                                    {linkCount}{" "}
                                    {linkCount === 1 ? "produto" : "produtos"}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  className="max-w-[260px]"
                                >
                                  <p className="text-xs font-semibold mb-1">
                                    Produtos vinculados:
                                  </p>
                                  <ul className="space-y-0.5">
                                    {(model.product_links ?? [])
                                      .slice(0, 5)
                                      .map((l) => (
                                        <li
                                          key={l.id}
                                          className="text-xs flex items-center gap-1.5"
                                        >
                                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                                            {l.product.id}
                                          </span>
                                          <span className="truncate">
                                            {l.product.name}
                                          </span>
                                        </li>
                                      ))}
                                    {(model._count?.product_links ?? 0) > 5 && (
                                      <li className="text-xs text-slate-400">
                                        +
                                        {(model._count?.product_links ?? 0) - 5}{" "}
                                        mais
                                      </li>
                                    )}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-slate-300">
                                Não vinculado
                              </span>
                            )}
                          </td>
                        )}

                        {/* Atualizado */}
                        {isCol("updated_at") && (
                          <td className="px-3 py-3">
                            <span className="text-sm text-slate-500">
                              {fmtDate(model.updated_at)}
                            </span>
                          </td>
                        )}

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Row 3 — bottom mirror of row 2 */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
              <div className="flex items-center gap-3">
                <ItemsPerPageSelect
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                  variant="bottom"
                />
                <CountText side="top" />
              </div>

              {hasHorizontalOverflow && (
                <div
                  ref={bottomScrollRef}
                  onScroll={handleBottomBarScroll}
                  title="Arraste para rolar a tabela na horizontal e ver as colunas que não couberem na tela"
                  className="hidden md:block flex-1 min-w-[80px] overflow-x-scroll allka-table-scroll self-center"
                  style={{ height: 12 }}
                >
                  <div style={{ minWidth: 800, height: 1 }} />
                </div>
              )}

              {totalPages > 1 && <PaginationControls />}
            </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filtros panel */}
      <SlidePanel
        open={filtersPanelOpen}
        onClose={() => setFiltersPanelOpen(false)}
        title="Filtros"
        subtitle="Refine os modelos de tarefas exibidos."
        widthMode="full"
        footer={
          filterActiveCount > 0 ? (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpar todos os filtros
            </button>
          ) : undefined
        }
      >
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(v) => {
                  setFilterStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativa" className="text-xs">
                    Ativo
                  </SelectItem>
                  <SelectItem value="inativa" className="text-xs">
                    Inativo
                  </SelectItem>
                  <SelectItem value="em_revisao" className="text-xs">
                    Em Revisão
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Tipo</Label>
              <Select
                value={filterType}
                onValueChange={(v) => {
                  setFilterType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {(
                    [
                      "execution",
                      "review",
                      "approval",
                      "qualification",
                      "support",
                    ] as TaskType[]
                  ).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            {uniqueCategories.length > 0 && (
              <div>
                <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Categoria</Label>
                <Select
                  value={filterCategory}
                  onValueChange={(v) => {
                    setFilterCategory(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full text-xs">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {uniqueCategories.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Vinculação */}
            <div>
              <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Vinculação</Label>
              <Select
                value={filterLinkedMode}
                onValueChange={(v) => {
                  setFilterLinkedMode(v as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full text-xs">
                  <SelectValue placeholder="Vinculação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as vinculações</SelectItem>
                  <SelectItem value="linked" className="text-xs">
                    Vinculados a produtos
                  </SelectItem>
                  <SelectItem value="unlinked" className="text-xs">
                    Sem produto vinculado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Filtros avançados
            </p>
                  <div className="space-y-4">
                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Criado de
                        </Label>
                        <Input
                          type="date"
                          value={advanced.createdFrom}
                          onChange={(e) => {
                            setAdvanced({
                              ...advanced,
                              createdFrom: e.target.value,
                            });
                            setPage(1);
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Criado até
                        </Label>
                        <Input
                          type="date"
                          value={advanced.createdTo}
                          onChange={(e) => {
                            setAdvanced({
                              ...advanced,
                              createdTo: e.target.value,
                            });
                            setPage(1);
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Atualizado de
                        </Label>
                        <Input
                          type="date"
                          value={advanced.updatedFrom}
                          onChange={(e) => {
                            setAdvanced({
                              ...advanced,
                              updatedFrom: e.target.value,
                            });
                            setPage(1);
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Atualizado até
                        </Label>
                        <Input
                          type="date"
                          value={advanced.updatedTo}
                          onChange={(e) => {
                            setAdvanced({
                              ...advanced,
                              updatedTo: e.target.value,
                            });
                            setPage(1);
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Quantidade mínima de
                        produtos vinculados
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={advanced.minLinks}
                        onChange={(e) => {
                          setAdvanced({
                            ...advanced,
                            minLinks: e.target.value,
                          });
                          setPage(1);
                        }}
                        placeholder="0"
                        className="h-8 text-xs"
                      />
                    </div>

                    {uniqueSubcategories.length > 0 && (
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
                          Subcategoria
                        </Label>
                        <Select
                          value={advanced.subcategory}
                          onValueChange={(v) => {
                            setAdvanced({ ...advanced, subcategory: v });
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {uniqueSubcategories.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {uniqueComplexities.length > 0 && (
                      <div>
                        <Label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">
                          Complexidade
                        </Label>
                        <Select
                          value={advanced.complexity}
                          onValueChange={(v) => {
                            setAdvanced({ ...advanced, complexity: v });
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {uniqueComplexities.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
          </div>
        </div>
        </div>
      </SlidePanel>

      {/* Column config panel */}
      <SlidePanel
        open={colConfigOpen}
        onClose={() => setColConfigOpen(false)}
        title="Configurar colunas"
        subtitle={`${visibleCols.size} de ${ALL_COLUMNS.length} visíveis`}
        widthMode="full"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE))}
              className="h-9 px-4 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Restaurar padrão
            </button>
            <button
              onClick={() => setVisibleCols(new Set(ALL_COLUMNS.map((c) => c.key)))}
              className="h-9 px-4 rounded-lg text-xs font-semibold btn-brand transition-all"
            >
              Mostrar todas
            </button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_COLUMNS.map((col) => (
              <label
                key={col.key}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors",
                  visibleCols.has(col.key)
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800",
                  col.required && "opacity-60 pointer-events-none",
                )}
              >
                <Checkbox
                  checked={visibleCols.has(col.key)}
                  onCheckedChange={() => toggleCol(col.key)}
                  disabled={col.required}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                  {col.label}
                </span>
                {col.required && (
                  <span className="text-[9px] text-slate-400 flex-shrink-0">
                    obrigatória
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      </SlidePanel>

      {/* "+" info panel — real fields already present on the row object
          (no fetch needed: getCatalogTasks already returns product_links). */}
      <SlidePanel
        open={infoPanelOpen}
        onClose={() => setInfoPanelOpen(false)}
        title={infoPanelModel?.name}
        subtitle={
          infoPanelModel &&
          `${formatModelCode(codeOrdinals.get(infoPanelModel.id))} · ${infoPanelModel.category}${infoPanelModel.subcategory ? ` · ${infoPanelModel.subcategory}` : ""}`
        }
        widthMode="full"
      >
        {infoPanelModel && (
          <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-wrap gap-2">
              <NeonBadge color={STATUS_BADGE_COLOR[infoPanelModel.status] ?? "emerald"}>
                {(STATUS_CONFIG[infoPanelModel.status] ?? STATUS_CONFIG.ativa).label}
              </NeonBadge>
              <NeonBadge color={TYPE_BADGE_COLOR[infoPanelModel.task_type] ?? "blue"}>
                {(TYPE_CONFIG[infoPanelModel.task_type] ?? TYPE_CONFIG.execution).label}
              </NeonBadge>
              {infoPanelModel.requires_briefing && (
                <NeonBadge color="blue">
                  <HelpCircle className="h-3 w-3 mr-1 inline" /> Requer briefing
                </NeonBadge>
              )}
              {infoPanelModel.requires_access && (
                <NeonBadge color="orange">
                  <ShieldCheck className="h-3 w-3 mr-1 inline" /> Requer acesso
                </NeonBadge>
              )}
              {infoPanelModel.requires_files && (
                <NeonBadge color="purple">
                  <FileText className="h-3 w-3 mr-1 inline" /> Requer arquivos
                </NeonBadge>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Dados do modelo
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Complexidade</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {COMPLEXITY_LABEL[infoPanelModel.complexity] ?? infoPanelModel.complexity ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Prioridade padrão</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {PRIORITY_LABEL[infoPanelModel.default_priority] ?? infoPanelModel.default_priority ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Prazo padrão</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {infoPanelModel.default_deadline_days ? `${infoPanelModel.default_deadline_days} dia(s)` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Horas estimadas</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {infoPanelModel.estimated_hours ? `${infoPanelModel.estimated_hours}h` : "—"}
                  </p>
                </div>
                {infoPanelModel.responsible_type && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 col-span-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Responsável</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{infoPanelModel.responsible_type}</p>
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 col-span-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Criado · Atualizado</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {fmtDate(infoPanelModel.created_at)} · {fmtDate(infoPanelModel.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {infoPanelModel.description && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Descrição</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{infoPanelModel.description}</p>
              </div>
            )}

            {infoPanelModel.objective && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Objetivo</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{infoPanelModel.objective}</p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Produtos vinculados
                <span className="ml-1.5 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300 align-middle">
                  {infoPanelModel._count?.product_links ?? infoPanelModel.product_links?.length ?? 0}
                </span>
              </h3>
              {(infoPanelModel.product_links?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  {infoPanelModel.product_links!.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded shrink-0">
                          {l.product.id}
                        </span>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{l.product.name}</p>
                      </div>
                      {l.is_mandatory && (
                        <span className="flex-shrink-0 ml-3 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                          Obrigatório
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Nenhum produto vinculado a este modelo.</p>
              )}
            </div>
          </div>
          </div>
        )}
      </SlidePanel>

      {/* Detail Drawer */}
      <ModelDetailDrawer
        model={selectedModel}
        codeOrdinal={selectedModel ? codeOrdinals.get(selectedModel.id) : undefined}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          navigate("/admin/modelos-tarefas", { replace: true });
        }}
        onStatusChange={handleStatusChange}
        onDuplicate={handleDuplicate}
        updatingId={updatingId}
      />

      {/* Create Sheet */}
      <Sheet
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) resetCreateForm();
        }}
      >
        <SheetContent
          side="right"
          hideOverlay
          className="p-0 flex flex-col gap-0 z-[70] [&>button:last-child]:top-3 [&>button:last-child]:right-3 [&>button:last-child]:p-1.5 [&>button:last-child]:hover:bg-white/20 [&>button:last-child_svg]:size-4"
          style={{
            left: `${sidebarWidth - 2}px`,
            top: `${headerHeight - 1}px`,
            bottom: `${footerHeight - 1}px`,
            height: "auto",
            width: `calc(100vw - ${sidebarWidth - 2}px)`,
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{
              background:
                "var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628))",
            }}
          >
            <div className="min-w-0 flex-1 text-sm font-bold text-white truncate">
              {createForm.name || "Novo Modelo de Tarefa"}
              <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">
                Criando modelo de tarefa reutilizável · código gerado automaticamente
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <Tabs defaultValue="info" className="space-y-0">
              {/* Tab nav */}
              <div className="sticky top-0 z-10 bg-background border-b border-slate-200 dark:border-slate-700 px-5">
                <TabsList className="bg-transparent p-0 h-10 border-0 rounded-none gap-0 w-full justify-start">
                  <TabsTrigger
                    value="info"
                    className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger
                    value="etapas"
                    className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Etapas & Checklist
                    {(createLists.steps.length + createLists.checklist.length) > 0 && (
                      <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                        {createLists.steps.length + createLists.checklist.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="briefing"
                    className="relative h-10 px-4 rounded-none bg-transparent border-0 shadow-none text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-blue-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Briefing & Regras
                    {(createLists.briefing_questions.length + createLists.required_files.length + createLists.execution_rules.length + createLists.conclusion_rules.length) > 0 && (
                      <span className="ml-0.5 h-4 min-w-4 px-1 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                        {createLists.briefing_questions.length + createLists.required_files.length + createLists.execution_rules.length + createLists.conclusion_rules.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Tab: Informações ── */}
              <TabsContent value="info" className="p-6 space-y-5 mt-0">
                {/* Nome */}
                <div className="space-y-1.5">
                  <Label htmlFor="ct-name" className="text-xs font-semibold">
                    Nome do modelo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ct-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex.: Configuração de Tag Manager"
                    className="h-9 text-sm"
                  />
                </div>

                {/* Categoria + Subcategoria */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-cat" className="text-xs font-semibold">
                      Categoria <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="ct-cat"
                      value={createForm.category}
                      onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="Ex.: Tráfego Pago"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-sub" className="text-xs font-semibold">
                      Subcategoria
                    </Label>
                    <Input
                      id="ct-sub"
                      value={createForm.subcategory}
                      onChange={(e) => setCreateForm((f) => ({ ...f, subcategory: e.target.value }))}
                      placeholder="Opcional"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Tipo + Prioridade + Complexidade */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de tarefa</Label>
                    <Select
                      value={createForm.task_type}
                      onValueChange={(v) => setCreateForm((f) => ({ ...f, task_type: v as TaskType }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["execution", "review", "approval", "qualification", "support"] as TaskType[]).map((t) => (
                          <SelectItem key={t} value={t} className="text-sm">{TYPE_CONFIG[t].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Prioridade padrão</Label>
                    <Select
                      value={createForm.default_priority}
                      onValueChange={(v) => setCreateForm((f) => ({ ...f, default_priority: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k} className="text-sm">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Complexidade</Label>
                    <Select
                      value={createForm.complexity}
                      onValueChange={(v) => setCreateForm((f) => ({ ...f, complexity: v }))}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(COMPLEXITY_LABEL).map(([k, label]) => (
                          <SelectItem key={k} value={k} className="text-sm">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Prazo + Horas + Responsável */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-days" className="text-xs font-semibold">Prazo padrão (dias)</Label>
                    <Input
                      id="ct-days"
                      type="number"
                      min="0"
                      value={createForm.default_deadline_days}
                      onChange={(e) => setCreateForm((f) => ({ ...f, default_deadline_days: e.target.value }))}
                      placeholder="Ex.: 5"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-hours" className="text-xs font-semibold">Horas estimadas</Label>
                    <Input
                      id="ct-hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={createForm.estimated_hours}
                      onChange={(e) => setCreateForm((f) => ({ ...f, estimated_hours: e.target.value }))}
                      placeholder="Ex.: 3.5"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ct-resp" className="text-xs font-semibold">Tipo de responsável</Label>
                    <Input
                      id="ct-resp"
                      value={createForm.responsible_type}
                      onChange={(e) => setCreateForm((f) => ({ ...f, responsible_type: e.target.value }))}
                      placeholder="Ex.: Designer"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                  <Label htmlFor="ct-desc" className="text-xs font-semibold">Descrição</Label>
                  <Textarea
                    id="ct-desc"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Descrição curta do modelo de tarefa"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Objetivo */}
                <div className="space-y-1.5">
                  <Label htmlFor="ct-obj" className="text-xs font-semibold">Objetivo</Label>
                  <Textarea
                    id="ct-obj"
                    value={createForm.objective}
                    onChange={(e) => setCreateForm((f) => ({ ...f, objective: e.target.value }))}
                    placeholder="Qual o objetivo principal desta tarefa?"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Flags */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Requisitos</Label>
                  <div className="flex flex-col gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                    {[
                      { key: "requires_access", label: "Requer acesso a plataformas", desc: "Nômade precisará de credenciais de acesso" },
                      { key: "requires_briefing", label: "Requer briefing do cliente", desc: "Depende de respostas do formulário de briefing" },
                      { key: "requires_files", label: "Requer arquivos do cliente", desc: "Cliente precisa enviar arquivos antes da execução" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                        </div>
                        <Switch
                          checked={createForm[key] as boolean}
                          onCheckedChange={(v) => setCreateForm((f) => ({ ...f, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orientações internas */}
                <div className="space-y-1.5">
                  <Label htmlFor="ct-guidance" className="text-xs font-semibold">Orientações internas</Label>
                  <Textarea
                    id="ct-guidance"
                    value={createForm.internal_guidance}
                    onChange={(e) => setCreateForm((f) => ({ ...f, internal_guidance: e.target.value }))}
                    placeholder="Instruções visíveis apenas para a equipe interna"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-1.5">
                  <Label htmlFor="ct-notes" className="text-xs font-semibold">Notas</Label>
                  <Textarea
                    id="ct-notes"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Observações adicionais (opcional)"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    O modelo será criado com status <strong>Em revisão</strong>. Após validação, altere para <strong>Ativo</strong> para que possa ser vinculado a produtos.
                  </span>
                </div>
              </TabsContent>

              {/* ── Tab: Etapas & Checklist ── */}
              <TabsContent value="etapas" className="p-6 space-y-8 mt-0">
                {/* Etapas de execução */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-500" />
                      Etapas de execução
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Passos sequenciais que o nômade deve seguir para completar a tarefa.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={listInputs.steps}
                      onChange={(e) => setListInputs((l) => ({ ...l, steps: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList("steps", listInputs.steps); }}}
                      placeholder="Descreva a etapa e pressione Enter"
                      className="h-9 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addToList("steps", listInputs.steps)}
                      disabled={!listInputs.steps.trim()}
                      className="h-9 px-3 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {createLists.steps.length > 0 && (
                    <div className="space-y-1.5">
                      {createLists.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                          <span className="text-[11px] font-mono text-slate-400 w-5 mt-0.5 shrink-0">{i + 1}.</span>
                          <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{step}</span>
                          <button
                            type="button"
                            onClick={() => removeFromList("steps", i)}
                            className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {createLists.steps.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Nenhuma etapa adicionada ainda.</p>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800" />

                {/* Checklist */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-emerald-500" />
                      Checklist de entrega
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Itens que devem ser verificados antes de marcar a tarefa como concluída.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={listInputs.checklist}
                      onChange={(e) => setListInputs((l) => ({ ...l, checklist: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList("checklist", listInputs.checklist); }}}
                      placeholder="Adicione um item ao checklist e pressione Enter"
                      className="h-9 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addToList("checklist", listInputs.checklist)}
                      disabled={!listInputs.checklist.trim()}
                      className="h-9 px-3 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {createLists.checklist.length > 0 && (
                    <div className="space-y-1.5">
                      {createLists.checklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{item}</span>
                          <button
                            type="button"
                            onClick={() => removeFromList("checklist", i)}
                            className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {createLists.checklist.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Nenhum item adicionado ainda.</p>
                  )}
                </div>
              </TabsContent>

              {/* ── Tab: Briefing & Regras ── */}
              <TabsContent value="briefing" className="p-6 space-y-8 mt-0">
                {/* Perguntas de briefing */}
                {[
                  {
                    key: "briefing_questions" as const,
                    title: "Perguntas de briefing",
                    desc: "Perguntas respondidas pelo cliente antes da execução.",
                    icon: <HelpCircle className="h-4 w-4 text-violet-500" />,
                    placeholder: "Ex.: Qual o público-alvo da campanha?",
                  },
                  {
                    key: "required_files" as const,
                    title: "Arquivos necessários",
                    desc: "Arquivos que o cliente deve fornecer.",
                    icon: <FileText className="h-4 w-4 text-orange-500" />,
                    placeholder: "Ex.: Logo em alta resolução (PNG ou SVG)",
                  },
                  {
                    key: "execution_rules" as const,
                    title: "Regras de execução",
                    desc: "Diretrizes obrigatórias durante a execução.",
                    icon: <ShieldCheck className="h-4 w-4 text-blue-500" />,
                    placeholder: "Ex.: Sempre verificar conformidade com a marca",
                  },
                  {
                    key: "conclusion_rules" as const,
                    title: "Regras de conclusão",
                    desc: "Critérios para considerar a tarefa concluída.",
                    icon: <Target className="h-4 w-4 text-red-500" />,
                    placeholder: "Ex.: Relatório final aprovado pelo cliente",
                  },
                ].map(({ key, title, desc, icon, placeholder }, sectionIdx) => (
                  <div key={key} className="space-y-3">
                    {sectionIdx > 0 && <div className="border-t border-slate-100 dark:border-slate-800" />}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {icon}
                        {title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={listInputs[key]}
                        onChange={(e) => setListInputs((l) => ({ ...l, [key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(key, listInputs[key]); }}}
                        placeholder={placeholder}
                        className="h-9 text-sm"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addToList(key, listInputs[key])}
                        disabled={!listInputs[key]?.trim()}
                        className="h-9 px-3 shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {createLists[key].length > 0 ? (
                      <div className="space-y-1.5">
                        {createLists[key].map((item, i) => (
                          <div key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                            <span className="text-[11px] font-mono text-slate-400 w-5 mt-0.5 shrink-0">{i + 1}.</span>
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{item}</span>
                            <button
                              type="button"
                              onClick={() => removeFromList(key, i)}
                              className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum item adicionado ainda.</p>
                    )}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3 shrink-0 bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCreateOpen(false); resetCreateForm(); }}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateModel}
              disabled={creating || !createForm.name.trim() || !createForm.category.trim()}
              className="btn-brand border-0 gap-2"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Criar modelo
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
