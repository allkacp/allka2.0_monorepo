"use client"

// Painel operacional da tarefa (A8b fase 5 + painel de portões/SLA): cada ETAPA com a sua situação e os botões que o perfil pode usar
// (qualificar, aprovar, pedir ajuste, liberar a próxima, avisar o cliente), os portões de aprovação, os prazos (SLA) e as entradas
// recebidas de outros produtos. Os botões só aparecem quando o servidor diz que o perfil pode (can_*). Nada é calculado aqui.
import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, Clock, GitBranch, Loader2, PauseCircle, PlayCircle, ShieldCheck } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export const STAGE_STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  BLOQUEADA: { label: "Aguardando a etapa anterior", tone: "bg-slate-100 text-slate-700" },
  PENDENTE: { label: "Pronta para começar", tone: "bg-slate-100 text-slate-700" },
  AGUARDANDO_EXECUTOR: { label: "Procurando executor", tone: "bg-blue-100 text-blue-800" },
  EM_ANDAMENTO: { label: "Em execução", tone: "bg-blue-100 text-blue-800" },
  EM_QUALIFICACAO: { label: "Aguardando qualificação do líder", tone: "bg-fuchsia-100 text-fuchsia-800" },
  EM_QUALIFICACAO_ESPECIALISTA: { label: "Aguardando qualificação do especialista", tone: "bg-pink-100 text-pink-800" },
  EM_APROVACAO_CLIENTE: { label: "Aguardando aprovação", tone: "bg-purple-100 text-purple-800" },
  CONCLUIDA: { label: "Concluída", tone: "bg-emerald-100 text-emerald-800" },
  AGUARDANDO_APROVACAO: { label: "Aguardando uma aprovação", tone: "bg-amber-100 text-amber-800" },
  AGUARDANDO_DEPENDENCIA: { label: "Aguardando outro produto", tone: "bg-amber-100 text-amber-800" },
}
const SLA_TONE: Record<string, string> = { correndo: "bg-blue-100 text-blue-800", pausado: "bg-amber-100 text-amber-800", estourado: "bg-red-100 text-red-800", concluido: "bg-emerald-100 text-emerald-800", aguardando: "bg-slate-100 text-slate-700" }
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—")
const tipoOf = (e: any): "qualificacao" | "especialista" | "aprovacao" => (e.can_qualify ? "qualificacao" : e.can_qualify_specialist ? "especialista" : "aprovacao")
const BTN = "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition disabled:opacity-50"

export function TaskStagesPanel({ taskId, status, onChanged }: { taskId: string; status: string; onChanged?: () => void }) {
  const [flow, setFlow] = useState<any>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [reasons, setReasons] = useState<{ key: string; label: string }[]>([])
  const [responsibles, setResponsibles] = useState<{ key: string; label: string }[]>([])
  const [pause, setPause] = useState({ reason: "", party: "client", note: "" })
  const [history, setHistory] = useState<Record<string, any[]>>({})

  const load = useCallback(() => { apiClient.getTaskFlowPanel(taskId).then(setFlow).catch(() => setFlow(null)) }, [taskId])
  useEffect(() => { load() }, [load, status])
  useEffect(() => { if (flow?.viewer?.can_manage_sla && reasons.length === 0) apiClient.getSlaReasons().then((r) => { setReasons(r.reasons); setResponsibles(r.responsibles); setPause((p) => ({ ...p, reason: r.reasons[0]?.key ?? "" })) }).catch(() => {}) }, [flow?.viewer?.can_manage_sla]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!flow) return null
  const stages: any[] = flow.stages ?? []
  const gates: any[] = flow.approval_gates ?? []
  const clocks: any[] = flow.sla ?? []
  const inputs: any[] = flow.inputs ?? []
  const stageMode = flow.task?.stage_execution === "stage"
  if (!stageMode && gates.length === 0 && clocks.length === 0 && inputs.length === 0) return null

  async function run(key: string, fn: () => Promise<any>, ok: string) {
    setBusy(key); setNotice(null)
    try { await fn(); setNotice({ ok: true, text: ok }); load(); onChanged?.() }
    catch (e: any) { setNotice({ ok: false, text: e?.message ?? "Não foi possível concluir." }) }
    finally { setBusy(null) }
  }
  const comment = (id: string) => (comments[id] ?? "").trim()
  const setComment = (id: string, v: string) => setComments((c) => ({ ...c, [id]: v }))
  const clear = (id: string) => setComments((c) => ({ ...c, [id]: "" }))

  return (
    <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/10" data-testid="task-stages-panel">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-indigo-700" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Andamento da tarefa por etapa</h3>
      </div>
      {notice && <p role="status" className={`rounded-md px-2.5 py-1.5 text-xs ${notice.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</p>}

      {stageMode && stages.length > 0 && (
        <ol className="space-y-2">
          {stages.map((e) => {
            const st = STAGE_STATUS_LABEL[e.status] ?? { label: e.status, tone: "bg-slate-100 text-slate-700" }
            const acts = e.can_qualify || e.can_qualify_specialist || e.can_approve || e.can_warn_client
            return (
              <li key={e.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60" data-testid={`stage-${e.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-5 min-w-5 items-center justify-center rounded bg-sky-500 px-1 text-[11px] font-bold text-white">{e.position}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{e.titulo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.tone}`}>{st.label}</span>
                  {e.interna && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">Interna (cliente não vê)</span>}
                  {e.em_paralelo && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">Fluxo configurado</span>}
                  {e.rodada_ajuste > 0 && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800">{e.rodada_ajuste} ajuste{e.rodada_ajuste > 1 ? "s" : ""}</span>}
                  {e.prazo_execucao && e.status !== "CONCLUIDA" && <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500"><Clock className="h-3 w-3" />prazo {fmtDate(e.prazo_execucao)}</span>}
                </div>
                {acts && (
                  <div className="mt-2 space-y-2">
                    {(e.can_qualify || e.can_qualify_specialist || e.can_approve) && (
                      <>
                        <textarea aria-label={`Comentário da etapa ${e.position}`} rows={2} maxLength={4000} value={comments[e.id] ?? ""} onChange={(ev) => setComment(e.id, ev.target.value)} placeholder="Comentário (obrigatório para pedir ajuste)" className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy === e.id} className={`${BTN} border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
                            onClick={() => run(e.id, () => apiClient.decideStage(taskId, e.id, tipoOf(e), "aprovar", comment(e.id) || undefined).then(() => clear(e.id)), e.can_qualify ? "Qualificação do líder aprovada." : e.can_qualify_specialist ? "Qualificação do especialista aprovada." : "Etapa aprovada.")}>
                            {busy === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{e.can_qualify ? "Aprovar qualificação" : e.can_qualify_specialist ? "Aprovar como especialista" : "Aprovar etapa"}
                          </button>
                          <button type="button" disabled={busy === e.id || comment(e.id).length < 3} title={comment(e.id).length < 3 ? "Escreva o motivo para pedir ajuste" : ""} className={`${BTN} border-red-300 bg-red-50 text-red-800 hover:bg-red-100`}
                            onClick={() => run(e.id, () => apiClient.decideStage(taskId, e.id, tipoOf(e), "reprovar", comment(e.id)).then(() => clear(e.id)), "Ajuste solicitado: a etapa voltou para o mesmo executor, com o mesmo prazo.")}>Pedir ajuste</button>
                          <button type="button" disabled={busy === e.id || !comment(e.id)} className={`${BTN} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                            onClick={() => run(e.id, () => apiClient.decideStage(taskId, e.id, tipoOf(e), "comentar", comment(e.id)).then(() => clear(e.id)), "Comentário registrado.")}>Só comentar</button>
                        </div>
                      </>
                    )}
                    {e.can_warn_client && (
                      <div className="flex flex-wrap items-center gap-2">
                        <input aria-label={`Aviso ao cliente sobre a etapa ${e.position}`} value={comments[`w${e.id}`] ?? ""} onChange={(ev) => setComment(`w${e.id}`, ev.target.value)} placeholder="Problema a avisar ao cliente (ex.: acesso enviado está errado)" className="h-8 min-w-[16rem] flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
                        <button type="button" disabled={busy === `w${e.id}` || comment(`w${e.id}`).length < 3} className={`${BTN} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100`}
                          onClick={() => run(`w${e.id}`, () => apiClient.warnStageClient(taskId, e.id, comment(`w${e.id}`)).then(() => clear(`w${e.id}`)), "O cliente foi avisado e passa a ver esta etapa.")}>Avisar o cliente</button>
                      </div>
                    )}
                  </div>
                )}
                <button type="button" className="mt-1.5 text-[11px] font-semibold text-slate-500 underline" onClick={() => apiClient.getStageHistory(taskId, e.id).then((r) => setHistory((h) => ({ ...h, [e.id]: r.data }))).catch(() => {})}>
                  Ver histórico de decisões
                </button>
                {history[e.id] && (
                  <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    {history[e.id].length === 0 && <li>Nenhuma decisão registrada ainda.</li>}
                    {history[e.id].map((h) => <li key={h.id}>{fmtDate(h.created_at)} — {h.kind === "qualificacao" ? "Qualificação do líder" : h.kind === "especialista" ? "Qualificação do especialista" : h.kind === "aprovacao" ? "Aprovação" : "Aviso ao cliente"}: <strong>{h.decision}</strong>{h.comment ? ` — ${h.comment}` : ""}</li>)}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {gates.length > 0 && (
        <section className="space-y-2" data-testid="gates-panel">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600"><ShieldCheck className="h-3.5 w-3.5" />Portões de aprovação</h4>
          {gates.map((g) => (
            <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{g.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{g.position_label}</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">{g.approver_label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${g.status === "aprovada" ? "bg-emerald-100 text-emerald-800" : g.status === "reprovada" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{g.status}</span>
              </div>
              {g.can_decide && g.status === "pendente" && (
                <div className="mt-2 space-y-1.5">
                  <textarea aria-label={`Comentário do portão ${g.name}`} rows={2} value={comments[g.id] ?? ""} onChange={(ev) => setComment(g.id, ev.target.value)} placeholder={g.requires_comment ? "Comentário (obrigatório)" : "Comentário (opcional)"} className="w-full rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900" />
                  <div className="flex gap-2">
                    <button type="button" disabled={busy === g.id || (g.requires_comment && !comment(g.id))} className={`${BTN} border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`} onClick={() => run(g.id, () => apiClient.decideApprovalGate(g.id, "approve", comment(g.id) || undefined).then(() => clear(g.id)), "Portão aprovado.")}>Aprovar</button>
                    <button type="button" disabled={busy === g.id || !comment(g.id)} className={`${BTN} border-red-300 bg-red-50 text-red-800 hover:bg-red-100`} onClick={() => run(g.id, () => apiClient.decideApprovalGate(g.id, "reject", comment(g.id)).then(() => clear(g.id)), "Portão reprovado: a tarefa voltou para a etapa de ajuste.")}>Reprovar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {clocks.length > 0 && (
        <section className="space-y-2" data-testid="sla-panel">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600"><Clock className="h-3.5 w-3.5" />Prazos (SLA)</h4>
          {clocks.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{c.scope_label}</span>
                <span className="text-slate-500">{Number(c.amount)} {c.unit_label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SLA_TONE[c.status] ?? SLA_TONE.aguardando}`}>{c.status}</span>
                {c.due_at && <span className="ml-auto text-slate-500">vence {fmtDate(c.due_at)}</span>}
              </div>
              {(c.pauses ?? []).length > 0 && <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">{c.pauses.map((p: any) => <li key={p.id}><PauseCircle className="mr-1 inline h-3 w-3" />{p.reason}{p.responsible_label ? ` · responsável: ${p.responsible_label}` : ""}{p.resolved_at ? "" : " (em andamento)"}</li>)}</ul>}
            </div>
          ))}
          {flow.viewer?.can_manage_sla && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/40">
              <label className="flex flex-col gap-0.5 font-semibold">Motivo da pausa
                <select aria-label="Motivo da pausa" value={pause.reason} onChange={(e) => setPause({ ...pause, reason: e.target.value })} className="h-8 rounded-md border border-slate-200 bg-white px-1.5 font-normal dark:border-slate-700 dark:bg-slate-900">{reasons.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
              </label>
              <label className="flex flex-col gap-0.5 font-semibold">Responsável pela pendência
                <select aria-label="Responsável pela pendência" value={pause.party} onChange={(e) => setPause({ ...pause, party: e.target.value })} className="h-8 rounded-md border border-slate-200 bg-white px-1.5 font-normal dark:border-slate-700 dark:bg-slate-900">{responsibles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>
              </label>
              <input aria-label="Observação da pausa" value={pause.note} onChange={(e) => setPause({ ...pause, note: e.target.value })} placeholder="Observação (opcional)" className="h-8 min-w-[10rem] flex-1 rounded-md border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900" />
              <button type="button" disabled={busy === "pause" || !pause.reason} className={`${BTN} border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100`} onClick={() => run("pause", () => apiClient.pauseSla(taskId, { reason: pause.reason, responsible_party: pause.party, note: pause.note || undefined }), "Prazo pausado.")}><PauseCircle className="h-3.5 w-3.5" />Pausar prazo</button>
              <button type="button" disabled={busy === "resume"} className={`${BTN} border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`} onClick={() => run("resume", () => apiClient.resumeSla(taskId), "Prazo retomado.")}><PlayCircle className="h-3.5 w-3.5" />Retomar prazo</button>
            </div>
          )}
        </section>
      )}

      {inputs.length > 0 && (
        <section className="space-y-1.5" data-testid="inputs-panel">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-600">Entradas recebidas de outros produtos</h4>
          {inputs.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900/60">
              <span className="font-semibold">{i.label}</span>
              {i.link_url ? <a href={i.link_url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">Abrir entregável de origem</a> : <span className="text-slate-500">aguardando o entregável aprovado</span>}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
