"use client"

// Dependências desta tarefa (pacote, outro produto, entregável, aprovação, acesso).
// Visível para cliente, executor e líder, com estado claro e o motivo:
// bloqueada | aguardando item vinculado | liberada | concluída.
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Link2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const STATE_LABEL: Record<string, string> = {
  bloqueada: "Bloqueada",
  aguardando_item: "Aguardando item vinculado",
  liberada: "Liberada",
  concluida: "Concluída",
}
const STATE_TONE: Record<string, string> = {
  bloqueada: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  aguardando_item: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  liberada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  concluida: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
}
const BEHAVIOR_LABEL: Record<string, string> = {
  block_start: "Bloqueia o início",
  block_final: "Bloqueia a execução final",
  require_before_delivery: "Exigido antes da entrega",
  alert_only: "Só alerta",
}

export function TaskDependenciesCard({ taskId, status }: { taskId: string; status: string }) {
  const [data, setData] = useState<any>(null)
  const [releasing, setReleasing] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(() => {
    apiClient.getTaskDependencies(taskId).then(setData).catch(() => setData(null))
  }, [taskId])
  useEffect(() => { load() }, [load, status])
  if (!data?.applies) return null
  async function release(ruleId: string) {
    setBusy(true); setError(null)
    try { await apiClient.releaseTaskDependency(taskId, ruleId, reason.trim()); setReleasing(null); setReason(""); load() }
    catch (e: any) { setError(e?.message ?? "Não foi possível liberar.") }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/10">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="h-4 w-4 text-indigo-700 dark:text-indigo-300" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dependências</p>
        {data.blocked && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">Há bloqueio</span>}
        {data.auto_update && <span className="text-[10px] text-slate-500" title="Quando o item esperado é concluído ou aprovado, a tarefa é liberada sozinha">atualiza sozinha</span>}
      </div>
      <ul className="mt-2 space-y-2">
        {data.rules.map((r: any) => (
          <li key={r.ruleId} className="rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATE_TONE[r.state] ?? ""}`}>{STATE_LABEL[r.state] ?? r.state}</span>
              <span className="text-[10px] font-semibold text-slate-500">{BEHAVIOR_LABEL[r.behavior] ?? r.behavior}</span>
            </div>
            <p className="mt-1 text-slate-700 dark:text-slate-200">{r.reason}</p>
            {r.blocks && !r.satisfied && <p className="text-xs font-semibold text-red-700">Bloqueia {r.blocks}.</p>}
            {r.target_task && <p className="text-xs text-slate-500">Espera a tarefa "{r.target_task.title}" ({r.target_task.status}){r.responsible ? ` · responsável: ${r.responsible}` : ""}</p>}
            {r.expected_deliverable && <p className="text-xs text-slate-500">Entregável esperado: <strong>{r.expected_deliverable}</strong></p>}
            {r.origin && <p className="text-[11px] text-slate-400">Origem: {r.origin}</p>}
            {r.released && <p className="mt-1 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">Liberada manualmente{r.released.by ? ` por ${r.released.by}` : ""} em {new Date(r.released.at).toLocaleString("pt-BR")}. Motivo: {r.released.reason}</p>}
            {r.can_release && (releasing === r.ruleId ? (
              <div className="mt-2 space-y-1">
                <Textarea rows={2} className="min-h-0 text-xs" placeholder="Por que liberar esta dependência mesmo assim? (mínimo de 10 caracteres — fica no histórico)" aria-label="Motivo da liberação" value={reason} onChange={(e) => setReason(e.target.value)} />
                {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                <div className="flex gap-1.5"><Button size="sm" className="h-7 text-xs" disabled={busy || reason.trim().length < 10} onClick={() => void release(r.ruleId)}>{busy ? "Liberando…" : "Confirmar liberação"}</Button><Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setReleasing(null); setError(null) }}>Cancelar</Button></div>
              </div>
            ) : <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" title="Só líder ou administração; exige justificativa e fica registrado" onClick={() => setReleasing(r.ruleId)}>Liberar manualmente</Button>)}
          </li>
        ))}
      </ul>
    </div>
  )
}
