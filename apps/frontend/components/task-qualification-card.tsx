"use client"

// Qualificação obrigatória da entrega (aceite INTERNO do líder/qualificador,
// ANTES da aprovação do cliente). Só aparece em tarefa que exige qualificação.
// Aprovar segue o fluxo; reprovar volta ao executor com o comentário; comentar
// só registra. "Revisão" (conferência técnica) é outra coisa.
import { useCallback, useEffect, useState } from "react"
import { Loader2, MessageSquare, PauseCircle, ShieldCheck, ThumbsUp } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const DECISION_LABEL: Record<string, string> = {
  solicitada: "Entrega enviada para qualificação",
  aprovada: "Qualificação aprovada",
  reprovada: "Ajustes solicitados",
  comentario: "Comentário",
}
const DECISION_TONE: Record<string, string> = {
  solicitada: "text-slate-600 dark:text-slate-300",
  aprovada: "text-emerald-700 dark:text-emerald-400",
  reprovada: "text-red-700 dark:text-red-400",
  comentario: "text-blue-700 dark:text-blue-400",
}

export function TaskQualificationCard({ taskId, status, onChanged }: { taskId: string; status: string; onChanged?: () => void }) {
  const [data, setData] = useState<any>(null)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    apiClient.getTaskQualification(taskId).then(setData).catch(() => setData(null))
  }, [taskId])
  useEffect(() => { load() }, [load, status])

  if (!data?.requires_qualification) return null
  const waiting = data.status === "AGUARDANDO_QUALIFICACAO"

  async function decide(decisao: "aprovar" | "reprovar" | "comentar") {
    setSaving(true)
    setNotice(null)
    try {
      const r: any = await apiClient.qualifyTask(taskId, decisao, comment.trim() || undefined)
      setComment("")
      setNotice(
        decisao === "aprovar" ? "Qualificação aprovada — a entrega segue para a aprovação de quem contratou."
        : decisao === "reprovar" ? (r?.etapaReaberta ? "Ajustes solicitados — a última etapa foi reaberta para o executor." : "Ajustes solicitados.")
        : "Comentário registrado.",
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
    <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/40 p-4 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/10">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-fuchsia-700 dark:text-fuchsia-300" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Qualificação da entrega</p>
        <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200">
          {waiting ? "Aguardando qualificação" : data.status === "EM_AJUSTES" ? "Em ajustes" : data.qualified_at ? "Qualificada" : "Obrigatória"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Aceite interno do líder/qualificador. A aprovação do cliente só acontece depois desta etapa.
      </p>

      {data.historico?.length > 0 && (
        <ol className="mt-3 space-y-1.5 border-l-2 border-fuchsia-200 pl-3 dark:border-fuchsia-900">
          {data.historico.map((h: any) => (
            <li key={h.id} className="text-xs">
              <span className={`font-semibold ${DECISION_TONE[h.decision] ?? ""}`}>{DECISION_LABEL[h.decision] ?? h.decision}</span>
              <span className="text-slate-400"> · rodada {h.round} · {new Date(h.created_at).toLocaleString("pt-BR")}</span>
              {h.comment && <p className="mt-0.5 whitespace-pre-line text-slate-600 dark:text-slate-300">{h.comment}</p>}
            </li>
          ))}
        </ol>
      )}

      {data.pode_qualificar && (
        <div className="mt-3 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder={waiting ? "Comentário (obrigatório para pedir ajustes)" : "Comentário"}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2558FF] dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="flex flex-wrap items-center gap-2">
            {waiting && (
              <>
                <button disabled={saving} onClick={() => decide("aprovar")} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />} Aprovar qualificação
                </button>
                <button
                  disabled={saving || comment.trim().length < 3}
                  onClick={() => decide("reprovar")}
                  title={comment.trim().length < 3 ? "Explique o que precisa ser ajustado" : undefined}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
                >
                  <PauseCircle className="h-4 w-4" /> Reprovar e pedir ajustes
                </button>
              </>
            )}
            <button disabled={saving || comment.trim().length < 1} onClick={() => decide("comentar")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
              <MessageSquare className="h-4 w-4" /> Só comentar
            </button>
          </div>
        </div>
      )}
      {!data.pode_qualificar && waiting && (
        <p className="mt-3 text-xs text-slate-500">Aguardando a decisão do líder/qualificador desta tarefa.</p>
      )}
      {notice && <p role="status" className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-300">{notice}</p>}
    </div>
  )
}
