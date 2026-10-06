"use client";

// Checklist da ETAPA (reunião 2026-10-05): janelinha para cadastrar os itens de execução, de aprovação e de qualificação.
// Fica guardado no guia operacional da etapa (ops.checklist). Nada é calculado aqui.
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ListChecks, Plus, Trash2 } from "lucide-react";
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

export function StepChecklistDialog({ open, title, value, readOnly, saving, onClose, onSave }: { open: boolean; title: string; value: ChecklistItem[]; readOnly?: boolean; saving?: boolean; onClose: () => void; onSave: (list: ChecklistItem[]) => void }) {
  const [items, setItems] = useState<ChecklistItem[]>(value);
  const [kind, setKind] = useState<ChecklistKind>("execucao");
  const [text, setText] = useState("");
  useEffect(() => { if (open) { setItems(value ?? []); setText(""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <DialogContent className="w-[95vw] max-w-2xl sm:max-w-2xl" data-testid="step-checklist-dialog">
        <DialogTitle className="flex items-center gap-2 text-base"><ListChecks className="h-5 w-5 text-sky-600" />Checklist da etapa — {title}</DialogTitle>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {CHECKLIST_KINDS.map((k) => {
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
        <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {mine.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">Nenhum item de {meta.label.toLowerCase()} ainda.</li>}
          {mine.map((it, idx) => (
            <li key={it.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-500 text-[10px] font-bold text-white">{idx + 1}</span>
              <span className="min-w-0 flex-1 break-words">{it.text}</span>
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
