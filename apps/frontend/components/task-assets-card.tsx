"use client"

// Acessos/ativos do cliente exigidos por esta tarefa (Google Ads, Meta, Pixel, CRM…).
// A Allka (líder/admin) valida; o cliente informa mudanças. NUNCA há campo de senha:
// o cliente compartilha permissão pela própria ferramenta (convite de usuário, papel
// de acesso, parceiro/agência).
import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, KeyRound, Loader2, AlertTriangle } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  validado: "Validado",
  invalido: "Inválido",
  expirado: "Expirado",
  revalidar: "Revalidar",
}

export function TaskAssetsCard({ taskId, status, onChanged }: { taskId: string; status: string; onChanged?: () => void }) {
  const [data, setData] = useState<any>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [scope, setScope] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    apiClient.getTaskAssets(taskId).then(setData).catch(() => setData(null))
  }, [taskId])
  useEffect(() => { load() }, [load, status])

  if (!data?.applies) return null

  async function run(id: string, fn: () => Promise<any>, ok: string) {
    setBusy(id)
    setNotice(null)
    try {
      await fn()
      setNotice(ok)
      load()
      onChanged?.()
    } catch (e: any) {
      setNotice(e?.message ?? "Não foi possível registrar. Tente novamente.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/10">
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound className="h-4 w-4 text-amber-700 dark:text-amber-300" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Acessos do cliente</p>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{data.rule_label}{data.rule === "every_x_days" && data.revalidate_days ? ` (${data.revalidate_days} dias)` : ""}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Reaproveitamos os acessos já validados deste cliente. <strong>Nunca peça nem registre senha</strong> — o cliente compartilha a permissão pela própria ferramenta (convite de usuário, papel de acesso, parceiro/agência).
      </p>
      <ul className="mt-3 space-y-2">
        {data.assets.map((a: any) => (
          <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-2">
              {a.valid ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
              <span className="font-medium">{a.label}</span>
              {!a.is_required && <span className="text-[10px] text-slate-400">(opcional)</span>}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{STATUS_LABEL[a.status] ?? a.status}</span>
              {a.scope_confirmed && <span className="text-xs text-slate-500">permissão: {a.scope_confirmed}</span>}
              {a.last_validated_at && <span className="text-xs text-slate-400">validado em {new Date(a.last_validated_at).toLocaleDateString("pt-BR")}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {data.can_validate && (
                <>
                  <input
                    value={scope[a.id] ?? ""}
                    onChange={(e) => setScope({ ...scope, [a.id]: e.target.value })}
                    placeholder="Permissão confirmada (ex.: Administrador)"
                    className="h-8 w-64 rounded border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    disabled={busy === a.id || !(scope[a.id] ?? "").trim()}
                    onClick={() => run(a.id, () => apiClient.validateClientAsset(a.id, scope[a.id].trim()), "Acesso validado.")}
                    className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {busy === a.id && <Loader2 className="h-3 w-3 animate-spin" />} Validar
                  </button>
                  <button
                    disabled={busy === a.id}
                    onClick={() => run(a.id, () => apiClient.invalidateClientAsset(a.id, "Acesso inválido ou permissão removida"), "Acesso marcado como inválido — contratos dependentes pedem revalidação.")}
                    className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
                  >
                    Marcar inválido
                  </button>
                </>
              )}
              <button
                disabled={busy === a.id}
                onClick={() => run(a.id, () => apiClient.reportClientAssetChange(a.id), "Mudança informada — o acesso será revalidado.")}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
              >
                Informar mudança
              </button>
            </div>
          </li>
        ))}
      </ul>
      {notice && <p role="status" className="mt-2 text-xs font-medium text-blue-800 dark:text-blue-300">{notice}</p>}
    </div>
  )
}
