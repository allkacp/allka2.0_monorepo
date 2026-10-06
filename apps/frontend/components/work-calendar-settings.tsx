"use client"

// Calendário de trabalho da plataforma (reunião 05/10, B2): dias úteis, expediente e feriados — uma vez só, nas configurações gerais.
// Todos os prazos em horas úteis e dias úteis (SLA, prazos das etapas) usam este calendário.
import { useCallback, useEffect, useState } from "react"
import { CalendarDays, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const DAYS = [[1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"], [5, "Sex"], [6, "Sáb"], [0, "Dom"]] as const

export function WorkCalendarSettings() {
  const [cal, setCal] = useState<any>(null)
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [start, setStart] = useState("09:00")
  const [end, setEnd] = useState("17:00")
  const [hDate, setHDate] = useState("")
  const [hName, setHName] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const apply = (c: any) => { setCal(c); setDays(c.work_days); setStart(c.start_time); setEnd(c.end_time) }
  const load = useCallback(() => { apiClient.getWorkCalendar().then(apply).catch((e: any) => setMsg({ ok: false, text: e?.message ?? "Não foi possível carregar o calendário." })) }, [])
  useEffect(() => { load() }, [load])

  async function run(fn: () => Promise<any>, ok: string) {
    setBusy(true); setMsg(null)
    try { apply(await fn()); setMsg({ ok: true, text: ok }) } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar." }) } finally { setBusy(false) }
  }
  if (!cal) return <p className="text-sm text-slate-500"><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Carregando o calendário…</p>
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0) }
  const perDay = Math.max(0, toMin(end) - toMin(start)) / 60
  const dirty = JSON.stringify([...days].sort()) !== JSON.stringify([...cal.work_days].sort()) || start !== cal.start_time || end !== cal.end_time

  return (
    <div className="space-y-5" data-testid="work-calendar-settings">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="mb-3 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-violet-700" /><h3 className="text-sm font-bold">Dias úteis e expediente</h3></div>
        <p className="mb-3 text-xs text-slate-500">Vale para todos os produtos: prazos em horas úteis e em dias úteis contam só dentro deste calendário.</p>
        <div className="flex flex-wrap items-center gap-2">
          {DAYS.map(([n, label]) => (
            <label key={n} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${days.includes(n) ? "border-violet-400 bg-violet-50 font-semibold text-violet-800" : "border-slate-200 text-slate-600"}`}>
              <input type="checkbox" aria-label={`Dia útil: ${label}`} checked={days.includes(n)} onChange={(e) => setDays((d) => (e.target.checked ? [...d, n] : d.filter((x) => x !== n)))} />{label}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1 text-xs font-semibold">Início do expediente<Input aria-label="Início do expediente" type="time" className="h-9 w-32" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="flex flex-col gap-1 text-xs font-semibold">Fim do expediente<Input aria-label="Fim do expediente" type="time" className="h-9 w-32" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          <span className="pb-2 text-xs text-slate-600">1 dia útil = <strong>{perDay.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h</strong></span>
          <Button disabled={busy || !dirty || days.length === 0 || perDay < 1} onClick={() => void run(() => apiClient.saveWorkCalendar({ work_days: days, start_time: start, end_time: end }), "Calendário salvo.")}><Save className="mr-1.5 h-4 w-4" />Salvar calendário</Button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <h3 className="mb-2 text-sm font-bold">Feriados</h3>
        <ul className="mb-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {cal.holidays.length === 0 && <li className="py-2 text-slate-500">Nenhum feriado cadastrado.</li>}
          {cal.holidays.map((h: any) => (
            <li key={h.id} className="flex items-center gap-3 py-1.5">
              <span className="w-28 font-mono text-xs">{h.date.split("-").reverse().join("/")}</span><span className="flex-1">{h.name}</span>
              <button type="button" aria-label={`Excluir feriado ${h.name}`} className="text-red-500 hover:text-red-700" onClick={() => void run(() => apiClient.deleteHoliday(h.id), "Feriado removido.")}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold">Data<Input aria-label="Data do feriado" type="date" className="h-9 w-40" value={hDate} onChange={(e) => setHDate(e.target.value)} /></label>
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs font-semibold">Nome<Input aria-label="Nome do feriado" className="h-9" value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Ex.: Proclamação da República" /></label>
          <Button variant="outline" disabled={busy || !hDate || hName.trim().length < 2} onClick={() => void run(() => apiClient.addHoliday({ date: hDate, name: hName.trim() }), "Feriado cadastrado.").then(() => { setHDate(""); setHName("") })}><Plus className="mr-1.5 h-4 w-4" />Adicionar feriado</Button>
        </div>
      </section>
      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  )
}
