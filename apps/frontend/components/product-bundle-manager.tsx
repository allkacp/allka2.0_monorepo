"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/components/ui/use-toast";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { NeonBadge } from "@/components/neon-badge";
import {
  Boxes, Plus, Eye, Pencil, Trash2, Package, RefreshCw, Search,
  Loader2, X, Building2, Globe, GripVertical,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

function currency(v: number) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itemPrice(item: any): number {
  if (item.variation_id && item.variation) return item.variation.price || item.product?.base_price || 0;
  return item.product?.base_price || 0;
}

function bundleTotal(bundle: any): number {
  return (bundle.items || []).reduce((sum: number, item: any) => sum + itemPrice(item), 0);
}

const emptyForm = { name: "", description: "", category: "", is_active: true, items: [] as any[] };

interface ProductBundleManagerProps {
  /** Rota atual (pra PinToTrayButton) — /admin/combos ou /agency/combos. */
  basePath: string;
  /** true = tela do admin (vê/edita todos); false = tela da agência (só os seus + globais, globais são somente-leitura). */
  isAdminView: boolean;
}

export function ProductBundleManager({ basePath, isAdminView }: ProductBundleManagerProps) {
  const { toast } = useToast();
  const pageRef = useRef(null);

  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [panelOpen, setPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Busca de produtos pra adicionar ao combo
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getProductBundles();
      setBundles(res?.data ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar combos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!panelOpen || viewMode) return;
    const q = productSearch.trim();
    setSearchingProducts(true);
    const t = setTimeout(() => {
      apiClient
        .getProducts({ search: q || undefined, is_active: true, limit: 20 })
        .then((res: any) => setProductResults(res?.data ?? res ?? []))
        .catch(() => setProductResults([]))
        .finally(() => setSearchingProducts(false));
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch, panelOpen, viewMode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return bundles;
    const q = search.toLowerCase();
    return bundles.filter(
      (b) => b.name?.toLowerCase().includes(q) || b.category?.toLowerCase().includes(q),
    );
  }, [bundles, search]);

  function openCreate() {
    setEditItem(null);
    setViewMode(false);
    setForm(emptyForm);
    setProductSearch("");
    setPanelOpen(true);
  }

  function fillForm(b: any) {
    setForm({
      name: b.name || "",
      description: b.description || "",
      category: b.category || "",
      is_active: b.is_active !== false,
      items: (b.items || []).map((it: any) => ({
        product_id: it.product_id,
        variation_id: it.variation_id || null,
        product: it.product,
        variation: it.variation,
      })),
    });
  }

  function openEdit(b: any) {
    setEditItem(b);
    setViewMode(false);
    fillForm(b);
    setProductSearch("");
    setPanelOpen(true);
  }

  function openView(b: any) {
    setEditItem(b);
    setViewMode(true);
    fillForm(b);
    setPanelOpen(true);
  }

  // Combo global (agency_id null) só pode ser editado pelo admin — no
  // painel da agência, abrir um combo global mostra só leitura.
  function podeEditar(b: any) {
    return isAdminView || b.agency_id != null;
  }

  function addProduct(p: any) {
    setForm((f) => {
      if (f.items.some((it) => it.product_id === p.id)) return f;
      return { ...f, items: [...f.items, { product_id: p.id, variation_id: null, product: p }] };
    });
  }

  function removeProduct(productId: string) {
    setForm((f) => ({ ...f, items: f.items.filter((it) => it.product_id !== productId) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ title: "Informe o nome do combo", variant: "destructive" }); return; }
    if (form.items.length < 2) { toast({ title: "Um combo precisa de pelo menos 2 produtos", variant: "destructive" }); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      is_active: form.is_active,
      items: form.items.map((it) => ({ product_id: it.product_id, variation_id: it.variation_id || undefined })),
    };
    setSaving(true);
    try {
      if (editItem) {
        await apiClient.updateProductBundle(editItem.id, payload);
        toast({ title: "Combo atualizado" });
      } else {
        await apiClient.createProductBundle(payload);
        toast({ title: "Combo criado" });
      }
      setPanelOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Erro ao salvar combo", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiClient.deleteProductBundle(deleteTarget);
      toast({ title: "Combo removido" });
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast({ title: "Erro ao remover combo", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="relative h-full min-h-0 flex flex-col" ref={pageRef}>
      <div className="shrink-0 -mb-[11px]">
        <StandardPageBanner
          icon={Boxes}
          title="Combos de Produtos"
          description="Agrupe produtos já cadastrados em combos para vender projetos padronizados mais rápido"
          actions={<>
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={load}
                    className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
                    Novo Combo
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>Criar novo combo</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PinToTrayButton id="page-combos" label="Combos de Produtos" icon={Boxes} path={basePath} />
          </>}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="space-y-4">

        <div className="bg-white dark:bg-slate-900 border border-[#e8edf5] dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap px-[18px] py-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Nome ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando combos...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-500">
              <span className="text-sm font-medium">{error}</span>
              <button onClick={load} className="text-xs underline">Tentar novamente</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Boxes className="h-8 w-8 opacity-40" />
              <span className="text-sm">Nenhum combo cadastrado</span>
              <Button size="sm" variant="outline" className="mt-2 h-8 text-xs" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Criar primeiro combo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto allka-table-scroll-body">
              <table className="tabela-cartao w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-200/60 dark:border-slate-700/60">
                    <th className="py-3.5 px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-center" style={{ minWidth: 96, background: "var(--table-head)" }}>Ações</th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-left" style={{ background: "var(--table-head)" }}>Combo</th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-left" style={{ background: "var(--table-head)" }}>Categoria</th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-left" style={{ background: "var(--table-head)" }}>Produtos</th>
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-left" style={{ background: "var(--table-head)" }}>Total</th>
                    {isAdminView && (
                      <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-left" style={{ background: "var(--table-head)" }}>Origem</th>
                    )}
                    <th className="py-3.5 px-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] text-left" style={{ background: "var(--table-head)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b, i) => (
                    <tr
                      key={b.id}
                      className={`group transition-colors ${
                        i % 2 === 0
                          ? "bg-[#F1F4F9] dark:bg-[oklch(0.14_0.026_258)] hover:bg-[#D9E1ED] dark:hover:bg-[oklch(0.21_0.024_258)]"
                          : "bg-[#DCE3EE] dark:bg-[oklch(0.185_0.024_258)] hover:bg-[#C7D2E3] dark:hover:bg-[oklch(0.21_0.024_258)]"
                      }`}
                    >
                      <td className="px-1 py-2" style={{ minWidth: 96 }}>
                        <div className="flex items-center justify-center gap-1">
                          <TooltipProvider delayDuration={400}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => openView(b)} className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#2558FF] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white transition-all">
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs font-medium">Ver detalhes</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {podeEditar(b) && (
                            <>
                              <TooltipProvider delayDuration={400}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => openEdit(b)} className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-[#6E2C96] dark:text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white transition-all">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs font-medium">Editar combo</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={400}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={() => setDeleteTarget(b.id)} className="h-[26px] w-[26px] flex items-center justify-center rounded-[8px] bg-white dark:bg-slate-800 border border-[#e8edf5] dark:border-slate-700 text-red-500 dark:text-red-400 shadow-[0_4px_10px_rgba(15,23,42,0.06)] hover:bg-red-600 hover:text-white transition-all">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs font-medium">Remover combo</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </td>
                      <td data-rotulo="Combo" className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-700 flex items-center justify-center shrink-0 shadow-sm">
                            <Boxes className="h-4 w-4 text-white" />
                          </div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{b.name}</p>
                        </div>
                      </td>
                      <td data-rotulo="Categoria" className="py-3 px-4">
                        {b.category ? <NeonBadge color="blue" className="capitalize">{b.category}</NeonBadge> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td data-rotulo="Produtos" className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {(b.items || []).length} produto{(b.items || []).length !== 1 ? "s" : ""}
                      </td>
                      <td data-rotulo="Total" className="py-3 px-4">
                        <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{currency(bundleTotal(b))}</span>
                      </td>
                      {isAdminView && (
                        <td data-rotulo="Origem" className="py-3 px-4">
                          {b.agency_id ? (
                            <NeonBadge color="violet"><Building2 className="h-2.5 w-2.5 mr-1 inline" />{b.agency?.name || "Agência"}</NeonBadge>
                          ) : (
                            <NeonBadge color="slate"><Globe className="h-2.5 w-2.5 mr-1 inline" />Global</NeonBadge>
                          )}
                        </td>
                      )}
                      <td data-rotulo="Status" className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold w-fit border ${b.is_active ? "border-emerald-500 bg-emerald-200 text-emerald-900 dark:bg-emerald-800/70 dark:text-emerald-100" : "border-slate-400 bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-300"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${b.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {b.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>

      <EmbeddedSlideScreen
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={viewMode ? "Detalhes do Combo" : editItem ? "Editar Combo" : "Novo Combo"}
        subtitle={
          viewMode ? "Visualização somente leitura"
          : editItem ? "Atualize os produtos e dados do combo"
          : "Escolha 2 ou mais produtos já cadastrados para formar o combo"
        }
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" className="h-10 px-6 text-sm" onClick={() => setPanelOpen(false)}>
              {viewMode ? "Fechar" : "Cancelar"}
            </Button>
            {viewMode ? (
              podeEditar(editItem) && (
                <Button className="h-10 px-8 btn-brand border-0 shadow-md ml-auto" onClick={() => setViewMode(false)}>
                  Editar
                </Button>
              )
            ) : (
              <Button className="h-10 px-8 btn-brand border-0 shadow-md ml-auto" disabled={saving} onClick={handleSave}>
                {saving ? "Salvando..." : editItem ? "Salvar Alterações" : "Criar Combo"}
              </Button>
            )}
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900 px-6 py-6 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dados do Combo</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nome <span className="text-red-500">*</span></Label>
                <Input placeholder="Ex: Combo Presença Digital Completa" className="h-10 text-sm" disabled={viewMode}
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Categoria</Label>
                  <Input placeholder="Ex: marketing" className="h-10 text-sm" disabled={viewMode}
                    value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center justify-between w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Combo ativo</p>
                    <Switch checked={form.is_active} disabled={viewMode} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Descrição</Label>
                <Textarea placeholder="Descreva o que esse combo entrega..." className="text-sm resize-none" rows={3} disabled={viewMode}
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Produtos do combo</p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                Total: {currency(form.items.reduce((s, it) => s + itemPrice(it), 0))}
              </span>
            </div>

            {!viewMode && (
              <div className="px-5 pt-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9 text-sm"
                    placeholder="Buscar produto para adicionar..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                {(searchingProducts || productResults.length > 0) && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {searchingProducts ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
                      </div>
                    ) : (
                      productResults.map((p) => {
                        const already = form.items.some((it) => it.product_id === p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={already}
                            onClick={() => addProduct(p)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Package className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{p.category}</p>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">{currency(p.base_price)}</span>
                            {already && <span className="text-[10px] text-slate-400 shrink-0">já incluso</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-4 space-y-2">
              {form.items.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Nenhum produto adicionado ainda.</p>
              ) : (
                form.items.map((it, idx) => (
                  <div key={it.product_id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30">
                    <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{it.product?.name || it.product_id}</p>
                      <p className="text-[11px] text-slate-400 truncate">{it.product?.category}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 shrink-0">{currency(itemPrice(it))}</span>
                    {!viewMode && (
                      <button type="button" onClick={() => removeProduct(it.product_id)} className="text-slate-400 hover:text-red-500 shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
              {!viewMode && form.items.length > 0 && form.items.length < 2 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">Adicione pelo menos mais um produto — um combo precisa de 2 ou mais.</p>
              )}
            </div>
          </div>
        </div>
      </EmbeddedSlideScreen>

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover Combo"
        message="Tem certeza? Esta ação não pode ser desfeita. Combos já contratados em projetos não são afetados."
        confirmText="Remover"
        destructive
        onConfirm={handleDelete}
      />
    </div>
    </div>
  );
}
