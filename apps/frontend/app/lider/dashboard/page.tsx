// @ts-nocheck
"use client";

import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Play,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Settings,
  GripVertical,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  LayoutGrid,
  RefreshCw,
  ArrowUpRight,
  BarChart3,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import { useTasks } from "@/hooks/useTasks";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return (n ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDate(s: string) {
  if (!s) return "—";
  try {
    return new Date(
      s + (s.includes("T") ? "" : "T00:00:00"),
    ).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

// ─── Status ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PARA_LANCAMENTO: {
    label: "Para Qualificar",
    color: "bg-blue-100 text-blue-700",
  },
  EM_LANCAMENTO: { label: "Em Lançamento", color: "bg-cyan-100 text-cyan-700" },
  EM_EXECUCAO: { label: "Em Execução", color: "bg-yellow-100 text-yellow-700" },
  EM_REVISAO: { label: "Em Revisão", color: "bg-purple-100 text-purple-700" },
  CONCLUIDA: { label: "Concluída", color: "bg-green-100 text-green-700" },
  CANCELADA: { label: "Cancelada", color: "bg-slate-100 text-slate-500" },
  APROVADA: { label: "Aprovada", color: "bg-emerald-100 text-emerald-700" },
  REPROVADA: { label: "Devolvida", color: "bg-orange-100 text-orange-700" },
  AGUARDANDO_INFORMACOES: {
    label: "Aguardando Info",
    color: "bg-amber-100 text-amber-700",
  },
  LIBERADA_PARA_EXECUCAO: {
    label: "Liberada",
    color: "bg-teal-100 text-teal-700",
  },
};

// ─── Widget system ─────────────────────────────────────────────────────────────

type WidgetId = "kpis" | "toQualify" | "inProgress" | "returned" | "history";

interface LiderWidget {
  id: WidgetId;
  visible: boolean;
  order: number;
  customTitle?: string;
  colSpan: 1 | 2;
}

const WIDGET_META: Record<
  WidgetId,
  {
    defaultTitle: string;
    description: string;
    icon: any;
    defaultColSpan: 1 | 2;
  }
> = {
  kpis: {
    defaultTitle: "Indicadores",
    description: "Resumo de tarefas por status",
    icon: BarChart3,
    defaultColSpan: 2,
  },
  toQualify: {
    defaultTitle: "Para Qualificar",
    description: "Tarefas aguardando lançamento/qualificação",
    icon: CheckSquare,
    defaultColSpan: 2,
  },
  inProgress: {
    defaultTitle: "Em Execução",
    description: "Tarefas em andamento pelos nômades",
    icon: Play,
    defaultColSpan: 2,
  },
  returned: {
    defaultTitle: "Devolvidas / Aguardando",
    description: "Tarefas reprovadas ou aguardando informações",
    icon: RotateCcw,
    defaultColSpan: 2,
  },
  history: {
    defaultTitle: "Histórico",
    description: "Tarefas concluídas e aprovadas recentemente",
    icon: CheckCircle2,
    defaultColSpan: 2,
  },
};

const DEFAULT_WIDGETS: LiderWidget[] = [
  { id: "kpis", visible: true, order: 0, colSpan: 2 },
  { id: "toQualify", visible: true, order: 1, colSpan: 2 },
  { id: "inProgress", visible: true, order: 2, colSpan: 2 },
  { id: "returned", visible: true, order: 3, colSpan: 2 },
  { id: "history", visible: true, order: 4, colSpan: 2 },
];

const STORAGE_KEY = "lider_dashboard_widgets_v1";

function loadWidgets(): LiderWidget[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_WIDGETS;
    const parsed: LiderWidget[] = JSON.parse(saved);
    const ids = new Set(parsed.map((w) => w.id));
    const merged = [...parsed];
    DEFAULT_WIDGETS.forEach((dw) => {
      if (!ids.has(dw.id)) merged.push({ ...dw, visible: false });
    });
    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_WIDGETS;
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-8 text-sm text-slate-400 text-center">{text}</p>;
}

function WidgetCard({
  title,
  colSpan,
  action,
  children,
}: {
  title: string;
  colSpan: 1 | 2;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col",
        colSpan === 2 ? "col-span-2" : "col-span-1",
      )}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Task table ───────────────────────────────────────────────────────────────

function TaskTable({
  tasks,
  showValue,
}: {
  tasks: any[];
  showValue?: boolean;
}) {
  if (tasks.length === 0)
    return <EmptyState text="Nenhuma tarefa neste grupo" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">
              Tarefa
            </th>
            <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5 hidden sm:table-cell">
              Projeto
            </th>
            <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5">
              Status
            </th>
            {showValue && (
              <th className="text-right text-xs font-medium text-slate-500 px-5 py-2.5">
                Valor
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {tasks.slice(0, 10).map((t) => {
            const cfg = STATUS_LABELS[t.status] ?? {
              label: t.status,
              color: "bg-slate-100 text-slate-600",
            };
            return (
              <tr key={t.id} className="hover:bg-slate-50/50">
                <td className="px-5 py-3">
                  <p className="text-xs font-medium text-slate-800 truncate max-w-48">
                    {t.title || t.name}
                  </p>
                  {t.nomade_name && (
                    <p className="text-[10px] text-slate-400">
                      {t.nomade_name}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 hidden sm:table-cell text-xs text-slate-500 truncate max-w-32">
                  {t.project_name ?? t.projectName ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                      cfg.color,
                    )}
                  >
                    {cfg.label}
                  </span>
                </td>
                {showValue && (
                  <td className="px-5 py-3 text-xs font-semibold text-slate-800 text-right">
                    {fmtBRL(t.value ?? t.payment ?? 0)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── CustomizePanel ───────────────────────────────────────────────────────────

function CustomizePanel({
  widgets,
  onClose,
  onSave,
}: {
  widgets: LiderWidget[];
  onClose: () => void;
  onSave: (w: LiderWidget[]) => void;
}) {
  const [draft, setDraft] = useState<LiderWidget[]>(() =>
    [...widgets].sort((a, b) => a.order - b.order),
  );
  const [tab, setTab] = useState<"active" | "library">("active");
  const [editingId, setEditingId] = useState<WidgetId | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const dragIdx = useRef<number | null>(null);

  const sortedActive = draft
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);
  const hiddenWidgets = draft.filter((w) => !w.visible);

  function remove(id: WidgetId) {
    setDraft((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: false } : w)),
    );
  }
  function move(idx: number, dir: -1 | 1) {
    setDraft((prev) => {
      const active = prev
        .filter((w) => w.visible)
        .sort((a, b) => a.order - b.order);
      const hidden = prev.filter((w) => !w.visible);
      const next = idx + dir;
      if (next < 0 || next >= active.length) return prev;
      const arr = [...active];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return [
        ...arr.map((w, i) => ({ ...w, order: i })),
        ...hidden.map((w, i) => ({ ...w, order: arr.length + i })),
      ];
    });
  }
  function toggleColSpan(id: WidgetId) {
    setDraft((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, colSpan: w.colSpan === 2 ? 1 : 2 } : w,
      ),
    );
  }
  function startEdit(w: LiderWidget) {
    setEditingId(w.id);
    setEditTitle(w.customTitle || WIDGET_META[w.id]?.defaultTitle || "");
  }
  function saveTitle() {
    if (!editingId) return;
    setDraft((prev) =>
      prev.map((w) =>
        w.id === editingId
          ? { ...w, customTitle: editTitle.trim() || undefined }
          : w,
      ),
    );
    setEditingId(null);
  }
  function addWidget(id: WidgetId) {
    setDraft((prev) => {
      const maxOrder = Math.max(...prev.map((w) => w.order), -1);
      return prev.map((w) =>
        w.id === id ? { ...w, visible: true, order: maxOrder + 1 } : w,
      );
    });
    setTab("active");
  }
  function onDragStart(idx: number) {
    dragIdx.current = idx;
  }
  function onDragOver(e: React.DragEvent, toIdx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === toIdx) return;
    setDraft((prev) => {
      const active = prev
        .filter((w) => w.visible)
        .sort((a, b) => a.order - b.order);
      const hidden = prev.filter((w) => !w.visible);
      const arr = [...active];
      const [item] = arr.splice(dragIdx.current!, 1);
      arr.splice(toIdx, 0, item);
      dragIdx.current = toIdx;
      return [
        ...arr.map((w, i) => ({ ...w, order: i })),
        ...hidden.map((w, i) => ({ ...w, order: arr.length + i })),
      ];
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-95 bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-rose-600" />
            <span className="font-semibold text-slate-900">
              Personalizar Dashboard
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex border-b border-slate-100">
          {(["active", "library"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "text-rose-600 border-b-2 border-rose-600"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {t === "active"
                ? `Ativos (${sortedActive.length})`
                : `Biblioteca (${hiddenWidgets.length})`}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "active" && (
            <>
              {sortedActive.length === 0 && (
                <EmptyState text="Nenhum widget ativo." />
              )}
              {sortedActive.map((w, idx) => {
                const meta = WIDGET_META[w.id];
                const Icon = meta?.icon ?? LayoutGrid;
                const title = w.customTitle || meta?.defaultTitle || w.id;
                return (
                  <div
                    key={w.id}
                    draggable
                    onDragStart={() => onDragStart(idx)}
                    onDragOver={(e) => onDragOver(e, idx)}
                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-grab active:cursor-grabbing group"
                  >
                    <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                    <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-rose-600" />
                    </div>
                    {editingId === w.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 text-sm border border-rose-300 rounded px-2 py-0.5 outline-none"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                        {title}
                      </span>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === w.id ? (
                        <button
                          onClick={saveTitle}
                          className="p-1 rounded hover:bg-rose-100 text-rose-600"
                        >
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startEdit(w)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleColSpan(w.id)}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === sortedActive.length - 1}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(w.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                      {w.colSpan === 2 ? "Total" : "Metade"}
                    </span>
                  </div>
                );
              })}
            </>
          )}
          {tab === "library" && (
            <>
              {hiddenWidgets.length === 0 && (
                <EmptyState text="Todos os widgets já estão ativos." />
              )}
              {hiddenWidgets.map((w) => {
                const meta = WIDGET_META[w.id];
                const Icon = meta?.icon ?? LayoutGrid;
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {meta?.defaultTitle ?? w.id}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {meta?.description}
                      </p>
                    </div>
                    <button
                      onClick={() => addWidget(w.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-medium"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setDraft([...DEFAULT_WIDGETS])}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Restaurar padrão
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => onSave(draft)}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LiderDashboardPage() {
  const {
    tasks: allTasks,
    loading,
    error,
    refetch,
  } = useTasks({ limit: "200" });
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [widgets, setWidgets] = useState<LiderWidget[]>(() => loadWidgets());
  const [showCustomize, setShowCustomize] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Categorise tasks
  const toQualify = useMemo(
    () =>
      allTasks.filter((t: any) =>
        ["PARA_LANCAMENTO", "EM_LANCAMENTO"].includes(t.status),
      ),
    [allTasks],
  );
  const inProgress = useMemo(
    () =>
      allTasks.filter((t: any) =>
        ["EM_EXECUCAO", "EM_REVISAO", "LIBERADA_PARA_EXECUCAO"].includes(
          t.status,
        ),
      ),
    [allTasks],
  );
  const returned = useMemo(
    () =>
      allTasks.filter((t: any) =>
        ["REPROVADA", "AGUARDANDO_INFORMACOES"].includes(t.status),
      ),
    [allTasks],
  );
  const done = useMemo(
    () =>
      allTasks.filter((t: any) => ["CONCLUIDA", "APROVADA"].includes(t.status)),
    [allTasks],
  );

  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.order - b.order),
    [widgets],
  );

  function getTitle(w: LiderWidget) {
    return w.customTitle || WIDGET_META[w.id]?.defaultTitle || w.id;
  }

  function handleSave(updated: LiderWidget[]) {
    setWidgets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowCustomize(false);
  }

  async function exportPng() {
    if (!dashboardRef.current) return;
    setExportLoading(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: "#f8fafc",
      });
      const a = document.createElement("a");
      a.download = `dashboard-lider-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  }

  if (loading) return <PageLoader text="Carregando painel…" />;

  // ── Widget renderer ─────────────────────────────────────────────────────────
  function renderWidget(w: LiderWidget) {
    const title = getTitle(w);

    if (w.id === "kpis") {
      const kpis = [
        {
          label: "Para Qualificar",
          value: toQualify.length,
          color: "text-cyan-600",
          bg: "bg-cyan-50",
          icon: CheckSquare,
        },
        {
          label: "Em Execução",
          value: inProgress.length,
          color: "text-yellow-600",
          bg: "bg-yellow-50",
          icon: Play,
        },
        {
          label: "Devolvidas",
          value: returned.length,
          color: "text-orange-600",
          bg: "bg-orange-50",
          icon: RotateCcw,
        },
        {
          label: "Concluídas/Aprovadas",
          value: done.length,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          icon: CheckCircle2,
        },
      ];
      return (
        <div
          key={w.id}
          className={cn(
            "grid grid-cols-2 sm:grid-cols-4 gap-4",
            w.colSpan === 2 ? "col-span-2" : "col-span-1",
          )}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center mb-3",
                  k.bg,
                )}
              >
                <k.icon className={cn("h-4 w-4", k.color)} />
              </div>
              <p className="text-xs text-slate-500 mb-1">{k.label}</p>
              <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
            </div>
          ))}
        </div>
      );
    }

    if (w.id === "toQualify") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/lider/tarefas"
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <TaskTable tasks={toQualify} />
        </WidgetCard>
      );
    }

    if (w.id === "inProgress") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/lider/tarefas"
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <TaskTable tasks={inProgress} />
        </WidgetCard>
      );
    }

    if (w.id === "returned") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/lider/tarefas"
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <TaskTable tasks={returned} />
        </WidgetCard>
      );
    }

    if (w.id === "history") {
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          <TaskTable tasks={done} showValue />
        </WidgetCard>
      );
    }

    return null;
  }

  return (
    <>
      <div className="p-6 space-y-6" ref={dashboardRef}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Painel do Líder — gestão de tarefas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {error && (
              <span className="text-xs text-red-500">
                Erro ao carregar tarefas
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportPng}
              disabled={exportLoading}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              {exportLoading ? "Exportando…" : "Exportar PNG"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => setShowCustomize(true)}
            >
              <Settings className="h-3.5 w-3.5" />
              Personalizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedWidgets.filter((w) => w.visible).map((w) => renderWidget(w))}
        </div>
      </div>

      {showCustomize && (
        <CustomizePanel
          widgets={widgets}
          onClose={() => setShowCustomize(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
