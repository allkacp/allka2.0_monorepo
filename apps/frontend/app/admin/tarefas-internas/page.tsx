"use client"

// Administração: define quem pode usar as tarefas internas e acompanha as de todas as contas (ou de uma conta escolhida).
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InternalTasksBoard } from "@/components/internal-tasks-board"
import { StandardScreen } from "@/components/standard-screen"
import { ClipboardList } from "lucide-react"


const AUD: [string, string][] = [["company", "Company"], ["agency", "Agency (sem partner)"], ["partner", "Agency Partner"]]

export default function AdminInternalTasksPage() {
  const [s, setS] = useState<any>(null)
  const [aud, setAud] = useState<string[]>([])
  const [auto, setAuto] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [filter, setFilter] = useState("")
  const [scope, setScope] = useState<{ agency_id?: string; company_id?: string } | undefined>(undefined)
  useEffect(() => { apiClient.getInternalTaskSettings().then((r: any) => { setS(r); setAud(r.audiences ?? []); setAuto(!!r.auto_from_plac) }).catch((e: any) => setMsg({ ok: false, text: e?.message ?? "Não foi possível carregar." })) }, [])
  const save = async () => {
    try { const r: any = await apiClient.saveInternalTaskSettings({ audiences: aud, auto_from_plac: auto }); setS(r); setMsg({ ok: true, text: "Configuração salva." }) } catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível salvar." }) }
  }
  const apply = () => { const v = filter.trim(); if (!v) { setScope(undefined); return } setScope(v.startsWith("emp_") || v.startsWith("co_") ? { company_id: v } : { agency_id: v }) }
  return (
    <StandardScreen icon={ClipboardList} title="Tarefas internas" description="Quadro de tarefas da equipe de cada agência (ou empresa). Aqui você define quem pode usar e acompanha tudo.">
      <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="internal-tasks-settings">
        <h2 className="text-sm font-bold">Quem pode usar</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {AUD.map(([k, l]) => <label key={k} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={aud.includes(k)} onChange={(e) => setAud(e.target.checked ? [...aud, k] : aud.filter((x) => x !== k))} />{l}</label>)}
          <span className="text-slate-500">(nenhuma marcada = todos)</span>
        </div>
        <label className="mt-2 flex items-center gap-1.5 text-xs"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />Passos do PLAC viram tarefa interna sozinhos (quando o projeto é pago)</label>
        <div className="mt-2 flex items-center gap-2"><Button size="sm" onClick={() => void save()}>Salvar</Button>{msg && <span role={msg.ok ? "status" : "alert"} className={`text-xs font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}</div>
      </section>
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold">Ver uma conta:</span><Input aria-label="ID da agência ou empresa" className="h-8 w-72 text-xs" placeholder="ID da agência (vazio = todas as contas)" value={filter} onChange={(e) => setFilter(e.target.value)} /><Button size="sm" variant="outline" onClick={apply}>Aplicar</Button></div>
        <InternalTasksBoard key={JSON.stringify(scope ?? {})} scope={scope} adminMode />
      </section>
      </div>
    </StandardScreen>
  )
}
