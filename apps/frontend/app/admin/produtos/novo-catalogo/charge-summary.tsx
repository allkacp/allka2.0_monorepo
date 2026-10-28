"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

// Resumo da COBRANÇA do produto (decisão de 16/10): a implantação nasce das etapas marcadas "Só na primeira execução" e só entra na
// primeira cobrança; a renovação é só o recorrente. Todos os valores vêm do servidor (simulação real) — a tela nunca calcula preço.

const money = (n: number | null | undefined, cur = "R$") => (n == null ? "A definir" : `${cur} ${Number(n).toFixed(2).replace(".", ",")}`);
export const NO_FIRST_EXECUTION = "Este produto não possui atividades exclusivas da primeira execução.";

type Step = { ref: string; name: string; price: number; dispensable?: boolean; task_key?: string; step_key?: string };

/** Lê o que importa do resultado da simulação (PricingResult do servidor). */
export function chargeSummaryOf(pricing: any) {
  const split = pricing?.split ?? {};
  const cs = split.commercial_summary ?? null;
  const fe = split.first_execution ?? { has_steps: false, applies: true, reason: NO_FIRST_EXECUTION, steps: [] };
  const disp = split.dispensable ?? { steps: [], renewal_if_dispensed: null, savings_per_cycle: 0, note: "", continuity_mode: "not_allowed" };
  const hasImplementation = !!(fe.has_steps && fe.applies) || (cs?.implementation_steps?.length ?? 0) > 0 || !!split.implementation?.applicable;
  const pending: string[] = pricing?.pending_info ?? [];
  return { cs, fe, disp, hasImplementation, pending, notCharged: (split.not_charged ?? []) as { key: string; reason: string }[], currency: pricing?.currency ?? "R$" };
}

type Kind = "once" | "cycle" | "sum";
const KIND_LABEL: Record<Kind, string> = { once: "Pagamento único", cycle: "Por ciclo", sum: "Pagamento único (na contratação)" };
const KIND_CLS: Record<Kind, string> = {
  once: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  cycle: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  sum: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
};

function Tile({ label, value, hint, testId, kind, tone = "neutral" }: { label: string; value: string; hint?: string; testId: string; kind?: Kind; tone?: "neutral" | "violet" | "emerald" }) {
  const toneCls = tone === "violet" ? "border-violet-200 bg-violet-50/70 dark:border-violet-900/60 dark:bg-violet-950/30" : tone === "emerald" ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60";
  return (
    // Uma linha só: rótulo + tipo + ⓘ (a explicação vai no info) + valor à direita.
    <div className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-xl border px-3 py-2 ${toneCls}`} data-testid={testId}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" data-no-info="">{label}{hint && <span className="field-info" data-help={hint} aria-hidden="true">i</span>}</span>
      {kind && <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${KIND_CLS[kind]}`} data-testid={`${testId}-kind`}>{KIND_LABEL[kind]}</span>}
      {hint && <span className="sr-only">{hint}</span>}
      <strong className="ml-auto text-base text-slate-900 dark:text-slate-100">{value}</strong>
    </div>
  );
}

function StepList({ title, steps, empty, testId, cur, onAdjust }: { title: string; steps: Step[]; empty: string; testId: string; cur: string; /** leva até o campo que forma este valor (horas e valor/hora da etapa) */ onAdjust?: (s: Step) => void }) {
  return (
    <div className="min-w-0" data-testid={testId}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {steps.length === 0 ? <p className="mt-0.5 text-xs text-slate-500">{empty}</p> : (
        <ul className="mt-0.5 space-y-0.5 text-xs text-slate-700 dark:text-slate-200">
          {steps.map((s) => <li key={s.ref} className="flex justify-between gap-2"><span className="min-w-0 truncate">{s.name}{s.dispensable ? <span className="ml-1 rounded bg-sky-100 px-1 text-[10px] font-semibold text-sky-800" title="Dispensável quando o mesmo executor continua">dispensável</span> : null}</span><span className="flex shrink-0 items-center gap-1.5 text-slate-500">{money(s.price, cur)}{onAdjust && s.step_key && <button type="button" onClick={() => onAdjust(s)} data-testid="charge-step-adjust" title="Ir até esta etapa para ver e ajustar as horas e o valor/hora; ao salvar você volta aqui." className="rounded border border-violet-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-50">Ajustar</button>}</span></li>)}
        </ul>
      )}
    </div>
  );
}

/** Cartões: implantação, ciclo recorrente, primeira cobrança, renovação e compra avulsa + as etapas que formam cada valor. */
export function ChargeSummary({ pricing, loading, error, acceptsOneTime = true, onAdjustStep }: { /** leva até a etapa que forma o valor (e volta ao salvar) */ onAdjustStep?: (s: { task_key?: string; step_key?: string; name: string }) => void; pricing: any; loading?: boolean; error?: string | null; /** versão vendida avulsa? (só esconde o cartão de compra avulsa; não muda nenhum valor) */ acceptsOneTime?: boolean }) {
  if (error) return <p role="alert" className="text-xs text-red-600" data-testid="charge-summary-error">Não foi possível calcular a cobrança agora: {error}</p>;
  if (!pricing) return <p className="text-xs text-slate-500" data-testid="charge-summary-loading">{loading ? "Calculando a cobrança…" : "Cadastre as etapas para ver a cobrança estimada."}</p>;
  const { cs, fe, disp, hasImplementation, pending, currency } = chargeSummaryOf(pricing);
  if (!cs) return <p className="text-xs text-slate-500" data-testid="charge-summary-loading">Cobrança indisponível para este modo de preço.</p>;
  const undefinedPrice = pending.length > 0 || cs.first_charge == null;
  return (
    <section className="space-y-2" data-testid="charge-summary" aria-label="Cobrança estimada">
      {undefinedPrice && <p className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-900" data-testid="charge-summary-pending">Preço ainda a definir{pending.length ? `: falta ${pending.join("; ")}` : ""}. Os valores abaixo aparecem quando o preço fecha.</p>}
      <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-300" data-testid="charge-estimate-note">Valores <strong>estimados</strong>: são recalculados automaticamente conforme tarefas, etapas, tempo, especialidades, execução humana ou por IA, qualificação, adicionais e demais regras de preço.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {hasImplementation
          ? <Tile testId="charge-implementation" kind="once" label="Implementação" value={money(cs.implementation_price, currency)} hint="Cobrança única referente às etapas executadas somente na primeira entrega (“Só na primeira execução”)." tone="violet" />
          : <Tile testId="charge-implementation" label="Implementação" value="—" hint={NO_FIRST_EXECUTION} />}
        <Tile testId="charge-first-cycle" kind="cycle" label="Recorrente" value={money(cs.first_cycle_recurring_price, currency)} hint="Valor cobrado em cada novo ciclo da assinatura." />
        <Tile testId="charge-first" kind="sum" label="Primeira cobrança" value={money(cs.first_charge, currency)} hint="Soma da implementação com o primeiro ciclo recorrente (mais variações e adicionais aplicáveis)." tone="emerald" />
        <Tile testId="charge-renewal" kind="cycle" label="Renovação mensal" value={money(cs.renewal, currency)} hint="Cobrada a cada ciclo seguinte: só o recorrente, nunca a implementação." />
        {acceptsOneTime && <Tile testId="charge-avulso" kind="once" label="Compra avulsa" value={money(cs.avulso, currency)} hint="Valor de uma única entrega, sem renovação automática." />}
      </div>
      <details className="rounded-lg border border-slate-200 bg-white/70 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/40" data-testid="charge-steps-details">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Quais etapas compõem cada valor</summary>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <StepList testId="charge-steps-implementation" title="Implementação · pagamento único (só na 1ª execução)" steps={cs.implementation_steps ?? []} empty={NO_FIRST_EXECUTION} cur={currency} onAdjust={onAdjustStep} />
          <StepList testId="charge-steps-recurring" title="Recorrente · por ciclo" steps={cs.recurring_steps ?? []} empty="Nenhuma etapa recorrente com horas." cur={currency} onAdjust={onAdjustStep} />
        </div>
      </details>
      {fe.has_steps && !fe.applies && <p className="text-[11px] text-slate-600" data-testid="charge-first-off">{fe.reason}</p>}
      {(disp.steps?.length ?? 0) > 0 && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-900" data-testid="charge-dispensable">
          <strong>Se o mesmo executor continuar no ciclo seguinte</strong>, estas etapas são dispensadas: {(disp.steps as Step[]).map((s) => s.name).join(", ")}. A renovação cai para <strong>{money(disp.renewal_if_dispensed, currency)}</strong> (economia de {money(disp.savings_per_cycle, currency)}); o valor é abatido da próxima fatura.
        </p>
      )}
      {disp.note && (disp.steps?.length ?? 0) === 0 && /Há etapas dispensáveis/.test(disp.note) && <p className="text-[11px] text-amber-800" data-testid="charge-dispensable-off">{disp.note}</p>}
    </section>
  );
}

/** Memória de cálculo da cobrança, separando implantação e recorrência (para o administrador conferir). */
export function ChargeMemory({ pricing }: { pricing: any }) {
  if (!pricing?.split) return null;
  const split = pricing.split;
  const { cs, fe, hasImplementation, currency } = chargeSummaryOf(pricing);
  const row = (label: string, value: string, testId?: string) => <div className="flex justify-between gap-3" data-testid={testId}><span className="text-slate-500">{label}</span><span className="font-medium">{value}</span></div>;
  return (
    <div className="space-y-2 text-xs" data-testid="charge-memory">
      <div className="space-y-1">
        <p className="font-semibold text-slate-700 dark:text-slate-200">Implantação/primeira execução</p>
        {hasImplementation ? (
          <>
            {row("Custo das etapas + qualificação", money(split.implementation?.cost, currency), "memory-impl-cost")}
            {(split.implementation?.taxes_and_margins ?? []).map((l: any, i: number) => <div key={i}>{row(l.label, money(l.amount, currency))}</div>)}
            {row("Preço da implantação", money(split.implementation?.price, currency), "memory-impl-price")}
          </>
        ) : <p className="text-slate-500">{NO_FIRST_EXECUTION}</p>}
        {(split.one_time_items ?? []).length > 0 && (split.one_time_items as any[]).map((it, i) => <div key={i}>{row(`Cobrança única: ${it.label}`, money(it.price, currency))}</div>)}
      </div>
      <div className="space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
        <p className="font-semibold text-slate-700 dark:text-slate-200">Ciclo recorrente</p>
        {row("Custo das etapas recorrentes + qualificação", money(split.recurring?.cost, currency), "memory-rec-cost")}
        {row("Preço do ciclo recorrente", money(split.recurring?.price, currency), "memory-rec-price")}
      </div>
      <div className="space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
        {row("Primeira cobrança (implantação + 1º ciclo)", money(cs?.first_charge, currency), "memory-first")}
        {row("Renovação (só o recorrente)", money(cs?.renewal, currency), "memory-renewal")}
        {row("Compra avulsa (sem renovação)", money(cs?.avulso, currency), "memory-avulso")}
      </div>
      {fe.has_steps && !fe.applies && <p className="text-slate-600">{fe.reason}</p>}
      {(split.not_charged ?? []).length > 0 && (
        <ul className="list-disc pl-4 text-slate-500" data-testid="memory-not-charged">{(split.not_charged as any[]).map((n, i) => <li key={i}>{n.key}: {n.reason}</li>)}</ul>
      )}
    </div>
  );
}

/** Carrega a simulação com a seleção PADRÃO do produto (as opções padrão de cada variação) e mostra o resumo da cobrança. */
export function ChargeSummaryLoader({ version, refreshKey }: { version: any; refreshKey?: string }) {
  const [pricing, setPricing] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    const opts: string[] = [];
    for (const va of version?.variations ?? []) { const d = (va.options ?? []).find((o: any) => o.is_default) ?? (va.options ?? [])[0]; if (d) opts.push(d.key); }
    const addons = (version?.addons ?? []).filter((a: any) => a.is_default_selected).map((a: any) => a.key);
    apiClient.simulateCatalog2(version.id, { variation_option_keys: opts, addon_keys: addons, quantity: 1, answers: {} })
      .then((r: any) => { if (!cancelled) setPricing(r.pricing); })
      .catch((e: any) => { if (!cancelled) setErr(e?.message ?? "erro desconhecido"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [version?.id, refreshKey]);
  return <ChargeSummary pricing={pricing} loading={loading} error={err} acceptsOneTime={version?.accepts_one_time !== false} />;
}
