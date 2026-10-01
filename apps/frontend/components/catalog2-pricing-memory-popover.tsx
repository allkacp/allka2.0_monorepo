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
  rate_is_provisional?: boolean;
}
interface SplitComponent { cost: number; price: number; tasks: string[]; taxes_and_margins: PricingLine[] }
/** Separação implantação × recorrente (mesma memória de cálculo, por componente). */
export interface PricingSplitView {
  implementation: SplitComponent & { applicable: boolean; rule: string; reason: string };
  first_cycle_operation: SplitComponent;
  recurring: SplitComponent & { every_n_tasks?: { key: string; every: number }[] };
  revalidation: { cost: number; price: number; tasks: string[]; charged: false; note: string };
  one_time_items: { label: string; scope: string; cost: number; price: number; task: string | null }[];
  recurring_items: { label: string; scope: string; cost: number; price: number; start_cycle: number; end_cycle: number | null; task: string | null }[];
  avulso_total: number | null;
  first_charge: number | null;
  renewal: number | null;
  first_charge_parts: { implementation: number; one_time: number; recurring: number } | null;
  cycle_prices: { cycle: number; price: number | null }[];
  not_charged: { key: string; reason: string }[];
}
interface PricingMemory {
  currency: string;
  split?: PricingSplitView;
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
  // Pedido 3, fase 7: IA por perfil, revisão por tempo/percentual e demonstrativo por tarefa.
  ia_cost_breakdown?: { task_key: string; tokens_in: number; tokens_out: number; review_rounds: number; cost: number | null; profile?: string | null; fixed_cost_per_pass?: number }[];
  review_breakdown?: { task_key: string; task_name: string; source: "tempo" | "percentual"; minutes: number; specialty: string | null; rate: number | null; cost: number | null }[];
  cost_statement?: { task_key: string; task_name: string; executor: string; human_cost: number | null; ia_cost: number | null; review_minutes: number; review_cost: number | null; total: number | null }[];
  is_simulation?: boolean;
  simulation?: {
    total: number;
    label: string;
    authorizes_publish: boolean;
    authorizes_quote: boolean;
    authorizes_contract: boolean;
  };
  simulation_provenance?: {
    commercial_config: "real" | "provisional" | "missing";
    deadline: "real" | "provisional" | "missing";
  };
  deadline?: {
    commercial_deadline_days: number | null;
  };
}
interface PricingMemoryResponse {
  version_id: string | null;
  version_state: string | null;
  pricing: PricingMemory | null;
  pricing_simulation?: PricingMemory | null;
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

function ComponentBlock({ title, sub, c, total }: { title: string; sub: string; c: SplitComponent; total?: string }) {
  return (
    <div className="rounded-md border border-slate-100 p-2 dark:border-slate-800">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{title}</span>
        <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-100">{total ?? money(c.price)}</span>
      </div>
      <p className="text-[10px] text-slate-400">{sub}</p>
      <p className="mt-0.5 text-[10px] text-slate-500">Custo {money(c.cost)} · Tarefas: {c.tasks.length ? c.tasks.join(", ") : "nenhuma"}</p>
      {c.taxes_and_margins.length > 0 && (
        <details className="mt-0.5">
          <summary className="cursor-pointer text-[10px] text-violet-600">Impostos, comissão, taxa e margem deste componente</summary>
          <div className="mt-0.5">{c.taxes_and_margins.map((l, i) => <LineRow key={i} line={l} />)}</div>
        </details>
      )}
    </div>
  );
}

/** A cobrança em partes claras: o que se paga AGORA (implantação + 1ª mensalidade) × o que renova (só a mensalidade). */
export function BillingSplitSection({ split }: { split: PricingSplitView }) {
  const impl = split.implementation;
  return (
    <section data-testid="billing-split" className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Como a cobrança se divide</h4>
      <div className="mt-1 grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="rounded-md bg-white p-1.5 shadow-sm dark:bg-slate-900"><p className="text-[10px] text-slate-500">Primeira cobrança</p><p className="font-mono text-sm font-extrabold text-slate-800 dark:text-slate-100">{money(split.first_charge)}</p><p className="text-[10px] text-slate-400">implantação + 1ª mensalidade</p></div>
        <div className="rounded-md bg-white p-1.5 shadow-sm dark:bg-slate-900"><p className="text-[10px] text-slate-500">Renovação (todo mês)</p><p className="font-mono text-sm font-extrabold text-slate-800 dark:text-slate-100">{money(split.renewal)}</p><p className="text-[10px] text-slate-400">sem a implantação</p></div>
        <div className="col-span-2 rounded-md bg-white p-1.5 shadow-sm dark:bg-slate-900"><p className="text-[10px] text-slate-500">Compra avulsa (sem assinatura)</p><p className="font-mono text-sm font-extrabold text-slate-800 dark:text-slate-100">{money(split.avulso_total)}</p><p className="text-[10px] text-slate-400">implantação + um ciclo operacional + variações + adicionais; não renova</p></div>
      </div>
      {split.first_charge_parts && (
        <p className="mt-1 text-[10px] text-slate-500">Composição da primeira cobrança: implantação {money(split.first_charge_parts.implementation)} + cobranças únicas {money(split.first_charge_parts.one_time)} + mensalidade do 1º ciclo {money(split.first_charge_parts.recurring)}.</p>
      )}
      <div className="mt-1.5 space-y-1.5">
        <ComponentBlock title="Implantação inicial (uma vez)" sub={impl.applicable ? `Cobrada agora — ${impl.reason}` : `Não cobrada — ${impl.reason}`} c={impl} total={impl.applicable ? money(impl.price) : "não se aplica"} />
        <ComponentBlock title="Ciclo recorrente (cada mensalidade)" sub={split.recurring.every_n_tasks?.length ? `Algumas tarefas só a cada N ciclos: ${split.recurring.every_n_tasks.map((t) => `${t.key} (a cada ${t.every})`).join(", ")}` : "Tarefas que se repetem em todos os ciclos"} c={split.recurring} />
        <ComponentBlock title="Operação do 1º ciclo" sub="Tarefas geradas na contratação (inclui as de “só na 1ª vez”)" c={split.first_cycle_operation} />
        {split.revalidation.tasks.length > 0 && (
          <p className="rounded-md bg-white px-2 py-1 text-[10px] text-slate-500 dark:bg-slate-900">Revalidação ({split.revalidation.tasks.join(", ")}): {split.revalidation.note}</p>
        )}
      </div>
      {(split.one_time_items.length > 0 || split.recurring_items.length > 0) && (
        <div className="mt-1.5 text-[10px] text-slate-600 dark:text-slate-300">
          {split.one_time_items.map((i, k) => <div key={`o${k}`} className="flex justify-between"><span>{i.label} <span className="text-slate-400">(cobrança única)</span></span><span className="font-mono">{money(i.price)}</span></div>)}
          {split.recurring_items.map((i, k) => <div key={`r${k}`} className="flex justify-between"><span>{i.label} <span className="text-slate-400">({i.scope === "per_cycle" ? `ciclos ${i.start_cycle} a ${i.end_cycle ?? "sempre"}` : "em toda mensalidade"})</span></span><span className="font-mono">{money(i.price)}</span></div>)}
        </div>
      )}
      <details className="mt-1">
        <summary className="cursor-pointer text-[10px] text-violet-600">Valor de cada ciclo (0 = primeira cobrança)</summary>
        <div className="mt-0.5 grid grid-cols-3 gap-x-2 text-[10px] text-slate-600 dark:text-slate-300">{split.cycle_prices.map((c) => <span key={c.cycle}>Ciclo {c.cycle}: <span className="font-mono">{money(c.price)}</span></span>)}</div>
      </details>
      {split.not_charged.length > 0 && <p className="mt-1 text-[10px] text-slate-400">Fora do preço: {split.not_charged.map((n) => `${n.key} (${n.reason})`).join("; ")}.</p>}
    </section>
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

  // Quando a rota devolve a simulação administrativa, ela é a visão
  // principal deste popover. O preço real continua separado em `pricing` e
  // nenhuma autorização comercial é inferida no frontend.
  const pricing = data?.pricing_simulation ?? data?.pricing ?? null;
  const isSimulation = !!pricing?.is_simulation;

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

        {!loading && !error && isSimulation && pricing && (
          <div className="mb-3 rounded-md border border-violet-200 bg-violet-50 p-2.5 dark:border-violet-900/40 dark:bg-violet-900/20">
            <p className="text-xs font-bold text-violet-800 dark:text-violet-200">Simulação provisória para teste</p>
            <p className="mt-1 text-[11px] text-violet-700 dark:text-violet-300">
              O cálculo abaixo usa dados provisórios identificados. Não autoriza publicação, cotação ou contratação.
            </p>
          </div>
        )}

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

        {!loading && !error && pricing && !pricing.commercial_ready && !isSimulation && (
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

        {!loading && !error && pricing && isSimulation && pricing.quote_blockers.length > 0 && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-900/40 dark:bg-amber-900/20">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Pendências antes do uso comercial</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-amber-700 dark:text-amber-300">
              {[...new Set([...pricing.pending_info, ...pricing.quote_blockers])].map((b, i) => <li key={i}>{b}</li>)}
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
                        {t.specialty ?? "sem especialidade definida"} · {t.minutes} min · {t.rate != null ? `${money(t.rate)}/h${t.rate_is_provisional ? " (simulado)" : ""}` : "valor/hora não definido"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(pricing.ia_cost_breakdown?.length ?? 0) > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">IA por tarefa</h4>
                <div className="mt-1 space-y-1.5 border-l-2 border-slate-100 pl-2 dark:border-slate-800">
                  {pricing.ia_cost_breakdown!.map((t) => (
                    <div key={t.task_key} className="text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{t.task_key}</span>
                        <span className="shrink-0 font-mono font-semibold">{money(t.cost)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.profile ?? "preço informado na própria tarefa"} · {t.tokens_in}/{t.tokens_out} tokens · {t.review_rounds} rodada(s) de revisão{t.fixed_cost_per_pass ? ` · ${money(t.fixed_cost_per_pass)} fixo por passada` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(pricing.review_breakdown?.length ?? 0) > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Revisão humana por tarefa</h4>
                <div className="mt-1 space-y-1.5 border-l-2 border-slate-100 pl-2 dark:border-slate-800">
                  {pricing.review_breakdown!.map((r) => (
                    <div key={r.task_key} className="text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{r.task_key}</span>
                        <span className="shrink-0 font-mono font-semibold">{money(r.cost)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.source === "tempo" ? `${r.minutes} min · ${r.specialty ?? "sem especialidade"} · ${r.rate != null ? `${money(r.rate)}/h` : "valor/hora não definido"}` : "percentual sobre o custo humano da tarefa"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(pricing.cost_statement?.length ?? 0) > 0 && (
              <section>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Demonstrativo por tarefa</h4>
                <table className="mt-1 w-full text-[10px] text-slate-600 dark:text-slate-300">
                  <thead><tr className="text-left text-slate-400"><th className="font-medium">Tarefa</th><th className="text-right font-medium">Humano</th><th className="text-right font-medium">IA</th><th className="text-right font-medium">Revisão</th><th className="text-right font-medium">Total</th></tr></thead>
                  <tbody>
                    {pricing.cost_statement!.map((c) => (
                      <tr key={c.task_key} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="max-w-[7rem] truncate py-0.5" title={`${c.task_name} (${c.executor})`}>{c.task_key}</td>
                        <td className="text-right font-mono">{money(c.human_cost)}</td>
                        <td className="text-right font-mono">{money(c.ia_cost)}</td>
                        <td className="text-right font-mono">{money(c.review_cost)}{c.review_minutes > 0 ? ` (${c.review_minutes}m)` : ""}</td>
                        <td className="text-right font-mono font-semibold">{money(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {pricing.split && <BillingSplitSection split={pricing.split} />}

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
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isSimulation ? "Preço final simulado" : pricing.lines.commercial_final_price.label}
                </span>
                <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {money(isSimulation ? pricing.simulation?.total ?? null : pricing.lines.commercial_final_price.amount)}
                </span>
              </div>
              {isSimulation && pricing.deadline && (
                <p className="mt-1 text-right text-[11px] font-medium text-violet-700 dark:text-violet-300">
                  Prazo simulado: {pricing.deadline.commercial_deadline_days ?? "—"} dia(s)
                </p>
              )}
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
