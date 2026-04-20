// @ts-nocheck
import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Upload, Palette, Check, Sparkles, RotateCcw, X, Image as ImageIcon, Sliders, Plus } from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"

interface SidebarSettingsModalProps {
  open: boolean
  onClose: () => void
}

// Solid colors
const solidColors = [
  { name: "Azul Escuro", value: "bg-slate-900", preview: "#0f172a", category: "blue" },
  { name: "Azul Profundo", value: "bg-blue-900", preview: "#1e3a8a", category: "blue" },
  { name: "Azul Médio", value: "bg-blue-800", preview: "#1e40af", category: "blue" },
  { name: "Azul Acinzentado", value: "bg-slate-800", preview: "#1e293b", category: "blue" },
  { name: "Azul Índigo", value: "bg-indigo-900", preview: "#312e81", category: "blue" },
  { name: "Verde Escuro", value: "bg-green-900", preview: "#14532d", category: "green" },
  { name: "Verde Esmeralda", value: "bg-emerald-900", preview: "#064e3b", category: "green" },
  { name: "Roxo Escuro", value: "bg-purple-900", preview: "#581c87", category: "purple" },
  { name: "Roxo Violeta", value: "bg-violet-900", preview: "#4c1d95", category: "purple" },
  { name: "Vermelho Escuro", value: "bg-red-900", preview: "#7f1d1d", category: "red" },
  { name: "Cinza Escuro", value: "bg-gray-900", preview: "#111827", category: "gray" },
]

// Gradient presets
const gradientPresets = [
  {
    name: "Allka – Nova Identidade (Padrão)",
    value: "custom-gradient:linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, #1a1a4f 10%, #2d1b4e 25%, #4a1a8a 40%, #5a2a9f 50%, #4a1a8a 60%, #2d1b4e 75%, #1a1a4f 90%, rgba(0,0,0,0.7) 100%)",
    preview: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, #1a1a4f 10%, #2d1b4e 25%, #4a1a8a 40%, #5a2a9f 50%, #4a1a8a 60%, #2d1b4e 75%, #1a1a4f 90%, rgba(0,0,0,0.7) 100%)",
    category: "allka",
    isDefault: true,
  },
  {
    name: "Oceano Profundo",
    value: "custom-gradient:linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
    preview: "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
    category: "blue",
  },
  {
    name: "Galáxia Roxa",
    value: "custom-gradient:linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
    preview: "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
    category: "purple",
  },
]

// Background image presets
const backgroundPresets = [
  {
    name: "Ondas Allka",
    url: "/images/allka-waves-bg.webp",
    description: "Visual tecnológico - azul e roxo",
    accentColor: "custom-gradient:linear-gradient(135deg, #0d1438 0%, #1a1048 100%)",
  },
]

const categoryLabels: Record<string, string> = {
  allka: "Allka Identity",
  blue: "Azuis",
  green: "Verdes",
  purple: "Roxos",
  red: "Vermelhos",
  gray: "Neutros",
}

// Default Theme V1 (Preset 1.0) - tema clássico azul
const DEFAULT_THEME_V1 = {
  backgroundColor: "custom-gradient:linear-gradient(180deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)",
  backgroundImage: null,
  imageOpacity: 100,
  imageOverlay: "none" as const,
  overlayIntensity: 30,
  backgroundMode: "gradient" as const,
  imagePosition: "center" as const,
  imageAlignment: "center" as const,
  imageScale: 100,
  customGradientColor1: "#1e3a8a",
  customGradientColor2: "#1e40af",
  customGradientDirection: "to bottom" as const,
  sidebarLogo: null,
  sidebarFavicon: null,
}

// Default Theme V2 (Preset 2.0) - para reset
const DEFAULT_THEME_V2 = {
  backgroundColor: "custom-gradient:linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)",
  backgroundImage: null,
  imageOpacity: 100,
  imageOverlay: "none" as const,
  overlayIntensity: 30,
  backgroundMode: "gradient" as const,
  imagePosition: "center" as const,
  imageAlignment: "center" as const,
  imageScale: 100,
  customGradientColor1: "#3b82f6",
  customGradientColor2: "#8b5cf6",
  customGradientDirection: "to right" as const,
  sidebarLogo: null,
  sidebarFavicon: null,
}

const presets = [
  {
    name: "Versão 1.0",
    description: "Padrão original - azul clássico",
    theme: DEFAULT_THEME_V1,
    icon: "🔵",
  },
  {
    name: "Versão 2.0",
    description: "Degradê diagonal - preto a azul a magenta",
    theme: DEFAULT_THEME_V2,
    icon: "🚀",
  },
]

export function SidebarSettingsModal({ open, onClose }: SidebarSettingsModalProps) {
  const { sidebarSettings, updateSidebarSettings, applyFullTheme, sidebarCollapsed, sidebarWidth } = useSidebar()
  const originalSettingsRef = useRef(sidebarSettings)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(sidebarSettings))
  const [openResetDialog, setOpenResetDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"discard" | "save" | null>(null)
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null)
  const [deleteImagePresetId, setDeleteImagePresetId] = useState<string | null>(null)
  const [customColors, setCustomColors] = useState<string[]>([])
  const [rgb, setRgb] = useState({ r: 120, g: 120, b: 120 })
  const [activeTab, setActiveTab] = useState("cores")
  const [openColorPicker, setOpenColorPicker] = useState(false)
  const [savePresetOpen, setSavePresetOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [saveImagePresetOpen, setSaveImagePresetOpen] = useState(false)
  const [imagePresetName, setImagePresetName] = useState("")
  const [customPresets, setCustomPresets] = useState<Array<{ id: string; name: string; value: string; preview: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("allka_custom_presets") ?? "[]") } catch { return [] }
  })
  const [customImagePresets, setCustomImagePresets] = useState<Array<{ id: string; name: string; url: string; accentColor: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("allka_custom_image_presets") ?? "[]") } catch { return [] }
  })

  // Per-surface gradient state (for Superfícies tab custom gradient builders)
  const [headerG1, setHeaderG1] = useState("#1a2a6f")
  const [headerG2, setHeaderG2] = useState("#c81a7f")
  const [headerGDir, setHeaderGDir] = useState<"to right" | "to bottom" | "135deg">("135deg")
  const [buttonG1, setButtonG1] = useState("#1a2a6f")
  const [buttonG2, setButtonG2] = useState("#c81a7f")
  const [buttonGDir, setButtonGDir] = useState<"to right" | "to bottom" | "135deg">("135deg")

  // Extrai cor dominante de uma imagem via Canvas
  // Sempre produz uma cor escura (máx ~90/255 por canal) para garantir legibilidade de texto branco
  const extractDominantColor = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const fallback = "custom-gradient:linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
      try {
        const img = new window.Image()
        // NÃO definir crossOrigin para data: URLs — causa canvas taint em alguns browsers
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas")
            canvas.width = 32; canvas.height = 32
            const ctx = canvas.getContext("2d")
            if (!ctx) return resolve(fallback)
            ctx.drawImage(img, 0, 0, 32, 32)
            const data = ctx.getImageData(0, 0, 32, 32).data
            let r = 0, g = 0, b = 0, n = 0
            for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; n++ }
            if (!n) return resolve(fallback)
            // Cor média
            const ar = r / n, ag = g / n, ab = b / n
            // Normalizar: o canal mais alto não pode passar de 90 (escuro o suficiente para texto branco)
            const maxCap = 90
            const maxCh = Math.max(ar, ag, ab, 1)
            const scale = Math.min(1, maxCap / maxCh)
            const toHex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")
            // stop 1 = 60% da cor normalizada (mais escuro)
            const dr = ar * scale * 0.6, dg = ag * scale * 0.6, db = ab * scale * 0.6
            // stop 2 = 100% da cor normalizada (mais claro mas ainda escuro)
            const lr = ar * scale, lg = ag * scale, lb = ab * scale
            resolve(`custom-gradient:linear-gradient(135deg, #${toHex(dr)}${toHex(dg)}${toHex(db)} 0%, #${toHex(lr)}${toHex(lg)}${toHex(lb)} 100%)`)
          } catch { resolve(fallback) }
        }
        img.onerror = () => resolve(fallback)
        img.src = url
      } catch { resolve(fallback) }
    })
  }

  // Função única para aplicar mudanças direto no contexto (preview permanente)
  const applyPreview = (patch: Partial<typeof sidebarSettings>) => {
    applyFullTheme(patch)
  }

  // Alias para variáveis do contexto para legibilidade
  const selectedColor = sidebarSettings.backgroundColor || "bg-slate-900"
  const backgroundImage = sidebarSettings.backgroundImage || ""
  const imageOpacity = sidebarSettings.imageOpacity ?? 100
  const imageOverlay = sidebarSettings.imageOverlay || "none"
  const overlayIntensity = sidebarSettings.overlayIntensity ?? 30
  const backgroundMode = (sidebarSettings.backgroundMode as "gradient" | "image" | "image+gradient") || "gradient"
  const imagePosition = (sidebarSettings.imagePosition as "top" | "center" | "bottom") || "center"
  const imageAlignment = (sidebarSettings.imageAlignment as "left" | "center" | "right") || "center"
  const imageScale = sidebarSettings.imageScale ?? 100
  const customGradientColor1 = sidebarSettings.customGradientColor1 || "#3b82f6"
  const customGradientColor2 = sidebarSettings.customGradientColor2 || "#8b5cf6"
  const customGradientDirection = (sidebarSettings.customGradientDirection as "to right" | "to bottom" | "135deg") || "to right"
  const sidebarLogo = sidebarSettings.sidebarLogo || null
  const sidebarFavicon = sidebarSettings.sidebarFavicon || null

  const applyPreset = (value: string) => {
    applyPreview({ backgroundColor: value })
  }

  const buildCSSPreview = (bg: string): string => {
    if (bg.startsWith("custom-gradient:")) return bg.replace("custom-gradient:", "")
    return (
      solidColors.find((c) => c.value === bg)?.preview ??
      gradientPresets.find((g) => g.value === bg)?.preview ??
      bg
    )
  }

  const saveCustomPreset = () => {
    if (!presetName.trim()) return
    const entry = {
      id: Date.now().toString(),
      name: presetName.trim(),
      value: sidebarSettings.backgroundColor,
      preview: buildCSSPreview(sidebarSettings.backgroundColor),
    }
    const updated = [...customPresets, entry]
    setCustomPresets(updated)
    try { localStorage.setItem("allka_custom_presets", JSON.stringify(updated)) } catch {}
    // Auto-commit the current theme
    originalSettingsRef.current = sidebarSettings
    setPresetName("")
    setSavePresetOpen(false)
  }

  const deleteCustomPreset = (id: string) => {
    const updated = customPresets.filter((p) => p.id !== id)
    setCustomPresets(updated)
    try { localStorage.setItem("allka_custom_presets", JSON.stringify(updated)) } catch {}
  }

  // Sincronizar snapshot ao abrir o modal (garante "Salvo" no estado inicial)
  useEffect(() => {
    if (open) {
      const snap = JSON.stringify(sidebarSettings)
      originalSettingsRef.current = sidebarSettings
      setSavedSnapshot(snap)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Verificar se foi modificado (compara com state — reativo)
  const isDirty = useMemo(() => {
    return JSON.stringify(sidebarSettings) !== savedSnapshot
  }, [sidebarSettings, savedSnapshot])

  // Nome do preset ativo
  const activePresetName = useMemo(() => {
    const bg = sidebarSettings.backgroundColor
    if (bg === DEFAULT_THEME_V1.backgroundColor) return "Versão 1.0"
    if (bg === DEFAULT_THEME_V2.backgroundColor) return "Versão 2.0"
    const gp = gradientPresets.find(g => g.value === bg)
    if (gp) return gp.name
    const sc = solidColors.find(c => c.value === bg)
    if (sc) return sc.name
    const cp = customPresets.find(p => p.value === bg)
    if (cp) return cp.name
    return "Personalizado"
  }, [sidebarSettings.backgroundColor, customPresets])

  const realClose = () => {
    // Se houve mudanças, restaurar o snapshot inicial
    if (isDirty) {
      updateSidebarSettings(originalSettingsRef.current)
    }
    onClose()
  }

  const handleAttemptClose = () => {
    if (isDirty) {
      setConfirmAction("discard")
      return
    }
    realClose()
  }

  const handleSave = () => {
    setConfirmAction("save")
  }

  const confirmSave = () => {
    // Atualizar snapshot para as novas mudanças (já foram aplicadas)
    originalSettingsRef.current = sidebarSettings
    setSavedSnapshot(JSON.stringify(sidebarSettings))
    setConfirmAction(null)
    onClose()
  }

  const confirmDiscard = () => {
    setConfirmAction(null)
    realClose()
  }

  const handleResetDefault = () => {
    applyPreview(DEFAULT_THEME_V2 as typeof sidebarSettings)
    setOpenResetDialog(false)
  }

  const handleResetLastSaved = () => {
    applyPreview(sidebarSettings)
    setOpenResetDialog(false)
  }

  const handleLogoFile = (file: File) => {
    const url = URL.createObjectURL(file)
        applyPreview({ sidebarLogo: url })
  }

  const handleFaviconFile = (file: File) => {
    const url = URL.createObjectURL(file)
    applyPreview({ sidebarFavicon: url })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const url = ev.target?.result as string
        const dominantImageColor = await extractDominantColor(url)
        applyFullTheme({ backgroundImage: url, backgroundMode: "image", dominantImageColor })
      }
      reader.readAsDataURL(file)
    }
  }

  const applyImagePreset = async (url: string, accentColor?: string) => {
    const dominantImageColor = accentColor ?? await extractDominantColor(url)
    applyFullTheme({ backgroundImage: url, backgroundMode: "image+gradient", dominantImageColor })
  }

  const saveCustomImagePreset = () => {
    if (!imagePresetName.trim() || !backgroundImage) return
    const entry = {
      id: Date.now().toString(),
      name: imagePresetName.trim(),
      url: backgroundImage,
      accentColor: sidebarSettings.dominantImageColor || "",
    }
    const updated = [...customImagePresets, entry]
    setCustomImagePresets(updated)
    try { localStorage.setItem("allka_custom_image_presets", JSON.stringify(updated)) } catch {}
    setImagePresetName("")
    setSaveImagePresetOpen(false)
  }

  const deleteCustomImagePreset = (id: string) => {
    const updated = customImagePresets.filter(p => p.id !== id)
    setCustomImagePresets(updated)
    try { localStorage.setItem("allka_custom_image_presets", JSON.stringify(updated)) } catch {}
  }

  const resetToDefault = () => {
    const defaultGradient = "custom-gradient:linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, #1a1a4f 10%, #2d1b4e 25%, #4a1a8a 40%, #5a2a9f 50%, #4a1a8a 60%, #2d1b4e 75%, #1a1a4f 90%, rgba(0,0,0,0.7) 100%)"
    applyPreview({ backgroundColor: defaultGradient, backgroundImage: null, imageOpacity: 100, imageOverlay: "none", backgroundMode: "gradient" })
  }

  const groupedColors = solidColors.reduce(
    (acc, color) => {
      if (!acc[color.category]) {
        acc[color.category] = []
      }
      acc[color.category].push(color)
      return acc
    },
    {} as Record<string, typeof solidColors>,
  )

  const groupedGradients = gradientPresets.reduce(
    (acc, gradient) => {
      if (!acc[gradient.category]) {
        acc[gradient.category] = []
      }
      acc[gradient.category].push(gradient)
      return acc
    },
    {} as Record<string, (typeof gradientPresets)[0][]>,
  )

  return (
    <Sheet 
      open={open} 
      onOpenChange={(next) => {
        if (!next) handleAttemptClose()
      }}
    >
      <SheetContent
        side="right"
        hideOverlay={true}
        className="p-0 h-screen bg-white shadow-2xl flex flex-col gap-0"
        style={{ left: `${sidebarWidth}px`, width: `calc(100vw - ${sidebarWidth}px)`, maxWidth: `calc(100vw - ${sidebarWidth}px)` }}
      >
        {/* Header */}
        <header className="relative overflow-hidden shrink-0 app-brand-header">
          {/* Decorative background layers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-white/5" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
            />
          </div>

          {/* Content row */}
          <div className="relative px-5 pt-5 pb-5 flex items-start justify-between gap-3">
            {/* Left: icon + title + meta */}
            <div className="flex items-start gap-3.5 min-w-0">
              {/* Icon bubble */}
              <div className="shrink-0 w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center mt-0.5">
                <Palette className="h-5 w-5 text-white" />
              </div>

              {/* Text */}
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white leading-tight tracking-tight">Personalizar Tema</h2>
                <p className="text-xs text-white/65 mt-0.5 leading-snug">Ajuste e preferências visuais da plataforma</p>

                {/* Active theme badge */}
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  {/* Live color swatch */}
                  <div
                    className="w-3.5 h-3.5 rounded-full ring-1 ring-white/30 shrink-0"
                    style={{ background: buildCSSPreview(selectedColor) }}
                  />
                  <span className="text-[10px] text-white/70 font-medium">
                    {activePresetName}
                  </span>
                  <span className="text-white/25 text-[10px]">·</span>
                  <span className="text-[10px] text-white/45 font-medium uppercase tracking-widest">
                    {backgroundMode === "image" ? "Imagem" : backgroundMode === "image+gradient" ? "Imagem + gradiente" : "Gradiente"}
                  </span>
                  <span className="text-white/25 text-[10px]">·</span>
                  {isDirty ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[9px] font-semibold uppercase tracking-wide">
                      Não salvo
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-400/25 text-emerald-300 text-[9px] font-semibold uppercase tracking-wide">
                      Salvo
                    </span>
                  )}
                </div>
              </div>
            </div>


          </div>
        </header>

        {/* Tabs Header - FIXO */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <div className="bg-white flex-shrink-0">
            <div className="px-4 flex items-center justify-between">
              <TabsList className="grid w-max grid-cols-3 gap-1 bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="cores"
                  className="px-2 py-1.5 text-xs font-medium rounded-md border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm hover:bg-slate-100 transition-colors"
                >
                  Cores & Gradientes
                </TabsTrigger>
                <TabsTrigger
                  value="imagem"
                  className="px-2 py-1.5 text-xs font-medium rounded-md border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm hover:bg-slate-100 transition-colors"
                >
                  Superfícies
                </TabsTrigger>
                <TabsTrigger
                  value="fontes"
                  className="px-2 py-1.5 text-xs font-medium rounded-md border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm hover:bg-slate-100 transition-colors"
                >
                  Fontes
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenResetDialog(true)}
                  className="gap-1.5 h-7 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  Redefinir
                </Button>
              </div>
            </div>
            <div className="border-b border-slate-200 mx-4 mt-2" />
          </div>

          {/* Content com SCROLL */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {/* Tab: Cores & Gradientes */}
            {activeTab === "cores" && (
              <div className="space-y-3">

                {/* ── BRANDING ──────────────────────────────────────────── */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Branding</p>
                  <div className="flex items-end gap-4">

                    {/* Logo expandido – mostra na proporção real da sidebar (~160×40) */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-slate-600">Logo</span>
                      <label className="relative flex items-center justify-center cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                        style={{ width: 160, height: 44 }}>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }} />
                        {sidebarSettings.sidebarLogo
                          ? <img src={sidebarSettings.sidebarLogo} alt="Logo" className="object-contain w-full h-full p-1" />
                          : <span className="text-[11px] text-slate-400 font-medium">+ Clique para trocar</span>}
                      </label>
                      {sidebarSettings.sidebarLogo && (
                        <button type="button" onClick={() => applyPreview({ sidebarLogo: null })}
                          className="text-[10px] text-red-400 hover:text-red-600 transition-colors leading-none text-center">
                          Remover
                        </button>
                      )}
                    </div>

                    {/* Separador */}
                    <div className="w-px h-12 bg-slate-100 shrink-0" />

                    {/* Favicon – 40×40, tamanho real do ícone colapsado */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-slate-600">Ícone (sidebar fechada)</span>
                      <label className="relative flex items-center justify-center cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                        style={{ width: 44, height: 44 }}>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFaviconFile(f) }} />
                        {sidebarSettings.sidebarFavicon
                          ? <img src={sidebarSettings.sidebarFavicon} alt="Favicon" className="object-contain w-full h-full p-1" />
                          : <span className="text-[10px] text-slate-400 text-center leading-tight">+</span>}
                      </label>
                      {sidebarSettings.sidebarFavicon && (
                        <button type="button" onClick={() => applyPreview({ sidebarFavicon: null })}
                          className="text-[10px] text-red-400 hover:text-red-600 transition-colors leading-none text-center">
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── PRESETS ───────────────────────────────────────────── */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Presets de tema</p>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((preset) => {
                      const active = selectedColor === preset.theme.backgroundColor
                      return (
                        <button key={preset.name} type="button"
                          onClick={() => applyFullTheme(preset.theme as typeof sidebarSettings)}
                          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition-all ${
                            active ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                          }`}>
                          <div className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                            style={{ background: buildCSSPreview(preset.theme.backgroundColor) }} />
                          {preset.name}
                          {active && <Check className="h-2.5 w-2.5 ml-0.5" />}
                        </button>
                      )
                    })}
                    {gradientPresets.map((g) => {
                      const active = selectedColor === g.value
                      return (
                        <button key={g.value} type="button" onClick={() => applyPreset(g.value)}
                          className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-medium transition-all ${
                            active ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                          }`}>
                          <div className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ background: g.preview }} />
                          {g.name}
                          {active && <Check className="h-2.5 w-2.5 ml-0.5" />}
                        </button>
                      )
                    })}
                    {customPresets.map((p) => {
                      const active = selectedColor === p.value
                      return (
                        <div key={p.id} className="relative group flex items-center">
                          <button type="button" onClick={() => applyPreset(p.value)}
                            className={`flex items-center gap-1.5 h-7 pl-2.5 pr-6 rounded-full border text-[11px] font-medium transition-all ${
                              active ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            }`}>
                            <div className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ background: p.preview }} />
                            {p.name}
                            {active && <Check className="h-2.5 w-2.5 ml-0.5" />}
                          </button>
                          <button type="button" onClick={() => setDeletePresetId(p.id)}
                            className="absolute right-1.5 opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 text-slate-400 hover:text-red-500 transition-all shadow-sm">
                            <X className="h-2 w-2" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── CORES SÓLIDAS ─────────────────────────────────────── */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Cores sólidas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {solidColors.map((color) => (
                      <button key={color.value} type="button" onClick={() => applyPreset(color.value)}
                        title={color.name}
                        className={cn(
                          "relative w-7 h-7 rounded-lg border transition-all hover:scale-110",
                          selectedColor === color.value ? "ring-2 ring-blue-500 ring-offset-1 border-transparent" : "border-black/10"
                        )}
                        style={{ backgroundColor: color.preview }}>
                        {selectedColor === color.value && (
                          <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                    <button type="button" onClick={() => setOpenColorPicker(true)} title="Cor personalizada"
                      className="w-7 h-7 rounded-lg border border-dashed border-slate-300 flex items-center justify-center hover:bg-slate-50 hover:border-slate-400 transition-colors">
                      <Plus className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* ── GRADIENTE PERSONALIZADO ───────────────────────────── */}
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">Gradiente personalizado</p>
                  <div className="flex items-center gap-2 w-fit">
                    <input type="color" value={customGradientColor1}
                      onChange={(e) => { const c1 = e.target.value; applyPreview({ customGradientColor1: c1, backgroundColor: `custom-gradient:linear-gradient(${customGradientDirection}, ${c1}, ${customGradientColor2})` }) }}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 shrink-0" title="Cor inicial" />
                    <div className="w-28 h-8 rounded-lg border border-slate-200 shadow-inner shrink-0"
                      style={{ background: `linear-gradient(${customGradientDirection}, ${customGradientColor1}, ${customGradientColor2})` }} />
                    <input type="color" value={customGradientColor2}
                      onChange={(e) => { const c2 = e.target.value; applyPreview({ customGradientColor2: c2, backgroundColor: `custom-gradient:linear-gradient(${customGradientDirection}, ${customGradientColor1}, ${c2})` }) }}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 shrink-0" title="Cor final" />
                    <select value={customGradientDirection}
                      onChange={(e) => { const dir = e.target.value as typeof customGradientDirection; applyPreview({ customGradientDirection: dir, backgroundColor: `custom-gradient:linear-gradient(${dir}, ${customGradientColor1}, ${customGradientColor2})` }) }}
                      className="h-8 px-1.5 border border-slate-200 rounded-lg text-xs bg-white shrink-0">
                      <option value="to right">→</option>
                      <option value="to bottom">↓</option>
                      <option value="135deg">↘</option>
                    </select>
                    <button type="button"
                      onClick={() => { const cg = `custom-gradient:linear-gradient(${customGradientDirection}, ${customGradientColor1}, ${customGradientColor2})`; applyPreset(cg); setSavePresetOpen(true) }}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-400 text-slate-500 hover:text-blue-600 transition-colors shrink-0 flex items-center gap-1.5 text-[11px] font-medium"
                      title="Salvar como preset">
                      <Sparkles className="h-3.5 w-3.5" />
                      Salvar
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Tab: Superfícies — compact */}
            {activeTab === "imagem" && (
              <div className="space-y-2">

                {/* FUNDO DA SIDEBAR */}
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Fundo da Sidebar</p>
                  <div className="flex gap-1 mb-2">
                    {([{value:"gradient",label:"Gradiente"},{value:"image",label:"Só Imagem"},{value:"image+gradient",label:"Img + Sombra"}] as const).map((mode) => (
                      <button key={mode.value} type="button"
                        onClick={() => applyPreview({ backgroundMode: mode.value as typeof backgroundMode })}
                        className={`flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                          backgroundMode === mode.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                        }`}>{mode.label}</button>
                    ))}
                  </div>

                  {backgroundMode !== "gradient" && (
                    <div className="space-y-2">
                      <label htmlFor="image-upload" className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                        <Upload className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-600">Upload de imagem (JPG / PNG / WEBP)</span>
                        <Input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                      </label>

                      {backgroundImage && (
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="relative">
                            <img src={backgroundImage} alt="Preview" className="w-full h-16 object-cover" />
                            <div className="absolute top-1 right-1 flex gap-1">
                              <button type="button" onClick={() => setSaveImagePresetOpen(true)}
                                className="h-5 px-1.5 rounded bg-white/90 border border-white/50 text-slate-700 text-[10px] font-medium flex items-center gap-1 shadow-sm hover:bg-white">
                                <Sparkles className="h-2.5 w-2.5" />Preset
                              </button>
                              <button type="button" onClick={() => applyFullTheme({ backgroundImage: null, dominantImageColor: null })}
                                className="h-5 w-5 rounded bg-white/90 border border-white/50 flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm hover:bg-white">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                          {/* Controls — 2 col grid */}
                          <div className="p-2 bg-slate-50 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                            <div>
                              <span className="text-slate-400">Vertical</span>
                              <div className="flex gap-0.5 mt-0.5">
                                {(["top","center","bottom"] as const).map(p => (
                                  <button key={p} type="button" onClick={() => applyPreview({ imagePosition: p })}
                                    className={`flex-1 py-0.5 rounded border font-medium transition-all ${ imagePosition===p ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600" }`}>
                                    {p==="top"?"T":p==="center"?"M":"B"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400">Horizontal</span>
                              <div className="flex gap-0.5 mt-0.5">
                                {(["left","center","right"] as const).map(a => (
                                  <button key={a} type="button" onClick={() => applyPreview({ imageAlignment: a })}
                                    className={`flex-1 py-0.5 rounded border font-medium transition-all ${ imageAlignment===a ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600" }`}>
                                    {a==="left"?"E":a==="center"?"C":"D"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                              <span className="text-slate-400 w-20 shrink-0">Zoom {imageScale}%</span>
                              <input type="range" min="50" max="200" value={imageScale} onChange={(e) => applyPreview({ imageScale: Number(e.target.value) })} className="flex-1 h-1 rounded accent-blue-500" />
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                              <span className="text-slate-400 w-20 shrink-0">Opacidade {imageOpacity}%</span>
                              <input type="range" min="0" max="100" value={imageOpacity} onChange={(e) => applyPreview({ imageOpacity: Number(e.target.value) })} className="flex-1 h-1 rounded accent-blue-500" />
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400">Overlay</span>
                              <div className="flex gap-0.5 mt-0.5">
                                {["none","blue","purple","pink"].map(ov => (
                                  <button key={ov} type="button" onClick={() => applyPreview({ imageOverlay: ov as typeof imageOverlay })}
                                    className={`flex-1 py-0.5 rounded border font-medium transition-all ${ imageOverlay===ov ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600" }`}>
                                    {ov==="none"?"—":ov.charAt(0).toUpperCase()+ov.slice(1)}
                                  </button>
                                ))}
                              </div>
                              {imageOverlay !== "none" && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-slate-400 w-20 shrink-0">Intensidade {overlayIntensity}%</span>
                                  <input type="range" min="0" max="100" value={overlayIntensity} onChange={(e) => applyPreview({ overlayIntensity: Number(e.target.value) })} className="flex-1 h-1 rounded accent-blue-500" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image presets — horizontal strip */}
                      {[...backgroundPresets, ...customImagePresets.map(p => ({ name: p.name, url: p.url, description: "", accentColor: p.accentColor, isCustom: true, id: p.id }))].length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                          {[...backgroundPresets, ...customImagePresets.map(p => ({ name: p.name, url: p.url, description: "", accentColor: p.accentColor, isCustom: true, id: p.id }))].map((preset) => (
                            <div key={preset.url} className="relative group shrink-0">
                              <button type="button" onClick={() => applyImagePreset(preset.url, preset.accentColor)}
                                className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${ backgroundImage === preset.url ? "border-blue-500" : "border-slate-200 hover:border-slate-400" }`}>
                                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                                {backgroundImage === preset.url && <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30"><Check className="h-4 w-4 text-white drop-shadow" /></div>}
                              </button>
                              <p className="text-[9px] text-slate-500 text-center mt-0.5 truncate w-14">{preset.name}</p>
                              {"isCustom" in preset && preset.isCustom && (
                                <button type="button" onClick={() => setDeleteImagePresetId(preset.id as string)}
                                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white transition-all">
                                  <X className="h-2 w-2" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* CABEÇALHOS */}
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Cabeçalhos</p>
                    <button type="button"
                      onClick={() => applyPreview({ headerBg: sidebarSettings.headerBg === null ? sidebarSettings.backgroundColor : null })}
                      className={`h-5 px-2 rounded-full border text-[10px] font-medium transition-all ${
                        sidebarSettings.headerBg === null ? "border-emerald-400/40 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>{sidebarSettings.headerBg === null ? "= Sidebar" : "Personalizar"}</button>
                  </div>
                  {sidebarSettings.headerBg !== null && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {[...presets.map(p => ({ name: p.name, value: p.theme.backgroundColor, preview: buildCSSPreview(p.theme.backgroundColor) })),
                          ...gradientPresets.map(g => ({ name: g.name, value: g.value, preview: g.preview }))
                        ].map((item) => (
                          <button key={item.value} type="button" onClick={() => applyPreview({ headerBg: item.value })}
                            className={`flex items-center gap-1 h-5 px-1.5 rounded-full border text-[10px] font-medium transition-all ${ sidebarSettings.headerBg===item.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300" }`}>
                            <div className="w-2 h-2 rounded-full border border-black/10" style={{ background: item.preview }} />{item.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={headerG1} onChange={(e) => { setHeaderG1(e.target.value); applyPreview({ headerBg: `custom-gradient:linear-gradient(${headerGDir}, ${e.target.value}, ${headerG2})` }) }} className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0" />
                        <div className="flex-1 h-6 rounded border border-slate-200" style={{ background: `linear-gradient(${headerGDir}, ${headerG1}, ${headerG2})` }} />
                        <input type="color" value={headerG2} onChange={(e) => { setHeaderG2(e.target.value); applyPreview({ headerBg: `custom-gradient:linear-gradient(${headerGDir}, ${headerG1}, ${e.target.value})` }) }} className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0" />
                        <select value={headerGDir} onChange={(e) => { const d = e.target.value as typeof headerGDir; setHeaderGDir(d); applyPreview({ headerBg: `custom-gradient:linear-gradient(${d}, ${headerG1}, ${headerG2})` }) }} className="h-6 px-1 border border-slate-200 rounded text-[11px] bg-white shrink-0">
                          <option value="to right">→</option><option value="to bottom">↓</option><option value="135deg">↘</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÕES */}
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Botões</p>
                    <button type="button"
                      onClick={() => applyPreview({ buttonBg: sidebarSettings.buttonBg === null ? sidebarSettings.backgroundColor : null })}
                      className={`h-5 px-2 rounded-full border text-[10px] font-medium transition-all ${
                        sidebarSettings.buttonBg === null ? "border-emerald-400/40 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}>{sidebarSettings.buttonBg === null ? "= Sidebar" : "Personalizar"}</button>
                  </div>
                  {sidebarSettings.buttonBg !== null && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {solidColors.map((color) => (
                          <button key={color.value} type="button" onClick={() => applyPreview({ buttonBg: color.value })} title={color.name}
                            className={cn("relative w-5 h-5 rounded border transition-all hover:scale-110", sidebarSettings.buttonBg===color.value ? "ring-2 ring-blue-500 ring-offset-1 border-transparent" : "border-black/10")}
                            style={{ backgroundColor: color.preview }}>
                            {sidebarSettings.buttonBg===color.value && <Check className="absolute inset-0 m-auto h-2.5 w-2.5 text-white drop-shadow" />}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[...presets.map(p => ({ name: p.name, value: p.theme.backgroundColor, preview: buildCSSPreview(p.theme.backgroundColor) })),
                          ...gradientPresets.map(g => ({ name: g.name, value: g.value, preview: g.preview }))
                        ].map((item) => (
                          <button key={item.value} type="button" onClick={() => applyPreview({ buttonBg: item.value })}
                            className={`flex items-center gap-1 h-5 px-1.5 rounded-full border text-[10px] font-medium transition-all ${ sidebarSettings.buttonBg===item.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300" }`}>
                            <div className="w-2 h-2 rounded-full border border-black/10" style={{ background: item.preview }} />{item.name}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={buttonG1} onChange={(e) => { setButtonG1(e.target.value); applyPreview({ buttonBg: `custom-gradient:linear-gradient(${buttonGDir}, ${e.target.value}, ${buttonG2})` }) }} className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0" />
                        <div className="flex-1 h-6 rounded border border-slate-200" style={{ background: `linear-gradient(${buttonGDir}, ${buttonG1}, ${buttonG2})` }} />
                        <input type="color" value={buttonG2} onChange={(e) => { setButtonG2(e.target.value); applyPreview({ buttonBg: `custom-gradient:linear-gradient(${buttonGDir}, ${buttonG1}, ${e.target.value})` }) }} className="w-6 h-6 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0" />
                        <select value={buttonGDir} onChange={(e) => { const d = e.target.value as typeof buttonGDir; setButtonGDir(d); applyPreview({ buttonBg: `custom-gradient:linear-gradient(${d}, ${buttonG1}, ${buttonG2})` }) }} className="h-6 px-1 border border-slate-200 rounded text-[11px] bg-white shrink-0">
                          <option value="to right">→</option><option value="to bottom">↓</option><option value="135deg">↘</option>
                        </select>
                      </div>
                      <button type="button" className="btn-brand w-full h-7 rounded-lg text-xs font-semibold text-white pointer-events-none">Prévia do botão</button>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Tab: Fontes */}
            {activeTab === "fontes" && (
              <div className="space-y-2">

                {/* Escala Geral */}
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Escala Geral</p>
                  <p className="text-[10px] text-slate-500 mb-2">Ajusta o tamanho base de toda a interface proporcionalmente.</p>
                  <div className="flex gap-1">
                    {([{v:"compact",l:"Compacto"},{v:"normal",l:"Normal"},{v:"comfortable",l:"Confortável"},{v:"large",l:"Grande"}] as const).map(({v,l}) => (
                      <button key={v} type="button" onClick={() => applyPreview({ fontScale: v })}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${ sidebarSettings.fontScale===v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300" }`}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Per-context sizes */}
                <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">

                  {/* Sidebar */}
                  {([
                    { label: "Sidebar",     key: "fontSizeSidebar", opts: [{v:"xs",l:"Mini"},{v:"sm",l:"Pequeno"},{v:"base",l:"Normal"}] },
                    { label: "Títulos",     key: "fontSizeHeading", opts: [{v:"sm",l:"P"},{v:"base",l:"M"},{v:"lg",l:"G"},{v:"xl",l:"GG"}] },
                    { label: "Corpo / Labels", key: "fontSizeBody",    opts: [{v:"xs",l:"Mini"},{v:"sm",l:"Pequeno"},{v:"base",l:"Normal"}] },
                    { label: "Tabelas",     key: "fontSizeTable",   opts: [{v:"xs",l:"Compacto"},{v:"sm",l:"Normal"},{v:"base",l:"Espaçado"}] },
                  ] as const).map(({ label, key, opts }) => (
                    <div key={key} className="flex items-center gap-3 px-2.5 py-2">
                      <span className="text-[11px] font-medium text-slate-600 w-24 shrink-0">{label}</span>
                      <div className="flex gap-1 flex-1">
                        {opts.map(({v, l}) => (
                          <button key={v} type="button" onClick={() => applyPreview({ [key]: v })}
                            className={`flex-1 py-1 rounded-md text-[11px] font-medium border transition-all ${ sidebarSettings[key]===v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300" }`}>{l}</button>
                        ))}
                      </div>
                    </div>
                  ))}

                </div>

                {/* Preview strip */}
                <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Prévia</p>
                  <div className="space-y-1.5 text-slate-700">
                    <p style={{ fontSize: "var(--app-font-heading, 1rem)", fontWeight: 600, lineHeight: 1.3 }}>Título de Página</p>
                    <p style={{ fontSize: "var(--app-font-body, 0.8125rem)", color: "#64748b" }}>Texto de corpo normal, descrições e labels.</p>
                    <div className="mt-1 rounded border border-slate-200 overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50">
                          <tr><th className="px-2 py-1 border-b border-slate-200" style={{ fontSize: "var(--app-font-table, 0.7rem)", fontWeight: 600 }}>Coluna A</th><th className="px-2 py-1 border-b border-slate-200" style={{ fontSize: "var(--app-font-table, 0.7rem)", fontWeight: 600 }}>Coluna B</th></tr>
                        </thead>
                        <tbody>
                          <tr><td className="px-2 py-1" style={{ fontSize: "var(--app-font-table, 0.7rem)" }}>Valor 1</td><td className="px-2 py-1" style={{ fontSize: "var(--app-font-table, 0.7rem)" }}>Dado</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </Tabs>

        {/* Footer */}
        <footer className="border-t px-4 py-2.5 flex gap-2 bg-gray-50 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleAttemptClose} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSavePresetOpen(true)} className="flex-1 gap-1 h-8 text-xs">
            <Sparkles className="h-3 w-3" />
            Salvar como Preset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty} className="flex-1 btn-brand text-white h-8 text-xs">
            Salvar Alterações
          </Button>
        </footer>

        {/* Reset Dialog */}
        <AlertDialog open={openResetDialog} onOpenChange={setOpenResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Redefinir personalização</AlertDialogTitle>
              <AlertDialogDescription>
                Escolha como deseja restaurar o sidebar.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-3 py-2">
              <Button
                variant="outline"
                onClick={handleResetDefault}
                className="justify-start"
              >
                Voltar ao padrão da plataforma
              </Button>

              <Button
                variant="outline"
                onClick={handleResetLastSaved}
                className="justify-start"
              >
                Voltar ao último layout salvo
              </Button>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmation Dialog - Dinâmica para Salvar ou Descartar */}
        <AlertDialog open={confirmAction !== null} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction === "save"
                  ? "Salvar alterações?"
                  : "Descartar alterações?"}
              </AlertDialogTitle>

              <AlertDialogDescription>
                {confirmAction === "save"
                  ? "Tem certeza que deseja salvar as alterações no sidebar?"
                  : "Tem certeza que não deseja salvar as alterações?"}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>
                Continuar editando
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={() => {
                  if (confirmAction === "save") confirmSave()
                  else confirmDiscard()
                }}
                className={confirmAction === "save" ? "bg-blue-600 hover:bg-blue-700" : "bg-destructive hover:bg-destructive/90"}
              >
                {confirmAction === "save" ? "Salvar" : "Descartar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete custom gradient preset */}
        <AlertDialog open={deletePresetId !== null} onOpenChange={(v) => { if (!v) setDeletePresetId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir preset?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O preset será removido permanentemente da sua lista.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => { if (deletePresetId) { deleteCustomPreset(deletePresetId); setDeletePresetId(null) } }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete custom image preset */}
        <AlertDialog open={deleteImagePresetId !== null} onOpenChange={(v) => { if (!v) setDeleteImagePresetId(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir preset de imagem?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O preset de imagem será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => { if (deleteImagePresetId) { deleteCustomImagePreset(deleteImagePresetId); setDeleteImagePresetId(null) } }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Preset Dialog */}
        <AlertDialog open={savePresetOpen} onOpenChange={(v) => { setSavePresetOpen(v); if (!v) setPresetName("") }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Salvar como Preset
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dê um nome para este tema. Ele ficará disponível na lista de presets personalizados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                placeholder="Ex: Padrão 2, Tema Cliente X, Azul Corporativo..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCustomPreset()}
                autoFocus
                className="w-full"
              />
              {presetName.trim() && (
                <div className="mt-3 flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                  <div
                    className="w-6 h-6 rounded border border-black/10 shrink-0"
                    style={{ background: buildCSSPreview(sidebarSettings.backgroundColor) }}
                  />
                  <p className="text-sm text-slate-700">{presetName.trim()}</p>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPresetName("")}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={saveCustomPreset}
                disabled={!presetName.trim()}
                className="btn-brand text-white"
              >
                Salvar Preset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Image Preset Dialog */}
        <AlertDialog open={saveImagePresetOpen} onOpenChange={(v) => { setSaveImagePresetOpen(v); if (!v) setImagePresetName("") }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Salvar Preset de Imagem
              </AlertDialogTitle>
              <AlertDialogDescription>
                Dê um nome para este preset de imagem de fundo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                placeholder="Ex: Fundo Corporativo, Tema Cliente..."
                value={imagePresetName}
                onChange={(e) => setImagePresetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCustomImagePreset()}
                autoFocus
                className="w-full"
              />
              {imagePresetName.trim() && backgroundImage && (
                <div className="mt-3 h-16 rounded-lg overflow-hidden border border-slate-200">
                  <img src={backgroundImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setImagePresetName("")}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={saveCustomImagePreset}
                disabled={!imagePresetName.trim() || !backgroundImage}
                className="btn-brand text-white"
              >
                Salvar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
