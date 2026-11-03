import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/price-with-allkoins";
import { STANDARD_SHELL_PANEL_CLASS } from "@/components/standard-page-shell";

// Fora do portal logado a variável do tema não existe: sem a reserva, o cabeçalho ficava branco sobre branco.
const HEADER_GRADIENT = "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))";
const PERIOD_LABEL: Record<string, string> = { mensal: "Mensal", bimestral: "Bimestral", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };

/** Resumo do que foi contratado em cada linha — só informação comercial (sem custo, comissão ou acessos). */
function ItemDetails({ item }: { item: any }) {
  const quantity = Number(item.quantity ?? 1);
  const groups: number[] = Array.isArray(item.delivery_groups) ? item.delivery_groups : [];
  const months = Number(item.period_months ?? 1);
  const modality = !item.modality || item.modality === "avulso"
    ? "Avulso — pagamento único, sem renovação automática."
    : item.modality === "mensal" && months === 1
      ? "Assinatura mensal — este pagamento cobre o primeiro mês; a assinatura renova a cada mês."
      : `Período ${(PERIOD_LABEL[item.modality] ?? item.modality).toLowerCase()} — este pagamento cobre ${months} meses.`;
  const delivery = quantity > 1
    ? groups.length > 1 ? ` · ${groups.length} entregas separadas (${groups.join(" + ")})` : " · entregues juntas"
    : "";
  return <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
    <p>Quantidade: {quantity}{delivery}</p>
    <p>{modality}</p>
    {Array.isArray(item.options) && item.options.length > 0 && <p>Opções contratadas: {item.options.join(" · ")}</p>}
  </div>;
}

export default function AgencyClientPayment() {
  const { token = "" } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState("4242");
  const base = (import.meta as any).env?.VITE_API_URL || "/api";
  async function request(pay = false) {
    const response = await fetch(`${base}/public/agency-payment/${encodeURIComponent(token)}${pay ? "/pay-sandbox" : ""}`, {
      method: pay ? "POST" : "GET", headers: { "Content-Type": "application/json" },
      ...(pay ? { body: JSON.stringify({ card_last_digits: card }) } : {}),
      credentials: "omit", referrerPolicy: "no-referrer",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível consultar o pagamento.");
    return data;
  }
  useEffect(() => { let active = true; request().then((data) => { if (active) setOrder(data); }).catch((e) => { if (active) setError(e.message); }); return () => { active = false; }; }, [token]);
  async function pay() {
    setBusy(true); setError("");
    try { await request(true); setOrder(await request()); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="min-h-dvh bg-background p-4 text-foreground sm:p-8" style={{ fontFamily: "inherit" }}>
    <div className={`${STANDARD_SHELL_PANEL_CLASS} mx-auto !h-auto max-w-xl !p-0`}>
      <header className="flex items-center gap-3 rounded-t-2xl bg-primary p-4 text-white" style={{ background: HEADER_GRADIENT }}>
        <CreditCard className="h-5 w-5" /><div><h1 className="text-base font-semibold">Pagamento da contratação</h1><p className="text-xs opacity-80">Allka · {order?.code || "Consulta do pedido"}</p></div>
      </header>
      <div className="space-y-4 p-5">
        {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {!order && !error && <Loader2 aria-label="Carregando pedido" className="h-5 w-5 animate-spin" />}
        {order && <>
          <ul className="divide-y divide-border text-sm">{order.items.map((item: any, index: number) => <li key={index} className="py-2"><div className="flex justify-between gap-3"><span className="font-medium">{item.name}</span><Money value={item.total} /></div><ItemDetails item={item} /></li>)}</ul>
          <div className="flex justify-between rounded-xl bg-muted p-3 font-semibold"><span>Total a pagar</span><Money value={order.total} /></div>
          {order.paid ? <div role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5" />Pagamento confirmado. A agência dará continuidade ao atendimento.</div>
            : order.sandbox ? <section className="space-y-3">
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Teste local: nenhum valor real será cobrado. Use somente os cartões de simulação abaixo.</p>
              <label className="block text-xs font-medium">Cartão de teste<select aria-label="Cartão de teste" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={card} onChange={(e) => setCard(e.target.value)}>
                <option value="4242">Final 4242 — aprovado</option><option value="0002">Final 0002 — recusado por saldo</option><option value="0069">Final 0069 — expirado</option><option value="0127">Final 0127 — CVV inválido</option>
              </select></label>
              <Button disabled={busy} onClick={pay} className="w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Simular pagamento</Button>
            </section> : <p className="text-sm text-muted-foreground">Pagamento real ainda não habilitado. Entre em contato com a agência.</p>}
        </>}
      </div>
    </div>
  </main>;
}
