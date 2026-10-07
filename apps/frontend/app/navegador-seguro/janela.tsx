"use client"

// Janela grande do navegador seguro: abre num pop-up do tamanho útil da tela (a barra do Windows/Mac continua visível), sem o menu da plataforma.
import { useMemo } from "react"
import { SessionViewer } from "@/components/secure-browser-hub"

export default function SecureBrowserWindowPage() {
  const data = useMemo(() => {
    const k = new URLSearchParams(window.location.search).get("k") ?? ""
    const ks = `allka_sb_win_${k}`
    try {
      const raw = window.localStorage.getItem(ks) ?? window.sessionStorage.getItem(ks)
      if (!raw) return null
      window.sessionStorage.setItem(ks, raw) // sobrevive a um F5 desta janela
      window.localStorage.removeItem(ks) // o endereço da sessão não fica guardado no armazenamento comum
      return JSON.parse(raw)
    } catch { return null }
  }, [])
  if (!data) return <div className="flex h-screen items-center justify-center p-6 text-sm text-slate-600">Esta sessão não está mais disponível. Feche esta janela e abra o navegador de novo.</div>
  return <SessionViewer windowed session={data.session} url={data.url} startUrl={data.startUrl} hosts={data.hosts} onClose={() => window.close()} />
}
