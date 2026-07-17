// @ts-nocheck
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { useTableScrollSync } from "@/hooks/useTableScrollSync";
import { SlidePanel } from "@/components/slide-panel";
import { IconToolbarButton } from "@/components/icon-toolbar-button";
import { NeonBadge } from "@/components/neon-badge";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Users,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  Video,
  FileText,
  HelpCircle,
  Layers,
  FolderOpen,
  Globe,
  Lock,
  Filter,
  Settings2,
} from "lucide-react";
import { GraduationCap } from "lucide-react";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fmtDuration(min) {
  if (!min) return "—";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// Category → NeonBadge color mapping (real category values that already
// exist across seeded courses; anything else falls back to slate).
const CATEGORY_BADGE_COLOR = {
  marketing: "pink",
  vendas: "blue",
  gestao: "violet",
  tecnologia: "cyan",
  design: "amber",
  negocios: "emerald",
};

function CategoryBadge({ category }) {
  if (!category) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  const color = CATEGORY_BADGE_COLOR[category.toLowerCase?.()] || "slate";
  return (
    <NeonBadge color={color} className="capitalize">
      {category}
    </NeonBadge>
  );
}

// Course thumbnail (or gradient fallback icon) — shared between the table
// cell and the search-suggestion dropdown.
function CourseThumb({ course, size = "w-9 h-9" }) {
  if (course.thumbnail) {
    return (
      <img
        src={course.thumbnail}
        alt={course.title}
        className={`${size} rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700`}
      />
    );
  }
  return (
    <div className={`${size} rounded-md bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center shrink-0`}>
      <BookOpen className="h-4 w-4 text-blue-400" />
    </div>
  );
}

const CONTENT_TYPE_ICONS = { video: Video, text: FileText, quiz: HelpCircle };
const CONTENT_TYPE_LABELS = { video: "Vídeo", text: "Texto", quiz: "Quiz" };

// Status pill with leading dot, matching the platform's standard glow-badge
// recipe (kept as raw classes since the dot indicator isn't part of NeonBadge).
const STATUS_DOT_CLASSES = {
  published: "border-blue-500 bg-blue-200 text-blue-900 shadow-[0_0_12px_rgba(59,130,246,0.65)] dark:bg-blue-800/70 dark:text-blue-100",
  draft: "border-slate-400 bg-slate-300 text-slate-800 shadow-[0_0_8px_rgba(100,116,139,0.4)] dark:bg-slate-800 dark:text-slate-300",
};
const STATUS_DOT_BG = { published: "bg-blue-500", draft: "bg-slate-400" };

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
    <div
      className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.darkGradient} ${colors.borderClass} shadow-lg hover:shadow-xl`}
    >
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
  { key: "titulo", label: "Título", info: "Título, capa e descrição do curso." },
  { key: "categoria", label: "Categoria", info: "Categoria em que o curso está classificado." },
  { key: "modulos", label: "Módulos", info: "Quantidade de módulos cadastrados no curso." },
  { key: "inscricoes", label: "Inscrições", info: "Quantidade de alunos inscritos no curso." },
  { key: "duracao", label: "Duração", info: "Duração total do conteúdo do curso." },
  { key: "acesso", label: "Acesso", info: "Se o curso é gratuito ou pago." },
  { key: "status", label: "Status", info: "Situação de publicação do curso." },
  { key: "criado", label: "Criado em", info: "Data em que o curso foi cadastrado." },
];
const DEFAULT_VISIBLE = ["titulo", "categoria", "modulos", "inscricoes", "duracao", "acesso", "status", "criado"];
const CENTERED_COLS = ["modulos", "inscricoes"];

// ─── Course detail drawer ─────────────────────────────────────────────────────

function CourseDetailSheet({ courseId, open, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addingModule, setAddingModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [expandedModules, setExpandedModules] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !courseId) return;
    setLoading(true);
    apiClient.getCourse(courseId)
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [open, courseId]);

  function toggleModule(id) {
    setExpandedModules((p) => ({ ...p, [id]: !p[id] }));
  }

  async function handleAddModule() {
    if (!moduleTitle.trim()) return;
    try {
      await apiClient.addCourseModule(courseId, {
        title: moduleTitle.trim(),
        order: (detail?.modules?.length || 0),
      });
      const d = await apiClient.getCourse(courseId);
      setDetail(d);
      setModuleTitle("");
      setAddingModule(false);
      toast({ title: "Módulo criado" });
    } catch {
      toast({ title: "Erro ao criar módulo", variant: "destructive" });
    }
  }

  const totalLessons = (detail?.modules || []).reduce((s, m) => s + (m.lessons?.length || 0), 0);
  const totalDuration = (detail?.modules || []).reduce((s, m) =>
    s + (m.lessons || []).reduce((ls, l) => ls + (l.duration || 0), 0), 0);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent hideOverlay className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            {loading ? "Carregando…" : detail?.title || "Curso"}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Carregando detalhes…
          </div>
        ) : detail ? (
          <div className="space-y-5">
            {/* meta */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Módulos",    value: detail.modules?.length || 0,    icon: Layers },
                { label: "Aulas",      value: totalLessons,                   icon: Video },
                { label: "Duração",    value: fmtDuration(totalDuration),     icon: Clock },
                { label: "Inscrições", value: detail._count?.enrollments || 0, icon: Users },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {detail.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{detail.description}</p>
            )}

            {/* modules */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Módulos e Aulas</h3>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                  onClick={() => setAddingModule(true)}>
                  <Plus className="h-3 w-3" /> Módulo
                </Button>
              </div>

              {addingModule && (
                <div className="flex gap-2 mb-3">
                  <Input autoFocus placeholder="Título do módulo…" className="h-8 text-xs flex-1"
                    value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddModule()} />
                  <Button size="sm" className="h-8 text-xs" onClick={handleAddModule}>OK</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs"
                    onClick={() => { setAddingModule(false); setModuleTitle(""); }}>X</Button>
                </div>
              )}

              {(detail.modules || []).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                  <Layers className="h-7 w-7 opacity-30" />
                  <p className="text-xs">Nenhum módulo ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {detail.modules.map((mod, mi) => (
                    <div key={mod.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
                      >
                        {expandedModules[mod.id]
                          ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 truncate">
                          {mi + 1}. {mod.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {mod.lessons?.length || 0} aula{(mod.lessons?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </button>
                      {expandedModules[mod.id] && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(mod.lessons || []).length === 0 ? (
                            <p className="text-xs text-slate-400 px-4 py-3">Nenhuma aula</p>
                          ) : (
                            mod.lessons.map((lesson, li) => {
                              const Icon = CONTENT_TYPE_ICONS[lesson.content_type] || Video;
                              return (
                                <div key={lesson.id} className="flex items-center gap-2.5 px-4 py-2.5">
                                  <Icon className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">
                                    {mi + 1}.{li + 1} {lesson.title}
                                  </span>
                                  {lesson.duration && (
                                    <span className="text-[10px] text-slate-400 tabular-nums">{fmtDuration(lesson.duration)}</span>
                                  )}
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                    {CONTENT_TYPE_LABELS[lesson.content_type] || lesson.content_type}
                                  </Badge>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAllkademyPage() {
  useSidebar();
  const { toast } = useToast();
  const pageRef = useRef(null);
  const searchBoxRef = useRef(null);

  // ── state ──────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageJumpValue, setPageJumpValue] = useState("");

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [colConfigOpen, setColConfigOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(new Set(DEFAULT_VISIBLE));

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [form, setForm] = useState({
    title: "", description: "", category: "", duration: "",
    is_published: false, is_free: true, thumbnail: "", audience: ["all"],
  });

  const {
    sortKey, sortDir, handleSort, sortData, columnFilters, toggleColumnFilter, clearColumnFilter,
  } = useSorting();

  const {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  } = useTableScrollSync([loading, visibleCols.size]);

  // ── load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = { limit: pageSize, page };
      if (statusFilter !== "all") filters.is_published = statusFilter === "published" ? "true" : "false";
      if (categoryFilter !== "all") filters.category = categoryFilter;
      const res = await apiClient.getCourses(filters);
      setCourses(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error("[Allkademy] load:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, categoryFilter]);

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

  // ── derived ────────────────────────────────────────────────────────────────
  // No server-side search endpoint for courses — filter within the loaded page,
  // matching the API's own pagination contract (limit/page).
  const filtered = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) => c.title?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return courses
      .filter((c) => c.title?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [courses, search]);

  const categories = useMemo(() => {
    const set = new Set();
    courses.forEach((c) => c.category && set.add(c.category));
    return Array.from(set).sort();
  }, [courses]);

  // Flatten nested _count fields onto each row so SortableHeader can sort by
  // the exact same field the cell renders (never a fake/placeholder key).
  const rows = useMemo(() => {
    const withCounts = filtered.map((c) => ({
      ...c,
      modules_count: c._count?.modules ?? 0,
      enrollments_count: c._count?.enrollments ?? 0,
    }));
    return sortData(withCounts);
  }, [filtered, sortData]);

  const kpi = useMemo(() => ({
    total,
    published: courses.filter((c) => c.is_published).length,
    enrollments: courses.reduce((s, c) => s + (c._count?.enrollments || 0), 0),
    modules: courses.reduce((s, c) => s + (c._count?.modules || 0), 0),
  }), [courses, total]);

  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleCol = (key) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  // ── sheet helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    setEditingCourse(null);
    setForm({ title: "", description: "", category: "", duration: "", is_published: false, is_free: true, thumbnail: "", audience: ["all"] });
    setSheetOpen(true);
  }

  function openEdit(c) {
    setEditingCourse(c);
    const audience = c.audience_profiles
      ? c.audience_profiles.split(",").map((s) => s.trim()).filter(Boolean)
      : ["all"];
    setForm({
      title: c.title || "",
      description: c.description || "",
      category: c.category || "",
      duration: c.duration ? String(c.duration) : "",
      is_published: !!c.is_published,
      is_free: !!c.is_free,
      thumbnail: c.thumbnail || "",
      audience: audience.length ? audience : ["all"],
    });
    setSheetOpen(true);
  }

  // "Todos" é exclusivo: marcar limpa o resto; marcar um perfil específico
  // desmarca "Todos". Nunca deixa a lista vazia (cai de volta pra "all").
  function toggleAudience(value) {
    setForm((f) => {
      if (value === "all") return { ...f, audience: ["all"] };
      const withoutAll = f.audience.filter((v) => v !== "all");
      const next = withoutAll.includes(value)
        ? withoutAll.filter((v) => v !== value)
        : [...withoutAll, value];
      return { ...f, audience: next.length ? next : ["all"] };
    });
  }

  async function handleSave() {
    if (!form.title.trim()) { toast({ title: "Informe o título", variant: "destructive" }); return; }
    if (!form.category.trim()) { toast({ title: "Informe a categoria", variant: "destructive" }); return; }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim(),
      duration: form.duration ? parseInt(form.duration) : undefined,
      is_published: form.is_published,
      is_free: form.is_free,
      thumbnail: form.thumbnail.trim() || undefined,
      audience_profiles: form.audience.join(","),
    };
    setActionLoading("save");
    try {
      if (editingCourse) {
        await apiClient.updateCourse(editingCourse.id, payload);
        toast({ title: "Curso atualizado com sucesso" });
      } else {
        await apiClient.createCourse(payload);
        toast({ title: "Curso criado com sucesso" });
      }
      setSheetOpen(false);
      load();
    } catch (err) {
      toast({ title: "Erro ao salvar curso", description: err?.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget);
    try {
      await apiClient.deleteCourse(deleteTarget);
      toast({ title: "Curso excluído" });
      setDeleteTarget(null);
      load();
    } catch {
      toast({ title: "Erro ao excluir curso", variant: "destructive" });
    } finally { setActionLoading(null); }
  }

  async function togglePublished(c) {
    setTogglingId(c.id);
    try {
      await apiClient.updateCourse(c.id, { is_published: !c.is_published });
      toast({ title: c.is_published ? "Curso despublicado" : "Curso publicado" });
      load();
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } finally { setTogglingId(null); }
  }

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
              const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
              const end = Math.min(page * pageSize, total);
              return (
                <>
                  {start}-{end} de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{total}</span>{" "}
                  curso{total !== 1 ? "s" : ""}
                </>
              );
            })()}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} sideOffset={6}>
          Intervalo de cursos exibido nesta página, do total encontrado
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="h-full min-h-0 flex flex-col" ref={pageRef}>
      <div className="shrink-0 -mb-[11px]">
      <StandardPageBanner
        icon={GraduationCap}
        title="Allkademy"
        description="Plataforma de cursos e aprendizado"
        actions={<>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={load}
                  className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Novo Curso
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar novo curso</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PinToTrayButton id="page-allkademy" label="Allkademy" icon={GraduationCap} path="/admin/allkademy" />
        </>}
      />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-4">
      {/* Stats — gradient cards matching admin/empresas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Cursos" value={total} icon={BookOpen} color="blue" />
        <StatCard label="Publicados" value={kpi.published} icon={Globe} color="emerald" />
        <StatCard label="Inscrições" value={kpi.enrollments} icon={Users} color="violet" />
        <StatCard label="Módulos" value={kpi.modules} icon={Layers} color="orange" />
      </div>

      {/* Card wrapping the whole table, toolbar rows included */}
      <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
        {/* Row 1 — search + icon toolbar buttons */}
        <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
          <div ref={searchBoxRef} className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Título ou categoria..."
              value={search}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchFocused && search && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-64 overflow-y-auto">
                {searchSuggestions.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2">Nenhum resultado</p>
                ) : (
                  searchSuggestions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSearch(c.title); setSearchFocused(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <CourseThumb course={c} size="w-8 h-8" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{c.title}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{c.category || "—"}</p>
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
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando cursos...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <BookOpen className="h-8 w-8 opacity-30" />
            <span className="text-sm">Nenhum curso encontrado</span>
            <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeiro curso
            </Button>
          </div>
        ) : (
          <div ref={tableScrollRef} onScroll={handleTableScroll} className="overflow-x-auto allka-table-scroll-body">
            <table className="w-full text-xs min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                  <th
                    className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center"
                    style={{ position: "sticky", left: 0, top: 0, zIndex: 3, minWidth: 110, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.22)", borderRight: "1px solid rgba(100,116,139,0.18)" }}
                  >
                    Ações
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] select-none [&_button]:!text-[11px]"
                      style={{
                        textAlign: CENTERED_COLS.includes(col.key) ? "center" : "left",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--table-head)",
                        boxShadow: "0 1px 0 rgba(148,163,184,0.22)",
                        borderRight: "1px solid rgba(148,163,184,0.16)",
                      }}
                    >
                      <div className={`inline-flex items-center gap-1 ${CENTERED_COLS.includes(col.key) ? "justify-center w-full" : ""}`}>
                        <SortableHeader
                          label={col.label}
                          field={
                            col.key === "titulo" ? "title"
                            : col.key === "categoria" ? "category"
                            : col.key === "modulos" ? "modules_count"
                            : col.key === "inscricoes" ? "enrollments_count"
                            : col.key === "duracao" ? "duration"
                            : col.key === "acesso" ? "is_free"
                            : col.key === "status" ? "is_published"
                            : "created_at"
                          }
                          type={col.key === "criado" ? "date" : CENTERED_COLS.includes(col.key) || col.key === "duracao" ? "number" : "text"}
                          sortKey={sortKey ? String(sortKey) : null}
                          sortDir={sortDir}
                          onSort={handleSort}
                          columnFilters={columnFilters}
                          onFilter={toggleColumnFilter}
                          onClearFilter={clearColumnFilter}
                          filterValues={col.key === "categoria" ? categories : undefined}
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
                {rows.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`group transition-colors ${
                      i % 2 === 0
                        ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                        : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"
                    }`}
                  >
                    {/* Actions — pinned, standard icon-button recipe */}
                    <td
                      className={`px-1 py-2 transition-colors ${
                        i % 2 === 0
                          ? "bg-[#ECEFF4] group-hover:bg-[#D9E1ED] dark:bg-[oklch(0.14_0.026_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                          : "bg-[#D6DCE8] group-hover:bg-[#C7D2E3] dark:bg-[oklch(0.185_0.024_258)] dark:group-hover:bg-[oklch(0.21_0.024_258)]"
                      }`}
                      style={{ position: "sticky", left: 0, zIndex: 1, minWidth: 110, borderRight: "1px solid rgba(100,116,139,0.18)" }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDetailId(c.id)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <FolderOpen className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Ver módulos e aulas</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                disabled={togglingId === c.id}
                                onClick={() => togglePublished(c)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150 disabled:opacity-40"
                              >
                                {togglingId === c.id
                                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  : c.is_published ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">{c.is_published ? "Despublicar" : "Publicar"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openEdit(c)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white dark:hover:text-[#0a1628] hover:border-transparent hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Editar curso</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={400}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setDeleteTarget(c.id)}
                                className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-slate-400 dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-red-500 hover:text-white hover:border-transparent hover:shadow-[0_8px_18px_rgba(220,38,38,0.25)] hover:-translate-y-px transition-all duration-150"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs font-medium">Excluir curso</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>

                    {visibleCols.has("titulo") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center gap-2.5 max-w-[260px]">
                          <CourseThumb course={c} />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{c.title}</p>
                            {c.description && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{c.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleCols.has("categoria") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <CategoryBadge category={c.category} />
                      </td>
                    )}
                    {visibleCols.has("modulos") && (
                      <td className="py-3 px-4 text-center" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className="inline-flex items-center gap-1 font-medium text-sm">
                          <Layers className="h-3.5 w-3.5 text-pink-500" />
                          {c._count?.modules ?? 0}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("inscricoes") && (
                      <td className="py-3 px-4 text-center" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className="inline-flex items-center gap-1 font-medium text-sm">
                          <Users className="h-3.5 w-3.5 text-violet-500" />
                          {c._count?.enrollments ?? 0}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("duracao") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {fmtDuration(c.duration)}
                        </div>
                      </td>
                    )}
                    {visibleCols.has("acesso") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <NeonBadge color={c.is_free ? "emerald" : "amber"}>
                          {c.is_free ? "Gratuito" : "Pago"}
                        </NeonBadge>
                      </td>
                    )}
                    {visibleCols.has("status") && (
                      <td className="py-3 px-4" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold w-fit border ${c.is_published ? STATUS_DOT_CLASSES.published : STATUS_DOT_CLASSES.draft}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.is_published ? STATUS_DOT_BG.published : STATUS_DOT_BG.draft}`} />
                          {c.is_published ? "Publicado" : "Rascunho"}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("criado") && (
                      <td className="py-3 px-4 text-xs text-slate-400">{fmtDate(c.created_at)}</td>
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
        subtitle="Filtre a lista de cursos por status e categoria"
        widthMode="compact"
        compactWidth={360}
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
            {[
              { key: "all", label: "Todos os status" },
              { key: "published", label: "Publicados" },
              { key: "draft", label: "Rascunhos" },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                <input
                  type="radio"
                  name="status-filter"
                  checked={statusFilter === opt.key}
                  onChange={() => { setStatusFilter(opt.key); setPage(1); }}
                />
                {opt.key === "all" ? opt.label : (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold w-fit border ${opt.key === "published" ? STATUS_DOT_CLASSES.published : STATUS_DOT_CLASSES.draft}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.key === "published" ? STATUS_DOT_BG.published : STATUS_DOT_BG.draft}`} />
                    {opt.label}
                  </span>
                )}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
              <input
                type="radio"
                name="category-filter"
                checked={categoryFilter === "all"}
                onChange={() => { setCategoryFilter("all"); setPage(1); }}
              />
              Todas as categorias
            </label>
            {categories.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                <input
                  type="radio"
                  name="category-filter"
                  checked={categoryFilter === cat}
                  onChange={() => { setCategoryFilter(cat); setPage(1); }}
                />
                <CategoryBadge category={cat} />
              </label>
            ))}
          </div>
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

      {/* Sheet: Criar / Editar Curso */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingCourse ? "Editar Curso" : "Novo Curso"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Título <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Fundamentos de Marketing Digital" className="h-9 text-sm"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="O que o aluno vai aprender…" className="text-sm resize-none" rows={3}
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria <span className="text-red-500">*</span></Label>
                <Input placeholder="Ex: marketing" className="h-9 text-sm"
                  value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duração (minutos)</Label>
                <Input type="number" placeholder="120" className="h-9 text-sm"
                  value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">URL da Thumbnail</Label>
              <Input placeholder="https://…" className="h-9 text-sm"
                value={form.thumbnail} onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Público-alvo</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "all", label: "Todos" },
                  { value: "company", label: "Company" },
                  { value: "agency", label: "Agency" },
                  { value: "nomades", label: "Nômade" },
                  { value: "leader", label: "Leader" },
                  { value: "partner", label: "Partner" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.audience.includes(opt.value)}
                      onChange={() => toggleAudience(opt.value)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_free}
                  onChange={(e) => setForm((f) => ({ ...f, is_free: e.target.checked }))}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Curso gratuito</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_published}
                  onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Publicar agora</span>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={actionLoading === "save"} onClick={handleSave}>
                {actionLoading === "save" ? "Salvando…" : editingCourse ? "Salvar" : "Criar Curso"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail sheet */}
      <CourseDetailSheet
        courseId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
      />

      {/* Confirm delete */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Curso"
        description="Tem certeza que deseja excluir este curso? Todos os módulos e aulas serão removidos."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
    </div>
    </div>
    </div>
  );
}
