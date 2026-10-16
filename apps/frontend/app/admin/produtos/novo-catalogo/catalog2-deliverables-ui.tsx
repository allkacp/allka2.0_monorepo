"use client";

// Entregáveis e anexos estruturados da tarefa (Pedido 3, fase 3 + 16/10): o que deve ser entregue/enviado, em qual etapa e momento,
// em que formato, com qual arquivo-modelo, quem envia, se precisa de prova (evidência), de qualificação interna e de aprovação do cliente,
// se vale só na primeira execução ou em todo ciclo, se é condicional e quem pode ver. Cada entregável tem um ID permanente (a chave).
// Dá para REUTILIZAR um entregável já cadastrado em outro produto.
import { useState } from "react";
import { Copy, Download, Paperclip, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { VisibilitySelect, type Visibility } from "./catalog2-ops-ui";

export const DELIVERABLE_TYPES: [string, string][] = [["arquivo", "Arquivo (link do arquivo)"], ["link", "Link"], ["texto", "Texto"], ["registro_sistema", "Registro do sistema"], ["outro", "Outro"]];
export const DELIVERABLE_RESPONSIBLES: [string, string][] = [["executor", "Executor"], ["lider", "Líder"], ["agencia", "Agência"], ["cliente", "Cliente"], ["sistema", "Sistema"]];
export const DELIVERABLE_MOMENTS: [string, string][] = [["", "Sem momento definido"], ["step_end", "Ao concluir a etapa"], ["cycle_end", "No fim do ciclo"], ["before_approval", "Antes da aprovação do cliente"], ["on_request", "Sob demanda"]];
export const DELIVERABLE_CYCLE_SCOPES: [string, string][] = [["every_cycle", "Todo ciclo"], ["first_execution", "Só na primeira execução"]];
const sel = "h-7 rounded-md border border-slate-200 bg-white px-1 text-[11px] dark:border-slate-700 dark:bg-slate-900";
const FILE_PREFIX = "file:";

const fieldsOf = (d: any) => ({
  name: d.name ?? "", description: d.description ?? "", type: d.type ?? "arquivo", format: d.format ?? "", responsible: d.responsible ?? "executor", step_id: d.step_id ?? "",
  delivery_moment: d.delivery_moment ?? "", is_required: d.is_required ?? true, requires_approval: d.requires_approval ?? true, evidence_required: !!d.evidence_required,
  requires_qualification: !!d.requires_qualification, cycle_scope: d.cycle_scope ?? "every_cycle", is_conditional: !!d.is_conditional, condition_text: (() => { try { return d.condition_json ? String(JSON.parse(d.condition_json).text ?? "") : ""; } catch { return ""; } })(),
  template_url: d.template_url ?? "", template_name: d.template_name ?? "", visibility: (d.visibility ?? "client") as Visibility,
});
type Fields = ReturnType<typeof fieldsOf>;
const payloadOf = (v: Fields) => ({
  name: v.name.trim(), description: v.description.trim() || null, type: v.type, format: v.format.trim() || null, responsible: v.responsible, step_id: v.step_id || null,
  delivery_moment: v.delivery_moment || null, is_required: v.is_required, requires_approval: v.requires_approval, evidence_required: v.evidence_required,
  requires_qualification: v.requires_qualification, cycle_scope: v.cycle_scope, is_conditional: v.is_conditional,
  condition_json: v.is_conditional && v.condition_text.trim() ? JSON.stringify({ text: v.condition_text.trim() }) : null,
  template_url: v.template_url.trim() || null, template_name: v.template_name.trim() || null, visibility: v.visibility,
});

function Row({ d, task, act, readOnly }: { d: any; task: any; act: any; readOnly: boolean }) {
  const original = fieldsOf(d);
  const [v, setV] = useState<Fields>(original);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(original);
  const set = (patch: Partial<Fields>) => setV((cur) => ({ ...cur, ...patch }));
  const hasFile = v.template_url.startsWith(FILE_PREFIX);
  const upload = async (file: File) => {
    setFileErr(null);
    try { const r = await apiClient.uploadCatalog2DeliverableFile(file); set({ template_url: `${FILE_PREFIX}${r.file.id}`, template_name: r.file.name }); }
    catch (e: any) { setFileErr(e?.message ?? "Não foi possível enviar o arquivo."); }
  };
  const label = "flex flex-col gap-0.5 text-[10px] font-semibold text-slate-500";
  return (
    <li className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900/60" data-testid="deliverable-row">
      <div className="flex flex-wrap items-center gap-1.5">
        <Input className="h-7 min-w-[10rem] flex-1 text-xs" value={v.name} maxLength={191} aria-label="Nome do entregável" disabled={readOnly} onChange={(e) => set({ name: e.target.value })} />
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600" title="Identificador permanente deste entregável" data-testid="deliverable-id">ID {d.key}</span>
      </div>
      <Input className="h-7 text-xs" value={v.description} maxLength={4000} aria-label="Descrição do entregável" placeholder="Descrição (o que é, como deve vir)" disabled={readOnly} onChange={(e) => set({ description: e.target.value })} />
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>Tipo<select className={sel} value={v.type} aria-label="Tipo" disabled={readOnly} onChange={(e) => set({ type: e.target.value })}>{DELIVERABLE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className={label}>Formato<Input className="h-7 text-[11px]" value={v.format} maxLength={80} aria-label="Formato" placeholder="Ex.: PDF, planilha, link do painel" disabled={readOnly} onChange={(e) => set({ format: e.target.value })} /></label>
        <label className={label}>Quem envia<select className={sel} value={v.responsible} aria-label="Quem envia" disabled={readOnly} onChange={(e) => set({ responsible: e.target.value })}>{DELIVERABLE_RESPONSIBLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className={label}>Etapa responsável<select className={sel} value={v.step_id} aria-label="Etapa" title="Etapa que só conclui com este item" disabled={readOnly} onChange={(e) => set({ step_id: e.target.value })}>
          <option value="">Tarefa toda</option>
          {(task.steps ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <label className={label}>Momento da entrega<select className={sel} value={v.delivery_moment} aria-label="Momento da entrega" disabled={readOnly} onChange={(e) => set({ delivery_moment: e.target.value })}>{DELIVERABLE_MOMENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className={label}>Recorrência<select className={sel} value={v.cycle_scope} aria-label="Recorrência do entregável" title="Só na primeira execução: não nasce nos ciclos seguintes" disabled={readOnly} onChange={(e) => set({ cycle_scope: e.target.value })}>{DELIVERABLE_CYCLE_SCOPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <div className={label}>Arquivo-modelo
          <span className="flex flex-wrap items-center gap-1">
            {v.template_name ? <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-700"><Paperclip className="h-3 w-3" />{v.template_name}</span> : <span className="text-[10px] font-normal text-slate-400">nenhum</span>}
            {!readOnly && <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"><Upload className="h-3 w-3" />Anexar<input type="file" className="sr-only" aria-label="Anexar arquivo-modelo do entregável" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.currentTarget.value = ""; }} /></label>}
            {hasFile && <button type="button" className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-700 underline" onClick={() => void apiClient.downloadCatalog2DeliverableFile({ id: v.template_url.slice(FILE_PREFIX.length), name: v.template_name })}><Download className="h-3 w-3" />Baixar</button>}
            {!readOnly && v.template_name && <button type="button" className="text-[10px] text-red-600 underline" onClick={() => set({ template_url: "", template_name: "" })}>Remover</button>}
          </span>
          {fileErr && <span role="alert" className="text-[10px] font-normal text-red-600">{fileErr}</span>}
        </div>
        <label className={`${label} sm:col-span-2`}>Condição (texto de orientação para quem executa)
          <span className="flex items-center gap-1.5">
            <label className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-600"><input type="checkbox" checked={v.is_conditional} disabled={readOnly} aria-label="Entregável condicional" onChange={(e) => set({ is_conditional: e.target.checked })} /> condicional</label>
            {v.is_conditional && <Input className="h-7 flex-1 text-[11px]" value={v.condition_text} maxLength={500} aria-label="Condição do entregável" placeholder="Ex.: só quando o cliente escolher a plataforma Meta" disabled={readOnly} onChange={(e) => set({ condition_text: e.target.value })} />}
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
        <label className="inline-flex items-center gap-1" title="Sem este item, a etapa (ou a tarefa) não conclui"><input type="checkbox" checked={v.is_required} disabled={readOnly} onChange={(e) => set({ is_required: e.target.checked })} /> obrigatório</label>
        <label className="inline-flex items-center gap-1" title="Quem envia precisa anexar a PROVA (print, arquivo, link)"><input type="checkbox" checked={v.evidence_required} disabled={readOnly} aria-label="Exige evidência" onChange={(e) => set({ evidence_required: e.target.checked })} /> exige evidência</label>
        <label className="inline-flex items-center gap-1" title="Um líder/qualificador interno confere o item antes de seguir"><input type="checkbox" checked={v.requires_qualification} disabled={readOnly} aria-label="Passa por qualificação interna" onChange={(e) => set({ requires_qualification: e.target.checked })} /> qualificação interna</label>
        <label className="inline-flex items-center gap-1" title="O item enviado precisa ser aprovado"><input type="checkbox" checked={v.requires_approval} disabled={readOnly} aria-label="Exige aprovação" onChange={(e) => set({ requires_approval: e.target.checked })} /> aprovação do cliente</label>
        <VisibilitySelect value={v.visibility} disabled={readOnly} onChange={(x) => set({ visibility: x })} />
        {!readOnly && <span className="ml-auto flex items-center gap-1">
          {dirty && <Button type="button" size="sm" className="h-6 px-2 text-[11px]" disabled={!v.name.trim()} onClick={() => void act(() => apiClient.updateCatalog2Deliverable(d.id, payloadOf(v)), "Entregável salvo.")}>Salvar</Button>}
          <button type="button" title="Remover entregável" aria-label="Remover entregável" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => void act(() => apiClient.deleteCatalog2Deliverable(d.id), "Entregável removido.")}><Trash2 className="h-3.5 w-3.5" /></button>
        </span>}
      </div>
    </li>
  );
}

/** Escolhe um entregável JÁ cadastrado em outro produto/tarefa e cria uma cópia nesta tarefa. */
function LibraryPicker({ task, act, onDone }: { task: any; act: any; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const search = async () => {
    setErr(null);
    try { const r: any = await apiClient.searchCatalog2DeliverableLibrary(q); setRows(r.data ?? []); } catch (e: any) { setErr(e?.message ?? "Não foi possível buscar."); }
  };
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/40 p-2" data-testid="deliverable-library">
      <div className="flex items-center gap-1.5">
        <Input className="h-7 flex-1 text-xs" aria-label="Buscar entregável existente" placeholder="Buscar entregável existente pelo nome…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={() => void search()}>Buscar</Button>
        <button type="button" className="text-[11px] text-slate-500 underline" onClick={onDone}>Fechar</button>
      </div>
      {err && <p role="alert" className="text-[11px] text-red-600">{err}</p>}
      {rows && rows.length === 0 && <p className="text-[11px] text-slate-500">Nenhum entregável encontrado.</p>}
      <ul className="max-h-44 space-y-1 overflow-y-auto">
        {(rows ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-[11px] dark:bg-slate-900">
            <span className="min-w-0"><strong className="block truncate">{r.name}</strong><span className="block truncate text-slate-500">{r.from}</span></span>
            <Button type="button" size="sm" variant="outline" className="h-6 shrink-0 gap-1 px-2 text-[11px]" onClick={() => void act(() => apiClient.createCatalog2Deliverable(task.id, {
              name: r.name, description: r.description, type: r.type, format: r.format, responsible: r.responsible, is_required: r.is_required, requires_approval: r.requires_approval, visibility: r.visibility,
              evidence_required: r.evidence_required, requires_qualification: r.requires_qualification, delivery_moment: r.delivery_moment, cycle_scope: r.cycle_scope, template_url: r.template_url, template_name: r.template_name,
            }), "Entregável reutilizado.").then(onDone)}><Copy className="h-3 w-3" />Reutilizar</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TaskDeliverablesEditor({ task, act, readOnly = false }: { task: any; act: any; readOnly?: boolean; version?: any }) {
  const list: any[] = task.deliverables ?? [];
  const [lib, setLib] = useState(false);
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/30" data-testid="task-deliverables">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Paperclip className="h-3 w-3" /> Entregáveis e anexos <span className="font-normal normal-case">— o que precisa ser entregue nesta tarefa</span></p>
        {!readOnly && <span className="flex items-center gap-1.5">
          <button type="button" title="Reutilizar um entregável já cadastrado em outro produto" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => setLib((v) => !v)}><Copy className="h-3 w-3" /> Reutilizar existente</button>
          <button type="button" title="Adicionar entregável" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => void act(() => apiClient.createCatalog2Deliverable(task.id, { name: "Novo entregável" }), "Entregável adicionado.")}><Plus className="h-3 w-3" /> Adicionar</button>
        </span>}
      </div>
      {lib && !readOnly && <LibraryPicker task={task} act={act} onDone={() => setLib(false)} />}
      {list.length === 0 && <p className="text-[11px] text-slate-500">Nenhum entregável. A tarefa conclui só pelas etapas.</p>}
      <ul className="space-y-1.5">{list.map((d) => <Row key={`${d.id}:${d.name}:${d.updated_at ?? ""}`} d={d} task={task} act={act} readOnly={readOnly} />)}</ul>
    </div>
  );
}
