"use client";

// Checkout do novo catálogo para o CLIENTE (sprint de produtos, bloco 6/6).
// Componente único, reusado por company/agency via wrappers finos — mesmo
// padrão de catalog2-store.tsx. Servidor sempre recalcula/revalida; preço e
// prazo mostrados aqui vêm literalmente das cotações, nunca calculados no
// navegador.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useIallkaContext } from "@/contexts/iallka-context";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";
import { cn } from "@/lib/utils";

type Portal = "company" | "agency";

function money(v: number | null | undefined, currency = "BRL") {
  if (v == null) return "A definir";
  return `${currency} ${Number(v).toFixed(2)}`;
}

type Step = "review" | "quoting" | "confirm" | "result";

// Cartões fake sandbox — achado do usuário 2026-09-23: "já tinha um cartão
// cadastrado, que a gente usa um cartão fake" (mesma referência de
// checkout-flow.tsx, o checkout do catálogo antigo). Últimos 4 dígitos
// batendo exatamente com a simulação real do gateway
// (apps/backend/src/lib/payment-gateway.ts, DECLINE_BY_LAST_DIGITS) — nunca
// inventado; um cartão aprova, os outros recusam com o motivo real do
// gateway, pra testar os dois caminhos.
const SANDBOX_CARDS = [
  { id: "sandbox-approve", lastDigits: "4242", holder: "TESTE ALLKA", expiry: "12/30", brand: "Visa", outcome: "Aprova" },
  { id: "sandbox-decline-funds", lastDigits: "0002", holder: "TESTE ALLKA", expiry: "12/30", brand: "Visa", outcome: "Recusa — saldo insuficiente" },
  { id: "sandbox-decline-expired", lastDigits: "0069", holder: "TESTE ALLKA", expiry: "12/30", brand: "Visa", outcome: "Recusa — cartão expirado" },
  { id: "sandbox-decline-cvv", lastDigits: "0127", holder: "TESTE ALLKA", expiry: "12/30", brand: "Visa", outcome: "Recusa — CVV inválido" },
];

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
  const [selectedCardId, setSelectedCardId] = useState<string>(SANDBOX_CARDS[0].id);
  const actionIdRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    apiClient.getClientCatalog2Cart().then(setCart).catch((e: any) => setError(e?.message ?? "Não foi possível carregar a cesta."));
  }, []);

  // Contexto pra Aura (Item 9, reunião 2026-09-14, "Atualizar o contexto da
  // Aura") — só envia um id de cotação quando há EXATAMENTE uma (contexto
  // inequívoco); com mais de uma, a Aura explica só a regra geral de
  // proteção de preço, sem apontar uma cotação específica. Revalidado/
  // reautorizado no servidor, nunca confiado só por estar aqui.
  const { setScreenContext: setIallkaScreenContext } = useIallkaContext();
  useEffect(() => {
    setIallkaScreenContext({
      label: "Checkout do Catálogo",
      quoteId: quotes.length === 1 ? quotes[0].id : undefined,
    });
    return () => setIallkaScreenContext(null);
  }, [quotes, setIallkaScreenContext]);

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
    const card = SANDBOX_CARDS.find((c) => c.id === selectedCardId) ?? SANDBOX_CARDS[0];
    setPaying(true);
    setError(null);
    try {
      await apiClient.fakeSandboxCheckout({
        project_id: result.project.id,
        amount: 0,
        card_last_digits: card.lastDigits,
        card_holder: card.holder,
      });
      setPaid(true);
    } catch (e: any) {
      // Cartão de propósito recusado (ex.: "0002") devolve 402 com o motivo
      // REAL do gateway fake (payment-gateway.ts) — apiClient já extrai
      // isso em e.message, nunca um erro genérico. Achado do usuário
      // 2026-09-23: "tem que dar o motivo exato, sempre".
      setError(e?.message ?? "Não foi possível confirmar o pagamento simulado.");
    } finally {
      setPaying(false);
    }
  }, [result, selectedCardId]);

  const totalPrice = quotes.reduce((sum, q) => sum + (q.commercial_price ?? 0), 0);
  const maxDeadline = quotes.reduce((max, q) => Math.max(max, q.commercial_deadline_days ?? 0), 0);
  const currency = quotes[0]?.currency ?? "BRL";
  const projectListPath = portal === "agency" ? "/agency/projetos" : "/company/projetos";

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
    <div className="mx-auto h-full max-w-2xl overflow-y-auto p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3" data-tour-id="catalog2-checkout-header">
        <Button size="sm" variant="ghost" onClick={() => navigate(`/${portal}/catalogo-produtos`)}>
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
              {/* Cartão fake sandbox — achado do usuário 2026-09-23: "já
                  tinha um cartão cadastrado, cartão fake" (mesmo padrão do
                  checkout antigo). Escolher um cartão de recusa testa o
                  caminho de erro de verdade, com o motivo real do gateway. */}
              <div>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">Forma de pagamento (sandbox)</h3>
                <div className="space-y-1.5">
                  {SANDBOX_CARDS.map((card) => {
                    const selected = selectedCardId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedCardId(card.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg border-2 px-3 py-2 text-left text-sm transition-all",
                          selected ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30" : "border-neutral-200 hover:border-violet-300 dark:border-neutral-700",
                        )}
                      >
                        <CreditCard className="h-4 w-4 shrink-0 text-neutral-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{card.brand} •••• {card.lastDigits}</span>
                          <span className="block text-[11px] text-neutral-500">{card.holder} · {card.expiry} · {card.outcome}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
    </div>
  );
}
