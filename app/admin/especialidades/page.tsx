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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { PageLoader } from "@/components/ui/loading";
import { useToast } from "@/components/ui/use-toast";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import {
  Briefcase, Plus, Pencil, Trash2, Users, DollarSign, Tag,
  RefreshCw, Search, CheckCircle2, XCircle, Bot, Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function AdminEspecialidadesPage() {
  useSidebar();
  const { toast } = useToast();

  const [specialties, setSpecialties] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [form, setForm] = useState({
    name: "", description: "", category: "", hourly_rate: "", required_skills: "", is_active: true,
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
    if (!search.trim()) return specialties;
    const q = search.toLowerCase();
    return specialties.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [specialties, search]);

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
    setForm({ name: "", description: "", category: "", hourly_rate: "", required_skills: "", is_active: true });
    setSheetOpen(true);
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
    });
    setSheetOpen(true);
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
      setSheetOpen(false);
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

  if (loading && specialties.length === 0) return <PageLoader text="Carregando especialidades…" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Especialidades</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie as especialidades e valores por hora</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={openCreate} className="h-8 gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nova Especialidade
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total",       value: kpi.total,     icon: Briefcase,    color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Ativas",      value: kpi.active,    icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Categorias",  value: kpi.categories,icon: Tag,          color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Média R$/h",  value: `R$ ${kpi.avgRate}`, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
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

      {/* Toolbar */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input placeholder="Buscar especialidade…" className="pl-9 h-8 text-xs"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 22rem)" }}>
          <table className="w-full text-sm">
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  <SortableHeader label="Criado em" field="created_at" type="date" sortKey={sortKey ? String(sortKey) : null} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                  <div className="flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Carregando…</div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-slate-400">
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
                  className={`${i % 2 === 0 ? "bg-[var(--table-row)]" : "bg-[var(--table-row-alt)]"} hover:bg-[var(--table-row-hover)] transition-colors`}>
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
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.description || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {s.hourly_rate > 0 ? `R$ ${Number(s.hourly_rate).toFixed(2)}/h` : "—"}
                    </span>
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
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400">{total} especialidade{total !== 1 ? "s" : ""} no total</p>
        </div>
      </Card>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editItem ? "Editar Especialidade" : "Nova Especialidade"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome <span className="text-red-500">*</span></Label>
              <Input placeholder="Ex: Design Gráfico" className="h-9 text-sm"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria <span className="text-red-500">*</span></Label>
                <Input placeholder="Ex: criativo" className="h-9 text-sm"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor por Hora (R$)</Label>
                <Input type="number" step="0.01" placeholder="75.00" className="h-9 text-sm"
                  value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="Descreva esta especialidade…" className="text-sm resize-none" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Habilidades Necessárias</Label>
              <Input placeholder="Ex: Figma, Illustrator, After Effects" className="h-9 text-sm"
                value={form.required_skills} onChange={e => setForm(f => ({ ...f, required_skills: e.target.value }))} />
              <p className="text-[10px] text-slate-400">Separe por vírgula</p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Especialidade Ativa</p>
                <p className="text-xs text-slate-400">Exibir nos filtros e formulários</p>
              </div>
              <Switch checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={actionLoading === "save"} onClick={handleSave}>
                {actionLoading === "save" ? "Salvando…" : editItem ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
