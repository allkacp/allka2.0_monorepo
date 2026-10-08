"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

// P-11 (07/10): quantas alterações por IA o cliente faz de graça em cada contratação deste produto. Vazio = vale a regra global (Configurações).
// Depois das grátis, cada alteração é cobrada do saldo da carteira do cliente.
export function parseFreeChanges(raw: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d+$/.test(t)) return { ok: false, error: "Use um número inteiro (0 ou mais)." };
  const n = Number(t);
  return n > 100 ? { ok: false, error: "O máximo é 100." } : { ok: true, value: n };
}

export function AiFreeChangesCard({ product, readOnly }: { product: { id: string; ai_free_changes?: number | null } | null; readOnly?: boolean }) {
  const [text, setText] = useState(product?.ai_free_changes == null ? "" : String(product.ai_free_changes));
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const save = async () => {
    if (!product) return;
    const p = parseFreeChanges(text);
    if (p.ok === false) { setMsg({ tone: "err", text: p.error }); return; }
    try { await apiClient.setCatalog2ProductAiFreeChanges(product.id, p.value); setMsg({ tone: "ok", text: p.value == null ? "Usando a regra global." : "Salvo." }); }
    catch (e: any) { setMsg({ tone: "err", text: e?.message ?? "Não foi possível salvar." }); }
  };
  return (
    <div className="rounded-md border bg-card p-3 text-sm" data-testid="ai-free-changes">
      <label className="block font-medium" title="Quantas alterações por IA o cliente faz sem pagar em cada contratação deste produto. Deixe vazio para usar a regra global (Configurações > Precificação das alterações por IA). Depois das grátis, cada alteração é cobrada do saldo da carteira.">
        Alterações por IA grátis neste produto
        <input aria-label="Alterações por IA grátis" disabled={readOnly || !product} inputMode="numeric" className="ml-2 h-8 w-24 rounded-md border bg-background px-2" placeholder="global" value={text} onChange={(e) => { setText(e.target.value); setMsg(null); }} onBlur={() => void save()} />
      </label>
      <p className="mt-1 text-xs text-muted-foreground">Vazio = regra global. Depois das grátis, cada alteração é cobrada do saldo da carteira do cliente.</p>
      {msg && <p role="status" className={`mt-1 text-xs ${msg.tone === "ok" ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
