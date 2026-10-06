"use client"

// D3 — Navegador seguro: o dono guarda contas (consentimento), autoriza pessoas por tempo e acompanha/derruba sessões; quem foi autorizado abre a sessão.
import { useCallback, useEffect, useRef, useState } from "react"
import { Clock, Loader2, Lock, Plus, ShieldCheck, Trash2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { RemoteBrowserCanvas } from "./remote-browser-canvas"

export const fmtRemaining = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—")
const EVENT_LABEL: Record<string, string> = { profile_created: "Conta guardada", profile_updated: "Conta alterada", profile_revoked: "Conta revogada", grant_created: "Autorização criada", grant_revoked: "Autorização revogada", session_started: "Sessão aberta", session_ended: "Sessão encerrada", session_expired: "Sessão expirou", session_killed: "Sessão derrubada", session_denied: "Acesso negado", state_saved: "Login inicial guardado" }

/** Visualizador da sessão: navegador no servidor em um quadro, contador regressivo, sinal de uso e encerrar. */
/** Frases de segurança mostradas no cabeçalho (da página, no modo pequeno; do próprio navegador, na tela cheia). */
export function securityNotes(session: any, hosts: string[] = []) {
  const setup = session.mode === "setup"
  return ["Sessão protegida", "Senha e cookies ficam no servidor", "Copiar, colar e baixar bloqueados", ...(setup ? [] : ["Sair da conta e trocar de conta bloqueados"]), ...(!setup && hosts.length ? [`Sites: ${hosts.join(", ")}`] : []), "Uso registrado com o seu nome", `sessão ${String(session.id).slice(-6)}`]
}

export function SessionViewer({ session, url, onClose, startUrl = "", hosts = [] }: { session: any; url: string; onClose: () => void; startUrl?: string; hosts?: string[] }) {
  const root = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement && document.fullscreenElement === root.current)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])
  // Tela cheia do navegador (como o F11 do Chrome); Esc sai.
  const toggleFull = () => { try { if (document.fullscreenElement) void document.exitFullscreen(); else void root.current?.requestFullscreen() } catch { /* sem suporte */ } }
  const [remaining, setRemaining] = useState<number>(session.remaining_seconds)
  const [status, setStatus] = useState<string>("active")
  const ended = useRef(false)
  useEffect(() => {
    const tick = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    const beat = setInterval(() => { apiClient.heartbeatSecureBrowserSession(session.id).then((r: any) => { setRemaining(r.remaining_seconds); setStatus(r.status) }).catch(() => {}) }, 30000)
    return () => { clearInterval(tick); clearInterval(beat) }
  }, [session.id])
  useEffect(() => { if (remaining === 0 && !ended.current) { ended.current = true; setStatus("expired") } }, [remaining])
  const end = async () => { try { await apiClient.endSecureBrowserSession(session.id) } catch { /* já encerrada */ } onClose() }
  const over = status !== "active"
  const setup = session.mode === "setup"
  const save = setup && !over ? async () => { try { await apiClient.saveSecureBrowserState(session.id); onClose() } catch (e: any) { window.alert(e?.message ?? "Não foi possível guardar a sessão.") } } : null
  const countdown = <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${remaining < 120 ? "bg-red-500 text-white" : full ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-800"}`} data-testid="countdown"><Clock className="h-3.5 w-3.5" />{over ? "Encerrada" : fmtRemaining(remaining)}</span>
  return (
    <div ref={root} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="session-viewer">
      {full ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-white" style={{ background: "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)" }} data-testid="viewer-header">
          <img src="/logo-allka-full.png" alt="Allka" className="h-6 shrink-0 object-contain" />
          <span className="hidden h-5 w-px bg-white/30 sm:block" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-bold"><Lock className="h-3.5 w-3.5 shrink-0 text-emerald-300" />Navegador seguro{setup ? " — faça o login e clique em “Guardar sessão e fechar”" : " — usando a conta já logada"}</p>
            <ul className="flex flex-wrap items-center gap-x-3 text-[10.5px] text-white/75" data-testid="security-strip">{securityNotes(session, hosts).map((t, i) => <li key={t} className={i === 0 ? "font-semibold text-emerald-300" : ""}>{t}</li>)}</ul>
          </div>
          <span className="ml-auto" />
          {countdown}
          {save && <Button size="sm" className="h-8 bg-white text-slate-900 hover:bg-white/90" onClick={() => void save()}>Guardar sessão e fechar</Button>}
          <Button size="sm" variant="outline" className="h-8 border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white" onClick={() => void end()}>Encerrar</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-1.5" data-testid="viewer-header">
          <p className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-slate-700"><Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />{setup ? "Faça o login na conta e clique em “Guardar sessão e fechar”" : "Usando a conta já logada"}</p>
          <span className="ml-auto" />
          {countdown}
          {save && <Button size="sm" variant="outline" className="h-8" onClick={() => void save()}>Guardar sessão e fechar</Button>}
          <Button size="sm" variant="outline" className="h-8" onClick={() => void end()}>Encerrar</Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col bg-white p-2">
        {over ? <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">A sessão terminou. Abra outra, se ainda tiver autorização.</p> : session.driver === "runner" ? <RemoteBrowserCanvas expanded={full} onToggleExpand={toggleFull} canNavigate={session.mode === "setup"} startUrl={startUrl} url={url} watermark={`Allka · ${session.id.slice(-6)} · ${new Date().toLocaleDateString("pt-BR")}`} onClosed={(why) => { if (why === "session_over" || why === "session_closed") setStatus((s) => (s === "active" ? "expired" : s)) }} /> : <iframe title="Navegador seguro" src={url} className="min-h-0 flex-1 rounded-lg border border-slate-300 bg-white" sandbox="allow-scripts allow-forms allow-same-origin" />}
      </div>
    </div>
  )
}

const GROUPS: [string, string][] = [["nomades", "Todos os nômades"], ["lideres", "Todos os líderes"], ["agencias", "Todas as agências"], ["empresas", "Todas as empresas"], ["administracao", "Toda a administração"]]

function ProfileCard({ p, onChanged, onOpen, isAdmin = false }: { p: any; onChanged: () => void; onOpen: (r: any) => void; isAdmin?: boolean }) {
  const [group, setGroup] = useState("")
  const [hostsText, setHostsText] = useState<string>((p.allowed_hosts ?? []).join(", "))
  const [groupMsg, setGroupMsg] = useState<string | null>(null)
  const owner = p.access === "owner"
  const [grants, setGrants] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [g, setG] = useState({ user_id: "", minutes: "120", reason: "" })
  const [err, setErr] = useState<string | null>(null)
  const loadDetail = useCallback(() => {
    if (!owner) return
    Promise.all([apiClient.getSecureBrowserGrants(p.id), apiClient.getSecureBrowserProfileSessions(p.id), apiClient.getSecureBrowserEvents(p.id)]).then(([a, b, c]: any[]) => { setGrants(a.data); setSessions(b.data); setEvents(c.data) }).catch(() => {})
  }, [p.id, owner])
  useEffect(() => { if (show) { loadDetail(); apiClient.getSecureBrowserGrantable(p.id).then((r: any) => setUsers(r.data ?? [])).catch(() => {}) } }, [show, loadDetail, p.id])
  const run = async (fn: () => Promise<any>) => { setErr(null); try { await fn(); loadDetail(); onChanged() } catch (e: any) { setErr(e?.message ?? "Não foi possível concluir.") } }
  const open = (mode: "use" | "setup") => run(async () => { const r = await apiClient.openSecureBrowserSession(p.id, mode); onOpen(r) })
  const busy = sessions.find((s) => s.status === "active")
  return (
    <li className={`rounded-xl border bg-white p-3 text-xs shadow-sm ${p.status === "revoked" ? "opacity-60" : "border-slate-200"}`} data-testid={`sb-profile-${p.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{p.label}</p><p className="truncate text-slate-500">{p.start_url}</p></div>
        {p.has_saved_session && p.login_expired ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800" data-testid="login-expired">login expirado — refazer</span> : p.has_saved_session ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800" title={p.login_expires_at ? `Login válido até ${new Date(p.login_expires_at).toLocaleString("pt-BR")}` : undefined}>login válido{p.login_expires_at ? ` até ${new Date(p.login_expires_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</span> : owner && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">sem login inicial</span>}
        {p.status === "revoked" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold">revogada</span>}
        {!owner && p.grant && <span className="text-[11px] text-slate-500">autorizado até {fmt(p.grant.valid_until)}</span>}
        {p.status === "active" && <Button size="sm" className="h-8" onClick={() => void open("use")} data-testid={`open-${p.id}`}>{owner ? "Entrar já logado (testar)" : "Abrir navegador"}</Button>}
        {owner && p.status === "active" && <Button size="sm" variant="outline" className="h-8" onClick={() => void open("setup")}>{p.has_saved_session ? "Refazer login" : "1. Logar na conta"}</Button>}
        {owner && <Button size="sm" variant="ghost" className="h-8 text-red-600" data-testid={`delete-${p.id}`} onClick={() => { if (window.confirm(`Excluir “${p.label}”? Apaga a sessão guardada, as autorizações e derruba quem estiver usando. O histórico de uso é mantido.`)) void run(() => apiClient.deleteSecureBrowserProfile(p.id)) }}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button>}
        {owner && <Button size="sm" variant="ghost" className="h-8" onClick={() => setShow((v) => !v)}>{show ? "Fechar" : "Autorizações e histórico"}</Button>}
      </div>
      {err && <p role="alert" className="mt-2 rounded bg-red-50 px-2 py-1 text-red-700">{err}</p>}
      {owner && show && (
        <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 lg:grid-cols-2">
          <section>
            <h4 className="mb-1 font-bold">Quem pode usar (por tempo)</h4>
            <ul className="space-y-1">{grants.filter((x) => x.active).map((x) => <li key={x.id} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1"><span className="font-semibold">{x.user_name}</span><span className="text-slate-500">até {fmt(x.valid_until)}</span>{x.reason && <span className="truncate text-slate-400">· {x.reason}</span>}<button type="button" aria-label={`Revogar ${x.user_name}`} className="ml-auto text-red-500" onClick={() => void run(() => apiClient.revokeSecureBrowserGrant(x.id))}><Trash2 className="h-3.5 w-3.5" /></button></li>)}{grants.filter((x) => x.active).length === 0 && <li className="text-slate-400">Ninguém autorizado agora.</li>}</ul>
            {p.status === "active" && (
              <div className="mt-2 flex flex-wrap items-end gap-1.5">
                <select aria-label="Quem autorizar" className="h-8 rounded-md border border-slate-300 bg-white px-1.5" value={g.user_id} onChange={(e) => setG({ ...g, user_id: e.target.value })}><option value="">Escolha a pessoa…</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.kind}</option>)}</select>
                <label className="inline-flex items-center gap-1">por <Input aria-label="Minutos de autorização" type="number" min={5} className="h-8 w-20" value={g.minutes} onChange={(e) => setG({ ...g, minutes: e.target.value })} /> min</label>
                <Input aria-label="Motivo" className="h-8 w-44" placeholder="Motivo (opcional)" value={g.reason} onChange={(e) => setG({ ...g, reason: e.target.value })} />
                <Button size="sm" className="h-8" disabled={!g.user_id} onClick={() => void run(() => apiClient.createSecureBrowserGrant(p.id, { user_id: g.user_id, minutes: Number(g.minutes) || 60, reason: g.reason || null }))}><Plus className="mr-1 h-3.5 w-3.5" />Autorizar</Button>
              </div>
            )}
            {isAdmin && p.status === "active" && (
              <div className="mt-2 flex flex-wrap items-end gap-1.5 rounded-lg bg-violet-50 p-2" data-testid="group-grant">
                <select aria-label="Liberar para um grupo" className="h-8 rounded-md border border-slate-300 bg-white px-1.5" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Liberar para um grupo…</option>{GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <Button size="sm" className="h-8" disabled={!group} onClick={() => void run(async () => { const r: any = await apiClient.createSecureBrowserGroupGrant(p.id, { group, minutes: Number(g.minutes) || 60, reason: g.reason || null }); setGroupMsg(`${r.created} pessoa(s) liberada(s)${r.already_had ? ` · ${r.already_had} já tinham acesso` : ""}`) })}>Liberar grupo</Button>
                {groupMsg && <span role="status" className="text-emerald-700">{groupMsg}</span>}
              </div>
            )}
            {p.status === "active" && <Button size="sm" variant="outline" className="mt-2 h-7 text-red-600" onClick={() => { if (window.confirm("Revogar esta conta? Apaga a sessão guardada, cancela as autorizações e derruba quem estiver usando.")) void run(() => apiClient.revokeSecureBrowserProfile(p.id)) }}>Revogar conta guardada</Button>}
          </section>
          <section>
            {p.status === "active" && <div className="mb-3" data-testid="allowed-hosts"><h4 className="mb-1 font-bold">Sites que quem usa pode abrir</h4><div className="flex items-center gap-1.5"><Input aria-label="Sites permitidos" className="h-8 text-xs" value={hostsText} onChange={(e) => setHostsText(e.target.value)} placeholder="ex.: instagram.com, facebook.com" /><Button size="sm" className="h-8" onClick={() => void run(() => apiClient.updateSecureBrowserProfile(p.id, { allowed_hosts: hostsText }))}>Salvar</Button></div><p className="mt-1 text-[11px] text-slate-500">Quem usa a conta só navega nesses sites e não consegue sair da conta nem entrar em outra. Vazio = só o site da conta e seus domínios ligados.</p></div>}
            <h4 className="mb-1 font-bold">Sessões e histórico</h4>
            <ul className="max-h-40 space-y-1 overflow-y-auto">{sessions.slice(0, 8).map((s) => <li key={s.id} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1"><span className="font-semibold">{s.user_name}</span><span className="text-slate-500">{fmt(s.started_at)} · {s.status}</span>{s.status === "active" && <Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-[11px] text-red-600" onClick={() => void run(() => apiClient.killSecureBrowserSession(s.id))}>Derrubar ({fmtRemaining(s.remaining_seconds)})</Button>}</li>)}{sessions.length === 0 && <li className="text-slate-400">Nenhuma sessão ainda.</li>}</ul>
            <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-slate-500">{events.slice(0, 12).map((e) => <li key={e.id}>{fmt(e.created_at)} — {EVENT_LABEL[e.kind] ?? e.kind}</li>)}</ul>
          </section>
        </div>
      )}
    </li>
  )
}

export function SecureBrowserHub({ canCreate = true, adminScope, isAdmin = false, onExpandedChange, onViewerOpenChange, onViewerInfo }: { canCreate?: boolean; onViewerInfo?: (text: string | null) => void; isAdmin?: boolean; onExpandedChange?: (v: boolean) => void; onViewerOpenChange?: (v: boolean) => void; adminScope?: { agency_id?: string; company_id?: string } }) {
  const [profiles, setProfiles] = useState<any[] | null>(null)
  const [consent, setConsent] = useState<{ version: string; text: string } | null>(null)
  const [form, setForm] = useState({ label: "", start_url: "https://", provider_hint: "", max: "60", ok: false })
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ session: any; url: string; startUrl?: string; hosts?: string[] } | null>(null)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => { onExpandedChange?.(!!viewer && expanded) }, [viewer, expanded, onExpandedChange])
  useEffect(() => { onViewerOpenChange?.(!!viewer) }, [viewer, onViewerOpenChange])
  useEffect(() => { onViewerInfo?.(viewer ? securityNotes(viewer.session, viewer.hosts ?? []).join(" · ") : null) }, [viewer, onViewerInfo])
  const openViewer = (r: any) => { const p = (profiles ?? []).find((x) => x.id === r.session.profile_id); setViewer({ ...r, startUrl: p?.start_url, hosts: p?.allowed_hosts ?? [] }) }
  const load = useCallback(() => { apiClient.getSecureBrowserProfiles(adminScope ?? {}).then((r: any) => setProfiles(r.data)).catch((e: any) => setErr(e?.message ?? "Não foi possível carregar.")) }, [adminScope])
  useEffect(() => { load(); apiClient.getSecureBrowserConsent().then(setConsent).catch(() => {}) }, [load])
  const create = async (openAfter = false) => {
    setErr(null)
    try { const created: any = await apiClient.createSecureBrowserProfile({ label: form.label.trim() || (() => { try { return new URL(form.start_url.trim()).hostname } catch { return "Navegador Allka" } })(), start_url: form.start_url.trim(), provider_hint: form.provider_hint.trim() || null, max_session_minutes: Number(form.max) || 60, consent: true, ...(adminScope ?? {}) }); const startUrl = form.start_url.trim(); setAdding(false); setForm({ label: "", start_url: "https://", provider_hint: "", max: "60", ok: false }); load(); if (openAfter && created?.id) { const r: any = await apiClient.openSecureBrowserSession(created.id, "setup"); setViewer({ ...r, startUrl, hosts: created.allowed_hosts ?? [] }) } } catch (e: any) { setErr(e?.message ?? "Não foi possível guardar a conta.") }
  }
  if (viewer) return <div className="flex h-full min-h-0 flex-col" data-testid="secure-browser-hub"><SessionViewer session={viewer.session} url={viewer.url} startUrl={viewer.startUrl} hosts={viewer.hosts} onClose={() => { setViewer(null); setExpanded(false); load() }} /></div>
  const mine = (profiles ?? []).filter((p) => p.access === "owner")
  const granted = (profiles ?? []).filter((p) => p.access === "grant")
  return (
    <div className="space-y-4" data-testid="secure-browser-hub">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-bold"><Lock className="h-4 w-4 text-emerald-600" />Navegador seguro</h2>
        <p className="mt-1 text-xs text-slate-600">O navegador roda em um servidor da Allka e aparece aqui dentro. A conta fica logada nele e quem usa <strong>nunca vê a senha nem o cookie</strong>. O uso é por tempo autorizado, fica registrado e pode ser revogado a qualquer momento.</p>
        {canCreate && <div className="mt-2"><Button size="sm" onClick={() => setAdding((v) => !v)} data-testid="new-sb-profile"><Plus className="mr-1 h-4 w-4" />Abrir navegador Allka</Button></div>}
        {adding && (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="grid gap-2 sm:grid-cols-3"><label className="font-semibold">Nome da conta<Input aria-label="Nome da conta" className="mt-0.5 h-8" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex.: Instagram da Loja" /></label><label className="font-semibold">Endereço de entrada<Input aria-label="Endereço de entrada" className="mt-0.5 h-8" value={form.start_url} onChange={(e) => setForm({ ...form, start_url: e.target.value })} /></label><label className="font-semibold">Validade do login (min) — depois disso é preciso logar de novo<Input aria-label="Tempo máximo" type="number" min={5} max={240} className="mt-0.5 h-8" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} /></label></div>
            <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2"><input type="checkbox" aria-label="Aceito" className="mt-0.5" checked={form.ok} onChange={(e) => setForm({ ...form, ok: e.target.checked })} /><span>{consent?.text ?? "Autorizo a Allka a guardar, de forma cifrada, a sessão desta conta…"}</span></label>
            <Button size="sm" disabled={!form.ok || !/^https?:\/\/\S+\.\S+/.test(form.start_url.trim())} onClick={() => void create(true)} data-testid="save-sb-profile">Abrir navegador e logar</Button>
          </div>
        )}
        {canCreate && <ol className="mt-3 grid gap-2 text-[11px] text-slate-600 sm:grid-cols-3" data-testid="sb-steps"><li className="rounded-lg bg-slate-50 p-2"><strong>1. Guardar e logar.</strong> Cadastre a conta e clique em “Logar na conta”: abre um navegador onde você digita o site e faz o login.</li><li className="rounded-lg bg-slate-50 p-2"><strong>2. Liberar acesso.</strong> Em “Autorizações e histórico”, escolha a pessoa e por quanto tempo ela pode usar.</li><li className="rounded-lg bg-slate-50 p-2"><strong>3. Testar.</strong> Clique em “Entrar já logado (testar)” — ou peça para a pessoa liberada abrir pelo menu Navegador seguro.</li></ol>}
        {err && <p role="alert" className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</p>}
      </div>
      {!profiles ? <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</p> : (
        <>
          {granted.length > 0 && <section><h3 className="mb-2 text-sm font-bold">Acessos que você recebeu</h3><ul className="space-y-2">{granted.map((p) => <ProfileCard isAdmin={isAdmin} key={p.id} p={p} onChanged={load} onOpen={openViewer} />)}</ul></section>}
          <section><h3 className="mb-2 text-sm font-bold">{adminScope ? "Contas guardadas" : "Contas guardadas da sua conta"}</h3><ul className="space-y-2">{mine.map((p) => <ProfileCard isAdmin={isAdmin} key={p.id} p={p} onChanged={load} onOpen={openViewer} />)}{mine.length === 0 && <li className="rounded-lg bg-white p-4 text-center text-xs text-slate-500">Nenhuma conta guardada ainda.</li>}</ul></section>
        </>
      )}
    </div>
  )
}
