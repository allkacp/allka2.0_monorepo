"use client"

import { withScreenHelp } from "@/components/with-screen-help"
import { INTERNAL_TASKS_HELP } from "@/lib/screen-help"
// D2 — Tarefas internas da conta: quadro (A fazer / Fazendo / Bloqueada / Feita) com responsável, prazo, checklist e comentários.
import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarClock, ListChecks, Loader2, MessageSquare, Plus, Trash2, User } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

const COLUMNS: { key: string; label: string; tone: string }[] = [
  { key: "todo", label: "A fazer", tone: "border-t-slate-400" }, { key: "doing", label: "Fazendo", tone: "border-t-sky-500" },
  { key: "blocked", label: "Bloqueada", tone: "border-t-amber-500" }, { key: "done", label: "Feita", tone: "border-t-emerald-500" },
]
const PRIORITY: Record<string, { label: string; tone: string }> = {
  low: { label: "Baixa", tone: "bg-slate-100 text-slate-700" }, medium: { label: "Média", tone: "bg-sky-100 text-sky-800" },
  high: { label: "Alta", tone: "bg-orange-100 text-orange-800" }, urgent: { label: "Urgente", tone: "bg-red-100 text-red-800" },
}
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "")
const toInput = (d?: string | null) => (d ? new Date(d).toISOString().slice(0, 10) : "")

export function groupByStatus(tasks: any[]) {
  const out: Record<string, any[]> = { todo: [], doing: [], blocked: [], done: [] }
  for (const t of tasks) (out[t.status] ??= []).push(t)
  return out
}

function TaskDialog({ task, members, onClose, onSaved, canDelete }: { task: any; members: any[]; onClose: () => void; onSaved: () => void; canDelete: boolean }) {
  const isNew = !task.id
  const [f, setF] = useState<any>({ title: task.title ?? "", description: task.description ?? "", priority: task.priority ?? "medium", due: toInput(task.due_date), assignee: task.assignee_user_id ?? "", status: task.status ?? "todo", checklist: task.checklist ?? [] })
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [newItem, setNewItem] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { if (task.id) apiClient.getInternalTaskComments(task.id).then((r: any) => setComments(r.data ?? [])).catch(() => {}) }, [task.id])
  const set = (p: any) => setF((c: any) => ({ ...c, ...p }))
  const save = async () => {
    setBusy(true); setErr(null)
    const body = { title: f.title.trim(), description: f.description.trim() || null, priority: f.priority, status: f.status, due_date: f.due ? new Date(`${f.due}T12:00:00`).toISOString() : null, assignee_user_id: f.assignee || null, checklist: f.checklist.map((c: any) => ({ id: c.id, text: c.text, done: !!c.done })), ...(task.agency_id ? { agency_id: task.agency_id } : task.company_id ? { company_id: task.company_id } : {}) }
    try { if (isNew) await apiClient.createInternalTask(body); else await apiClient.updateInternalTask(task.id, body); onSaved() } catch (e: any) { setErr(e?.message ?? "Não foi possível salvar.") } finally { setBusy(false) }
  }
  const remove = async () => { if (!window.confirm("Excluir esta tarefa?")) return; try { await apiClient.deleteInternalTask(task.id); onSaved() } catch (e: any) { setErr(e?.message ?? "Não foi possível excluir.") } }
  const comment = async () => { if (!newComment.trim()) return; try { await apiClient.addInternalTaskComment(task.id, newComment.trim()); setNewComment(""); const r: any = await apiClient.getInternalTaskComments(task.id); setComments(r.data ?? []) } catch (e: any) { setErr(e?.message ?? "Não foi possível comentar.") } }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto sm:max-w-2xl" data-testid="internal-task-dialog">
        <DialogTitle className="text-base">{isNew ? "Nova tarefa interna" : "Tarefa interna"}{task.source_kind === "plac_step" ? " · passo PLAC" : ""}</DialogTitle>
        <div className="space-y-3 text-xs">
          <label className="block font-semibold text-slate-600">Título<Input aria-label="Título da tarefa" className="mt-0.5 h-9" value={f.title} onChange={(e) => set({ title: e.target.value })} /></label>
          <label className="block font-semibold text-slate-600">Descrição<textarea aria-label="Descrição da tarefa" rows={3} className="mt-0.5 w-full rounded-md border border-slate-300 bg-white p-2 text-xs" value={f.description} onChange={(e) => set({ description: e.target.value })} /></label>
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="font-semibold text-slate-600">Status<select aria-label="Status" className="mt-0.5 h-9 w-full rounded-md border border-slate-300 bg-white px-2" value={f.status} onChange={(e) => set({ status: e.target.value })}>{COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
            <label className="font-semibold text-slate-600">Prioridade<select aria-label="Prioridade" className="mt-0.5 h-9 w-full rounded-md border border-slate-300 bg-white px-2" value={f.priority} onChange={(e) => set({ priority: e.target.value })}>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
            <label className="font-semibold text-slate-600">Prazo<input aria-label="Prazo" type="date" className="mt-0.5 h-9 w-full rounded-md border border-slate-300 px-2" value={f.due} onChange={(e) => set({ due: e.target.value })} /></label>
            <label className="font-semibold text-slate-600">Responsável<select aria-label="Responsável" className="mt-0.5 h-9 w-full rounded-md border border-slate-300 bg-white px-2" value={f.assignee} onChange={(e) => set({ assignee: e.target.value })}><option value="">Sem responsável</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          </div>
          <fieldset className="rounded-lg border border-slate-200 p-2"><legend className="px-1 font-semibold text-slate-600">Checklist</legend>
            <ul className="space-y-1">{f.checklist.map((c: any, i: number) => (
              <li key={c.id || i} className="flex items-center gap-2"><input type="checkbox" checked={!!c.done} onChange={(e) => set({ checklist: f.checklist.map((x: any, j: number) => (j === i ? { ...x, done: e.target.checked } : x)) })} /><span className={`flex-1 ${c.done ? "text-slate-400 line-through" : ""}`}>{c.text}</span><button type="button" aria-label="Remover item" className="text-red-500" onClick={() => set({ checklist: f.checklist.filter((_: any, j: number) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></button></li>
            ))}</ul>
            <div className="mt-1 flex gap-1"><Input aria-label="Novo item do checklist" className="h-8" placeholder="Novo item" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { set({ checklist: [...f.checklist, { text: newItem.trim(), done: false }] }); setNewItem("") } }} /><Button type="button" size="sm" variant="outline" className="h-8" onClick={() => { if (newItem.trim()) { set({ checklist: [...f.checklist, { text: newItem.trim(), done: false }] }); setNewItem("") } }}><Plus className="h-3.5 w-3.5" /></Button></div>
          </fieldset>
          {!isNew && (
            <fieldset className="rounded-lg border border-slate-200 p-2"><legend className="px-1 font-semibold text-slate-600">Comentários</legend>
              <ul className="space-y-1">{comments.map((c) => <li key={c.id} className="rounded bg-slate-50 px-2 py-1"><span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString("pt-BR")}</span><br />{c.body}</li>)}{comments.length === 0 && <li className="text-slate-400">Sem comentários.</li>}</ul>
              <div className="mt-1 flex gap-1"><Input aria-label="Novo comentário" className="h-8" placeholder="Escreva um comentário" value={newComment} onChange={(e) => setNewComment(e.target.value)} /><Button type="button" size="sm" variant="outline" className="h-8" onClick={() => void comment()}>Comentar</Button></div>
            </fieldset>
          )}
          {err && <p role="alert" className="rounded bg-red-50 px-2 py-1 text-red-700">{err}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy || f.title.trim().length < 2} onClick={() => void save()} data-testid="save-internal-task">{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}{isNew ? "Criar tarefa" : "Salvar"}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancelar</Button>
            {!isNew && canDelete && <Button type="button" size="sm" variant="outline" className="ml-auto text-red-600" onClick={() => void remove()}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Quadro. Para a administração, passe `scope` ({ agency_id } ou { company_id }) para criar/ver de uma conta; sem scope lista tudo (sem criar). */
function InternalTasksBoardBase({ scope, adminMode = false }: { scope?: { agency_id?: string; company_id?: string }; adminMode?: boolean }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [state, setState] = useState<"loading" | "ok" | "blocked" | "error">("loading")
  const [msg, setMsg] = useState<string | null>(null)
  const [mine, setMine] = useState(false)
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<any | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const params = useMemo(() => scope ?? {}, [scope])
  const load = useCallback(async () => {
    try {
      const [l, s, m]: any[] = await Promise.all([apiClient.getInternalTasks({ ...params, ...(mine ? { mine: "1" } : {}) }), apiClient.getInternalTasksSummary(params), apiClient.getInternalTaskMembers(params)])
      setTasks(l.data ?? []); setSummary(s); setMembers(m.data ?? []); setState("ok")
    } catch (e: any) { setMsg(e?.message ?? "Não foi possível carregar."); setState(e?.status === 403 || /liberado/i.test(e?.message ?? "") ? "blocked" : "error") }
  }, [params, mine])
  useEffect(() => { void load() }, [load])
  const nameOf = (id?: string | null) => members.find((m) => m.id === id)?.name ?? ""
  const move = async (t: any, status: string) => { if (t.status === status) return; try { await apiClient.updateInternalTask(t.id, { status, ...(t.agency_id ? { agency_id: t.agency_id } : {}) }); void load() } catch (e: any) { setMsg(e?.message ?? "Não foi possível mover.") } }
  const shown = tasks.filter((t) => !q.trim() || `${t.title} ${t.description ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
  const cols = groupByStatus(shown)
  const canCreate = !adminMode || !!(scope?.agency_id || scope?.company_id)
  if (state === "loading") return <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>
  if (state === "blocked") return <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Este módulo ainda não está liberado para a sua conta. A administração define quem pode usar.</p>
  if (state === "error") return <p role="alert" className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{msg}</p>
  return (
    <div className="space-y-3" data-testid="internal-tasks-board">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          {[["Abertas", summary?.open], ["Atrasadas", summary?.late], ["Vencem em 3 dias", summary?.due_soon], ["Minhas", summary?.mine]].map(([k, v]) => (
            <span key={k as string} className={`rounded-lg px-2.5 py-1 font-semibold ${k === "Atrasadas" && Number(v) > 0 ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}>{k}: {v ?? 0}</span>
          ))}
        </div>
        <Input aria-label="Buscar tarefa" className="ml-auto h-8 w-48 text-xs" placeholder="Buscar tarefa" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />Só as minhas</label>
        {canCreate && <Button size="sm" onClick={() => setOpen({ agency_id: scope?.agency_id, company_id: scope?.company_id })} data-testid="new-internal-task"><Plus className="mr-1 h-4 w-4" />Nova tarefa</Button>}
      </div>
      {msg && <p role="alert" className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{msg}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((c) => (
          <section key={c.key} className={`min-h-[8rem] rounded-xl border border-t-4 bg-slate-50 p-2 ${c.tone}`} onDragOver={(e) => e.preventDefault()} onDrop={() => { const t = tasks.find((x) => x.id === drag); if (t) void move(t, c.key); setDrag(null) }} data-testid={`col-${c.key}`}>
            <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-bold text-slate-700">{c.label}<span className="rounded-full bg-white px-1.5 text-[10px] text-slate-500">{cols[c.key]?.length ?? 0}</span></h3>
            <ul className="space-y-2">
              {(cols[c.key] ?? []).map((t) => {
                const done = t.checklist.filter((x: any) => x.done).length
                return (
                  <li key={t.id} draggable onDragStart={() => setDrag(t.id)} onClick={() => setOpen(t)} className={`cursor-pointer rounded-lg border bg-white p-2 text-xs shadow-sm hover:border-violet-300 ${t.overdue ? "border-red-300" : "border-slate-200"}`} data-testid={`task-${t.id}`}>
                    <div className="flex items-start gap-1.5"><p className="flex-1 font-semibold text-slate-900">{t.title}</p><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY[t.priority]?.tone ?? ""}`}>{PRIORITY[t.priority]?.label}</span></div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                      {t.due_date && <span className={`inline-flex items-center gap-1 ${t.overdue ? "font-semibold text-red-600" : ""}`}><CalendarClock className="h-3 w-3" />{fmt(t.due_date)}</span>}
                      {t.assignee_user_id && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{nameOf(t.assignee_user_id) || "responsável"}</span>}
                      {t.checklist.length > 0 && <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{done}/{t.checklist.length}</span>}
                      {t.source_kind === "plac_step" && <span className="rounded bg-violet-100 px-1 text-violet-800">PLAC</span>}
                    </div>
                    <select aria-label={`Mover ${t.title}`} className="mt-1.5 h-6 w-full rounded border border-slate-200 bg-white px-1 text-[11px]" value={t.status} onClick={(e) => e.stopPropagation()} onChange={(e) => void move(t, e.target.value)}>{COLUMNS.map((x) => <option key={x.key} value={x.key}>Mover para: {x.label}</option>)}</select>
                  </li>
                )
              })}
              {(cols[c.key] ?? []).length === 0 && <li className="px-1 py-3 text-center text-[11px] text-slate-400">Nada aqui.</li>}
            </ul>
          </section>
        ))}
      </div>
      {open && <TaskDialog task={open} members={members} canDelete onClose={() => setOpen(null)} onSaved={() => { setOpen(null); void load() }} />}
    </div>
  )
}

export const InternalTasksBoard = withScreenHelp(InternalTasksBoardBase, INTERNAL_TASKS_HELP)
