"use client";

// Checklist da ETAPA (reunião 2026-10-05): janelinha para cadastrar os itens de execução, de aprovação e de qualificação.
// Fica guardado no guia operacional da etapa (ops.checklist). Nada é calculado aqui.
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ListChecks, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type ChecklistKind = "execucao" | "aprovacao" | "qualificacao";
export interface ChecklistItem { id: string; text: string; kind: ChecklistKind; required: boolean }

export const CHECKLIST_KINDS: { key: ChecklistKind; label: string; hint: string }[] = [
  { key: "execucao", label: "Execução", hint: "O que o executor confere enquanto faz a etapa." },
  { key: "aprovacao", label: "Aprovação", hint: "O que o cliente ou o responsável confere para aprovar a entrega." },
  { key: "qualificacao", label: "Qualificação", hint: "O que o líder confere antes de liberar a entrega (qualificação)." },
];
const MAX_ITEMS = 60;
const newId = () => `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const checklistCount = (list?: ChecklistItem[] | null) => (Array.isArray(list) ? list.length : 0);

export function StepChecklistDialog({ open, title, value, readOnly, saving, onClose, onSave, qualificationEnabled = true, stepId, draft }: { /** etapa já salva: liga o "Gerar com IA" */ stepId?: string; /** o que está sendo preenchido na etapa (a IA lê junto com o cadastro) */ draft?: Record<string, any>; open: boolean; title: string; value: ChecklistItem[]; readOnly?: boolean; saving?: boolean; onClose: () => void; onSave: (list: ChecklistItem[]) => void; /** Só mostra o checklist de CONFERÊNCIA (qualificação) quando a etapa exige qualificação. Os itens já cadastrados ficam guardados. */ qualificationEnabled?: boolean }) {
  const [items, setItems] = useState<ChecklistItem[]>(value);
  const [kind, setKind] = useState<ChecklistKind>("execucao");
  const visibleKinds = CHECKLIST_KINDS.filter((k) => qualificationEnabled || k.key !== "qualificacao");
  useEffect(() => { if (!qualificationEnabled && kind === "qualificacao") setKind("execucao"); }, [qualificationEnabled, kind]);
  const [text, setText] = useState("");
  // Gerar com IA: lê o cadastro (produto, tarefa, etapas, entregáveis, acessos) + esta etapa e sugere os itens das abas; você edita, remove ou mantém.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiIds, setAiIds] = useState<Set<string>>(new Set());
  const [useInternal, setUseInternal] = useState(true);
  const [useInternet, setUseInternet] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  // O que gerar: as três abas juntas ou só as que você marcar.
  const [aiKinds, setAiKinds] = useState<Set<ChecklistKind>>(new Set(CHECKLIST_KINDS.map((k) => k.key)));
  const pickedKinds = visibleKinds.map((k) => k.key).filter((k) => aiKinds.has(k));
  const generate = async () => {
    if (!stepId) return;
    setAiBusy(true); setAiErr(null); setAiNote(null);
    try {
      const kinds = pickedKinds;
      if (kinds.length === 0) { setAiErr("Marque ao menos um checklist para gerar."); return; }
      const r = await apiClient.suggestCatalog2StepChecklist(stepId, { existing: items.map((i) => ({ kind: i.kind, text: i.text })), kinds, use_internal: useInternal, use_internet: useInternet, notes: aiNotes.trim() || undefined, draft });
      const created: ChecklistItem[] = r.items.map((it) => ({ id: newId(), text: it.text, kind: it.kind, required: it.required }));
      setItems((cur) => [...cur, ...created].slice(0, MAX_ITEMS));
      setAiIds((cur) => new Set([...cur, ...created.map((c) => c.id)]));
      const count = (k: ChecklistKind) => created.filter((c) => c.kind === k).length;
      setAiNote(`A IA leu: ${r.read.join(", ")}. Adicionou ${count("execucao")} de execução, ${count("aprovacao")} de aprovação e ${count("qualificacao")} de qualificação. Revise: edite, remova ou mantenha.`);
      setAiOpen(false);
    } catch (e: any) { setAiErr(e?.message ?? "Não foi possível usar a IA agora."); } finally { setAiBusy(false); }
  };
  useEffect(() => { if (open) { setItems(value ?? []); setText(""); setAiIds(new Set()); setAiNote(null); setAiErr(null); setAiOpen(false); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const meta = CHECKLIST_KINDS.find((k) => k.key === kind)!;
  const add = () => {
    const t = text.trim();
    if (!t || items.length >= MAX_ITEMS) return;
    setItems((cur) => [...cur, { id: newId(), text: t.slice(0, 300), kind, required: true }]);
    setText("");
  };
  const move = (id: string, dir: -1 | 1) => setItems((cur) => {
    const same = cur.filter((i) => i.kind === kind);
    const idx = same.findIndex((i) => i.id === id), j = idx + dir;
    if (idx < 0 || j < 0 || j >= same.length) return cur;
    const a = cur.indexOf(same[idx]), b = cur.indexOf(same[j]);
    const next = [...cur]; [next[a], next[b]] = [next[b], next[a]]; return next;
  });
  const mine = items.filter((i) => i.kind === kind);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-3rem)] w-[95vw] max-w-2xl overflow-y-auto sm:max-w-2xl" data-testid="step-checklist-dialog">
        <DialogTitle className="flex items-center gap-2 text-base"><ListChecks className="h-5 w-5 text-sky-600" />Checklist da etapa — {title}</DialogTitle>
        {!readOnly && stepId && (
          <div className="space-y-2" data-testid="checklist-ai">
            <div className="flex flex-wrap items-center gap-2">
              {/* Um botão só: ele abre a confirmação do que será consultado; lá dentro fica o "Consultar e gerar" (o botão de fora some enquanto isso). */}
              {!aiOpen && <button type="button" onClick={() => setAiOpen((v) => !v)} aria-expanded={aiOpen} data-testid="checklist-ai-open" className="inline-flex h-8 items-center gap-1 rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#2563eb,#7c3aed))] px-3 text-xs font-semibold text-white"><Sparkles className="h-3.5 w-3.5" />Gerar checklist com IA</button>}
              <span className="text-[11px] text-slate-500">A IA lê o que já está cadastrado e sugere os itens; você edita, remove ou mantém.</span>
            </div>
            {aiOpen && (
              <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-xs" data-testid="checklist-ai-panel">
                <p className="font-semibold text-slate-800">A IA vai consultar</p>
                <p className="text-slate-600">O produto, a tarefa, todas as etapas, os entregáveis, os acessos e o que você já preencheu nesta etapa. </p>
                <fieldset className="space-y-1" data-testid="checklist-ai-kinds">
                  <legend className="font-semibold text-slate-800">O que gerar</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {visibleKinds.map((k) => (
                      <label key={k.key} className="flex items-center gap-1.5"><input type="checkbox" checked={aiKinds.has(k.key)} onChange={(e) => setAiKinds((cur) => { const n = new Set(cur); if (e.target.checked) n.add(k.key); else n.delete(k.key); return n; })} />{k.label}</label>
                    ))}
                  </div>
                  <button type="button" className="text-[11px] font-semibold text-violet-700 underline" onClick={() => setAiKinds(new Set(visibleKinds.map((k) => k.key)))}>Marcar os três</button>
                </fieldset>
                <fieldset className="space-y-1">
                  <legend className="font-semibold text-slate-800">Fontes extras</legend>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={useInternal} onChange={(e) => setUseInternal(e.target.checked)} />Banco interno (documentos da Allka)</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={useInternet} onChange={(e) => setUseInternet(e.target.checked)} />Pesquisar na internet (boas práticas de conferência)</label>
                </fieldset>
                <label className="block space-y-0.5"><span className="font-semibold text-slate-800">Instruções (opcional)</span>
                  <textarea rows={2} maxLength={600} value={aiNotes} onChange={(e) => setAiNotes(e.target.value)} placeholder="Ex.: foque em conferir os acessos e o briefing; itens bem curtos." className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs" />
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAiOpen(false)}>Cancelar</Button>
                  <button type="button" disabled={aiBusy || pickedKinds.length === 0} onClick={() => void generate()} data-testid="checklist-ai-go" className="inline-flex h-8 items-center gap-1 rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#2563eb,#7c3aed))] px-3 text-xs font-semibold text-white disabled:opacity-60">{aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{aiBusy ? "Consultando e gerando…" : "Consultar e gerar"}</button>
                </div>
              </div>
            )}
            {aiErr && <p role="alert" className="text-[11px] font-semibold text-red-600">{aiErr}</p>}
            {aiNote && <p role="status" className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800" data-testid="checklist-ai-note">{aiNote}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {visibleKinds.map((k) => {
            const n = items.filter((i) => i.kind === k.key).length;
            return (
              <button key={k.key} type="button" role="tab" aria-selected={kind === k.key} onClick={() => setKind(k.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${kind === k.key ? "border-sky-500 bg-sky-50 text-sky-800" : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"}`}>
                {k.label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">{n}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">{meta.hint}</p>
        {!qualificationEnabled && <p className="rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500" data-testid="no-qualification-note">O checklist de qualificação (conferência) aparece quando a etapa exige qualificação. Ligue “Esta etapa precisa de qualificação” para usá-lo.</p>}
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {mine.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">Nenhum item de {meta.label.toLowerCase()} ainda.</li>}
          {mine.map((it, idx) => (
            <li key={it.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-500 text-[10px] font-bold text-white">{idx + 1}</span>
              <span className="min-w-0 flex-1 break-words">{it.text}{aiIds.has(it.id) && <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700" title="Sugerido pela IA: revise">IA</span>}</span>
              <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500" title="Item obrigatório: precisa estar marcado para concluir ou aprovar.">
                <input type="checkbox" disabled={readOnly} checked={it.required} onChange={(e) => setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, required: e.target.checked } : x)))} /> obrigatório
              </label>
              {!readOnly && (
                <span className="flex shrink-0 items-center">
                  <button type="button" aria-label="Subir item" disabled={idx === 0} className="rounded p-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" onClick={() => move(it.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="Descer item" disabled={idx === mine.length - 1} className="rounded p-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" onClick={() => move(it.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label="Remover item" className="rounded p-0.5 text-red-500 hover:bg-red-50" onClick={() => setItems((cur) => cur.filter((x) => x.id !== it.id))}><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Input aria-label="Novo item do checklist" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={`Novo item de ${meta.label.toLowerCase()} (Enter para adicionar)`} className="h-9" />
            <Button type="button" size="sm" disabled={!text.trim() || items.length >= MAX_ITEMS} onClick={add}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
          </div>
        )}
        {items.length >= MAX_ITEMS && <p className="text-[11px] text-amber-700">Limite de {MAX_ITEMS} itens por etapa.</p>}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-xs text-slate-500">{items.length} {items.length === 1 ? "item" : "itens"} no total</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>{readOnly ? "Fechar" : "Cancelar"}</Button>
            {!readOnly && <Button type="button" size="sm" disabled={saving} onClick={() => onSave(items)}>Salvar checklist</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
