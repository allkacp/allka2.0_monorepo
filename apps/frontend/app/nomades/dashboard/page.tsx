// @ts-nocheck
"use client";

import { useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Star,
  Wallet,
  Target,
  ArrowUpRight,
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
  Clock,
  Award,
  DollarSign,
  Activity,
  BarChart3,
  User,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Zap,
  Medal,
  FileText,
  RotateCcw,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import { useTasks } from "@/hooks/useTasks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Status configs ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; dot: string }
> = {
  PARA_LANCAMENTO: {
    label: "Para Qualificar",
    bg: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  EM_LANCAMENTO: {
    label: "Em Lançamento",
    bg: "bg-cyan-100 text-cyan-700",
    dot: "bg-cyan-500",
  },
  EM_EXECUCAO: {
    label: "Em Execução",
    bg: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  EM_REVISAO: {
    label: "Em Revisão",
    bg: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
  CONCLUIDA: {
    label: "Concluída",
    bg: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  CANCELADA: {
    label: "Cancelada",
    bg: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
  APROVADA: {
    label: "Aprovada",
    bg: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  REPROVADA: {
    label: "Devolvida",
    bg: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
  },
  AGUARDANDO_INFORMACOES: {
    label: "Aguardando Info",
    bg: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
  LIBERADA_PARA_EXECUCAO: {
    label: "Liberada",
    bg: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  available: {
    label: "Disponível",
    bg: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "Em execução",
    bg: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  review: {
    label: "Em revisão",
    bg: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
  done: {
    label: "Concluída",
    bg: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelada",
    bg: "bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
};
const DEFAULT_STATUS = {
  label: "Desconhecido",
  bg: "bg-slate-100 text-slate-500",
  dot: "bg-slate-300",
};

// ─── Level config ─────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  string,
  {
    label: string;
    emoji: string;
    color: string;
    textMuted: string;
    barColor: string;
    bonus: number;
    nextLevel?: string;
    tasksNeeded: number;
  }
> = {
  bronze: {
    label: "Bronze",
    emoji: "🥉",
    color: "from-amber-500 to-amber-700",
    textMuted: "text-amber-200",
    barColor: "bg-amber-300",
    bonus: 0,
    nextLevel: "silver",
    tasksNeeded: 20,
  },
  silver: {
    label: "Silver",
    emoji: "🥈",
    color: "from-slate-400 to-slate-600",
    textMuted: "text-slate-200",
    barColor: "bg-slate-300",
    bonus: 5,
    nextLevel: "gold",
    tasksNeeded: 50,
  },
  gold: {
    label: "Gold",
    emoji: "🥇",
    color: "from-yellow-500 to-yellow-700",
    textMuted: "text-yellow-200",
    barColor: "bg-yellow-300",
    bonus: 10,
    nextLevel: "platinum",
    tasksNeeded: 100,
  },
  platinum: {
    label: "Platinum",
    emoji: "✨",
    color: "from-sky-400 to-sky-700",
    textMuted: "text-sky-200",
    barColor: "bg-sky-300",
    bonus: 15,
    nextLevel: "diamond",
    tasksNeeded: 200,
  },
  diamond: {
    label: "Diamond",
    emoji: "💎",
    color: "from-violet-500 to-purple-700",
    textMuted: "text-violet-200",
    barColor: "bg-violet-300",
    bonus: 20,
    tasksNeeded: 999,
  },
};

// ─── Widget system ─────────────────────────────────────────────────────────────

type WidgetId =
  | "profileHero"
  | "kpis"
  | "availableTasks"
  | "activeTasks"
  | "taskHistory"
  | "earnings"
  | "levelProgress"
  | "performance"
  | "taskStatusDist";

interface NomadeWidget {
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
  profileHero: {
    defaultTitle: "Meu Perfil",
    description: "Nome, nível, avaliação e resumo do perfil",
    icon: User,
    defaultColSpan: 2,
  },
  kpis: {
    defaultTitle: "Indicadores",
    description: "Tarefas concluídas, ativas, disponíveis e ganhos",
    icon: BarChart3,
    defaultColSpan: 2,
  },
  availableTasks: {
    defaultTitle: "Tarefas Disponíveis",
    description: "Tarefas que você pode aceitar agora",
    icon: Zap,
    defaultColSpan: 2,
  },
  activeTasks: {
    defaultTitle: "Minhas Tarefas Ativas",
    description: "Tarefas em execução ou revisão",
    icon: Clock,
    defaultColSpan: 1,
  },
  taskHistory: {
    defaultTitle: "Histórico de Tarefas",
    description: "Tarefas concluídas e aprovadas",
    icon: CheckCircle2,
    defaultColSpan: 1,
  },
  earnings: {
    defaultTitle: "Ganhos",
    description: "Total ganho, bônus de nível e evolução mensal",
    icon: Wallet,
    defaultColSpan: 2,
  },
  levelProgress: {
    defaultTitle: "Nível e Progressão",
    description: "Seu nível atual e o caminho para o próximo",
    icon: Medal,
    defaultColSpan: 1,
  },
  performance: {
    defaultTitle: "Desempenho",
    description: "Taxa de entrega, avaliação e tempo médio",
    icon: TrendingUp,
    defaultColSpan: 1,
  },
  taskStatusDist: {
    defaultTitle: "Distribuição por Status",
    description: "Porcentagem de tarefas em cada estado",
    icon: Activity,
    defaultColSpan: 2,
  },
};

const DEFAULT_WIDGETS: NomadeWidget[] = [
  { id: "profileHero", visible: true, order: 0, colSpan: 2 },
  { id: "kpis", visible: true, order: 1, colSpan: 2 },
  { id: "availableTasks", visible: true, order: 2, colSpan: 2 },
  { id: "activeTasks", visible: true, order: 3, colSpan: 1 },
  { id: "taskHistory", visible: true, order: 4, colSpan: 1 },
  { id: "earnings", visible: true, order: 5, colSpan: 2 },
  { id: "levelProgress", visible: true, order: 6, colSpan: 1 },
  { id: "performance", visible: true, order: 7, colSpan: 1 },
  { id: "taskStatusDist", visible: false, order: 8, colSpan: 2 },
];

const STORAGE_KEY = "nomade_dashboard_widgets_v1";

function loadWidgets(): NomadeWidget[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_WIDGETS;
    const parsed: NomadeWidget[] = JSON.parse(saved);
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

function saveWidgets(widgets: NomadeWidget[]) {
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
  widgets: NomadeWidget[];
  onClose: () => void;
  onSave: (w: NomadeWidget[]) => void;
}) {
  const [draft, setDraft] = useState<NomadeWidget[]>(() =>
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

  function startEdit(w: NomadeWidget) {
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
            <LayoutGrid className="h-4 w-4 text-emerald-600" />
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
                  ? "text-emerald-600 border-b-2 border-emerald-600"
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
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-emerald-600" />
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
                        className="flex-1 text-sm border border-emerald-300 rounded px-2 py-0.5 outline-none"
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
                          className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
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
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-medium"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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

export default function NomadeDashboardPage() {
  const {
    tasks: allTasks,
    loading,
    error,
    refetch,
  } = useTasks({ limit: "200" });
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [widgets, setWidgets] = useState<NomadeWidget[]>(() => loadWidgets());
  const [showCustomize, setShowCustomize] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Current user ──────────────────────────────────────────────────────────
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("allka_user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const userId = currentUser.id ?? currentUser.nomadeId ?? null;
  const userName = currentUser.name ?? currentUser.nome ?? "Nômade";
  const userEmail = currentUser.email ?? "";
  const userLevel = (
    currentUser.level ??
    currentUser.nivel ??
    "bronze"
  ).toLowerCase();
  const userRating = currentUser.rating ?? currentUser.avaliacao ?? 0;
  const levelCfg = LEVEL_CONFIG[userLevel] ?? LEVEL_CONFIG.bronze;

  // ── Derived task groups ───────────────────────────────────────────────────
  const myTasks = useMemo(() => {
    if (!userId) return allTasks;
    return allTasks.filter(
      (t: any) =>
        t.assigned_to === userId ||
        t.assignedTo === userId ||
        t.nomade_id === userId ||
        t.nomadeId === userId,
    );
  }, [allTasks, userId]);

  const availableTasks = useMemo(
    () =>
      allTasks.filter((t: any) =>
        ["PARA_LANCAMENTO", "EM_LANCAMENTO", "available"].includes(t.status),
      ),
    [allTasks],
  );

  const activeTasks = useMemo(
    () =>
      myTasks.filter((t: any) =>
        [
          "EM_EXECUCAO",
          "EM_REVISAO",
          "LIBERADA_PARA_EXECUCAO",
          "in_progress",
          "review",
        ].includes(t.status),
      ),
    [myTasks],
  );

  const doneTasks = useMemo(
    () =>
      myTasks.filter((t: any) =>
        ["CONCLUIDA", "APROVADA", "done"].includes(t.status),
      ),
    [myTasks],
  );

  const returnedTasks = useMemo(
    () =>
      myTasks.filter((t: any) =>
        ["REPROVADA", "AGUARDANDO_INFORMACOES"].includes(t.status),
      ),
    [myTasks],
  );

  // ── Earnings from done tasks ──────────────────────────────────────────────
  const totalEarned = useMemo(
    () =>
      doneTasks.reduce(
        (s: number, t: any) => s + (t.value ?? t.payment ?? t.valor ?? 0),
        0,
      ),
    [doneTasks],
  );

  const activeEarnings = useMemo(
    () =>
      activeTasks.reduce(
        (s: number, t: any) => s + (t.value ?? t.payment ?? t.valor ?? 0),
        0,
      ),
    [activeTasks],
  );

  // ── Status distribution ───────────────────────────────────────────────────
  const taskStatusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    myTasks.forEach((t: any) => {
      counts[t.status] = (counts[t.status] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status,
        count,
        pct:
          myTasks.length > 0 ? Math.round((count / myTasks.length) * 100) : 0,
        cfg: STATUS_CONFIG[status] ?? DEFAULT_STATUS,
      }));
  }, [myTasks]);

  // ── Widget helpers ────────────────────────────────────────────────────────
  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.order - b.order),
    [widgets],
  );

  function getWidgetTitle(w: NomadeWidget) {
    return w.customTitle || WIDGET_META[w.id]?.defaultTitle || w.id;
  }

  function handleSaveCustomize(updated: NomadeWidget[]) {
    setWidgets(updated);
    saveWidgets(updated);
    setShowCustomize(false);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  async function exportPng() {
    if (!dashboardRef.current) return;
    setExportLoading(true);
    try {
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: "#f8fafc",
      });
      const a = document.createElement("a");
      a.download = `dashboard-nomade-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(false);
    }
  }

  // ── Widget renderer ───────────────────────────────────────────────────────
  function renderWidget(w: NomadeWidget) {
    const title = getWidgetTitle(w);

    // ── profileHero ────────────────────────────────────────────────────────
    if (w.id === "profileHero") {
      const lvlCfg = LEVEL_CONFIG[userLevel] ?? LEVEL_CONFIG.bronze;
      const completedCount = doneTasks.length;
      const nextThreshold = lvlCfg.tasksNeeded;
      const progressPct = Math.min(
        100,
        Math.round((completedCount / nextThreshold) * 100),
      );

      return (
        <div
          key={w.id}
          className={cn(
            "bg-linear-to-br rounded-2xl p-4 text-white shadow-md",
            lvlCfg.color,
            w.colSpan === 2 ? "col-span-2" : "col-span-1",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-base shrink-0">
                {initials(userName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", lvlCfg.textMuted)}>Nômade</span>
                  <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 border border-white/30 text-white")}>
                    {lvlCfg.emoji} {lvlCfg.label}
                  </span>
                </div>
                <h2 className="text-base font-bold leading-tight truncate">{userName}</h2>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {userRating > 0 && (
                <div className="flex items-center gap-0.5 text-yellow-300">
                  <Star className="h-3.5 w-3.5 fill-yellow-300" />
                  <span className="text-xs font-semibold">{userRating.toFixed(1)}</span>
                </div>
              )}
              <span className={cn("text-[10px]", lvlCfg.textMuted)}>
                bônus {lvlCfg.bonus}%
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold leading-none">{doneTasks.length}</p>
              <p className={cn("text-[10px] mt-0.5", lvlCfg.textMuted)}>Concluídas</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg font-bold leading-none">{activeTasks.length}</p>
              <p className={cn("text-[10px] mt-0.5", lvlCfg.textMuted)}>Em execução</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-sm font-bold leading-none">{fmtBRL(totalEarned)}</p>
              <p className={cn("text-[10px] mt-0.5", lvlCfg.textMuted)}>Total ganho</p>
            </div>
          </div>

          {lvlCfg.nextLevel && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-[10px]", lvlCfg.textMuted)}>
                  Progresso → {LEVEL_CONFIG[lvlCfg.nextLevel]?.label}
                </span>
                <span className="text-[10px] text-white font-semibold">
                  {completedCount}/{nextThreshold}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div
                  className={cn("h-1.5 rounded-full transition-all", lvlCfg.barColor)}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    // ── kpis ───────────────────────────────────────────────────────────────
    if (w.id === "kpis") {
      const kpis = [
        {
          label: "Tarefas Concluídas",
          value: doneTasks.length,
          icon: CheckCircle2,
          gradient: "from-emerald-500 to-teal-600",
          border: "border-2 border-emerald-300/70",
          sub: `+${returnedTasks.length > 0 ? returnedTasks.length + " devolvidas" : "0 devolvidas"}`,
          desc: "Total de tarefas finalizadas com sucesso no período.",
          link: "/nomades/minhastarefas",
        },
        {
          label: "Em Execução",
          value: activeTasks.length,
          icon: Clock,
          gradient: "from-amber-500 to-orange-600",
          border: "border-2 border-amber-300/70",
          sub: `${fmtBRL(activeEarnings)} em aberto`,
          desc: "Tarefas que você está executando ativamente agora.",
          link: "/nomades/minhastarefas",
        },
        {
          label: "Disponíveis",
          value: availableTasks.length,
          icon: Zap,
          gradient: "from-blue-500 to-indigo-700",
          border: "border-2 border-blue-300/70",
          sub: "prontas para aceitar",
          desc: "Tarefas abertas no catálogo que você pode aceitar agora.",
          link: "/nomades/tarefasdisponiveis",
        },
        {
          label: "Total Ganho",
          value: fmtBRL(totalEarned),
          icon: Wallet,
          gradient: "from-violet-500 to-purple-700",
          border: "border-2 border-violet-300/70",
          sub: `bônus ${levelCfg.bonus}% (nível)`,
          desc: "Valor total recebido por tarefas concluídas, incluindo bônus de nível.",
          link: "/nomades/ganhos",
        },
      ];

      return (
        <div
          key={w.id}
          className={cn(
            "grid grid-cols-2 sm:grid-cols-4 gap-3",
            w.colSpan === 2 ? "col-span-2" : "col-span-1",
          )}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              className={cn(
                "relative h-full rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-linear-to-br hover:shadow-xl hover:scale-[1.02]",
                k.gradient,
                k.border,
              )}
            >
              <Link to={k.link} className="block h-full">
                <div className="flex flex-col h-full px-4 pt-3 pb-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider leading-tight flex-1 min-w-0 pr-1 line-clamp-2">
                      {k.label}
                    </p>
                    <div className="bg-white/20 rounded-md p-1 shrink-0 ml-1">
                      <k.icon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white leading-none flex-1 flex items-center">
                    {k.value}
                  </p>
                  <div className="flex items-center gap-2 pr-5">
                    <span className="text-[10px] text-white/60 truncate">{k.sub}</span>
                  </div>
                </div>
              </Link>
              <div className="absolute bottom-2 right-2 z-20">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-help">
                        <Info className="h-3 w-3 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="end" className="max-w-50 bg-slate-900 text-white border-slate-700 text-[11px] leading-relaxed">
                      {k.desc}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ── availableTasks ─────────────────────────────────────────────────────
    if (w.id === "availableTasks") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/nomades/tarefasdisponiveis"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {availableTasks.length === 0 ? (
            <EmptyState text="Nenhuma tarefa disponível no momento." />
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
                  {availableTasks.slice(0, 8).map((t: any) => {
                    const cfg = STATUS_CONFIG[t.status] ?? DEFAULT_STATUS;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <p className="text-xs font-medium text-slate-800 truncate max-w-48">
                            {t.title || t.name}
                          </p>
                          {t.deadline && (
                            <p className="text-[10px] text-slate-400">
                              Prazo: {fmtDate(t.deadline)}
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
                              cfg.bg,
                            )}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-slate-800 text-right">
                          {fmtBRL(t.value ?? t.payment ?? t.valor ?? 0)}
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

    // ── activeTasks ────────────────────────────────────────────────────────
    if (w.id === "activeTasks") {
      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/nomades/minhastarefas"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Ver todas <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {activeTasks.length === 0 ? (
            <EmptyState text="Nenhuma tarefa ativa no momento." />
          ) : (
            <div className="divide-y divide-slate-50">
              {activeTasks.slice(0, 6).map((t: any) => {
                const cfg = STATUS_CONFIG[t.status] ?? DEFAULT_STATUS;
                return (
                  <div key={t.id} className="px-5 py-3 hover:bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {t.title || t.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {t.project_name ?? t.projectName ?? "—"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                          cfg.bg,
                        )}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {t.deadline && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400">
                          Prazo: {fmtDate(t.deadline)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      );
    }

    // ── taskHistory ────────────────────────────────────────────────────────
    if (w.id === "taskHistory") {
      const recent = [...doneTasks]
        .sort((a: any, b: any) =>
          (b.completedAt || b.updatedAt || "").localeCompare(
            a.completedAt || a.updatedAt || "",
          ),
        )
        .slice(0, 6);

      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/nomades/historico"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Ver histórico <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <EmptyState text="Nenhuma tarefa concluída ainda." />
          ) : (
            <div className="divide-y divide-slate-50">
              {recent.map((t: any) => {
                const cfg = STATUS_CONFIG[t.status] ?? DEFAULT_STATUS;
                return (
                  <div key={t.id} className="px-5 py-3 hover:bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {t.title || t.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {t.project_name ?? t.projectName ?? "—"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">
                        {fmtBRL(t.value ?? t.payment ?? t.valor ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                          cfg.bg,
                        )}
                      >
                        {cfg.label}
                      </span>
                      {(t.completedAt || t.updatedAt) && (
                        <span className="text-[10px] text-slate-400">
                          {fmtDate(t.completedAt || t.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </WidgetCard>
      );
    }

    // ── earnings ───────────────────────────────────────────────────────────
    if (w.id === "earnings") {
      const bonusEarned = Math.round(totalEarned * (levelCfg.bonus / 100));
      const totalWithBonus = totalEarned + bonusEarned;

      const earningsRows = [
        {
          label: "Total ganho (tarefas)",
          value: fmtBRL(totalEarned),
          color: "text-emerald-700",
          bg: "bg-emerald-50",
          icon: CheckCircle2,
        },
        {
          label: `Bônus de nível (${levelCfg.bonus}%)`,
          value: fmtBRL(bonusEarned),
          color: "text-amber-700",
          bg: "bg-amber-50",
          icon: Award,
        },
        {
          label: "Tarefas ativas (em aberto)",
          value: fmtBRL(activeEarnings),
          color: "text-blue-700",
          bg: "bg-blue-50",
          icon: Clock,
        },
      ];

      return (
        <WidgetCard
          key={w.id}
          title={title}
          colSpan={w.colSpan}
          action={
            <Link
              to="/nomades/ganhos"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              Detalhar <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="p-5">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total com bônus</p>
                <p className="text-3xl font-bold text-slate-900">
                  {fmtBRL(totalWithBonus)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Nível</p>
                <span
                  className={cn(
                    "bg-linear-to-r text-white text-xs font-semibold px-3 py-1 rounded-full",
                    levelCfg.color,
                  )}
                >
                  {levelCfg.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {earningsRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      row.bg,
                    )}
                  >
                    <row.icon className={cn("h-4 w-4", row.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">{row.label}</p>
                    <p className={cn("text-sm font-bold", row.color)}>
                      {row.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {doneTasks.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-4">
                Complete tarefas para acumular ganhos!
              </p>
            )}
          </div>
        </WidgetCard>
      );
    }

    // ── levelProgress ──────────────────────────────────────────────────────
    if (w.id === "levelProgress") {
      const levels = ["bronze", "silver", "gold", "platinum", "diamond"];
      const currentIdx = levels.indexOf(userLevel);

      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          <div className="p-5 space-y-3">
            {levels.map((lvl, idx) => {
              const cfg = LEVEL_CONFIG[lvl];
              const isCurrent = lvl === userLevel;
              const isPast = idx < currentIdx;
              return (
                <div
                  key={lvl}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    isCurrent
                      ? "border-emerald-200 bg-emerald-50"
                      : isPast
                        ? "border-slate-100 bg-slate-50 opacity-60"
                        : "border-slate-100",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg bg-linear-to-br flex items-center justify-center",
                        cfg.color,
                      )}
                    >
                      <Medal className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          isCurrent ? "text-emerald-800" : "text-slate-700",
                        )}
                      >
                        {cfg.label}
                        {isCurrent && (
                          <span className="ml-2 text-[10px] text-emerald-600 font-medium">
                            Atual
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {cfg.tasksNeeded} tarefas
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isCurrent ? "text-emerald-700" : "text-slate-400",
                    )}
                  >
                    +{cfg.bonus}%
                  </span>
                </div>
              );
            })}
          </div>
        </WidgetCard>
      );
    }

    // ── performance ────────────────────────────────────────────────────────
    if (w.id === "performance") {
      const total = myTasks.length;
      const deliveryRate =
        total > 0 ? Math.round((doneTasks.length / total) * 100) : 0;
      const returnRate =
        total > 0 ? Math.round((returnedTasks.length / total) * 100) : 0;

      const metrics = [
        {
          label: "Taxa de entrega",
          value: `${deliveryRate}%`,
          pct: deliveryRate,
          color: "bg-emerald-500",
          textColor: "text-emerald-700",
        },
        {
          label: "Avaliação média",
          value: userRating > 0 ? `${userRating.toFixed(1)} / 5.0` : "—",
          pct: userRating > 0 ? (userRating / 5) * 100 : 0,
          color: "bg-yellow-400",
          textColor: "text-yellow-700",
        },
        {
          label: "Taxa de devolução",
          value: `${returnRate}%`,
          pct: returnRate,
          color: returnRate > 15 ? "bg-red-400" : "bg-slate-300",
          textColor: returnRate > 15 ? "text-red-700" : "text-slate-500",
        },
        {
          label: "Total de tarefas",
          value: total.toString(),
          pct: Math.min(100, (total / 50) * 100),
          color: "bg-blue-400",
          textColor: "text-blue-700",
        },
      ];

      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          <div className="p-5 space-y-4">
            {metrics.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">{m.label}</span>
                  <span className={cn("text-xs font-semibold", m.textColor)}>
                    {m.value}
                  </span>
                </div>
                <MiniBar pct={m.pct} color={m.color} />
              </div>
            ))}
          </div>
        </WidgetCard>
      );
    }

    // ── taskStatusDist ─────────────────────────────────────────────────────
    if (w.id === "taskStatusDist") {
      return (
        <WidgetCard key={w.id} title={title} colSpan={w.colSpan}>
          {taskStatusDist.length === 0 ? (
            <EmptyState text="Nenhuma tarefa registrada ainda." />
          ) : (
            <div className="p-5 space-y-3">
              {taskStatusDist.map(({ status, count, pct, cfg }) => (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)}
                      />
                      <span className="text-xs text-slate-700">
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {count}
                      </span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <MiniBar pct={pct} color={cfg.dot} />
                </div>
              ))}
            </div>
          )}
        </WidgetCard>
      );
    }

    return null;
  }

  if (loading) return <PageLoader text="Carregando painel…" />;

  return (
    <>
      <div className="p-6 space-y-6" ref={dashboardRef}>
        {/* Dashboard Header — unified toolbar */}
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 bg-background border border-border/70 rounded-xl px-[13px] py-[10px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.10),0_1px_6px_-2px_rgba(0,0,0,0.06)]">
          {/* Title + info tooltip */}
          <div className="flex items-center gap-1 shrink-0 mr-2">
            <div className="overflow-hidden">
              <h1 className="font-bold text-slate-900 dark:text-white tracking-tight text-2xl sm:text-3xl lg:text-4xl xl:text-[46px] transition-all duration-300">
                Dashboard
              </h1>
            </div>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors shrink-0 self-center">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] p-3" sideOffset={6}>
                  <p className="font-semibold text-xs mb-1.5">Dashboard do Nômade</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Acompanhe suas tarefas, ganhos, entregas e nível em tempo real.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 xl:ml-auto">
            {error && (
              <span className="text-xs text-red-500 mr-1">Erro ao carregar tarefas</span>
            )}
            {/* Atualizar */}
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={refetch}
                    className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <RefreshCw className="relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Atualizar dados</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Exportar PNG */}
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={exportPng}
                    disabled={exportLoading}
                    className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all disabled:opacity-50"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                    <Download className={cn("relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors", exportLoading && "animate-pulse")} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>{exportLoading ? "Exportando…" : "Exportar PNG"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Personalizar */}
            <button
              onClick={() => setShowCustomize(true)}
              className="group relative flex items-center gap-1.5 px-3 py-1.5 ml-1 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
              <Settings className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
              <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                Personalizar
              </span>
            </button>
          </div>
        </div>

        {/* Widget grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sortedWidgets.filter((w) => w.visible).map((w) => renderWidget(w))}
        </div>
      </div>

      {/* Customize panel */}
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
