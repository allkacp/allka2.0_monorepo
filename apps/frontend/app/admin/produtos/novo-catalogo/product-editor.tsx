"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Copy, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// Construtor de produto do novo catálogo (sprint de produtos, bloco 3/6).
// Ocupa o container padrão — SEM sobreposição grande sobre outra tela.
// 9 seções. Uma versão publicada é imutável (a UI bloqueia + o backend
// reaplica). Ordenação por setas (sem drag-drop). Preço/prazo vêm do
// backend — nunca calculados aqui.

const EFFECT_TYPES = [
  ["add_deadline_days", "Adicionar dias ao prazo"],
  ["add_fixed_amount", "Adicionar valor fixo"],
  ["add_percent", "Adicionar percentual"],
  ["add_task", "Incluir tarefa (condicional)"],
  ["remove_task", "Remover tarefa"],
  ["add_step", "Incluir etapa (condicional)"],
  ["require_info", "Exigir informação do cliente"],
  ["add_deliverable", "Adicionar entregável"],
] as const;
const OPERATORS = [["eq", "igual a"], ["neq", "diferente de"], ["gte", "maior ou igual a"], ["lte", "menor ou igual a"], ["contains", "contém"], ["selected", "está selecionado"], ["not_selected", "não está selecionado"]] as const;
const TRIGGERS = [["variation_option", "Opção de variação"], ["addon_selected", "Adicional selecionado"], ["quantity", "Quantidade"], ["client_answer", "Resposta do cliente"], ["contract_attribute", "Atributo da contratação"]] as const;
const EXEC_MODES = [["humano", "Humano"], ["ia", "IA"], ["hibrido", "Híbrido"]] as const;

export function ProductEditor({ productId, onBack }: { productId: string; onBack: () => void }) {
  const [product, setProduct] = useState<any>(null);
  const [refs, setRefs] = useState<{ pillars: any[]; fourF: any[]; categories: any[]; specialties: any[] }>({ pillars: [], fourF: [], categories: [], specialties: [] });
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, pil, ff, cat, sp] = await Promise.all([
      apiClient.getCatalog2Product(productId),
      apiClient.getCatalog2Pillars(),
      apiClient.getCatalog2FourF(),
      apiClient.getCatalog2Categories(),
      apiClient.getCatalog2Specialties(),
    ]);
    setProduct(p);
    setRefs({ pillars: pil.data, fourF: ff.data, categories: cat.data, specialties: sp.data });
    setSelectedVersionId((cur) => cur && p.versions.some((v: any) => v.id === cur) ? cur : (p.versions.find((v: any) => v.state === "rascunho")?.id ?? p.versions[0]?.id ?? ""));
    setLoading(false);
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  const version = useMemo(() => product?.versions.find((v: any) => v.id === selectedVersionId) ?? null, [product, selectedVersionId]);
  const readOnly = version?.state === "publicada";

  async function act(fn: () => Promise<any>, ok?: string) {
    setMsg(null);
    try { await fn(); if (ok) setMsg(ok); await load(); }
    catch (e: any) { setMsg(e?.message ?? "Falha na operação."); }
  }

  if (loading) return <div className="flex items-center gap-2 p-10 text-sm text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>;
  if (!product) return <div className="p-10 text-sm text-red-600">Produto não encontrado.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Catálogo</Button>
          <h2 className="text-lg font-semibold">{product.internal_name}</h2>
          <Badge>{product.status}</Badge>
          {product.is_new && <Badge className="bg-emerald-100 text-emerald-700">Novo</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={selectedVersionId} onChange={(e) => setSelectedVersionId(e.target.value)}>
            {product.versions.map((v: any) => (
              <option key={v.id} value={v.id}>v{v.version_number} — {v.state}{v.is_published_current ? " (publicada atual)" : ""}</option>
            ))}
          </select>
          {product.published_version_id && !product.versions.some((v: any) => v.state === "rascunho") && (
            <Button size="sm" variant="outline" onClick={() => act(() => apiClient.newCatalog2Version(productId), "Nova versão rascunho criada.")}>Nova versão</Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>
      {readOnly && <p className="rounded bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30">Versão publicada — somente leitura. Crie uma nova versão para editar.</p>}
      {msg && <p className="text-sm text-blue-600">{msg}</p>}

      {version && (
        <Tabs defaultValue="geral">
          <TabsList className="flex-wrap">
            <TabsTrigger value="geral">1. Geral</TabsTrigger>
            <TabsTrigger value="class">2. Classificações</TabsTrigger>
            <TabsTrigger value="var">3. Variações</TabsTrigger>
            <TabsTrigger value="add">4. Adicionais</TabsTrigger>
            <TabsTrigger value="tarefas">5. Tarefas e etapas</TabsTrigger>
            <TabsTrigger value="cond">6. Prazos e condições</TabsTrigger>
            <TabsTrigger value="custo">7. Custos e preço</TabsTrigger>
            <TabsTrigger value="preview">8. Pré-visualização</TabsTrigger>
            <TabsTrigger value="hist">9. Versões e histórico</TabsTrigger>
            <TabsTrigger value="origem">10. Origem e revisão</TabsTrigger>
          </TabsList>

          <TabsContent value="geral"><GeneralTab version={version} readOnly={readOnly} onSave={(b) => act(() => apiClient.updateCatalog2VersionInfo(version.id, b), "Salvo.")} product={product} onStatus={(s) => act(() => apiClient.setCatalog2ProductStatus(productId, s), "Situação atualizada.")} /></TabsContent>
          <TabsContent value="class"><ClassTab product={product} refs={refs} onSave={(b) => act(() => apiClient.updateCatalog2Classifications(productId, b), "Classificações salvas.")} /></TabsContent>
          <TabsContent value="var"><VariationsTab version={version} readOnly={readOnly} act={act} /></TabsContent>
          <TabsContent value="add"><AddonsTab version={version} readOnly={readOnly} act={act} /></TabsContent>
          <TabsContent value="tarefas"><TasksTab version={version} readOnly={readOnly} refs={refs} act={act} /></TabsContent>
          <TabsContent value="cond"><ConditionsTab version={version} readOnly={readOnly} act={act} /></TabsContent>
          <TabsContent value="custo"><CostTab version={version} refs={refs} act={act} onReloadRefs={load} /></TabsContent>
          <TabsContent value="preview"><PreviewTab version={version} /></TabsContent>
          <TabsContent value="hist"><HistoryTab version={version} readOnly={readOnly} act={act} /></TabsContent>
          <TabsContent value="origem"><OriginReviewTab productId={productId} onChanged={load} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ── 1. Geral ──────────────────────────────────────────────────────────
function GeneralTab({ version, readOnly, onSave, product, onStatus }: any) {
  const [f, setF] = useState({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" });
  useEffect(() => setF({ title: version.title ?? "", summary: version.summary ?? "", full_description: version.full_description ?? "", change_summary: version.change_summary ?? "" }), [version.id]);
  return (
    <div className="mt-3 space-y-3">
      <Field label="Título comercial"><Input disabled={readOnly} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="Descrição curta"><Textarea rows={2} disabled={readOnly} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
      <Field label="Descrição completa"><Textarea rows={5} disabled={readOnly} value={f.full_description} onChange={(e) => setF({ ...f, full_description: e.target.value })} /></Field>
      <Field label="Resumo da mudança (histórico)"><Input disabled={readOnly} value={f.change_summary} onChange={(e) => setF({ ...f, change_summary: e.target.value })} /></Field>
      <Field label="Situação do produto">
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={product.status} onChange={(e) => onStatus(e.target.value)}>
          {["em_preparacao", "disponivel", "temporariamente_inativo", "arquivado"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      {!readOnly && <Button size="sm" onClick={() => onSave(f)}>Salvar</Button>}
    </div>
  );
}

// ── 2. Classificações ─────────────────────────────────────────────────
function ClassTab({ product, refs, onSave }: any) {
  const [pillar, setPillar] = useState(product.pillar?.id ?? "");
  const [category, setCategory] = useState(product.category?.id ?? "");
  const [fourF, setFourF] = useState<string[]>(product.four_f.map((f: any) => f.id));
  return (
    <div className="mt-3 space-y-3">
      <Field label="Pilar">
        <select className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={pillar} onChange={(e) => setPillar(e.target.value)}>
          <option value="">—</option>{refs.pillars.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Categoria">
        <select className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">—</option>{refs.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Classificações 4F">
        <div className="flex flex-wrap gap-3">
          {refs.fourF.map((f: any) => (
            <label key={f.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={fourF.includes(f.id)} onChange={(e) => setFourF(e.target.checked ? [...fourF, f.id] : fourF.filter((x) => x !== f.id))} />
              {f.name}
            </label>
          ))}
        </div>
      </Field>
      <p className="text-xs text-neutral-400">A divergência de classificação entre a planilha principal e a Review Rose não é resolvida aqui — precisa de decisão comercial.</p>
      <Button size="sm" onClick={() => onSave({ pillar_id: pillar || null, category_id: category || null, four_f_ids: fourF })}>Salvar</Button>
    </div>
  );
}

// ── 3. Variações ─────────────────────────────────────────────────────
function VariationsTab({ version, readOnly, act }: any) {
  const [nv, setNv] = useState({ key: "", name: "" });
  return (
    <div className="mt-3 space-y-4">
      <p className="text-xs text-neutral-500">Escolhas OBRIGATÓRIAS do cliente. Cada opção pode ter efeitos (prazo/custo/tarefa/etapa/entregável/informação).</p>
      {version.variations.map((va: any) => (
        <div key={va.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="font-medium">{va.name} <span className="text-xs text-neutral-400">({va.key}){va.is_required ? " · obrigatória" : " · opcional"}</span></div>
            {!readOnly && <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.deleteCatalog2Variation(va.id), "Variação removida.")}><Trash2 className="h-4 w-4" /></Button>}
          </div>
          <ul className="mt-2 space-y-1.5">
            {va.options.map((o: any) => (
              <li key={o.id} className="rounded bg-neutral-50 px-2 py-1.5 text-sm dark:bg-neutral-800">
                <div className="flex items-center justify-between">
                  <span>{o.label} {o.is_default && <Badge className="ml-1 bg-blue-100 text-blue-700">padrão</Badge>}</span>
                  {!readOnly && <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.deleteCatalog2Option(o.id), "Opção removida.")}><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
                <EffectList effects={o.effects} readOnly={readOnly} onAdd={(b) => act(() => apiClient.addCatalog2OptionEffect(o.id, b), "Efeito adicionado.")} onDel={(id) => act(() => apiClient.deleteCatalog2OptionEffect(id), "Efeito removido.")} />
              </li>
            ))}
            {!readOnly && <AddOptionRow onAdd={(b) => act(() => apiClient.addCatalog2Option(va.id, b), "Opção adicionada.")} />}
          </ul>
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-end gap-2">
          <Field label="Nova variação — key"><Input value={nv.key} onChange={(e) => setNv({ ...nv, key: e.target.value })} /></Field>
          <Field label="Nome"><Input value={nv.name} onChange={(e) => setNv({ ...nv, name: e.target.value })} /></Field>
          <Button size="sm" onClick={() => nv.key && nv.name && act(() => apiClient.addCatalog2Variation(version.id, nv), "Variação criada.").then(() => setNv({ key: "", name: "" }))}><Plus className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
function AddOptionRow({ onAdd }: { onAdd: (b: any) => void }) {
  const [o, setO] = useState({ key: "", label: "" });
  return (
    <li className="flex items-end gap-2">
      <Field label="key"><Input value={o.key} onChange={(e) => setO({ ...o, key: e.target.value })} /></Field>
      <Field label="rótulo"><Input value={o.label} onChange={(e) => setO({ ...o, label: e.target.value })} /></Field>
      <Button size="sm" variant="outline" onClick={() => o.key && o.label && (onAdd(o), setO({ key: "", label: "" }))}>Adicionar opção</Button>
    </li>
  );
}
function EffectList({ effects, readOnly, onAdd, onDel }: any) {
  const [e, setE] = useState({ effect_type: "add_deadline_days", effect_value: "" });
  return (
    <div className="mt-1 ml-2 border-l-2 border-neutral-200 pl-2 dark:border-neutral-700">
      {(effects ?? []).map((ef: any) => (
        <div key={ef.id} className="flex items-center justify-between text-xs text-neutral-500">
          <span>{ef.effect_type} = {ef.effect_value}</span>
          {!readOnly && <button className="text-red-500" onClick={() => onDel(ef.id)}>×</button>}
        </div>
      ))}
      {!readOnly && (
        <div className="mt-1 flex items-center gap-1">
          <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 text-xs dark:border-neutral-700" value={e.effect_type} onChange={(ev) => setE({ ...e, effect_type: ev.target.value })}>
            {EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Input className="h-6 text-xs" value={e.effect_value} onChange={(ev) => setE({ ...e, effect_value: ev.target.value })} placeholder="valor" />
          <Button size="sm" variant="ghost" className="h-6" onClick={() => e.effect_value && (onAdd(e), setE({ ...e, effect_value: "" }))}><Plus className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}

// ── 4. Adicionais ────────────────────────────────────────────────────
function AddonsTab({ version, readOnly, act }: any) {
  const [na, setNa] = useState({ key: "", name: "", base_cost: "" });
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-neutral-500">Escolhas OPCIONAIS. Uma contratação sem adicional continua válida.</p>
      {version.addons.map((a: any) => (
        <div key={a.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>{a.name} <span className="text-xs text-neutral-400">({a.key}){a.base_cost != null ? ` · R$ ${a.base_cost}` : ""}</span></div>
            {!readOnly && <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.deleteCatalog2Addon(a.id), "Adicional removido.")}><Trash2 className="h-4 w-4" /></Button>}
          </div>
          <EffectList effects={a.effects} readOnly={readOnly} onAdd={(b: any) => act(() => apiClient.addCatalog2AddonEffect(a.id, b), "Efeito adicionado.")} onDel={(id: string) => act(() => apiClient.deleteCatalog2AddonEffect(id), "Efeito removido.")} />
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-end gap-2">
          <Field label="key"><Input value={na.key} onChange={(e) => setNa({ ...na, key: e.target.value })} /></Field>
          <Field label="nome"><Input value={na.name} onChange={(e) => setNa({ ...na, name: e.target.value })} /></Field>
          <Field label="custo (opcional)"><Input type="number" value={na.base_cost} onChange={(e) => setNa({ ...na, base_cost: e.target.value })} /></Field>
          <Button size="sm" onClick={() => na.key && na.name && act(() => apiClient.addCatalog2Addon(version.id, { key: na.key, name: na.name, base_cost: na.base_cost ? Number(na.base_cost) : null }), "Adicional criado.").then(() => setNa({ key: "", name: "", base_cost: "" }))}><Plus className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}

// ── 5. Tarefas e etapas ─────────────────────────────────────────────
function TasksTab({ version, readOnly, refs, act }: any) {
  const [nt, setNt] = useState({ key: "", name: "" });
  const tasks = version.tasks;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-neutral-500">Modelos do catálogo (não são tarefas de projetos). Ordene pelas setas. Publicada = imutável.</p>
      {tasks.map((t: any, i: number) => (
        <div key={t.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-medium">#{t.sort_order} {t.name}</span>
              <span className="ml-2 text-xs text-neutral-400">{t.execution_mode} · {t.estimated_minutes ?? "?"} min{t.specialty ? ` · ${t.specialty.name}` : ""}{t.is_conditional ? " · condicional" : ""}{t.requires_review ? " · revisão" : ""}</span>
            </div>
            {!readOnly && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, -1)))}><ChevronUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" disabled={i === tasks.length - 1} onClick={() => act(() => apiClient.reorderCatalog2Tasks(version.id, move(tasks.map((x: any) => x.id), i, 1)))}><ChevronDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => act(() => apiClient.duplicateCatalog2Task(t.id), "Tarefa duplicada.")}><Copy className="h-4 w-4" /></Button>
                <DeleteBtn label="Excluir tarefa?" onConfirm={() => act(() => apiClient.deleteCatalog2Task(t.id), "Tarefa removida.")} />
              </div>
            )}
          </div>
          {!readOnly && <TaskInlineEdit task={t} refs={refs} act={act} />}
          <ul className="mt-2 ml-3 space-y-1">
            {t.steps.map((s: any, si: number) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>{si + 1}. {s.name} <span className="text-xs text-neutral-400">{s.estimated_minutes ?? "?"} min{s.is_conditional ? " · condicional" : ""}</span></span>
                {!readOnly && (
                  <span className="flex gap-1">
                    <button disabled={si === 0} className="disabled:opacity-30" onClick={() => act(() => apiClient.reorderCatalog2Steps(t.id, move(t.steps.map((x: any) => x.id), si, -1)))}><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button disabled={si === t.steps.length - 1} className="disabled:opacity-30" onClick={() => act(() => apiClient.reorderCatalog2Steps(t.id, move(t.steps.map((x: any) => x.id), si, 1)))}><ChevronDown className="h-3.5 w-3.5" /></button>
                    <DeleteBtn label="Excluir etapa?" onConfirm={() => act(() => apiClient.deleteCatalog2Step(s.id), "Etapa removida.")} />
                  </span>
                )}
              </li>
            ))}
            {!readOnly && <AddStepRow onAdd={(b: any) => act(() => apiClient.addCatalog2Step(t.id, b), "Etapa adicionada.")} />}
          </ul>
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-end gap-2">
          <Field label="Nova tarefa — key"><Input value={nt.key} onChange={(e) => setNt({ ...nt, key: e.target.value })} /></Field>
          <Field label="nome"><Input value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} /></Field>
          <Button size="sm" onClick={() => nt.key && nt.name && act(() => apiClient.addCatalog2Task(version.id, nt), "Tarefa criada.").then(() => setNt({ key: "", name: "" }))}><Plus className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
function TaskInlineEdit({ task, refs, act }: any) {
  const [t, setT] = useState({ execution_mode: task.execution_mode, estimated_minutes: task.estimated_minutes ?? "", specialty_id: task.specialty?.id ?? "", is_conditional: task.is_conditional, requires_review: task.requires_review, requires_client_approval: task.requires_client_approval });
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.execution_mode} onChange={(e) => setT({ ...t, execution_mode: e.target.value })}>{EXEC_MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select className="rounded border border-neutral-300 bg-transparent px-1 py-0.5 dark:border-neutral-700" value={t.specialty_id} onChange={(e) => setT({ ...t, specialty_id: e.target.value })}><option value="">sem especialidade</option>{refs.specialties.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <label>min <input type="number" className="w-16 rounded border border-neutral-300 bg-transparent px-1 dark:border-neutral-700" value={t.estimated_minutes} onChange={(e) => setT({ ...t, estimated_minutes: e.target.value })} /></label>
      <label><input type="checkbox" checked={t.is_conditional} onChange={(e) => setT({ ...t, is_conditional: e.target.checked })} /> condicional</label>
      <label><input type="checkbox" checked={t.requires_review} onChange={(e) => setT({ ...t, requires_review: e.target.checked })} /> revisão</label>
      <label><input type="checkbox" checked={t.requires_client_approval} onChange={(e) => setT({ ...t, requires_client_approval: e.target.checked })} /> aprovação cliente</label>
      <Button size="sm" variant="outline" className="h-6" onClick={() => act(() => apiClient.updateCatalog2Task(task.id, { ...t, estimated_minutes: t.estimated_minutes === "" ? null : Number(t.estimated_minutes), specialty_id: t.specialty_id || null }), "Tarefa salva.")}>Salvar tarefa</Button>
      {(t.execution_mode === "ia" || t.execution_mode === "hibrido") && <AiConfig task={task} act={act} />}
    </div>
  );
}
function AiConfig({ task, act }: any) {
  const a = task.ai ?? {};
  const [f, setF] = useState({ est_input_tokens: a.est_input_tokens ?? "", est_output_tokens: a.est_output_tokens ?? "", unit_cost_input_per_1k: a.unit_cost_input_per_1k ?? "", unit_cost_output_per_1k: a.unit_cost_output_per_1k ?? "", est_review_rounds: a.est_review_rounds ?? "" });
  const n = (v: any) => (v === "" ? null : Number(v));
  return (
    <details className="w-full">
      <summary className="cursor-pointer text-neutral-500">IA: tokens e custo</summary>
      <div className="mt-1 flex flex-wrap gap-2">
        {(["est_input_tokens", "est_output_tokens", "unit_cost_input_per_1k", "unit_cost_output_per_1k", "est_review_rounds"] as const).map((k) => (
          <label key={k}>{k}<input type="number" className="w-20 rounded border border-neutral-300 bg-transparent px-1 dark:border-neutral-700" value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
        ))}
        <Button size="sm" variant="outline" className="h-6" onClick={() => act(() => apiClient.updateCatalog2TaskAI(task.id, { est_input_tokens: n(f.est_input_tokens), est_output_tokens: n(f.est_output_tokens), unit_cost_input_per_1k: n(f.unit_cost_input_per_1k), unit_cost_output_per_1k: n(f.unit_cost_output_per_1k), est_review_rounds: n(f.est_review_rounds) }), "IA salva.")}>Salvar IA</Button>
      </div>
    </details>
  );
}
function AddStepRow({ onAdd }: { onAdd: (b: any) => void }) {
  const [s, setS] = useState({ key: "", name: "", estimated_minutes: "" });
  return (
    <li className="flex items-end gap-2">
      <Field label="key"><Input value={s.key} onChange={(e) => setS({ ...s, key: e.target.value })} /></Field>
      <Field label="nome"><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
      <Field label="min"><Input type="number" value={s.estimated_minutes} onChange={(e) => setS({ ...s, estimated_minutes: e.target.value })} /></Field>
      <Button size="sm" variant="outline" onClick={() => s.key && s.name && (onAdd({ key: s.key, name: s.name, estimated_minutes: s.estimated_minutes ? Number(s.estimated_minutes) : null }), setS({ key: "", name: "", estimated_minutes: "" }))}>Adicionar etapa</Button>
    </li>
  );
}

// ── 6. Condições ────────────────────────────────────────────────────
function ConditionsTab({ version, readOnly, act }: any) {
  const [c, setC] = useState({ key: "", name: "", trigger_source: "variation_option", trigger_ref: "", operator: "selected", comparison_value: "", effect_type: "add_deadline_days", effect_value: "" });
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-neutral-500">Regras tipadas (gatilho → efeito). Sem código livre. O construtor recusa condições incompletas ou que apontem para tarefas/opções inexistentes.</p>
      {version.conditions.map((x: any) => (
        <div key={x.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="font-medium">{x.name} {!x.is_active && <Badge className="ml-1 bg-neutral-200 text-neutral-500">inativa</Badge>}</span>
            {!readOnly && <DeleteBtn label="Excluir condição?" onConfirm={() => act(() => apiClient.deleteCatalog2Condition(x.id), "Condição removida.")} />}
          </div>
          <p className="text-neutral-500">{x.explanation}</p>
        </div>
      ))}
      {!readOnly && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <Field label="key"><Input value={c.key} onChange={(e) => setC({ ...c, key: e.target.value })} /></Field>
            <Field label="nome"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
            <Field label="gatilho"><select className="w-full rounded border border-neutral-300 bg-transparent px-1 py-1 text-sm dark:border-neutral-700" value={c.trigger_source} onChange={(e) => setC({ ...c, trigger_source: e.target.value })}>{TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="referência (key)"><Input value={c.trigger_ref} onChange={(e) => setC({ ...c, trigger_ref: e.target.value })} /></Field>
            <Field label="operador"><select className="w-full rounded border border-neutral-300 bg-transparent px-1 py-1 text-sm dark:border-neutral-700" value={c.operator} onChange={(e) => setC({ ...c, operator: e.target.value })}>{OPERATORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="valor de comparação"><Input value={c.comparison_value} onChange={(e) => setC({ ...c, comparison_value: e.target.value })} /></Field>
            <Field label="efeito"><select className="w-full rounded border border-neutral-300 bg-transparent px-1 py-1 text-sm dark:border-neutral-700" value={c.effect_type} onChange={(e) => setC({ ...c, effect_type: e.target.value })}>{EFFECT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="valor do efeito"><Input value={c.effect_value} onChange={(e) => setC({ ...c, effect_value: e.target.value })} /></Field>
          </div>
          <Button size="sm" className="mt-2" onClick={() => c.key && c.name && c.effect_value && act(() => apiClient.addCatalog2Condition(version.id, { ...c, trigger_ref: c.trigger_ref || null, comparison_value: c.comparison_value || null }), "Condição criada.").then(() => setC({ ...c, key: "", name: "", effect_value: "" }))}>Adicionar condição</Button>
        </div>
      )}
    </div>
  );
}

// ── 7. Custos e preço (simulador) ───────────────────────────────────
function CostTab({ version, refs, act, onReloadRefs }: any) {
  const [sel, setSel] = useState<any>({ variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} });
  const [result, setResult] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    apiClient.getCatalog2PricingSettings().then(setPricing).catch(() => {});
    // default selection
    const opts: string[] = [];
    for (const va of version.variations) { const d = va.options.find((o: any) => o.is_default) ?? va.options[0]; if (d) opts.push(d.key); }
    setSel({ variation_option_keys: opts, addon_keys: version.addons.filter((a: any) => a.is_default_selected).map((a: any) => a.key), quantity: 1, answers: {} });
  }, [version.id]);

  const run = () => apiClient.simulateCatalog2(version.id, sel).then((r: any) => setResult(r.pricing)).catch((e: any) => setResult({ error: e?.message }));
  useEffect(() => { void run(); /* eslint-disable-next-line */ }, [JSON.stringify(sel), version.id]);

  return (
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Módulo de precificação (taxas e margens)</h3>
        {pricing && <PricingSettingsForm pricing={pricing} onSave={(b) => act(() => apiClient.updateCatalog2PricingSettings(b).then(setPricing), "Taxas salvas.")} />}
        <h3 className="mt-4 text-sm font-semibold">Valor/hora das especialidades (referência máxima)</h3>
        {refs.specialties.map((s: any) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span className="w-40 truncate">{s.name}</span>
            <Input className="w-24" type="number" defaultValue={s.max_hourly_rate ?? ""} onBlur={(e) => act(() => apiClient.updateCatalog2Specialty(s.id, { max_hourly_rate: e.target.value === "" ? null : Number(e.target.value) }).then(onReloadRefs))} />
            {s.max_hourly_rate == null && <span className="text-xs text-amber-600">aguardando definição comercial</span>}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Simulador</h3>
        {version.variations.map((va: any) => (
          <Field key={va.id} label={va.name}>
            <select className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700" value={sel.variation_option_keys.find((k: string) => va.options.some((o: any) => o.key === k)) ?? ""} onChange={(e) => setSel({ ...sel, variation_option_keys: [...sel.variation_option_keys.filter((k: string) => !va.options.some((o: any) => o.key === k)), e.target.value] })}>
              {va.options.map((o: any) => <option key={o.id} value={o.key}>{o.label}</option>)}
            </select>
          </Field>
        ))}
        <Field label="Adicionais">
          <div className="flex flex-wrap gap-2">
            {version.addons.map((a: any) => (
              <label key={a.id} className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={sel.addon_keys.includes(a.key)} onChange={(e) => setSel({ ...sel, addon_keys: e.target.checked ? [...sel.addon_keys, a.key] : sel.addon_keys.filter((k: string) => k !== a.key) })} />{a.name}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Quantidade"><Input type="number" value={sel.quantity} onChange={(e) => setSel({ ...sel, quantity: Number(e.target.value) || 1 })} /></Field>
        <Field label="Atributos/respostas (ex.: urgente=sim)">
          <Input placeholder="chave=valor;chave2=valor2" onBlur={(e) => {
            const answers: Record<string, string> = {};
            e.target.value.split(";").forEach((p) => { const [k, v] = p.split("="); if (k?.trim()) answers[k.trim()] = (v ?? "").trim(); });
            setSel({ ...sel, answers });
          }} />
        </Field>

        {result?.error ? <p className="text-sm text-red-600">{result.error}</p> : result && <PricingResultView r={result} />}
      </div>
    </div>
  );
}
function PricingSettingsForm({ pricing, onSave }: any) {
  const [f, setF] = useState({ tax_percent: pricing.tax_percent ?? "", commission_percent: pricing.commission_percent ?? "", operational_fee_percent: pricing.operational_fee_percent ?? "", profit_margin_percent: pricing.profit_margin_percent ?? "", human_review_percent: pricing.human_review_percent ?? "" });
  const n = (v: any) => (v === "" ? null : Number(v));
  return (
    <div className="space-y-1.5 text-sm">
      {(Object.keys(f) as (keyof typeof f)[]).map((k) => (
        <label key={k} className="flex items-center gap-2">
          <span className="w-44 text-xs">{k.replace(/_/g, " ")}</span>
          <Input className="w-20" type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          {f[k] === "" && <span className="text-[10px] text-amber-600">aguardando definição comercial</span>}
        </label>
      ))}
      <Button size="sm" onClick={() => onSave({ tax_percent: n(f.tax_percent), commission_percent: n(f.commission_percent), operational_fee_percent: n(f.operational_fee_percent), profit_margin_percent: n(f.profit_margin_percent), human_review_percent: n(f.human_review_percent) })}>Salvar taxas</Button>
    </div>
  );
}
function PricingResultView({ r }: { r: any }) {
  const money = (v: number | null) => (v == null ? <span className="text-amber-600">aguardando definição comercial</span> : `${r.currency} ${v.toFixed(2)}`);
  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <Row k={r.lines.human_cost.label} v={money(r.lines.human_cost.amount)} />
      <Row k={r.lines.ia_cost.label} v={money(r.lines.ia_cost.amount)} />
      <Row k={r.lines.human_review_cost.label} v={money(r.lines.human_review_cost.amount)} />
      <Row k={r.lines.addons.label} v={money(r.lines.addons.amount)} />
      <Row k={r.lines.variation_impacts.label} v={money(r.lines.variation_impacts.amount)} />
      <Row k="Impactos de condições" v={r.lines.condition_impacts.detail} />
      <Row k={r.lines.subtotal_cost.label} v={money(r.lines.subtotal_cost.amount)} />
      <Row k="Custo direto (humano + IA)" v={money(r.lines.direct_cost?.amount ?? null)} />
      {!r.order_defined && <p className="text-[11px] text-amber-600">Ordem de incidência das taxas não confirmada — usando a ordem-padrão (imposto → comissão → operacional → margem). Confirme no módulo de precificação.</p>}
      {r.lines.taxes_and_margins.map((t: any, i: number) => <Row key={i} k={t.label} v={t.amount == null ? <span className="text-amber-600">{t.detail}</span> : money(t.amount)} />)}
      <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
      <Row k="Preço mínimo permitido (= custo direto)" v={money(r.lines.minimum_price.amount)} />
      <Row k={<strong>Preço comercial final</strong>} v={<strong>{money((r.lines.commercial_final_price ?? r.lines.final_price).amount)}</strong>} />
      <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
      <Row k="Esforço interno estimado" v={`${r.deadline?.effort_days ?? "—"} dia(s) úteis`} />
      <Row
        k="Prazo comercial"
        v={r.deadline?.commercial_deadline_pending
          ? <span className="text-amber-600">aguardando definição comercial</span>
          : `${r.deadline?.commercial_deadline_days} dia(s)`}
      />
      <p className="mt-1 text-[11px] text-neutral-400">
        O esforço é planejamento interno (min ÷ {480}) e <strong>não</strong> é promessa de entrega ao cliente. O prazo
        comercial é definido à parte (base + dias de variações/condições/adicionais).
      </p>
      <p className="mt-1 text-xs text-neutral-400">{r.deadline_detail}</p>
      {r.pending_info?.length > 0 && (
        <p className="mt-1 text-xs text-amber-600">Aguardando definição comercial: {r.pending_info.join("; ")}.</p>
      )}
      {r.warnings.length > 0 && <ul className="mt-1 list-inside list-disc text-xs text-amber-600">{r.warnings.map((w: any, i: number) => <li key={i}>{w.message}</li>)}</ul>}
    </div>
  );
}
function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return <div className="flex items-center justify-between py-0.5"><span className="text-neutral-500">{k}</span><span>{v}</span></div>;
}

// ── 8. Pré-visualização ─────────────────────────────────────────────
function PreviewTab({ version }: any) {
  const [p, setP] = useState<any>(null);
  useEffect(() => { apiClient.previewCatalog2Version(version.id).then(setP).catch(() => setP({ error: true })); }, [version.id]);
  if (!p) return <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (p.error) return <p className="mt-3 text-sm text-red-600">Não foi possível carregar.</p>;
  return (
    <div className="mt-3 max-w-lg rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-lg font-semibold">{p.title || p.name}</div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{p.description}</p>
      <div className="mt-2 text-xs text-neutral-500">{p.pillar} · {p.category} · {p.four_f.join(", ")}</div>
      {p.variations.length > 0 && <div className="mt-3 text-sm"><strong>Variações:</strong> {p.variations.map((v: any) => `${v.name} (${v.options.join("/")})`).join(" · ")}</div>}
      {p.addons.length > 0 && <div className="mt-1 text-sm"><strong>Adicionais:</strong> {p.addons.map((a: any) => a.name).join(", ")}</div>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm">
          Prazo comercial: {p.commercial_deadline_pending || p.estimated_deadline_days == null ? "a definir" : `${p.estimated_deadline_days} dia(s)`}
          {p.effort_days != null && <span className="text-neutral-400"> · esforço interno {p.effort_days} d</span>}
        </span>
        <span className="text-lg font-semibold">{p.price_pending ? "Preço: a definir" : `${p.currency} ${Number(p.price).toFixed(2)}`}</span>
      </div>
      {p.pending_info?.length > 0 && <p className="mt-1 text-[10px] text-amber-600">Aguardando definição comercial: {p.pending_info.join("; ")}.</p>}
      <p className="mt-2 text-[10px] text-neutral-400">A pré-visualização usa exatamente o mesmo cálculo do backend (seleção padrão). Esforço interno ≠ promessa de entrega.</p>
    </div>
  );
}

// ── 9. Versões e histórico ─────────────────────────────────────────
function HistoryTab({ version, readOnly, act }: any) {
  const [val, setVal] = useState<any>(null);
  const [summary, setSummary] = useState("");
  useEffect(() => { apiClient.validateCatalog2Version(version.id).then(setVal).catch(() => setVal(null)); }, [version.id]);
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Validação para publicar</h3>
        {!val ? "…" : val.ok ? <p className="text-sm text-emerald-600">Tudo certo para publicar.</p> : (
          <ul className="list-inside list-disc text-sm text-red-600">{val.issues.map((i: string, k: number) => <li key={k}>{i}</li>)}</ul>
        )}
        {val?.pricing_pending && <p className="text-xs text-amber-600">Preço com pendência comercial — pode publicar com "situação comercial pendente".</p>}
        {!readOnly && (
          <div className="mt-2 flex items-end gap-2">
            <Field label="Resumo da mudança"><Input value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
            <PublishBtn versionId={version.id} canPublish={!!val?.ok} pending={!!val?.pricing_pending} summary={summary} act={act} />
          </div>
        )}
      </div>
      <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Histórico da versão</h3>
        <ul className="text-sm">
          {(version.history ?? []).map((h: any, k: number) => (
            <li key={k} className="text-neutral-500">{new Date(h.at).toLocaleString("pt-BR")} — {h.event_type}{h.note ? ` — ${h.note}` : ""}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
function PublishBtn({ versionId, canPublish, pending, summary, act }: any) {
  const [open, setOpen] = useState(false);
  const clientActionId = useMemo(() => `pub-${versionId}-${Date.now()}`, [versionId, open]);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Publicar versão</Button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Publicar esta versão?"
        message={canPublish ? "A versão ficará imutável. Mudanças futuras exigem uma nova versão." : pending ? "Há pendência comercial de preço. Publicar assim mesmo (situação comercial pendente)?" : "Há pendências — não é possível publicar."}
        confirmText="Publicar"
        destructive={false}
        onConfirm={() => act(() => apiClient.publishCatalog2Version(versionId, { client_action_id: clientActionId, change_summary: summary, force: pending && !canPublish ? true : undefined }), "Versão publicada.")}
      />
    </>
  );
}

// ── 10. Origem e revisão (importação dos 36 — bloco 4/6) ────────────
const PENDENCY_LABEL: Record<string, string> = {
  content_review_pending: "Revisar conteúdo preservado",
  classification_decision_pending: "Decidir classificação (categoria × área)",
  price_pending: "Definir preço comercial",
  deadline_pending: "Definir prazo comercial",
  portfolio_pending: "Anexar portfólio",
  rose_review_pending: "Revisão da Rose pendente",
};

function OriginReviewTab({ productId, onChanged }: { productId: string; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "not_imported" | "error">("loading");
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(() => {
    setState("loading");
    apiClient
      .getCatalog2ProductOrigin(productId)
      .then((d: any) => { setData(d); setState("ready"); })
      .catch((e: any) => setState(e?.status === 404 ? "not_imported" : "error"));
  }, [productId]);
  useEffect(() => { reload(); }, [reload]);

  if (state === "loading") return <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (state === "not_imported") return <p className="mt-3 rounded bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:bg-neutral-800">Este produto não veio da importação dos 36 — foi criado manualmente no construtor.</p>;
  if (state === "error" || !data) return <p className="mt-3 text-sm text-red-600">Não foi possível carregar a origem.</p>;

  const hp = data.historical_price ?? {};
  async function resolve(key: string) {
    const decision = (decisions[key] ?? "").trim();
    if (!decision) { setMsg("Descreva a decisão antes de concluir a pendência."); return; }
    setMsg(null);
    try {
      await apiClient.resolveCatalog2Pendency(productId, { pendency_key: key, decision });
      setDecisions((d) => ({ ...d, [key]: "" }));
      reload();
      onChanged();
    } catch (e: any) {
      setMsg(e?.message ?? "Falha ao concluir a pendência.");
    }
  }

  return (
    <div className="mt-3 space-y-4 text-sm">
      {msg && <p className="text-blue-600">{msg}</p>}

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="font-semibold">Planilha principal (fonte da identidade)</h3>
        <p className="text-xs text-neutral-500">#{data.source.index} · {data.source.name} · chave <code>{data.source.key}</code></p>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {Object.entries(data.main_fields ?? {}).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-neutral-400">{k}</dt><dd className="truncate">{fmt(v)}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="font-semibold">Revisão da Rose</h3>
        {data.rose_reviewed ? (
          <>
            <p className="text-xs text-neutral-500">
              Casada com a planilha principal. Área sugerida pela Rose: <strong>{data.area_rose ?? "—"}</strong>{" "}
              <span className="text-neutral-400">(nunca substitui a categoria automaticamente)</span>
            </p>
            {data.rose_changed_fields?.length > 0 ? (
              <div className="mt-2">
                <div className="text-xs font-medium text-neutral-500">Campos que a Rose alterou:</div>
                <ul className="list-inside list-disc text-xs">
                  {data.rose_changed_fields.map((k: string) => (
                    <li key={k}><span className="text-neutral-400">{k}:</span> {fmt(data.rose_fields?.[k])}</li>
                  ))}
                </ul>
              </div>
            ) : <p className="mt-1 text-xs text-neutral-400">Nenhum campo textual da Rose foi aplicado (campos vazios não apagam a principal).</p>}
          </>
        ) : (
          <p className="text-xs text-amber-600">Sem revisão da Rose para este produto — dado da planilha principal + pendência "Revisão da Rose pendente".</p>
        )}
      </section>

      {data.divergences?.length > 0 && (
        <section className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-900 dark:bg-orange-950/20">
          <h3 className="font-semibold text-orange-800 dark:text-orange-300">Divergências registradas (nunca ocultadas)</h3>
          <ul className="mt-1 space-y-1 text-xs">
            {data.divergences.map((d: any, i: number) => (
              <li key={i}>
                <Badge className="mr-1 bg-orange-100 text-orange-700">{d.type}</Badge>
                {d.detail} {d.decision_pending && <span className="font-medium text-orange-700">— decisão pendente</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="font-semibold">Referência histórica de preço</h3>
        <p className="text-xs">
          {hp.min == null && hp.max == null
            ? "Sem referência na planilha."
            : `${hp.min ?? "?"} – ${hp.max ?? "?"}`}{" "}
          <span className="text-neutral-400">— {hp.note}</span>
        </p>
        <p className="text-[11px] text-amber-600">Não é o preço final e não é usada automaticamente no cálculo.</p>
      </section>

      {data.original_texts && Object.keys(data.original_texts).length > 0 && (
        <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <h3 className="font-semibold">Textos originais preservados</h3>
          <p className="text-[11px] text-neutral-400">Preservados na íntegra quando não puderam ser estruturados com segurança. Nada foi inventado.</p>
          <dl className="mt-2 space-y-1 text-xs">
            {Object.entries(data.original_texts).map(([k, v]) => v ? (
              <div key={k}><dt className="text-neutral-400">{k}</dt><dd className="whitespace-pre-wrap rounded bg-neutral-50 p-1.5 dark:bg-neutral-800">{fmt(v)}</dd></div>
            ) : null)}
          </dl>
        </section>
      )}

      <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="font-semibold">Pendências para decisão</h3>
        <p className="text-[11px] text-neutral-400">
          Estado de preparo atual: <Badge className="bg-amber-100 text-amber-700">{data.review_state}</Badge>. Concluir uma
          pendência altera só o rascunho, registra quem/quando/decisão e preserva a divergência original no histórico.
        </p>
        {data.pendencies.length === 0 ? (
          <p className="mt-2 text-xs text-emerald-600">Nenhuma pendência aberta — pronto para revisão final.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.pendencies.map((key: string) => (
              <li key={key} className="rounded border border-neutral-200 p-2 dark:border-neutral-700">
                <div className="text-xs font-medium">{PENDENCY_LABEL[key] ?? key}</div>
                <Textarea
                  rows={2}
                  className="mt-1 text-xs"
                  placeholder="Descreva a decisão tomada (ex.: preço comercial definido em R$ X; ou 'mantida a categoria Redação, área da Rose registrada como especialidade')."
                  value={decisions[key] ?? ""}
                  onChange={(e) => setDecisions((d) => ({ ...d, [key]: e.target.value }))}
                />
                <Button size="sm" className="mt-1" onClick={() => resolve(key)}>Concluir pendência</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.resolutions?.length > 0 && (
        <section className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <h3 className="font-semibold">Histórico de resoluções</h3>
          <ul className="mt-1 space-y-1 text-xs">
            {data.resolutions.map((r: any) => (
              <li key={r.id} className="text-neutral-500">
                {new Date(r.resolved_at).toLocaleString("pt-BR")} — <strong>{PENDENCY_LABEL[r.pendency_key] ?? r.pendency_key}</strong>: {r.decision}
                {r.original_divergence && <div className="text-neutral-400">divergência preservada: {JSON.stringify(r.original_divergence)}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.human_edited_at && (
        <p className="text-[11px] text-sky-600">
          Rascunho editado por humano em {new Date(data.human_edited_at).toLocaleString("pt-BR")} — o importador não sobrescreve mais este produto.
        </p>
      )}
      <p className="text-[11px] text-neutral-400">Observações da importação: {data.observations ?? "—"} · último checksum <code>{String(data.last_import_checksum ?? "").slice(0, 12)}…</code></p>
    </div>
  );
}
function fmt(v: unknown): string {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ── helpers ────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</span>{children}</label>;
}
function DeleteBtn({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="text-red-500" onClick={() => setOpen(true)}><Trash2 className="h-3.5 w-3.5" /></button>
      <ConfirmationDialog open={open} onClose={() => setOpen(false)} title={label} message="Esta ação não pode ser desfeita." confirmText="Excluir" destructive onConfirm={onConfirm} />
    </>
  );
}
function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const c = [...arr];
  const j = i + dir;
  if (j < 0 || j >= c.length) return c;
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}
