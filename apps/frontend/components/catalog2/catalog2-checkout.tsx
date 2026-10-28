"use client";

// Checkout do novo catálogo para o CLIENTE (sprint de produtos, bloco 6/6).
// Componente único, reusado por company/agency via wrappers finos — mesmo
// padrão de catalog2-store.tsx. Servidor sempre recalcula/revalida; preço e
// prazo mostrados aqui vêm literalmente das cotações, nunca calculados no
// navegador.

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@/hooks/use-navigate";
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ProjectCreateNewPanel } from "@/components/project-create-new-panel";
import { FramedPanel } from "@/components/framed-panel";
import { useAgencia } from "@/contexts/agencia-context";
import { useEmpresa } from "@/contexts/empresa-context";
import { Money, PriceWithAllkoins, fmtPriceBRL } from "@/components/price-with-allkoins";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIallkaContext } from "@/contexts/iallka-context";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";
import { cn } from "@/lib/utils";

type Portal = "company" | "agency";

function money(v: number | null | undefined, _currency = "BRL") {
  if (v == null) return "A definir";
  return fmtPriceBRL(v);
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
  const [payer, setPayer] = useState<"agency" | "client">("agency");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [commissionMode, setCommissionMode] = useState<"total" | "per_product">("total");
  const [itemCommissions, setItemCommissions] = useState<Record<string, string>>({});
  const rate = Number(commissionPercent);
  const itemRate = (id: string) => itemCommissions[id] ?? "0";
  const invalidPercent = (value: string) => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100;
  const invalidCommission = payer === "client" && (commissionMode === "total" ? invalidPercent(commissionPercent) : quotes.some(q => invalidPercent(itemRate(q.id))));
  // O pedido sempre entra em um PROJETO: o cliente escolhe um que já tem ou cria um antes (contratar sem projeto não existe).
  const [projects, setProjects] = useState<{ id: string; title: string; project_code: string | null }[] | null>(null);
  const [projectId, setProjectId] = useState("");
  const loadProjects = useCallback(() => {
    setProjects(null);
    apiClient.getCatalog2EligibleProjects().then((r) => { setProjects(r.data); setProjectId((cur) => (r.data.some((p) => p.id === cur) ? cur : r.data.length === 1 ? r.data[0].id : "")); }).catch(() => setProjects([]));
  }, []);
  useEffect(() => { if (step === "confirm") loadProjects(); }, [step, loadProjects]);
  // Criar o projeto AQUI MESMO, sem sair do checkout (sair obrigava a refazer tudo): abre o painel completo de "Novo Projeto"
  // (nome, cliente, datas, orçamento, descrição…) por cima desta tela; ao criar, o projeto novo já vem selecionado.
  const agencia = useAgencia();
  const empresa = useEmpresa();
  const [showCreate, setShowCreate] = useState(false);
  const onProjectCreated = useCallback(async (project: any) => {
    if (!project?.id) return;
    const saved = { id: String(project.id), title: project.title || project.name || "Projeto criado", project_code: project.project_code ?? null };
    setShowCreate(false);
    setProjects(prev => [saved, ...(prev ?? []).filter(p => p.id !== saved.id)]);
    setProjectId(saved.id);
    try {
      const list = await apiClient.getCatalog2EligibleProjects();
      setProjects(list.data.some(x => x.id === saved.id) ? list.data : [saved, ...list.data]);
    } catch {
      // Já foi salvo: falha ao atualizar a lista não deve perder a seleção
      // nem induzir o usuário a criar o mesmo projeto novamente.
    }
  }, []);
  const createButton = (label: string, outline = false) => (
    <Button size="sm" variant={outline ? "outline" : "default"} onClick={() => setShowCreate(true)} data-testid="checkout-open-new-project">{label}</Button>
  );
  const [result, setResult] = useState<{ project: any; project_products: any[]; payment_link_path?: string | null } | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>(SANDBOX_CARDS[0].id);
  const actionIdRef = useRef<string>(crypto.randomUUID());

  // Retomar o pagamento de um pedido já confirmado (?pedido=<id>, vindo de
  // "Pagar" na lista de projetos): sem isso, quem saía desta tela antes de
  // pagar não tinha mais como pagar o pedido.
  const pedidoId = new URLSearchParams(window.location.search).get("pedido");

  useEffect(() => {
    if (pedidoId) {
      apiClient
        .getProject(pedidoId)
        .then(async (project: any) => {
          if (project?.status === "draft") {
            const clientOrder = portal === "agency" && project.products?.some((p: any) => p.pagador_snapshot === "CLIENTE");
            const link = clientOrder ? await apiClient.agencyPaymentLink(project.id) : null;
            setResult({ project, project_products: [], payment_link_path: link?.path });
            setStep("result");
          } else {
            setError("Este pedido já foi pago ou não está mais aguardando pagamento.");
          }
        })
        .catch((e: any) => setError(e?.message ?? "Não foi possível carregar o pedido."));
      return;
    }
    apiClient.getClientCatalog2Cart().then(setCart).catch((e: any) => setError(e?.message ?? "Não foi possível carregar a cesta."));
  }, [pedidoId]);

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
        const q = await apiClient.createClientCatalog2Quote(item.product_id, item.selection, item.period ?? null);
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
    if (invalidCommission) { setError("Informe uma comissão de 0% a 100%."); return; }
    if (!projectId) { setError("Para contratar, primeiro escolha um projeto ou crie um novo."); return; }
    setBusy(true);
    setError(null);
    try {
      const r = await apiClient.checkoutCatalog2({
        quote_ids: quotes.map((q) => q.id),
        checkout_client_action_id: actionIdRef.current,
        project_id: projectId,
        payer: portal === "agency" ? payer : "agency",
        commission_percent: portal === "agency" && payer === "client" && commissionMode === "total" ? rate : 0,
        commission_mode: portal === "agency" && payer === "client" ? commissionMode : "total",
        ...(portal === "agency" && payer === "client" && commissionMode === "per_product" ? {
          item_commissions: quotes.map(q => ({ quote_id: q.id, percent: Number(itemCommissions[q.id] ?? "0") })),
        } : {}),
      });
      setResult(r);
      setStep("result");
      // Os itens já viraram pedido: tira da cesta (só os que entraram neste
      // pedido). Antes ficavam lá e o cliente podia contratar tudo de novo
      // sem perceber. Falha aqui não desfaz o pedido.
      await Promise.all(
        (cart?.items ?? []).map((item) =>
          apiClient.removeClientCatalog2CartItem(item.id).catch(() => undefined),
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível confirmar o pedido.");
    } finally {
      setBusy(false);
    }
  }, [acceptedTerms, quotes, cart, projectId, portal, payer, rate, commissionMode, itemCommissions, invalidCommission]);

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
  const commission = portal === "agency" && payer === "client" && !invalidCommission
    ? quotes.reduce((sum, q) => sum + Math.round(((q.commercial_price ?? 0) * (commissionMode === "total" ? rate : Number(itemRate(q.id))) / 100 + Number.EPSILON) * 100) / 100, 0) : 0;
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
                  <span>{it.pricing ? <Money value={it.pricing.commercial_price} /> : "recalcular"}</span>
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
            <div className="flex justify-between"><span>Preço total</span><strong><Money value={totalPrice} /></strong></div>
            <div className="flex justify-between text-neutral-500"><span>Prazo comercial (maior item)</span><span>{maxDeadline > 0 ? `${maxDeadline} dia(s)` : "A definir"}</span></div>
          </div>
          {portal === "agency" && <section className="space-y-2 rounded-xl border border-border p-3" aria-label="Pagamento e comissão">
            <h2 className="text-sm font-semibold">Quem vai pagar?</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={payer === "agency" ? "default" : "outline"} aria-pressed={payer === "agency"} onClick={() => setPayer("agency")}>A agência paga</Button>
              <Button size="sm" variant={payer === "client" ? "default" : "outline"} aria-pressed={payer === "client"} onClick={() => setPayer("client")}>Cliente final paga por link</Button>
            </div>
            {payer === "client" && <div className="space-y-2">
              <div className="flex flex-wrap gap-2" aria-label="Aplicar comissão">
                <Button size="sm" className={commissionMode === "total" ? "btn-brand" : ""} variant={commissionMode === "total" ? "default" : "outline"} aria-pressed={commissionMode === "total"} onClick={() => setCommissionMode("total")}>Sobre o total</Button>
                <Button size="sm" className={commissionMode === "per_product" ? "btn-brand" : ""} variant={commissionMode === "per_product" ? "default" : "outline"} aria-pressed={commissionMode === "per_product"} onClick={() => setCommissionMode("per_product")}>Por produto</Button>
              </div>
              {commissionMode === "total" ? <label className="block text-xs font-medium">Comissão da agência (%)<Input aria-label="Comissão da agência (%)" type="number" min="0" max="100" step="0.01" className="mt-1 h-9 max-w-40" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} /></label> :
                <div className="divide-y divide-border">
                  {quotes.map((q, index) => {
                    const item = cart?.items[index];
                    const name = item?.name || item?.product?.title || item?.product_name || `Produto ${index + 1}`;
                    const quantity = q.quantity ?? item?.selection?.quantity ?? item?.quantity ?? 1;
                    const base = q.commercial_price ?? 0;
                    const percent = itemRate(q.id);
                    const extra = invalidPercent(percent) ? 0 : Math.round((base * Number(percent) / 100 + Number.EPSILON) * 100) / 100;
                    return <div key={q.id} className="grid grid-cols-[minmax(0,1fr)_90px] items-center gap-2 py-2" data-testid={`commission-item-${q.id}`}>
                      <div className="min-w-0"><p className="break-words text-xs font-medium">{name}</p><p className="text-[11px] text-muted-foreground">{quantity} unidade(s) · Base: <Money value={base} /></p><p className="text-[11px] text-muted-foreground">Comissão: <Money value={extra} /> · Cliente: <Money value={base + extra} /></p></div>
                      <label className="text-xs font-medium">Comissão (%)<Input aria-label={`Comissão de ${name} (%)`} type="number" min="0" max="100" step="0.01" className="mt-1 h-9" value={percent} onChange={e => setItemCommissions(prev => ({ ...prev, [q.id]: e.target.value }))} /></label>
                    </div>;
                  })}
                </div>}
              <p className="text-xs text-muted-foreground">A porcentagem é acrescentada ao preço. Por produto, vale para todas as unidades daquela linha; não é necessário informar unidade por unidade.</p>
              {invalidCommission && <p role="alert" className="text-xs text-destructive">Informe um percentual de 0 a 100.</p>}
              <div className="flex justify-between text-xs"><span>Sua comissão</span><Money value={commission} /></div>
              <div className="flex justify-between text-sm font-semibold"><span>Total que o cliente verá</span><Money value={totalPrice + commission} /></div>
              <p className="text-xs text-muted-foreground">O cliente vê somente o total. A comissão entra na sua carteira após o pagamento confirmado. Link válido por 24 horas.</p>
            </div>}
          </section>}
          {/* Contratação é rápida: sem painel de conexões aqui. O que cada produto precisa já está explicado na página do produto, e o cliente
              resolve as conexões depois da compra ("Ver conexões do projeto" e o cartão dentro da tarefa) — só a atividade que depende delas espera. */}
          <section className="space-y-2" data-testid="checkout-project">
            <h2 className="text-sm font-semibold">Projeto do pedido</h2>
            {projects === null ? (
              <p className="flex items-center gap-1.5 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Buscando seus projetos…</p>
            ) : projects.length === 0 ? (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert" data-testid="checkout-no-project">
                <p className="font-semibold">Você ainda não tem um projeto para receber este pedido.</p>
                <p className="text-xs">Crie o projeto aqui mesmo, com os dados dele — você não sai desta tela e a contratação continua.</p>
                <div>{createButton("Criar projeto")}</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <select aria-label="Projeto do pedido" className="h-9 w-full rounded-md border border-neutral-300 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Escolha o projeto…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.project_code ? `${p.project_code} · ` : ""}{p.title}</option>)}
                </select>
                <div>{createButton("Criar projeto", true)}</div>
              </div>
            )}
          </section>
          <h2 className="text-sm font-semibold">3. Termos e confirmação</h2>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
            Li e concordo com os termos de contratação do novo catálogo.
          </label>
          <Button size="sm" disabled={!acceptedTerms || !projectId || busy || invalidCommission} onClick={confirmOrder} title={!projectId ? "Escolha ou crie um projeto antes" : undefined}>
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
          {result.payment_link_path && !paid ? (
            <section className="space-y-3" aria-label="Link do cliente">
              <p className="text-sm">Envie este link ao cliente final. As tarefas só ficam disponíveis para lançamento após o pagamento.</p>
              <Input aria-label="Link de pagamento do cliente" readOnly value={`${window.location.origin}${result.payment_link_path}`} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${result.payment_link_path}`).catch(() => setError("Selecione e copie o link no campo acima."))}>Copiar link</Button>
                <Button size="sm" variant="outline" asChild><a href={result.payment_link_path} target="_blank" rel="noreferrer">Abrir página do cliente</a></Button>
                <Button size="sm" variant="outline" onClick={() => navigate(projectListPath)}>Ver pedido</Button>
                <Button size="sm" variant="outline" disabled={paying} onClick={async () => {
                  setPaying(true); setError(null);
                  try { const p = await apiClient.getProject(result.project.id); if (p.status === "in-progress") setPaid(true); else setError("O pedido ainda está aguardando o pagamento do cliente."); }
                  catch (e: any) { setError(e.message || "Não foi possível consultar o pagamento."); }
                  finally { setPaying(false); }
                }}>Consultar pagamento</Button>
              </div>
              <p className="text-xs text-muted-foreground">Ambiente local: pagamento simulado, sem cobrança real. Não lance as tarefas neste teste.</p>
            </section>
          ) : !paid ? (
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
              <p className="text-sm text-emerald-700">Pagamento confirmado — tarefas disponíveis para lançamento, ainda sem execução ou distribuição iniciada.</p>
              <Button size="sm" variant="outline" onClick={() => navigate(projectListPath)}>
                Ver projeto
              </Button>
              <Button size="sm" onClick={() => navigate(`/${portal}/tarefas`)}>Ver tarefas para lançar</Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/${portal}/conexoes`)}>
                Ver conexões do projeto
              </Button>
            </>
          )}
        </div>
      )}
    </div>
    {showCreate && (
      <FramedPanel open={showCreate} onOpenChange={setShowCreate} title="Criar projeto" testId="checkout-project-panel">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl" data-testid="checkout-project-panel-host">
      <ProjectCreateNewPanel
        open={showCreate}
        projectOnly
        organizationType={portal === "agency" ? "agency" : "company"}
        onOpenChange={setShowCreate}
        onCreate={onProjectCreated}
        allowCompanySelect={false}
        agencyName={portal === "agency" ? agencia.profile?.name : undefined}
        companyName={portal === "agency" ? agencia.profile?.name : empresa.profile?.name ?? ""}
        companyId={portal === "agency" ? agencia.profile?.id ?? undefined : empresa.profile?.id ?? undefined}
      />
      </div>
      </FramedPanel>
    )}
    </div>
  );
}
