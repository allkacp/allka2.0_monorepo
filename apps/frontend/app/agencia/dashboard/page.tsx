// @ts-nocheck
"use client";

import { useState, useRef, useMemo } from "react";
import { useAgencia } from "@/contexts/agencia-context";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  CheckSquare,
  TrendingUp,
  ArrowUpRight,
  Tag,
  DollarSign,
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
  AlertCircle,
  CheckCircle2,
  FileText,
  BarChart3,
  Activity,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";

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

// ─── Status configs ───────────────────────────────────────────────────────────

const PROJECT_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; dot: string }
> = {
  briefing: {
    label: "Briefing",
    bg: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
  producao: {
    label: "Produção",
    bg: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  revisao: {
    label: "Revisão",
    bg: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  entregue: {
    label: "Entregue",
    bg: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  aguardando_pagamento: {
    label: "Aguard. Pagamento",
    bg: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  active: {
    label: "Ativo",
    bg: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Concluído",
    bg: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  paused: {
    label: "Pausado",
    bg: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
};

const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; dot: string }
> = {
  available: {
    label: "Disponível",
    bg: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
  in_progress: {
    label: "Em execução",
    bg: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  review: {
    label: "Em revisão",
    bg: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  done: {
    label: "Concluída",
    bg: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelada",
    bg: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  pending: {
    label: "Pendente",
    bg: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
};

const INVOICE_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; dot: string }
> = {
  pending: {
    label: "Pendente",
    bg: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  paid: {
    label: "Pago",
    bg: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  overdue: {
    label: "Vencida",
    bg: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
};

const DEFAULT_STATUS = {
  label: "Desconhecido",
  bg: "bg-slate-100 text-slate-500",
  dot: "bg-slate-300",
};

const PLAN_LABELS: Record<string, string> = {
  "0": "Freemium",
  "500": "Plano 500",
  "1000": "Plano 1000",
  "2000": "Plano 2000",
  "3000": "Plano 3000",
  "5000": "Plano 5000",
};

// ─── Widget system ────────────────────────────────────────────────────────────

type WidgetId =
  | "planHero"
  | "kpis"
  | "projects"
  | "tasks"
  | "invoices"
  | "projectStats"
  | "financialSummary"
  | "taskStats";

interface AgencyWidget {
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
  planHero: {
    defaultTitle: "Plano Atual",
    description: "Plano contratado, MRR e desconto",
    icon: Wallet,
    defaultColSpan: 2,
  },
  kpis: {
    defaultTitle: "Indicadores",
    description: "4 KPIs: projetos, tarefas, desconto, MRR",
    icon: BarChart3,
    defaultColSpan: 2,
  },
  projects: {
    defaultTitle: "Projetos Recentes",
    description: "Projetos recentes com progresso",
    icon: FolderOpen,
    defaultColSpan: 1,
  },
  tasks: {
    defaultTitle: "Tarefas em Andamento",
    description: "Tarefas ativas com status e prazo",
    icon: CheckSquare,
    defaultColSpan: 1,
  },
  projectStats: {
    defaultTitle: "Status dos Projetos",
    description: "Distribuição de projetos por status",
    icon: Activity,
    defaultColSpan: 2,
  },
  taskStats: {
    defaultTitle: "Status das Tarefas",
    description: "Distribuição de tarefas por status",
    icon: CheckCircle2,
    defaultColSpan: 1,
  },
  invoices: {
    defaultTitle: "Faturas",
    description: "Últimas faturas com status e vencimento",
    icon: FileText,
    defaultColSpan: 2,
  },
  financialSummary: {
    defaultTitle: "Resumo Financeiro",
    description: "Total faturado, pendente e recebido",
    icon: DollarSign,
    defaultColSpan: 1,
  },
};

const DEFAULT_WIDGETS: AgencyWidget[] = [
  { id: "planHero", visible: true, order: 0, colSpan: 2 },
  { id: "kpis", visible: true, order: 1, colSpan: 2 },
  { id: "projects", visible: true, order: 2, colSpan: 1 },
  { id: "tasks", visible: true, order: 3, colSpan: 1 },
  { id: "projectStats", visible: true, order: 4, colSpan: 2 },
  { id: "taskStats", visible: true, order: 5, colSpan: 1 },
  { id: "invoices", visible: true, order: 6, colSpan: 2 },
  { id: "financialSummary", visible: false, order: 7, colSpan: 1 },
];

const STORAGE_KEY = "agencia_dashboard_widgets_v2";

function loadWidgets(): AgencyWidget[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_WIDGETS;
    const parsed: AgencyWidget[] = JSON.parse(saved);
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

function saveWidgets(widgets: AgencyWidget[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

// ─── MiniBar ──────────────────────────────────────────────────────────────────

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div
        className={cn("h-1.5 rounded-full transition-all", color)}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ─── WidgetCard ───────────────────────────────────────────────────────────────

function WidgetCard({
  title,
  colSpan,
  action,
  children,
  className,
}: {
  title: string;
  colSpan: 1 | 2;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col",
        colSpan === 2 ? "col-span-2" : "col-span-1",
        className,
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

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-8 text-sm text-slate-400 text-center">{text}</p>;
}

// ─── CustomizePanel ───────────────────────────────────────────────────────────

function CustomizePanel({
  widgets,
  onClose,
  onSave,
}: {
  widgets: AgencyWidget[];
  onClose: () => void;
  onSave: (w: AgencyWidget[]) => void;
}) {
  const [draft, setDraft] = useState<AgencyWidget[]>(() =>
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

  function removeWidget(id: WidgetId) {
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

  function startEdit(w: AgencyWidget) {
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

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === idx) return;
    setDraft((prev) => {
      const active = prev
        .filter((w) => w.visible)
        .sort((a, b) => a.order - b.order);
      const hidden = prev.filter((w) => !w.visible);
      const arr = [...active];
      const [item] = arr.splice(dragIdx.current!, 1);
      arr.splice(idx, 0, item);
      dragIdx.current = idx;
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-indigo-600" />
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

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {(["active", "library"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tab === t
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {t === "active"
                ? `Widgets ativos (${sortedActive.length})`
                : `Biblioteca (${hiddenWidgets.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === "active" && (
            <>
              {sortedActive.length === 0 && (
                <EmptyState text="Nenhum widget ativo. Adicione da biblioteca." />
              )}
              {sortedActive.map((w, idx) => {
                const meta = WIDGET_META[w.id];
                const Icon = meta?.icon ?? LayoutGrid;
                const title = w.customTitle || meta?.defaultTitle || w.id;
                return (
                  <div
                    key={w.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-grab active:cursor-grabbing group"
                  >
                    <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-indigo-600" />
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
                        className="flex-1 text-sm border border-indigo-300 rounded px-2 py-0.5 outline-none"
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
                          className="p-1 rounded hover:bg-indigo-100 text-indigo-600"
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
                        title={
                          w.colSpan === 2
                            ? "Mudar para metade"
                            : "Mudar para largura total"
                        }
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
                        onClick={() => removeWidget(w.id)}
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
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium"
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

        {/* Footer */}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
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

export default function AgenciaDashboard() {
  const { profile, projects, tasks, invoices, loading } = useAgencia();
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [widgets, setWidgets] = useState<AgencyWidget[]>(() => loadWidgets());
  const [showCustomize, setShowCustomize] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const activeProjects = useMemo(
    () =>
      projects.filter(
        (p) => !["entregue", "cancelado", "completed"].includes(p.status),
      ),
    [projects],
  );

  const completedProjects = useMemo(
    () => projects.filter((p) => ["entregue", "completed"].includes(p.status)),
    [projects],
  );

  const activeTasks = useMemo(
    () => tasks.filter((t) => ["in_progress", "review"].includes(t.status)),
    [tasks],
  );

  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === "done"),
    [tasks],
  );

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
        .slice(0, 5),
    [projects],
  );

  const recentInvoices = useMemo(
    () =>
      [...invoices]
        .sort((a: any, b: any) =>
          (b.issuedAt || b.created_at || "").localeCompare(
            a.issuedAt || a.created_at || "",
          ),
        )
        .slice(0, 8),
    [invoices],
  );

  const planLabel =
    PLAN_LABELS[profile?.plan ?? ""] ??
    (profile?.plan ? `Plano ${profile.plan}` : "—");
  const planDiscount = profile?.planDiscount ?? 0;

  const projectStatusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status,
        count,
        pct:
          projects.length > 0 ? Math.round((count / projects.length) * 100) : 0,
        cfg: PROJECT_STATUS_CONFIG[status] ?? DEFAULT_STATUS,
      }));
  }, [projects]);

  const taskStatusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status,
        count,
        pct: tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0,
        cfg: TASK_STATUS_CONFIG[status] ?? DEFAULT_STATUS,
      }));
  }, [tasks]);

  const financialSummary = useMemo(() => {
    const total = invoices.reduce(
      (s: number, inv: any) => s + (inv.amount ?? 0),
      0,
    );
    const paid = invoices
      .filter((inv: any) => inv.status === "paid")
      .reduce((s: number, inv: any) => s + (inv.amount ?? 0), 0);
    const pending = invoices
      .filter((inv: any) => inv.status === "pending")
      .reduce((s: number, inv: any) => s + (inv.amount ?? 0), 0);
    const overdue = invoices
      .filter((inv: any) => inv.status === "overdue")
      .reduce((s: number, inv: any) => s + (inv.amount ?? 0), 0);
    return { total, paid, pending, overdue };
  }, [invoices]);

  // ── Widget helpers ────────────────────────────────────────────────────────────
  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.order - b.order),
    [widgets],
  );

  function getWidgetTitle(w: AgencyWidget) {
    return w.customTitle || WIDGET_META[w.id]?.defaultTitle || w.id;
  }

  function handleSaveCustomize(updated: AgencyWidget[]) {
    setWidgets(updated);
    saveWidgets(updated);
    setShowCustomize(false);
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  async function exportPng() {
    if (!dashboardRef.current) return;
    setExportLoading(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: "#f8fafc",
      });
      const a = document.createElement("a");
      a.download = `dashboard-agencia-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExportLoading(false);
    }
  }

  // ── Early returns ─────────────────────────────────────────────────────────────
  if (loading) return <PageLoader text="Carregando painel…" />;

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
        <AlertCircle className="h-8 w-8 text-slate-300" />
        <p className="text-sm">Nenhum perfil de agência encontrado.</p>
      </div>
    );
  }

  // ── Widget renderer ───────────────────────────────────────────────────────────
  function renderWidget(w: AgencyWidget) {
    const title = getWidgetTitle(w);

    // ── Plan Hero ────────────────────────────────────────────────────────────
    if (w.id === "planHero") {
      return (
        <div
          key={w.id}
          className={cn(
            "rounded-2xl bg-linear-to-r from-indigo-900 to-indigo-700 p-5 text-white shadow-lg",
            w.colSpan === 2 ? "col-span-2" : "col-span-1",
          )}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/60 mb-1">Seu plano atual</p>
              <p className="text-2xl font-bold">{planLabel}</p>
              <p className="text-xs text-white/70 mt-1.5">
                {planDiscount}% de desconto nas contratações
                {profile.partnerName && ` · Partner: ${profile.partnerName}`}
              </p>
            </div>
            <div className="flex gap-6 shrink-0 flex-wrap">
              <div className="text-right">
                <p className="text-xs text-white/60 mb-1">MRR / Consumo</p>
                <p className="text-2xl font-bold">
                  {fmtBRL(profile.currentMrr)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60 mb-1">Projetos</p>
                <p className="text-2xl font-bold">{profile.totalProjects}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60 mb-1">Tarefas</p>
                <p className="text-2xl font-bold">{profile.totalTasks}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── KPIs ─────────────────────────────────────────────────────────────────
    if (w.id === "kpis") {
      const kpis = [
        {
          icon: FolderOpen,
          iconColor: "text-indigo-500",
          iconBg: "bg-indigo-50",
          label: "Projetos Ativos",
          value: activeProjects.length,
          sub: `${projects.length} total · ${completedProjects.length} concluídos`,
        },
        {
          icon: CheckSquare,
          iconColor: "text-blue-500",
          iconBg: "bg-blue-50",
          label: "Tarefas Ativas",
          value: activeTasks.length,
          sub: `${tasks.length} total · ${doneTasks.length} concluídas`,
        },
        {
          icon: Tag,
          iconColor: "text-emerald-500",
          iconBg: "bg-emerald-50",
          label: "Desconto no Plano",
          value: `${planDiscount}%`,
          sub: "nas contratações",
        },
        {
          icon: TrendingUp,
          iconColor: "text-violet-500",
          iconBg: "bg-violet-50",
          label: "MRR / Consumo",
          value: fmtBRL(profile.currentMrr),
          sub: "mês atual",
        },
      ];
      return (
        <div
          key={w.id}
          className={cn(
            "grid grid-cols-2 lg:grid-cols-4 gap-4",
            w.colSpan === 2 ? "col-span-2" : "col-span-1",
          )}
        >
          {kpis.map((kpi, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    kpi.iconBg,
                  )}
                >
                  <kpi.icon className={cn("h-4 w-4", kpi.iconColor)} />
                </div>
                <p className="text-xs font-medium text-slate-500 leading-tight">
                  {kpi.label}
                </p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>
      );
    }

    // ── Projects ──────────────────────────────────────────────────────────────
    if (w.id === "projects") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/agencia/projetos"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="divide-y divide-slate-50">
            {recentProjects.length === 0 ? (
              <EmptyState text="Nenhum projeto encontrado" />
            ) : (
              recentProjects.map((project) => {
                const cfg =
                  PROJECT_STATUS_CONFIG[project.status] ?? DEFAULT_STATUS;
                const pct = Math.round(
                  (project.tasksDone / Math.max(project.tasksTotal, 1)) * 100,
                );
                return (
                  <div key={project.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {project.clientName || "—"}
                        </p>
                      </div>
                      <Badge
                        className={cn(cfg.bg, "border-0 text-xs shrink-0")}
                      >
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>
                          {project.tasksDone}/{project.tasksTotal} tarefas
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                    {project.deliveryDate && (
                      <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        Entrega: {fmtDate(project.deliveryDate)}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </WidgetCard>
      );
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────
    if (w.id === "tasks") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/agencia/tarefas"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="divide-y divide-slate-50">
            {activeTasks.length === 0 ? (
              <EmptyState text="Nenhuma tarefa ativa" />
            ) : (
              activeTasks.slice(0, 6).map((task) => {
                const cfg = TASK_STATUS_CONFIG[task.status] ?? DEFAULT_STATUS;
                return (
                  <div
                    key={task.id}
                    className="px-5 py-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {task.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {task.clientName || task.projectName || "—"}
                      </p>
                      {task.nomadeName && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          👤 {task.nomadeName}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge className={cn(cfg.bg, "border-0 text-xs")}>
                        {cfg.label}
                      </Badge>
                      <p className="text-xs text-slate-400 mt-1">
                        até {fmtDate(task.dueDate)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </WidgetCard>
      );
    }

    // ── Project Stats ─────────────────────────────────────────────────────────
    if (w.id === "projectStats") {
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          {projectStatusDist.length === 0 ? (
            <EmptyState text="Sem projetos para exibir" />
          ) : (
            <div className="px-5 py-4">
              <div
                className={cn(
                  "grid gap-4",
                  w.colSpan === 2
                    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                    : "grid-cols-2",
                )}
              >
                {projectStatusDist.map(({ status, count, pct, cfg }) => (
                  <div key={status} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {cfg.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {count}
                      </span>
                    </div>
                    <MiniBar pct={pct} color={cfg.dot} />
                    <span className="text-[10px] text-slate-400">{pct}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-8">
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {projects.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Ativos</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {activeProjects.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Concluídos</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {completedProjects.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </WidgetCard>
      );
    }

    // ── Task Stats ────────────────────────────────────────────────────────────
    if (w.id === "taskStats") {
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          {taskStatusDist.length === 0 ? (
            <EmptyState text="Sem tarefas para exibir" />
          ) : (
            <div className="px-5 py-4 space-y-3">
              {taskStatusDist.map(({ status, count, pct, cfg }) => (
                <div key={status} className="flex items-center gap-3">
                  <div
                    className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)}
                  />
                  <span className="text-xs text-slate-600 flex-1">
                    {cfg.label}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 w-5 text-right">
                    {count}
                  </span>
                  <div className="w-20 bg-slate-100 rounded-full h-1.5">
                    <div
                      className={cn("h-1.5 rounded-full", cfg.dot)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 w-8 text-right">
                    {pct}%
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 flex items-center gap-6">
                <div>
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-xl font-bold text-slate-900">
                    {tasks.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Em andamento</p>
                  <p className="text-xl font-bold text-blue-600">
                    {activeTasks.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Concluídas</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {doneTasks.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </WidgetCard>
      );
    }

    // ── Invoices ──────────────────────────────────────────────────────────────
    if (w.id === "invoices") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/agencia/financeiro"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {recentInvoices.length === 0 ? (
            <EmptyState text="Nenhuma fatura encontrada" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">
                      Fatura
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5 hidden sm:table-cell">
                      Descrição
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5 hidden md:table-cell">
                      Vencimento
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 px-3 py-2.5">
                      Valor
                    </th>
                    <th className="text-center text-xs font-medium text-slate-500 px-5 py-2.5">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentInvoices.map((inv: any) => {
                    const cfg =
                      INVOICE_STATUS_CONFIG[inv.status] ?? DEFAULT_STATUS;
                    const num =
                      inv.number ||
                      `#${String(inv.id).slice(-6).toUpperCase()}`;
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-3 text-xs font-mono text-slate-600">
                          {num}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600 max-w-40 truncate hidden sm:table-cell">
                          {inv.description || "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500 hidden md:table-cell">
                          {fmtDate(inv.dueDate || inv.due_date)}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-slate-800 text-right">
                          {fmtBRL(inv.amount ?? 0)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Badge className={cn(cfg.bg, "border-0 text-xs")}>
                            {cfg.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </WidgetCard>
      );
    }

    // ── Financial Summary ─────────────────────────────────────────────────────
    if (w.id === "financialSummary") {
      const rows = [
        {
          label: "Total Faturado",
          value: financialSummary.total,
          color: "text-slate-800",
          dot: "bg-slate-500",
        },
        {
          label: "Recebido",
          value: financialSummary.paid,
          color: "text-emerald-700",
          dot: "bg-emerald-500",
        },
        {
          label: "Pendente",
          value: financialSummary.pending,
          color: "text-yellow-700",
          dot: "bg-yellow-500",
        },
        {
          label: "Vencido",
          value: financialSummary.overdue,
          color: "text-red-700",
          dot: "bg-red-500",
        },
      ];
      const paidPct =
        financialSummary.total > 0
          ? Math.round((financialSummary.paid / financialSummary.total) * 100)
          : 0;
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          <div className="px-5 py-4 space-y-3">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", row.dot)} />
                  <span className="text-xs text-slate-500">{row.label}</span>
                </div>
                <span className={cn("text-sm font-semibold", row.color)}>
                  {fmtBRL(row.value)}
                </span>
              </div>
            ))}
            {financialSummary.total > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <MiniBar pct={paidPct} color="bg-emerald-500" />
                <p className="text-[10px] text-slate-400 mt-1">
                  {paidPct}% recebido
                </p>
              </div>
            )}
          </div>
        </WidgetCard>
      );
    }

    return null;
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-6 space-y-6" ref={dashboardRef}>
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Olá, {profile.name.split(" ")[0]} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {profile.cnpj && (
                <span className="mr-2">CNPJ: {profile.cnpj}</span>
              )}
              Aqui está o resumo da sua agência
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setShowCustomize(true)}
            >
              <Settings className="h-3.5 w-3.5" />
              Personalizar
            </Button>
          </div>
        </div>

        {/* Widget grid — 2-col on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedWidgets.filter((w) => w.visible).map((w) => renderWidget(w))}
        </div>
      </div>

      {/* Customize side panel */}
      {showCustomize && (
        <CustomizePanel
          widgets={widgets}
          onClose={() => setShowCustomize(false)}
          onSave={handleSaveCustomize}
        />
      )}
    </>
  );
}
