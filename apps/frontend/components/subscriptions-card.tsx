"use client"

// Assinaturas mensais contínuas (Pedido 3, fase 4): estado visível, próxima fatura e ações do cliente.
import { useCallback, useEffect, useState } from "react"
import { Loader2, Repeat } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const TONE: Record<string, string> = {
  ativa: "bg-emerald-100 text-emerald-800",
  pausada: "bg-slate-100 text-slate-700",
  cancelada: "bg-amber-100 text-amber-800",
  encerrada: "bg-slate-200 text-slate-600",
  aguardando_renovacao: "bg-blue-100 text-blue-800",
  inadimplente: "bg-red-100 text-red-800",
}
const STATUS_TIP: Record<string, string> = {
  ativa: "Tudo em dia. A próxima fatura sai uns dias antes do fim do mês pago.",
  pausada: "Sem cobrança e sem novas tarefas. O tempo já pago é devolvido quando você retomar.",
  cancelada: "Não haverá nova cobrança. O mês já pago continua valendo até o fim.",
  encerrada: "Assinatura encerrada.",
  aguardando_renovacao: "A fatura do próximo mês já foi emitida. Pague para renovar.",
  inadimplente: "A fatura venceu e não foi paga. Pague para normalizar.",
}
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const day = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—")

export function SubscriptionsCard({ className }: { className?: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const load = useCallback(() => { apiClient.listSubscriptions().then((r) => setRows(r.data)).catch(() => setRows([])) }, [])
  useEffect(() => { load() }, [load])

  async function act(id: string, action: "pause" | "resume" | "cancel" | "pay") {
    if (action === "cancel" && !window.confirm("Cancelar a assinatura? O mês já pago continua valendo até o fim e depois ela encerra.")) return
    setBusy(id + action); setMsg(null)
    try {
      const r: any = await apiClient.subscriptionAction(id, action)
      if (action === "pay") setMsg(r?.paid ? "Pagamento aprovado — o mês foi renovado." : `Pagamento não aprovado: ${r?.reason ?? "tente outro cartão"}.`)
      load()
    } catch (e: any) { setMsg(e?.message ?? "Não foi possível concluir.") } finally { setBusy(null) }
  }

  if (rows === null) return <div className={className}><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
  if (rows.length === 0) return null
  return (
    <div className={`rounded-xl border border-slate-100 bg-white p-4 shadow-sm ${className ?? ""}`}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Repeat className="h-4 w-4 text-blue-600" /> Assinaturas mensais</p>
      {msg && <p className="mb-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700" role="status">{msg}</p>}
      <ul className="space-y-2">
        {rows.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3 text-xs">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{s.product_name}</p>
              <p className="text-slate-500">{brl(s.monthly_amount)} por mês · {s.months_paid} {s.months_paid === 1 ? "mês pago" : "meses pagos"} · período até {day(s.current_period_end)}</p>
              {s.status_reason && <p className="text-slate-400">{s.status_reason}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span title={STATUS_TIP[s.status]} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE[s.status] ?? TONE.ativa}`}>{s.status_label}</span>
              {["aguardando_renovacao", "inadimplente"].includes(s.status) && s.has_open_invoice && <button type="button" disabled={!!busy} className="rounded-md bg-slate-900 px-2.5 py-1 font-semibold text-white disabled:opacity-50" onClick={() => void act(s.id, "pay")}>Pagar fatura</button>}
              {s.status === "ativa" && <button type="button" disabled={!!busy} title="Pausar cobrança e entregas" className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-700 disabled:opacity-50" onClick={() => void act(s.id, "pause")}>Pausar</button>}
              {s.status === "pausada" && <button type="button" disabled={!!busy} className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-700 disabled:opacity-50" onClick={() => void act(s.id, "resume")}>Retomar</button>}
              {["ativa", "pausada", "aguardando_renovacao", "inadimplente"].includes(s.status) && <button type="button" disabled={!!busy} className="rounded-md border border-red-200 px-2.5 py-1 text-red-700 disabled:opacity-50" onClick={() => void act(s.id, "cancel")}>Cancelar</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
