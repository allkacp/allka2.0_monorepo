"use client";

// D-2 (reunião 07/10): produto SOB CONSULTA não contrata direto. O cliente responde ao questionário do produto e solicita o orçamento;
// a equipe responde com valor e prazo; aqui o cliente acompanha o pedido e aprova ou recusa a proposta.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  novo: "Recebido", aberta: "Recebido", em_analise: "Em análise", aguardando_cliente: "Aguardando você", proposta_preparada: "Em análise",
  proposta_enviada: "Proposta enviada", aprovado: "Aprovado", recusado: "Recusado", cancelado: "Cancelado", expirado: "Proposta expirada", respondida: "Respondido", convertida: "Contratado",
};
const brl = (v?: number | null) => (v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v));
const OPEN = ["novo", "aberta", "em_analise", "aguardando_cliente", "proposta_preparada", "proposta_enviada"];
const FIELD = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900";

type Q = { id: string; group: string; label: string; is_required: boolean; question_type: string; help_text: string | null; options: { value: string; label: string }[] };

/** Valida só o que dá para ver na tela (o servidor confere de novo): obrigatórias preenchidas. */
export function missingRequired(questions: Q[], answers: Record<string, string | string[]>): string[] {
  return questions.filter((q) => q.is_required && !(Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).length > 0 : String(answers[q.id] ?? "").trim())).map((q) => q.label);
}

function QuestionField({ q, value, onChange, disabled }: { q: Q; value: string | string[] | undefined; onChange: (v: string | string[]) => void; disabled: boolean }) {
  const label = `${q.label}${q.is_required ? " *" : ""}`;
  if (q.question_type === "texto_longo") return <textarea aria-label={label} rows={3} disabled={disabled} className={FIELD} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
  if (q.question_type === "sim_nao") return <select aria-label={label} disabled={disabled} className={FIELD} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Escolha…</option><option value="Sim">Sim</option><option value="Não">Não</option></select>;
  if (q.question_type === "selecao_unica") return <select aria-label={label} disabled={disabled} className={FIELD} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">Escolha…</option>{q.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
  if (q.question_type === "selecao_multipla") {
    const cur = Array.isArray(value) ? value : [];
    return <div className="flex flex-wrap gap-x-3 gap-y-1" role="group" aria-label={label}>{q.options.map((o) => <label key={o.value} className="flex items-center gap-1 text-xs"><input type="checkbox" disabled={disabled} checked={cur.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...cur, o.value] : cur.filter((x) => x !== o.value))} />{o.label}</label>)}</div>;
  }
  const type = q.question_type === "numero" || q.question_type === "moeda" ? "number" : q.question_type === "data" ? "date" : q.question_type === "email" ? "email" : "text";
  return <input aria-label={label} type={type} disabled={disabled} className={FIELD} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
}

export function OnRequestBox({ productId, selection, period }: { productId: string; selection: Record<string, any>; period?: string | null }) {
  const [questions, setQuestions] = useState<Q[] | null>(null);
  const [mine, setMine] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [replyNote, setReplyNote] = useState("");

  const load = useCallback(async () => {
    try {
      const r: any = await apiClient.getClientCatalog2RequestQuestionnaire(productId);
      setQuestions(r?.questions ?? []);
      const list: any = await apiClient.listClientCatalog2CommercialRequests();
      setMine((list?.data ?? []).filter((x: any) => x.product_id === r?.product_id));
    } catch (e: any) { setQuestions([]); setMsg({ ok: false, text: e?.message ?? "Não foi possível carregar o questionário." }); }
  }, [productId]);
  useEffect(() => { void load(); }, [load]);

  const current = mine.find((r) => OPEN.includes(r.status)) ?? null;
  const last = current ?? mine[0] ?? null;
  const missing = questions ? missingRequired(questions, answers) : [];

  async function send() {
    if (busy || missing.length > 0) return;
    setBusy(true); setMsg(null);
    try {
      const r: any = await apiClient.createClientCatalog2CommercialRequest(productId, selection, period, note.trim() || undefined, answers);
      setMsg({ ok: true, text: r?.already_existed ? "Você já tem um pedido de orçamento em andamento para este produto." : "Pedido enviado! Nossa equipe vai analisar e responder com valor e prazo." });
      setAnswers({}); setNote(""); await load();
    } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível enviar o pedido." }); }
    finally { setBusy(false); }
  }
  async function respond(decision: "aprovar" | "recusar") {
    if (!last || busy) return;
    setBusy(true); setMsg(null);
    try {
      await apiClient.respondClientCatalog2CommercialRequest(last.id, decision, replyNote.trim() || undefined);
      setMsg({ ok: true, text: decision === "aprovar" ? "Proposta aprovada! Nossa equipe vai formalizar a contratação com você." : "Proposta recusada." });
      setReplyNote(""); await load();
    } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível responder." }); await load(); }
    finally { setBusy(false); }
  }

  if (!questions) return <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>;

  return (
    <div id="catalog2-request-box" className="space-y-2 rounded-xl border border-violet-300 bg-violet-50 p-3 text-xs text-violet-950 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100" data-testid="on-request-box">
      <p className="flex items-center gap-1.5 text-sm font-bold"><ClipboardList className="h-4 w-4" />Produto sob consulta — peça um orçamento</p>
      <p className="text-[11px] opacity-80">Este produto não tem preço fixo. Responda às perguntas abaixo e nossa equipe prepara uma proposta com valor e prazo para você aprovar.</p>

      {last && (
        <div className="space-y-1.5 rounded-lg border border-violet-200 bg-white/70 p-2 dark:border-violet-900 dark:bg-slate-900/50" data-testid="my-request">
          <p className="font-semibold">Seu pedido: <span data-testid="request-status">{REQUEST_STATUS_LABEL[last.status] ?? last.status}</span></p>
          {last.proposal && (
            <p data-testid="proposal">Proposta: <strong>{brl(last.proposal.proposed_price)}</strong>{last.proposal.proposed_deadline_days != null ? ` · prazo ${last.proposal.proposed_deadline_days} dia(s)` : ""}{last.proposal.proposal_valid_until ? ` · válida até ${new Date(last.proposal.proposal_valid_until).toLocaleDateString("pt-BR")}` : ""}</p>
          )}
          {last.response_note && <p className="opacity-80">Resposta da equipe: {last.response_note}</p>}
          {last.can_respond && (
            <div className="space-y-1.5">
              <input aria-label="Comentário (opcional)" className={FIELD} placeholder="Comentário (opcional)" value={replyNote} onChange={(e) => setReplyNote(e.target.value)} />
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={busy} className="h-8 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void respond("aprovar")}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Aprovar proposta</Button>
                <Button type="button" size="sm" variant="outline" disabled={busy} className="h-8 flex-1" onClick={() => void respond("recusar")}>Recusar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!current && (
        <div className="space-y-2">
          {questions.map((q) => (
            <label key={q.id} className="block space-y-0.5">
              <span className="font-semibold">{q.label}{q.is_required && <span className="text-red-500"> *</span>}</span>
              <QuestionField q={q} value={answers[q.id]} disabled={busy} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
              {q.help_text && <span className="block text-[11px] opacity-70">{q.help_text}</span>}
            </label>
          ))}
          <label className="block space-y-0.5"><span className="font-semibold">Observação (opcional)</span><textarea aria-label="Observação" rows={2} disabled={busy} className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {missing.length > 0 && <p className="text-[11px] text-amber-700" data-testid="missing">Falta responder: {missing.join("; ")}.</p>}
          <Button type="button" className="w-full" disabled={busy || missing.length > 0} onClick={() => void send()}>{busy ? "Enviando…" : "Enviar pedido de orçamento"}</Button>
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-[11px] font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
