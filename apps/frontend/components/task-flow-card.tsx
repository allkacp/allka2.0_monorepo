"use client"

// Situação do fluxo da tarefa em linguagem clara + histórico de decisões (automáticas e
// manuais): executor mantido/trocado, acessos validados, etapas dispensadas, dependências
// liberadas. Visível para cliente, executor e líder.
import { useCallback, useEffect, useState } from "react"
import { History, ListChecks } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const STATE_TONE: Record<string, string> = {
  aguardando_inicio_ciclo: "bg-slate-100 text-slate-700",
  aguardando_implementacao: "bg-amber-100 text-amber-800",
  aguardando_ativo_acesso: "bg-amber-100 text-amber-800",
  aguardando_dependencia_produto: "bg-red-100 text-red-800",
  aguardando_executor: "bg-blue-100 text-blue-800",
  em_execucao: "bg-blue-100 text-blue-800",
  entregue_pelo_executor: "bg-indigo-100 text-indigo-800",
  aguardando_qualificacao: "bg-fuchsia-100 text-fuchsia-800",
  em_ajustes: "bg-orange-100 text-orange-800",
  aguardando_aprovacao_cliente: "bg-purple-100 text-purple-800",
  concluida: "bg-emerald-100 text-emerald-800",
  dispensada_por_regra: "bg-slate-200 text-slate-700",
  cancelada: "bg-slate-200 text-slate-700",
  em_lancamento: "bg-slate-100 text-slate-700",
}

/** Chip curto do estado do fluxo (para o cabeçalho). O motivo aparece ao passar o mouse. */
export function TaskFlowBadge({ taskId, status }: { taskId: string; status: string }) {
  const [flow, setFlow] = useState<any>(null)
  useEffect(() => { apiClient.getTaskFlow(taskId).then(setFlow).catch(() => setFlow(null)) }, [taskId, status])
  if (!flow) return null
  return (
    <span
      title={flow.reason}
      className="inline-flex items-center text-[11px] font-semibold bg-white/10 text-white border border-white/20 rounded-full px-2.5 py-1"
    >
      {flow.label}
    </span>
  )
}

const KIND_LABEL: Record<string, string> = {
  cycle_generated: "Ciclo gerado",
  task_dispensed: "Tarefa dispensada",
  implementation_skipped: "Implementação já feita",
  operation_blocked: "Operação bloqueada",
  executor_kept: "Executor mantido",
  executor_changed: "Executor trocado",
  executor_manual: "Executor definido pelo líder",
  continuity_pending: "Aguardando escolha de continuidade",
  asset_validated: "Acesso validado",
  asset_pending: "Acesso pendente",
  asset_change_reported: "Mudança de acesso informada",
  asset_invalidated: "Acesso inválido",
  asset_revalidation: "Revalidação de acesso",
  package_linked: "Pacote contratado",
  dependency_blocked: "Bloqueada por dependência",
  dependency_released: "Dependência liberada",
  dependency_delay_alert: "Líder avisado do atraso",
}

export function TaskFlowCard({ taskId, status, onChanged }: { taskId: string; status: string; onChanged?: () => void }) {
  const [flow, setFlow] = useState<any>(null)
  const [decisions, setDecisions] = useState<any[]>([])
  const [reason, setReason] = useState("")
  const [dispensing, setDispensing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    apiClient.getTaskFlow(taskId).then(setFlow).catch(() => setFlow(null))
    apiClient.getTaskDecisions(taskId).then((r) => setDecisions(r.data)).catch(() => setDecisions([]))
  }, [taskId])
  useEffect(() => { load() }, [load, status])
  if (!flow) return null

  async function dispense() {
    setNotice(null)
    try {
      await apiClient.dispenseTask(taskId, reason.trim())
      setReason("")
      setDispensing(false)
      setNotice("Tarefa dispensada por regra.")
      load()
      onChanged?.()
    } catch (e: any) {
      setNotice(e?.message ?? "Não foi possível dispensar.")
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <ListChecks className="h-4 w-4 text-slate-600" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Situação do fluxo</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATE_TONE[flow.state] ?? "bg-slate-100 text-slate-700"}`}>{flow.label}</span>
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{flow.reason}</p>
      {flow.blockers?.length > 1 && (
        <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
          {flow.blockers.map((b: string, i: number) => <li key={i}>{b}</li>)}
        </ul>
      )}
      {flow.can_dispense && (
        <div className="mt-2">
          {!dispensing ? (
            <button className="text-xs font-semibold text-slate-600 underline" onClick={() => setDispensing(true)}>Dispensar esta tarefa por regra…</button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (obrigatório)" className="h-8 w-72 rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800" />
              <button disabled={reason.trim().length < 3} onClick={() => void dispense()} className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40">Dispensar</button>
              <button onClick={() => setDispensing(false)} className="text-xs text-slate-500 underline">cancelar</button>
            </div>
          )}
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-300">{notice}</p>}

      {decisions.length > 0 && (
        <details className="mt-3">
          <summary className="flex cursor-pointer select-none items-center gap-1 text-xs font-semibold text-slate-600"><History className="h-3.5 w-3.5" /> Histórico de decisões ({decisions.length})</summary>
          <ol className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
            {decisions.map((d) => (
              <li key={d.id} className="text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{KIND_LABEL[d.kind] ?? d.kind}</span>
                <span className="text-slate-400"> · {d.automatic ? "automático" : "manual"} · {new Date(d.created_at).toLocaleString("pt-BR")}</span>
                <p className="text-slate-600 dark:text-slate-300">{d.message}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
