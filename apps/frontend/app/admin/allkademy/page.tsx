// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
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
  GraduationCap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Video,
  FileText,
  HelpCircle,
  Layers,
  FolderOpen,
  Globe,
  Lock,
  DollarSign,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
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

const CATEGORY_COLORS = {
  marketing:    "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-700/40",
  vendas:       "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-700/40",
  gestao:       "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-700/40",
  tecnologia:   "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-700/40",
  design:       "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/40",
  negocios:     "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700/40",
};

function CategoryBadge({ category }) {
  const cls = CATEGORY_COLORS[category?.toLowerCase?.()] ||
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600";
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold capitalize ${cls}`}>
      {category || "—"}
    </Badge>
  );
}

const CONTENT_TYPE_ICONS = { video: Video, text: FileText, quiz: HelpCircle };
const CONTENT_TYPE_LABELS = { video: "Vídeo", text: "Texto", quiz: "Quiz" };

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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
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

  // ── state ──────────────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const [form, setForm] = useState({
    title: "", description: "", category: "", duration: "",
    is_published: false, is_free: true, thumbnail: "",
  });

  // ── load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = { limit: PER_PAGE, page };
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
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  // ── derived ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) => c.title?.toLowerCase().includes(q) || c.category?.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const { sortKey, sortDir, handleSort, sortData } = useSorting();

  const categories = useMemo(() => {
    const set = new Set();
    courses.forEach((c) => c.category && set.add(c.category));
    return Array.from(set).sort();
  }, [courses]);

  const kpi = useMemo(() => ({
    total,
    published: courses.filter((c) => c.is_published).length,
    draft:     courses.filter((c) => !c.is_published).length,
    free:      courses.filter((c) => c.is_free).length,
    enrollments: courses.reduce((s, c) => s + (c._count?.enrollments || 0), 0),
    modules:     courses.reduce((s, c) => s + (c._count?.modules || 0), 0),
  }), [courses, total]);

  // ── sheet helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    setEditingCourse(null);
    setForm({ title: "", description: "", category: "", duration: "", is_published: false, is_free: true, thumbnail: "" });
    setSheetOpen(true);
  }

  function openEdit(c) {
    setEditingCourse(c);
    setForm({
      title: c.title || "",
      description: c.description || "",
      category: c.category || "",
      duration: c.duration ? String(c.duration) : "",
      is_published: !!c.is_published,
      is_free: !!c.is_free,
      thumbnail: c.thumbnail || "",
    });
    setSheetOpen(true);
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

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  if (loading && courses.length === 0) {
    return <PageLoader text="Carregando Allkademy…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Allkademy"
        description="Plataforma de cursos e aprendizado"
        actions={<>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={load}
                  className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <RefreshCw className="relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors" />
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
                  className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <Plus className="relative z-10 h-3.5 w-3.5 shrink-0 text-[#7d1b6a] group-hover:text-white transition-colors" />
                  <span className="relative z-10 text-xs font-semibold bg-clip-text text-transparent [background-image:linear-gradient(135deg,#1a2a6f_0%,#7d1b6a_55%,#c81a7f_100%)] group-hover:[background-image:none] group-hover:text-white transition-colors">
                    Novo Curso
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Criar novo curso</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Cursos",      value: total,             icon: BookOpen,      color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Publicados",  value: kpi.published,     icon: Globe,         color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Rascunhos",   value: kpi.draft,         icon: EyeOff,        color: "text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800/50" },
          { label: "Gratuitos",   value: kpi.free,          icon: DollarSign,    color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Inscrições",  value: kpi.enrollments,   icon: Users,         color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Módulos",     value: kpi.modules,       icon: Layers,        color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${bg} shrink-0`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input placeholder="Buscar curso…" className="pl-9 h-8 text-xs"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600">
                &lsaquo;
              </button>
              <span className="text-xs text-slate-500">{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="h-7 w-7 rounded flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600">
                &rsaquo;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto allka-table-scroll" style={{ maxHeight: "calc(100vh - 22rem)" }}>
          <table className="w-full text-sm min-w-150">
            <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Título" field="title" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Categoria</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Módulos</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Inscrições</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Duração</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Acesso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  <SortableHeader label="Criado em" field="created_at" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Carregando cursos…
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-sm text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen className="h-8 w-8 opacity-30" />
                    <p>Nenhum curso encontrado</p>
                    <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeiro curso
                    </Button>
                  </div>
                </td></tr>
              ) : (
                sortData(filtered).map((c, idx) => (
                  <tr
                    key={c.id}
                    className={idx % 2 === 0
                      ? "bg-[var(--table-row)] hover:bg-[var(--table-row-hover)]"
                      : "bg-[var(--table-row-alt)] hover:bg-[var(--table-row-hover)]"}
                  >
                    {/* title */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 max-w-[260px]">
                        {c.thumbnail ? (
                          <img src={c.thumbnail} alt={c.title}
                            className="w-9 h-9 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700" />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center shrink-0">
                            <BookOpen className="h-4 w-4 text-blue-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{c.title}</p>
                          {c.description && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{c.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* category */}
                    <td className="px-4 py-3"><CategoryBadge category={c.category} /></td>
                    {/* modules */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                        {c._count?.modules ?? 0}
                      </span>
                    </td>
                    {/* enrollments */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                        {c._count?.enrollments ?? 0}
                      </span>
                    </td>
                    {/* duration */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {fmtDuration(c.duration)}
                      </div>
                    </td>
                    {/* acesso */}
                    <td className="px-4 py-3">
                      {c.is_free ? (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700/40">
                          Gratuito
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/40">
                          Pago
                        </Badge>
                      )}
                    </td>
                    {/* status */}
                    <td className="px-4 py-3">
                      {c.is_published ? (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-700/40">
                          <Globe className="h-2.5 w-2.5 mr-1" /> Publicado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-600">
                          <EyeOff className="h-2.5 w-2.5 mr-1" /> Rascunho
                        </Badge>
                      )}
                    </td>
                    {/* created */}
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(c.created_at)}</td>
                    {/* actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* View detail */}
                        <button onClick={() => setDetailId(c.id)} title="Ver detalhes"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <FolderOpen className="h-3.5 w-3.5" />
                        </button>
                        {/* Publish toggle */}
                        <button disabled={togglingId === c.id} onClick={() => togglePublished(c)}
                          title={c.is_published ? "Despublicar" : "Publicar"}
                          className={`h-7 w-7 rounded flex items-center justify-center transition-colors disabled:opacity-40 ${c.is_published
                            ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                          {togglingId === c.id
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            : c.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        {/* Edit */}
                        <button onClick={() => openEdit(c)} title="Editar"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {/* Delete */}
                        <button onClick={() => setDeleteTarget(c.id)} title="Excluir"
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400">{total} curso{total !== 1 ? "s" : ""} no total</p>
        </div>
      </Card>

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
  );
}
