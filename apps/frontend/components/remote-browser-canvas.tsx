"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Maximize2, Minimize2, Plus, RotateCw, X } from "lucide-react"

// Visualizador do navegador seguro REAL: recebe imagens (JPEG) do Chromium do servidor e devolve só mouse/teclado.
// Nada da página (HTML, cookies, senha) chega ao navegador de quem usa. Copiar/colar/atalhos com Ctrl/Cmd ficam bloqueados aqui e no servidor.
// O WebSocket vai para o mesmo servidor da API (VITE_API_URL, quando absoluta); senão, para o próprio endereço da página.
export const wsUrlFor = (path: string, loc: { protocol: string; host: string } = window.location, apiUrl: string | undefined = (import.meta as any).env?.VITE_API_URL) => {
  let origin = `${loc.protocol === "https:" ? "wss" : "ws"}://${loc.host}`
  if (apiUrl && /^https?:\/\//i.test(apiUrl)) { const u = new URL(apiUrl); origin = `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}` }
  return `${origin}${path}`
}
export const normalizeAddress = (v: string) => { const t = v.trim(); if (!t) return ""; return /^https?:\/\//i.test(t) ? t : `https://${t}` }

type Tab = { id: string; title: string; url: string; active: boolean }

export function RemoteBrowserCanvas({ url, watermark, onClosed, canNavigate = false, startUrl = "", expanded = false, onToggleExpand }: { url: string; watermark: string; onClosed?: (reason: string) => void; canNavigate?: boolean; startUrl?: string; expanded?: boolean; onToggleExpand?: () => void }) {
  const [notice, setNotice] = useState<string | null>(null)
  const [zoom, setZoomState] = useState<number>(() => { try { const v = Number(window.localStorage.getItem("allka_sb_zoom_v2")); return v >= 0.5 && v <= 1.5 ? v : 0.75 } catch { return 1 } })
  const zoomRef = useRef(zoom)
  // ao pedir o tamanho, o servidor devolve a imagem já com os pixels da sua tela (zoom aplicado lá, como no Chrome)
  const resendRef = useRef<() => void>(() => {})
  const setZoom = (v: number) => { zoomRef.current = v; setZoomState(v); try { window.localStorage.setItem("allka_sb_zoom_v2", String(v)) } catch { /* sem armazenamento */ } setTimeout(() => resendRef.current(), 0) }
  const [address, setAddress] = useState(startUrl)
  const box = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const ws = useRef<WebSocket | null>(null)
  const size = useRef({ w: 1280, h: 720 })
  const [state, setState] = useState<"connecting" | "live" | "closed">("connecting")
  const [tabs, setTabs] = useState<Tab[]>([])
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let disposed = false // o modo estrito do React monta duas vezes: o primeiro socket não pode "encerrar" a sessão
    setState("connecting")
    const sock = new WebSocket(wsUrlFor(url))
    sock.binaryType = "blob"
    ws.current = sock
    let last: ImageBitmap | null = null
    let synced = false // só mostramos imagem depois que o servidor confirmou o nosso tamanho (evita o "pisca" ao abrir)
    let pendingBlob: Blob | null = null
    let decoding = false
    const draw = () => {
      const c = canvas.current; const g = c?.getContext("2d"); if (!c || !g) return
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"
      if (last) g.drawImage(last, 0, 0, c.width, c.height)
    }
    const setSize = (w: number, h: number, dpr = 1) => {
      size.current = { w, h }
      const c = canvas.current
      const nw = Math.round(w * dpr), nh = Math.round(h * dpr)
      if (c && (c.width !== nw || c.height !== nh)) { c.width = nw; c.height = nh; draw() } // mudar o tamanho apaga o quadro: redesenha na hora
    }
    // decodifica só o quadro mais recente (se chegarem vários enquanto decodifica, os antigos são descartados)
    const pump = async () => {
      if (decoding) return
      decoding = true
      try {
        while (pendingBlob) {
          const blob = pendingBlob; pendingBlob = null
          try { const bmp = await createImageBitmap(blob); if (disposed) { bmp.close(); return } last?.close(); last = bmp; if (synced) { draw(); setState((st) => (st === "closed" ? st : "live")) } } catch { /* quadro corrompido */ }
        }
      } finally { decoding = false }
    }
    // zoom: o navegador do servidor é aberto num tamanho (área ÷ zoom) e a imagem é encaixada na área — 67% mostra mais coisas, menores.
    const sendSize = () => { const r = area.current?.getBoundingClientRect(); if (r && r.width > 0 && sock.readyState === 1) sock.send(JSON.stringify({ type: "resize", width: Math.round(r.width), height: Math.round(r.height), dpr: Math.min(2.5, window.devicePixelRatio || 1), zoom: zoomRef.current })) }
    resendRef.current = sendSize
    sock.onopen = () => { sendSize(); setTimeout(() => { if (!disposed && !synced) { synced = true; draw() } }, 2000) } // segurança: não fica escondido para sempre
    sock.onmessage = async (ev) => {
      if (disposed) return
      if (typeof ev.data === "string") {
        try {
          const m = JSON.parse(ev.data)
          if (m.type === "hello") setSize(m.width, m.height, m.dpr || 1)
          else if (m.type === "size") { setSize(m.width, m.height, m.dpr || 1); synced = true; draw() }
          else if (m.type === "tabs") setTabs(m.tabs)
          else if (m.type === "notice") { setNotice(m.text); setTimeout(() => setNotice(null), 5000) }
        } catch { /* ignora */ }
        return
      }
      pendingBlob = ev.data as Blob
      void pump()
    }
    sock.onclose = (ev) => { if (disposed) return; setState("closed"); onClosed?.(ev.reason || "") }
    sock.onerror = () => { if (!disposed) setState("closed") }
    // acompanha o tamanho disponível (tela cheia, janela redimensionada) e pede ao servidor um navegador desse tamanho
    let timer: ReturnType<typeof setTimeout> | undefined
    const ro = typeof ResizeObserver !== "undefined" && area.current ? new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(sendSize, 300) }) : null
    if (ro && area.current) ro.observe(area.current)
    return () => { disposed = true; clearTimeout(timer); ro?.disconnect(); try { sock.close() } catch { /* */ } last?.close() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, watermark, attempt])


  const moveRaf = useRef<number | null>(null)
  const lastMove = useRef<{ x: number; y: number } | null>(null)
  const wheelAcc = useRef({ dx: 0, dy: 0, x: 0, y: 0 })
  const flushPointer = () => {
    moveRaf.current = null
    if (lastMove.current) { send({ type: "mouse", action: "move", ...lastMove.current }); lastMove.current = null }
    const w = wheelAcc.current
    if (w.dx || w.dy) { send({ type: "mouse", action: "wheel", dx: w.dx, dy: w.dy, x: w.x, y: w.y }); wheelAcc.current = { dx: 0, dy: 0, x: 0, y: 0 } }
  }
  const schedulePointer = () => { if (moveRaf.current == null) moveRaf.current = requestAnimationFrame(flushPointer) }
  const send = useCallback((m: Record<string, unknown>) => { if (ws.current?.readyState === 1) ws.current.send(JSON.stringify(m)) }, [])
  const pos = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * size.current.w, y: ((e.clientY - r.top) / r.height) * size.current.h }
  }
  const key = (action: "down" | "up") => (e: React.KeyboardEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey || e.key === "Dead" || e.key === "Unidentified") return // sem copiar/colar/atalhos
    send({ type: "key", action, key: e.key })
  }
  const go = () => { const u = normalizeAddress(address); if (u) { setAddress(u); send({ type: "nav", action: "goto", url: u }) } }
  const activeUrl = tabs.find((t) => t.active)?.url
  useEffect(() => { if (activeUrl && canNavigate) setAddress(activeUrl) }, [activeUrl, canNavigate])

  return (
    <div ref={box} className={`flex min-h-0 flex-1 flex-col ${expanded ? "gap-0.5 bg-white" : "gap-1"}`} data-testid="remote-browser">
      <div className={`flex items-center gap-1 overflow-x-auto ${expanded ? "px-2 pt-1" : ""}`} role="tablist" aria-label="Abas do navegador">
        {tabs.map((t) => (
          <div key={t.id} role="tab" aria-selected={t.active} className={`group flex max-w-[190px] shrink-0 items-center gap-1 rounded-t-md border px-2 py-1 text-[11px] ${t.active ? "border-slate-300 bg-white font-semibold text-slate-800" : "border-transparent bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
            <button type="button" className="min-w-0 flex-1 truncate text-left" title={t.url} onClick={() => send({ type: "tab", action: "switch", id: t.id })}>{t.title || t.url || "Nova aba"}</button>
            {tabs.length > 1 && <button type="button" aria-label={`Fechar aba ${t.title || t.id}`} className="rounded p-0.5 hover:bg-slate-300" onClick={() => send({ type: "tab", action: "close", id: t.id })}><X className="h-3 w-3" /></button>}
          </div>
        ))}
        {canNavigate && tabs.length < 8 && <button type="button" aria-label="Nova aba" className="shrink-0 rounded p-1 text-slate-600 hover:bg-slate-100" onClick={() => send({ type: "tab", action: "new", url: "https://www.google.com" })}><Plus className="h-4 w-4" /></button>}
      </div>
      <div className={`flex items-center gap-1 text-slate-600 ${expanded ? "px-2 pb-1" : ""}`}>
        <button type="button" aria-label="Voltar" className="rounded p-1 hover:bg-slate-100" onClick={() => send({ type: "nav", action: "back" })}><ArrowLeft className="h-4 w-4" /></button>
        <button type="button" aria-label="Avançar" className="rounded p-1 hover:bg-slate-100" onClick={() => send({ type: "nav", action: "forward" })}><ArrowRight className="h-4 w-4" /></button>
        <button type="button" aria-label="Recarregar" className="rounded p-1 hover:bg-slate-100" onClick={() => send({ type: "nav", action: "reload" })}><RotateCw className="h-4 w-4" /></button>
        {canNavigate ? (
          <form className="ml-1 flex flex-1 items-center gap-1" onSubmit={(e) => { e.preventDefault(); go() }}>
            <input aria-label="Endereço do site" className="h-7 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800" placeholder="Digite o endereço do site e tecle Enter" value={address} onChange={(e) => setAddress(e.target.value)} />
            <button type="submit" className="h-7 rounded-md bg-slate-800 px-2 text-xs font-semibold text-white">Ir</button>
          </form>
        ) : <span className="ml-1 min-w-0 flex-1 truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-500" title={activeUrl}>{activeUrl ?? ""}</span>}
        <span className="ml-2 hidden text-[11px] sm:inline">{state === "connecting" ? "Conectando ao navegador…" : state === "live" ? "Clique na tela para usar o teclado" : "Conexão encerrada"}</span>
        <select aria-label="Zoom da página" title="Tamanho da página" className="h-7 rounded-md border border-slate-300 bg-white px-1 text-xs text-slate-700" value={String(zoom)} onChange={(e) => setZoom(Number(e.target.value))}>{[0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5].map((z) => <option key={z} value={String(z)}>{Math.round(z * 100)}%</option>)}</select>
        <button type="button" aria-label={expanded ? "Sair da tela cheia" : "Tela cheia"} title={expanded ? "Sair da tela cheia" : "Tela cheia"} className="rounded p-1 hover:bg-slate-100" onClick={() => onToggleExpand?.()}>{expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
      </div>
      <div ref={area} className={`relative min-h-0 flex-1 overflow-hidden bg-white ${expanded ? "" : "rounded-lg border border-slate-300"}`}>
        <canvas
          ref={canvas} width={1280} height={720} tabIndex={0} data-testid="remote-canvas"
          className="absolute inset-0 h-full w-full outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
          onMouseMove={(e) => { lastMove.current = pos(e); schedulePointer() }}
          onMouseDown={(e) => { e.currentTarget.focus(); send({ type: "mouse", action: "down", button: e.button, ...pos(e) }) }}
          onMouseUp={(e) => send({ type: "mouse", action: "up", button: e.button, ...pos(e) })}
          onWheel={(e) => { const p = pos(e); const w = wheelAcc.current; wheelAcc.current = { dx: w.dx + e.deltaX, dy: w.dy + e.deltaY, ...p }; schedulePointer() }}
          onContextMenu={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()} onPaste={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}
          onKeyDown={key("down")} onKeyUp={key("up")}
        />
        {state === "connecting" && <div className="absolute inset-0 z-[5] flex items-center justify-center bg-white text-sm text-slate-500">Conectando ao navegador…</div>}
        {notice && <div role="status" className="absolute inset-x-0 top-0 z-10 bg-amber-100 px-3 py-1.5 text-center text-xs font-semibold text-amber-900">{notice}</div>}
        {state === "closed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 text-sm text-slate-700">
            <p>A conexão com o navegador caiu.</p>
            <button type="button" className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => setAttempt((n) => n + 1)}>Reconectar</button>
          </div>
        )}
      </div>
    </div>
  )
}
