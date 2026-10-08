"use client";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

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

/** Aplica um clique: "Todos" limpa tudo; "Somente equipe interna" é exclusivo; marcar outro público desmarca a equipe interna. */
export function toggleAudience(current: AudienceKey[], key: AudienceKey | "all", on: boolean): AudienceKey[] {
  if (key === "all") return [];
  if (key === "internal") return on ? ["internal"] : [];
  const rest = current.filter((k) => k !== "internal" && k !== key);
  return on ? [...rest, key] : rest;
}

export function audienceSummary(raw: string | null | undefined): string {
  const list = parseAudienceValue(raw);
  if (list.length === 0) return "Todos";
  return list.map((k) => AUDIENCE_CHECKS.find((c) => c.key === k)!.label).join(" + ");
}

export function AudienceCard({ product, readOnly, onDone }: { product: any; readOnly?: boolean; onDone?: () => void }) {
  const saved = parseAudienceValue(product?.visibility_mode);
  const [levelOptions, setLevelOptions] = useState<LevelOption[]>([]);
  useEffect(() => { let live = true; Promise.resolve(apiClient.getCatalog2AgencyLevels?.()).then((r: any) => { if (live && Array.isArray(r?.data)) setLevelOptions(r.data); }).catch(() => {}); return () => { live = false; }; }, []);
  const savedLv = parseLevelValue(product?.visibility_agency_levels, levelOptions);
  const [sel, setSel] = useState<AudienceKey[]>(saved);
  const [lv, setLv] = useState<string[]>(savedLv);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setSel(parseAudienceValue(product?.visibility_mode)); setLv(parseLevelValue(product?.visibility_agency_levels, levelOptions)); }, [product?.id, product?.visibility_mode, product?.visibility_agency_levels, levelOptions]);
  if (!product?.id) return null;
  const showLevels = levelsApply(sel);
  const effLv = showLevels ? lv : [];
  const sig = (a: AudienceKey[], l: string[]) => `${[...a].sort().join(",")}|${[...l].sort().join(",")}`;
  const dirty = sig(sel, effLv) !== sig(saved, savedLv);
  const lastSent = useRef<string>(sig(saved, savedLv));
  const save = async () => {
    setBusy(true); setMsg(null);
    lastSent.current = sig(sel, effLv);
    try { await apiClient.setCatalog2ProductVisibility(product.id, sel, effLv); setMsg({ ok: true, text: "Público do produto salvo." }); onDone?.(); }
    catch (e: any) { lastSent.current = sig(saved, savedLv); setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar o público." }); }
    finally { setBusy(false); }
  };
  // Salva sozinho ~0,8 s depois da última marcação (uma vez por combinação; se falhar, o botão continua disponível).
  useEffect(() => {
    if (readOnly || !dirty || busy || lastSent.current === sig(sel, effLv)) return;
    const t = setTimeout(() => { void save(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, lv, dirty, busy, readOnly]);
  const locked = !!readOnly || busy;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="audience-card">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Quem pode ver este produto</h3>
      <p className="text-[11px] text-slate-500">Marque quem enxerga e contrata. Vale na lista, no detalhe, na cotação, na cesta e nas recomendações da IA.</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <label className="flex items-center gap-1.5 font-semibold" title="Todos os clientes (empresas e agências) enxergam.">
          <input type="checkbox" aria-label="Todos" disabled={locked} checked={sel.length === 0} onChange={() => setSel(toggleAudience(sel, "all", true))} /> Todos
        </label>
        {AUDIENCE_CHECKS.map((c) => (
          <label key={c.key} className="flex items-center gap-1.5" title={c.hint}>
            <input type="checkbox" aria-label={c.label} disabled={locked} checked={sel.includes(c.key)} onChange={(e) => setSel(toggleAudience(sel, c.key, e.target.checked))} /> {c.label}
          </label>
        ))}
        {dirty && !readOnly && <Button type="button" size="sm" className="h-8 bg-violet-700 text-xs text-white" disabled={busy} onClick={() => void save()}>{busy ? "Salvando…" : "Salvar agora"}</Button>}
        {dirty && !readOnly && !busy && <span className="text-[11px] text-slate-500">salva sozinho em instantes…</span>}
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
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-1 text-[11px] font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
