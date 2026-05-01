// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  AlertCircle,
  Rocket,
  SendHorizonal,
  ArrowRight,
  UserSearch,
  User,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { PageLoader, ButtonLoader, InlineLoader } from "@/components/ui/loading";
import { TaskLaunchDrawer } from "@/components/task-launch-drawer";
import { ProjectViewSlidePanel } from "@/components/project-view-slide-panel";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus =
  | "PARA_LANCAMENTO"
  | "EM_LANCAMENTO"
  | "AGUARDANDO_INFORMACOES"
  | "LIBERADA_PARA_EXECUCAO"
  | "EM_EXECUCAO"
  | "EM_REVISAO"
  | "EM_APROVACAO"
  | "CONCLUIDA"
  | "CANCELADA"
  | "AGUARDANDO_NOMADE";

type Priority = "low" | "medium" | "high" | "urgent";

interface TarefaOperacional {
  id: string;
  project_id: string;
  project_product_id: string;
  product_id: string;
  catalog_task_id: string | null;
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
  responsavel_agencia: { id: string; name: string; email?: string; avatar?: string } | null;
  nomade_responsavel: { id: string; name: string; email?: string; avatar?: string } | null;
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
  catalog_task: { id: string; code: string; name: string; category: string } | null;
  _count: { stages: number; briefing_answers: number; attachments: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string; icon: any }> = {
  PARA_LANCAMENTO: { label: "Para lancamento", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", icon: Clock },
  EM_LANCAMENTO: { label: "Em lancamento", color: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", icon: SendHorizonal },
  AGUARDANDO_INFORMACOES: { label: "Ag. Informacoes", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: MessageSquare },
  LIBERADA_PARA_EXECUCAO: { label: "Liberada p/ Exec.", color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", icon: ArrowRight },
  EM_EXECUCAO: { label: "Em execucao", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: PlayCircle },
  EM_REVISAO: { label: "Em revisao", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Eye },
  EM_APROVACAO: { label: "Em aprovacao", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: CheckCircle2 },
  CONCLUIDA: { label: "Concluida", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2 },
  CANCELADA: { label: "Cancelada", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: XCircle },
  AGUARDANDO_NOMADE: { label: "Ag. Nomade", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", icon: UserSearch },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as TaskStatus[];

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; text: string }> = {
  low: { label: "Baixa", dot: "bg-slate-400", text: "text-slate-500" },
  medium: { label: "Media", dot: "bg-blue-400", text: "text-blue-600" },
  high: { label: "Alta", dot: "bg-amber-400", text: "text-amber-600" },
  urgent: { label: "Urgente", dot: "bg-red-500", text: "text-red-600" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(task: TarefaOperacional): boolean {
  if (!task.due_date) return false;
  if (task.status === "CONCLUIDA" || task.status === "CANCELADA") return false;
  return new Date(task.due_date) < new Date();
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function parseJson(data: any): any[] {
  if (!data) return [];
  try { const p = typeof data === "string" ? JSON.parse(data) : data; return Array.isArray(p) ? p : []; }
  catch { return []; }
}

function parseStrings(data: any): string[] {
  return parseJson(data).map((i: any) =>
    typeof i === "string" ? i : i?.label || i?.text || i?.title || i?.question || JSON.stringify(i));
}

// ─── Sort header ──────────────────────────────────────────────────────────────

function Th({ label, field, sortKey, sortDir, onSort, className }: {
  label: string; field: string; sortKey: string | null; sortDir: "asc" | "desc";
  onSort: (f: string) => void; className?: string;
}) {
  const active = sortKey === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={cn("px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap cursor-pointer select-none hover:text-slate-800 transition-colors", className)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : (<ChevronsUpDown className="h-3 w-3 opacity-30" />)}
      </span>
    </th>
  );
}

// ─── Assign Nomade Dialog ─────────────────────────────────────────────────────

function AssignNomadeDialog({ open, task, onClose, onAssigned }: {
  open: boolean; task: TarefaOperacional | null;
  onClose: () => void; onAssigned: (taskId: string, nomade: any) => void;
}) {
  const [nomades, setNomades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setSelected(null); setSearch(""); return; }
    setLoading(true);
    apiClient.getNomades({ status: "ativo", limit: "200" })
      .then((r: any) => setNomades(r?.data ?? []))
      .catch(() => setNomades([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    if (!search) return nomades;
    const q = search.toLowerCase();
    return nomades.filter((n: any) => n.name?.toLowerCase().includes(q) || n.email?.toLowerCase().includes(q));
  }, [nomades, search]);

  const handleConfirm = async () => {
    if (!task || !selected) return;
    setSaving(true);
    try {
      await apiClient.updateProjectTask(task.id, { nomade_responsavel_id: selected });
      const nom = nomades.find((n: any) => n.id === selected);
      onAssigned(task.id, nom);
      onClose();
    } catch { }
    finally { setSaving(false); }
  };

  if (!task) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <UserSearch className="h-4 w-4 text-purple-600" />
            Atribuir nomade manualmente
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.title}</p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum nomade ativo encontrado.</p>
              ) : filtered.map((n: any) => (
                <button key={n.id} onClick={() => setSelected(n.id === selected ? null : n.id)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    selected === n.id ? "bg-purple-50 border border-purple-300" : "hover:bg-slate-50 border border-transparent")}>
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                    selected === n.id ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-600")}>
                    {n.name?.[0]?.toUpperCase() ?? "N"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{n.name}</p>
                    <p className="text-xs text-slate-400 truncate">{n.email}</p>
                  </div>
                  {n.performance_avg_rating > 0 && (
                    <span className="ml-auto text-xs font-semibold text-amber-600 shrink-0">* {n.performance_avg_rating.toFixed(1)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-9 text-sm">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selected || saving} className="h-9 text-sm bg-purple-600 hover:bg-purple-700 text-white">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Confirmar atribuicao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function TarefaDetailDrawer({ tarefa, open, onClose, onStatusChange, updatingId }: {
  tarefa: TarefaOperacional | null; open: boolean; onClose: () => void;
  onStatusChange: (tarefa: TarefaOperacional, status: TaskStatus) => void; updatingId: string | null;
}) {
  if (!tarefa) return null;
  const sc = STATUS_CONFIG[tarefa.status] ?? STATUS_CONFIG.PARA_LANCAMENTO;
  const pc = PRIORITY_CONFIG[tarefa.priority as Priority] ?? PRIORITY_CONFIG.medium;
  const overdue = isOverdue(tarefa);
  const client = tarefa.project?.client;
  const updating = updatingId === tarefa.id;
  const steps = parseStrings(tarefa.steps_snapshot);
  const briefing = parseStrings(tarefa.briefing_snapshot);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 py-5 shrink-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckSquare2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {tarefa.code_snapshot && (
                  <span className="text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.5 rounded">{tarefa.code_snapshot}</span>
                )}
                {tarefa.fase && (
                  <span className="text-[10px] bg-blue-500/30 text-blue-100 px-1.5 py-0.5 rounded">{tarefa.fase}</span>
                )}
                {overdue && (
                  <span className="text-[10px] bg-red-500/30 text-red-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="h-2.5 w-2.5" /> Atrasada
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white leading-snug">{tarefa.title}</h2>
              {tarefa.description && <p className="text-sm text-slate-300 mt-1 line-clamp-2">{tarefa.description}</p>}
            </div>
            <button onClick={onClose} className="shrink-0 text-white/50 hover:text-white transition-colors p-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
              <Select value={tarefa.status} onValueChange={(v) => onStatusChange(tarefa, v as TaskStatus)} disabled={updating}>
                <SelectTrigger className={cn("h-9 text-xs font-semibold border", sc.bg, sc.color, sc.border)}>
                  {updating ? <ButtonLoader text="Salvando..." /> : <SelectValue />}
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon;
                    return <SelectItem key={s} value={s} className="text-xs"><span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {cfg.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Prioridade</p>
              <div className={cn("h-9 flex items-center gap-2 px-3 rounded-md border border-slate-200 bg-white text-sm", pc.text)}>
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", pc.dot)} />{pc.label}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[{ label: "Prazo", val: tarefa.due_date, red: overdue }, { label: "Inicio", val: tarefa.start_date, red: false }, { label: "Conclusao", val: tarefa.completed_at, red: false }].map((d) => (
              <div key={d.label} className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{d.label}</p>
                <span className={cn("text-sm", d.red ? "text-red-600 font-semibold" : "text-slate-700")}>{fmtDate(d.val)}</span>
              </div>
            ))}
          </div>
          {(tarefa.responsavel_agencia || tarefa.nomade_responsavel) && (
            <div className="grid grid-cols-2 gap-4">
              {tarefa.responsavel_agencia && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Resp. Agencia</p>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-blue-700">{tarefa.responsavel_agencia.name[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-slate-700 truncate">{tarefa.responsavel_agencia.name}</span>
                  </div>
                </div>
              )}
              {tarefa.nomade_responsavel && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nomade</p>
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="h-6 w-6 rounded-full bg-purple-200 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-purple-700">{tarefa.nomade_responsavel.name[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-purple-800 truncate">{tarefa.nomade_responsavel.name}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="border-t border-slate-100" />
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Projeto</p>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><FolderOpen className="h-4 w-4 text-blue-600" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{tarefa.project.title}</p>
                  <p className="text-xs text-slate-500 capitalize">{tarefa.project.status?.replace(/-/g, " ")}{tarefa.project.type ? ` . ${tarefa.project.type}` : ""}</p>
                </div>
              </div>
              {client && (
                <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                  <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4 text-slate-600" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Empresa</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{client.name}</p>
                    {client.cnpj && <p className="text-xs text-slate-500">CNPJ: {client.cnpj}</p>}
                  </div>
                </div>
              )}
              {tarefa.project.consultant && (
                <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-emerald-600" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Cliente</p>
                    <p className="text-sm text-slate-700">{tarefa.project.consultant}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Produto</p>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0"><Package className="h-4 w-4 text-purple-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{tarefa.project_product.product_name_snapshot}</p>
                  {tarefa.project_product.product_code_snapshot && <p className="text-xs font-mono text-slate-500">{tarefa.project_product.product_code_snapshot}</p>}
                  {tarefa.project_product.product_category_snapshot && <p className="text-xs text-slate-500">{tarefa.project_product.product_category_snapshot}</p>}
                </div>
              </div>
            </div>
          </div>
          {steps.length > 0 && (
            <>
              <div className="border-t border-slate-100" />
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Etapas ({steps.length})</p>
                <ol className="space-y-2">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm text-slate-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
          {briefing.length > 0 && (
            <>
              <div className="border-t border-slate-100" />
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Briefing ({briefing.length})</p>
                <ul className="space-y-1.5">
                  {briefing.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-blue-500 font-bold shrink-0">Q{i + 1}.</span>{q}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {tarefa.observations && (
            <>
              <div className="border-t border-slate-100" />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Observacoes</p>
                <p className="text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">{tarefa.observations}</p>
              </div>
            </>
          )}
          <div className="border-t border-slate-100 pt-4 flex gap-6 text-xs text-slate-400">
            <span>Criada: {fmtDate(tarefa.created_at)}</span>
            <span>Atualizada: {fmtDate(tarefa.updated_at)}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTarefasPage() {
  const [tarefas, setTarefas] = useState<TarefaOperacional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterEmpresa, setFilterEmpresa] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterNomade, setFilterNomade] = useState("all");
  const [filterResponsavel, setFilterResponsavel] = useState("all");
  const [filterOverdue, setFilterOverdue] = useState(false);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const [selectedTarefa, setSelectedTarefa] = useState<TarefaOperacional | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [launchTask, setLaunchTask] = useState<TarefaOperacional | null>(null);
  const [launchDrawerOpen, setLaunchDrawerOpen] = useState(false);

  const [assignTask, setAssignTask] = useState<TarefaOperacional | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const [projectPanelData, setProjectPanelData] = useState<any | null>(null);
  const [projectPanelOpen, setProjectPanelOpen] = useState(false);

  const fetchTarefas = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiClient.getOperationalTasks();
      setTarefas(res?.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Erro desconhecido ao carregar tarefas.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTarefas(); }, [fetchTarefas]);

  const handleOpenProject = useCallback(async (task: TarefaOperacional) => {
    try {
      const res = await apiClient.getProject(task.project_id);
      setProjectPanelData(res ?? null);
      setProjectPanelOpen(true);
    } catch {
      setProjectPanelData({ ...task.project, id: task.project_id });
      setProjectPanelOpen(true);
    }
  }, []);

  const uniqueProjects = useMemo(() => {
    const map = new Map<string, string>();
    tarefas.forEach((t) => map.set(t.project_id, t.project.title));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const uniqueEmpresas = useMemo(() => {
    const map = new Map<string, string>();
    tarefas.forEach((t) => { if (t.project.client) map.set(t.project.client.id, t.project.client.name); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const uniqueProducts = useMemo(
    () => Array.from(new Set(tarefas.map((t) => t.project_product.product_name_snapshot))).sort(),
    [tarefas],
  );

  const uniqueNomades = useMemo(() => {
    const map = new Map<string, string>();
    tarefas.forEach((t) => { if (t.nomade_responsavel) map.set(t.nomade_responsavel.id, t.nomade_responsavel.name); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const uniqueResponsaveis = useMemo(() => {
    const map = new Map<string, string>();
    tarefas.forEach((t) => { if (t.responsavel_agencia) map.set(t.responsavel_agencia.id, t.responsavel_agencia.name); });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tarefas]);

  const stats = useMemo(() => ({
    total: tarefas.length,
    paraLancamento: tarefas.filter((t) => t.status === "PARA_LANCAMENTO").length,
    liberadas: tarefas.filter((t) => t.status === "LIBERADA_PARA_EXECUCAO").length,
    emExecucao: tarefas.filter((t) => t.status === "EM_EXECUCAO").length,
    emRevisao: tarefas.filter((t) => t.status === "EM_REVISAO").length,
    emAprovacao: tarefas.filter((t) => t.status === "EM_APROVACAO").length,
    concluidas: tarefas.filter((t) => t.status === "CONCLUIDA").length,
    aguardandoNomade: tarefas.filter((t) => t.status === "AGUARDANDO_NOMADE").length,
  }), [tarefas]);

  const filtered = useMemo(() => tarefas.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (filterProject !== "all" && t.project_id !== filterProject) return false;
    if (filterEmpresa !== "all" && t.project.client?.id !== filterEmpresa) return false;
    if (filterProduct !== "all" && t.project_product.product_name_snapshot !== filterProduct) return false;
    if (filterNomade !== "all" && t.nomade_responsavel?.id !== filterNomade) return false;
    if (filterResponsavel !== "all" && t.responsavel_agencia?.id !== filterResponsavel) return false;
    if (filterOverdue && !isOverdue(t)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) &&
        !t.project.title.toLowerCase().includes(q) &&
        !(t.project.client?.name.toLowerCase().includes(q) ?? false) &&
        !t.project_product.product_name_snapshot.toLowerCase().includes(q) &&
        !(t.code_snapshot?.toLowerCase().includes(q) ?? false) &&
        !(t.nomade_responsavel?.name.toLowerCase().includes(q) ?? false) &&
        !(t.responsavel_agencia?.name.toLowerCase().includes(q) ?? false)
      ) return false;
    }
    return true;
  }), [tarefas, search, filterStatus, filterPriority, filterProject, filterEmpresa, filterProduct, filterNomade, filterResponsavel, filterOverdue]);

  const PRIO_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "code": av = a.code_snapshot ?? ""; bv = b.code_snapshot ?? ""; break;
        case "title": av = a.title; bv = b.title; break;
        case "project": av = a.project.title; bv = b.project.title; break;
        case "empresa": av = a.project.client?.name ?? ""; bv = b.project.client?.name ?? ""; break;
        case "cliente": av = a.project.consultant ?? ""; bv = b.project.consultant ?? ""; break;
        case "product": av = a.project_product.product_name_snapshot; bv = b.project_product.product_name_snapshot; break;
        case "status": av = a.status; bv = b.status; break;
        case "responsavel": av = a.responsavel_agencia?.name ?? ""; bv = b.responsavel_agencia?.name ?? ""; break;
        case "nomade": av = a.nomade_responsavel?.name ?? ""; bv = b.nomade_responsavel?.name ?? ""; break;
        case "priority": av = PRIO_ORDER[a.priority] ?? 99; bv = PRIO_ORDER[b.priority] ?? 99; break;
        case "due_date": av = a.due_date ?? ""; bv = b.due_date ?? ""; break;
        default: av = a.created_at; bv = b.created_at;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = useMemo(() => sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE), [sorted, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));

  const toggleSort = (field: string) => {
    if (sortKey === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(field); setSortDir("asc"); }
    setPage(1);
  };

  const clearFilters = () => {
    setSearch(""); setFilterStatus("all"); setFilterPriority("all");
    setFilterProject("all"); setFilterEmpresa("all"); setFilterProduct("all");
    setFilterNomade("all"); setFilterResponsavel("all"); setFilterOverdue(false);
    setPage(1);
  };

  const hasActiveFilters = !!(search || filterStatus !== "all" || filterPriority !== "all" ||
    filterProject !== "all" || filterEmpresa !== "all" || filterProduct !== "all" ||
    filterNomade !== "all" || filterResponsavel !== "all" || filterOverdue);

  const handleStatusChange = useCallback(async (tarefa: TarefaOperacional, newStatus: TaskStatus) => {
    if (tarefa.status === newStatus) return;
    setUpdatingId(tarefa.id);
    try {
      await apiClient.updateProjectTask(tarefa.id, { status: newStatus });
      setTarefas((prev) => prev.map((t) => t.id === tarefa.id
        ? { ...t, status: newStatus, completed_at: newStatus === "CONCLUIDA" ? new Date().toISOString() : t.completed_at }
        : t));
      if (selectedTarefa?.id === tarefa.id)
        setSelectedTarefa((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch { }
    finally { setUpdatingId(null); }
  }, [selectedTarefa]);

  const handleReleased = useCallback((taskId: string) => {
    setTarefas((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "LIBERADA_PARA_EXECUCAO" as TaskStatus } : t));
    setLaunchDrawerOpen(false);
  }, []);

  const handleNomadeAssigned = useCallback((taskId: string, nomade: any) => {
    setTarefas((prev) => prev.map((t) => t.id === taskId
      ? { ...t, nomade_responsavel_id: nomade?.id ?? null, nomade_responsavel: nomade ?? null }
      : t));
  }, []);

  const statCards = [
    { label: "Total", value: stats.total, grad: "from-slate-600 to-slate-800", status: null },
    { label: "Para lancamento", value: stats.paraLancamento, grad: "from-slate-500 to-slate-600", status: "PARA_LANCAMENTO" },
    { label: "Liberadas p/ exec.", value: stats.liberadas, grad: "from-cyan-500 to-cyan-700", status: "LIBERADA_PARA_EXECUCAO" },
    { label: "Em execucao", value: stats.emExecucao, grad: "from-blue-500 to-blue-700", status: "EM_EXECUCAO" },
    { label: "Em revisao", value: stats.emRevisao, grad: "from-amber-500 to-yellow-600", status: "EM_REVISAO" },
    { label: "Em aprovacao", value: stats.emAprovacao, grad: "from-violet-500 to-violet-700", status: "EM_APROVACAO" },
    { label: "Concluidas", value: stats.concluidas, grad: "from-emerald-500 to-emerald-700", status: "CONCLUIDA" },
    { label: "Ag. Nomade", value: stats.aguardandoNomade, grad: "from-purple-500 to-purple-700", status: "AGUARDANDO_NOMADE" },
  ];

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-6 p-4 md:p-8">

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shrink-0">
            <CheckSquare2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tarefas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Tarefas operacionais reais geradas a partir dos produtos contratados.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTarefas} disabled={loading} className="shrink-0 gap-2 h-9">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Nao foi possivel carregar as tarefas.</p>
              <p className="text-xs text-red-500 mt-0.5 truncate">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchTarefas} className="shrink-0 text-red-700">Tentar novamente</Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {statCards.map((c) => (
              <button key={c.label}
                onClick={() => { clearFilters(); if (c.status) setFilterStatus(c.status); }}
                className={cn("rounded-xl bg-gradient-to-br px-3 py-3 text-white shadow-sm text-left transition-all hover:scale-[1.02] active:scale-[0.98]", c.grad)}>
                <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70 leading-none mb-1.5 line-clamp-1">{c.label}</p>
                <p className="text-xl font-black leading-none">{c.value}</p>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <Input placeholder="Buscar tarefa, projeto, empresa, nomade..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="h-9 pl-9 text-sm" />
                {search && (
                  <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {ALL_STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {(["urgent", "high", "medium", "low"] as Priority[]).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">{PRIORITY_CONFIG[p].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={() => { setFilterOverdue((v) => !v); setPage(1); }}
                className={cn("h-9 px-3 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0",
                  filterOverdue ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}>
                <AlertCircle className="h-3.5 w-3.5" /> Atrasadas
              </button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs gap-1.5 text-slate-500">
                  <X className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterProject} onValueChange={(v) => { setFilterProject(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {uniqueProjects.map(([id, title]) => <SelectItem key={id} value={id} className="text-xs">{title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterEmpresa} onValueChange={(v) => { setFilterEmpresa(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {uniqueEmpresas.map(([id, name]) => <SelectItem key={id} value={id} className="text-xs">{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterProduct} onValueChange={(v) => { setFilterProduct(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue placeholder="Produto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os produtos</SelectItem>
                  {uniqueProducts.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {uniqueNomades.length > 0 && (
                <Select value={filterNomade} onValueChange={(v) => { setFilterNomade(v); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Nomade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os nomades</SelectItem>
                    {uniqueNomades.map(([id, name]) => <SelectItem key={id} value={id} className="text-xs">{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {uniqueResponsaveis.length > 0 && (
                <Select value={filterResponsavel} onValueChange={(v) => { setFilterResponsavel(v); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue placeholder="Responsavel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os responsaveis</SelectItem>
                    {uniqueResponsaveis.map(([id, name]) => <SelectItem key={id} value={id} className="text-xs">{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {sorted.length} tarefa{sorted.length !== 1 ? "s" : ""}
              {hasActiveFilters ? ` encontrada${sorted.length !== 1 ? "s" : ""} (de ${tarefas.length} total)` : " no total"}
            </p>
          </div>
        )}

        {loading && <PageLoader text="Carregando tarefas operacionais..." />}

        {!loading && !error && tarefas.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <CheckSquare2 className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-700 mb-1">Nenhuma tarefa operacional encontrada.</h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">Tarefas sao geradas automaticamente quando produtos sao vinculados a projetos contratados.</p>
            </div>
          </div>
        )}

        {!loading && !error && tarefas.length > 0 && sorted.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center text-center gap-3">
            <Filter className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Nenhuma tarefa com os filtros aplicados.</p>
            <button onClick={clearFilters} className="text-xs text-blue-600 underline hover:no-underline">Limpar filtros</button>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1200px]">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <Th label="Codigo" field="code" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="pl-4 w-24" />
                    <Th label="Tarefa" field="title" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[200px]" />
                    <Th label="Projeto" field="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[140px]" />
                    <Th label="Empresa" field="empresa" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[130px]" />
                    <Th label="Cliente" field="cliente" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[120px]" />
                    <Th label="Produto" field="product" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[150px]" />
                    <Th label="Status" field="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="w-[162px]" />
                    <Th label="Resp. Agencia" field="responsavel" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[120px]" />
                    <Th label="Nomade" field="nomade" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="min-w-[120px]" />
                    <Th label="Prazo" field="due_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="w-24" />
                    <th className="px-3 py-3 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((tarefa) => {
                    const overdue = isOverdue(tarefa);
                    const client = tarefa.project?.client;
                    const updatingThis = updatingId === tarefa.id;
                    const sc = STATUS_CONFIG[tarefa.status] ?? STATUS_CONFIG.PARA_LANCAMENTO;
                    const canLaunch = ["PARA_LANCAMENTO", "EM_LANCAMENTO", "AGUARDANDO_INFORMACOES"].includes(tarefa.status);
                    return (
                      <tr key={tarefa.id} className={cn("group hover:bg-slate-50 transition-colors", overdue && "bg-red-50/30")}>
                        <td className="px-3 py-3 pl-4">
                          <div className="flex flex-col gap-0.5">
                            {tarefa.code_snapshot ? (
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit">{tarefa.code_snapshot}</span>
                            ) : <span className="text-xs text-slate-300">—</span>}
                            {tarefa.fase && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded w-fit">{tarefa.fase}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <button className="text-left w-full" onClick={() => { setSelectedTarefa(tarefa); setDrawerOpen(true); }}>
                            <p className="font-medium text-slate-800 leading-snug line-clamp-1 hover:text-blue-600 transition-colors">{tarefa.title}</p>
                            {tarefa.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{tarefa.description}</p>}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <FolderOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 line-clamp-1">{tarefa.project.title}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {client ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-sm text-slate-700 line-clamp-1">{client.name}</span>
                            </div>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {tarefa.project.consultant ? (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="text-sm text-slate-700 line-clamp-1">{tarefa.project.consultant}</span>
                            </div>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm text-slate-700 line-clamp-1">{tarefa.project_product.product_name_snapshot}</p>
                          {tarefa.project_product.product_category_snapshot && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{tarefa.project_product.product_category_snapshot}</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {updatingThis ? (
                            <InlineLoader text="..." className="py-1 justify-start" />
                          ) : (
                            <Select value={tarefa.status} onValueChange={(v) => handleStatusChange(tarefa, v as TaskStatus)}>
                              <SelectTrigger className={cn("h-7 text-[11px] font-semibold border w-[150px]", sc.bg, sc.color, sc.border)}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_STATUSES.map((s) => {
                                  const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon;
                                  return <SelectItem key={s} value={s} className="text-xs"><span className="flex items-center gap-1.5"><Icon className="h-3 w-3" /> {cfg.label}</span></SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {tarefa.responsavel_agencia ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-blue-700">{tarefa.responsavel_agencia.name[0]?.toUpperCase()}</span>
                              </div>
                              <span className="text-xs text-slate-700 line-clamp-1">{tarefa.responsavel_agencia.name}</span>
                            </div>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {tarefa.nomade_responsavel ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-purple-700">{tarefa.nomade_responsavel.name[0]?.toUpperCase()}</span>
                              </div>
                              <span className="text-xs text-purple-800 line-clamp-1">{tarefa.nomade_responsavel.name}</span>
                            </div>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className={cn("text-sm", overdue ? "text-red-600 font-semibold" : "text-slate-600")}>{fmtDate(tarefa.due_date)}</span>
                          {overdue && <span className="block text-[10px] text-red-500">atrasada</span>}
                        </td>
                        <td className="px-3 py-3 pr-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="sr-only">Acoes</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem className="text-sm gap-2" onClick={() => { setSelectedTarefa(tarefa); setDrawerOpen(true); }}>
                                <Eye className="h-3.5 w-3.5 text-slate-500" /> Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {canLaunch && (
                                <DropdownMenuItem className="text-sm gap-2" onClick={() => { setLaunchTask(tarefa); setLaunchDrawerOpen(true); }}>
                                  <Rocket className="h-3.5 w-3.5 text-indigo-600" /> Lancar tarefa
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-sm gap-2" onClick={() => { setAssignTask(tarefa); setAssignDialogOpen(true); }}>
                                <UserSearch className="h-3.5 w-3.5 text-purple-600" /> Atribuir nomade manualmente
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="text-sm gap-2">
                                  <CheckSquare2 className="h-3.5 w-3.5 text-blue-500" /> Alterar status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-52">
                                  {ALL_STATUSES.filter((s) => s !== tarefa.status).map((s) => {
                                    const cfg = STATUS_CONFIG[s]; const Icon = cfg.icon;
                                    return (
                                      <DropdownMenuItem key={s} className="text-xs gap-2" onClick={() => handleStatusChange(tarefa, s)}>
                                        <Icon className={cn("h-3.5 w-3.5", cfg.color)} /> {cfg.label}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-sm gap-2" onClick={() => handleOpenProject(tarefa)}>
                                <ExternalLink className="h-3.5 w-3.5 text-slate-500" /> Abrir projeto
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">Pagina {page} de {totalPages} . {sorted.length} tarefas</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                    return <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="h-7 w-7 p-0 text-xs">{p}</Button>;
                  })}
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <TarefaDetailDrawer
        tarefa={selectedTarefa}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        updatingId={updatingId}
      />

      {launchTask && (
        <TaskLaunchDrawer
          task={launchTask}
          onClose={() => setLaunchDrawerOpen(false)}
          onReleased={handleReleased}
          onTaskUpdated={(updated) => {
            setTarefas((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
          }}
        />
      )}

      <AssignNomadeDialog
        open={assignDialogOpen}
        task={assignTask}
        onClose={() => { setAssignDialogOpen(false); setAssignTask(null); }}
        onAssigned={handleNomadeAssigned}
      />

      <ProjectViewSlidePanel
        open={projectPanelOpen}
        project={projectPanelData}
        onClose={() => { setProjectPanelOpen(false); setProjectPanelData(null); }}
      />
    </TooltipProvider>
  );
}
