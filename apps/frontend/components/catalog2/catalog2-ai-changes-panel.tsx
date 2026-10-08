"use client";

// P-11 (reunião 07/10): o cliente pede alterações por IA nos produtos que contratou. Cada contratação já inclui N alterações grátis
// (configuradas no produto); acabando, ele "contrata mais": cada alteração extra é debitada do saldo da carteira. Preço e saldo vêm
// sempre do backend (/api/ai-changes/quote), nunca calculados aqui.

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Sparkles, Wallet } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { WalletTopupModal } from "@/components/wallet-topup-modal";

export interface AiChangeQuote {
  project_product_id: string; free_total: number; used: number; free_left: number; is_free: boolean;
  price_brl: number; balance_brl: number; enough_balance: boolean; missing_brl: number;
}

export function brl(n: number) {
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
}

/** Texto que diz ao cliente o que vai acontecer ao pedir a próxima alteração. */
export function aiChangeSummary(q: AiChangeQuote): string {
  if (q.is_free) return `Alterações grátis restantes: ${q.free_left} de ${q.free_total}.`;
  return `As ${q.free_total} alterações grátis acabaram. Cada alteração extra custa ${brl(q.price_brl)}, debitado do seu saldo.`;
}

export function Catalog2AiChangesPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topupTop, setTopupTop] = useState(false);
  const [rows, setRows] = useState<Array<{ id: string; name: string; quote: AiChangeQuote | null }>>([]);

  // silent=true recarrega os números sem esconder a tela (senão a mensagem de sucesso e o modal de pagamento sumiriam no meio do uso).
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const products = await apiClient.getProjectProducts({ project_id: projectId });
      const items = ((products as any)?.data ?? products ?? []).filter((p: any) => p.origin === "CATALOG2");
      const quoted = await Promise.all(items.map(async (p: any) => ({
        id: String(p.id), name: String(p.product_name_snapshot ?? "Produto"),
        quote: (await apiClient.quoteAiChange({ project_product_id: String(p.id) }).catch(() => null)) as AiChangeQuote | null,
      })));
      setRows(quoted);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível carregar as alterações por IA.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);
  const reload = useCallback(() => { void load(true); }, [load]);

  if (loading) {
    return <div className="flex items-center gap-2 p-6 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando alterações por IA…</div>;
  }
  const available = rows.filter((r) => r.quote);
  if (!error && available.length === 0) return null; // admin, equipe ou projeto sem itens do novo catálogo: nada a mostrar

  return (
    <section className="space-y-3 px-6 pt-6" data-tour-id="catalog2-ai-changes">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold text-neutral-800">Alterações por IA</h3>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setTopupTop(true)}><Wallet className="h-3.5 w-3.5" /> Adicionar crédito</Button>
      </div>
      <WalletTopupModal open={topupTop} onOpenChange={setTopupTop} onDone={reload} />
      {error && <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}</p>}
      <ul className="space-y-3">
        {available.map((r) => <AiChangeRow key={r.id} id={r.id} name={r.name} quote={r.quote!} onDone={reload} />)}
      </ul>
    </section>
  );
}

function AiChangeRow({ id, name, quote, onDone }: { id: string; name: string; quote: AiChangeQuote; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [topup, setTopup] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiClient.chargeAiChange({ project_product_id: id, note: note.trim() || null });
      setMsg({ ok: true, text: res?.charge?.is_free ? "Alteração registrada (grátis)." : `Alteração contratada: ${brl(quote.price_brl)} debitado do saldo.` });
      setNote("");
      onDone();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? "Não foi possível registrar a alteração." });
    } finally {
      setBusy(false);
    }
  }

  const blocked = !quote.enough_balance;
  return (
    <li className="rounded-lg border border-neutral-200 bg-white p-4 space-y-2">
      <p className="text-sm font-medium text-neutral-800">{name}</p>
      <p className="text-xs text-neutral-600">{aiChangeSummary(quote)}</p>
      {!quote.is_free && (
        <p className="flex items-center gap-1.5 text-xs text-neutral-600"><Wallet className="h-3.5 w-3.5" /> Saldo disponível: {brl(quote.balance_brl)}</p>
      )}
      {blocked && (
        <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          Faltam {brl(quote.missing_brl)} na carteira. Adicione crédito (cartão ou Pix) para contratar mais alterações.{" "}
          <button type="button" className="font-semibold underline" onClick={() => setTopup(true)}>Adicionar crédito</button>
        </p>
      )}
      <WalletTopupModal open={topup} onOpenChange={setTopup} onDone={onDone} />
      <textarea
        className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm" rows={2} maxLength={500}
        placeholder="O que você quer alterar? (opcional)" value={note} onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={submit} disabled={busy || blocked}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {quote.is_free ? "Pedir alteração" : `Contratar mais uma alteração (${brl(quote.price_brl)})`}
        </Button>
        {msg && <span className={`flex items-center gap-1 text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}{msg.text}</span>}
      </div>
    </li>
  );
}
