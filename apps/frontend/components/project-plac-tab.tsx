"use client"

// PLAC — cronograma de 13 passos do projeto: o que já foi feito, o que falta, prazos e quem cobra. Abre sozinho quando o projeto é pago.
import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"

const STATUS_TONE: Record<string, string> = { pendente: "bg-slate-100 text-slate-700", em_andamento: "bg-sky-100 text-sky-800", concluida: "bg-emerald-100 text-emerald-800", dispensada: "bg-slate-200 text-slate-500" }
const ROLE_TONE: Record<string, string> = { vc: "bg-violet-100 text-violet-800", ac: "bg-amber-100 text-amber-800", other: "bg-slate-100 text-slate-700" }
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—")
const toInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "")

export function ProjectPlacTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const load = useCallback(() => { apiClient.getProjectPlac(projectId).then((r: any) => { setData(r); setErr(null) }).catch((e: any) => setErr(e?.message ?? "Não foi possível carregar os passos PLAC.")) }, [projectId])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (data?.can_manage) apiClient.getPlacInternalUsers().then((r: any) => setUsers(r.data ?? [])).catch(() => {}) }, [data?.can_manage])

  const patch = async (stepId: string, body: Record<string, any>) => {
    setBusy(stepId)
    try { await apiClient.updatePlacProjectStep(projectId, stepId, body); load() } catch (e: any) { setErr(e?.message ?? "Não foi possível salvar.") } finally { setBusy(null) }
  }
  const generate = async () => { setBusy("gen"); try { await apiClient.generateProjectPlac(projectId); load() } catch (e: any) { setErr(e?.message ?? "Não foi possível gerar os passos.") } finally { setBusy(null) } }

  if (err && !data) return <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>
  if (!data) return <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando os passos PLAC…</p>
  const steps: any[] = data.steps ?? []
  const late = steps.filter((s) => s.overdue).length
  return (
    <div className="space-y-3" data-testid="project-plac">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div><h3 className="text-sm font-bold text-slate-900">Cronograma PLAC — 13 passos</h3><p className="text-[11px] text-slate-500">Abre sozinho quando o projeto é pago. Mostra o que já foi feito e o que falta, com prazo e responsável.</p></div>
          <div className="ml-auto text-right text-xs"><p className="font-semibold">{data.progress.done} de {data.progress.total} concluídos ({data.progress.percent}%)</p>{late > 0 && <p className="font-semibold text-red-600">{late} atrasado{late > 1 ? "s" : ""}</p>}</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${data.progress.percent}%` }} /></div>
      </div>
      {err && <p role="alert" className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</p>}
      {notice && <p role="status" className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{notice}</p>}
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-600">
          Este projeto ainda não tem passos PLAC (ou o modelo não vale para este tipo de comprador).
          {data.can_manage && <div className="mt-3"><Button size="sm" disabled={busy === "gen"} onClick={() => void generate()}>{busy === "gen" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Gerar passos PLAC</Button></div>}
        </div>
      ) : (
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.id} className={`rounded-xl border bg-white p-3 text-xs shadow-sm ${s.overdue ? "border-red-300" : "border-slate-200"}`} data-testid={`plac-step-${s.key}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" aria-label={s.status === "concluida" ? "Reabrir passo" : "Concluir passo"} disabled={busy === s.id} onClick={() => void patch(s.id, { status: s.status === "concluida" ? "pendente" : "concluida" })} className="text-emerald-600">
                  {s.status === "concluida" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-slate-300" />}
                </button>
                <span className="grid h-5 min-w-5 place-items-center rounded bg-sky-500 px-1 text-[11px] font-bold text-white">{i + 1}</span>
                <span className={`min-w-0 flex-1 text-sm font-semibold ${s.status === "concluida" ? "text-slate-400 line-through" : "text-slate-900"}`}>{s.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_TONE[s.role] ?? ROLE_TONE.other}`}>{s.role_label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[s.status] ?? ""}`}>{s.overdue ? "Atrasado" : s.status_label}</span>
                <span className="text-[11px] text-slate-500">Prazo: <strong className={s.overdue ? "text-red-600" : ""}>{fmt(s.due_at)}</strong></span>
              </div>
              {s.description && <p className="mt-1 pl-7 text-slate-600">{s.description}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7 text-[11px] text-slate-500">
                <span>{s.phase_label}{s.estimated_hours ? ` · ${s.estimated_hours} h` : ""}</span>
                {s.status !== "concluida" && s.status !== "dispensada" && <><Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy === s.id} onClick={() => void patch(s.id, { status: s.status === "em_andamento" ? "pendente" : "em_andamento" })}>{s.status === "em_andamento" ? "Voltar para pendente" : "Iniciar"}</Button><Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={busy === s.id} onClick={() => void patch(s.id, { status: "dispensada" })}>Dispensar</Button></>}
                {s.status === "dispensada" && <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => void patch(s.id, { status: "pendente" })}>Reabrir</Button>}
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={busy === s.id} title="Cria este passo como tarefa interna da equipe, no quadro de Tarefas internas" onClick={async () => { setBusy(s.id); try { const r: any = await apiClient.createInternalTaskFromPlac(s.id); setNotice(r.created ? "Tarefa interna criada no quadro." : "Este passo já está no quadro de tarefas internas.") } catch (e: any) { setErr(e?.message ?? "Não foi possível criar a tarefa interna.") } finally { setBusy(null) } }}>Criar tarefa interna</Button>
              </div>
              {data.can_manage && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pl-7 pt-2 text-[11px]" data-testid={`plac-admin-${s.key}`}>
                  <label className="inline-flex items-center gap-1">Prazo<input type="date" aria-label={`Prazo do passo ${i + 1}`} className="h-7 rounded border border-slate-300 px-1" defaultValue={toInput(s.due_at)} onBlur={(e) => { if (e.target.value && e.target.value !== toInput(s.due_at)) void patch(s.id, { due_at: new Date(`${e.target.value}T12:00:00`).toISOString() }) }} /></label>
                  <span className="font-semibold text-slate-600">Cobrança interna:</span>
                  {users.length === 0 ? <span className="text-slate-400">carregando…</span> : (
                    <span className="flex flex-wrap gap-x-2 gap-y-1">{users.map((u) => (
                      <label key={u.id} className="inline-flex items-center gap-1"><input type="checkbox" checked={s.internal_user_ids.includes(u.id)} onChange={(e) => void patch(s.id, { internal_user_ids: e.target.checked ? [...s.internal_user_ids, u.id] : s.internal_user_ids.filter((x: string) => x !== u.id) })} />{u.name}</label>
                    ))}</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
