import React, { useState, useEffect } from "react"
import { Shield, ChevronDown, ChevronUp, X, Cookie } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const STORAGE_KEY = "allka_cookie_consent"

interface CookiePreferences {
  necessary: boolean
  analytics: boolean
  functional: boolean
  marketing: boolean
  timestamp: string
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    functional: false,
    marketing: false,
    timestamp: "",
  })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      // Small delay to avoid banner flash during SSR hydration
      const t = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  const save = (prefs: CookiePreferences) => {
    const final = { ...prefs, necessary: true, timestamp: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(final))
    setVisible(false)
  }

  const acceptAll = () =>
    save({ necessary: true, analytics: true, functional: true, marketing: true, timestamp: "" })

  const rejectNonEssential = () =>
    save({ necessary: true, analytics: false, functional: false, marketing: false, timestamp: "" })

  const saveCustom = () => save(preferences)

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 pointer-events-none">
      <div
        className="pointer-events-auto max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        style={{ animation: "slideUpFade 0.4s ease-out" }}
      >
        {/* Header row */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Cookie className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-sm">Privacidade & Cookies</h3>
              <Badge className="text-xs px-2 py-0 bg-blue-100 text-blue-700 border-0">LGPD</Badge>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Usamos cookies e tecnologias semelhantes para melhorar sua experiência, 
              analisar o tráfego e personalizar conteúdo, conforme nossa{" "}
              <a href="#" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">
                Política de Privacidade
              </a>
              . Você pode escolher quais categorias aceitar.
            </p>
          </div>
          <button
            onClick={rejectNonEssential}
            className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expandable preferences */}
        {expanded && (
          <div className="px-6 pb-3 space-y-2 border-t border-slate-100 pt-3">
            {[
              {
                key: "necessary" as const,
                label: "Necessários",
                desc: "Essenciais para o funcionamento da plataforma. Não podem ser desativados.",
                locked: true,
              },
              {
                key: "analytics" as const,
                label: "Analíticos",
                desc: "Nos ajudam a entender como você usa a plataforma (Google Analytics, Hotjar).",
                locked: false,
              },
              {
                key: "functional" as const,
                label: "Funcionais",
                desc: "Permitem recursos avançados como chat ao vivo e preferências salvas.",
                locked: false,
              },
              {
                key: "marketing" as const,
                label: "Marketing",
                desc: "Usados para mostrar anúncios relevantes e medir campanhas.",
                locked: false,
              },
            ].map((cat) => (
              <div
                key={cat.key}
                className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">{cat.label}</span>
                    {cat.locked && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        Sempre ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{cat.desc}</p>
                </div>
                <Switch
                  checked={cat.locked ? true : preferences[cat.key]}
                  disabled={cat.locked}
                  onCheckedChange={(val) =>
                    !cat.locked && setPreferences((p) => ({ ...p, [cat.key]: val }))
                  }
                  className="flex-shrink-0"
                />
              </div>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2 px-6 pb-5 pt-2">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mr-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Ocultar configurações" : "Personalizar"}
          </button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 px-4"
            onClick={rejectNonEssential}
          >
            Rejeitar não essenciais
          </Button>
          {expanded && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 px-4"
              onClick={saveCustom}
            >
              Salvar preferências
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={acceptAll}
          >
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Aceitar todos
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
