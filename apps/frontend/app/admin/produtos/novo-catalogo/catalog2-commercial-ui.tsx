"use client";

// Campos comerciais estruturados da versão (valem para TODOS os produtos): público-alvo, promessa, escopo,
// o que entra e o que não entra, o que o cliente precisa fornecer, avisos e política de alterações.
// Cada campo tem contador de caracteres (mesmo limite do servidor) e visibilidade: interno · equipe · cliente.
// As listas são ordenáveis pelas setas. Versão publicada é somente leitura.
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Info, ListChecks, Loader2, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
const VIS_HELP: Record<string, string> = {
  client: "O cliente verá este conteúdo na contratação e no produto.",
  team: "Apenas usuários da agência/equipe responsável verão este conteúdo.",
  internal: "Somente a administração interna da Allka verá este conteúdo.",
};

type State = Record<string, any>;
const pick = (v: any): State => {
  const s: State = {};
  for (const f of COMMERCIAL_TEXT_FIELDS) s[f.key] = v?.[f.key] ?? "";
  for (const f of COMMERCIAL_LIST_FIELDS) s[f.key] = [...(v?.[f.key] ?? [])];
  s.field_visibility = { ...(v?.field_visibility ?? {}) };
  return s;
};

function CommercialAiButton({ label, value, context, disabled, onResult }: { label: string; value: string; context: Record<string, any>; disabled?: boolean; onResult: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approach, setApproach] = useState<"melhorar" | "recriar">(value.trim() ? "melhorar" : "recriar");
  async function generate() {
    setBusy(true); setError(null);
    try {
      const result: any = await apiClient.aiImproveProductField({ field_label: label, current_value: value, mode: "text", length: "manter", approach, research: true, context });
      const next = String(result?.improved_value ?? "").trim();
      if (!next) throw new Error("A IA não devolveu conteúdo.");
      onResult(next); setOpen(false);
    } catch (e: any) { setError(e?.message ?? "Não foi possível usar a IA agora."); }
    finally { setBusy(false); }
  }
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" disabled={disabled} title={`Preencher ou melhorar ${label} com IA`} className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"><Sparkles className="h-3 w-3" /></button></PopoverTrigger>
    <PopoverContent align="end" className="w-64 space-y-3 p-3 text-xs"><p className="font-semibold text-slate-800">{value.trim() ? "Melhorar" : "Preencher"} “{label}” com IA</p><div className="flex gap-1.5">{(["melhorar", "recriar"] as const).map((option) => <button key={option} type="button" onClick={() => setApproach(option)} className={`flex-1 rounded-lg border px-2 py-1 font-semibold ${approach === option ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 text-slate-600"}`}>{option === "melhorar" ? "Melhorar" : "Recriar"}</button>)}</div>{error && <p className="text-red-600">{error}</p>}<Button size="sm" className="w-full gap-1.5" disabled={busy} onClick={() => void generate()}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{busy ? "Gerando…" : "Gerar"}</Button></PopoverContent>
  </Popover>;
}

export function CommercialFieldsCard({ version, readOnly, onSave, registerFlush, registerSave }: { version: any; readOnly: boolean; onSave: (body: Record<string, any>) => Promise<void>; registerFlush?: (fn: () => Promise<void>) => () => void; registerSave?: (fn: () => Promise<void>) => () => void }) {
  const [f, setF] = useState<State>(() => pick(version));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef({ f, dirty });
  ref.current = { f, dirty };
  // Recarregamentos do editor chegam com o mesmo id de versão e um updated_at
  // novo. Sincronizamos somente quando não há digitação pendente, para nunca
  // apagar um campo que a pessoa acabou de preencher antes de salvar.
  useEffect(() => {
    if (dirty) return;
    setF(pick(version)); setSaved(false); setError(null);
  }, [version.id, version.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = (s: State) => {
    const b: Record<string, any> = { field_visibility: s.field_visibility };
    for (const x of COMMERCIAL_TEXT_FIELDS) b[x.key] = s[x.key] === "" ? null : s[x.key];
    // Não persistir linhas vazias: ao remover ou cancelar um item personalizado,
    // ele não volta depois de salvar/recarregar nem aparece entre as listas.
    for (const x of COMMERCIAL_LIST_FIELDS) b[x.key] = (s[x.key] ?? []).map((item: unknown) => String(item ?? "").trim()).filter(Boolean);
    return b;
  };
  const flush = async () => {
    if (!ref.current.dirty || readOnly) return;
    setError(null); setSaved(false);
    try { await onSave(body(ref.current.f)); setDirty(false); setSaved(true); }
    catch (e: any) { setError(e?.message ?? "Não foi possível salvar."); throw e; }
  };
  useEffect(() => registerFlush?.(flush), [registerFlush, readOnly, onSave]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => registerSave?.(flush), [registerSave, readOnly, onSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: State) => { setF((cur) => ({ ...cur, ...patch })); setDirty(true); setSaved(false); };
  const setVis = (key: string, v: string) => set({ field_visibility: { ...f.field_visibility, [key]: v } });
  const tooLong = COMMERCIAL_TEXT_FIELDS.some((x) => String(f[x.key]).length > x.max && String(f[x.key]) !== String(version?.[x.key] ?? ""));

  const VisPick = ({ k, locked }: { k: string; locked?: boolean }) => (
    <span className="inline-flex shrink-0 rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900" aria-label="Quem pode ver este campo">
      {(locked ? VIS.filter(([v]) => v === "internal") : VIS).map(([v, l]) => {
        const selected = (locked ? "internal" : f.field_visibility[k] ?? "client") === v;
        return <TooltipProvider key={v} delayDuration={150}><Tooltip><TooltipTrigger asChild><button type="button" disabled={readOnly || locked} onClick={() => setVis(k, v)} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${selected ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>{l}</button></TooltipTrigger><TooltipContent className="max-w-52 text-xs">{VIS_HELP[v]}</TooltipContent></Tooltip></TooltipProvider>;
      })}
    </span>
  );
  const renderListFields = (fields: typeof COMMERCIAL_LIST_FIELDS) => <>{fields.map((x) => {
    const items: string[] = f[x.key] ?? [];
    const update = (next: string[]) => set({ [x.key]: next });
    const splitAt = Math.ceil(items.length / 2);
    const columns = [items.slice(0, splitAt), items.slice(splitAt)];
    const itemRow = (it: string, i: number) => <li key={i} className="min-w-0"><div className="relative"><Input className="h-9 min-w-0 w-full pr-28 text-xs" disabled={readOnly} maxLength={300} value={it} aria-label={`${x.label} ${i + 1}`} onChange={(e) => update(items.map((v, j) => j === i ? e.target.value : v))} /><span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5"><CommercialAiButton label={x.label} value={it} context={{ name: version?.title, other_fields: { [x.label]: it } }} disabled={readOnly} onResult={(next) => update(items.map((v, j) => j === i ? next.slice(0, 300) : v))} />{!readOnly && <><button type="button" aria-label="Subir" title="Subir" disabled={i === 0} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" onClick={() => { const c = [...items]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; update(c); }}><ChevronUp className="h-3.5 w-3.5" /></button><button type="button" aria-label="Descer" title="Descer" disabled={i === items.length - 1} className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" onClick={() => { const c = [...items]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; update(c); }}><ChevronDown className="h-3.5 w-3.5" /></button><button type="button" aria-label="Remover item" title="Remover item" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => update(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button></>}</span></div></li>;
    const shortLabel = x.key === "included_items" ? "Incluídos" : x.key === "excluded_items" ? "Não incluídos" : x.label;
    return <section key={x.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-900/40"><div className="flex flex-wrap items-center gap-2"><span className="text-[13px] font-bold text-slate-800 dark:text-slate-100" title={x.hint}>{shortLabel}</span><span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">{items.length}</span><span className="ml-auto"><VisPick k={x.key} /></span></div>
      <div className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 lg:grid-cols-2">{columns.map((column, columnIndex) => <ul key={columnIndex} className="space-y-1">{column.map((it, index) => itemRow(it, index + (columnIndex * splitAt)))}</ul>)}</div>
      {!readOnly && items.length < 50 && <Button type="button" size="sm" variant="outline" className="mt-2 h-8 gap-1 text-xs" onClick={() => update([...items, ""])}><Plus className="h-3.5 w-3.5" /> Adicionar item</Button>}
    </section>;
  })}</>;
  const renderTextField = (x: typeof COMMERCIAL_TEXT_FIELDS[number], collapsible = false) => {
    const value = String(f[x.key] ?? "");
    const over = value.length > x.max;
    const visibility = <VisPick k={x.key} locked={x.key === "internal_notes"} />;
    const editor = <div className="mt-2 space-y-1"><div className="relative"><Textarea id={`cf-${x.key}`} rows={x.rows} className="pr-16" disabled={readOnly} value={value} placeholder={x.hint} onChange={(e) => set({ [x.key]: e.target.value })} /><span className="absolute right-2 top-2"><CommercialAiButton label={x.label} value={value} context={{ name: version?.title, other_fields: { [x.label]: value } }} disabled={readOnly} onResult={(next) => set({ [x.key]: next.slice(0, x.max) })} /></span></div><span className={`block text-right text-xs ${over ? "text-red-600" : "text-slate-400"}`}>{value.length}/{x.max}</span></div>;
    if (collapsible) return <div key={x.key} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40"><TooltipProvider delayDuration={180}><Tooltip><TooltipTrigger asChild><div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200"><span className="flex-1">{x.label}</span>{visibility}</div></TooltipTrigger><TooltipContent side="bottom" sideOffset={6} className="max-w-xs bg-slate-950 px-3 py-2 text-xs leading-relaxed text-white shadow-lg">{x.hint}</TooltipContent></Tooltip></TooltipProvider>{editor}</div>;
    return <div key={x.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40"><div className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100" title={x.hint}>{x.label}</span>{visibility}</div>{editor}</div>;
  };

  return <>
    <section id="catalog2-commercial-fields" className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <TooltipProvider delayDuration={180}><Tooltip><TooltipTrigger asChild><button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2.5 text-left">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Info className="h-3.5 w-3.5" /></span>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Informações comerciais</h3>
          <p className="text-[11px] text-slate-500">Público, promessa, escopo e orientações comerciais.</p>
        </div>
        {open ? <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-slate-500" />}
      </button></TooltipTrigger><TooltipContent side="bottom" sideOffset={7} className="max-w-xs bg-slate-950 px-3 py-2 text-xs leading-relaxed text-white shadow-lg">Defina o que o cliente vê, o que é interno e como o produto deve ser apresentado comercialmente.</TooltipContent></Tooltip></TooltipProvider>
      {open && <div className="mt-2.5 space-y-3">
      <div className="grid items-start gap-2 lg:grid-cols-2">{COMMERCIAL_TEXT_FIELDS.slice(0, 2).map((x) => renderTextField(x, true))}</div>
      <div className="grid items-start gap-2 lg:grid-cols-2">
        {COMMERCIAL_TEXT_FIELDS.slice(2).map((x) => <div key={x.key} className={x.key === "internal_notes" ? "lg:col-span-2" : ""}>{renderTextField(x, true)}</div>)}
      </div>
      </div>}
    </section>
    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <details open><summary className="flex cursor-default list-none items-center gap-2.5" onClick={(e) => e.preventDefault()}><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><ListChecks className="h-3.5 w-3.5" /></span><span className="flex-1 text-[13px] font-bold text-slate-900 dark:text-slate-100">Itens</span><ChevronDown className="h-4 w-4 text-slate-500" /></summary><div className="mt-2.5 space-y-2">{renderListFields(COMMERCIAL_LIST_FIELDS.filter((x) => x.key === "included_items" || x.key === "excluded_items"))}</div></details>
    </section>
    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <details open><summary className="flex cursor-default list-none items-center gap-2.5" onClick={(e) => e.preventDefault()}><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><Info className="h-3.5 w-3.5" /></span><span className="flex-1 text-[13px] font-bold text-slate-900 dark:text-slate-100">Requisitos e resumo dos entregáveis</span><ChevronDown className="h-4 w-4 text-slate-500" /></summary><div className="mt-2.5">{renderListFields(COMMERCIAL_LIST_FIELDS.filter((x) => x.key === "client_requirements" || x.key === "deliverables_summary"))}</div></details>
    </section>
    {!readOnly && <div className="mt-3 flex flex-wrap items-center gap-3">{tooLong && <span className="text-xs text-red-600">Algum campo passou do limite de caracteres.</span>}{saved && <span role="status" className="text-xs font-semibold text-emerald-700">✓ Informações comerciais salvas.</span>}{error && <span role="alert" className="text-xs text-red-600">{error}</span>}</div>}
  </>;
}
