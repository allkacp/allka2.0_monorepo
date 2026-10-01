"use client"

// Entregáveis e anexos estruturados da tarefa contratada (Pedido 3, fase 3).
// O servidor já devolve só o que o perfil pode ver e diz se ele pode enviar ou decidir cada item.
import { useCallback, useEffect, useState } from "react"
import { Loader2, Paperclip } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", enviado: "Enviado", em_revisao: "Em revisão", aprovado: "Aprovado", reprovado: "Reprovado" }
const STATUS_TONE: Record<string, string> = {
  pendente: "bg-slate-100 text-slate-700", enviado: "bg-blue-100 text-blue-800", em_revisao: "bg-purple-100 text-purple-800",
  aprovado: "bg-emerald-100 text-emerald-800", reprovado: "bg-red-100 text-red-800",
}
const RESP_LABEL: Record<string, string> = { executor: "Executor", lider: "Líder", agencia: "Agência", cliente: "Cliente", sistema: "Sistema" }

function Item({ taskId, d, onDone }: { taskId: string; d: any; onDone: () => void }) {
  const [url, setUrl] = useState("")
  const [text, setText] = useState("")
  const [name, setName] = useState("")
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const needsUrl = ["arquivo", "link"].includes(d.type)
  const needsText = d.type === "texto"

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setErr(null)
    try { await fn(); setUrl(""); setText(""); setName(""); setComment(""); onDone() }
    catch (e: any) { setErr(e?.message ?? "Não foi possível concluir. Tente novamente.") }
    finally { setBusy(false) }
  }
  return (
    <li className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[d.status] ?? STATUS_TONE.pendente}`}>{STATUS_LABEL[d.status] ?? d.status}</span>
        <span className="text-[10px] text-slate-400">Envia: {RESP_LABEL[d.responsible] ?? d.responsible}{d.is_required ? " · obrigatório" : ""}</span>
        {d.version > 1 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600" title="Esta entrega já foi substituída antes">versão {d.version}</span>}
      </div>
      {(d.producer_task || d.producer_stage || (d.consumers ?? []).length > 0 || d.submitted_by_name) && (
        <p className="text-[10px] text-slate-400">
          {d.producer_task ? `Produzido em "${d.producer_task.title}"` : ""}{d.producer_stage?.title ? ` · etapa "${d.producer_stage.title}"` : ""}
          {d.origin === "ia" ? " · origem: IA" : ""}{d.submitted_by_name ? ` · enviado por ${d.submitted_by_name}` : ""}
          {(d.consumers ?? []).length > 0 ? ` · usado por: ${d.consumers.map((x: any) => x.title ?? "tarefa").join(", ")}` : ""}
        </p>
      )}
      {d.description && <p className="text-slate-500">{d.description}</p>}
      {d.content_url && <p><a className="text-blue-700 underline" href={d.content_url} target="_blank" rel="noreferrer">{d.content_name || d.content_url}</a></p>}
      {d.content_text && <p className="whitespace-pre-wrap rounded bg-slate-50 p-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{d.content_text}</p>}
      {d.status === "reprovado" && (d.rejection_reason ?? d.review_comment) && <p className="text-red-700">Motivo da rejeição: {d.rejection_reason ?? d.review_comment}</p>}
      {d.approved && <p className="text-emerald-700">Aprovado{d.reviewed_by_name ? ` por ${d.reviewed_by_name}` : ""}{d.approved_at ? ` em ${new Date(d.approved_at).toLocaleString("pt-BR")}` : ""}.</p>}
      {(d.history ?? []).length > 0 && (
        <details className="rounded bg-slate-50 p-1.5 dark:bg-slate-800/50">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">Versões anteriores ({d.history.length})</summary>
          <ul className="mt-1 space-y-1">{d.history.map((h: any) => (
            <li key={h.version} className="text-[11px] text-slate-600">
              <span className="font-semibold">v{h.version}</span> · {STATUS_LABEL[h.status] ?? h.status}{h.submitted_by_name ? ` · ${h.submitted_by_name}` : ""}
              {h.content_url ? <> · <a className="text-blue-700 underline" href={h.content_url} target="_blank" rel="noreferrer">{h.content_name || "abrir"}</a></> : null}
              {h.review_comment ? <span className="block text-red-700">Motivo: {h.review_comment}</span> : null}
            </li>
          ))}</ul>
        </details>
      )}
      {d.can_submit && (
        <div className="space-y-1">
          {(needsUrl || !needsText) && <input className="h-8 w-full rounded border border-slate-300 bg-transparent px-2" placeholder={needsUrl ? "Link (https://…)" : "Link (opcional)"} value={url} onChange={(e) => setUrl(e.target.value)} />}
          {needsUrl && <input className="h-8 w-full rounded border border-slate-300 bg-transparent px-2" placeholder="Nome de exibição (opcional)" value={name} onChange={(e) => setName(e.target.value)} />}
          {!needsUrl && <textarea className="min-h-[3.5rem] w-full rounded border border-slate-300 bg-transparent px-2 py-1" placeholder={needsText ? "Escreva aqui" : "Texto (opcional se enviar link)"} value={text} onChange={(e) => setText(e.target.value)} />}
          <button type="button" disabled={busy} className="rounded-md bg-slate-900 px-3 py-1 font-semibold text-white disabled:opacity-50" onClick={() => void run(() => apiClient.submitTaskDeliverable(taskId, d.id, { content_url: url.trim() || undefined, content_text: text.trim() || undefined, content_name: name.trim() || undefined }))}>{d.status === "reprovado" ? "Reenviar" : "Enviar"}</button>
          <p className="text-[10px] text-slate-400">Nunca envie senhas aqui.</p>
        </div>
      )}
      {d.can_review && (
        <div className="space-y-1">
          <input className="h-8 w-full rounded border border-slate-300 bg-transparent px-2" placeholder="Comentário (obrigatório para reprovar)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-1.5">
            <button type="button" disabled={busy} className="rounded-md bg-emerald-600 px-3 py-1 font-semibold text-white disabled:opacity-50" onClick={() => void run(() => apiClient.reviewTaskDeliverable(taskId, d.id, "aprovar", comment.trim() || undefined))}>Aprovar</button>
            <button type="button" disabled={busy} className="rounded-md bg-red-600 px-3 py-1 font-semibold text-white disabled:opacity-50" onClick={() => void run(() => apiClient.reviewTaskDeliverable(taskId, d.id, "reprovar", comment.trim() || undefined))}>Reprovar</button>
          </div>
        </div>
      )}
      {err && <p role="alert" className="text-red-600">{err}</p>}
    </li>
  )
}

export function TaskDeliverablesCard({ taskId, status, className }: { taskId: string; status?: string; className?: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const load = useCallback(() => { apiClient.getTaskDeliverables(taskId).then((r) => setRows(r.data)).catch(() => setRows([])) }, [taskId])
  useEffect(() => { load() }, [load, status])
  if (rows === null) return <div className={className}><Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /></div>
  if (rows.length === 0) return null
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30 ${className ?? ""}`}>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100"><Paperclip className="h-4 w-4" /> Entregáveis e anexos</p>
      <ul className="space-y-2">{rows.map((d) => <Item key={d.id} taskId={taskId} d={d} onDone={load} />)}</ul>
    </div>
  )
}
