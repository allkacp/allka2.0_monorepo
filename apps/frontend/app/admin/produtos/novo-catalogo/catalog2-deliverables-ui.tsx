"use client";

// Entregáveis e anexos estruturados da tarefa (Pedido 3, fase 3): o que deve ser entregue/enviado,
// por quem, em qual etapa, se é obrigatório, se precisa de aprovação e quem pode ver.
import { useState } from "react";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { VisibilitySelect, type Visibility } from "./catalog2-ops-ui";

export const DELIVERABLE_TYPES: [string, string][] = [["arquivo", "Arquivo (link do arquivo)"], ["link", "Link"], ["texto", "Texto"], ["registro_sistema", "Registro do sistema"], ["outro", "Outro"]];
export const DELIVERABLE_RESPONSIBLES: [string, string][] = [["executor", "Executor"], ["lider", "Líder"], ["agencia", "Agência"], ["cliente", "Cliente"], ["sistema", "Sistema"]];
const sel = "h-7 rounded-md border border-slate-200 bg-white px-1 text-[11px] dark:border-slate-700 dark:bg-slate-900";

function Row({ d, task, act }: { d: any; task: any; act: any }) {
  const original = { name: d.name, type: d.type, responsible: d.responsible, step_id: d.step_id ?? "", is_required: d.is_required, requires_approval: d.requires_approval, visibility: d.visibility as Visibility };
  const [v, setV] = useState(original);
  const dirty = JSON.stringify(v) !== JSON.stringify(original);
  return (
    <li className="space-y-1 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-1.5">
        <Input className="h-7 min-w-[10rem] flex-1 text-xs" value={v.name} maxLength={191} aria-label="Nome do entregável" onChange={(e) => setV({ ...v, name: e.target.value })} />
        <select className={sel} value={v.type} aria-label="Tipo" onChange={(e) => setV({ ...v, type: e.target.value })}>{DELIVERABLE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className={sel} value={v.responsible} aria-label="Quem envia" title="Quem envia" onChange={(e) => setV({ ...v, responsible: e.target.value })}>{DELIVERABLE_RESPONSIBLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className={sel} value={v.step_id} aria-label="Etapa" title="Etapa que só conclui com este item" onChange={(e) => setV({ ...v, step_id: e.target.value })}>
          <option value="">Tarefa toda</option>
          {(task.steps ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
        <label className="inline-flex items-center gap-1" title="Sem este item, a etapa (ou a tarefa) não conclui"><input type="checkbox" checked={v.is_required} onChange={(e) => setV({ ...v, is_required: e.target.checked })} /> Obrigatório</label>
        <label className="inline-flex items-center gap-1" title="Um líder/administrador precisa aprovar o item enviado"><input type="checkbox" checked={v.requires_approval} onChange={(e) => setV({ ...v, requires_approval: e.target.checked })} /> Exige aprovação</label>
        <VisibilitySelect value={v.visibility} onChange={(x) => setV({ ...v, visibility: x })} />
        <span className="ml-auto flex items-center gap-1">
          {dirty && <Button type="button" size="sm" className="h-6 px-2 text-[11px]" onClick={() => void act(() => apiClient.updateCatalog2Deliverable(d.id, { ...v, step_id: v.step_id || null }), "Entregável salvo.")}>Salvar</Button>}
          <button type="button" title="Remover entregável" aria-label="Remover entregável" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => void act(() => apiClient.deleteCatalog2Deliverable(d.id), "Entregável removido.")}><Trash2 className="h-3.5 w-3.5" /></button>
        </span>
      </div>
    </li>
  );
}

export function TaskDeliverablesEditor({ task, act }: { task: any; act: any }) {
  const list: any[] = task.deliverables ?? [];
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/30">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Paperclip className="h-3 w-3" /> Entregáveis e anexos <span className="font-normal normal-case">— o que precisa ser enviado nesta tarefa</span></p>
        <button type="button" title="Adicionar entregável" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => void act(() => apiClient.createCatalog2Deliverable(task.id, { name: "Novo entregável" }), "Entregável adicionado.")}><Plus className="h-3 w-3" /> Adicionar</button>
      </div>
      {list.length === 0 && <p className="text-[11px] text-slate-500">Nenhum entregável. A tarefa conclui só pelas etapas.</p>}
      <ul className="space-y-1.5">{list.map((d) => <Row key={`${d.id}:${d.name}`} d={d} task={task} act={act} />)}</ul>
    </div>
  );
}
