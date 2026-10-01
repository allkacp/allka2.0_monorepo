"use client";

// Aviso interno "Configuração comercial inconsistente": mostra o que está em conflito entre modalidade de compra,
// entrega mensal recorrente e períodos, e oferece AÇÕES EXPLÍCITAS (só em modo de edição). Nada muda sozinho:
// cada ação mostra primeiro exatamente o que vai alterar e pede confirmação.
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface Issue { code: string; severity: "blocker" | "warning"; message: string }
interface Option { action: string; label: string; effects: string[] }

export function CommercialConsistencyBanner({ version, readOnly, act, showActions = true }: { version: any; readOnly: boolean; act?: (fn: () => Promise<any>, ok: string) => void; showActions?: boolean }) {
  const issues: Issue[] = version?.commercial_consistency ?? [];
  const blockers = issues.filter((i) => i.severity === "blocker");
  const warnings = issues.filter((i) => i.severity === "warning");
  const [options, setOptions] = useState<Option[]>([]);
  const [pending, setPending] = useState<Option | null>(null);
  useEffect(() => { if (blockers.length > 0 && showActions) apiClient.getCatalog2CommercialOptions().then((r: any) => setOptions(r.data)).catch(() => {}); }, [blockers.length, showActions]);
  if (issues.length === 0) return null;
  const canAct = showActions && !readOnly && !!act && version?.state !== "publicada";
  return (
    <div role="alert" className={`rounded-lg border p-3 text-xs ${blockers.length ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"}`}>
      {blockers.length > 0 && (
        <p className="flex items-center gap-1.5 text-sm font-semibold"><AlertTriangle className="h-4 w-4" /> Configuração comercial inconsistente <span className="font-normal">— bloqueia a publicação e a cotação até ser resolvida</span></p>
      )}
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {[...blockers, ...warnings].map((i) => <li key={i.code}>{i.message}</li>)}
      </ul>
      {blockers.length > 0 && !canAct && <p className="mt-1.5 text-[11px] opacity-80">{version?.state === "publicada" ? "Esta versão está publicada e não muda. Crie uma nova versão para corrigir." : "Clique em Editar para escolher como resolver."}</p>}
      {blockers.length > 0 && canAct && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] font-semibold">Como resolver (nada muda sem a sua escolha):</p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => (
              <button key={o.action} type="button" onClick={() => setPending(o)} className="rounded-full border border-amber-400 bg-white px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-100 dark:bg-slate-900 dark:text-amber-100">{o.label}</button>
            ))}
          </div>
          {pending && (
            <div className="rounded-md border border-slate-300 bg-white p-2 text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
              <p className="font-semibold">{pending.label}</p>
              <ul className="mt-0.5 list-disc pl-5">{pending.effects.map((e) => <li key={e}>{e}</li>)}</ul>
              <div className="mt-1.5 flex gap-1.5">
                <Button size="sm" className="h-7" onClick={() => { const p = pending; setPending(null); act!(() => apiClient.resolveCatalog2Commercial(version.id, p.action), p.action === "manual_review" ? "Nada foi alterado — revise manualmente." : `Aplicado: ${p.label}.`); }}>Confirmar</Button>
                <Button size="sm" variant="outline" className="h-7" onClick={() => setPending(null)}>Cancelar</Button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Vale só para esta versão em edição e fica registrado no histórico. Produtos, preços e contratos já publicados não mudam.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
