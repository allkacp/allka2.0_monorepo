"use client"

import { withScreenHelp } from "@/components/with-screen-help"
import { PLAC_HELP } from "@/lib/screen-help"
// Configuração dos 13 passos PLAC (modelo único da plataforma): quem faz, quando (D+N), para quem vale, 4F e responsáveis internos de cobrança.
import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const SEL = "h-8 rounded-md border border-slate-300 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
const ROLES: [string, string][] = [["vc", "Consultor (VC)"], ["ac", "Assistente Consultiva (AC)"], ["other", "Outro"]]
const PHASES: [string, string][] = [["inicio", "Início do contrato"], ["mensal", "Mensal"], ["fim", "Fim do ciclo"]]
const REPEATS: [string, string][] = [["none", "Não repete"], ["monthly", "Todo mês"], ["end_of_cycle", "Fim de cada ciclo"]]
const AUD: [string, string][] = [["company", "Company"], ["agency", "Agency (sem partner)"], ["partner", "Agency Partner"]]

function Row({ t, all, users, fourFs, onChanged, onError }: { t: any; all: any[]; users: any[]; fourFs: any[]; onChanged: () => void; onError: (m: string) => void }) {
  const [f, setF] = useState<any>(t)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setF(t) }, [JSON.stringify(t)]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(f) !== JSON.stringify(t)
  const set = (p: any) => setF((c: any) => ({ ...c, ...p }))
  const toggle = (k: string, v: string, on: boolean) => set({ [k]: on ? [...f[k], v] : f[k].filter((x: string) => x !== v) })
  const save = async () => {
    setBusy(true)
    try {
      await apiClient.updatePlacTemplate(t.key, { name: f.name, description: f.description || null, role: f.role, phase: f.phase, after_key: f.after_key || null, offset_days: Number(f.offset_days) || 0, estimated_hours: f.estimated_hours === "" || f.estimated_hours == null ? null : Number(f.estimated_hours), hourly_cost: f.hourly_cost === "" || f.hourly_cost == null ? null : Number(f.hourly_cost), repeat_rule: f.repeat_rule, audiences: f.audiences, four_f_ids: f.four_f_ids, internal_user_ids: f.internal_user_ids, is_active: f.is_active, order: Number(f.order) || 0 })
      onChanged()
    } catch (e: any) { onError(e?.message ?? "Não foi possível salvar o passo.") } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!window.confirm(`Excluir o passo "${t.name}" do modelo? Projetos que já abriram o passo não são alterados.`)) return
    setBusy(true)
    try { await apiClient.deletePlacTemplate(t.key); onChanged() } catch (e: any) { onError(e?.message ?? "Não foi possível excluir.") } finally { setBusy(false) }
  }
  return (
    <li className={`rounded-xl border bg-white p-3 text-xs shadow-sm dark:bg-slate-900 ${f.is_active ? "border-slate-200 dark:border-slate-700" : "border-slate-200 opacity-60"}`} data-testid={`plac-tpl-${t.key}`}>
      <div className="grid gap-2 md:grid-cols-[3.5rem_1fr_11rem_10rem]">
        <label className="font-semibold text-slate-600">Ordem<Input aria-label="Ordem" type="number" className="mt-0.5 h-8 text-xs" value={f.order} onChange={(e) => set({ order: e.target.value })} /></label>
        <label className="font-semibold text-slate-600">Nome do passo<Input aria-label="Nome do passo" className="mt-0.5 h-8 text-xs" value={f.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <label className="font-semibold text-slate-600">Quem faz<select aria-label="Quem faz" className={`${SEL} mt-0.5 w-full`} value={f.role} onChange={(e) => set({ role: e.target.value })}>{ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="font-semibold text-slate-600">Etapa do contrato<select aria-label="Fase" className={`${SEL} mt-0.5 w-full`} value={f.phase} onChange={(e) => set({ phase: e.target.value })}>{PHASES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <label className="mt-2 block font-semibold text-slate-600">O que acontece neste passo<textarea aria-label="Descrição do passo" rows={2} className="mt-0.5 w-full rounded-md border border-slate-300 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={f.description ?? ""} onChange={(e) => set({ description: e.target.value })} /></label>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <label className="font-semibold text-slate-600">Prazo conta a partir de<select aria-label="Conta a partir de" className={`${SEL} mt-0.5 w-full`} value={f.after_key ?? ""} onChange={(e) => set({ after_key: e.target.value || null })}><option value="">Pagamento do contrato</option>{all.filter((x) => x.key !== t.key).map((x) => <option key={x.key} value={x.key}>Depois do passo: {x.name}</option>)}</select></label>
        <label className="font-semibold text-slate-600">D+ (dias depois)<Input aria-label="Dias depois" type="number" min={0} step="0.5" className="mt-0.5 h-8 text-xs" value={f.offset_days} onChange={(e) => set({ offset_days: e.target.value })} /></label>
        <label className="font-semibold text-slate-600">Horas previstas<Input aria-label="Horas previstas" type="number" min={0} step="0.05" className="mt-0.5 h-8 text-xs" value={f.estimated_hours ?? ""} onChange={(e) => set({ estimated_hours: e.target.value })} /></label>
        <label className="font-semibold text-slate-600">Custo/hora (R$)<Input aria-label="Custo por hora" type="number" min={0} className="mt-0.5 h-8 text-xs" value={f.hourly_cost ?? ""} onChange={(e) => set({ hourly_cost: e.target.value })} /></label>
        <label className="font-semibold text-slate-600">Repetição (informativa)<select aria-label="Repetição" className={`${SEL} mt-0.5 w-full`} value={f.repeat_rule} onChange={(e) => set({ repeat_rule: e.target.value })}>{REPEATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold text-slate-600">Para quem vale:</span>
        <label className="inline-flex items-center gap-1"><input type="checkbox" aria-label="Todos" checked={f.audiences.length === 0} onChange={() => set({ audiences: [] })} />Todos</label>
        {AUD.map(([k, l]) => <label key={k} className="inline-flex items-center gap-1"><input type="checkbox" aria-label={l} checked={f.audiences.includes(k)} onChange={(e) => toggle("audiences", k, e.target.checked)} />{l}</label>)}
      </div>
      {fourFs.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-slate-600">Classificação 4F (vazio = todas):</span>
          {fourFs.map((x) => <label key={x.id} className="inline-flex items-center gap-1"><input type="checkbox" checked={f.four_f_ids.includes(x.id)} onChange={(e) => toggle("four_f_ids", x.id, e.target.checked)} />{x.name}</label>)}
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-slate-600">Cobrança interna (quem acompanha e cobra):</span>
        {users.length === 0 ? <span className="text-slate-400">nenhum usuário interno encontrado</span> : users.map((u) => <label key={u.id} className="inline-flex items-center gap-1"><input type="checkbox" checked={f.internal_user_ids.includes(u.id)} onChange={(e) => toggle("internal_user_ids", u.id, e.target.checked)} />{u.name}</label>)}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.is_active} onChange={(e) => set({ is_active: e.target.checked })} />Ativo</label>
        <Button size="sm" className="ml-auto h-8" disabled={!dirty || busy} onClick={() => void save()}>{busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}Salvar passo</Button>
        <Button size="sm" variant="outline" className="h-8 text-red-600" disabled={busy} aria-label={`Excluir ${t.name}`} onClick={() => void remove()}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </li>
  )
}

function PlacSettingsBase() {
  const [rows, setRows] = useState<any[] | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [fourFs, setFourFs] = useState<any[]>([])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const load = useCallback(() => {
    Promise.all([apiClient.getPlacTemplates(), apiClient.getPlacInternalUsers()]).then(([t, u]: any[]) => { setRows(t.data); setFourFs(t.four_fs ?? []); setUsers(u.data ?? []) }).catch((e: any) => setMsg({ ok: false, text: e?.message ?? "Não foi possível carregar os passos PLAC." }))
  }, [])
  useEffect(() => { load() }, [load])
  const add = async () => {
    try { await apiClient.createPlacTemplate({ name: "Novo passo", role: "ac", phase: "inicio", offset_days: 1, audiences: [] }); setMsg({ ok: true, text: "Passo criado. Ajuste os detalhes e salve." }); load() } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível criar." }) }
  }
  return (
    <div className="space-y-3" data-testid="plac-settings">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-bold">PLAC — cronograma de 13 passos</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Quando um projeto é <strong>pago</strong>, estes passos abrem sozinhos no projeto, com prazo contado do pagamento (D+N dias, de forma encadeada). Aqui você ajusta quem faz cada passo, os prazos, para quem vale (Company, Agency, Agency Partner), a classificação 4F e quem, internamente, acompanha e cobra. As mudanças valem para os próximos projetos pagos; nos já abertos você ajusta o prazo e a cobrança dentro do projeto. Os prazos iniciais são uma sugestão, edite à vontade.</p>
        <div className="mt-2"><Button size="sm" onClick={() => void add()}><Plus className="mr-1 h-4 w-4" />Novo passo</Button></div>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 rounded px-2 py-1 text-xs font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      </div>
      {!rows ? <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p> : (
        <ol className="space-y-2">{rows.map((t) => <Row key={t.key} t={t} all={rows} users={users} fourFs={fourFs} onChanged={load} onError={(m) => setMsg({ ok: false, text: m })} />)}</ol>
      )}
    </div>
  )
}

export const PlacSettings = withScreenHelp(PlacSettingsBase, PLAC_HELP)
