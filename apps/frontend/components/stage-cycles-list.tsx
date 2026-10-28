"use client"

// Lista de CICLOS de uma etapa em ciclos (ex.: gestão semanal de campanhas), dentro do painel de andamento da tarefa.
// Regras (motor no servidor, src/lib/stage-cycles.ts): cada ciclo termina com uma entrega que o cliente aprova em prazo curto;
// o ciclo seguinte começa na data certa com ou sem aprovação; reprovar NÃO reabre o ciclo — o comentário vira orientação do próximo;
// sem resposta no prazo, o ciclo se encerra; a etapa só fecha depois do último ciclo. Nada é calculado aqui: só se mostra o que o servidor diz.
import { useCallback, useEffect, useState } from "react"
import { CalendarRange, CheckCircle2, Loader2, Send, XCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export const CYCLE_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  agendado: { label: "Ainda não começou", tone: "bg-slate-100 text-slate-700" },
  em_andamento: { label: "Em andamento", tone: "bg-blue-100 text-blue-800" },
  aguardando_aprovacao: { label: "Aguardando aprovação do cliente", tone: "bg-purple-100 text-purple-800" },
  aprovado: { label: "Aprovado", tone: "bg-emerald-100 text-emerald-800" },
  reprovado: { label: "Reprovado", tone: "bg-red-100 text-red-800" },
  sem_resposta: { label: "Encerrado sem resposta", tone: "bg-amber-100 text-amber-800" },
}
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—")
const fmtFull = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—")
const BTN = "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition disabled:opacity-50"

export function StageCyclesList({ taskId, stageId, onChanged }: { taskId: string; stageId: string; onChanged?: () => void }) {
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [text, setText] = useState<Record<string, string>>({})

  const load = useCallback(() => { apiClient.getStageCycles(taskId, stageId).then(setData).catch(() => setData(null)) }, [taskId, stageId])
  useEffect(() => { load() }, [load])

  if (!data || !data.em_ciclos) return null
  const cycles: any[] = data.data ?? []
  if (cycles.length === 0) return <p className="mt-2 text-[11px] text-slate-500" data-testid="cycles-empty">Os ciclos desta etapa aparecem quando ela começar.</p>
  const t = (id: string) => (text[id] ?? "").trim()

  async function run(key: string, fn: () => Promise<any>, ok: string) {
    setBusy(key); setNotice(null)
    try { await fn(); setNotice({ ok: true, text: ok }); setText((x) => ({ ...x, [key]: "" })); load(); onChanged?.() }
    catch (e: any) { setNotice({ ok: false, text: e?.message ?? "Não foi possível concluir." }) }
    finally { setBusy(null) }
  }

  return (
    <section className="mt-2 space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="stage-cycles">
      <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300"><CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />Ciclos da etapa</h4>
      {notice && <p role="status" className={`rounded-md px-2.5 py-1.5 text-xs ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</p>}
      <ol className="space-y-2">
        {cycles.map((c) => {
          const st = CYCLE_STATUS_LABEL[c.status] ?? { label: c.status, tone: "bg-slate-100 text-slate-700" }
          return (
            <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900" data-testid="stage-cycle" data-status={c.status}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="section-number-badge flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">{c.cycle_index}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ciclo {c.cycle_index}</span>
                <span className="text-[11px] text-slate-500">dia {c.from_day === c.to_day ? c.from_day : `${c.from_day} a ${c.to_day}`} · {fmt(c.starts_at)} a {fmt(c.ends_at)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.tone}`}>{st.label}</span>
                {c.atrasado && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800" data-testid="cycle-late">Período terminou sem entrega</span>}
                {c.hours != null && <span className="text-[11px] text-slate-500">{c.hours} h previstas</span>}
                {c.status === "aguardando_aprovacao" && c.approval_due_at && <span className="ml-auto text-[11px] text-slate-500">cliente aprova até {fmtFull(c.approval_due_at)}</span>}
              </div>
              {c.rule && <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300"><strong>Regra do ciclo:</strong> {c.rule}</p>}
              {c.guidance_from_previous && <p className="mt-1 whitespace-pre-line rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900" data-testid="cycle-guidance"><strong>Orientação do ciclo anterior:</strong> {c.guidance_from_previous}</p>}
              {c.delivery_note && <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300"><strong>Entrega:</strong> {c.delivery_note}</p>}
              {c.client_comment && <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300"><strong>Comentário do cliente:</strong> {c.client_comment}</p>}
              {c.pode_entregar && data.viewer?.can_deliver && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input aria-label={`Observação da entrega do ciclo ${c.cycle_index}`} value={text[c.id] ?? ""} onChange={(e) => setText((x) => ({ ...x, [c.id]: e.target.value }))} placeholder="Observação da entrega (opcional)" className="h-8 min-w-[14rem] flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
                  <button type="button" disabled={busy === c.id} className={`${BTN} border-violet-300 bg-violet-700 text-white hover:bg-violet-800`} data-testid="cycle-deliver"
                    onClick={() => run(c.id, () => apiClient.deliverStageCycle(taskId, stageId, c.id, t(c.id) || undefined), `Ciclo ${c.cycle_index} entregue: o cliente tem o prazo para aprovar.`)}>
                    {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Entregar ciclo
                  </button>
                </div>
              )}
              {c.pode_decidir && data.viewer?.can_decide && (
                <div className="mt-2 space-y-1.5">
                  <textarea aria-label={`Comentário do ciclo ${c.cycle_index}`} rows={2} maxLength={4000} value={text[c.id] ?? ""} onChange={(e) => setText((x) => ({ ...x, [c.id]: e.target.value }))} placeholder="Comentário (obrigatório para reprovar — vai como orientação para o próximo ciclo)" className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy === c.id} className={`${BTN} border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`} data-testid="cycle-approve"
                      onClick={() => run(c.id, () => apiClient.decideStageCycle(taskId, stageId, c.id, "aprovar", t(c.id) || undefined), `Ciclo ${c.cycle_index} aprovado.`)}><CheckCircle2 className="h-3.5 w-3.5" />Aprovar ciclo</button>
                    <button type="button" disabled={busy === c.id || t(c.id).length < 3} title={t(c.id).length < 3 ? "Escreva o que precisa mudar" : ""} className={`${BTN} border-red-300 bg-red-50 text-red-800 hover:bg-red-100`} data-testid="cycle-reject"
                      onClick={() => run(c.id, () => apiClient.decideStageCycle(taskId, stageId, c.id, "reprovar", t(c.id)), `Ciclo ${c.cycle_index} reprovado: o comentário foi como orientação para o próximo ciclo.`)}><XCircle className="h-3.5 w-3.5" />Reprovar ciclo</button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
