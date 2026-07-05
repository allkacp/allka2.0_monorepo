// @ts-nocheck
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { SlidePanel } from "@/components/slide-panel";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { NeonBadge } from "@/components/neon-badge";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import {
  Briefcase, Plus, Eye, Pencil, Trash2, Users, DollarSign, Tag,
  RefreshCw, Search, CheckCircle2, XCircle, Bot, Sparkles, Brain,
  Filter, Settings2, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// === AI Providers ============================================================

const AI_PROVIDERS = [
  { value: "openai",    label: "OpenAI",             models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "anthropic", label: "Anthropic Claude",   models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"] },
  { value: "gemini",    label: "Google Gemini",       models: ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"] },
  { value: "groq",      label: "Groq (Llama / Mixtral)", models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"] },
  { value: "custom",    label: "API Personalizada",  models: [] },
];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ── Avatar (same rotation recipe as ClientAvatar / CompanyAvatar) ───────────
const avatarColors = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-orange-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-pink-500 to-rose-700",
];
function SpecialtyAvatar({ index }) {
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[Math.abs(index) % avatarColors.length]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <Briefcase className="h-4 w-4 text-white" />
    </div>
  );
}

// ── Category badge color — deterministic hash so the same free-text
// category always renders with the same NeonBadge color. ───────────────────
const CATEGORY_COLORS = ["blue", "violet", "emerald", "orange", "teal", "pink", "amber", "indigo"];
function categoryColor(category) {
  if (!category) return "slate";
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

// Status pill with leading dot — same recipe as admin/clientes' STATUS_DOT_CLASSES
const STATUS_DOT_CLASSES = {
  active:   "border-emerald-500 bg-emerald-200 text-emerald-900 shadow-[0_0_12px_rgba(16,185,129,0.65)] dark:bg-emerald-800/70 dark:text-emerald-100",
  inactive: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
};
const STATUS_DOT_BG = { active: "bg-emerald-500", inactive: "bg-slate-400" };

// Extra filter options (Filtros panel) — status + the "Com IA" cross-cutting flag
const FILTER_OPTIONS = [
  { key: "active",   label: "Ativas",   color: "emerald" },
  { key: "inactive", label: "Inativas", color: "slate" },
  { key: "ai",       label: "Com IA",   color: "violet" },
];

// Gradient stat-card treatment matching admin/empresas' statColorMap
const STAT_COLOR_MAP = {
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

function StatCard({ label, value, icon: Icon, color }) {
  const colors = STAT_COLOR_MAP[color];
  return (
    <div className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.darkGradient} ${colors.borderClass} shadow-lg hover:shadow-xl`}>
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

const ALL_COLUMNS = [
  { key: "nome",      label: "Especialidade", info: "Nome da especialidade." },
  { key: "categoria", label: "Categoria",      info: "Categoria informada no cadastro." },
  { key: "descricao", label: "Descrição",      info: "Descrição detalhada da especialidade." },
  { key: "valor",     label: "R$/h",           info: "Valor cobrado por hora de trabalho." },
  { key: "ia",        label: "IA",             info: "Integração de IA vinculada à especialidade, quando configurada." },
  { key: "status",    label: "Status",         info: "Se a especialidade está ativa e disponível para uso." },
  { key: "criado",    label: "Criado em",      info: "Data de cadastro da especialidade." },
];
const DEFAULT_VISIBLE = ["nome", "categoria", "descricao", "valor", "ia", "status"];

const emptyForm = {
  name: "", description: "", category: "", hourly_rate: "",
  required_skills: "", is_active: true,
  ai_enabled: false, ai_provider: "openai", ai_model: "", ai_instructions: "",
};

export default function AdminEspecialidadesPage() {
  const { toast } = useToast();
  const pageRef = useRef(null);
  const searchBoxRef = useRef(null);
  const searchTimeout = useRef(undefined);

  const [specialties, setSpecialties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageJumpValue, setPageJumpValue] = useState("");

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(new Set());
  const [visibleCols, setVisibleCols] = useState(new Set(DEFAULT_VISIBLE));

  const [panelOpen, setPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getSpecialties({ limit: 1000 });
      const data = Array.isArray(res) ? res : res?.data || [];
      setSpecialties(data);
      setTotal(Array.isArray(res) ? data.length : res?.total ?? data.length);
    } catch (err) {
      console.error("[Especialidades] load:", err);
      setError(err?.message ?? "Erro ao carregar especialidades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSearchChange = (v) => {
    setSearchInput(v);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 300);
  };

  const searchSuggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    return specialties
      .filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [specialties, searchInput]);

  const filtered = useMemo(() => {
    let arr = specialties;
    if (statusFilter.size === 1) {
      const f = Array.from(statusFilter)[0];
      if (f === "active") arr = arr.filter((s) => s.is_active);
      else if (f === "inactive") arr = arr.filter((s) => !s.is_active);
      else if (f === "ai") arr = arr.filter((s) => s.ai_enabled);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((s) =>
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [specialties, search, statusFilter]);

  const { sortKey, sortDir, handleSort, sortData } = useSorting();

  const sortedFiltered = useMemo(() => sortData(filtered), [filtered, sortData]);

  const totalFiltered = sortedFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedFiltered.slice(start, start + pageSize);
  }, [sortedFiltered, page, pageSize]);

  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));

  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([loading, visibleCols.size]);

  const kpi = useMemo(() => ({
    total,
    active: specialties.filter((s) => s.is_active).length,
    categories: new Set(specialties.map((s) => s.category).filter(Boolean)).size,
    avgRate: specialties.length > 0
      ? Math.round(specialties.reduce((s, e) => s + (Number(e.hourly_rate) || 0), 0) / specialties.length)
      : 0,
  }), [specialties, total]);

  function openCreate() {
    setEditItem(null);
    setViewMode(false);
    setForm(emptyForm);
    setPanelOpen(true);
  }

  function fillForm(item) {
    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      hourly_rate: item.hourly_rate != null ? String(item.hourly_rate) : "",
      required_skills: item.required_skills || "",
      is_active: item.is_active !== false,
      ai_enabled: !!item.ai_enabled,
      ai_provider: item.ai_provider || "openai",
      ai_model: item.ai_model || "",
      ai_instructions: item.ai_instructions || "",
    });
  }

  function openEdit(item) {
    setEditItem(item);
    setViewMode(false);
    fillForm(item);
    setPanelOpen(true);
  }

  function openView(item) {
    setEditItem(item);
    setViewMode(true);
    fillForm(item);
    setPanelOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: "Informe o nome", variant: "destructive" }); return; }
    if (!form.category.trim()) { toast({ title: "Informe a categoria", variant: "destructive" }); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim(),
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : 0,
      required_skills: form.required_skills.trim() || undefined,
      is_active: form.is_active,
      ai_enabled: form.ai_enabled,
      ai_provider: form.ai_enabled ? form.ai_provider : undefined,
      ai_model: form.ai_enabled ? form.ai_model.trim() || undefined : undefined,
      ai_instructions: form.ai_enabled ? form.ai_instructions.trim() || undefined : undefined,
    };
    setActionLoading("save");
    try {
      if (editItem) {
        await apiClient.updateSpecialty(editItem.id, payload);
        toast({ title: "Especialidade atualizada" });
      } else {
        await apiClient.createSpecialty(payload);
        toast({ title: "Especialidade criada" });
      }
      setPanelOpen(false);
      load();
    } catch (err) {
      toast({ title: "Erro ao salvar", description: err?.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    try {
      await apiClient.deleteSpecialty(deleteTarget);
      toast({ title: "Especialidade removida" });
      setDeleteTarget(null);
      load();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }

  function toggleCol(key) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selectedProvider = AI_PROVIDERS.find((p) => p.value === form.ai_provider);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const halfVisible = Math.floor(maxVisible / 2);
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= halfVisible + 1) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
      if (totalPages > maxVisible) pages.push("...");
    } else if (page >= totalPages - halfVisible) {
      pages.push("...");
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push("...");
      for (let i = page - halfVisible; i <= page + halfVisible; i++) pages.push(i);
      pages.push("...");
    }
    return pages;
  };

  const commitPageJump = () => {
    const n = parseInt(pageJumpValue, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
    setPageJumpValue("");
  };

  const PaginationControls = () => (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        title="Página anterior"
        className="h-7 w-7 flex items-center justify-center rounded-[8px] text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {getPageNumbers().map((p, index) =>
        p === "..." ? (
          <span key={index} className="text-xs text-slate-300 px-0.5">·</span>
        ) : (
          <button
            key={index}
            onClick={() => setPage(Number(p))}
            title={p === page ? "Página atual" : `Ir para a página ${p}`}
            className={`h-7 w-7 flex items-center justify-center rounded-[8px] text-xs font-bold transition-colors ${
              p === page
                ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
            }`}
            style={p === page ? { background: "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)" } : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

  const CountText = ({ side = "bottom" }) => (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap cursor-default">
            {(() => {
              const start = totalFiltered === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalFiltered);
              const end = Math.min(page * pageSize, totalFiltered);
              return (
                <>
                  {start}-{end} de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{totalFiltered}</span>{" "}
                  especialidade{totalFiltered !== 1 ? "s" : ""}
                </>
              );
            })()}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          Intervalo de especialidades exibido nesta página, do total encontrado
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div ref={pageRef} className="p-4 sm:p-6 space-y-4">
      <PageHeader
        title="Especialidades"
        description="Gerencie especialidades, valores e integrações de IA"
        actions={<>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={load}
                  className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <RefreshCw className={`relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors ${loading ? "animate-spin" : ""}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ExportButton pageRef={pageRef} filename="especialidades" />
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={openCreate}
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Nova Especialidade
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar nova especialidade</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />

      {/* Stats — gradient cards matching admin/empresas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total"      value={kpi.total}           icon={Briefcase}    color="blue" />
        <StatCard label="Ativas"     value={kpi.active}          icon={CheckCircle2} color="emerald" />
        <StatCard label="Categorias" value={kpi.categories}      icon={Tag}          color="violet" />
        <StatCard label="Média R$/h" value={`R$ ${kpi.avgRate}`}  icon={DollarSign}   color="orange" />
      </div>

      {/* Card wrapping the whole table, toolbar rows included */}
      <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        {/* Row 1 — search + icon toolbar buttons */}
        <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
          <div ref={searchBoxRef} className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Nome, categoria ou descrição..."
              value={searchInput}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchFocused && searchInput && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-64 overflow-y-auto">
                {searchSuggestions.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2">Nenhum resultado</p>
                ) : (
                  searchSuggestions.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSearchInput(s.name);
                        setSearch(s.name);
                        setSearchFocused(false);
                        setPage(1);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <SpecialtyAvatar index={i} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{s.category || "—"}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <IconToolbarButton icon={Filter} tooltip="Filtros" onClick={() => setFilterPanelOpen(true)} />
            <IconToolbarButton icon={Settings2} tooltip="Configurar colunas" onClick={() => setColConfigOpen(true)} />
          </div>
        </div>

        {/* Row 2 — items-per-page + count + scrollbar mirror + numbered pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-y border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/30">
          <div className="flex items-center gap-3">
            <ItemsPerPageSelect
              value={pageSize.toString()}
              onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
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
              <div style={{ minWidth: 960, height: 1 }} />
            </div>
          )}

          {totalPages > 1 && <PaginationControls />}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando especialidades...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-500">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={load} className="text-xs underline">Tentar novamente</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Briefcase className="h-8 w-8 opacity-40" />
            <span className="text-sm">Nenhuma especialidade encontrada</span>
            <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeira especialidade
            </Button>
          </div>
        ) : (
          <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                  <th
                    className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center"
                    style={{ position: "sticky", left: 0, top: 0, zIndex: 3, minWidth: 96, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.22)", borderRight: "1px solid rgba(100,116,139,0.18)" }}
                  >
                    Ações
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] select-none [&_button]:!text-[11px]"
                      style={{
                        textAlign: "left",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                        borderRight: "1px solid rgba(148,163,184,0.16)",
                      }}
                    >
                      <div className="inline-flex items-center gap-1">
                        <SortableHeader
                          label={col.label}
                          field={col.key === "nome" ? "name" : col.key === "valor" ? "hourly_rate" : col.key === "criado" ? "created_at" : col.key === "categoria" ? "category" : col.key}
                          type={col.key === "criado" ? "date" : col.key === "valor" ? "number" : "text"}
                          sortKey={sortKey ? String(sortKey) : null}
                          sortDir={sortDir}
                          onSort={handleSort}
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-slate-300 dark:text-slate-600 cursor-help text-[10px]">ⓘ</span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px]">{col.info}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`group transition-colors ${
                      i % 2 === 0
                        ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                        : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"
                    }`}
                  >
                    {/* Actions — pinned, eye (ver) / pencil (editar) / trash (remover) */}
                    <td
                      className={`px-1 py-2 transition-colors ${
                        i % 2 === 0
                          ? "bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                          : "bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                      }`}
                      style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 96, borderRight: "1px solid rgba(100,116,139,0.18)" }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openView(s)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Ver detalhes</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openEdit(s)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Editar especialidade</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDeleteTarget(s.id)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-red-600 hover:text-white hover:border-transparent hover:shadow-[0_8px_18px_rgba(220,38,38,0.25)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Remover especialidade</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>

                    {visibleCols.has("nome") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center gap-3">
                          <SpecialtyAvatar index={i} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{s.name}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleCols.has("categoria") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        {s.category ? (
                          <NeonBadge color={categoryColor(s.category)} className="capitalize">{s.category}</NeonBadge>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )}
                    {visibleCols.has("descricao") && (
                      <td className="py-3 px-4 max-w-[280px]" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.description || "—"}</p>
                      </td>
                    )}
                    {visibleCols.has("valor") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {s.hourly_rate > 0 ? `R$ ${Number(s.hourly_rate).toFixed(2)}/h` : "—"}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("ia") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        {s.ai_enabled ? (
                          <NeonBadge color="violet" tooltip={s.ai_model ? `Modelo: ${s.ai_model}` : undefined}>
                            <Bot className="h-2.5 w-2.5 mr-1 inline" />
                            {AI_PROVIDERS.find((p) => p.value === s.ai_provider)?.label?.split(" ")[0] || "IA"}
                          </NeonBadge>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    )}
                    {visibleCols.has("status") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold w-fit border ${s.is_active ? STATUS_DOT_CLASSES.active : STATUS_DOT_CLASSES.inactive}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.is_active ? STATUS_DOT_BG.active : STATUS_DOT_BG.inactive}`} />
                          {s.is_active ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("criado") && (
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {fmtDate(s.created_at)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Row 3 — bottom mirror of row 2 */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-2 border-t border-[#e8edf5] dark:border-slate-800 bg-white dark:bg-slate-900/20">
            <div className="flex items-center gap-3">
              <ItemsPerPageSelect
                value={pageSize.toString()}
                onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}
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
                <div style={{ minWidth: 960, height: 1 }} />
              </div>
            )}

            {totalPages > 1 && <PaginationControls />}
          </div>
        )}
      </div>

      {/* Filtros panel */}
      <SlidePanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        title="Filtros"
        subtitle="Filtre a lista de especialidades por status"
        widthMode="compact"
        compactWidth={360}
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
          {FILTER_OPTIONS.map(({ key, label, color }) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={statusFilter.has(key)}
                onChange={() => {
                  setStatusFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  });
                  setPage(1);
                }}
              />
              <NeonBadge color={color}>{label}</NeonBadge>
            </label>
          ))}
        </div>
      </SlidePanel>

      {/* Column config panel */}
      <SlidePanel
        open={colConfigOpen}
        onClose={() => setColConfigOpen(false)}
        title="Configurar colunas"
        subtitle="Escolha quais colunas aparecem na tabela"
        widthMode="compact"
        compactWidth={360}
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-2">
          {ALL_COLUMNS.map((col) => (
            <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer py-1">
              <input type="checkbox" checked={visibleCols.has(col.key)} onChange={() => toggleCol(col.key)} />
              {col.label}
            </label>
          ))}
        </div>
      </SlidePanel>

      {/* Create / Edit / View Slide Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={viewMode ? "Detalhes da Especialidade" : editItem ? "Editar Especialidade" : "Nova Especialidade"}
        subtitle={
          viewMode
            ? "Visualização somente leitura"
            : editItem
            ? "Atualize os dados da especialidade"
            : "Configure uma nova especialidade e valor por hora"
        }
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 px-6 text-sm" onClick={() => setPanelOpen(false)}>
              {viewMode ? "Fechar" : "Cancelar"}
            </Button>
            {form.ai_enabled && (
              <span className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 flex-1">
                <Sparkles className="h-3.5 w-3.5" />
                IA: {AI_PROVIDERS.find((p) => p.value === form.ai_provider)?.label?.split(" ")[0] || "—"}
                {form.ai_model ? ` · ${form.ai_model}` : ""}
              </span>
            )}
            {viewMode ? (
              <Button className="h-10 px-8 btn-brand border-0 shadow-md ml-auto" onClick={() => setViewMode(false)}>
                Editar
              </Button>
            ) : (
              <Button className="h-10 px-8 btn-brand border-0 shadow-md" disabled={actionLoading === "save"} onClick={handleSave}>
                {actionLoading === "save" ? "Salvando..." : editItem ? "Salvar Alterações" : "Criar Especialidade"}
              </Button>
            )}
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 px-6 py-6 space-y-4">

          {/* Section 1 — Dados principais */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dados da Especialidade</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input placeholder="Ex: Design Gráfico AI" className="h-10 text-sm" disabled={viewMode}
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Categoria <span className="text-red-500">*</span>
                  </Label>
                  <Input placeholder="Ex: criativo" className="h-10 text-sm" disabled={viewMode}
                    value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor por Hora (R$)</Label>
                  <Input type="number" step="0.01" placeholder="75.00" className="h-10 text-sm" disabled={viewMode}
                    value={form.hourly_rate} onChange={(e) => setForm((f) => ({ ...f, hourly_rate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descrição</Label>
                <Textarea placeholder="Descreva esta especialidade..." className="text-sm resize-none" rows={3} disabled={viewMode}
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Habilidades Necessárias</Label>
                <Input placeholder="Ex: Figma, Illustrator, After Effects" className="h-10 text-sm" disabled={viewMode}
                  value={form.required_skills} onChange={(e) => setForm((f) => ({ ...f, required_skills: e.target.value }))} />
                <p className="text-[10px] text-slate-400">Separe por vírgula</p>
              </div>
            </div>
          </div>

          {/* Section 2 — Integracao com IA */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Bot className="h-4 w-4 text-violet-500" /> Integração com IA
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Vincule uma IA para executar tarefas automaticamente</p>
                </div>
              </div>
              <Switch
                checked={form.ai_enabled}
                disabled={viewMode}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ai_enabled: v }))}
              />
            </div>

            {form.ai_enabled ? (
              <div className="px-5 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Provedor de IA</Label>
                    <Select value={form.ai_provider} disabled={viewMode} onValueChange={(v) => setForm((f) => ({ ...f, ai_provider: v, ai_model: "" }))}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Selecione o provedor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              <Bot className="h-3.5 w-3.5 text-violet-500" />
                              {p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Modelo</Label>
                    {selectedProvider?.models?.length > 0 ? (
                      <Select value={form.ai_model} disabled={viewMode} onValueChange={(v) => setForm((f) => ({ ...f, ai_model: v }))}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Selecione o modelo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedProvider.models.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Ex: gpt-4o, claude-3-opus" className="h-10 text-sm" disabled={viewMode}
                        value={form.ai_model} onChange={(e) => setForm((f) => ({ ...f, ai_model: e.target.value }))} />
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Instruções para a IA
                  </Label>
                  <Textarea
                    placeholder={"Ex: Você é um designer especialista em UI/UX. Ao receber uma tarefa, analise o briefing e gere uma proposta criativa detalhada com paleta de cores, tipografia e estrutura visual..."}
                    className="text-sm resize-none" rows={5} disabled={viewMode}
                    value={form.ai_instructions}
                    onChange={(e) => setForm((f) => ({ ...f, ai_instructions: e.target.value }))} />
                  <p className="text-[10px] text-slate-400">
                    Estas instruções serão enviadas como contexto sempre que uma tarefa desta especialidade for criada.
                  </p>
                </div>

                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                  <Sparkles className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Execução automática</p>
                    <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-0.5 leading-relaxed">
                      Quando uma tarefa for solicitada nesta especialidade, a IA será chamada automaticamente com as instruções acima e o briefing da tarefa.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 flex items-center gap-3 text-slate-400">
                <Brain className="h-4 w-4 opacity-40" />
                <p className="text-xs">Ative para vincular uma IA a esta especialidade.</p>
              </div>
            )}
          </div>

          {/* Section 3 — Configuracoes */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Configurações</p>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Especialidade Ativa</p>
                  <p className="text-xs text-slate-400 mt-0.5">Exibir nos filtros e formulários da plataforma</p>
                </div>
                <Switch checked={form.is_active} disabled={viewMode} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              </div>
            </div>
          </div>
        </div>
      </SlidePanel>

      {/* Confirm delete */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remover Especialidade"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
