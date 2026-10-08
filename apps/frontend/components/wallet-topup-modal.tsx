"use client";

// Adicionar crédito à carteira (cartão ou Pix). Fala só com /api/wallet-topup; qual gateway cobra (fake de teste, Mercado Pago, Asaas,
// PagBank, Stripe…) é decisão do backend — esta tela não muda quando o gateway trocar. O número do cartão não é guardado: o backend só usa os 4 últimos dígitos.

import { useEffect, useState } from "react";
import { Loader2, CreditCard, QrCode, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const brl = (n: number) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

/** Converte "50", "50,00" ou "1.250,50" em número; inválido vira NaN. */
export function parseAmount(raw: string): number {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : NaN;
}

export function WalletTopupModal({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  const [summary, setSummary] = useState<any>(null);
  const [method, setMethod] = useState<"card" | "pix">("card");
  const [amount, setAmount] = useState("50,00");
  const [card, setCard] = useState({ number: "", holder: "", exp: "", cvv: "" });
  const [pix, setPix] = useState<{ transactionId: string; copyPaste: string } | null>(null);
  // Gateway real: a cobrança é paga fora da Allka (Pix copia e cola / página segura do cartão); aqui só acompanhamos até confirmar.
  const [hostedIntent, setHostedIntent] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null); setPix(null); setHostedIntent(null);
    apiClient.getWalletTopupSummary().then(setSummary).catch(() => setSummary(null));
  }, [open]);

  useEffect(() => {
    if (!open || !hostedIntent || hostedIntent.status !== "pending") return;
    const t = window.setInterval(async () => {
      try {
        const r = await apiClient.getWalletTopupIntent(hostedIntent.id);
        if (r.status !== "pending") {
          setHostedIntent(r);
          setMsg(r.status === "paid" ? { ok: true, text: `Pagamento confirmado! Novo saldo: ${brl(r.balance_brl)}.` } : { ok: false, text: "O pagamento não foi concluído. Gere uma nova cobrança." });
          setSummary(await apiClient.getWalletTopupSummary().catch(() => null));
          onDone?.();
        }
      } catch { /* tenta de novo no próximo ciclo */ }
    }, 4000);
    return () => window.clearInterval(t);
  }, [open, hostedIntent, onDone]);

  const value = parseAmount(amount);
  const amountOk = Number.isFinite(value) && value >= (summary?.min_brl ?? 5) && value <= (summary?.max_brl ?? 5000);

  async function run(fn: () => Promise<any>, okText: (r: any) => string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fn();
      setMsg({ ok: true, text: okText(r) });
      setSummary(await apiClient.getWalletTopupSummary().catch(() => summary));
      onDone?.();
      return r;
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? "Não foi possível concluir o pagamento." });
    } finally { setBusy(false); }
  }

  const payCard = () => run(() => apiClient.topupWalletByCard({ amount: value, card_number: card.number, holder: card.holder }), (r) => `Pagamento aprovado! Novo saldo: ${brl(r.balance_brl)}.`);
  const makePix = async () => {
    const r = await run(() => apiClient.createWalletPix({ amount: value }), () => "Código Pix gerado. Pague pelo app do seu banco.");
    if (r) setPix({ transactionId: r.transactionId, copyPaste: r.copyPaste });
  };
  const simulatePix = () => run(() => apiClient.confirmWalletPixSandbox({ transaction_id: pix!.transactionId }), (r) => `Pix recebido! Novo saldo: ${brl(r.balance_brl)}.`).then(() => setPix(null));

  const startHosted = async (m: "pix" | "card") => {
    const r = await run(() => apiClient.startWalletTopup({ amount: value, method: m }), () => (m === "pix" ? "Código Pix gerado. Pague pelo app do seu banco; confirmamos sozinhos." : "Abrimos a página segura do cartão numa nova aba. Volte aqui depois de pagar."));
    if (r) { setHostedIntent(r); if (m === "card" && r.redirect_url) window.open(r.redirect_url, "_blank", "noopener"); }
  };

  const cardOk = card.number.replace(/\D/g, "").length >= 12 && card.holder.trim().length > 1;
  const input = "w-full rounded border border-neutral-300 px-2 py-1.5 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar crédito</DialogTitle>
          <DialogDescription>Saldo atual: <strong>{brl(summary?.balance_brl ?? 0)}</strong>. O crédito é usado em alterações por IA e outros serviços.</DialogDescription>
        </DialogHeader>

        {summary?.is_sandbox && (
          <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            Ambiente de teste: nenhum dinheiro real é cobrado. Cartão com final <b>0002</b> simula recusa; qualquer outro é aprovado.
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Valor (R$)</label>
          <input className={input} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          {!amountOk && <p className="mt-1 text-xs text-red-600">Informe um valor entre {brl(summary?.min_brl ?? 5)} e {brl(summary?.max_brl ?? 5000)}.</p>}
        </div>

        {summary?.hosted ? (
          <div className="space-y-2">
            {hostedIntent ? (
              <div className="space-y-2">
                {hostedIntent.pix_copy_paste && hostedIntent.status === "pending" && (
                  <>
                    <p className="text-xs text-neutral-600">Copie o código e pague no app do banco:</p>
                    <div className="flex items-center gap-2 rounded border border-neutral-300 bg-neutral-50 p-2">
                      <code className="min-w-0 flex-1 break-all text-[11px]">{hostedIntent.pix_copy_paste}</code>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void navigator.clipboard?.writeText(hostedIntent.pix_copy_paste)}><Copy className="h-3.5 w-3.5" /></Button>
                    </div>
                  </>
                )}
                {hostedIntent.redirect_url && hostedIntent.status === "pending" && <a className="text-xs font-semibold text-violet-700 underline" href={hostedIntent.redirect_url} target="_blank" rel="noopener noreferrer">Abrir a página de pagamento de novo</a>}
                {hostedIntent.status === "pending" && <p className="flex items-center gap-1.5 text-xs text-neutral-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando a confirmação do pagamento…</p>}
                {hostedIntent.status !== "pending" && <Button className="w-full" variant="outline" onClick={() => { setHostedIntent(null); setMsg(null); }}>Fazer outra recarga</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => startHosted("pix")} disabled={busy || !amountOk}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}<QrCode className="h-3.5 w-3.5" /> Pagar com Pix</Button>
                <Button variant="outline" onClick={() => startHosted("card")} disabled={busy || !amountOk}><CreditCard className="h-3.5 w-3.5" /> Pagar com cartão</Button>
              </div>
            )}
          </div>
        ) : (<>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={method === "card" ? "default" : "outline"} onClick={() => { setMethod("card"); setPix(null); }}><CreditCard className="h-3.5 w-3.5" /> Cartão</Button>
          <Button type="button" size="sm" variant={method === "pix" ? "default" : "outline"} onClick={() => setMethod("pix")}><QrCode className="h-3.5 w-3.5" /> Pix</Button>
        </div>

        {method === "card" ? (
          <div className="space-y-2">
            <input className={input} placeholder="Número do cartão" inputMode="numeric" autoComplete="off" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
            <input className={input} placeholder="Nome impresso no cartão" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={input} placeholder="Validade (MM/AA)" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} />
              <input className={input} placeholder="CVV" inputMode="numeric" autoComplete="off" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
            </div>
            <Button className="w-full" onClick={payCard} disabled={busy || !amountOk || !cardOk}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Pagar {amountOk ? brl(value) : ""}
            </Button>
          </div>
        ) : pix ? (
          <div className="space-y-2">
            <p className="text-xs text-neutral-600">Copie o código e pague no app do banco:</p>
            <div className="flex items-center gap-2 rounded border border-neutral-300 bg-neutral-50 p-2">
              <code className="min-w-0 flex-1 break-all text-[11px]">{pix.copyPaste}</code>
              <Button type="button" size="sm" variant="ghost" onClick={() => void navigator.clipboard?.writeText(pix.copyPaste)}><Copy className="h-3.5 w-3.5" /></Button>
            </div>
            {summary?.is_sandbox && <Button className="w-full" variant="outline" onClick={simulatePix} disabled={busy}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Simular pagamento do Pix (teste)</Button>}
          </div>
        ) : (
          <Button className="w-full" onClick={makePix} disabled={busy || !amountOk}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Gerar código Pix</Button>
        )}
        </>)}

        {msg && (
          <p className={`flex items-center gap-1.5 text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>
            {msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />} {msg.text}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
