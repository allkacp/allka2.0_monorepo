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
    value: "bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-900",
    preview: "linear-gradient(to bottom right, #1e3a8a, #1e40af, #164e63)",
    category: "blue",
  },
  {
    name: "Galáxia Roxa",
    value: "bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900",
    preview: "linear-gradient(to bottom right, #581c87, #5b21b6, #312e81)",
    category: "purple",
  },
]

// Background image presets
const backgroundPresets = [
  {
    name: "Galáxia Allka",
    url: "/images/allka-galaxy-bg.png",
    description: "Nova identidade Allka - Galáxia azul e roxa",
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

const presets = [
  {
    name: "Versão 1.0",
    description: "Padrão original",
    backgroundColor: "bg-slate-900",
    icon: "🔵",
  },
  {
    name: "Versão 2.0",
    description: "Degradê diagonal - preto a azul a magenta",
    backgroundColor: "custom-gradient:linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)",
    icon: "🚀",
  },
]

// Default Theme V2 (Preset 2.0) - para reset
const DEFAULT_THEME_V2 = {
  backgroundColor: "custom-gradient:linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%)",
  backgroundImage: "",
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

export function SidebarSettingsModal({ open, onClose }: SidebarSettingsModalProps) {
  const { sidebarSettings, updateSidebarSettings, applyFullTheme, sidebarCollapsed, sidebarWidth } = useSidebar()
  const originalSettingsRef = useRef(sidebarSettings)
  const [openResetDialog, setOpenResetDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"discard" | "save" | null>(null)
  const [customColors, setCustomColors] = useState<string[]>([])
  const [rgb, setRgb] = useState({ r: 120, g: 120, b: 120 })
  const [activeTab, setActiveTab] = useState("cores")

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

  // Verificar se foi modificado
  const isDirty = useMemo(() => {
    return JSON.stringify(sidebarSettings) !== JSON.stringify(originalSettingsRef.current)
  }, [sidebarSettings])

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
      reader.onload = (e) => {
        applyPreview({ backgroundImage: e.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const applyImagePreset = (url: string) => {
    applyPreview({
      backgroundImage: url,
      backgroundMode: "image+gradient",
    })
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
        <header className="relative flex items-center justify-between px-6 py-5 border-b app-brand-header flex-shrink-0">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <h2 className="text-lg font-bold">Personalizar Tema</h2>
          </div>
          <button
            onClick={handleAttemptClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Tabs Header - FIXO */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <div className="bg-white flex-shrink-0">
            <div className="px-6 flex items-center justify-between">
              <TabsList className="grid w-max grid-cols-2 gap-2 bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="cores"
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm hover:bg-slate-100 transition-colors"
                >
                  Cores & Gradientes
                </TabsTrigger>
                <TabsTrigger
                  value="imagem"
                  className="px-3 py-2 text-sm font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm hover:bg-slate-100 transition-colors"
                >
                  Imagem de Fundo
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenResetDialog(true)}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Redefinir
                </Button>
              </div>
            </div>
            <div className="border-b border-slate-200 mx-6 mt-4" />
          </div>

          {/* Content com SCROLL - Simples com overflow-y-auto */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4.5">
            {/* Tab: Cores & Gradientes */}
            {activeTab === "cores" && (
              <div className="space-y-6">
                {/* TOP: Branding e Presets em 2 Colunas */}
                <div className="grid grid-cols-2 gap-6">
                  {/* COLUNA ESQUERDA: Branding */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900">Logo e Ícone</h3>
                    
                    {/* Logo e Favicon lado a lado */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Logo (Sidebar Expandida) */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700">Logo</label>
                        <label className="group relative h-16 w-full rounded-xl border border-gray-200 bg-muted flex items-center justify-center cursor-pointer overflow-hidden hover:bg-gray-100 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleLogoFile(file)
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              const file = e.dataTransfer.files?.[0]
                              if (file) handleLogoFile(file)
                            }}
                          />

                          {sidebarSettings.sidebarLogo ? (
                            <img 
                              src={sidebarSettings.sidebarLogo} 
                              alt="Logo" 
                              className="object-contain h-full w-full"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground text-center px-3">
                              Arraste ou clique para enviar o logo
                            </span>
                          )}
                        </label>
                        {sidebarSettings.sidebarLogo && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreview({ sidebarLogo: null })}
                            className="w-full"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remover
                          </Button>
                        )}
                      </div>

                      {/* Favicon (Sidebar Colapsada) */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700">Favicon</label>
                        <label className="group relative size-10 rounded-lg border border-gray-200 bg-muted flex items-center justify-center cursor-pointer overflow-hidden hover:bg-gray-100 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFaviconFile(file)
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault()
                              const file = e.dataTransfer.files?.[0]
                              if (file) handleFaviconFile(file)
                            }}
                          />

                          {sidebarSettings.sidebarFavicon ? (
                            <img 
                              src={sidebarSettings.sidebarFavicon} 
                              alt="Favicon" 
                              className="object-contain h-full w-full"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground text-center px-1">
                              Ícone
                            </span>
                          )}
                        </label>
                        {sidebarSettings.sidebarFavicon && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyPreview({ sidebarFavicon: null })}
                            className="w-full h-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* COLUNA DIREITA: Presets */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Presets de Tema
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {presets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyPreset(preset.backgroundColor)}
                          className={`p-2 rounded-lg border transition-all text-left ${
                            selectedColor === preset.backgroundColor
                              ? "border-blue-500 border-2 bg-blue-50 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base shrink-0 mt-0.5">{preset.icon}</span>
                            <div className="leading-tight min-w-0">
                              <p className="font-semibold text-gray-800 text-xs">{preset.name}</p>
                              <p className="text-gray-500 line-clamp-1 text-[11px]">{preset.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cores Sólidas e Gradientes em 2 Colunas */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Coluna Esquerda - Cores Sólidas */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Cores Sólidas</h3>
                    <div className="grid grid-cols-8 gap-2 w-fit">
                      {solidColors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => applyPreset(color.value)}
                          className={cn(
                            "relative w-7 h-7 rounded-md border border-border/60 transition hover:scale-110",
                            selectedColor === color.value
                              ? "hover:border-white/70 ring-1 ring-white/50"
                              : "hover:border-white/70"
                          )}
                          style={{ backgroundColor: color.preview }}
                          title={color.name}
                        >
                          {selectedColor === color.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-sm bg-white shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={cn(
                          "relative w-7 h-7 rounded-md border border-dashed border-border/60 flex items-center justify-center hover:bg-muted/50 transition-all hover:scale-110 hover:border-white/70",
                          "hover:border-white/70"
                        )}
                        onClick={() => setOpenColorPicker(true)}
                        title="Cor personalizada"
                      >
                        <Plus className="size-3 opacity-70" />
                      </button>
                    </div>
                  </div>

                  {/* Coluna Direita - Gradientes */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Degradês</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {gradientPresets.map((gradient) => (
                        <button
                          key={gradient.value}
                          type="button"
                          onClick={() => applyPreset(gradient.value)}
                          className={cn(
                            "h-8 rounded-lg border transition-all cursor-pointer",
                            selectedColor === gradient.value
                              ? "ring-2 ring-primary ring-offset-2 border-primary"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          style={{ background: gradient.preview }}
                          title={gradient.name}
                        >
                          {selectedColor === gradient.value && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-white drop-shadow-md" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Criar Gradiente Personalizado */}
                <div className="space-y-3 border rounded-xl p-4 bg-gradient-to-br from-blue-50 to-purple-50">
                  <h3 className="text-base font-semibold text-gray-900">Criar Gradiente Personalizado</h3>
                  
                  {/* Cores */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-700 block mb-2">Cor 1</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customGradientColor1}
                            onChange={(e) => applyPreview({ customGradientColor1: e.target.value })}
                            className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300"
                          />
                          <input
                            type="text"
                            value={customGradientColor1}
                            onChange={(e) => applyPreview({ customGradientColor1: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-gray-700 block mb-2">Cor 2</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customGradientColor2}
                            onChange={(e) => applyPreview({ customGradientColor2: e.target.value })}
                            className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300"
                          />
                          <input
                            type="text"
                            value={customGradientColor2}
                            onChange={(e) => applyPreview({ customGradientColor2: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Direção */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-2">Direção</label>
                    <select
                      value={customGradientDirection}
                      onChange={(e) => applyPreview({ customGradientDirection: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="to right">Horizontal (esquerda → direita)</option>
                      <option value="to bottom">Vertical (topo → fundo)</option>
                      <option value="135deg">Diagonal (canto superior esquerdo)</option>
                    </select>
                  </div>

                  {/* Preview */}
                  <div
                    className="h-12 rounded-lg border-2 border-gray-300 shadow-sm transition-all"
                    style={{ background: `linear-gradient(${customGradientDirection}, ${customGradientColor1}, ${customGradientColor2})` }}
                  />

                  {/* Botão Salvar */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const customGradient = `custom-gradient:linear-gradient(${customGradientDirection}, ${customGradientColor1}, ${customGradientColor2})`
                      applyPreset(customGradient)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Salvar como Preset
                  </Button>
                </div>
              </div>
            )}

            {/* Tab: Imagem de Fundo */}
            {activeTab === "imagem" && (
              <div className="space-y-6">
                {/* Modo de Fundo */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Modo de Exibição</h3>
                  <div className="flex gap-1 flex-wrap" style={{ gap: "3px" }}>
                    {[
                      { value: "gradient", label: "Apenas Gradiente" },
                      { value: "image", label: "Apenas Imagem" },
                      { value: "image+gradient", label: "Imagem + Gradiente" },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => applyPreview({ backgroundMode: mode.value as typeof backgroundMode })}
                        className={`px-2 py-1 rounded text-xs border transition-all ${
                          backgroundMode === mode.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <p className="font-medium text-gray-700 text-xs">{mode.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload de Imagem */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Imagem Personalizada</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">Clique para fazer upload</p>
                      <p className="text-xs text-gray-500">JPG ou PNG até 5MB</p>
                    </Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  {backgroundImage && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-300 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-800">Imagem carregada com sucesso</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => applyPreview({ backgroundImage: null })}
                          className="text-green-600 hover:text-green-700 hover:bg-green-100 p-1 h-auto w-auto"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-full h-32 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                        <img
                          src={backgroundImage}
                          alt="Preview da imagem carregada"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles de Posicionamento e Zoom */}
                {backgroundImage && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-semibold text-gray-900">Posicionamento e Tamanho</h3>

                    {/* Posicionamento Vertical */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Posição Vertical</Label>
                      <div className="flex gap-2">
                        {(["top", "center", "bottom"] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => applyPreview({ imagePosition: pos })}
                            className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                              imagePosition === pos
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            {pos === "top" ? "Topo" : pos === "center" ? "Centro" : "Fundo"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alinhamento Horizontal */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Alinhamento Horizontal</Label>
                      <div className="flex gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => applyPreview({ imageAlignment: align })}
                            className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                              imageAlignment === align
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            {align === "left" ? "Esquerda" : align === "center" ? "Centro" : "Direita"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Zoom/Escala */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Tamanho da Imagem</Label>
                        <span className="text-sm font-semibold text-blue-600">{imageScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        value={imageScale}
                        onChange={(e) => applyPreview({ imageScale: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>50%</span>
                        <div className="flex-1" />
                        <span>200%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Presets de Imagem */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Presets de Imagem</h3>
                  <div className="space-y-3">
                    {backgroundPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyImagePreset(preset.url)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left overflow-hidden ${
                          backgroundImage === preset.url
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex gap-4 items-start">
                          <div className="w-16 h-16 rounded flex-shrink-0 overflow-hidden border border-gray-300 shadow-sm">
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{preset.name}</p>
                            <p className="text-sm text-gray-600">{preset.description}</p>
                          </div>
                          {backgroundImage === preset.url && (
                            <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Controles de Imagem */}
                {backgroundImage && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900">Controles de Imagem</h3>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Opacidade: {imageOpacity}%</Label>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          value={imageOpacity}
                          onChange={(e) => applyPreview({ imageOpacity: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Overlay de Cor</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {["none", "blue", "purple", "pink"].map((overlay) => (
                            <button
                              key={overlay}
                              type="button"
                              onClick={() => applyPreview({ imageOverlay: overlay as typeof imageOverlay })}
                              className={`p-2 rounded border-2 text-sm ${
                                imageOverlay === overlay
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              {overlay.charAt(0).toUpperCase() + overlay.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {imageOverlay !== "none" && (
                        <div>
                          <Label className="text-sm font-medium">Intensidade: {overlayIntensity}%</Label>
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            value={overlayIntensity}
                            onChange={(e) => applyPreview({ overlayIntensity: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs>

        {/* Footer */}
        <footer className="border-t px-6 py-4 flex gap-3 bg-gray-50 flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleAttemptClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
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
      </SheetContent>
    </Sheet>
  )
}
