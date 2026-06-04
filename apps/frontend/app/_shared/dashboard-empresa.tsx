// @ts-nocheck
"use client";

// Shared render logic for /company/dashboard and /empresa/dashboard
// Both portals use the same EmpresaContext data — only the storageKey differs.

import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CheckSquare,
  DollarSign,
  FileText,
  Users,
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
  ArrowUpRight,
  RefreshCw,
  Building2,
  Wallet,
  BarChart3,
  Activity,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import { useEmpresa } from "@/contexts/empresa-context";

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

function fmtNum(n: number) {
  return (n ?? 0).toLocaleString("pt-BR");
}

// ─── Status configs ───────────────────────────────────────────────────────────

const PROJECT_STATUS: Record<string, { label: string; bg: string }> = {
  briefing: { label: "Briefing", bg: "bg-slate-100 text-slate-600" },
  producao: { label: "Produção", bg: "bg-blue-100 text-blue-700" },
  revisao: { label: "Revisão", bg: "bg-amber-100 text-amber-700" },
  entregue: { label: "Entregue", bg: "bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado", bg: "bg-red-100 text-red-700" },
  aguardando_pagamento: {
    label: "Ag. Pagamento",
    bg: "bg-yellow-100 text-yellow-700",
  },
  active: { label: "Ativo", bg: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", bg: "bg-emerald-100 text-emerald-700" },
  paused: { label: "Pausado", bg: "bg-slate-100 text-slate-500" },
};

const TASK_STATUS: Record<string, { label: string; bg: string }> = {
  available: { label: "Disponível", bg: "bg-slate-100 text-slate-500" },
  in_progress: { label: "Em execução", bg: "bg-blue-100 text-blue-700" },
  review: { label: "Em revisão", bg: "bg-amber-100 text-amber-700" },
  done: { label: "Concluída", bg: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada", bg: "bg-red-100 text-red-700" },
  pending: { label: "Pendente", bg: "bg-yellow-100 text-yellow-700" },
};

const INVOICE_STATUS: Record<string, { label: string; bg: string }> = {
  pending: { label: "Pendente", bg: "bg-yellow-100 text-yellow-700" },
  paid: { label: "Pago", bg: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Vencida", bg: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", bg: "bg-slate-100 text-slate-500" },
};

const PLAN_LABELS: Record<string, string> = {
  "0": "Freemium",
  "500": "Plano 500",
  "1000": "Plano 1000",
  "2000": "Plano 2000",
  "3000": "Plano 3000",
  "5000": "Plano 5000",
};

// ─── Widget system ─────────────────────────────────────────────────────────────

type WidgetId =
  | "planHero"
  | "kpis"
  | "projects"
  | "tasks"
  | "projectStats"
  | "teamMembers"
  | "invoices"
  | "financialSummary";

interface EmpresaWidget {
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
    defaultTitle: "Minha Empresa",
    description: "Resumo do plano e status da conta",
    icon: Building2,
    defaultColSpan: 2,
  },
  kpis: {
    defaultTitle: "Indicadores",
    description: "Projetos, tarefas, faturas e investimento",
    icon: BarChart3,
    defaultColSpan: 2,
  },
  projects: {
    defaultTitle: "Projetos",
    description: "Lista de projetos e status",
    icon: Briefcase,
    defaultColSpan: 2,
  },
  tasks: {
    defaultTitle: "Tarefas",
    description: "Tarefas dos projetos",
    icon: CheckSquare,
    defaultColSpan: 2,
  },
  projectStats: {
    defaultTitle: "Estatísticas",
    description: "Status geral dos projetos",
    icon: Activity,
    defaultColSpan: 1,
  },
  teamMembers: {
    defaultTitle: "Equipe",
    description: "Nômades alocados nos projetos",
    icon: Users,
    defaultColSpan: 1,
  },
  invoices: {
    defaultTitle: "Faturas",
    description: "Histórico de faturas e cobranças",
    icon: FileText,
    defaultColSpan: 2,
  },
  financialSummary: {
    defaultTitle: "Resumo Financeiro",
    description: "Investimento, pendências e pagamentos",
    icon: Wallet,
    defaultColSpan: 1,
  },
};

const DEFAULT_WIDGETS: EmpresaWidget[] = [
  { id: "planHero", visible: true, order: 0, colSpan: 2 },
  { id: "kpis", visible: true, order: 1, colSpan: 2 },
  { id: "projects", visible: true, order: 2, colSpan: 2 },
  { id: "tasks", visible: true, order: 3, colSpan: 2 },
  { id: "projectStats", visible: true, order: 4, colSpan: 1 },
  { id: "teamMembers", visible: true, order: 5, colSpan: 1 },
  { id: "invoices", visible: true, order: 6, colSpan: 2 },
  { id: "financialSummary", visible: false, order: 7, colSpan: 1 },
];

// ─── Shared sub-components ────────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return <p className="px-5 py-8 text-sm text-slate-400 text-center">{text}</p>;
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div
        className={cn("h-1.5 rounded-full", color)}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

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

// ─── CustomizePanel ───────────────────────────────────────────────────────────

function CustomizePanel({
  widgets,
  onClose,
  onSave,
}: {
  widgets: EmpresaWidget[];
  onClose: () => void;
  onSave: (w: EmpresaWidget[]) => void;
}) {
  const [draft, setDraft] = useState<EmpresaWidget[]>(() =>
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
  function startEdit(w: EmpresaWidget) {
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
            <LayoutGrid className="h-4 w-4 text-blue-600" />
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
                  ? "text-blue-600 border-b-2 border-blue-600"
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
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-blue-600" />
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
                        className="flex-1 text-sm border border-blue-300 rounded px-2 py-0.5 outline-none"
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
                          className="p-1 rounded hover:bg-blue-100 text-blue-600"
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
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium"
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
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

// ─── Main shared component ────────────────────────────────────────────────────

export function EmpresaDashboard({
  storageKey,
  projectsPath,
  tasksPath,
  invoicesPath,
}: {
  storageKey: string;
  projectsPath: string;
  tasksPath: string;
  invoicesPath: string;
}) {
  const { profile, projects, tasks, invoices, loading, refetch } = useEmpresa();
  const dashboardRef = useRef<HTMLDivElement>(null);

  function loadWidgets(): EmpresaWidget[] {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return DEFAULT_WIDGETS;
      const parsed: EmpresaWidget[] = JSON.parse(saved);
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

  const [widgets, setWidgets] = useState<EmpresaWidget[]>(() => loadWidgets());
  const [showCustomize, setShowCustomize] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.order - b.order),
    [widgets],
  );

  function getTitle(w: EmpresaWidget) {
    return w.customTitle || WIDGET_META[w.id]?.defaultTitle || w.id;
  }

  function handleSave(updated: EmpresaWidget[]) {
    setWidgets(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
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
      a.download = `dashboard-empresa-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  }

  if (loading) return <PageLoader text="Carregando painel…" />;

  // ── Widget stats ────────────────────────────────────────────────────────────
  const activeProjects = projects.filter(
    (p) => !["entregue", "cancelado", "completed"].includes(p.status),
  );
  const activeTasks = tasks.filter((t) => t.status === "in_progress");
  const pendingInvoices = invoices.filter((inv) => inv.status === "pending");
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  const totalPaid = paidInvoices.reduce((s, inv) => s + inv.amount, 0);
  const totalPending = pendingInvoices.reduce((s, inv) => s + inv.amount, 0);
  const totalInvested =
    profile?.totalInvested ?? projects.reduce((s, p) => s + (p.value ?? 0), 0);

  // ── Widget renderer ─────────────────────────────────────────────────────────
  function renderWidget(w: EmpresaWidget) {
    const title = getTitle(w);

    // planHero
    if (w.id === "planHero") {
      const planLabel =
        PLAN_LABELS[String(profile?.plan)] ?? profile?.plan ?? "—";
      const isActive = profile?.status === "active";
      return (
        <div
          key={w.id}
          className={cn(
            "bg-linear-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm",
            w.colSpan === 2 ? "col-span-2" : "col-span-1",
          )}
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-blue-200 text-sm font-medium">Empresa</p>
              <h2 className="text-2xl font-bold mt-1">
                {profile?.name ?? "Minha empresa"}
              </h2>
              <p className="text-blue-200 text-sm mt-1">
                {profile?.cnpj ?? ""}
              </p>
            </div>
            <div className="text-right">
              <span
                className={cn(
                  "inline-block px-3 py-1 rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-emerald-500/30 text-emerald-100"
                    : "bg-red-500/30 text-red-100",
                )}
              >
                {isActive ? "Ativa" : "Suspensa"}
              </span>
              <p className="text-blue-200 text-sm mt-2">Plano</p>
              <p className="text-xl font-bold">{planLabel}</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              {
                label: "Projetos Ativos",
                value: fmtNum(activeProjects.length),
              },
              { label: "Tarefas Abertas", value: fmtNum(activeTasks.length) },
              { label: "Total Investido", value: fmtBRL(totalInvested) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 rounded-xl px-3 py-2.5"
              >
                <p className="text-blue-200 text-xs">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // kpis
    if (w.id === "kpis") {
      const kpis = [
        {
          label: "Total de Projetos",
          value: fmtNum(projects.length),
          sub: `${activeProjects.length} ativos`,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Tarefas em Andamento",
          value: fmtNum(activeTasks.length),
          sub: `${tasks.length} no total`,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "Faturas Pagas",
          value: fmtBRL(totalPaid),
          sub: `${paidInvoices.length} faturas`,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "Faturas Pendentes",
          value: fmtBRL(totalPending),
          sub: `${pendingInvoices.length} pendentes`,
          color: "text-red-600",
          bg: "bg-red-50",
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
              <p className="text-xs text-slate-500 mb-2">{k.label}</p>
              <p className={cn("text-xl font-bold", k.color)}>{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      );
    }

    // projects
    if (w.id === "projects") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to={projectsPath}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {projects.length === 0 ? (
            <EmptyState text="Nenhum projeto encontrado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">
                      Projeto
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5 hidden sm:table-cell">
                      Valor
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-2.5">
                      Entrega
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {projects.slice(0, 8).map((p) => {
                    const cfg = PROJECT_STATUS[p.status] ?? {
                      label: p.status,
                      bg: "bg-slate-100 text-slate-600",
                    };
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <p className="text-xs font-medium text-slate-800 truncate max-w-40">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {p.category}
                          </p>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell text-xs text-slate-600">
                          {fmtBRL(p.value)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              cfg.bg,
                            )}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400 text-right whitespace-nowrap">
                          {fmtDate(p.deliveryDate ?? "")}
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

    // tasks
    if (w.id === "tasks") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to={tasksPath}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {tasks.length === 0 ? (
            <EmptyState text="Nenhuma tarefa encontrada" />
          ) : (
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
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-2.5">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tasks.slice(0, 8).map((t) => {
                    const cfg = TASK_STATUS[t.status] ?? {
                      label: t.status,
                      bg: "bg-slate-100 text-slate-600",
                    };
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <p className="text-xs font-medium text-slate-800 truncate max-w-40">
                            {t.name}
                          </p>
                          {t.nomadeName && (
                            <p className="text-[10px] text-slate-400">
                              {t.nomadeName}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell text-xs text-slate-500 truncate max-w-32">
                          {t.projectName}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              cfg.bg,
                            )}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-700 text-right font-medium">
                          {fmtBRL(t.value)}
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

    // projectStats
    if (w.id === "projectStats") {
      const statusCounts: Record<string, number> = {};
      projects.forEach((p) => {
        statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
      });
      const entries = Object.entries(statusCounts).sort(
        ([, a], [, b]) => b - a,
      );
      const total = projects.length || 1;
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          <div className="px-5 py-4 space-y-3">
            {entries.length === 0 ? (
              <EmptyState text="Sem dados" />
            ) : (
              entries.map(([status, count]) => {
                const cfg = PROJECT_STATUS[status] ?? {
                  label: status,
                  bg: "bg-slate-100 text-slate-600",
                };
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{cfg.label}</span>
                      <span className="font-medium text-slate-800">
                        {count}
                      </span>
                    </div>
                    <MiniBar pct={pct} color="bg-blue-400" />
                  </div>
                );
              })
            )}
          </div>
        </WidgetCard>
      );
    }

    // teamMembers
    if (w.id === "teamMembers") {
      const nomadeNames = new Set<string>();
      projects.forEach((p) => {
        (p.nomadeNames ?? []).forEach((n) => nomadeNames.add(n));
        (p.teamMembers ?? []).forEach((m: any) => nomadeNames.add(m.name));
      });
      const names = [...nomadeNames].slice(0, 8);
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          {names.length === 0 ? (
            <EmptyState text="Nenhum nômade alocado" />
          ) : (
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {names.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5 border border-slate-100"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-700">{name}</span>
                </div>
              ))}
            </div>
          )}
        </WidgetCard>
      );
    }

    // invoices
    if (w.id === "invoices") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to={invoicesPath}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {invoices.length === 0 ? (
            <EmptyState text="Nenhuma fatura encontrada" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 px-5 py-2.5">
                      Descrição
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5 hidden sm:table-cell">
                      Vencimento
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 px-3 py-2.5">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 px-5 py-2.5">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoices.slice(0, 8).map((inv) => {
                    const cfg = INVOICE_STATUS[inv.status] ?? {
                      label: inv.status,
                      bg: "bg-slate-100 text-slate-600",
                    };
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-xs font-medium text-slate-800 truncate max-w-40">
                          {inv.description}
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell text-xs text-slate-500">
                          {fmtDate(inv.dueDate)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              cfg.bg,
                            )}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-800 font-semibold text-right">
                          {fmtBRL(inv.amount)}
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

    // financialSummary
    if (w.id === "financialSummary") {
      const rows = [
        {
          label: "Total Investido",
          value: fmtBRL(totalInvested),
          dot: "bg-indigo-500",
        },
        {
          label: "Faturas Pagas",
          value: fmtBRL(totalPaid),
          dot: "bg-emerald-500",
        },
        {
          label: "Faturas Pendentes",
          value: fmtBRL(totalPending),
          dot: "bg-yellow-500",
        },
      ];
      const pct =
        totalPaid + totalPending > 0
          ? Math.round((totalPaid / (totalPaid + totalPending)) * 100)
          : 0;
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          <div className="px-5 py-4 space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", r.dot)} />
                  <span className="text-xs text-slate-500">{r.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">
                  {r.value}
                </span>
              </div>
            ))}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Percentual pago</span>
                <span>{pct}%</span>
              </div>
              <MiniBar pct={pct} color="bg-emerald-500" />
            </div>
          </div>
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
              {profile?.name ?? "Minha empresa"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
              className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
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
