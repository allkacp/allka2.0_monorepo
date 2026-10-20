"use client";

// Criar uma variação (e as opções dela) sem sair da etapa (19/10): usa as MESMAS rotas do cadastro de variações do produto.
// O texto da etapa que ainda não foi salvo fica intacto: aqui só se grava a variação, nunca a etapa.
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export interface QuickCreate {
  /** Cria a variação e as opções; devolve a chave da nova variação (para já deixar escolhida na regra). */
  createVariation: (spec: { name: string; options: string[]; baseIncluded: boolean }) => Promise<string>;
  /** Acrescenta uma opção a uma variação existente; devolve a chave da opção. */
  createOption: (variationKey: string, label: string) => Promise<string>;
}

export const slugKey = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
/** Chave livre: se já existe, acrescenta -2, -3… */
export function freeKey(base: string, taken: string[]): string {
  const b = slugKey(base) || "item";
  if (!taken.includes(b)) return b;
  let n = 2; while (taken.includes(`${b}-${n}`)) n += 1;
  return `${b}-${n}`;
}

/** Monta as duas operações a partir da versão e do `act` do editor (que recarrega o produto depois). */
export function makeQuickCreate(version: any, act: (fn: () => Promise<unknown>, ok?: string, o?: { rethrow?: boolean }) => Promise<unknown>): QuickCreate {
  return {
    createVariation: async ({ name, options, baseIncluded }) => {
      const taken = (version?.variations ?? []).map((v: any) => v.key as string);
      const key = freeKey(name, taken);
      await act(async () => {
        const v: any = await apiClient.addCatalog2Variation(version.id, { key, name: name.trim(), base_included: baseIncluded });
        const usedKeys: string[] = [];
        let first = true;
        for (const label of options) {
          const ok = freeKey(label, usedKeys); usedKeys.push(ok);
          await apiClient.addCatalog2Option(v.id, { key: ok, label: label.trim(), ...(baseIncluded && first ? { is_default: true } : {}) });
          first = false;
        }
        return v;
      }, "Variação criada.", { rethrow: true });
      return key;
    },
    createOption: async (variationKey, label) => {
      const va = (version?.variations ?? []).find((v: any) => v.key === variationKey);
      if (!va) throw new Error("Variação não encontrada.");
      const key = freeKey(label, (va.options ?? []).map((o: any) => o.key as string));
      await act(() => apiClient.addCatalog2Option(va.id, { key, label: label.trim() }), "Opção adicionada.", { rethrow: true });
      return key;
    },
  };
}

export function QuickVariationDialog({ open, existingNames, onCreate, onClose }: {
  open: boolean; existingNames: string[]; onCreate: QuickCreate["createVariation"]; onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [base, setBase] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const submit = async () => {
    const n = name.trim();
    if (!n) { setErr("Digite o nome da nova variação."); return; }
    if (existingNames.some((x) => x.trim().toLowerCase() === n.toLowerCase())) { setErr("Já existe uma variação com esse nome neste produto. Escolha-a na lista."); return; }
    if (options.length === 0) { setErr("Informe ao menos uma opção (uma por linha)."); return; }
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) { setErr("Há opções repetidas. Use um nome diferente para cada uma."); return; }
    setBusy(true); setErr(null);
    try { await onCreate({ name: n, options, baseIncluded: base }); setName(""); setText(""); setBase(true); onClose(); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível criar a variação. O que você digitou na etapa continua intacto."); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-w-lg" data-testid="quick-variation">
        <DialogTitle>Criar nova variação</DialogTitle>
        <p className="text-xs text-slate-600 dark:text-slate-300">A variação entra no cadastro de variações do produto (a mesma lista de lá) e já fica escolhida nesta condição. O que você preencheu na etapa não é perdido.</p>
        <label className="block space-y-0.5"><span className="text-xs font-semibold">Nome da variação</span>
          <input aria-label="Nome da nova variação" className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm dark:border-slate-600 dark:bg-slate-900" value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} placeholder="Ex.: Plataforma" /></label>
        <label className="block space-y-0.5"><span className="text-xs font-semibold">Opções (uma por linha)</span>
          <textarea aria-label="Opções da nova variação" rows={4} className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900" value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} placeholder={"Google Ads\nMeta Ads\nAmbas"} /></label>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={base} onChange={(e) => setBase(e.target.checked)} /><span><strong>O produto original já inclui esta variação</strong> — a 1ª opção vira o padrão (não soma custo). Desmarcado: todas as opções somam custo.</span></label>
        {err && <p role="alert" className="text-xs font-semibold text-rose-600" data-testid="quick-variation-error">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={busy} onClick={() => void submit()} data-testid="quick-variation-create">{busy ? "Criando…" : "Criar variação"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
