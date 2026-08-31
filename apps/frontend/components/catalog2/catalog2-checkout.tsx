"use client";

// Checkout do novo catálogo para o CLIENTE (sprint de produtos, bloco 6/6).
// Componente único, reusado por company/agency via wrappers finos — mesmo
// padrão de catalog2-store.tsx. Servidor sempre recalcula/revalida; preço e
// prazo mostrados aqui vêm literalmente das cotações, nunca calculados no
// navegador.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type Portal = "company" | "agency";

function money(v: number | null | undefined, currency = "BRL") {
  if (v == null) return "A definir";
  return `${currency} ${Number(v).toFixed(2)}`;
}

type Step = "review" | "quoting" | "confirm" | "result";

export function Catalog2Checkout({ portal }: { portal: Portal }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("review");
  const [cart, setCart] = useState<{ items: any[]; count: number; needs_revalidation: boolean } | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [result, setResult] = useState<{ project: any; project_products: any[] } | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const actionIdRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    apiClient.getClientCatalog2Cart().then(setCart).catch((e: any) => setError(e?.message ?? "Não foi possível carregar a cesta."));
  }, []);

  const generateQuotes = useCallback(async () => {
    if (!cart) return;
    if (cart.items.length === 0) {
      setError("Sua cesta está vazia.");
      return;
    }
    if (cart.needs_revalidation) {
      setError("Alguns itens da cesta mudaram — volte à cesta e revise antes de continuar.");
      return;
    }
    setBusy(true);
    setError(null);
    setStep("quoting");
    try {
      const created: any[] = [];
      for (const item of cart.items) {
        const q = await apiClient.createClientCatalog2Quote(item.product_id, item.selection);
        created.push(q);
      }
      setQuotes(created);
      setStep("confirm");
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível gerar a cotação.");
      setStep("review");
    } finally {
      setBusy(false);
    }
  }, [cart]);

  const confirmOrder = useCallback(async () => {
    if (!acceptedTerms || quotes.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const r = await apiClient.checkoutCatalog2({
        quote_ids: quotes.map((q) => q.id),
        checkout_client_action_id: actionIdRef.current,
      });
      setResult(r);
      setStep("result");
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível confirmar o pedido.");
    } finally {
      setBusy(false);
    }
  }, [acceptedTerms, quotes]);

  const simulatePayment = useCallback(async () => {
    if (!result) return;
    setPaying(true);
    setError(null);
    try {
      await apiClient.fakeSandboxCheckout({ project_id: result.project.id, amount: 0 });
      setPaid(true);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível confirmar o pagamento simulado.");
    } finally {
      setPaying(false);
    }
  }, [result]);

  const totalPrice = quotes.reduce((sum, q) => sum + (q.commercial_price ?? 0), 0);
  const maxDeadline = quotes.reduce((max, q) => Math.max(max, q.commercial_deadline_days ?? 0), 0);
  const currency = quotes[0]?.currency ?? "BRL";
  const projectListPath = portal === "agency" ? "/agency/projetos" : "/company/projetos";

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/${portal}/catalog2`)}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Button>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Finalizar pedido</h1>
      </div>

      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {step === "review" && (
        <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">1. Revisão da cesta</h2>
          {!cart ? (
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          ) : cart.items.length === 0 ? (
            <p className="text-sm text-neutral-500">Sua cesta está vazia.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {cart.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 dark:border-neutral-800">
                  <span>{it.name} (qtd {it.quantity})</span>
                  <span>{it.pricing ? money(it.pricing.commercial_price, it.pricing.currency) : "recalcular"}</span>
                </li>
              ))}
            </ul>
          )}
          {cart?.needs_revalidation && (
            <p className="rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700">Alguns itens mudaram — volte à cesta e revise antes de continuar.</p>
          )}
          <Button size="sm" disabled={busy || !cart || cart.items.length === 0 || cart.needs_revalidation} onClick={generateQuotes}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Gerar cotação e continuar
          </Button>
        </div>
      )}

      {step === "quoting" && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <Loader2 className="h-4 w-4 animate-spin" /> Gerando cotação no servidor…
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">2. Valores e prazo (calculados pelo servidor)</h2>
          <div className="rounded bg-neutral-50 p-3 text-sm dark:bg-neutral-800/50">
            <div className="flex justify-between"><span>Preço total</span><strong>{money(totalPrice, currency)}</strong></div>
            <div className="flex justify-between text-neutral-500"><span>Prazo comercial (maior item)</span><span>{maxDeadline > 0 ? `${maxDeadline} dia(s)` : "A definir"}</span></div>
          </div>
          <h2 className="text-sm font-semibold">3. Termos e confirmação</h2>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            Li e concordo com os termos de contratação do novo catálogo.
          </label>
          <Button size="sm" disabled={!acceptedTerms || busy} onClick={confirmOrder}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Confirmar pedido
          </Button>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {!paid ? "Pedido" : "Projeto"} {result.project.project_code} {!paid ? "confirmado" : "ativo"}
          </h2>
          <p className="text-xs text-neutral-500">Número de acompanhamento: <strong>{result.project.project_code}</strong></p>
          {!paid ? (
            <>
              <p className="text-sm text-neutral-500">
                Este é o seu <strong>pedido</strong> — ele ainda não virou projeto de execução. Confirme o pagamento simulado (ambiente local) para ativá-lo.
              </p>
              <Button size="sm" disabled={paying} onClick={simulatePayment}>
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Simular pagamento
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-emerald-700">Pagamento confirmado — seu pedido virou <strong>projeto</strong> e as tarefas já foram geradas a partir da versão contratada.</p>
              <Button size="sm" variant="outline" onClick={() => navigate(projectListPath)}>
                Ver projeto
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
