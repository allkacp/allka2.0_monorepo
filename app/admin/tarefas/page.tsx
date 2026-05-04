// @ts-nocheck
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  CheckSquare2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  X,
  FolderOpen,
  Package,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Rocket,
  ArrowRight,
  UserSearch,
  User,
  MoreHorizontal,
  ExternalLink,
  PauseCircle,
  ThumbsUp,
  ThumbsDown,
  Truck,
  Wrench,
  Timer,
  CalendarDays,
  Ban,
  Star,
  GraduationCap,
  AlertOctagon,
  SendHorizonal,
  Cog,
  Pencil,
  RotateCcw,
  Hash,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/loading";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { TaskLaunchDrawer } from "@/components/task-launch-drawer";
import { ProjectViewSlidePanel } from "@/components/project-view-slide-panel";
import { TarefasFilterDrawer } from "@/components/tarefas-filter-drawer";
import { TarefaDetailDrawer } from "@/components/tarefa-detail-drawer";
import {
  FilterValues,
  EMPTY_FILTERS,
  countActiveFilters,
} from "@/types/tarefas-filters";
import { TASK_STATUS_VARIANT, PRIORITY_VARIANT } from "@/components/allka-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus =
  | "PARA_LANCAMENTO"
  | "EM_LANCAMENTO"
  | "AGUARDANDO_INFORMACOES"
  | "AGUARDANDO_ETAPA"
  | "LIBERADA_PARA_EXECUCAO"
  | "EM_EXECUCAO"
  | "EM_REVISAO"
  | "MELHORIAS_FINAIS"
  | "EM_APROVACAO"
  | "APROVACAO_PENDENTE_CLIENTE"
  | "APROVADA"
  | "REPROVADA"
  | "CONCLUIDA"
  | "PAUSADA"
  | "CANCELADA"
  | "AGUARDANDO_NOMADE"
  | "ENTREGA_PENDENTE"
  | "ENTREGA_ATRASADA"
  | "QUALIFICACAO_PENDENTE"
  | "NAO_SEGUIU_ORIENTACOES";

type Priority = "low" | "medium" | "high" | "urgent";

interface TarefaOperacional {
  id: string;
  project_id: string;
  project_product_id: string;
  product_id: string;
  catalog_task_id: string | null;
  task_code: string | null;
  code_snapshot: string | null;
  name_snapshot: string;
  category_snapshot: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assignee_id: string | null;
  responsavel_agencia_id: string | null;
  nomade_responsavel_id: string | null;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  data_lancamento: string | null;
  data_liberacao_execucao: string | null;
  data_inicio_execucao: string | null;
  data_conclusao: string | null;
  sort_order: number;
  fase: string | null;
  observations: string | null;
  checklist_snapshot: any;
  steps_snapshot: any;
  briefing_snapshot: any;
  created_at: string;
  updated_at: string;
  responsavel_agencia: { id: string; name: string; email?: string } | null;
  nomade_responsavel: { id: string; name: string; email?: string } | null;
  project: {
    id: string;
    title: string;
    status: string;
    type?: string;
    consultant?: string | null;
    client: { id: string; name: string; logo?: string; cnpj?: string } | null;
  };
  project_product: {
    id: string;
    product_name_snapshot: string;
    product_code_snapshot: string | null;
    product_category_snapshot: string | null;
    status: string;
  };
  catalog_task: {
    id: string;
    code: string;
    name: string;
    category: string;
  } | null;
  _count: { stages: number; briefing_answers: number; attachments: number };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  TaskStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: any;
    group: string;
  }
> = {
  PARA_LANCAMENTO: {
    label: "Para lan\u00e7amento",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    icon: Clock,
    group: "pendente",
  },
  EM_LANCAMENTO: {
    label: "Em lan\u00e7amento",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    icon: SendHorizonal,
    group: "andamento",
  },
  AGUARDANDO_INFORMACOES: {
    label: "Aguard. informa\u00e7\u00f5es",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: MessageSquare,
    group: "pendente",
  },
  AGUARDANDO_ETAPA: {
    label: "Aguardando etapa",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Timer,
    group: "pendente",
  },
  LIBERADA_PARA_EXECUCAO: {
    label: "Enviada p/ execu\u00e7\u00e3o",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    icon: ArrowRight,
    group: "andamento",
  },
  EM_EXECUCAO: {
    label: "Em execu\u00e7\u00e3o",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: PlayCircle,
    group: "andamento",
  },
  EM_REVISAO: {
    label: "Em revis\u00e3o",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Eye,
    group: "revisao",
  },
  MELHORIAS_FINAIS: {
    label: "Melhorias finais",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: Wrench,
    group: "revisao",
  },
  EM_APROVACAO: {
    label: "Aprova\u00e7\u00e3o - Ag\u00eancia",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: CheckCircle2,
    group: "aprovacao",
  },
  APROVACAO_PENDENTE_CLIENTE: {
    label: "Aprova\u00e7\u00e3o - Cliente",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: CheckCircle2,
    group: "aprovacao",
  },
  APROVADA: {
    label: "Aprovada",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    icon: ThumbsUp,
    group: "concluido",
  },
  REPROVADA: {
    label: "Reprovada",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: ThumbsDown,
    group: "problema",
  },
  CONCLUIDA: {
    label: "Conclu\u00edda",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
    group: "concluido",
  },
  PAUSADA: {
    label: "Pausada",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: PauseCircle,
    group: "pendente",
  },
  CANCELADA: {
    label: "Cancelada",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
    group: "problema",
  },
  AGUARDANDO_NOMADE: {
    label: "Aguard. n\u00f4made",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: UserSearch,
    group: "pendente",
  },
  ENTREGA_PENDENTE: {
    label: "Entrega pendente",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: Truck,
    group: "andamento",
  },
  ENTREGA_ATRASADA: {
    label: "Entrega atrasada",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-100",
    icon: AlertOctagon,
    group: "problema",
  },
  QUALIFICACAO_PENDENTE: {
    label: "Qualifica\u00e7\u00e3o pendente",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: GraduationCap,
    group: "pendente",
  },
  NAO_SEGUIU_ORIENTACOES: {
    label: "N\u00e3o seguiu orienta\u00e7\u00f5es",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: Ban,
    group: "problema",
  },
};

const ALL_STATUSES = Object.keys(STATUS_CFG) as TaskStatus[];

const PRIORITY_CFG: Record<
  Priority,
  { label: string; dot: string; text: string; bg: string }
> = {
  low: {
    label: "Baixa",
    dot: "bg-slate-400",
    text: "text-slate-600",
    bg: "bg-slate-100",
  },
  medium: {
    label: "M\u00e9dia",
    dot: "bg-blue-400",
    text: "text-blue-700",
    bg: "bg-blue-50",
  },
  high: {
    label: "Alta",
    dot: "bg-amber-400",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
  urgent: {
    label: "Urgente",
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
  },
};

// ─── Column config ────────────────────────────────────────────────────────────

type ColKey =
  | "acoes"
  | "id"
  | "codigo"
  | "tarefa"
  | "projeto"
  | "cliente"
  | "agencia"
  | "produto"
  | "status"
  | "nomade"
  | "lider"
  | "prazo"
  | "execucao"
  | "atraso"
  | "prioridade";

const ALL_COLUMNS: {
  key: ColKey;
  label: string;
  required?: boolean;
  defaultW: number;
  minW: number;
}[] = [
  {
    key: "acoes",
    label: "A\u00e7\u00f5es",
    required: true,
    defaultW: 80,
    minW: 60,
  },
  { key: "id", label: "ID", defaultW: 80, minW: 60 },
  { key: "codigo", label: "C\u00f3digo", defaultW: 110, minW: 80 },
  { key: "tarefa", label: "Tarefa", required: true, defaultW: 260, minW: 160 },
  { key: "projeto", label: "Projeto", defaultW: 200, minW: 120 },
  { key: "cliente", label: "Cliente", defaultW: 180, minW: 120 },
  { key: "agencia", label: "Resp. Ag\u00eancia", defaultW: 160, minW: 100 },
  { key: "produto", label: "Produto", defaultW: 180, minW: 120 },
  { key: "status", label: "Status", required: true, defaultW: 185, minW: 130 },
  { key: "nomade", label: "N\u00f4made", defaultW: 160, minW: 100 },
  { key: "lider", label: "L\u00edder", defaultW: 150, minW: 100 },
  { key: "prazo", label: "Prazo entrega", defaultW: 130, minW: 100 },
  {
    key: "execucao",
    label: "Prazo execu\u00e7\u00e3o",
    defaultW: 130,
    minW: 100,
  },
  { key: "atraso", label: "Atraso", defaultW: 100, minW: 70 },
  { key: "prioridade", label: "Prioridade", defaultW: 110, minW: 80 },
];

const DEFAULT_VISIBLE: ColKey[] = [
  "acoes",
  "codigo",
  "tarefa",
  "projeto",
  "cliente",
  "produto",
  "status",
  "nomade",
  "prazo",
  "atraso",
  "prioridade",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(t: TarefaOperacional) {
  if (!t.due_date) return false;
  if (["CONCLUIDA", "CANCELADA", "APROVADA"].includes(t.status)) return false;
  return new Date(t.due_date) < new Date();
}

function fmtDate(iso?: string | null, compact = false) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString(
    "pt-BR",
    compact
      ? { day: "2-digit", month: "2-digit" }
      : { day: "2-digit", month: "2-digit", year: "numeric" },
  );
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function parseStrings(data: any): string[] {
  if (!data) return [];
  try {
    const p = typeof data === "string" ? JSON.parse(data) : data;
    return (Array.isArray(p) ? p : []).map((i: any) =>
      typeof i === "string"
        ? i
        : i?.label || i?.text || i?.title || i?.question || JSON.stringify(i),
    );
  } catch {
    return [];
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PARA_LANCAMENTO;
  const Icon = cfg.icon;
  const allkaCls = TASK_STATUS_VARIANT[status] ?? "";
  const variantCls = allkaCls ? `allka-badge allka-badge-${allkaCls.replace("task-", "task-")}` : cn("inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-2.5 py-1 whitespace-nowrap", cfg.bg, cfg.color, cfg.border);
  if (allkaCls) {
    return (
      <span className={`allka-badge allka-badge-${allkaCls}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {cfg.label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-2.5 py-1 whitespace-nowrap",
        cfg.bg,
        cfg.color,
        cfg.border,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const pc = PRIORITY_CFG[priority] ?? PRIORITY_CFG.medium;
  const allkaCls = PRIORITY_VARIANT[priority];
  if (allkaCls) {
    return (
      <span className={`allka-badge allka-badge-${allkaCls}`}>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", pc.dot)} />
        {pc.label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border border-transparent",
        pc.bg,
        pc.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", pc.dot)} />
      {pc.label}
    </span>
  );
}

function AvatarBubble({
  name,
  colorClass,
}: {
  name: string;
  colorClass: string;
}) {
  return (
    <div
      className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white",
        colorClass,
      )}
    >
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: any;
  gradient: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-xl bg-linear-to-br text-white shadow-sm text-left px-3 pt-2 pb-1.5 transition-all duration-200 overflow-hidden w-full",
        gradient,
        active
          ? "ring-2 ring-white/60 ring-offset-1 ring-offset-slate-100 scale-[1.02] shadow-xl"
          : "hover:scale-[1.02] hover:shadow-xl",
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-white/70 leading-tight">
          {label}
        </p>
        <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
          <Icon className="h-3 w-3 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
    </button>
  );
}

// ─── Assign Nomade Dialog ─────────────────────────────────────────────────────

function AssignNomadeDialog({
  open,
  task,
  onClose,
  onAssigned,
}: {
  open: boolean;
  task: TarefaOperacional | null;
  onClose: () => void;
  onAssigned: (taskId: string, nomade: any) => void;
}) {
  const [nomades, setNomades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setSearch("");
      return;
    }
    setLoading(true);
    apiClient
      .getNomades({ status: "ativo", limit: "200" })
      .then((r: any) => setNomades(r?.data ?? []))
      .catch(() => setNomades([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return nomades;
    const q = search.toLowerCase();
    return nomades.filter(
      (n: any) =>
        n.name?.toLowerCase().includes(q) || n.email?.toLowerCase().includes(q),
    );
  }, [nomades, search]);

  const handleConfirm = async () => {
    if (!task || !selected) return;
    setSaving(true);
    try {
      await apiClient.updateProjectTask(task.id, {
        nomade_responsavel_id: selected,
      });
      onAssigned(
        task.id,
        nomades.find((n: any) => n.id === selected),
      );
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <UserSearch className="h-4 w-4 text-purple-600" />
            Atribuir n\u00f4made
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {task.title}
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 dark:border-border rounded-lg p-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                  Nenhum n\u00f4made ativo encontrado.
                </p>
              ) : (
                filtered.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => setSelected(n.id === selected ? null : n.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border",
                      selected === n.id
                        ? "bg-purple-50 border-purple-300"
                        : "hover:bg-slate-50 border-transparent",
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                        selected === n.id
                          ? "bg-purple-600 text-white"
                          : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {n.name?.[0]?.toUpperCase() ?? "N"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {n.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {n.email}
                      </p>
                    </div>
                    {n.performance_avg_rating > 0 && (
                      <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-amber-600 shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {n.performance_avg_rating.toFixed(1)}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="h-9 text-sm bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Confirmar atribui\u00e7\u00e3o
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminTarefasPage() {
  const [tarefas, setTarefas] = useState<TarefaOperacional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [search, setSearch] = useState("");
  const [appliedFilters, setAppliedFilters] =
    useState<FilterValues>(EMPTY_FILTERS);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const { sortKey, sortDir, handleSort, sortData } =
    useSorting<TarefaOperacional>();

  // Column config
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(DEFAULT_VISIBLE),
  );
  const [colConfigOpen, setColConfigOpen] = useState(false);

  // Column resize
  const [colWidths, setColWidths] = useState<number[]>(() =>
    ALL_COLUMNS.filter((c) => DEFAULT_VISIBLE.includes(c.key)).map(
      (c) => c.defaultW,
    ),
  );
  const dragState = useRef<{
    colIndex: number;
    startX: number;
    startWidth: number;
  } | null>(null);

  const visibleColumnsList = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));

  useEffect(() => {
    setColWidths(visibleColumnsList.map((c) => c.defaultW));
  }, [visibleCols.size]);

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      dragState.current = {
        colIndex,
        startX: e.clientX,
        startWidth: colWidths[colIndex],
      };
      const onMouseMove = (ev: MouseEvent) => {
        if (!dragState.current) return;
        const newW = Math.max(
          visibleColumnsList[dragState.current.colIndex].minW,
          dragState.current.startWidth + ev.clientX - dragState.current.startX,
        );
        setColWidths((prev) => {
          const n = [...prev];
          n[dragState.current!.colIndex] = newW;
          return n;
        });
      };
      const onMouseUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [colWidths, visibleColumnsList],
  );

  // Panels / dialogs
  const [selectedTarefa, setSelectedTarefa] =
    useState<TarefaOperacional | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [launchTask, setLaunchTask] = useState<TarefaOperacional | null>(null);
  const [launchDrawerOpen, setLaunchDrawerOpen] = useState(false);
  const [assignTask, setAssignTask] = useState<TarefaOperacional | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [projectData, setProjectData] = useState<any | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);

  const fetchTarefas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getOperationalTasks();
      setTarefas(res?.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTarefas();
  }, [fetchTarefas]);
  useEffect(() => {
    setCurrentPage(1);
  }, [search, appliedFilters, pageSize]);

  const handleOpenProject = useCallback(async (t: TarefaOperacional) => {
    try {
      const r = await apiClient.getProject(t.project_id);
      setProjectData(r ?? null);
    } catch {
      setProjectData({ ...t.project, id: t.project_id });
    }
    setProjectOpen(true);
  }, []);

  // ── Unique filter options ────────────────────────────────────────────────────

  const uniqueProjects = useMemo(() => {
    const m = new Map<string, string>();
    tarefas.forEach((t) => m.set(t.project_id, t.project.title));
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const uniqueEmpresas = useMemo(() => {
    const m = new Map<string, string>();
    tarefas.forEach((t) => {
      if (t.project.client) m.set(t.project.client.id, t.project.client.name);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const uniqueProducts = useMemo(
    () =>
      Array.from(
        new Set(tarefas.map((t) => t.project_product.product_name_snapshot)),
      ).sort(),
    [tarefas],
  );

  const uniqueNomades = useMemo(() => {
    const m = new Map<string, string>();
    tarefas.forEach((t) => {
      if (t.nomade_responsavel)
        m.set(t.nomade_responsavel.id, t.nomade_responsavel.name);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const uniqueAgencias = useMemo(() => {
    const m = new Map<string, string>();
    tarefas.forEach((t) => {
      if (t.responsavel_agencia)
        m.set(t.responsavel_agencia.id, t.responsavel_agencia.name);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const uniqueLideres = useMemo(
    () =>
      Array.from(
        new Set(
          tarefas.map((t) => t.project.consultant).filter(Boolean) as string[],
        ),
      ).sort(),
    [tarefas],
  );

  const uniqueCategorias = useMemo(
    () =>
      Array.from(
        new Set(
          tarefas
            .map((t) => t.project_product.product_category_snapshot)
            .filter(Boolean) as string[],
        ),
      ).sort(),
    [tarefas],
  );

  // ── Stats ────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    tarefas.forEach((t) => {
      const g = STATUS_CFG[t.status]?.group ?? "pendente";
      counts[g] = (counts[g] ?? 0) + 1;
    });
    return {
      total: tarefas.length,
      paraLancamento: tarefas.filter((t) => t.status === "PARA_LANCAMENTO")
        .length,
      emLancamento: tarefas.filter((t) => t.status === "EM_LANCAMENTO").length,
      emExecucao: tarefas.filter((t) => t.status === "EM_EXECUCAO").length,
      emAprovacao: tarefas.filter((t) =>
        ["EM_APROVACAO", "APROVACAO_PENDENTE_CLIENTE"].includes(t.status),
      ).length,
      atrasadas: tarefas.filter(isOverdue).length,
      concluidas: tarefas.filter((t) =>
        ["CONCLUIDA", "APROVADA"].includes(t.status),
      ).length,
      aguardandoNomade: tarefas.filter((t) => t.status === "AGUARDANDO_NOMADE")
        .length,
    };
  }, [tarefas]);

  // ── Filtered ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const f = appliedFilters;
    const now = Date.now();
    const IN_3_DAYS = 3 * 86400000;
    return tarefas.filter((t) => {
      // Live search (not gated by Apply button)
      if (search) {
        const q = search.toLowerCase();
        const match =
          t.title.toLowerCase().includes(q) ||
          t.project.title.toLowerCase().includes(q) ||
          (t.project.client?.name.toLowerCase().includes(q) ?? false) ||
          t.project_product.product_name_snapshot.toLowerCase().includes(q) ||
          (t.code_snapshot?.toLowerCase().includes(q) ?? false) ||
          (t.nomade_responsavel?.name.toLowerCase().includes(q) ?? false) ||
          (t.responsavel_agencia?.name.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      // Identification
      if (f.idQuery && !t.id.toLowerCase().includes(f.idQuery.toLowerCase()))
        return false;
      if (
        f.codeQuery &&
        !t.code_snapshot?.toLowerCase().includes(f.codeQuery.toLowerCase())
      )
        return false;
      if (
        f.nameQuery &&
        !t.title.toLowerCase().includes(f.nameQuery.toLowerCase())
      )
        return false;
      // Status / Group / Priority
      if (f.group !== "all" && STATUS_CFG[t.status]?.group !== f.group)
        return false;
      if (f.status !== "all" && t.status !== f.status) return false;
      if (f.priority !== "all" && t.priority !== f.priority) return false;
      // Relationships
      if (f.project !== "all" && t.project_id !== f.project) return false;
      if (f.empresa !== "all" && t.project.client?.id !== f.empresa)
        return false;
      if (
        f.product !== "all" &&
        t.project_product.product_name_snapshot !== f.product
      )
        return false;
      if (f.nomade !== "all" && t.nomade_responsavel?.id !== f.nomade)
        return false;
      if (f.agencia !== "all" && t.responsavel_agencia?.id !== f.agencia)
        return false;
      if (f.lider !== "all" && t.project.consultant !== f.lider) return false;
      if (
        f.categoria !== "all" &&
        t.project_product.product_category_snapshot !== f.categoria
      )
        return false;
      // nomadeQualificador — uses nomade_responsavel as proxy until backend adds a
      // dedicated qualificador_id field. Keeps filter count honest.
      if (
        f.nomadeQualificador !== "all" &&
        t.nomade_responsavel?.id !== f.nomadeQualificador
      )
        return false;
      // qualificacao — mapped to task statuses (placeholder until dedicated field)
      if (f.qualificacao !== "all") {
        if (
          f.qualificacao === "pendente" &&
          t.status !== "QUALIFICACAO_PENDENTE"
        )
          return false;
        if (
          f.qualificacao === "aprovada" &&
          !["APROVADA", "CONCLUIDA"].includes(t.status)
        )
          return false;
        if (
          f.qualificacao === "reprovada" &&
          !["REPROVADA", "NAO_SEGUIU_ORIENTACOES"].includes(t.status)
        )
          return false;
      }
      // Date ranges (compare ISO date prefix)
      if (
        f.startDateFrom &&
        t.start_date &&
        t.start_date.slice(0, 10) < f.startDateFrom
      )
        return false;
      if (
        f.startDateTo &&
        t.start_date &&
        t.start_date.slice(0, 10) > f.startDateTo
      )
        return false;
      if (
        f.dueDateFrom &&
        t.due_date &&
        t.due_date.slice(0, 10) < f.dueDateFrom
      )
        return false;
      if (f.dueDateTo && t.due_date && t.due_date.slice(0, 10) > f.dueDateTo)
        return false;
      if (
        f.execDateFrom &&
        t.data_inicio_execucao &&
        t.data_inicio_execucao.slice(0, 10) < f.execDateFrom
      )
        return false;
      if (
        f.execDateTo &&
        t.data_inicio_execucao &&
        t.data_inicio_execucao.slice(0, 10) > f.execDateTo
      )
        return false;
      if (f.createdFrom && t.created_at.slice(0, 10) < f.createdFrom)
        return false;
      if (f.createdTo && t.created_at.slice(0, 10) > f.createdTo) return false;
      if (
        f.completedFrom &&
        t.completed_at &&
        t.completed_at.slice(0, 10) < f.completedFrom
      )
        return false;
      if (
        f.completedTo &&
        t.completed_at &&
        t.completed_at.slice(0, 10) > f.completedTo
      )
        return false;
      // Alert flags
      if (f.overdue && !isOverdue(t)) return false;
      if (f.emergencial && t.priority !== "urgent") return false;
      if (f.desqualificada && t.status !== "NAO_SEGUIU_ORIENTACOES")
        return false;
      if (f.prestesVencerLancamento) {
        if (!t.data_lancamento) return false;
        const d = new Date(t.data_lancamento).getTime() - now;
        if (d < 0 || d > IN_3_DAYS) return false;
      }
      if (f.prestesVencerAprovacao) {
        if (
          !["EM_APROVACAO", "APROVACAO_PENDENTE_CLIENTE"].includes(t.status) ||
          !t.due_date
        )
          return false;
        const d = new Date(t.due_date).getTime() - now;
        if (d < 0 || d > IN_3_DAYS) return false;
      }
      if (f.prestesAtrasar) {
        if (!t.due_date) return false;
        const d = new Date(t.due_date).getTime() - now;
        if (d < 0 || d > IN_3_DAYS) return false;
      }
      if (f.execucaoAtrasada) {
        if (["CONCLUIDA", "CANCELADA", "APROVADA"].includes(t.status))
          return false;
        if (
          !t.data_inicio_execucao ||
          new Date(t.data_inicio_execucao) >= new Date()
        )
          return false;
      }
      if (f.aprovacaoAtrasada) {
        if (!["EM_APROVACAO", "APROVACAO_PENDENTE_CLIENTE"].includes(t.status))
          return false;
        if (!t.due_date || new Date(t.due_date) >= new Date()) return false;
      }
      if (f.qualificacaoAtrasada) {
        if (t.status !== "QUALIFICACAO_PENDENTE") return false;
        if (!t.due_date || new Date(t.due_date) >= new Date()) return false;
      }
      if (f.revisaoAtrasada) {
        if (!["EM_REVISAO", "MELHORIAS_FINAIS"].includes(t.status))
          return false;
        if (!t.due_date || new Date(t.due_date) >= new Date()) return false;
      }
      return true;
    });
  }, [tarefas, search, appliedFilters]);

  // sortData from useSorting needs a flat key; we create a flat projection for sorting
  const flatForSort = useCallback(
    (items: TarefaOperacional[]) => {
      if (!sortKey) return items;
      return [...items].sort((a, b) => {
        let av: any, bv: any;
        switch (sortKey) {
          case "code_snapshot":
            av = a.code_snapshot ?? "";
            bv = b.code_snapshot ?? "";
            break;
          case "title":
            av = a.title;
            bv = b.title;
            break;
          case "project_title":
            av = a.project.title;
            bv = b.project.title;
            break;
          case "client_name":
            av = a.project.client?.name ?? "";
            bv = b.project.client?.name ?? "";
            break;
          case "product_name":
            av = a.project_product.product_name_snapshot;
            bv = b.project_product.product_name_snapshot;
            break;
          case "status":
            av = a.status;
            bv = b.status;
            break;
          case "nomade_name":
            av = a.nomade_responsavel?.name ?? "";
            bv = b.nomade_responsavel?.name ?? "";
            break;
          case "agencia_name":
            av = a.responsavel_agencia?.name ?? "";
            bv = b.responsavel_agencia?.name ?? "";
            break;
          case "due_date":
            av = a.due_date ?? "";
            bv = b.due_date ?? "";
            break;
          case "start_date":
            av = a.start_date ?? "";
            bv = b.start_date ?? "";
            break;
          case "priority": {
            const o: Record<string, number> = {
              urgent: 0,
              high: 1,
              medium: 2,
              low: 3,
            };
            av = o[a.priority] ?? 99;
            bv = o[b.priority] ?? 99;
            break;
          }
          default:
            av = a.created_at;
            bv = b.created_at;
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    },
    [sortKey, sortDir],
  );

  const sorted = useMemo(() => {
    if (sortKey) return flatForSort(filtered);
    // default: atrasadas + urgentes primeiro
    return [...filtered].sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const po: Record<string, number> = {
        urgent: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return (po[a.priority] ?? 99) - (po[b.priority] ?? 99);
    });
  }, [filtered, sortKey, flatForSort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const p = currentPage;
    if (p <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (p >= totalPages - 3)
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "...", p - 1, p, p + 1, "...", totalPages];
  };

  const activeFilterCount = countActiveFilters(appliedFilters);
  const hasFilters = !!(search || activeFilterCount > 0);

  const clearFilters = () => {
    setSearch("");
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleStatusChange = useCallback(
    async (tarefa: TarefaOperacional, newStatus: TaskStatus) => {
      if (tarefa.status === newStatus) return;
      setUpdatingId(tarefa.id);
      try {
        await apiClient.updateProjectTask(tarefa.id, { status: newStatus });
        const now = new Date().toISOString();
        setTarefas((prev) =>
          prev.map((t) =>
            t.id === tarefa.id
              ? {
                  ...t,
                  status: newStatus,
                  completed_at: ["CONCLUIDA", "APROVADA"].includes(newStatus)
                    ? now
                    : t.completed_at,
                }
              : t,
          ),
        );
        if (selectedTarefa?.id === tarefa.id)
          setSelectedTarefa((p) => (p ? { ...p, status: newStatus } : p));
      } catch {
      } finally {
        setUpdatingId(null);
      }
    },
    [selectedTarefa],
  );

  const handleReleased = useCallback((taskId: string) => {
    setTarefas((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "LIBERADA_PARA_EXECUCAO" as TaskStatus }
          : t,
      ),
    );
    setLaunchDrawerOpen(false);
  }, []);

  const handleNomadeAssigned = useCallback((taskId: string, nomade: any) => {
    setTarefas((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              nomade_responsavel_id: nomade?.id ?? null,
              nomade_responsavel: nomade ?? null,
            }
          : t,
      ),
    );
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <PageLoader text="Carregando tarefas operacionais..." />;

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-105 gap-6 text-center px-6">
        <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Erro ao carregar tarefas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {error}
          </p>
        </div>
        <Button onClick={fetchTarefas} className="btn-brand">
          Tentar novamente
        </Button>
      </div>
    );

  return (
    <TooltipProvider>
      <div className="space-y-5 p-4 md:p-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tarefas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Acompanhe todas as tarefas operacionais da plataforma.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTarefas}
            disabled={loading}
            className="h-9 gap-2 shrink-0"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            Atualizar
          </Button>
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            {
              key: null,
              label: "Total",
              value: stats.total,
              grad: "from-slate-600 to-slate-800",
              icon: CheckSquare2,
            },
            {
              key: "PARA_LANCAMENTO",
              label: "Para lan\u00e7amento",
              value: stats.paraLancamento,
              grad: "from-indigo-500 to-indigo-700",
              icon: Clock,
            },
            {
              key: "EM_LANCAMENTO",
              label: "Em lan\u00e7amento",
              value: stats.emLancamento,
              grad: "from-violet-500 to-indigo-700",
              icon: SendHorizonal,
            },
            {
              key: "EM_EXECUCAO",
              label: "Em execu\u00e7\u00e3o",
              value: stats.emExecucao,
              grad: "from-blue-500 to-blue-700",
              icon: PlayCircle,
            },
            {
              key: "aprovacao",
              label: "Em aprova\u00e7\u00e3o",
              value: stats.emAprovacao,
              grad: "from-violet-500 to-purple-700",
              icon: CheckCircle2,
            },
            {
              key: "overdue",
              label: "Atrasadas",
              value: stats.atrasadas,
              grad: "from-red-500 to-rose-700",
              icon: AlertCircle,
            },
            {
              key: "concluido",
              label: "Conclu\u00eddas",
              value: stats.concluidas,
              grad: "from-emerald-500 to-emerald-700",
              icon: ThumbsUp,
            },
            {
              key: "AGUARDANDO_NOMADE",
              label: "Aguard. n\u00f4made",
              value: stats.aguardandoNomade,
              grad: "from-purple-500 to-purple-700",
              icon: UserSearch,
            },
          ].map((c) => {
            const isActive =
              c.key === null
                ? !hasFilters
                : c.key === "overdue"
                  ? appliedFilters.overdue
                  : c.key === "aprovacao"
                    ? appliedFilters.group === "aprovacao"
                    : c.key === "concluido"
                      ? appliedFilters.group === "concluido"
                      : appliedFilters.status === c.key;
            return (
              <StatCard
                key={c.label}
                label={c.label}
                value={c.value}
                icon={c.icon}
                gradient={c.grad}
                active={isActive}
                onClick={() => {
                  setSearch("");
                  if (c.key === null) {
                    setAppliedFilters(EMPTY_FILTERS);
                    return;
                  }
                  if (c.key === "overdue")
                    setAppliedFilters({ ...EMPTY_FILTERS, overdue: true });
                  else if (c.key === "aprovacao")
                    setAppliedFilters({ ...EMPTY_FILTERS, group: "aprovacao" });
                  else if (c.key === "concluido")
                    setAppliedFilters({ ...EMPTY_FILTERS, group: "concluido" });
                  else setAppliedFilters({ ...EMPTY_FILTERS, status: c.key });
                }}
              />
            );
          })}
        </div>

        {/* ── Main Card ──────────────────────────────────────────── */}
        <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30">
            {/* Search */}
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Buscar tarefa, projeto, cliente, n\u00f4made..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Items per page + count */}
            <div className="flex items-center gap-2 shrink-0">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(v) => setPageSize(Number(v))}
                variant="top"
              />
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {(() => {
                  const start = Math.min(
                    (currentPage - 1) * pageSize + 1,
                    sorted.length,
                  );
                  const end = Math.min(currentPage * pageSize, sorted.length);
                  const total = sorted.length;
                  if (total === 0)
                    return <span className="text-slate-400">0 tarefas</span>;
                  return (
                    <>
                      Mostrando{" "}
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {start}\u2013{end}
                      </span>{" "}
                      de{" "}
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {total}
                      </span>{" "}
                      tarefa{total !== 1 ? "s" : ""}
                    </>
                  );
                })()}
              </span>
            </div>

            {/* Filter button — opens full drawer */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterDrawerOpen(true)}
              className={cn(
                "h-9 gap-2 px-3.5 text-xs border-slate-200 dark:border-slate-700 shrink-0",
                hasFilters &&
                  "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700",
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Column config */}
            <Popover open={colConfigOpen} onOpenChange={setColConfigOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-md border transition-colors shrink-0",
                    colConfigOpen
                      ? "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700"
                      : "text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                  title="Configurar colunas"
                >
                  <Cog className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-65 p-0">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Colunas vis\u00edveis
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Selecione quais colunas exibir
                  </p>
                </div>
                <div className="p-2 space-y-0.5 max-h-75 overflow-y-auto">
                  {ALL_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                        visibleCols.has(col.key)
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800",
                        col.required && "opacity-60 pointer-events-none",
                      )}
                    >
                      <Checkbox
                        checked={visibleCols.has(col.key)}
                        onCheckedChange={() => {
                          if (col.required) return;
                          setVisibleCols((prev) => {
                            const n = new Set(prev);
                            n.has(col.key) ? n.delete(col.key) : n.add(col.key);
                            return n;
                          });
                        }}
                        disabled={col.required}
                        className="h-4 w-4"
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {col.label}
                      </span>
                      {col.required && (
                        <span className="text-[9px] text-slate-400 ml-auto">
                          obrigat\u00f3ria
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setVisibleCols(new Set(ALL_COLUMNS.map((c) => c.key)))
                    }
                    className="text-[10px] font-medium text-blue-500 hover:text-blue-700"
                  >
                    Mostrar todas
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {visibleCols.size} de {ALL_COLUMNS.length}
                  </span>
                </div>
              </PopoverContent>
            </Popover>

            {/* Pagination */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {getPageNumbers().map((pg, i) =>
                pg === "..." ? (
                  <span key={i} className="text-xs text-slate-300 px-0.5">
                    \u00b7
                  </span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(Number(pg))}
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      pg === currentPage
                        ? "btn-brand text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {pg}
                  </button>
                ),
              )}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Empty state */}
          {tarefas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <CheckSquare2 className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nenhuma tarefa operacional
                </h2>
                <p className="text-sm text-slate-400 max-w-sm">
                  Tarefas s\u00e3o geradas automaticamente quando produtos
                  s\u00e3o vinculados a projetos.
                </p>
              </div>
            </div>
          )}

          {/* No filter results */}
          {tarefas.length > 0 && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Filter className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Nenhuma tarefa com os filtros aplicados.
              </p>
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 dark:text-blue-400 underline hover:no-underline"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {/* Table */}
          {sorted.length > 0 && (
            <div className="overflow-auto allka-table-scroll" style={{ maxHeight: "calc(100vh - 18rem)" }}>
              <table
                className="text-sm"
                style={{
                  tableLayout: "fixed",
                  width: "100%",
                  minWidth: colWidths.reduce((a, b) => a + b, 0),
                }}
              >
                <colgroup>
                  {colWidths.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    {visibleColumnsList.map((col, i) => {
                      const sortField = {
                        codigo: "code_snapshot",
                        tarefa: "title",
                        projeto: "project_title",
                        cliente: "client_name",
                        produto: "product_name",
                        status: "status",
                        nomade: "nomade_name",
                        agencia: "agencia_name",
                        prazo: "due_date",
                        execucao: "start_date",
                        prioridade: "priority",
                      }[col.key];
                      const isLast = col.key === "acoes";
                      return (
                        <th
                          key={col.key}
                          className="py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none relative"
                          style={{
                            paddingLeft: 20,
                            paddingRight: 20,
                            textAlign: isLast ? "right" : "left",
                            borderRight: !isLast
                              ? "1px solid rgba(148,163,184,0.2)"
                              : undefined,
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                            background: "var(--table-head)",
                            boxShadow: "0 1px 0 rgba(148,163,184,0.3)",
                          }}
                        >
                          {sortField ? (
                            <SortableHeader
                              label={col.label}
                              field={sortField}
                              sortKey={sortKey as string | null}
                              sortDir={sortDir}
                              onSort={(f, d) => handleSort(f as any, d)}
                            />
                          ) : (
                            <span className={isLast ? "flex justify-end" : ""}>
                              {col.label}
                            </span>
                          )}
                          {i < colWidths.length - 1 && (
                            <div
                              onMouseDown={(e) => onResizeMouseDown(e, i)}
                              className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 cursor-col-resize hover:bg-blue-400 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                              style={{
                                transform: "translateX(50%) translateY(-50%)",
                                zIndex: 10,
                              }}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tarefa, rowIdx) => {
                    const overdue = isOverdue(tarefa);
                    const sc =
                      STATUS_CFG[tarefa.status] ?? STATUS_CFG.PARA_LANCAMENTO;
                    const updating = updatingId === tarefa.id;
                    const canLaunch = [
                      "PARA_LANCAMENTO",
                      "EM_LANCAMENTO",
                      "AGUARDANDO_INFORMACOES",
                      "AGUARDANDO_ETAPA",
                    ].includes(tarefa.status);
                    const dias = daysUntil(tarefa.due_date);

                    return (
                      <tr
                        key={tarefa.id}
                        className={cn(
                          "border-b border-slate-100 dark:border-slate-700/50 transition-colors group",
                          rowIdx % 2 === 0
                            ? "bg-[var(--table-row)] hover:bg-[var(--table-row-hover)]"
                            : "bg-[var(--table-row-alt)] hover:bg-[var(--table-row-hover)]",
                          overdue && "bg-red-50/50 dark:bg-red-950/10",
                        )}
                      >
                        {/* A\u00e7\u00f5es */}
                        {visibleCols.has("acoes") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            <div className="flex items-center justify-end gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setSelectedTarefa(tarefa);
                                      setDrawerOpen(true);
                                    }}
                                    className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Ver detalhes
                                </TooltipContent>
                              </Tooltip>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-52"
                                >
                                  <DropdownMenuItem
                                    className="text-xs gap-2"
                                    onClick={() => {
                                      setSelectedTarefa(tarefa);
                                      setDrawerOpen(true);
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {canLaunch && (
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      onClick={() => {
                                        setLaunchTask(tarefa);
                                        setLaunchDrawerOpen(true);
                                      }}
                                    >
                                      <Rocket className="h-3.5 w-3.5 text-indigo-600" />
                                      Lan\u00e7ar tarefa
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-xs gap-2"
                                    onClick={() => {
                                      setAssignTask(tarefa);
                                      setAssignOpen(true);
                                    }}
                                  >
                                    <UserSearch className="h-3.5 w-3.5 text-purple-600" />
                                    Atribuir n\u00f4made
                                  </DropdownMenuItem>
                                  {tarefa.status !== "PAUSADA" && (
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      onClick={() =>
                                        handleStatusChange(tarefa, "PAUSADA")
                                      }
                                    >
                                      <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                                      Pausar tarefa
                                    </DropdownMenuItem>
                                  )}
                                  {tarefa.status === "PAUSADA" && (
                                    <DropdownMenuItem
                                      className="text-xs gap-2"
                                      onClick={() =>
                                        handleStatusChange(
                                          tarefa,
                                          "EM_EXECUCAO",
                                        )
                                      }
                                    >
                                      <PlayCircle className="h-3.5 w-3.5 text-blue-600" />
                                      Retomar tarefa
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-xs gap-2"
                                    onClick={() =>
                                      handleStatusChange(
                                        tarefa,
                                        "PARA_LANCAMENTO",
                                      )
                                    }
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                    Devolver tarefa
                                  </DropdownMenuItem>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="text-xs gap-2">
                                      <CheckSquare2 className="h-3.5 w-3.5 text-blue-500" />
                                      Alterar status
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="w-52 max-h-72 overflow-y-auto">
                                      {ALL_STATUSES.filter(
                                        (s) => s !== tarefa.status,
                                      ).map((s) => {
                                        const c = STATUS_CFG[s];
                                        const Icon = c.icon;
                                        return (
                                          <DropdownMenuItem
                                            key={s}
                                            className="text-xs gap-2"
                                            onClick={() =>
                                              handleStatusChange(tarefa, s)
                                            }
                                          >
                                            <Icon
                                              className={cn(
                                                "h-3.5 w-3.5",
                                                c.color,
                                              )}
                                            />
                                            {c.label}
                                          </DropdownMenuItem>
                                        );
                                      })}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs gap-2"
                                    onClick={() => handleOpenProject(tarefa)}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                    Abrir projeto
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        )}

                        {/* ID */}
                        {visibleCols.has("id") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            <span className="text-[11px] font-mono text-slate-400">
                              #{tarefa.id.slice(-6)}
                            </span>
                          </td>
                        )}

                        {/* Código */}
                        {visibleCols.has("codigo") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {(tarefa.task_code || tarefa.code_snapshot) ? (
                              <span className="text-[11px] font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-1.5 py-0.5 rounded">
                                {tarefa.task_code ?? tarefa.code_snapshot}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                —
                              </span>
                            )}
                          </td>
                        )}

                        {/* Tarefa */}
                        {visibleCols.has("tarefa") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            <button
                              className="text-left w-full"
                              onClick={() => {
                                setSelectedTarefa(tarefa);
                                setDrawerOpen(true);
                              }}
                            >
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors leading-snug">
                                {tarefa.title}
                              </p>
                              {tarefa.fase && (
                                <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                  {tarefa.fase}
                                </span>
                              )}
                            </button>
                          </td>
                        )}

                        {/* Projeto */}
                        {visibleCols.has("projeto") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <FolderOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                {tarefa.project.title}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Cliente */}
                        {visibleCols.has("cliente") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {tarefa.project.client ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                  {tarefa.project.client.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                \u2014
                              </span>
                            )}
                          </td>
                        )}

                        {/* Ag\u00eancia */}
                        {visibleCols.has("agencia") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {tarefa.responsavel_agencia ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <AvatarBubble
                                  name={tarefa.responsavel_agencia.name}
                                  colorClass="bg-blue-500"
                                />
                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                  {tarefa.responsavel_agencia.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                \u2014
                              </span>
                            )}
                          </td>
                        )}

                        {/* Produto */}
                        {visibleCols.has("produto") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Package className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                                {tarefa.project_product.product_name_snapshot}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Status */}
                        {visibleCols.has("status") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            <StatusBadge status={tarefa.status} />
                          </td>
                        )}

                        {/* N\u00f4made */}
                        {visibleCols.has("nomade") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {tarefa.nomade_responsavel ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <AvatarBubble
                                  name={tarefa.nomade_responsavel.name}
                                  colorClass="bg-purple-500"
                                />
                                <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                  {tarefa.nomade_responsavel.name}
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setAssignTask(tarefa);
                                  setAssignOpen(true);
                                }}
                                className="text-[11px] text-slate-400 hover:text-purple-600 underline underline-offset-2 transition-colors"
                              >
                                Atribuir
                              </button>
                            )}
                          </td>
                        )}

                        {/* L\u00edder */}
                        {visibleCols.has("lider") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {tarefa.project.consultant ? (
                              <span className="text-xs text-slate-600 dark:text-slate-400 truncate block">
                                {tarefa.project.consultant}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                \u2014
                              </span>
                            )}
                          </td>
                        )}

                        {/* Prazo entrega */}
                        {visibleCols.has("prazo") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {tarefa.due_date ? (
                              <div>
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    overdue
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-slate-600 dark:text-slate-400",
                                  )}
                                >
                                  {fmtDate(tarefa.due_date, true)}
                                </span>
                                {dias !== null && (
                                  <p
                                    className={cn(
                                      "text-[10px] mt-0.5 leading-none",
                                      overdue
                                        ? "text-red-500"
                                        : dias <= 3
                                          ? "text-amber-500"
                                          : "text-slate-400",
                                    )}
                                  >
                                    {dias < 0
                                      ? `${Math.abs(dias)}d atraso`
                                      : dias === 0
                                        ? "hoje"
                                        : `${dias}d`}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                \u2014
                              </span>
                            )}
                          </td>
                        )}

                        {/* Prazo execu\u00e7\u00e3o */}
                        {visibleCols.has("execucao") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {tarefa.start_date ? (
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {fmtDate(tarefa.start_date, true)}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                \u2014
                              </span>
                            )}
                          </td>
                        )}

                        {/* Atraso */}
                        {visibleCols.has("atraso") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            {overdue && dias !== null ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                                <AlertCircle className="h-3 w-3" />
                                {Math.abs(dias)}d
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                \u2014
                              </span>
                            )}
                          </td>
                        )}

                        {/* Prioridade */}
                        {visibleCols.has("prioridade") && (
                          <td
                            className="px-5 py-3.5"
                            style={{ borderRight: "1px solid rgba(148,163,184,0.15)", overflow: "hidden" }}
                          >
                            <PriorityBadge
                              priority={tarefa.priority as Priority}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom pagination */}
          {sorted.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/70 dark:border-slate-700/60 bg-slate-50/40 dark:bg-slate-900/20">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {(() => {
                  const start = Math.min(
                    (currentPage - 1) * pageSize + 1,
                    sorted.length,
                  );
                  const end = Math.min(currentPage * pageSize, sorted.length);
                  return (
                    <>
                      Mostrando{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {start}
                      </span>{" "}
                      at\u00e9{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {end}
                      </span>{" "}
                      de{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {sorted.length}
                      </span>{" "}
                      registros
                    </>
                  );
                })()}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-7 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Primeiro
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {getPageNumbers().map((pg, i) =>
                  pg === "..." ? (
                    <span key={i} className="text-xs text-slate-300 px-0.5">
                      \u00b7\u00b7\u00b7
                    </span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(Number(pg))}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        pg === currentPage
                          ? "btn-brand text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400",
                      )}
                    >
                      {pg}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  \u00daltimo
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Advanced Filters Drawer */}
      <TarefasFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        initialFilters={appliedFilters}
        onApply={setAppliedFilters}
        uniqueProjects={uniqueProjects}
        uniqueEmpresas={uniqueEmpresas}
        uniqueProducts={uniqueProducts}
        uniqueNomades={uniqueNomades}
        uniqueAgencias={uniqueAgencias}
        uniqueLideres={uniqueLideres}
        uniqueCategorias={uniqueCategorias}
      />

      {/* Detail Drawer */}
      <TarefaDetailDrawer
        tarefa={selectedTarefa}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        updatingId={updatingId}
      />

      {/* Launch Drawer */}
      {launchTask && (
        <TaskLaunchDrawer
          task={launchTask}
          onClose={() => setLaunchDrawerOpen(false)}
          onReleased={handleReleased}
          onTaskUpdated={(updated) =>
            setTarefas((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
            )
          }
        />
      )}

      {/* Assign Nomade */}
      <AssignNomadeDialog
        open={assignOpen}
        task={assignTask}
        onClose={() => {
          setAssignOpen(false);
          setAssignTask(null);
        }}
        onAssigned={handleNomadeAssigned}
      />

      {/* Project Panel */}
      <ProjectViewSlidePanel
        open={projectOpen}
        project={projectData}
        onClose={() => {
          setProjectOpen(false);
          setProjectData(null);
        }}
      />
    </TooltipProvider>
  );
}
