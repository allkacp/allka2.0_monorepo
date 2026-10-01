"use client"

// Revisão obrigatória da entrega (conferência técnica ANTES da qualificação e da aprovação).
// Só aparece em tarefa que exige revisão e só para quem pode ver a revisão interna (administração,
// revisor/líder da tarefa e o executor, que enxerga os ajustes pedidos).
// Aprovar segue o fluxo; reprovar/pedir ajustes volta ao executor com o comentário; comentar só registra.
import { useCallback, useEffect, useState } from "react"
import { ClipboardCheck, Loader2, MessageSquare, PauseCircle, ThumbsUp, Wrench } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const DECISION_LABEL: Record<string, string> = {
  solicitada: "Entrega enviada para revisão",
  aprovada: "Revisão aprovada",
  reprovada: "Entrega reprovada",
  ajustes: "Ajustes solicitados",
  comentario: "Comentário",
}
const DECISION_TONE: Record<string, string> = {
  solicitada: "text-slate-600 dark:text-slate-300",
  aprovada: "text-emerald-700 dark:text-emerald-400",
  reprovada: "text-red-700 dark:text-red-400",
  ajustes: "text-amber-700 dark:text-amber-400",
  comentario: "text-blue-700 dark:text-blue-400",
}
const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`

export function TaskReviewCard({ taskId, status, onChanged }: { taskId: string; status: string; onChanged?: () => void }) {
  const [data, setData] = useState<any>(null)
  const [comment, setComment] = useState("")
  const [minutes, setMinutes] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    apiClient.getTaskReview(taskId).then(setData).catch(() => setData(null))
  }, [taskId])
  useEffect(() => { load() }, [load, status])

  if (!data?.requires_review) return null
  const waiting = data.status === "AGUARDANDO_REVISAO"

  async function decide(decisao: "aprovar" | "reprovar" | "ajustes" | "comentar") {
    setSaving(true)
    setNotice(null)
    try {
      const mins = minutes.trim() === "" ? undefined : Math.max(0, Math.floor(Number(minutes)) || 0)
      const r: any = await apiClient.reviewTask(taskId, decisao, comment.trim() || undefined, mins)
      setComment("")
      setMinutes("")
      setNotice(
        decisao === "aprovar" ? (r?.proximo === "qualificacao" ? "Revisão aprovada — a entrega segue para a qualificação." : "Revisão aprovada — a entrega segue para a aprovação de quem contratou.")
        : decisao === "comentar" ? "Comentário registrado."
        : r?.etapaReaberta ? "Devolvida ao executor — a última etapa foi reaberta com o seu comentário." : "Devolvida ao executor.",
      )
      load()
      if (decisao !== "comentar") onChanged?.()
    } catch (e: any) {
      setNotice(e?.message ?? "Não foi possível registrar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 dark:border-purple-900/50 dark:bg-purple-950/10">
      <div className="flex flex-wrap items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-purple-700 dark:text-purple-300" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revisão da entrega</p>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
          {waiting ? "Aguardando revisão" : data.status === "EM_AJUSTES" ? "Em ajustes" : data.reviewed_at ? "Revisada" : "Obrigatória"}
        </span>
        {data.review_round > 0 && <span className="text-[10px] text-slate-400">rodada {data.review_round}</span>}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Conferência técnica interna. Vem antes da qualificação e da aprovação de quem contratou.
        {data.minutos_estimados != null && <> Tempo previsto: {data.minutos_estimados} min.</>}
        {data.total_minutos > 0 && <> Já gasto: {data.total_minutos} min{data.custo_estimado != null ? ` (≈ ${brl(data.custo_estimado)})` : ""}.</>}
      </p>

      {data.historico?.length > 0 && (
        <ol className="mt-3 space-y-1.5 border-l-2 border-purple-200 pl-3 dark:border-purple-900">
          {data.historico.map((h: any) => (
            <li key={h.id} className="text-xs">
              <span className={`font-semibold ${DECISION_TONE[h.decision] ?? ""}`}>{DECISION_LABEL[h.decision] ?? h.decision}</span>
              <span className="text-slate-400"> · rodada {h.round} · {new Date(h.created_at).toLocaleString("pt-BR")}{h.minutes_spent ? ` · ${h.minutes_spent} min` : ""}</span>
              {h.comment && <p className="mt-0.5 whitespace-pre-line text-slate-600 dark:text-slate-300">{h.comment}</p>}
            </li>
          ))}
        </ol>
      )}

      {data.pode_revisar && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={waiting ? "Comentário (obrigatório para reprovar ou pedir ajustes)" : "Comentário"}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2558FF] dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-500" title="Quanto tempo você levou revisando (opcional)">
              Tempo gasto
              <input type="number" min={0} max={10000} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800" />
              min
            </label>
            {waiting && (
              <>
                <button disabled={saving} onClick={() => decide("aprovar")} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />} Aprovar revisão
                </button>
                <button disabled={saving || comment.trim().length < 3} onClick={() => decide("ajustes")} title={comment.trim().length < 3 ? "Explique o que precisa ser ajustado" : undefined} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800 disabled:opacity-40 dark:border-amber-800 dark:text-amber-300">
                  <Wrench className="h-4 w-4" /> Pedir ajustes
                </button>
                <button disabled={saving || comment.trim().length < 3} onClick={() => decide("reprovar")} title={comment.trim().length < 3 ? "Explique o motivo da reprovação" : undefined} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-400">
                  <PauseCircle className="h-4 w-4" /> Reprovar
                </button>
              </>
            )}
            <button disabled={saving || comment.trim().length < 1} onClick={() => decide("comentar")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
              <MessageSquare className="h-4 w-4" /> Só comentar
            </button>
          </div>
        </div>
      )}
      {!data.pode_revisar && waiting && <p className="mt-3 text-xs text-slate-500">Aguardando a decisão do revisor desta tarefa.</p>}
      {notice && <p role="status" className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-300">{notice}</p>}
    </div>
  )
}
