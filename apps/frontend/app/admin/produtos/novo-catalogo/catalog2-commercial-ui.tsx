"use client";

// Campos comerciais estruturados da versão (valem para TODOS os produtos): público-alvo, promessa, escopo,
// o que entra e o que não entra, o que o cliente precisa fornecer, avisos e política de alterações.
// Cada campo tem contador de caracteres (mesmo limite do servidor) e visibilidade: interno · equipe · cliente.
// As listas são ordenáveis pelas setas. Versão publicada é somente leitura.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const COMMERCIAL_TEXT_FIELDS: { key: string; label: string; hint: string; rows: number; max: number }[] = [
  { key: "target_audience", label: "Público-alvo", hint: "Para quem este produto foi feito.", rows: 2, max: 1000 },
  { key: "commercial_objective", label: "Objetivo / promessa", hint: "O que o cliente ganha com o produto (sem prometer resultado).", rows: 2, max: 1000 },
  { key: "scope", label: "Escopo", hint: "O que está dentro do trabalho contratado, em poucas frases.", rows: 3, max: 4000 },
  { key: "client_info", label: "Informações que o cliente precisa fornecer", hint: "Dados, acessos e materiais que o cliente deve entregar para o trabalho começar.", rows: 3, max: 4000 },
  { key: "results_disclaimer", label: "Aviso de resultados não garantidos", hint: "Texto que deixa claro que o resultado depende de fatores externos.", rows: 2, max: 1000 },
  { key: "change_policy", label: "Política de alterações", hint: "Como funcionam pedidos de ajuste depois de contratar.", rows: 2, max: 2000 },
  { key: "internal_notes", label: "Observações internas", hint: "Só a equipe Allka vê. Nunca aparece para o cliente.", rows: 3, max: 4000 },
];
export const COMMERCIAL_LIST_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "included_items", label: "Itens incluídos", hint: "Um item por linha, na ordem em que aparecem." },
  { key: "excluded_items", label: "Itens não incluídos", hint: "O que NÃO faz parte, para evitar mal-entendido." },
  { key: "client_requirements", label: "Requisitos do cliente", hint: "Condições para o trabalho acontecer (ex.: ter conta de anúncios)." },
  { key: "deliverables_summary", label: "Resumo dos entregáveis", hint: "Resumo comercial do que será entregue. Os entregáveis detalhados de cada tarefa continuam valendo." },
];
const VIS: [string, string][] = [["client", "Cliente vê"], ["team", "Só equipe"], ["internal", "Só interno"]];

type State = Record<string, any>;
const pick = (v: any): State => {
  const s: State = {};
  for (const f of COMMERCIAL_TEXT_FIELDS) s[f.key] = v?.[f.key] ?? "";
  for (const f of COMMERCIAL_LIST_FIELDS) s[f.key] = [...(v?.[f.key] ?? [])];
  s.field_visibility = { ...(v?.field_visibility ?? {}) };
  return s;
};

export function CommercialFieldsCard({ version, readOnly, onSave, registerFlush }: { version: any; readOnly: boolean; onSave: (body: Record<string, any>) => Promise<void>; registerFlush?: (fn: () => Promise<void>) => () => void }) {
  const [f, setF] = useState<State>(() => pick(version));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef({ f, dirty });
  ref.current = { f, dirty };
  useEffect(() => { setF(pick(version)); setDirty(false); setSaved(false); setError(null); }, [version.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = (s: State) => {
    const b: Record<string, any> = { field_visibility: s.field_visibility };
    for (const x of COMMERCIAL_TEXT_FIELDS) b[x.key] = s[x.key] === "" ? null : s[x.key];
    for (const x of COMMERCIAL_LIST_FIELDS) b[x.key] = s[x.key];
    return b;
  };
  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try { await onSave(body(ref.current.f)); setDirty(false); setSaved(true); }
    catch (e: any) { setError(e?.message ?? "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  useEffect(() => registerFlush?.(async () => { if (ref.current.dirty && !readOnly) { await onSave(body(ref.current.f)); setDirty(false); } }), [registerFlush, readOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: State) => { setF((cur) => ({ ...cur, ...patch })); setDirty(true); setSaved(false); };
  const setVis = (key: string, v: string) => set({ field_visibility: { ...f.field_visibility, [key]: v } });
  const tooLong = COMMERCIAL_TEXT_FIELDS.some((x) => String(f[x.key]).length > x.max && String(f[x.key]) !== String(version?.[x.key] ?? ""));

  const VisPick = ({ k, locked }: { k: string; locked?: boolean }) => (
    <select aria-label="Quem pode ver" title="Quem pode ver este campo" disabled={readOnly || locked} value={locked ? "internal" : f.field_visibility[k] ?? "client"} onChange={(e) => setVis(k, e.target.value)} className="h-6 rounded-md border border-slate-200 bg-white px-1 text-[11px] dark:border-slate-700 dark:bg-slate-900">
      {(locked ? VIS.filter(([v]) => v === "internal") : VIS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div id="catalog2-commercial-fields" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Informações comerciais</h3>
          <p className="text-xs text-slate-500">Complementam a descrição: valem para qualquer produto e ficam guardadas em cada versão.</p>
        </div>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild><span className="rounded-full p-1 text-slate-500"><Info className="h-4 w-4" /></span></TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">A escolha “Cliente vê” só aparece na página do produto para o cliente se o campo estiver preenchido. Observações internas nunca saem da equipe.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {COMMERCIAL_TEXT_FIELDS.map((x) => {
        const value = String(f[x.key] ?? "");
        const over = value.length > x.max;
        return (
          <div key={x.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`cf-${x.key}`} className="text-[12px] font-semibold text-slate-700 dark:text-slate-200" title={x.hint}>{x.label}</label>
              <VisPick k={x.key} locked={x.key === "internal_notes"} />
            </div>
            <Textarea id={`cf-${x.key}`} rows={x.rows} disabled={readOnly} value={value} placeholder={x.hint} onChange={(e) => set({ [x.key]: e.target.value })} />
            <span className={`block text-right text-xs ${over ? "text-red-600" : "text-slate-400"}`}>{value.length}/{x.max}</span>
          </div>
        );
      })}
      {COMMERCIAL_LIST_FIELDS.map((x) => {
        const items: string[] = f[x.key] ?? [];
        const update = (next: string[]) => set({ [x.key]: next });
        return (
          <div key={x.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200" title={x.hint}>{x.label}</span>
              <VisPick k={x.key} />
            </div>
            <ul className="space-y-1">
              {items.map((it, i) => (
                <li key={i} className="flex items-center gap-1">
                  <Input className="h-8 flex-1 text-xs" disabled={readOnly} maxLength={300} value={it} aria-label={`${x.label} ${i + 1}`} onChange={(e) => update(items.map((v, j) => (j === i ? e.target.value : v)))} />
                  {!readOnly && (
                    <>
                      <button type="button" aria-label="Subir" title="Subir" disabled={i === 0} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" onClick={() => { const c = [...items]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; update(c); }}><ChevronUp className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Descer" title="Descer" disabled={i === items.length - 1} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" onClick={() => { const c = [...items]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; update(c); }}><ChevronDown className="h-3.5 w-3.5" /></button>
                      <button type="button" aria-label="Remover item" title="Remover item" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => update(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {!readOnly && items.length < 50 && (
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => update([...items, ""])}><Plus className="h-3 w-3" /> Adicionar item</Button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" disabled={saving || !dirty || tooLong} onClick={() => void save()}>{saving ? "Salvando…" : "Salvar informações comerciais"}</Button>
          {tooLong && <span className="text-xs text-red-600">Algum campo passou do limite de caracteres.</span>}
          {saved && <span role="status" className="text-xs font-semibold text-emerald-700">✓ Informações comerciais salvas.</span>}
          {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
        </div>
      )}
    </div>
  );
}
