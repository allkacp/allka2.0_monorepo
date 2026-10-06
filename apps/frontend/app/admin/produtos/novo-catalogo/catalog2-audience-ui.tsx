"use client";
import { useEffect, useState } from "react";
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
  const [sel, setSel] = useState<AudienceKey[]>(saved);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setSel(parseAudienceValue(product?.visibility_mode)); }, [product?.id, product?.visibility_mode]);
  if (!product?.id) return null;
  const dirty = [...sel].sort().join(",") !== [...saved].sort().join(",");
  const save = async () => {
    setBusy(true); setMsg(null);
    try { await apiClient.setCatalog2ProductVisibility(product.id, sel); setMsg({ ok: true, text: "Público do produto salvo." }); onDone?.(); }
    catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar o público." }); }
    finally { setBusy(false); }
  };
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
        {dirty && !readOnly && <Button type="button" size="sm" className="h-8 bg-violet-700 text-xs text-white" disabled={busy} onClick={() => void save()}>Salvar público</Button>}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-1 text-[11px] font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </section>
  );
}
