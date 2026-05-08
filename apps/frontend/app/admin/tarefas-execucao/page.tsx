// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  FolderOpen,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Eye,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader, InlineLoader } from "@/components/ui/loading";
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

// ── Types ────────────────────────────────────────────────────────────────────

interface ProjectTask {
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
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  sort_order: number;
  phase: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  project: { id: string; title: string; status: string };
  project_product: {
    id: string;
    product_name_snapshot: string;
    product_category_snapshot: string;
    status: string;
  };
  catalog_task: {
    id: string;
    code: string;
    name: string;
    category: string;
  } | null;
}

type TaskStatus =
  | "A_FAZER"
  | "EM_EXECUCAO"
  | "EM_REVISAO"
  | "AGUARDANDO_CLIENTE"
  | "CONCLUIDA"
  | "CANCELADA";

type Priority = "low" | "medium" | "high" | "urgent";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string; icon: any }
> = {
  A_FAZER: {
    label: "A Fazer",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
    icon: Clock,
  },
  EM_EXECUCAO: {
    label: "Em Execução",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    icon: PlayCircle,
  },
  EM_REVISAO: {
    label: "Em Revisão",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    icon: Eye,
  },
  AGUARDANDO_CLIENTE: {
    label: "Ag. Cliente",
    color: "text-orange-700",
    bgColor: "bg-orange-50",
    icon: MessageSquare,
  },
  CONCLUIDA: {
    label: "Concluída",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    icon: CheckCircle2,
  },
  CANCELADA: {
    label: "Cancelada",
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: XCircle,
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
  low: { label: "Baixa", dot: "bg-slate-400" },
  medium: { label: "Média", dot: "bg-blue-400" },
  high: { label: "Alta", dot: "bg-amber-400" },
  urgent: { label: "Urgente", dot: "bg-red-500" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as TaskStatus[];

// ── Main Page Component ───────────────────────────────────────────────────────

export default function AdminTarefasExecucaoPage() {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<"project" | "product" | "status">(
    "project",
  );

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getProjectTasks();
      setTasks(res?.data || []);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = async (
    task: ProjectTask,
    newStatus: TaskStatus,
  ) => {
    if (task.status === newStatus) return;
    setUpdatingId(task.id);
    try {
      await apiClient.updateProjectTask(task.id, { status: newStatus });
      setTasks((prev) =>
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
    } catch (_) {
      // silent — toast could be added
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.project.title.toLowerCase().includes(q) ||
          t.project_product.product_name_snapshot.toLowerCase().includes(q);
        return (
          matchesSearch &&
          (filterStatus === "all" || t.status === filterStatus) &&
          (filterPriority === "all" || t.priority === filterPriority) &&
          (filterProject === "all" || t.project_id === filterProject) &&
          (filterProduct === "all" ||
            t.project_product.product_name_snapshot === filterProduct)
        );
      }),
    [
      tasks,
      searchTerm,
      filterStatus,
      filterPriority,
      filterProject,
      filterProduct,
    ],
  );

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { label: string; sublabel?: string; tasks: ProjectTask[] }
    >();
    for (const t of filteredTasks) {
      let key: string, label: string, sublabel: string | undefined;
      if (groupBy === "project") {
        key = t.project_id;
        label = t.project.title;
        sublabel = t.project.status;
      } else if (groupBy === "product") {
        key = t.project_product_id;
        label = t.project_product.product_name_snapshot;
        sublabel = t.project_product.product_category_snapshot;
      } else {
        key = t.status;
        label = STATUS_CONFIG[t.status]?.label || t.status;
      }
      if (!map.has(key)) map.set(key, { label, sublabel, tasks: [] });
      map.get(key)!.tasks.push(t);
    }
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  }, [filteredTasks, groupBy]);

  const uniqueProjects = useMemo(() => {
    const seen = new Map<string, string>();
    tasks.forEach((t) => seen.set(t.project_id, t.project.title));
    return Array.from(seen.entries());
  }, [tasks]);

  const uniqueProducts = useMemo(
    () =>
      Array.from(
        new Set(tasks.map((t) => t.project_product.product_name_snapshot)),
      ).sort(),
    [tasks],
  );

  const stats = useMemo(
    () => ({
      total: tasks.length,
      aFazer: tasks.filter((t) => t.status === "A_FAZER").length,
      emExecucao: tasks.filter((t) => t.status === "EM_EXECUCAO").length,
      concluidas: tasks.filter((t) => t.status === "CONCLUIDA").length,
      urgentes: tasks.filter((t) => t.priority === "urgent").length,
    }),
    [tasks],
  );

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterProject("all");
    setFilterProduct("all");
  };

  // ── Loading ──
  if (loading) {
    return <PageLoader text="Carregando tarefas…" />;
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              Não foi possível carregar as tarefas
            </p>
            <p className="text-xs mt-0.5 text-red-500">{error}</p>
          </div>
          <button
            onClick={fetchTasks}
            className="shrink-0 text-xs font-medium underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-5 p-4 md:p-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shrink-0">
            <CheckSquare2 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tarefas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Tarefas reais em execução geradas a partir dos produtos vinculados
              aos projetos.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTasks}
            className="shrink-0 gap-2 h-9"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(
            [
              {
                label: "Total",
                value: stats.total,
                color: "from-slate-500 to-slate-700",
              },
              {
                label: "A Fazer",
                value: stats.aFazer,
                color: "from-slate-400 to-slate-600",
              },
              {
                label: "Em Execução",
                value: stats.emExecucao,
                color: "from-blue-500 to-blue-700",
              },
              {
                label: "Concluídas",
                value: stats.concluidas,
                color: "from-emerald-500 to-teal-600",
              },
              {
                label: "Urgentes",
                value: stats.urgentes,
                color: "from-red-500 to-rose-600",
              },
            ] as const
          ).map((s) => (
            <div
              key={s.label}
              className={`rounded-xl bg-gradient-to-br ${s.color} px-3 py-2.5 text-white shadow-sm`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                {s.label}
              </p>
              <p className="text-2xl font-black leading-none mt-0.5">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar tarefa, projeto ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-9 w-[120px] text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {uniqueProjects.map(([id, title]) => (
                <SelectItem key={id} value={id} className="text-xs">
                  {title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {uniqueProducts.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <span className="text-xs text-slate-400 hidden sm:block">
              Agrupar:
            </span>
            {(["project", "product", "status"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`h-7 px-2.5 rounded text-xs font-medium transition-colors ${groupBy === g ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {g === "project"
                  ? "Projeto"
                  : g === "product"
                    ? "Produto"
                    : "Status"}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state — no tasks at all */}
        {tasks.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <CheckSquare2 className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nenhuma tarefa em execução
            </h2>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">
              Vincule produtos aos projetos para gerar tarefas reais. Acesse um
              projeto e adicione produtos a ele.
            </p>
          </div>
        )}

        {/* No results after filter */}
        {tasks.length > 0 && filteredTasks.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 p-10 text-center">
            <Filter className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Nenhuma tarefa encontrada com os filtros aplicados.
            </p>
            <button
              onClick={clearFilters}
              className="mt-3 text-xs text-blue-600 underline hover:no-underline"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Task groups */}
        {grouped.map((group) => (
          <div
            key={group.key}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors text-left"
            >
              {collapsedGroups.has(group.key) ? (
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1 truncate">
                {group.label}
              </span>
              {group.sublabel && (
                <span className="text-xs text-slate-400 hidden sm:block">
                  {group.sublabel}
                </span>
              )}
              <Badge variant="secondary" className="text-xs shrink-0">
                {group.tasks.length} tarefa{group.tasks.length !== 1 ? "s" : ""}
              </Badge>
            </button>

            {/* Tasks */}
            {!collapsedGroups.has(group.key) && (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.tasks.map((task) => {
                  const sc = STATUS_CONFIG[task.status];
                  const pc = PRIORITY_CONFIG[task.priority as Priority];
                  const StatusIcon = sc.icon;
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Priority indicator */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${pc.dot}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>Prioridade: {pc.label}</TooltipContent>
                      </Tooltip>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                            {task.title}
                          </p>
                          {(task.task_code || task.code_snapshot) && (
                            <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-1.5 py-0.5 rounded">
                              {task.task_code ?? task.code_snapshot}
                            </span>
                          )}
                          {task.phase && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              {task.phase}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {groupBy !== "project" && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <FolderOpen className="h-3 w-3" />
                              {task.project.title}
                            </span>
                          )}
                          {groupBy !== "product" && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Package className="h-3 w-3" />
                              {task.project_product.product_name_snapshot}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-xs text-slate-400">
                              Prazo:{" "}
                              {new Date(task.due_date).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Status select */}
                      <div className="shrink-0">
                        {updatingId === task.id ? (
                          <InlineLoader
                            text="Atualizando…"
                            className="h-7 px-3"
                          />
                        ) : (
                          <Select
                            value={task.status}
                            onValueChange={(v) =>
                              handleStatusChange(task, v as TaskStatus)
                            }
                          >
                            <SelectTrigger
                              className={`h-7 w-[130px] text-[11px] font-medium border-0 ${sc.bgColor} ${sc.color}`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1 shrink-0" />
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
                                      <Icon className="h-3 w-3" />
                                      {cfg.label}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
