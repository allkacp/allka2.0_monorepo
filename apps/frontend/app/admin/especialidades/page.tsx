// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { ExportButton } from "@/components/export-button";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import {
  Briefcase, Plus, Pencil, Trash2, Users, DollarSign, Tag,
  RefreshCw, Search, CheckCircle2, XCircle, Bot, Sparkles, Zap,
  ChevronDown, Settings, Brain, Filter,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";

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

export default function AdminEspecialidadesPage() {
  const { sidebarWidth } = useSidebar();
  const { toast } = useToast();

  const [specialties, setSpecialties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive | ai

  const [form, setForm] = useState({
    name: "", description: "", category: "", hourly_rate: "",
    required_skills: "", is_active: true,
    // AI
    ai_enabled: false, ai_provider: "openai", ai_model: "", ai_instructions: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getSpecialties({ limit: 200 });
      const data = Array.isArray(res) ? res : res?.data || [];
      setSpecialties(data);
      setTotal(Array.isArray(res) ? data.length : res?.total || data.length);
    } catch (err) {
      console.error("[Especialidades] load:", err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let arr = specialties;
    if (statusFilter === "active")   arr = arr.filter(s => s.is_active);
    if (statusFilter === "inactive") arr = arr.filter(s => !s.is_active);
    if (statusFilter === "ai")       arr = arr.filter(s => s.ai_enabled);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [specialties, search, statusFilter]);

  const { sortKey, sortDir, handleSort, sortData } = useSorting();

  const kpi = useMemo(() => ({
    total: specialties.length,
    active: specialties.filter(s => s.is_active).length,
    categories: new Set(specialties.map(s => s.category).filter(Boolean)).size,
    avgRate: specialties.length > 0
      ? Math.round(specialties.reduce((s, e) => s + (Number(e.hourly_rate) || 0), 0) / specialties.length)
      : 0,
  }), [specialties]);

  function openCreate() {
    setEditItem(null);
    setForm({
      name: "", description: "", category: "", hourly_rate: "",
      required_skills: "", is_active: true,
      ai_enabled: false, ai_provider: "openai", ai_model: "", ai_instructions: "",
    });
    setPanelOpen(true);
  }

  function openEdit(item) {
    setEditItem(item);
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
    } finally { setActionLoading(null); }
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
    } finally { setActionLoading(null); }
  }

  const selectedProvider = AI_PROVIDERS.find(p => p.value === form.ai_provider);

  if (loading && specialties.length === 0) return <PageLoader text="Carregando especialidades…" />;

  const left = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(sidebarWidth) || 240;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Especialidades"
        description="Gerencie especialidades, valores e integrações de IA"
        actions={<>
          <Button variant="outline" size="sm" onClick={load} className="h-9 gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <ExportButton filename="especialidades" />
          <Button size="sm" onClick={openCreate} className="h-9 gap-2 btn-brand shadow-md border-0">
            <Plus className="h-4 w-4" /> Nova Especialidade
          </Button>
        </>}
      />

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total",      value: kpi.total,          icon: Briefcase,    color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Ativas",     value: kpi.active,         icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Categorias", value: kpi.categories,     icon: Tag,          color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Média R$/h", value: `R$ ${kpi.avgRate}`,icon: DollarSign,   color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${bg} shrink-0`}><Icon className={`h-3.5 w-3.5 ${color}`} /></div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* toolbar inside card */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Buscar especialidade…" className="pl-9 h-9 text-sm w-full"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
            {filtered.length} de{" "}
            <span className="font-semibold text-slate-600 dark:text-slate-300">{specialties.length}</span>{" "}
            especialidade{specialties.length !== 1 ? "s" : ""}
          </span>
          {/* status filters */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { key: "all",      label: "Todos" },
              { key: "active",   label: "Ativas",   dot: "#10b981" },
              { key: "inactive", label: "Inativas", dot: "#94a3b8" },
              { key: "ai",       label: "Com IA",   dot: "#8b5cf6" },
            ].map(({ key, label, dot }) => {
              const active = statusFilter === key;
              return (
                <button key={key} onClick={() => setStatusFilter(key)}
                  style={active && dot ? { background: dot, border: `2px solid ${dot}`, color: "#fff", boxShadow: `0 2px 10px ${dot}55` } : {}}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center gap-1.5 ${
                    active && !dot
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow"
                      : active
                      ? ""
                      : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                  }`}>
                  {dot && (
                    <span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background: active ? "rgba(255,255,255,0.7)" : dot, flexShrink:0 }} />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 24rem)" }}>
          <table className="w-full text-sm min-w-[600px]">
            <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--table-head)", boxShadow: "0 1px 0 rgba(148,163,184,0.3)" }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader label="Nome" field="name" type="text" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  <SortableHeader label="R$/h" field="hourly_rate" type="number" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">IA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  <SortableHeader label="Criado em" field="created_at" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  <div className="flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Carregando…</div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-sm text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Briefcase className="h-8 w-8 opacity-30" />
                    <p>Nenhuma especialidade encontrada</p>
                    <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreate}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeira especialidade
                    </Button>
                  </div>
                </td></tr>
              ) : sortData(filtered).map((s, i) => (
                <tr key={s.id}
                  className={`${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"} hover:bg-table-row-hover transition-colors`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 shrink-0">
                        <Briefcase className="h-3 w-3 text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.category ? (
                      <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-600 capitalize">
                        {s.category}
                      </Badge>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 max-w-50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.description || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {s.hourly_rate > 0 ? `R$ ${Number(s.hourly_rate).toFixed(2)}/h` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.ai_enabled ? (
                      <Badge variant="outline" className="text-[10px] font-semibold bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 gap-1">
                        <Bot className="h-2.5 w-2.5" />
                        {AI_PROVIDERS.find(p => p.value === s.ai_provider)?.label?.split(" ")[0] || "IA"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Ativa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400">
                        <XCircle className="h-2.5 w-2.5 mr-1" /> Inativa
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} title="Editar"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(s.id)} title="Remover"
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/20">
          <p className="text-xs text-slate-400">{total} especialidade{total !== 1 ? "s" : ""} no total</p>
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:"#10b981" }} />{specialties.filter(s=>s.is_active).length} Ativas</span>
            <span className="flex items-center gap-1"><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:"#94a3b8" }} />{specialties.filter(s=>!s.is_active).length} Inativas</span>
            <span className="flex items-center gap-1"><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:"#8b5cf6" }} />{specialties.filter(s=>s.ai_enabled).length} Com IA</span>
          </div>
        </div>
      </Card>

      {/* Create / Edit Slide Panel */}
      {panelOpen && (
        <div
          data-slot="sheet-content"
          data-state="open"
          className="fixed top-0 z-80 h-screen bg-background flex flex-col shadow-2xl border-l border-border overflow-hidden animate-in slide-in-from-right fade-in-0 duration-300"
          style={{ left: `${left}px`, width: `calc(100vw - ${left}px)` }}>

          <ModalBrandHeader
            title={editItem ? "Editar Especialidade" : "Nova Especialidade"}
            subtitle={editItem ? "Atualize os dados da especialidade" : "Configure uma nova especialidade e valor por hora"}
            icon={<Briefcase />}
            onClose={() => setPanelOpen(false)}
          />

          {/* Scrollable body */}
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
                  <Input placeholder="Ex: Design Gráfico AI" className="h-10 text-sm"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Categoria <span className="text-red-500">*</span>
                    </Label>
                    <Input placeholder="Ex: criativo" className="h-10 text-sm"
                      value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor por Hora (R$)</Label>
                    <Input type="number" step="0.01" placeholder="75.00" className="h-10 text-sm"
                      value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descrição</Label>
                  <Textarea placeholder="Descreva esta especialidade…" className="text-sm resize-none" rows={3}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Habilidades Necessárias</Label>
                  <Input placeholder="Ex: Figma, Illustrator, After Effects" className="h-10 text-sm"
                    value={form.required_skills} onChange={e => setForm(f => ({ ...f, required_skills: e.target.value }))} />
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
                  onCheckedChange={v => setForm(f => ({ ...f, ai_enabled: v }))}
                />
              </div>

              {form.ai_enabled ? (
                <div className="px-5 py-5 space-y-4">
                  {/* Provider selector */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Provedor de IA</Label>
                      <Select value={form.ai_provider} onValueChange={v => setForm(f => ({ ...f, ai_provider: v, ai_model: "" }))}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Selecione o provedor…" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_PROVIDERS.map(p => (
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
                        <Select value={form.ai_model} onValueChange={v => setForm(f => ({ ...f, ai_model: v }))}>
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Selecione o modelo…" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedProvider.models.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="Ex: gpt-4o, claude-3-opus" className="h-10 text-sm"
                          value={form.ai_model} onChange={e => setForm(f => ({ ...f, ai_model: e.target.value }))} />
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Instruções para a IA
                    </Label>
                    <Textarea
                      placeholder={"Ex: Você é um designer especialista em UI/UX. Ao receber uma tarefa, analise o briefing e gere uma proposta criativa detalhada com paleta de cores, tipografia e estrutura visual…"}
                      className="text-sm resize-none" rows={5}
                      value={form.ai_instructions}
                      onChange={e => setForm(f => ({ ...f, ai_instructions: e.target.value }))} />
                    <p className="text-[10px] text-slate-400">
                      Estas instruções serão enviadas como contexto sempre que uma tarefa desta especialidade for criada.
                    </p>
                  </div>

                  {/* Info banner */}
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
                  <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <Button variant="outline" className="h-10 px-6 text-sm" onClick={() => setPanelOpen(false)}>Cancelar</Button>
            {form.ai_enabled && (
              <span className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 flex-1">
                <Sparkles className="h-3.5 w-3.5" />
                IA: {AI_PROVIDERS.find(p => p.value === form.ai_provider)?.label?.split(" ")[0] || "—"}
                {form.ai_model ? ` · ${form.ai_model}` : ""}
              </span>
            )}
            <Button className="h-10 px-8 btn-brand border-0 shadow-md" disabled={actionLoading === "save"} onClick={handleSave}>
              {actionLoading === "save" ? "Salvando…" : editItem ? "Salvar Alterações" : "Criar Especialidade"}
            </Button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Remover Especialidade"
        description="Tem certeza? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
