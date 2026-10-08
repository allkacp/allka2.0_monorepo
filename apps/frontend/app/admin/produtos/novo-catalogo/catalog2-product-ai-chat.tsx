"use client";

// P-8 (reunião 07/10): a IA conversa com o administrador e preenche o produto inteiro. Só PROPÕE um rascunho; nada é salvo até clicar em "Aplicar no produto".
import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export interface AiProductDraft {
  title: string; summary: string; full_description: string;
  included_items: string[]; excluded_items: string[]; client_requirements: string[]; deliverables_summary: string[];
  suggested_tasks: { name: string; objective: string; steps: { name: string; description: string; completion_criteria: string }[] }[];
}
type Msg = { role: "user" | "assistant"; text: string };

/** Só aplica o que a IA trouxe (lista vazia não apaga o que já existe no produto). */
export function draftToVersionPatch(d: AiProductDraft, current: { title?: string; summary?: string; full_description?: string }) {
  return {
    title: d.title || current.title || "", summary: d.summary || current.summary || "", full_description: d.full_description || current.full_description || "",
    ...(d.included_items.length ? { included_items: d.included_items } : {}),
    ...(d.excluded_items.length ? { excluded_items: d.excluded_items } : {}),
    ...(d.client_requirements.length ? { client_requirements: d.client_requirements } : {}),
    ...(d.deliverables_summary.length ? { deliverables_summary: d.deliverables_summary } : {}),
  };
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p><ul className="ml-4 list-disc text-xs">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>;
}

export function ProductAiChatDialog({ open, onOpenChange, productId, readOnly, onApply }: { open: boolean; onOpenChange: (v: boolean) => void; productId: string; readOnly?: boolean; onApply: (d: AiProductDraft) => Promise<void> }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState<AiProductDraft | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    const next: Msg[] = [...messages, { role: "user", text: t }];
    setMessages(next); setText(""); setBusy(true); setErr(null); setApplied(false);
    try {
      const r = await apiClient.draftCatalog2ProductWithAI(productId, next, draft);
      setDraft(r.draft); setMessages([...next, { role: "assistant", text: r.reply }]);
    } catch (e: any) { setErr(e?.message ?? "Não foi possível usar a IA agora."); }
    finally { setBusy(false); }
  }
  async function apply() {
    if (!draft || busy) return;
    setBusy(true); setErr(null);
    try { await onApply(draft); setApplied(true); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível aplicar o rascunho."); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl" data-testid="product-ai-chat">
        <div className="border-b border-slate-200 px-5 pb-3 pt-4 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-violet-600" />Preencher o produto com IA</DialogTitle>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Conte o que é o produto, o que entrega e para quem. A IA monta título, descrições, itens e uma sugestão de tarefas. Você pode pedir ajustes na conversa e só então aplicar.</p>
        </div>
        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden bg-slate-50 p-4 dark:bg-slate-950/40 md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-2">
            <ul className="min-h-[8rem] flex-1 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" aria-label="Conversa" data-testid="chat-log">
              {messages.length === 0 && <li className="text-slate-400">Exemplo: “Produto de gestão de tráfego pago para e-commerce: configuração de pixel, campanhas de remarketing e relatório quinzenal. O cliente precisa ter conta de anúncios.”</li>}
              {messages.map((m, i) => <li key={i} className={`rounded-md px-2 py-1.5 ${m.role === "user" ? "ml-6 bg-violet-100 text-violet-900" : "mr-6 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>{m.text}</li>)}
              {busy && <li className="flex items-center gap-1 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />A IA está montando…</li>}
            </ul>
            {err && <p role="alert" className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{err}</p>}
            <div className="flex items-end gap-2">
              <textarea aria-label="Mensagem para a IA" rows={3} disabled={busy || readOnly} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send(); } }} placeholder={draft ? "Peça um ajuste (ex.: deixe o resumo mais curto)" : "Descreva o produto…"} className="min-h-[72px] flex-1 rounded-md border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
              <Button type="button" className="h-9" disabled={busy || !text.trim() || readOnly} onClick={() => void send()}><Send className="mr-1 h-3.5 w-3.5" />{draft ? "Ajustar" : "Gerar"}</Button>
            </div>
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900" data-testid="draft-preview">
            {!draft ? <p className="text-slate-400">O rascunho aparece aqui.</p> : (
              <>
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Título</p><p className="text-sm font-semibold">{draft.title}</p></div>
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Descrição curta</p><p>{draft.summary}</p></div>
                <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Descrição completa</p><p className="whitespace-pre-wrap">{draft.full_description}</p></div>
                <Bullets title="Itens incluídos" items={draft.included_items} />
                <Bullets title="Itens não incluídos" items={draft.excluded_items} />
                <Bullets title="Requisitos do cliente" items={draft.client_requirements} />
                <Bullets title="Resumo dos entregáveis" items={draft.deliverables_summary} />
                {draft.suggested_tasks.length > 0 && (
                  <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Sugestão de tarefas e etapas (cadastre na aba Entrega)</p>
                    <ol className="ml-4 list-decimal space-y-1">{draft.suggested_tasks.map((t) => <li key={t.name}><strong>{t.name}</strong>{t.objective ? ` — ${t.objective}` : ""}<ul className="ml-4 list-disc">{t.steps.map((s) => <li key={s.name}>{s.name}{s.completion_criteria ? ` (conclui quando: ${s.completion_criteria})` : ""}</li>)}</ul></li>)}</ol>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <Button type="button" disabled={!draft || busy || readOnly} className="bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white" onClick={() => void apply()} data-testid="apply-draft">Aplicar no produto</Button>
          {applied && <span role="status" className="text-xs font-semibold text-emerald-700">Aplicado e salvo. As tarefas e etapas sugeridas ficam para você cadastrar na aba Entrega.</span>}
          <Button type="button" variant="ghost" className="ml-auto" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
