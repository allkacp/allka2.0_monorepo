"use client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePriceSummary } from "./header-price-tag";

// Confirmação ao mudar o STATUS COMERCIAL do produto (ex.: Em preparação → Disponível). Mostra um resumo do que o cliente verá, com os valores finais.
// O status vale na hora (não depende de rascunho nem de "Editar").
const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function StatusChangeDialog({ open, product, version, from, to, toLabel, fromLabel, meaning, busy, onCancel, onConfirm }: {
  open: boolean; product: any; version: any; from: string; to: string; fromLabel: string; toLabel: string; meaning: string; busy?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const summary = usePriceSummary(open ? version : null, product?.id);
  const visibleToClients = to === "disponivel" || to === "pre_lancamento";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] w-[95vw] max-w-lg overflow-y-auto" data-testid="status-change-dialog">
        <DialogTitle className="text-base">{to === "disponivel" ? "Deixar este produto Disponível?" : `Mudar o status para “${toLabel}”?`}</DialogTitle>
        <DialogDescription className="text-sm text-slate-600">
          <strong>{product?.internal_name}</strong>: de <strong>{fromLabel}</strong> para <strong>{toLabel}</strong>. {meaning}
        </DialogDescription>
        {visibleToClients && (
          <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-xs" data-testid="status-change-summary">
            <p className="font-bold text-slate-800">Resumo do que o cliente vai ver (valores finais, com impostos, taxas e margem)</p>
            {summary ? (
              <ul className="mt-1.5 space-y-1">
                {summary.oneTime != null && <li className="flex justify-between gap-3"><span>Compra avulsa</span><strong>{brl(summary.oneTime)}</strong></li>}
                {summary.plans.map((p) => (
                  <li key={p.key} className="flex justify-between gap-3">
                    <span>{p.label}{p.months > 1 ? ` (${p.months} meses${p.discount > 0 ? `, -${String(p.discount).replace(".", ",")}%` : ""})` : " (por mês)"}</span>
                    <span className="text-right"><strong>{brl(p.total)}</strong>{p.perMonth != null ? <span className="block text-[10px] text-slate-500">{brl(p.perMonth)} por mês</span> : null}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-1 text-slate-600">Calculando os valores…</p>}
            <p className="mt-2 text-[11px] text-slate-600">Versão publicada: <strong>v{product?.header?.published_version_number ?? version?.version_number}</strong>. A partir daqui clientes com acesso ao produto podem contratar.</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel} data-testid="status-change-cancel">Cancelar</Button>
          <Button type="button" disabled={busy} onClick={onConfirm} data-testid="status-change-confirm" style={{ background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" }} className="border-0 text-white hover:brightness-110">
            {busy ? "Aplicando…" : to === "disponivel" ? "Sim, deixar Disponível" : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
