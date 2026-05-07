// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  SlidersHorizontal,
  Cog,
  Calendar,
  Hash,
  AlertCircle,
  Clock,
  BookOpen,
  Wrench,
  ExternalLink,
  Star,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  PageLoader,
  ButtonLoader,
  InlineLoader,
} from "@/components/ui/loading";

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

// --- Sort header --------------------------------------------------------------

function Th({
  label,
  field,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  field: string;
  sortKey: string | null;
  sortDir: "asc" | "desc";
  onSort: (f: string) => void;
  className?: string;
}) {
  const active = sortKey === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={cn(
        "px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer select-none hover:text-slate-800 transition-colors",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
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
  open,
  onClose,
  onStatusChange,
  onDuplicate,
  updatingId,
}: {
  model: CatalogTask | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (model: CatalogTask, status: ModelStatus) => void;
  onDuplicate: (model: CatalogTask) => void;
  updatingId: string | null;
}) {
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
        className="w-full sm:max-w-3xl p-0 flex flex-col h-full gap-0"
      >
        {/* -- HEADER --------------------------------------------------------- */}
        <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-fuchsia-700 px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/20">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold bg-white/20 text-white px-2 py-0.5 rounded-md tracking-wider">
                  {model.code}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    sc.bg,
                    sc.color,
                    sc.border,
                  )}
                >
                  {sc.label}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    tc.bg,
                    tc.color,
                  )}
                >
                  {tc.label}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
                {model.name}
              </h2>
              <p className="text-sm text-white/60 mt-0.5 truncate">
                {model.category}
                {model.subcategory ? (
                  <span className="opacity-70"> · {model.subcategory}</span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CopyLinkButton />
              <button
                onClick={onClose}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex">
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
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors",
                  activeTab === t.value
                    ? "border-white text-white"
                    : "border-transparent text-white/50 hover:text-white/80 hover:border-white/30",
                )}
              >
                {t.icon}
                {t.label}
                {t.badge != null && (
                  <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* -- BODY ----------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading skeleton */}
          {loadingDetail && (
            <div className="p-6 space-y-4">
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
                <div className="p-6 space-y-6">
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
                <div className="p-6 space-y-8">
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
                <div className="p-6 space-y-8">
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
                <div className="p-6 space-y-6">
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
  const [pageSize, setPageSize] = useState<number>(25);
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [colConfigOpen, setColConfigOpen] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<string | null>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);

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

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "",
    subcategory: "",
    task_type: "execution" as TaskType,
    description: "",
  });
  const resetCreateForm = () =>
    setCreateForm({
      name: "",
      category: "",
      subcategory: "",
      task_type: "execution",
      description: "",
    });

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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shrink-0">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Modelos de Tarefas
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Gerencie modelos reutilizáveis vinculados aos produtos da
                plataforma.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchModels}
              disabled={loading}
              className="gap-2 h-9"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-9 gap-2 btn-brand shadow-md border-0"
            >
              <Plus className="h-4 w-4" />
              Novo Modelo
            </Button>
          </div>
        </div>

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

        {/* Stat cards */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                label: "Total de modelos",
                value: stats.total,
                icon: ClipboardList,
                grad: "from-slate-700 via-slate-800 to-slate-900",
                ring: "ring-slate-300/40",
                onClick: () => clearFilters(),
              },
              {
                label: "Modelos ativos",
                value: stats.ativos,
                icon: CheckCircle2,
                grad: "from-emerald-500 via-emerald-600 to-teal-700",
                ring: "ring-emerald-300/40",
                onClick: () => {
                  clearFilters();
                  setFilterStatus("ativa");
                },
              },
              {
                label: "Modelos inativos",
                value: stats.inativos,
                icon: PauseCircle,
                grad: "from-slate-400 via-slate-500 to-slate-700",
                ring: "ring-slate-300/40",
                onClick: () => {
                  clearFilters();
                  setFilterStatus("inativa");
                },
              },
              {
                label: "Em revisão",
                value: stats.emRevisao,
                icon: Eye,
                grad: "from-amber-500 via-orange-500 to-rose-600",
                ring: "ring-amber-300/40",
                onClick: () => {
                  clearFilters();
                  setFilterStatus("em_revisao");
                },
              },
              {
                label: "Vinculados a produtos",
                value: stats.vinculados,
                icon: Boxes,
                grad: "from-blue-500 via-indigo-600 to-violet-700",
                ring: "ring-indigo-300/40",
                onClick: () => {
                  clearFilters();
                  setFilterLinkedMode("linked");
                },
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  onClick={c.onClick}
                  className={cn(
                    "group relative rounded-2xl bg-gradient-to-br px-4 py-4 text-white text-left overflow-hidden",
                    "shadow-md ring-1 transition-all duration-200",
                    "hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]",
                    c.grad,
                    c.ring,
                  )}
                >
                  {/* Decorative blob */}
                  <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/10 blur-xl group-hover:bg-white/20 transition-colors" />
                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80 leading-none mb-2">
                        {c.label}
                      </p>
                      <p className="text-3xl font-black leading-none tabular-nums">
                        {c.value}
                      </p>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
                      <Icon className="h-4.5 w-4.5" strokeWidth={2.25} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        {!loading && !error && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar por código, nome, categoria ou produto..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 pl-9 pr-9 text-sm"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status */}
              <Select
                value={filterStatus}
                onValueChange={(v) => {
                  setFilterStatus(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[140px] text-xs">
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

              {/* Type */}
              <Select
                value={filterType}
                onValueChange={(v) => {
                  setFilterType(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
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

              {/* Category */}
              {uniqueCategories.length > 0 && (
                <Select
                  value={filterCategory}
                  onValueChange={(v) => {
                    setFilterCategory(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px] text-xs">
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
              )}

              {/* Vinculação */}
              <Select
                value={filterLinkedMode}
                onValueChange={(v) => {
                  setFilterLinkedMode(v as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs">
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

              {/* Advanced filters */}
              <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 gap-1.5 text-xs",
                      advancedActiveCount > 0 &&
                        "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Avançado
                    {advancedActiveCount > 0 && (
                      <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {advancedActiveCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-[420px] p-0"
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Filtros avançados
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Refine os modelos de tarefas exibidos.
                      </p>
                    </div>
                    {advancedActiveCount > 0 && (
                      <button
                        onClick={() => {
                          setAdvanced(EMPTY_ADV);
                          setPage(1);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
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
                  <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 text-xs btn-brand border-0"
                      onClick={() => setAdvancedOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Column settings */}
              <Popover open={colConfigOpen} onOpenChange={setColConfigOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    title="Configurar tabela"
                  >
                    <Cog className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-[280px] p-0"
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Colunas visíveis
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sua preferência é salva automaticamente.
                    </p>
                  </div>
                  <div className="p-2 max-h-[280px] overflow-y-auto space-y-0.5">
                    {ALL_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Checkbox
                          checked={visibleCols.has(col.key)}
                          onCheckedChange={() => toggleCol(col.key)}
                          disabled={col.required}
                        />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 flex-1">
                          {col.label}
                        </span>
                        {col.required && (
                          <span className="text-[9px] uppercase tracking-wider text-slate-400">
                            obrigatória
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <button
                      onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE))}
                      className="text-[11px] text-slate-500 hover:text-slate-700"
                    >
                      Restaurar padrão
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setColConfigOpen(false)}
                    >
                      Fechar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-xs gap-1.5 text-slate-500"
                >
                  <X className="h-3.5 w-3.5" /> Limpar filtros
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-slate-500">
                Exibindo{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {sorted.length}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {models.length}
                </span>{" "}
                modelo{models.length !== 1 ? "s" : ""}
                {hasActiveFilters && (
                  <span className="text-blue-600 ml-1">· filtros ativos</span>
                )}
              </p>
              <ItemsPerPageSelect
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && <PageLoader text="Carregando modelos de tarefas…" />}

        {/* Empty · no models */}
        {!loading && !error && models.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-16 flex flex-col items-center text-center gap-4">
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
        )}

        {/* Empty · no filter results */}
        {!loading && !error && models.length > 0 && sorted.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center text-center gap-3">
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
        )}

        {/* Table */}
        {!loading && !error && sorted.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div
              className="overflow-auto allka-table-scroll"
              style={{ maxHeight: "calc(100vh - 18rem)" }}
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
                    {isCol("code") && (
                      <Th
                        label="Código"
                        field="code"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={toggleSort}
                        className="pl-4 w-28"
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
                      />
                    )}
                    <th className="px-3 py-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((model) => {
                    const sc =
                      STATUS_CONFIG[model.status] ?? STATUS_CONFIG.ativa;
                    const tc =
                      TYPE_CONFIG[model.task_type] ?? TYPE_CONFIG.execution;
                    const linkCount =
                      model._count?.product_links ??
                      model.product_links?.length ??
                      0;
                    const updatingThis = updatingId === model.id;
                    return (
                      <tr
                        key={model.id}
                        className={`group transition-colors ${
                          sorted.indexOf(model) % 2 === 0
                            ? "bg-[var(--table-row)] hover:bg-[var(--table-row-hover)]"
                            : "bg-[var(--table-row-alt)] hover:bg-[var(--table-row-hover)]"
                        }`}
                      >
                        {/* Código */}
                        {isCol("code") && (
                          <td className="px-3 py-3 pl-4">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {model.code}
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
                            <span
                              className={cn(
                                "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full",
                                tc.bg,
                                tc.color,
                              )}
                            >
                              {tc.label}
                            </span>
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

                        {/* Ações */}
                        <td className="px-3 py-3 pr-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <span className="sr-only">Ações</span>
                                <svg
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  viewBox="0 0 16 16"
                                >
                                  <circle cx="8" cy="3" r="1.5" />
                                  <circle cx="8" cy="8" r="1.5" />
                                  <circle cx="8" cy="13" r="1.5" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                className="text-sm gap-2"
                                onClick={() => {
                                  setSelectedModel(model);
                                  setDrawerOpen(true);
                                  navigate(
                                    `/admin/modelos-tarefas/${model.id}`,
                                    { replace: true },
                                  );
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" /> Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-sm gap-2"
                                onClick={() => handleDuplicate(model)}
                                disabled={updatingThis}
                              >
                                <Copy className="h-3.5 w-3.5 text-blue-600" />{" "}
                                Duplicar modelo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-sm gap-2"
                                onClick={() =>
                                  handleStatusChange(model, "ativa")
                                }
                                disabled={model.status === "ativa"}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{" "}
                                Marcar como ativo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-sm gap-2"
                                onClick={() =>
                                  handleStatusChange(model, "inativa")
                                }
                                disabled={model.status === "inativa"}
                              >
                                <Circle className="h-3.5 w-3.5 text-slate-400" />{" "}
                                Marcar como inativo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-sm gap-2"
                                onClick={() =>
                                  handleStatusChange(model, "em_revisao")
                                }
                                disabled={model.status === "em_revisao"}
                              >
                                <Eye className="h-3.5 w-3.5 text-amber-600" />{" "}
                                Enviar p/ revisão
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sorted.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <p className="text-xs text-slate-500">
                  {(() => {
                    const start = Math.min(
                      (page - 1) * pageSize + 1,
                      sorted.length,
                    );
                    const end = Math.min(page * pageSize, sorted.length);
                    return (
                      <>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {start}-{end}
                        </span>{" "}
                        de{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {sorted.length}
                        </span>{" "}
                        · Página{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {page}
                        </span>{" "}
                        de {totalPages}
                      </>
                    );
                  })()}
                </p>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {getPageNumbers().map((p, idx) =>
                    p === "..." ? (
                      <span
                        key={`dot-${idx}`}
                        className="text-xs text-slate-300 px-1"
                      >
                        —
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(Number(p))}
                        className={cn(
                          "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors",
                          p === page
                            ? "btn-brand text-white shadow-sm"
                            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                        )}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <ModelDetailDrawer
        model={selectedModel}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          navigate("/admin/modelos-tarefas", { replace: true });
        }}
        onStatusChange={handleStatusChange}
        onDuplicate={handleDuplicate}
        updatingId={updatingId}
      />

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </span>
              Novo Modelo de Tarefa
            </DialogTitle>
            <DialogDescription>
              Crie um modelo reutilizável que poderá ser vinculado a um ou mais
              produtos. O código será gerado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-name" className="text-xs font-semibold">
                Nome do modelo *
              </Label>
              <Input
                id="ct-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex.: Configuração de Tag Manager"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ct-cat" className="text-xs font-semibold">
                  Categoria *
                </Label>
                <Input
                  id="ct-cat"
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, category: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      subcategory: e.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de tarefa</Label>
              <Select
                value={createForm.task_type}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, task_type: v as TaskType }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "execution",
                      "review",
                      "approval",
                      "qualification",
                      "support",
                    ] as TaskType[]
                  ).map((t) => (
                    <SelectItem key={t} value={t} className="text-sm">
                      {TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ct-desc" className="text-xs font-semibold">
                Descrição
              </Label>
              <Textarea
                id="ct-desc"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Descrição curta do modelo (opcional)"
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                O modelo será criado com status <strong>Em revisão</strong>.
                Após validação, altere para <strong>Ativo</strong> para que
                possa ser vinculado a produtos.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateModel}
              disabled={
                creating ||
                !createForm.name.trim() ||
                !createForm.category.trim()
              }
              className="btn-brand border-0 gap-2"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Criar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
