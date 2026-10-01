"use client"

// IA na tarefa contratada (Pedido 3, fase 5): aciona a IA (se o perfil estiver autorizado), mostra o que ela fez
// e deixa o humano adotar (com edição) ou descartar. Nada segue sem essa confirmação nos modos que a exigem.
import { useCallback, useEffect, useState } from "react"
import { Bot, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const MODE_LABEL: Record<string, string> = { autonoma: "Executa sozinha", rascunho: "Rascunho para um humano", auxilia: "Auxilia o humano" }
const STATUS_LABEL: Record<string, string> = { gerada: "Aguardando decisão", adotada: "Adotada", descartada: "Descartada", erro: "Erro", encaminhada: "Encaminhada a um humano" }
const STATUS_TONE: Record<string, string> = {
  gerada: "bg-blue-100 text-blue-800", adotada: "bg-emerald-100 text-emerald-800", descartada: "bg-slate-200 text-slate-600", erro: "bg-red-100 text-red-800", encaminhada: "bg-amber-100 text-amber-800",
}
const brl = (n: number) => `R$ ${n.toFixed(4).replace(".", ",")}`

function RunRow({ taskId, run, mode, onDone }: { taskId: string; run: any; mode: string; onDone: () => void }) {
  const [text, setText] = useState<string>(run.output_text ?? "")
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function go(fn: () => Promise<unknown>) {
    setBusy(true); setErr(null)
    try { await fn(); onDone() } catch (e: any) { setErr(e?.message ?? "Não foi possível concluir.") } finally { setBusy(false) }
  }
  return (
    <li className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{new Date(run.created_at).toLocaleString("pt-BR")}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_TONE[run.status] ?? STATUS_TONE.gerada}`}>{STATUS_LABEL[run.status] ?? run.status}</span>
        <span className="text-[10px] text-slate-400">{run.profile_name} · prompt v{run.prompt_version} · {run.prompt_tokens + run.completion_tokens} tokens{run.cost != null ? ` · ${brl(run.cost)}` : ""}</span>
      </div>
      {run.missing_info && <p className="text-amber-700">Faltou informação: {run.missing_info.split("\n").join("; ")}</p>}
      {run.error_message && <p className="text-red-700">{run.error_message}</p>}
      {run.output_text && (run.status === "gerada" && mode !== "auxilia"
        ? <textarea className="min-h-[6rem] w-full rounded border border-slate-300 bg-transparent px-2 py-1" value={text} onChange={(e) => setText(e.target.value)} />
        : <p className="whitespace-pre-wrap rounded bg-slate-50 p-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{run.output_text}</p>)}
      {run.decision_note && <p className="text-slate-500">{run.decision_note}</p>}
      {run.status === "gerada" && (
        <div className="flex flex-wrap gap-1.5">
          {mode !== "auxilia" && <button type="button" disabled={busy} className="rounded-md bg-emerald-600 px-3 py-1 font-semibold text-white disabled:opacity-50" onClick={() => void go(() => apiClient.adoptAIRun(taskId, run.id, text))}>Adotar como entregável</button>}
          <button type="button" disabled={busy} className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 disabled:opacity-50" onClick={() => void go(() => apiClient.discardAIRun(taskId, run.id))}>Descartar</button>
        </div>
      )}
      <button type="button" className="text-[11px] text-slate-400 underline" onClick={() => setOpen((v) => !v)}>{open ? "Ocultar detalhes" : "Ver instruções, contexto e entradas usados"}</button>
      {open && (
        <div className="space-y-1 rounded bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <p className="font-semibold">Instruções</p><p className="whitespace-pre-wrap">{run.instructions}</p>
          <p className="font-semibold">Contexto</p><p className="whitespace-pre-wrap">{run.context_text}</p>
          <p className="font-semibold">Entradas</p><p className="whitespace-pre-wrap">{Object.keys(run.inputs ?? {}).length ? Object.entries(run.inputs).map(([k, v]) => `${k}: ${v}`).join("\n") : "—"}</p>
          <p className="text-slate-400">Modelo: {run.model} · {run.adapter === "simulado" ? "simulado (teste)" : "real"} · {run.duration_ms ?? 0} ms</p>
        </div>
      )}
      {err && <p role="alert" className="text-red-600">{err}</p>}
    </li>
  )
}

export function TaskAICard({ taskId, status, className }: { taskId: string; status?: string; className?: string }) {
  const [data, setData] = useState<any | null | undefined>(undefined)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [costs, setCosts] = useState<any | null>(null)
  const load = useCallback(() => {
    apiClient.getTaskAI(taskId).then(setData).catch(() => setData(null))
    apiClient.getTaskCosts(taskId).then(setCosts).catch(() => setCosts(null)) // só líder/administração recebem
  }, [taskId])
  useEffect(() => { load() }, [load, status])
  if (data === undefined) return <div className={className}><Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /></div>
  if (!data?.config) return null
  const c = data.config

  async function run() {
    setBusy(true); setMsg(null)
    try {
      const r: any = await apiClient.runTaskAI(taskId, { note: note.trim() || undefined })
      setMsg(r.forwarded ? `A IA encaminhou para um humano: ${r.reason}` : c.mode === "autonoma" ? "A IA executou a etapa. A entrega segue para a revisão humana." : "Rascunho gerado — confira e decida abaixo.")
      setNote(""); load()
    } catch (e: any) { setMsg(e?.message ?? "Não foi possível acionar a IA.") } finally { setBusy(false) }
  }
  return (
    <div className={`rounded-xl border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900/50 dark:bg-violet-950/10 ${className ?? ""}`}>
      <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><Bot className="h-4 w-4 text-violet-700" /> IA da tarefa
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">{MODE_LABEL[c.mode] ?? c.mode}</span>
        <span className="text-[10px] font-normal text-slate-400">{c.profile_name} · prompt v{c.prompt_version}</span>
      </p>
      <p className="mb-2 text-[11px] text-slate-500">A IA só escreve texto — nada é publicado ou enviado por ela. {c.mode === "autonoma" ? "A entrega passa pela revisão humana." : c.mode === "rascunho" ? "Um humano precisa adotar o rascunho." : "As sugestões ficam só registradas."}</p>
      {costs && (costs.ai.runs > 0 || costs.review.spent_minutes > 0) && (
        <p className="mb-2 rounded bg-white px-2 py-1 text-[11px] text-slate-600">
          Custos até agora: IA {costs.ai.runs} execução(ões), {costs.ai.tokens_in + costs.ai.tokens_out} tokens, <strong>{brl(costs.ai.cost)}</strong>
          {costs.review.spent_minutes > 0 && <> · revisão {costs.review.spent_minutes} min{costs.review.planned_minutes != null ? ` (previsto ${costs.review.planned_minutes})` : ""}{costs.review.estimated_cost != null ? `, ${brl(costs.review.estimated_cost)}` : ""}</>}
        </p>
      )}
      {c.can_run ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          <input className="h-8 min-w-[12rem] flex-1 rounded border border-slate-300 bg-transparent px-2 text-xs" placeholder="Pedido extra para a IA (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" disabled={busy} className="rounded-md bg-violet-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50" onClick={() => void run()}>{busy ? "Rodando…" : c.mode === "autonoma" ? "Executar com IA" : c.mode === "auxilia" ? "Pedir sugestão" : "Gerar rascunho"}</button>
        </div>
      ) : <p className="mb-2 text-[11px] text-slate-500">{c.active ? "Seu perfil não está autorizado a acionar a IA nesta tarefa." : "O perfil de IA desta tarefa está desativado."}</p>}
      {msg && <p className="mb-2 rounded bg-white px-2 py-1 text-xs text-slate-700" role="status">{msg}</p>}
      {data.runs.length > 0 && <ul className="space-y-2">{data.runs.map((r: any) => <RunRow key={r.id} taskId={taskId} run={r} mode={c.mode} onDone={load} />)}</ul>}
    </div>
  )
}
