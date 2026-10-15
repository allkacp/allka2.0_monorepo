"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, RefreshCw, RotateCcw, MessageSquare, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InlineLoader, PageLoader } from "@/components/ui/loading";
import { STANDARD_SHELL_PANEL_CLASS, StandardPageBanner } from "@/components/standard-page-shell";
import { apiClient } from "@/lib/api-client";

// Tela ÚNICA de qualificação de ETAPAS: serve ao líder, a qualquer pessoa escolhida como qualificadora, ao nômade
// qualificador (grupo de nômades qualificadores) e ao administrador. Cada um só vê e decide o que é seu.
interface Pending { id: string; task_id: string; task_title: string; task_code: string | null; stage_title: string; stage_description: string | null; kind: "qualificacao" | "especialista"; from_pool: boolean; delivered_at: string | null; round: number }

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function QualificacoesEtapasPage() {
  const [items, setItems] = useState<Pending[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await apiClient.getQualificacoesPendentes();
      setItems(r.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível carregar as qualificações.");
      setItems([]);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <StandardPageBanner
        title="Etapas para qualificar"
        description="Confira o trabalho entregue, aprove ou peça ajustes. Aqui aparece só o que está aguardando a sua decisão."
        icon={ClipboardCheck}
      />
      <div className={`${STANDARD_SHELL_PANEL_CLASS} p-4`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {items == null ? "Carregando…" : items.length === 0 ? "Nenhuma etapa aguardando a sua qualificação." : `${items.length} ${items.length === 1 ? "etapa aguardando" : "etapas aguardando"} a sua decisão.`}
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Atualizar</Button>
        </div>
        {items == null ? <PageLoader text="Carregando etapas para qualificar…" compact /> : (
          <>
            {error && <p role="alert" className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <ul className="space-y-2" data-testid="qualification-list">
              {items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{it.stage_title}</p>
                    <p className="truncate text-xs text-slate-500">{it.task_title}{it.task_code ? ` · ${it.task_code}` : ""} · entregue em {fmt(it.delivered_at)}{it.round > 0 ? ` · ajuste nº ${it.round}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">{it.from_pool ? "Grupo de nômades qualificadores" : it.kind === "especialista" ? "Qualificação do especialista" : "Qualificação do líder"}</span>
                  <Button size="sm" onClick={() => setOpenId(it.id)}>Conferir</Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {openId && <StageReviewDialog stageId={openId} onClose={() => setOpenId(null)} onDecided={() => { setOpenId(null); void load(); }} />}
    </div>
  );
}

function StageReviewDialog({ stageId, onClose, onDecided }: { stageId: string; onClose: () => void; onDecided: () => void }) {
  const [d, setD] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiClient.getQualificacaoEtapa(stageId).then((r: any) => { if (alive) setD(r); }).catch((e: any) => { if (alive) setErr(e?.message ?? "Não foi possível abrir a etapa."); });
    return () => { alive = false; };
  }, [stageId]);

  const decide = async (decisao: "aprovar" | "reprovar" | "comentar") => {
    if (decisao === "reprovar" && !comment.trim()) { setErr("Explique o que precisa ser ajustado para pedir ajustes."); return; }
    setBusy(true); setErr(null);
    try {
      await apiClient.decideQualificacao(stageId, decisao, comment.trim() || undefined);
      onDecided();
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível registrar a decisão.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto" data-testid="review-dialog">
        <DialogTitle className="text-base">{d ? `Qualificar: ${d.stage.title}` : "Abrindo etapa…"}</DialogTitle>
        {!d && !err && <InlineLoader text="Abrindo a etapa…" />}
        {d && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-slate-500">Tarefa: <strong>{d.task.title}</strong>{d.task.code ? ` · ${d.task.code}` : ""}</p>
            {d.stage.description && <p>{d.stage.description}</p>}
            {d.stage.completion_criteria && <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Critério de conclusão</p><p>{d.stage.completion_criteria}</p></div>}
            {d.guide?.instructions && <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Orientações da etapa</p><p className="whitespace-pre-wrap">{d.guide.instructions}</p></div>}
            {d.checklist?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">O que conferir</p>
                <ul className="mt-1 space-y-0.5">{d.checklist.map((c: any) => <li key={c.id} className="flex gap-1.5"><span aria-hidden="true">☐</span><span>{c.text}</span></li>)}</ul>
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Entregas</p>
              {d.deliveries?.length ? (
                <ul className="mt-1 space-y-1">{d.deliveries.map((a: any) => (
                  <li key={a.id} className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5 text-violet-600" />
                    {a.url || a.file_url ? <a className="text-violet-700 underline" href={a.url ?? a.file_url} target="_blank" rel="noopener noreferrer">{a.name ?? a.file_name ?? a.url}</a> : <span>{a.name ?? a.file_name ?? "Entrega"}</span>}
                    <span className="text-xs text-slate-500">{fmt(a.created_at)}</span></li>
                ))}</ul>
              ) : <p className="text-xs text-slate-500">Nenhum arquivo ou link anexado.</p>}
            </div>
            {d.history?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Histórico</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">{d.history.map((h: any) => <li key={h.id}>{fmt(h.created_at)} · {h.kind} · {h.decision}{h.comment ? ` — ${h.comment}` : ""}</li>)}</ul>
              </div>
            )}
            <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">Comentário {`(obrigatório para pedir ajustes)`}</span>
              <Textarea rows={3} maxLength={4000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Explique o que está certo ou o que precisa ser ajustado." /></label>
          </div>
        )}
        {err && <p role="alert" data-testid="review-error" className="text-sm font-semibold text-red-600">{err}</p>}
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Fechar</Button>
          <Button variant="outline" disabled={busy || !d} onClick={() => void decide("comentar")} className="gap-1.5"><MessageSquare className="h-4 w-4" />Só comentar</Button>
          <Button variant="outline" disabled={busy || !d} onClick={() => void decide("reprovar")} className="gap-1.5 border-amber-300 text-amber-700"><RotateCcw className="h-4 w-4" />Pedir ajustes</Button>
          <Button disabled={busy || !d} onClick={() => void decide("aprovar")} className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2 className="h-4 w-4" />Aprovar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
