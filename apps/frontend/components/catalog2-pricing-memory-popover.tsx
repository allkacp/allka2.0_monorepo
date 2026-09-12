"use client";

// Memória de cálculo do preço — catalog2 (reunião 10/09, "memória de
// cálculo da precificação — Admin Master"). Ícone de informação ao lado do
// preço nas telas de Cadastro/Catálogo/detalhe administrativo: ao clicar,
// mostra EXATAMENTE o que o backend já calculou via computePricing (nunca
// recalculado/reformulado aqui) — custo das tarefas (especialidade, horas,
// valor/hora), variações, adicionais, percentuais comerciais na ordem de
// incidência, subtotais e preço final. Quando o preço não é calculável,
// mostra "Preço ainda não calculável" com os bloqueadores exatos que o
// backend devolveu — nunca um texto genérico inventado aqui.
//
// Um valor de Catalog2ProvisionalPreview, se houver, só aparece numa caixa
// separada e claramente rotulada "provisório para visualização" — nunca
// misturado com a memória de cálculo real, e nunca tratado como preço
// comercial.
//
// Restrito a Admin Master: o componente não renderiza nada (nem o ícone)
// quando `isAdminMaster` é false — mesma regra que já protege a rota no
// backend (router inteiro atrás de guardAdminMaster).
import { useState } from "react";
import { Info, Loader2, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiClient } from "@/lib/api-client";
import { fmtBRL } from "@/components/product-detail-shared";
import { ProvisionalBadge } from "@/components/provisional-badge";

interface PricingLine {
  label: string;
  amount: number | null;
  detail?: string;
}
interface HumanCostRow {
  task_key: string;
  specialty: string | null;
  minutes: number;
  rate: number | null;
  cost: number | null;
  // Reunião 10/09 ("36 produtos funcionalmente completos para teste"):
  // especialidade/tempo definidos só como dado de teste — nunca real.
  effort_is_provisional: boolean;
}
interface PricingMemory {
  currency: string;
  lines: {
    human_cost: PricingLine;
    ia_cost: PricingLine;
    human_review_cost: PricingLine;
    addons: PricingLine;
    variation_impacts: PricingLine;
    condition_impacts: PricingLine;
    direct_cost: PricingLine;
    minimum_price: PricingLine;
    subtotal_cost: PricingLine;
    taxes_and_margins: PricingLine[];
    commercial_final_price: PricingLine;
  };
  applied_order: string[];
  commercial_ready: boolean;
  quote_blockers: string[];
  pending_info: string[];
  human_cost_breakdown: HumanCostRow[];
}
interface PricingMemoryResponse {
  version_id: string | null;
  version_state: string | null;
  pricing: PricingMemory | null;
}

function money(n: number | null): string {
  return n == null ? "—" : fmtBRL(n);
}

function LineRow({ line }: { line: PricingLine }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {line.label}
        {line.detail ? <span className="text-slate-400"> — {line.detail}</span> : null}
      </span>
      <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200">{money(line.amount)}</span>
    </div>
  );
}

export function Catalog2PricingMemoryPopover({
  productId,
  isAdminMaster,
  provisionalPriceAmount,
  variant = "light",
}: {
  productId: string;
  isAdminMaster: boolean;
  /** Catalog2ProvisionalPreview.price_amount, se houver — só exibição separada, nunca preço real. */
  provisionalPriceAmount?: number | null;
  /** "dark": ícone visível sobre fundo escuro (ex.: cabeçalho degradê do detalhe). */
  variant?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PricingMemoryResponse | null>(null);

  if (!isAdminMaster) return null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !data && !loading) {
      setLoading(true);
      setError(null);
      apiClient
        .getCatalog2ProductPricingMemory(productId)
        .then((res: any) => setData(res))
        .catch((e: any) => setError(e?.message || "Não foi possível carregar a memória de cálculo."))
        .finally(() => setLoading(false));
    }
  }

  const pricing = data?.pricing ?? null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Como o preço foi calculado"
          className={
            variant === "dark"
              ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:bg-slate-800"
          }
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        onClick={(e) => e.stopPropagation()}
        className="w-96 max-h-[70vh] overflow-y-auto p-4 text-left"
      >
        <h3 className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">Memória de cálculo do preço</h3>

        {!loading && !error && pricing?.human_cost_breakdown.some((t) => t.effort_is_provisional) && (
          <p className="mb-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <ProvisionalBadge label="Especialidade e tempo provisórios para teste — revisão humana pendente. Nunca usado para aprovar preço comercial ou publicação." />
            Especialidade e tempo provisórios para teste
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando…
          </div>
        )}

        {error && !loading && (
          <p className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        {!loading && !error && data && !pricing && (
          <p className="text-xs text-slate-500">Produto sem versão — nada a calcular ainda.</p>
        )}

        {!loading && !error && pricing && !pricing.commercial_ready && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900/40 dark:bg-amber-900/20">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Preço ainda não calculável</p>
            {/* União exata de quote_blockers (motivo geral) + pending_info
                (detalhe específico) — o backend já calcula os dois; nunca
                escolhemos um em vez do outro nem inventamos texto aqui. */}
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-700 dark:text-amber-300">
              {[...new Set([...pricing.pending_info, ...pricing.quote_blockers])].map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !error && pricing && (
          <div className="space-y-3">
            {pricing.human_cost_breakdown.length > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Custo por tarefa</h4>
                <div className="mt-1 space-y-1.5 border-l-2 border-slate-100 pl-2 dark:border-slate-800">
                  {pricing.human_cost_breakdown.map((t) => (
                    <div key={t.task_key} className="text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1 truncate font-medium">
                          {t.task_key}
                          {t.effort_is_provisional && (
                            <ProvisionalBadge label="Especialidade e tempo provisórios para teste — revisão humana pendente." />
                          )}
                        </span>
                        <span className="shrink-0 font-mono font-semibold">{money(t.cost)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.specialty ?? "sem especialidade definida"} · {t.minutes} min · {t.rate != null ? `${money(t.rate)}/h` : "valor/hora não definido"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Custos agregados</h4>
              <LineRow line={pricing.lines.human_cost} />
              <LineRow line={pricing.lines.ia_cost} />
              <LineRow line={pricing.lines.human_review_cost} />
              <LineRow line={pricing.lines.variation_impacts} />
              <LineRow line={pricing.lines.addons} />
              <LineRow line={pricing.lines.condition_impacts} />
            </section>

            <section className="border-t border-slate-100 pt-1.5 dark:border-slate-800">
              <LineRow line={pricing.lines.direct_cost} />
              <LineRow line={pricing.lines.minimum_price} />
              <LineRow line={pricing.lines.subtotal_cost} />
            </section>

            {pricing.lines.taxes_and_margins.length > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Percentuais comerciais (ordem de incidência{pricing.applied_order.length > 0 ? `: ${pricing.applied_order.join(" → ")}` : ""})
                </h4>
                {pricing.lines.taxes_and_margins.map((line, i) => (
                  <LineRow key={i} line={line} />
                ))}
              </section>
            )}

            <section className="border-t border-slate-200 pt-1.5 dark:border-slate-700">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{pricing.lines.commercial_final_price.label}</span>
                <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {money(pricing.lines.commercial_final_price.amount)}
                </span>
              </div>
            </section>
          </div>
        )}

        {provisionalPriceAmount != null && (
          <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 p-2 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
            Valor provisório para visualização: <strong>{money(provisionalPriceAmount)}</strong>
            <br />
            Nunca é preço comercial real — não entra na memória de cálculo acima.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
