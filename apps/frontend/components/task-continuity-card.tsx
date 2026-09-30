"use client"

// Continuidade com o mesmo nômade/executor do ciclo anterior. Aparece na tarefa de
// um ciclo seguinte quando o modelo admite continuidade e existe execução anterior
// do mesmo cliente. O cliente/agência/líder escolhe manter ou redistribuir pela fila
// inteligente; definir manualmente é só do líder/administrador.
import { useCallback, useEffect, useState } from "react"
import { Loader2, Repeat2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const MODE_LABEL: Record<string, string> = {
  allowed: "Permitida",
  recommended: "Recomendada",
  required: "Obrigatória",
}
const STATUS_LABEL: Record<string, string> = {
  pending_choice: "Aguardando escolha",
  kept: "Mesmo executor mantido",
  redistributed: "Distribuída pela fila inteligente",
  manual_leader: "Executor definido pelo líder",
}

export function TaskContinuityCard({ taskId, status, onChanged }: { taskId: string; status: string; onChanged?: () => void }) {
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [nomades, setNomades] = useState<{ id: string; name: string; eligible: boolean }[] | null>(null)
  const [manualId, setManualId] = useState("")

  const load = useCallback(() => {
    apiClient.getTaskContinuity(taskId).then(setData).catch(() => setData(null))
  }, [taskId])
  useEffect(() => { load() }, [load, status])
  useEffect(() => {
    if (!data?.can_choose_manually) return
    apiClient.getTaskRoutingNomades(taskId).then(setNomades).catch(() => setNomades(null))
  }, [data?.can_choose_manually, taskId])

  if (!data?.applies || !data.status) return null

  async function choose(choice: "keep" | "redistribute" | "manual_leader") {
    setSaving(true)
    setNotice(null)
    try {
      await apiClient.decideTaskContinuity(taskId, choice, choice === "manual_leader" ? manualId : undefined)
      setNotice(
        choice === "keep" ? "Certo — a tarefa vai para o mesmo executor do ciclo anterior."
        : choice === "redistribute" ? "Certo — a tarefa segue pela fila inteligente, com o histórico do ciclo anterior no briefing."
        : "Executor definido pelo líder.",
      )
      load()
      onChanged?.()
    } catch (e: any) {
      setNotice(e?.message ?? "Não foi possível registrar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/50 dark:bg-teal-950/10">
      <div className="flex flex-wrap items-center gap-2">
        <Repeat2 className="h-4 w-4 text-teal-700 dark:text-teal-300" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Continuidade com o mesmo executor</p>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">{MODE_LABEL[data.mode] ?? data.mode}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{STATUS_LABEL[data.status] ?? data.status}</span>
      </div>
      {data.previous_executor && (
        <p className="mt-1 text-xs text-slate-500">
          Executor do ciclo anterior: <strong>{data.previous_executor.name}</strong>
          {data.previous_task ? ` (tarefa "${data.previous_task.title}")` : ""}.
        </p>
      )}

      {data.can_choose && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Manter com o mesmo nômade/executor do ciclo anterior?</p>
          {data.recommended && <p className="text-xs text-teal-700 dark:text-teal-300">O sistema recomenda manter — o contexto já está com essa pessoa.</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={saving} onClick={() => choose("keep")} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Sim, manter o mesmo executor
            </button>
            <button disabled={saving} onClick={() => choose("redistribute")} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
              Não, distribuir pela fila inteligente
            </button>
          </div>
        </div>
      )}

      {data.can_choose_manually && nomades && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={manualId} onChange={(e) => setManualId(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            <option value="">Definir manualmente (líder)…</option>
            {nomades.map((n) => <option key={n.id} value={n.id}>{n.name}{n.eligible ? "" : " (fora da fila desta tarefa)"}</option>)}
          </select>
          <button disabled={saving || !manualId} onClick={() => choose("manual_leader")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">Definir</button>
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-300">{notice}</p>}
    </div>
  )
}
