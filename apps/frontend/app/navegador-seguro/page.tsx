"use client"

// Navegador seguro — uma tela para todos os perfis: dono da conta (agência/empresa) guarda contas e autoriza; nômade/líder abrem os acessos recebidos;
// administração acompanha e derruba sessões.
import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { SecureBrowserHub, fmtRemaining } from "@/components/secure-browser-hub"
import { StandardScreen } from "@/components/standard-screen"
import { Lock } from "lucide-react"


export function SecureBrowserPage({ canCreate = true }: { canCreate?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  return (
    <StandardScreen icon={Lock} title="Navegador seguro" description={info ?? "Acesso a contas de clientes por tempo determinado, sem expor senhas."} hideBanner={expanded} fill>
      <div className="h-full min-h-0 overflow-y-auto"><SecureBrowserHub canCreate={canCreate} onExpandedChange={setExpanded} onViewerInfo={setInfo} /></div>
    </StandardScreen>
  )
}

export function AdminSecureBrowserPage() {
  const [expanded, setExpanded] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [active, setActive] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)
  const load = () => apiClient.getSecureBrowserActiveSessions().then((r: any) => setActive(r.data)).catch((e: any) => setErr(e?.message ?? "Não foi possível carregar."))
  useEffect(() => { void load(); const t = setInterval(() => void load(), 15000); return () => clearInterval(t) }, [])
  return (
    <StandardScreen icon={Lock} title="Navegador seguro" description={info ?? "Sessões abertas agora em todas as contas e as contas guardadas."} hideBanner={expanded} fill>
      <div className={viewerOpen ? "flex h-full min-h-0 flex-col" : "h-full min-h-0 space-y-4 overflow-y-auto"}>
      {!viewerOpen && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="active-sessions">
        <h2 className="text-sm font-bold">Sessões ativas ({active.length})</h2>
        {err && <p role="alert" className="mt-1 text-xs text-red-600">{err}</p>}
        <ul className="mt-2 space-y-1 text-xs">
          {active.map((s) => <li key={s.id} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1"><span className="font-semibold">{s.user_name}</span><span className="text-slate-500">em “{s.profile_label}” · restam {fmtRemaining(s.remaining_seconds)}</span><Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-[11px] text-red-600" onClick={async () => { await apiClient.killSecureBrowserSession(s.id); void load() }}>Derrubar</Button></li>)}
          {active.length === 0 && <li className="text-slate-400">Nenhuma sessão aberta.</li>}
        </ul>
      </section>}
      <SecureBrowserHub canCreate isAdmin onExpandedChange={setExpanded} onViewerOpenChange={setViewerOpen} onViewerInfo={setInfo} />
      </div>
    </StandardScreen>
  )
}

export default SecureBrowserPage
