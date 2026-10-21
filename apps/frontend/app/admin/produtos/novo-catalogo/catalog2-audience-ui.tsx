"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Público do produto (C7): lista de marcação — quem pode ver e contratar. A IA também respeita.
export type AudienceKey = "company" | "agency" | "partner" | "internal";
export const AUDIENCE_CHECKS: { key: AudienceKey; label: string; hint: string }[] = [
  { key: "company", label: "Company", hint: "Empresas." },
  { key: "agency", label: "Agency (sem partner)", hint: "Somente agências comuns — as partner NÃO veem (marque Agency Partner para incluí-las)." },
  { key: "partner", label: "Agency Partner", hint: "Somente agências partner ativas." },
  { key: "internal", label: "Somente equipe interna", hint: "Só administração e líderes veem." },
];

// Níveis de agência (D-1): as opções vêm dos níveis CADASTRADOS (Administração > Níveis Agências), buscados no servidor.
export interface LevelOption { key: string; name: string }
const lvKey = (v: string) => v.trim().toLowerCase();
/** Valor guardado (",gold,platinum,") → níveis marcados. Vazio, ou todos os cadastrados marcados = sem restrição. */
export function parseLevelValue(raw: string | null | undefined, options?: LevelOption[]): string[] {
  const set = new Set((raw ?? "").split(",").map(lvKey).filter(Boolean));
  if (!options) return Array.from(set);
  const list = options.map((o) => o.key).filter((k) => set.has(k));
  return list.length === options.length ? [] : list;
}
export function levelsSummary(raw: string | null | undefined, options: LevelOption[]): string {
  const list = parseLevelValue(raw, options);
  return list.length === 0 ? "Todos os níveis de agência" : "Níveis: " + list.map((k) => options.find((o) => o.key === k)?.name ?? k).join(", ");
}
/** Níveis só fazem sentido quando agências podem ver (Todos, Agency ou Agency Partner). */
export const levelsApply = (aud: AudienceKey[]) => aud.length === 0 || aud.includes("agency") || aud.includes("partner");

/** "all" ou lista separada por vírgula → conjunto marcado (vazio = Todos). */
export function parseAudienceValue(raw: string | null | undefined): AudienceKey[] {
  const v = (raw ?? "all").trim();
  if (!v || v === "all") return [];
  return v.split(",").map((t) => t.trim()).filter((t): t is AudienceKey => AUDIENCE_CHECKS.some((c) => c.key === t));
}

/** R21-13 (reunião 21/10): a opção "Todos" saiu. Sem restrição guardada ("all") = os três públicos de cliente marcados na tela. */
export const CLIENT_AUDIENCES: AudienceKey[] = ["company", "agency", "partner"];
export function effectiveAudience(raw: string | null | undefined): AudienceKey[] {
  const list = parseAudienceValue(raw);
  return list.length === 0 ? [...CLIENT_AUDIENCES] : list;
}

/** Aplica um clique: "Todos" limpa tudo; "Somente equipe interna" é exclusivo; marcar outro público desmarca a equipe interna. */
export function toggleAudience(current: AudienceKey[], key: AudienceKey | "all", on: boolean): AudienceKey[] {
  if (key === "all") return [];
  if (key === "internal") return on ? ["internal"] : [];
  const rest = current.filter((k) => k !== "internal" && k !== key);
  return on ? [...rest, key] : rest;
}

/** Valor guardado em um CAMPO (Informações comerciais etc.) → públicos marcados. Valores antigos: client = Todos, company = só Company, internal/team = só equipe interna. */
export function fieldVisibilityToAudience(raw: string | null | undefined): AudienceKey[] {
  const v = (raw ?? "client").trim();
  if (v === "" || v === "client") return [...CLIENT_AUDIENCES];
  if (v === "company") return ["company"];
  if (v === "internal" || v === "team") return ["internal"];
  const list = v.split(",").map((t) => t.trim()).filter((t): t is AudienceKey => CLIENT_AUDIENCES.includes(t as AudienceKey));
  return list.length ? list : ["internal"];
}
/** Públicos marcados → valor a guardar no campo (os três = "client"; só company = "company"; equipe interna = "internal"). */
export function audienceToFieldVisibility(aud: AudienceKey[]): string {
  if (aud.includes("internal")) return "internal";
  const ordered = CLIENT_AUDIENCES.filter((k) => aud.includes(k));
  if (ordered.length === CLIENT_AUDIENCES.length) return "client";
  if (ordered.length === 1 && ordered[0] === "company") return "company";
  return ordered.join(",");
}

/**
 * Botão "Quem vê: …" de um campo (padrão da reunião 21/10): abre as caixas de marcar com o atalho Todos.
 * Só aplica quando há ao menos um público marcado. `locked` = campo sempre só da equipe interna (ex.: observações internas).
 */
export function FieldAudienceMenu({ fieldKey, value, onChange, readOnly, locked }: { fieldKey: string; value: string | null | undefined; onChange: (v: string) => void; readOnly?: boolean; locked?: boolean }) {
  const saved: AudienceKey[] = locked ? ["internal"] : fieldVisibilityToAudience(value);
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<AudienceKey[]>(saved);
  const savedSig = saved.join(",");
  useEffect(() => { if (!open) setLocal(saved); }, [open, savedSig]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = saved.includes("internal") ? "Somente equipe interna" : audienceToFieldVisibility(saved) === "client" ? "Todos" : audienceSummary(audienceToFieldVisibility(saved));
  const apply = (next: AudienceKey[]) => { setLocal(next); if (next.length > 0) onChange(audienceToFieldVisibility(next)); };
  return (
    <Popover open={open && !locked && !readOnly} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={readOnly || locked} aria-label={`Quem pode ver este campo: ${label}`} data-testid={`field-audience-${fieldKey}`} className="inline-flex max-w-[16rem] shrink-0 items-center gap-1 truncate rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50 disabled:text-slate-500 disabled:hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-violet-200">
          <span className="text-slate-500">Quem vê:</span> <span className="truncate">{label}</span>{!locked && !readOnly && <ChevronDown className="h-3 w-3 shrink-0" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2 p-3">
        <p className="text-[11px] font-semibold text-slate-700">Quem pode ver este campo</p>
        <AudienceChecks value={local} onChange={apply} idPrefix={`fld-${fieldKey}`} />
        {local.length === 0 && <p role="alert" className="text-[11px] font-semibold text-amber-700">Marque ao menos um público (a alteração só vale com pelo menos um marcado).</p>}
        <p className="text-[10px] text-slate-500">A equipe interna sempre enxerga. "Somente equipe interna" esconde o campo de qualquer cliente ou agência.</p>
      </PopoverContent>
    </Popover>
  );
}

/** Aplica um clique no "Todos" (atalho): marca os três públicos de cliente; se já estavam todos marcados, limpa para o usuário escolher um a um. */
export function toggleAllAudiences(current: AudienceKey[]): AudienceKey[] {
  const all = CLIENT_AUDIENCES.every((k) => current.includes(k)) && !current.includes("internal");
  return all ? [] : [...CLIENT_AUDIENCES];
}

/**
 * Caixas de marcar "Quem pode ver" (padrão da reunião 21/10): botão **Todos** (atalho que marca Company + Agency + Agency Partner)
 * e, abaixo/ao lado, cada público separado. "Somente equipe interna" é exclusivo. Usada no produto e em cada campo (Informações comerciais etc.).
 */
export function AudienceChecks({ value, onChange, disabled, idPrefix = "aud" }: { value: AudienceKey[]; onChange: (next: AudienceKey[]) => void; disabled?: boolean; idPrefix?: string }) {
  const allOn = CLIENT_AUDIENCES.every((k) => value.includes(k)) && !value.includes("internal");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs" data-testid="audience-checks">
      <label className="flex items-center gap-1.5 font-semibold" title="Marca Company, Agency e Agency Partner de uma vez.">
        <input type="checkbox" aria-label="Todos" disabled={disabled} checked={allOn} onChange={() => onChange(toggleAllAudiences(value))} id={`${idPrefix}-all`} /> Todos
      </label>
      {AUDIENCE_CHECKS.map((c) => (
        <label key={c.key} className="flex items-center gap-1.5" title={c.hint}>
          <input type="checkbox" aria-label={c.label} disabled={disabled} checked={value.includes(c.key)} onChange={(e) => onChange(toggleAudience(value, c.key, e.target.checked))} /> {c.label}
        </label>
      ))}
    </div>
  );
}

export function audienceSummary(raw: string | null | undefined): string {
  const list = parseAudienceValue(raw);
  if (list.length === 0 || (list.length === CLIENT_AUDIENCES.length && CLIENT_AUDIENCES.every((k) => list.includes(k)))) return "Company + Agency + Agency Partner";
  return list.map((k) => AUDIENCE_CHECKS.find((c) => c.key === k)!.label).join(" + ");
}

export function AudienceCard({ product, readOnly, onDone, registerFlush, bare = false }: { /** Dentro de um acordeão (SectionCard): sem moldura e sem título próprios. */ bare?: boolean; product: any; readOnly?: boolean; onDone?: () => void; registerFlush?: (fn: () => Promise<void>) => () => void }) {
  const saved = effectiveAudience(product?.visibility_mode);
  const [levelOptions, setLevelOptions] = useState<LevelOption[]>([]);
  useEffect(() => { let live = true; Promise.resolve(apiClient.getCatalog2AgencyLevels?.()).then((r: any) => { if (live && Array.isArray(r?.data)) setLevelOptions(r.data); }).catch(() => {}); return () => { live = false; }; }, []);
  const savedLv = parseLevelValue(product?.visibility_agency_levels, levelOptions);
  const [sel, setSel] = useState<AudienceKey[]>(saved);
  const [warn, setWarn] = useState<string | null>(null);
  // Marcar/desmarcar um público. Nunca fica vazio: precisa haver ao menos um público.
  const pick = (next: AudienceKey[]) => {
    setWarn(next.length === 0 ? "Marque ao menos um público (a alteração só vale com pelo menos um marcado)." : null);
    setSel(next);
  };
  const [lv, setLv] = useState<string[]>(savedLv);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setSel(effectiveAudience(product?.visibility_mode)); setLv(parseLevelValue(product?.visibility_agency_levels, levelOptions)); }, [product?.id, product?.visibility_mode, product?.visibility_agency_levels, levelOptions]);
  if (!product?.id) return null;
  const showLevels = levelsApply(sel);
  const effLv = showLevels ? lv : [];
  const sig = (a: AudienceKey[], l: string[]) => `${[...a].sort().join(",")}|${[...l].sort().join(",")}`;
  const dirty = sel.length > 0 && sig(sel, effLv) !== sig(saved, savedLv);
  const lastSent = useRef<string>(sig(saved, savedLv));
  const save = async () => {
    setBusy(true); setMsg(null);
    lastSent.current = sig(sel, effLv);
    try { await apiClient.setCatalog2ProductVisibility(product.id, sel, effLv); setMsg({ ok: true, text: "Público do produto salvo." }); onDone?.(); }
    catch (e: any) { lastSent.current = sig(saved, savedLv); setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar o público." }); }
    finally { setBusy(false); }
  };
  // Dentro do editor (registerFlush): NÃO salva sozinho nem tem botão próprio — a marcação só vale depois de
  // "Editar" e é gravada junto com "Salvar rascunho" / publicar (flush). Fora do editor mantém o salvar sozinho.
  const latest = useRef({ sel, effLv, dirty, readOnly });
  latest.current = { sel, effLv, dirty, readOnly };
  useEffect(() => {
    if (!registerFlush) return;
    return registerFlush(async () => {
      const c = latest.current;
      if (c.readOnly || !c.dirty || !product?.id) return;
      lastSent.current = sig(c.sel, c.effLv);
      try { await apiClient.setCatalog2ProductVisibility(product.id, c.sel, c.effLv); setMsg({ ok: true, text: "Público do produto salvo." }); onDone?.(); }
      catch (e: any) { lastSent.current = sig(saved, savedLv); setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar o público." }); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerFlush, product?.id]);
  const manual = !!registerFlush;
  useEffect(() => {
    if (manual || readOnly || !dirty || busy || lastSent.current === sig(sel, effLv)) return;
    const t = setTimeout(() => { void save(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, lv, dirty, busy, readOnly]);
  const locked = !!readOnly || busy;
  return (
    <section className={bare ? "" : "rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"} data-testid="audience-card">
      {!bare && <><h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Quem pode ver este produto</h3>
      <p className="text-[11px] text-slate-500">Marque quem enxerga e contrata. Vale na lista, no detalhe, na cotação, na cesta e nas recomendações da IA.</p></>}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <AudienceChecks value={sel} onChange={pick} disabled={locked} idPrefix="product-aud" />
        {!manual && dirty && !readOnly && <Button type="button" size="sm" className="h-8 bg-violet-700 text-xs text-white" disabled={busy} onClick={() => void save()}>{busy ? "Salvando…" : "Salvar agora"}</Button>}
        {!manual && dirty && !readOnly && !busy && <span className="text-[11px] text-slate-500">salva sozinho em instantes…</span>}
        {manual && dirty && !readOnly && <span className="text-[11px] text-slate-500">alteração pendente — vale ao clicar em “Salvar rascunho”.</span>}
      </div>
      {showLevels && levelOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2 text-xs dark:border-slate-800" data-testid="agency-levels">
          <span className="font-semibold text-slate-700 dark:text-slate-200" title="Vale só para agências. Empresas não são afetadas.">Níveis de agência:</span>
          <label className="flex items-center gap-1.5 font-semibold"><input type="checkbox" aria-label="Todos os níveis" disabled={locked} checked={lv.length === 0} onChange={() => setLv([])} /> Todos os níveis</label>
          {levelOptions.map((o) => (
            <label key={o.key} className="flex items-center gap-1.5"><input type="checkbox" aria-label={o.name} disabled={locked} checked={lv.includes(o.key)} onChange={(e) => setLv(e.target.checked ? [...lv, o.key] : lv.filter((k) => k !== o.key))} /> {o.name}</label>
          ))}
        </div>
      )}
      {warn && <p role="alert" className="mt-1 text-[11px] font-semibold text-amber-700">{warn}</p>}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-1 text-[11px] font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
