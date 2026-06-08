// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { TaskLaunchDrawer } from "@/components/task-launch-drawer";
import { cn } from "@/lib/utils";
import {
  X,
  Edit,
  Copy,
  FileText,
  Ban,
  AlertTriangle,
  FolderOpen,
  Building2,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Lock,
  BarChart3,
  Percent,
  DollarSign,
  CheckCircle2,
  User,
  Mail,
  Link2,
  Activity,
  Briefcase,
  Package,
  Plus,
  Loader2,
  Trash2,
  Eye,
  PlayCircle,
  MessageSquare,
  XCircle,
  Search,
  AlertCircle,
  RefreshCw,
  ListChecks,
  Paperclip,
  History,
  Rocket,
  SendHorizonal,
  MoreHorizontal,
  ArrowRight,
  UserSearch,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectViewSlidePanelProps {
  open: boolean;
  project: any | null;
  onClose: () => void;
  onEdit: () => void;
  onClone: () => void;
  onExport: () => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDENTE: {
    label: "Pendente",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  EM_EXECUCAO: {
    label: "Contratado/Pago",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
  },
  CONCLUIDO: {
    label: "Concluído",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  CANCELADO: {
    label: "Cancelado",
    cls: "bg-red-100 text-red-700 border-red-200",
  },
};

const TASK_STATUS_CFG: Record<
  string,
  { label: string; cls: string; icon: any }
> = {
  PARA_LANCAMENTO: {
    label: "Para lançamento",
    cls: "bg-slate-100 text-slate-600 border-slate-300",
    icon: Clock,
  },
  EM_LANCAMENTO: {
    label: "Em lançamento",
    cls: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: SendHorizonal,
  },
  AGUARDANDO_INFORMACOES: {
    label: "Ag. Informações",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
    icon: MessageSquare,
  },
  LIBERADA_PARA_EXECUCAO: {
    label: "Liberada p/ Exec.",
    cls: "bg-cyan-100 text-cyan-700 border-cyan-200",
    icon: ArrowRight,
  },
  EM_EXECUCAO: {
    label: "Em execução",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    icon: PlayCircle,
  },
  EM_REVISAO: {
    label: "Em revisão",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Eye,
  },
  EM_APROVACAO: {
    label: "Em aprovação",
    cls: "bg-violet-100 text-violet-700 border-violet-200",
    icon: CheckCircle2,
  },
  CONCLUIDA: {
    label: "Concluída",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  CANCELADA: {
    label: "Cancelada",
    cls: "bg-red-100 text-red-600 border-red-200",
    icon: XCircle,
  },
  AGUARDANDO_NOMADE: {
    label: "Ag. Nômade",
    cls: "bg-purple-100 text-purple-700 border-purple-200",
    icon: UserSearch,
  },
};

const PRIORITY_CFG: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  low: { label: "Baixa", dot: "bg-slate-400", text: "text-slate-500" },
  medium: { label: "Média", dot: "bg-blue-400", text: "text-blue-600" },
  high: { label: "Alta", dot: "bg-amber-400", text: "text-amber-600" },
  urgent: { label: "Urgente", dot: "bg-red-500", text: "text-red-600" },
};

const ALL_TASK_STATUSES = Object.keys(TASK_STATUS_CFG);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return (
    v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "—"
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isTaskOverdue(task: any) {
  if (!task.due_date) return false;
  if (task.status === "CONCLUIDA" || task.status === "CANCELADA") return false;
  return new Date(task.due_date) < new Date();
}

/** Returns days until lancamento_expires_at, or null if field absent. Negative = already expired. */
function getLancamentoDaysLeft(task: any): number | null {
  if (!task.lancamento_expires_at) return null;
  const diff = new Date(task.lancamento_expires_at).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Badge showing expiry countdown for PARA_LANCAMENTO tasks */
function LancamentoExpiryBadge({ task }: { task: any }) {
  if (task.status !== "PARA_LANCAMENTO") return null;
  const days = getLancamentoDaysLeft(task);
  if (days === null) return null;
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
        Prazo expirado
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        Expira em {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
      Lançar em até {days}d
    </span>
  );
}


function getProjectStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativo", cls: "bg-emerald-500 text-white" },
    "in-progress": { label: "Em Andamento", cls: "bg-blue-500 text-white" },
    "awaiting-payment": {
      label: "Aguardando Pgto",
      cls: "bg-amber-400 text-amber-900",
    },
    paused: { label: "Pausado", cls: "bg-slate-400 text-white" },
    cancelled: { label: "Cancelado", cls: "bg-red-500 text-white" },
    completed: { label: "Concluído", cls: "bg-teal-500 text-white" },
    planning: { label: "Planejamento", cls: "bg-violet-500 text-white" },
    overdue: { label: "Atrasado", cls: "bg-red-400 text-white" },
  };
  const entry = map[status] ?? {
    label: status,
    cls: "bg-slate-300 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

function InfoCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: any;
  mono?: boolean;
}) {
  return (
    <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

// ─── ProductStatusBadge ───────────────────────────────────────────────────────

function ProductStatusBadge({
  status,
  projectStatus,
}: {
  status: string;
  projectStatus?: string;
}) {
  const cfg =
    status === "PENDENTE" && projectStatus === "awaiting-payment"
      ? {
          label: "Aguardando pagamento",
          cls: "bg-amber-100 text-amber-800 border-amber-200",
        }
      : PRODUCT_STATUS_CFG[status] ?? PRODUCT_STATUS_CFG.PENDENTE;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border",
        cfg.cls,
      )}
    >
      {cfg.label}
    </span>
  );
}

// ─── TaskStatusBadge ──────────────────────────────────────────────────────────

function TaskStatusBadge({ status }: { status: string }) {
  const cfg = TASK_STATUS_CFG[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Clock,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap",
        cfg.cls,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── PriorityDot ─────────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: string }) {
  const cfg = PRIORITY_CFG[priority] ?? PRIORITY_CFG.medium;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 cursor-default">
          <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
          <span className={cn("text-xs", cfg.text)}>{cfg.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>Prioridade: {cfg.label}</TooltipContent>
    </Tooltip>
  );
}

// ─── TaskDetailDrawer ─────────────────────────────────────────────────────────

const STAGE_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDENTE:    { label: "Pendente",    cls: "bg-slate-100 text-slate-600 border-slate-300" },
  EM_ANDAMENTO:{ label: "Em andamento",cls: "bg-blue-100 text-blue-700 border-blue-200" },
  CONCLUIDA:   { label: "Concluída",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  BLOQUEADA:   { label: "Bloqueada",  cls: "bg-red-100 text-red-600 border-red-200" },
};

function TaskDetailDrawer({
  task,
  onClose,
  onLaunch,
}: {
  task: any;
  onClose: () => void;
  onLaunch?: (task: any) => void;
}) {
  const pc = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium;
  const overdue = isTaskOverdue(task);
  const [stages, setStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  useEffect(() => {
    setLoadingStages(true);
    apiClient
      .getProjectTaskStages(task.id)
      .then((r: any) => setStages(Array.isArray(r) ? r : (r?.data ?? [])))
      .catch(() => setStages([]))
      .finally(() => setLoadingStages(false));
  }, [task.id]);

  function parseJson(data: any): any[] {
    if (!data) return [];
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function parseStringArray(data: any): string[] {
    return parseJson(data).map((i: any) =>
      typeof i === "string"
        ? i
        : i?.title || i?.item || i?.question || i?.label || JSON.stringify(i),
    );
  }
  function parseBriefingQuestions(data: any): Array<{ key: string; text: string; type?: string }> {
    return parseJson(data).map((i: any, idx: number) =>
      typeof i === "string"
        ? { key: `q${idx}`, text: i }
        : { key: i?.key || i?.id || `q${idx}`, text: i?.question || i?.text || i?.label || JSON.stringify(i), type: i?.type },
    );
  }

  const briefingQuestions = parseBriefingQuestions(task.briefing_snapshot);
  const checklist = parseStringArray(task.checklist_snapshot);

  const proj = task.project;
  const client = proj?.client;

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-[92vw] max-w-2xl flex flex-col p-0 overflow-hidden gap-0"
      >
        {/* ── Header ── */}
        <SheetHeader className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              {task.code_snapshot && (
                <span className="inline-flex items-center text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded mb-1">
                  {task.code_snapshot}
                </span>
              )}
              <SheetTitle className="text-base font-bold text-slate-800 leading-snug">
                {task.title}
              </SheetTitle>
              {task.project_product?.product_name_snapshot && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Package className="h-3 w-3 shrink-0" />
                  {task.project_product.product_name_snapshot}
                  {task.project_product.product_code_snapshot && (
                    <span className="text-[10px] font-mono text-slate-400">
                      ({task.project_product.product_code_snapshot})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          {/* Status + Priority row */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <TaskStatusBadge status={task.status} />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-white",
                pc.text,
                "border-slate-200",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", pc.dot)} />
              {pc.label}
            </span>
            {task.fase && (
              <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                {task.fase}
              </span>
            )}
            {overdue && (
              <span className="text-[11px] bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full font-semibold">
                Atrasada
              </span>
            )}
            <LancamentoExpiryBadge task={task} />
          </div>
        </SheetHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="px-6 py-5 space-y-6">

            {/* Projeto + Cliente */}
            {(proj || client) && (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {proj && (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Projeto</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{proj.title}</p>
                    </div>
                    {proj.status && getProjectStatusBadge(proj.status)}
                  </div>
                )}
                {client && (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Cliente</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{client.name}</p>
                      {client.cnpj && (
                        <p className="text-[10px] text-slate-400 font-mono">{client.cnpj}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Datas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Prazo", value: fmtDate(task.due_date), cls: overdue ? "text-red-600 font-bold" : "text-slate-800" },
                { label: "Início", value: fmtDate(task.start_date), cls: "text-slate-800" },
                { label: "Lançamento", value: fmtDate(task.data_lancamento), cls: "text-slate-800" },
                { label: "Conclusão", value: fmtDate(task.completed_at), cls: "text-emerald-700" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                  <p className={cn("text-sm font-semibold", cls)}>{value}</p>
                </div>
              ))}
            </div>

            {/* Responsáveis */}
            {(task.responsavel_agencia || task.nomade_responsavel) && (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {task.responsavel_agencia && (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Responsável Agência</p>
                      <p className="text-sm font-semibold text-slate-800">{task.responsavel_agencia.name}</p>
                      {task.responsavel_agencia.email && (
                        <p className="text-[10px] text-slate-400">{task.responsavel_agencia.email}</p>
                      )}
                    </div>
                  </div>
                )}
                {task.nomade_responsavel && (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <UserSearch className="h-4 w-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Nômade</p>
                      <p className="text-sm font-semibold text-slate-800">{task.nomade_responsavel.name}</p>
                      {task.nomade_responsavel.email && (
                        <p className="text-[10px] text-slate-400">{task.nomade_responsavel.email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Descrição */}
            {task.description && (
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Descrição</p>
                <p className="text-sm text-slate-600 leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Etapas operacionais */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">Etapas</p>
                </div>
                {loadingStages && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                {!loadingStages && stages.length > 0 && (
                  <span className="text-[11px] text-slate-400">{stages.filter((s) => s.status === "CONCLUIDA").length}/{stages.length} concluídas</span>
                )}
              </div>
              {loadingStages ? (
                <div className="px-4 py-6 flex items-center justify-center text-slate-400 gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando etapas...
                </div>
              ) : stages.length === 0 ? (
                <div className="px-4 py-5 text-center text-slate-400 text-sm">
                  Nenhuma etapa registrada para esta tarefa.
                </div>
              ) : (
                <ol className="divide-y divide-slate-100">
                  {stages.map((stage: any, idx: number) => {
                    const stageCfg = STAGE_STATUS_CFG[stage.status] ?? STAGE_STATUS_CFG.PENDENTE;
                    const stageChecklist = parseStringArray(stage.checklist_snapshot);
                    return (
                      <li key={stage.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800">{stage.titulo}</p>
                              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", stageCfg.cls)}>
                                {stageCfg.label}
                              </span>
                              {stage.obrigatoria && (
                                <span className="text-[10px] text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
                                  obrigatória
                                </span>
                              )}
                            </div>
                            {stage.descricao && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{stage.descricao}</p>
                            )}
                            {stageChecklist.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {stageChecklist.map((item: string, i: number) => (
                                  <li key={i} className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="h-3.5 w-3.5 rounded border border-slate-300 shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Briefing */}
            {briefingQuestions.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">Briefing ({briefingQuestions.length})</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {briefingQuestions.map((q, i) => (
                    <li key={q.key} className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500 mb-0.5">Pergunta {i + 1}</p>
                      <p className="text-sm text-slate-700">{q.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Checklist */}
            {checklist.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">Checklist ({checklist.length})</p>
                </div>
                <ul className="divide-y divide-slate-100">
                  {checklist.map((item, i) => (
                    <li key={i} className="px-4 py-3 flex items-center gap-2.5">
                      <span className="h-4 w-4 rounded border border-slate-300 shrink-0" />
                      <span className="text-sm text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Observações */}
            {task.observations && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Observações</p>
                <p className="text-sm text-slate-700 leading-relaxed">{task.observations}</p>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer actions ── */}
        {onLaunch && task.status === "PARA_LANCAMENTO" && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9">
              Fechar
            </Button>
            {(() => {
              const days = getLancamentoDaysLeft(task);
              const expired = days !== null && days <= 0;
              return (
                <Button
                  size="sm"
                  className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={expired}
                  title={expired ? "Prazo de lançamento expirado" : undefined}
                  onClick={() => { onClose(); onLaunch(task); }}
                >
                  <Rocket className="h-4 w-4" />
                  {expired ? "Prazo expirado" : "Lançar tarefa"}
                </Button>
              );
            })()}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── ProductLinkModal ─────────────────────────────────────────────────────────

function ProductLinkModal({
  projectId,
  linkedProductIds,
  onLinked,
  onClose,
}: {
  projectId: string;
  linkedProductIds: string[];
  onLinked: () => void;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient
      .getProducts({ limit: 200 })
      .then((r: any) => setProducts(r?.data ?? r ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    if (linkedProductIds.includes(p.id)) return false;
    if (!search) return true;
    return (
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
    );
  });

  async function handleLink() {
    if (!selected) return;
    setLinking(true);
    setLinkError(null);
    try {
      await apiClient.linkProductToProject({
        project_id: String(projectId),
        product_id: selected.id,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        expected_end_date: endDate
          ? new Date(endDate).toISOString()
          : undefined,
      });
      onLinked();
    } catch (e: any) {
      setLinkError(e?.message || "Erro ao vincular produto. Tente novamente.");
    } finally {
      setLinking(false);
    }
  }

  const taskCount =
    selected?._count?.task_links ?? selected?.task_links?.length ?? 0;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Vincular Produto ao Projeto
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando produtos...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  {search
                    ? "Nenhum produto encontrado"
                    : "Nenhum produto disponível para vincular"}
                </p>
                {search && (
                  <p className="text-xs mt-1">
                    {products.filter((p) => linkedProductIds.includes(p.id))
                      .length > 0
                      ? `${products.filter((p) => linkedProductIds.includes(p.id)).length} produto(s) já vinculado(s)`
                      : ""}
                  </p>
                )}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-slate-400">{p.category}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-slate-700">
                        {(p.base_price ?? 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                      {(p._count?.task_links ?? 0) > 0 && (
                        <p className="text-[10px] text-blue-500 mt-0.5">
                          {p._count.task_links} tarefa
                          {p._count.task_links !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected product summary */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
              <div className="h-8 w-8 rounded-lg bg-blue-200 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  {selected.name}
                </p>
                <p className="text-xs text-slate-500">{selected.category}</p>
              </div>
              <button
                onClick={() => {
                  setSelected(null);
                  setLinkError(null);
                }}
                className="text-slate-400 hover:text-slate-600 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Task generation preview */}
            {taskCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                <span className="font-semibold">
                  {taskCount} tarefa{taskCount !== 1 ? "s" : ""}
                </span>{" "}
                ser{taskCount !== 1 ? "ão" : "á"} gerada
                {taskCount !== 1 ? "s" : ""} automaticamente a partir dos
                modelos vinculados a este produto.
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-500">
                Este produto não tem modelos de tarefas vinculados. Nenhuma
                tarefa será gerada automaticamente.
              </div>
            )}

            {/* Optional dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data de início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo previsto</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {linkError && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg p-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {linkError}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={linking}>
            Cancelar
          </Button>
          {selected && (
            <Button
              onClick={handleLink}
              disabled={linking}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {linking && <Loader2 className="h-4 w-4 animate-spin" />}
              Vincular Produto
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ProjectViewSlidePanel({
  open,
  project,
  onClose,
  onEdit,
  onClone,
  onExport,
  onCancel,
}: ProjectViewSlidePanelProps) {
  const { sidebarWidth } = useSidebar();
  const [activeTab, setActiveTab] = useState("visao-geral");

  // ── Products state ────────────────────────────────────────────────────────
  const [projectProducts, setProjectProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<any>(null);
  const [unlinking, setUnlinking] = useState(false);

  // ── Tasks state ───────────────────────────────────────────────────────────
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [launchingTaskId, setLaunchingTaskId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskFilterStatus, setTaskFilterStatus] = useState("all");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [launchDrawerOpen, setLaunchDrawerOpen] = useState(false);
  const [launchDrawerTask, setLaunchDrawerTask] = useState<any>(null);
  const repairedDraftRef = useRef<string | null>(null);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (!project?.id) return;
    setLoadingProducts(true);
    try {
      const res = await apiClient.getProjectProducts({
        project_id: String(project.id),
      });
      const data = res?.data ?? [];
      if (Array.isArray(data) && data.length > 0) {
        setProjectProducts(data);
      } else if (Array.isArray(project?.products) && project.products.length > 0) {
        setProjectProducts(project.products);
      } else {
        setProjectProducts([]);
      }
    } catch (_) {
    } finally {
      setLoadingProducts(false);
    }
  }, [project?.id]);

  const fetchTasks = useCallback(async () => {
    if (!project?.id) return;
    setLoadingTasks(true);
    try {
      const res = await apiClient.getOperationalTasks({
        project_id: String(project.id),
      });
      setProjectTasks(res?.data ?? []);
    } catch (_) {
    } finally {
      setLoadingTasks(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (open && project?.id) {
      fetchProducts();
      fetchTasks();
    }
    if (!open) {
      setActiveTab("visao-geral");
      setTaskSearch("");
      setTaskFilterStatus("all");
      setProjectProducts([]);
      setProjectTasks([]);
    }
  }, [open, project?.id]);

  useEffect(() => {
    if (!open || !project?.id) return;
    if (project.status !== "awaiting-payment") return;
    if (loadingProducts || projectProducts.length > 0) return;
    if (repairedDraftRef.current === String(project.id)) return;

    repairedDraftRef.current = String(project.id);

    const restoreDraftProducts = async () => {
      try {
        const raw = localStorage.getItem(`allka-draft-${project.id}`);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        const selectedProducts = Array.isArray(parsed?.selectedProducts)
          ? parsed.selectedProducts
          : [];
        if (selectedProducts.length === 0) return;

        const productQuantities = parsed?.productQuantities ?? {};
        const productCommissions = parsed?.productCommissions ?? {};
        const productCommissionData = parsed?.productCommissionData ?? {};

        for (const product of selectedProducts) {
          const pid = String(product.id);
          const qty = Number(productQuantities[pid] ?? product.quantity ?? 1) || 1;
          const commissionPct = Number(productCommissions[pid] ?? 0) || 0;
          const commissionData = productCommissionData[pid] ?? {};
          const basePrice = Number(product.finalPrice ?? 0);
          const pagador = commissionData.pagador === "CLIENTE" ? "CLIENTE" : "AGENCIA";
          const commissionValue = (basePrice * commissionPct * qty) / 100;
          const clientUnitPrice =
            pagador === "CLIENTE" ? basePrice + commissionValue / qty : basePrice;

          try {
            await apiClient.linkProductToProject({
              project_id: String(project.id),
              product_id: pid,
              recurrence_snapshot: "avulso",
              preco_final_cliente_snapshot: clientUnitPrice * qty,
              comissao_snapshot: commissionPct,
              pagador_snapshot: pagador,
            });
          } catch (linkErr: any) {
            if (linkErr?.status !== 409) {
              console.warn("[project-view] Falha ao restaurar produto do draft:", linkErr);
            }
          }
        }

        await fetchProducts();
        await fetchTasks();
      } catch (err) {
        console.warn("[project-view] Falha ao restaurar draft do projeto:", err);
      }
    };

    void restoreDraftProducts();
  }, [open, project?.id, project?.status, loadingProducts, projectProducts.length, fetchProducts, fetchTasks]);

  // ── Task status change ────────────────────────────────────────────────────
  async function handleTaskStatusChange(task: any, newStatus: string) {
    if (task.status === newStatus) return;
    setUpdatingTaskId(task.id);
    try {
      await apiClient.updateProjectTask(task.id, { status: newStatus });
      setProjectTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: newStatus,
                completed_at:
                  newStatus === "CONCLUIDA"
                    ? new Date().toISOString()
                    : t.completed_at,
              }
            : t,
        ),
      );
      if (selectedTask?.id === task.id) {
        setSelectedTask((prev: any) =>
          prev ? { ...prev, status: newStatus } : prev,
        );
      }
    } catch (_) {
    } finally {
      setUpdatingTaskId(null);
    }
  }

  // ── Launch task — open the launch drawer ────────────────────────────────
  function handleLaunchTask(taskId: string) {
    const task = projectTasks.find((t) => t.id === taskId);
    if (task) {
      setLaunchDrawerTask(task);
      setLaunchDrawerOpen(true);
    }
  }

  // ── Open launch drawer from dropdown (EM_LANCAMENTO tasks) ───────────────
  function handleOpenLaunchDrawer(task: any) {
    setLaunchDrawerTask(task);
    setLaunchDrawerOpen(true);
  }

  // ── Release task (EM_LANCAMENTO → LIBERADA_PARA_EXECUCAO) ─────────────────
  async function handleReleaseTask(taskId: string) {
    setLaunchingTaskId(taskId);
    try {
      await apiClient.releaseProjectTask(taskId);
      setProjectTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "LIBERADA_PARA_EXECUCAO" } : t,
        ),
      );
    } catch (_) {
    } finally {
      setLaunchingTaskId(null);
    }
  }

  // ── Unlink product ────────────────────────────────────────────────────────
  async function handleConfirmUnlink() {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      await apiClient.unlinkProductFromProject(unlinkTarget.id);
      setUnlinkTarget(null);
      await fetchProducts();
      await fetchTasks();
    } catch (_) {
    } finally {
      setUnlinking(false);
    }
  }

  if (!project) return null;

  const awaitingPayment = project.status === "awaiting-payment";

  const spent = project.spent ?? 0;
  const budget = project.budget ?? project.value ?? 0;
  const progress = project.progress ?? 0;
  const remaining = budget - spent;
  const spentPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  // ── Filtered tasks ────────────────────────────────────────────────────────
  const filteredTasks = projectTasks.filter((t) => {
    const q = taskSearch.toLowerCase().trim();
    if (q) {
      const match =
        t.title?.toLowerCase().includes(q) ||
        t.project_product?.product_name_snapshot?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (taskFilterStatus !== "all" && t.status !== taskFilterStatus)
      return false;
    return true;
  });

  // ── Derived counts ────────────────────────────────────────────────────────
  const linkedProductIds = projectProducts.map((pp: any) => pp.product_id);

  const taskStats = {
    total: projectTasks.length,
    paraLancamento: projectTasks.filter((t) => t.status === "PARA_LANCAMENTO")
      .length,
    emExecucao: projectTasks.filter((t) => t.status === "EM_EXECUCAO").length,
    emRevisao: projectTasks.filter((t) => t.status === "EM_REVISAO").length,
    emAprovacao: projectTasks.filter((t) => t.status === "EM_APROVACAO").length,
    concluidas: projectTasks.filter((t) => t.status === "CONCLUIDA").length,
    aguardandoNomade: projectTasks.filter(
      (t) => t.status === "AGUARDANDO_NOMADE",
    ).length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <SheetContent
          side="right"
          hideOverlay={true}
          className="p-0 flex flex-col gap-0 !w-auto !max-w-none"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          }}
        >
          <div className="relative flex flex-col h-full overflow-hidden">
            {/* ── Header ── */}
            <ModalBrandHeader
              left={
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-16 w-16 rounded-xl bg-white/15 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-8 w-8 text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-lg truncate">
                      {project.name}
                    </h2>
                    <p className="text-blue-200 text-xs mt-0.5 truncate">
                      {project.client}
                      {project.agency ? ` · ${project.agency}` : ""}
                    </p>
                    <p className="text-blue-300 text-[11px] mt-0.5">
                      {project.type ?? "Projeto"}
                    </p>
                  </div>
                </div>
              }
              right={
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getProjectStatusBadge(project.status)}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 border border-white/20 h-8 px-3 text-xs gap-1.5"
                    onClick={onEdit}
                  >
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 border border-white/20 h-8 px-3 text-xs gap-1.5"
                    onClick={onClone}
                  >
                    <Copy className="h-3.5 w-3.5" /> Clonar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20 border border-white/20 h-8 px-3 text-xs gap-1.5"
                    onClick={onExport}
                  >
                    <FileText className="h-3.5 w-3.5" /> Exportar
                  </Button>
                  {project.status !== "cancelled" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-300 hover:bg-red-500/20 border border-red-300/30 h-8 px-3 text-xs gap-1.5"
                      onClick={onCancel}
                    >
                      <Ban className="h-3.5 w-3.5" /> Cancelar
                    </Button>
                  )}
                </div>
              }
            />

            {/* ── Tabs ── */}
            <div className="flex-1 flex flex-col bg-white dark:bg-background overflow-hidden">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col min-h-0"
              >
                {/* Tab bar */}
                <div className="flex-shrink-0 bg-white dark:bg-background px-[50px] pt-0 pb-[10px] overflow-x-auto">
                  <TabsList className="grid w-max grid-cols-7 gap-1 bg-transparent p-0 h-auto">
                    {[
                      { value: "visao-geral", label: "Visão Geral" },
                      {
                        value: "produtos",
                        label: `Produtos${projectProducts.length > 0 ? ` (${projectProducts.length})` : ""}`,
                      },
                      {
                        value: "tarefas",
                        label: `Tarefas${projectTasks.length > 0 ? ` (${projectTasks.length})` : ""}`,
                      },
                      { value: "financeiro", label: "Financeiro" },
                      { value: "equipe", label: "Equipe" },
                      { value: "nomades", label: "Nômades" },
                      { value: "logs", label: "Logs" },
                    ].map(({ value, label }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    TAB: VISÃO GERAL
                ══════════════════════════════════════════════════════════ */}
                <TabsContent
                  value="visao-geral"
                  className="flex-1 overflow-y-auto bg-slate-200 mt-0"
                >
                  <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                    {/* KPIs */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Progresso
                        </p>
                        <div className="text-2xl font-bold text-slate-900 mt-1">
                          {progress}%
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-blue-200">
                          <div
                            className="h-1.5 rounded-full bg-blue-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Orçamento
                        </p>
                        <div className="text-xl font-bold text-slate-900 mt-1">
                          {fmtBRL(budget)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Total contratado
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-3 border border-violet-200">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Gasto
                        </p>
                        <div className="text-xl font-bold text-slate-900 mt-1">
                          {fmtBRL(spent)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {spentPct}% do orçamento
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 border border-amber-200">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          Tarefas
                        </p>
                        <div className="text-2xl font-bold text-slate-900 mt-1">
                          {loadingTasks ? (
                            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                          ) : (
                            taskStats.total
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {taskStats.concluidas} concluídas
                        </div>
                      </div>
                    </div>

                    {/* Mini task breakdown (only if tasks loaded) */}
                    {!loadingTasks && taskStats.total > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          {
                            label: "Para lançamento",
                            value: taskStats.paraLancamento,
                            bg: "bg-slate-100 border-slate-200 text-slate-600",
                            stat: "PARA_LANCAMENTO",
                          },
                          {
                            label: "Em Execução",
                            value: taskStats.emExecucao,
                            bg: "bg-blue-50 border-blue-200 text-blue-700",
                            stat: "EM_EXECUCAO",
                          },
                          {
                            label: "Em Revisão",
                            value: taskStats.emRevisao,
                            bg: "bg-amber-50 border-amber-200 text-amber-700",
                            stat: "EM_REVISAO",
                          },
                          {
                            label: "Concluídas",
                            value: taskStats.concluidas,
                            bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
                            stat: "CONCLUIDA",
                          },
                          ...(taskStats.aguardandoNomade > 0
                            ? [
                                {
                                  label: "Ag. Nômade",
                                  value: taskStats.aguardandoNomade,
                                  bg: "bg-purple-50 border-purple-200 text-purple-700",
                                  stat: "AGUARDANDO_NOMADE",
                                },
                              ]
                            : []),
                        ].map((s) => (
                          <button
                            key={s.label}
                            onClick={() => {
                              setActiveTab("tarefas");
                              setTaskFilterStatus(s.stat);
                            }}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-center hover:opacity-80 transition-opacity cursor-pointer",
                              s.bg,
                            )}
                          >
                            <p className="text-xl font-bold">{s.value}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5">
                              {s.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Project info */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          Informações do Projeto
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoCell label="Cliente" value={project.client} />
                        <InfoCell
                          label="CNPJ Cliente"
                          value={project.clientCNPJ}
                          mono
                        />
                        <InfoCell label="Agência" value={project.agency} />
                        <InfoCell
                          label="Consultor"
                          value={project.consultant}
                        />
                        <InfoCell label="Tipo" value={project.type} />
                        <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Status
                          </p>
                          {getProjectStatusBadge(project.status)}
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          Datas
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <InfoCell
                          label="Criação"
                          value={project.createdDate ?? project.created_at}
                        />
                        <InfoCell label="Início" value={project.startDate} />
                        <InfoCell label="Prazo" value={project.deadline} />
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-violet-500" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          Configurações
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            [
                              "Sync Bitrix",
                              project.bitrixSync,
                              "Ativo",
                              "Inativo",
                            ],
                            [
                              "Portfólio",
                              project.portfolioPermission,
                              "Permitido",
                              "Não permitido",
                            ],
                            ["Origem Lead", project.fromLead, "Sim", "Não"],
                            ["Atrasado", project.overdue, "Sim", "Não"],
                          ] as [string, boolean, string, string][]
                        ).map(([label, val, yes, no]) => (
                          <div
                            key={label}
                            className="bg-slate-100/70 rounded-lg px-2.5 py-2 flex items-center justify-between"
                          >
                            <p className="text-xs text-slate-600 font-medium">
                              {label}
                            </p>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                            >
                              {val ? yes : no}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {project.consultantEmail && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              E-mail Consultor
                            </p>
                            <p className="text-sm font-semibold text-blue-600">
                              {project.consultantEmail}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ══════════════════════════════════════════════════════════
                    TAB: PRODUTOS
                ══════════════════════════════════════════════════════════ */}
                <TabsContent
                  value="produtos"
                  className="flex-1 overflow-y-auto bg-slate-200 mt-0"
                >
                  <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-800">
                          Produtos do Projeto
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {projectProducts.length} produto
                          {projectProducts.length !== 1 ? "s" : ""} vinculado
                          {projectProducts.length !== 1 ? "s" : ""}
                          {projectProducts.length > 0 &&
                            ` · ${projectProducts.reduce(
                              (s: number, p: any) =>
                                s + (p._count?.tasks ?? p.tasks?.length ?? 0),
                              0,
                            )} tarefas geradas`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchProducts}
                          disabled={loadingProducts}
                          className="h-8 w-8 p-0"
                        >
                          {loadingProducts ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setAddProductOpen(true)}
                          className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="h-3.5 w-3.5" /> Vincular Produto
                        </Button>
                      </div>
                    </div>

                    {loadingProducts ? (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Carregando produtos...</span>
                      </div>
                    ) : projectProducts.length === 0 ? (
                      project.status === "awaiting-payment" ? (
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-12 flex flex-col items-center justify-center gap-4 text-center">
                          <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                            <Lock className="h-7 w-7 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-amber-900">
                              Projeto aguardando pagamento
                            </p>
                            <p className="text-sm text-amber-700 mt-1 max-w-sm mx-auto leading-relaxed">
                              Este projeto está aguardando pagamento, mas os produtos não foram encontrados. Verifique o checkout/orçamento vinculado.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 flex flex-col items-center justify-center gap-4 text-center">
                          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Package className="h-7 w-7 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-600">
                              Nenhum produto vinculado
                            </p>
                            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                              Vincule produtos ao projeto para gerar tarefas de
                              execução automaticamente.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setAddProductOpen(true)}
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="h-3.5 w-3.5" /> Vincular Primeiro
                            Produto
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        {projectProducts.map((pp: any) => {
                          const taskCount =
                            pp._count?.tasks ?? pp.tasks?.length ?? 0;
                          return (
                            <div
                              key={pp.id}
                              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                            >
                              {/* Product header */}
                              <div className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shrink-0">
                                    <Package className="h-5 w-5 text-blue-700" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        {pp.product_code_snapshot && (
                                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mr-1.5">
                                            {pp.product_code_snapshot}
                                          </span>
                                        )}
                                        <span className="text-sm font-bold text-slate-800">
                                          {pp.product_name_snapshot}
                                        </span>
                                        {pp.variation && (
                                          <span className="ml-2 text-[11px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                                            {pp.variation.name}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <ProductStatusBadge
                                          status={pp.status}
                                          projectStatus={project.status}
                                        />
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                              onClick={() =>
                                                setUnlinkTarget(pp)
                                              }
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Desvincular produto
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {pp.product_category_snapshot}
                                    </p>
                                    {project.status === "awaiting-payment" && (
                                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                        <Lock className="h-3.5 w-3.5" />
                                        <span>
                                          Este produto será liberado após a confirmação do pagamento.
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Detail grid */}
                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Preço snapshot
                                    </p>
                                    <p className="text-sm font-bold text-slate-800">
                                      {fmtBRL(pp.product_price_snapshot)}
                                    </p>
                                    {pp.recurrence_snapshot && (
                                      <p className="text-[10px] text-slate-400 capitalize">
                                        {pp.recurrence_snapshot}
                                      </p>
                                    )}
                                  </div>
                                  <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Início
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700">
                                      {fmtDate(pp.start_date)}
                                    </p>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Prazo previsto
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700">
                                      {fmtDate(pp.expected_end_date)}
                                    </p>
                                  </div>
                                  <div className="bg-slate-50 rounded-lg px-2.5 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                      Tarefas geradas
                                    </p>
                                    <p className="text-sm font-bold text-blue-700">
                                      {taskCount}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Tasks mini-list from product */}
                              {pp.tasks && pp.tasks.length > 0 && (
                                <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                    Tarefas geradas ({pp.tasks.length})
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {pp.tasks.slice(0, 6).map((t: any) => {
                                      const sc =
                                        TASK_STATUS_CFG[t.status] ??
                                        TASK_STATUS_CFG.PARA_LANCAMENTO;
                                      return (
                                        <button
                                          key={t.id}
                                          onClick={() => {
                                            const fullTask = projectTasks.find(
                                              (pt) => pt.id === t.id,
                                            );
                                            if (fullTask) {
                                              setSelectedTask(fullTask);
                                              setTaskDrawerOpen(true);
                                            }
                                          }}
                                          className={cn(
                                            "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border hover:opacity-80 transition-opacity",
                                            sc.cls,
                                          )}
                                        >
                                          {t.name_snapshot ?? t.title}
                                        </button>
                                      );
                                    })}
                                    {pp.tasks.length > 6 && (
                                      <span className="text-[10px] text-slate-400 px-2 py-0.5">
                                        +{pp.tasks.length - 6} mais
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ══════════════════════════════════════════════════════════
                    TAB: TAREFAS
                ══════════════════════════════════════════════════════════ */}
                <TabsContent
                  value="tarefas"
                  className="flex-1 overflow-y-auto bg-slate-200 mt-0"
                >
                  <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                    {/* Section header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-800">
                          Tarefas do Projeto
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {taskStats.total} tarefa
                          {taskStats.total !== 1 ? "s" : ""} no total
                          {taskStats.total > 0 &&
                            ` · ${taskStats.concluidas} concluída${taskStats.concluidas !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTasks}
                        disabled={loadingTasks}
                        className="h-8 w-8 p-0"
                      >
                        {loadingTasks ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    {/* Stat cards — 6 cards, clickable filter */}
                    {!loadingTasks && taskStats.total > 0 && (
                      <div className="grid grid-cols-6 gap-2">
                        {[
                          {
                            label: "Total",
                            val: taskStats.total,
                            cls: "bg-slate-700",
                            stat: "all",
                          },
                          {
                            label: "Para lançamento",
                            val: taskStats.paraLancamento,
                            cls: "bg-slate-500",
                            stat: "PARA_LANCAMENTO",
                          },
                          {
                            label: "Em execução",
                            val: taskStats.emExecucao,
                            cls: "bg-blue-600",
                            stat: "EM_EXECUCAO",
                          },
                          {
                            label: "Em revisão",
                            val: taskStats.emRevisao,
                            cls: "bg-amber-500",
                            stat: "EM_REVISAO",
                          },
                          {
                            label: "Em aprovação",
                            val: taskStats.emAprovacao,
                            cls: "bg-violet-600",
                            stat: "EM_APROVACAO",
                          },
                          {
                            label: "Concluídas",
                            val: taskStats.concluidas,
                            cls: "bg-emerald-600",
                            stat: "CONCLUIDA",
                          },
                        ].map((s) => (
                          <button
                            key={s.label}
                            onClick={() => setTaskFilterStatus(s.stat)}
                            className={cn(
                              "rounded-xl px-3 py-2.5 text-white shadow-sm text-left transition-all hover:opacity-90 active:scale-[0.98]",
                              s.cls,
                              taskFilterStatus === s.stat &&
                                "ring-2 ring-white/40 ring-offset-1",
                            )}
                          >
                            <p className="text-xl font-black leading-none">
                              {s.val}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5 opacity-80 leading-tight">
                              {s.label}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Filters */}
                    {!loadingTasks && taskStats.total > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                          <Input
                            placeholder="Buscar tarefa ou produto..."
                            value={taskSearch}
                            onChange={(e) => setTaskSearch(e.target.value)}
                            className="pl-9 h-8 text-sm bg-white"
                          />
                          {taskSearch && (
                            <button
                              onClick={() => setTaskSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <Select
                          value={taskFilterStatus}
                          onValueChange={setTaskFilterStatus}
                        >
                          <SelectTrigger className="h-8 w-[160px] text-xs bg-white">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os status</SelectItem>
                            {Object.entries(TASK_STATUS_CFG).map(
                              ([key, cfg]) => (
                                <SelectItem
                                  key={key}
                                  value={key}
                                  className="text-xs"
                                >
                                  {cfg.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        {(taskSearch || taskFilterStatus !== "all") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTaskSearch("");
                              setTaskFilterStatus("all");
                            }}
                            className="h-8 text-xs gap-1 text-slate-500"
                          >
                            <X className="h-3 w-3" /> Limpar
                          </Button>
                        )}
                      </div>
                    )}

                    {/* ── States ── */}
                    {loadingTasks ? (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Carregando tarefas...</span>
                      </div>
                    ) : taskStats.total === 0 &&
                      [
                        "draft",
                        "negotiation",
                        "pending-approval",
                        "awaiting-payment",
                      ].includes(project.status) ? (
                      /* Empty state A — project not yet contracted */
                      <div className="space-y-4">
                        <div className="bg-white rounded-xl border-2 border-dashed border-amber-200 p-12 flex flex-col items-center justify-center gap-4 text-center">
                          <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                            <Clock className="h-7 w-7 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-700">
                              Tarefas ainda não geradas
                            </p>
                            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                              As tarefas deste projeto serão criadas automaticamente após a confirmação do pagamento.
                            </p>
                          </div>
                        </div>
                        {projectProducts.length > 0 && (
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                              Produtos aguardando pagamento
                            </p>
                            <div className="space-y-2">
                              {projectProducts.slice(0, 4).map((pp: any) => (
                                <div
                                  key={pp.id}
                                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                >
                                  <span className="font-medium text-slate-700">
                                    {pp.product_name_snapshot ?? pp.product?.name}
                                  </span>
                                  <span className="text-amber-700 text-xs font-semibold">
                                    Aguardando pagamento
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : taskStats.total === 0 ? (
                      /* Empty state B — paid/contracted but no tasks generated */
                      <div className="bg-white rounded-xl border-2 border-dashed border-red-200 p-12 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                          <AlertTriangle className="h-7 w-7 text-red-500" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-red-700">
                            Projeto pago, mas nenhuma tarefa foi gerada.
                          </p>
                          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                            Verifique se os produtos vinculados possuem modelos
                            de tarefas ativos configurados.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab("produtos")}
                            className="gap-2"
                          >
                            <Package className="h-3.5 w-3.5" /> Ver Produtos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={fetchTasks}
                            disabled={loadingTasks}
                            className="gap-2"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Recarregar
                          </Button>
                        </div>
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center gap-3">
                        <Search className="h-7 w-7 text-slate-300" />
                        <p className="text-sm text-slate-500">
                          Nenhuma tarefa com os filtros aplicados.
                        </p>
                        <button
                          onClick={() => {
                            setTaskSearch("");
                            setTaskFilterStatus("all");
                          }}
                          className="text-xs text-blue-600 underline hover:no-underline"
                        >
                          Limpar filtros
                        </button>
                      </div>
                    ) : (
                      /* ── Task table ── */
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[900px]">
                            <thead className="border-b border-slate-200 bg-slate-50">
                              <tr>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-28">
                                  Código
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Tarefa
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Produto de origem
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-40">
                                  Status
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-20">
                                  Etapas
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-32">
                                  Resp. Agência
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-32">
                                  Nômade
                                </th>
                                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-24">
                                  Prazo
                                </th>
                                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-40">
                                  Ações
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredTasks.map((task: any) => {
                                const overdue = isTaskOverdue(task);
                                const isLaunching = launchingTaskId === task.id;
                                const stageCount = task._count?.stages ?? 0;
                                const attachCount =
                                  task._count?.attachments ?? 0;
                                const lancamentoDays = getLancamentoDaysLeft(task);
                                const lancamentoExpired = lancamentoDays !== null && lancamentoDays <= 0;

                                // Context-sensitive primary action
                                let primaryBtn: React.ReactNode;
                                if (task.status === "PARA_LANCAMENTO") {
                                  primaryBtn = (
                                    <Button
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] gap-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                      disabled={isLaunching || lancamentoExpired || awaitingPayment}
                                      title={
                                        awaitingPayment
                                          ? "As tarefas serão liberadas após a confirmação do pagamento."
                                          : lancamentoExpired
                                            ? "Prazo de lançamento expirado"
                                            : undefined
                                      }
                                      onClick={() => handleLaunchTask(task.id)}
                                    >
                                      {isLaunching ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Rocket className="h-3 w-3" />
                                      )}
                                      {awaitingPayment
                                        ? "Bloqueado até pagamento"
                                        : lancamentoExpired
                                          ? "Expirada"
                                          : "Lançar tarefa"}
                                    </Button>
                                  );
                                } else if (task.status === "EM_EXECUCAO") {
                                  primaryBtn = (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2.5 text-[11px] gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setTaskDrawerOpen(true);
                                      }}
                                    >
                                      <PlayCircle className="h-3 w-3" />
                                      Acompanhar
                                    </Button>
                                  );
                                } else if (task.status === "CONCLUIDA") {
                                  primaryBtn = (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2.5 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setTaskDrawerOpen(true);
                                      }}
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Ver entrega
                                    </Button>
                                  );
                                } else if (
                                  task.status === "AGUARDANDO_NOMADE"
                                ) {
                                  primaryBtn = (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2.5 text-[11px] gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setTaskDrawerOpen(true);
                                      }}
                                    >
                                      <UserSearch className="h-3 w-3" />
                                      Aguardando nômade
                                    </Button>
                                  );
                                } else {
                                  primaryBtn = (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2.5 text-[11px] gap-1 text-slate-600"
                                      onClick={() => {
                                        setSelectedTask(task);
                                        setTaskDrawerOpen(true);
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                      Ver detalhes
                                    </Button>
                                  );
                                }

                                return (
                                  <tr
                                    key={task.id}
                                    className={cn(
                                      "group hover:bg-slate-50/60 transition-colors",
                                      overdue && "bg-red-50/30",
                                    )}
                                  >
                                    {/* Código */}
                                    <td className="px-3 py-3">
                                      {task.code_snapshot ? (
                                        <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                          {task.code_snapshot}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 text-xs">
                                          —
                                        </span>
                                      )}
                                    </td>
                                    {/* Tarefa */}
                                    <td className="px-3 py-3">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                                          {task.title}
                                        </p>
                                        {task.fase && (
                                          <span className="inline-flex mt-0.5 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-100">
                                            {task.fase}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {/* Produto de origem */}
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="text-xs text-slate-600 line-clamp-1">
                                          {task.project_product
                                            ?.product_name_snapshot ?? "—"}
                                        </span>
                                      </div>
                                    </td>
                                    {/* Status */}
                                    <td className="px-3 py-3">
                                      <div className="flex flex-col gap-1">
                                        <TaskStatusBadge status={task.status} />
                                        <LancamentoExpiryBadge task={task} />
                                      </div>
                                    </td>
                                    {/* Etapas */}
                                    <td className="px-3 py-3">
                                      <span
                                        className={cn(
                                          "flex items-center gap-1 text-xs",
                                          stageCount > 0
                                            ? "text-slate-700"
                                            : "text-slate-300",
                                        )}
                                      >
                                        <ListChecks className="h-3.5 w-3.5 shrink-0" />
                                        {stageCount}
                                      </span>
                                    </td>
                                    {/* Resp. Agência */}
                                    <td className="px-3 py-3">
                                      {task.responsavel_agencia ? (
                                        <div className="flex items-center gap-1.5">
                                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                                          <span className="text-xs text-slate-700 truncate max-w-[100px]">
                                            {task.responsavel_agencia.name}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                      )}
                                    </td>
                                    {/* Nômade */}
                                    <td className="px-3 py-3">
                                      {task.nomade_responsavel ? (
                                        <div className="flex items-center gap-1.5">
                                          <UserSearch className="h-3 w-3 text-slate-400 shrink-0" />
                                          <span className="text-xs text-slate-700 truncate max-w-[100px]">
                                            {task.nomade_responsavel.name}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 text-xs">—</span>
                                      )}
                                    </td>
                                    {/* Prazo */}
                                    <td className="px-3 py-3">
                                      <span
                                        className={cn(
                                          "text-xs",
                                          overdue
                                            ? "text-red-600 font-semibold"
                                            : "text-slate-600",
                                        )}
                                      >
                                        {fmtDate(task.due_date)}
                                      </span>
                                      {overdue && (
                                        <span className="block text-[10px] text-red-500">
                                          atrasada
                                        </span>
                                      )}
                                    </td>
                                    {/* Ações */}
                                    <td className="px-3 py-3">
                                      <div className="flex items-center justify-end gap-1">
                                        {primaryBtn}
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent
                                            align="end"
                                            className="w-52"
                                          >
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setSelectedTask(task);
                                                setTaskDrawerOpen(true);
                                              }}
                                            >
                                              <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                              Ver detalhes
                                            </DropdownMenuItem>
                                            {!awaitingPayment &&
                                              (task.status ===
                                                "PARA_LANCAMENTO" ||
                                                task.status ===
                                                  "EM_LANCAMENTO" ||
                                                task.status ===
                                                  "AGUARDANDO_INFORMACOES") && (
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleOpenLaunchDrawer(task)
                                                }
                                              >
                                                <FileText className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                                                Lançar briefing
                                              </DropdownMenuItem>
                                            )}
                                            {!awaitingPayment &&
                                              task.status ===
                                                "EM_LANCAMENTO" && (
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleOpenLaunchDrawer(task)
                                                }
                                              >
                                                <ArrowRight className="h-3.5 w-3.5 mr-2 text-cyan-600" />
                                                Liberar para execução
                                              </DropdownMenuItem>
                                            )}
                                            {stageCount > 0 && (
                                              <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                  onClick={() => {
                                                    setSelectedTask(task);
                                                    setTaskDrawerOpen(true);
                                                  }}
                                                >
                                                  <ListChecks className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                                  Ver etapas ({stageCount})
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                            {attachCount > 0 && (
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setSelectedTask(task);
                                                  setTaskDrawerOpen(true);
                                                }}
                                              >
                                                <Paperclip className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                                Ver anexos ({attachCount})
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setSelectedTask(task);
                                                setTaskDrawerOpen(true);
                                              }}
                                            >
                                              <History className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                              Ver histórico
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                          <span className="text-xs text-slate-400">
                            {filteredTasks.length} tarefa
                            {filteredTasks.length !== 1 ? "s" : ""}
                            {filteredTasks.length !== taskStats.total &&
                              ` (de ${taskStats.total} total)`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                {/* ══════════════════════════════════════════════════════════
                    TAB: FINANCEIRO
                ══════════════════════════════════════════════════════════ */}
                <TabsContent
                  value="financeiro"
                  className="flex-1 overflow-y-auto bg-slate-200 mt-0"
                >
                  <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          Resumo Financeiro
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          ["Orçamento Total", fmtBRL(budget), "text-slate-900"],
                          ["Gasto", fmtBRL(spent), "text-red-600"],
                          [
                            "Restante",
                            fmtBRL(remaining),
                            remaining >= 0
                              ? "text-emerald-600"
                              : "text-red-600",
                          ],
                          ["% Utilizado", `${spentPct}%`, "text-slate-900"],
                        ].map(([label, val, cls]) => (
                          <div
                            key={label}
                            className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                          >
                            <span className="text-sm text-slate-600">
                              {label}
                            </span>
                            <span className={`text-sm font-bold ${cls}`}>
                              {val}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Orçamento utilizado</span>
                          <span>{spentPct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full transition-all ${spentPct > 90 ? "bg-red-500" : spentPct > 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(spentPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {project.checkoutLinks &&
                    project.checkoutLinks.length > 0 ? (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Link2 className="h-4 w-4 text-blue-500" />
                          <h3 className="text-sm font-semibold text-slate-800">
                            Links de Checkout
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {project.checkoutLinks.map((link: any, i: number) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                            >
                              <Link2 className="h-3 w-3 flex-shrink-0" />
                              {link.label || link.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl p-4 border border-dashed border-slate-200 text-center">
                        <Link2 className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs text-slate-400">
                          Nenhum link de checkout cadastrado
                        </p>
                      </div>
                    )}

                    {/* ── Custo por Produto (interno) ── */}
                    <div className="rounded-xl overflow-hidden border border-amber-200">
                      <div className="px-4 py-3 bg-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-amber-400" />
                          <p className="text-xs font-bold text-white uppercase tracking-wider">
                            Custo por Produto — Uso Interno
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wide">
                          Não visível ao cliente
                        </span>
                      </div>

                      {loadingProducts ? (
                        <div className="bg-white p-8 text-center">
                          <BarChart3 className="h-8 w-8 animate-pulse text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">
                            Carregando produtos...
                          </p>
                        </div>
                      ) : projectProducts.length === 0 ? (
                        <div className="bg-white p-8 text-center">
                          <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">
                            Nenhum produto vinculado a este projeto
                          </p>
                        </div>
                      ) : (
                        (() => {
                          const fmtCurrency = (v: number) =>
                            v.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            });
                          const totalBase = projectProducts.reduce(
                            (s: number, pp: any) =>
                              s +
                              (pp.product_price_snapshot ?? 0) *
                                (pp.quantity ?? 1),
                            0,
                          );
                          return (
                            <div className="bg-white">
                              {/* Product rows */}
                              <div className="divide-y divide-slate-100">
                                {projectProducts.map((pp: any) => {
                                  const baseUnit =
                                    pp.product_price_snapshot ?? 0;
                                  const qty = pp.quantity ?? 1;
                                  const lineTotal = baseUnit * qty;
                                  return (
                                    <div
                                      key={pp.id}
                                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <BarChart3 className="h-4 w-4 text-slate-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                          {pp.product_name_snapshot ??
                                            pp.product?.name}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                          {pp.product_code_snapshot && (
                                            <span className="text-[10px] font-mono text-slate-400">
                                              {pp.product_code_snapshot}
                                            </span>
                                          )}
                                          {pp.product_category_snapshot && (
                                            <span className="text-[10px] text-slate-400">
                                              {pp.product_category_snapshot}
                                            </span>
                                          )}
                                          <span className="text-[10px] text-slate-400">
                                            Qtd: {qty}
                                          </span>
                                          {pp.recurrence_snapshot && (
                                            <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                                              {pp.recurrence_snapshot}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <p className="text-sm font-bold text-slate-800">
                                          {fmtCurrency(lineTotal)}
                                        </p>
                                        {qty > 1 && (
                                          <p className="text-[10px] text-slate-400">
                                            {fmtCurrency(baseUnit)} × {qty}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Totals */}
                              <div className="border-t border-slate-200 bg-slate-50 divide-y divide-slate-200">
                                <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                  <span className="text-slate-500">
                                    Total base contratado
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {fmtCurrency(totalBase)}
                                  </span>
                                </div>
                                {project.commission_rate > 0 && (
                                  <>
                                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                                      <span className="text-emerald-700 flex items-center gap-1.5">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                        Comissão ({project.commission_rate}%)
                                      </span>
                                      <span className="font-semibold text-emerald-700">
                                        {fmtCurrency(
                                          (totalBase *
                                            project.commission_rate) /
                                            100,
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center px-4 py-3">
                                      <span className="font-bold text-slate-900">
                                        Total cliente
                                      </span>
                                      <span className="text-xl font-extrabold text-emerald-700">
                                        {fmtCurrency(
                                          totalBase *
                                            (1 + project.commission_rate / 100),
                                        )}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ══════════════════════════════════════════════════════════
                    TAB: EQUIPE
                ══════════════════════════════════════════════════════════ */}
                <TabsContent
                  value="equipe"
                  className="flex-1 overflow-y-auto bg-slate-200 mt-0"
                >
                  <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-blue-600" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          Equipe do Projeto
                        </h3>
                        <span className="ml-auto text-xs text-slate-400">
                          {project.team ?? 0} membro
                          {(project.team ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {project.teamMembers && project.teamMembers.length > 0 ? (
                        <div className="space-y-2">
                          {project.teamMembers.map((member: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
                            >
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-blue-700">
                                  {member.name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800">
                                  {member.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {member.role}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">
                            {project.team > 0
                              ? `${project.team} membro${project.team !== 1 ? "s" : ""} na equipe`
                              : "Nenhum membro cadastrado"}
                          </p>
                          {project.consultant && (
                            <div className="mt-3 inline-flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-xs text-slate-600 font-medium">
                                Consultor: {project.consultant}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ══════════════════════════════════════════════════════════
                    TAB: NÔMADES
                ══════════════════════════════════════════════════════════ */}
                <TabsContent
                  value="nomades"
                  className="flex-1 overflow-y-auto bg-slate-200 mt-0"
                >
                  <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-violet-600" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          Nômades Vinculados
                        </h3>
                        <span className="ml-auto text-xs text-slate-400">
                          {project.nomades?.length ?? 0} nômade
                          {(project.nomades?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {project.nomades && project.nomades.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {project.nomades.map((n: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-3 py-1 text-xs font-semibold"
                            >
                              <User className="h-3 w-3" />
                              {n}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">
                            Nenhum nômade vinculado
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* ══════════════════════════════════════════════════════════
                    TAB: LOGS
                ══════════════════════════════════════════════════════════ */}
                <TabsContent
                  value="logs"
                  className="flex-1 overflow-y-auto bg-slate-200 mt-0"
                >
                  <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          Histórico de Atividades
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {[
                          {
                            action: "Projeto criado",
                            date: project.createdDate ?? "—",
                            user: project.consultant ?? "Sistema",
                            color: "bg-blue-400",
                          },
                          {
                            action: "Status atualizado",
                            date: "—",
                            user: "Admin",
                            color: "bg-amber-400",
                          },
                        ].map((log, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div
                              className={`h-2 w-2 rounded-full ${log.color} mt-1.5 flex-shrink-0`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800">
                                {log.action}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {log.date} · {log.user}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-300 text-center mt-4">
                        Logs completos disponíveis no sistema de auditoria
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Product Link Modal ── */}
      {addProductOpen && (
        <ProductLinkModal
          projectId={String(project.id)}
          linkedProductIds={linkedProductIds}
          onLinked={() => {
            setAddProductOpen(false);
            fetchProducts();
            fetchTasks();
          }}
          onClose={() => setAddProductOpen(false)}
        />
      )}

      {/* ── Unlink Confirmation ── */}
      <AlertDialog
        open={!!unlinkTarget}
        onOpenChange={(o) => !o && setUnlinkTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{unlinkTarget?.product_name_snapshot}</strong>{" "}
              será desvinculado do projeto. Todas as tarefas geradas por este
              produto também serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unlinking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnlink}
              disabled={unlinking}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {unlinking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Task Detail Drawer ── */}
      {taskDrawerOpen && selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => {
            setTaskDrawerOpen(false);
            setSelectedTask(null);
          }}
          onLaunch={(task) => {
            setTaskDrawerOpen(false);
            setSelectedTask(null);
            setLaunchDrawerTask(task);
            setLaunchDrawerOpen(true);
          }}
        />
      )}

      {/* ── Task Launch Drawer ── */}
      {launchDrawerOpen && launchDrawerTask && (
        <TaskLaunchDrawer
          task={launchDrawerTask}
          onClose={() => {
            setLaunchDrawerOpen(false);
            setLaunchDrawerTask(null);
          }}
          onReleased={(taskId) => {
            setProjectTasks((prev) =>
              prev.map((t) =>
                t.id === taskId
                  ? { ...t, status: "LIBERADA_PARA_EXECUCAO" }
                  : t,
              ),
            );
            setLaunchDrawerOpen(false);
            setLaunchDrawerTask(null);
          }}
          onTaskUpdated={(updated) => {
            setProjectTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
            );
          }}
        />
      )}
    </TooltipProvider>
  );
}
