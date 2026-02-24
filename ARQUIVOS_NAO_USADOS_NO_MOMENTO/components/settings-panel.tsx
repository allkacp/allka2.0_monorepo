
import { useState } from "react"
import { Settings, Type, Globe, Palette, LayoutGrid, Eye, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useSettings, type FontSize, type Language, type LayoutDensity } from "@/contexts/settings-context"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export function SettingsPanel() {
  const {
    fontSize,
    setFontSize,
    language,
    setLanguage,
    theme,
    setTheme,
    layoutDensity,
    setLayoutDensity,
    highContrast,
    setHighContrast,
    resetSettings,
  } = useSettings()

  const [open, setOpen] = useState(false)

  const fontSizeMap: Record<FontSize, number> = {
    small: 0,
    medium: 1,
    large: 2,
    "extra-large": 3,
  }

  const fontSizeLabels: FontSize[] = ["small", "medium", "large", "extra-large"]

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(fontSizeLabels[value[0]])
  }

  if (!open)
    return (
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-white transition-colors"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-5 w-5" />
      </Button>
    )

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200" onClick={() => setOpen(false)} />

      <div className="fixed right-0 top-0 h-full w-[800px] bg-background dark:bg-slate-950 border-l dark:border-gray-700 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col rounded-l-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-tl-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold dark:text-white">Configurações</h2>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                Personalize a interface de acordo com suas preferências
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="dark:text-white dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Settings Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Font Size */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                <Label className="text-base font-semibold dark:text-white">Tamanho da Fonte</Label>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-gray-400">
                  <span>Pequeno</span>
                  <span>Extra Grande</span>
                </div>
                <Slider
                  value={[fontSizeMap[fontSize]]}
                  onValueChange={handleFontSizeChange}
                  max={3}
                  step={1}
                  className="w-full"
                />
                <div className="flex items-center justify-center">
                  <Badge variant="secondary" className="capitalize dark:bg-slate-800 dark:text-white">
                    {fontSize === "small" && "Pequeno"}
                    {fontSize === "medium" && "Médio"}
                    {fontSize === "large" && "Grande"}
                    {fontSize === "extra-large" && "Extra Grande"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Language */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                <Label className="text-base font-semibold dark:text-white">Idioma</Label>
              </div>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="w-full dark:bg-slate-900 dark:border-gray-700 dark:text-white">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-gray-700">
                  <SelectItem value="pt-BR" className="dark:text-white dark:focus:bg-slate-800">
                    🇧🇷 Português (Brasil)
                  </SelectItem>
                  <SelectItem value="en-US" className="dark:text-white dark:focus:bg-slate-800">
                    🇺🇸 English (US)
                  </SelectItem>
                  <SelectItem value="es-ES" className="dark:text-white dark:focus:bg-slate-800">
                    🇪🇸 Español
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Theme */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                <Label className="text-base font-semibold dark:text-white">Tema</Label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-3 dark:border-gray-700 dark:text-white dark:hover:bg-slate-800"
                  onClick={() => setTheme("light")}
                >
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300" />
                  <span className="text-xs">Claro</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-3 dark:border-gray-700 dark:text-white dark:hover:bg-slate-800"
                  onClick={() => setTheme("dark")}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-700" />
                  <span className="text-xs">Escuro</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  className="flex flex-col items-center gap-2 h-auto py-3 dark:border-gray-700 dark:text-white dark:hover:bg-slate-800"
                  onClick={() => setTheme("system")}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white to-gray-900 border-2 border-gray-400" />
                  <span className="text-xs">Sistema</span>
                </Button>
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Layout Density */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                <Label className="text-base font-semibold dark:text-white">Densidade do Layout</Label>
              </div>
              <Select value={layoutDensity} onValueChange={(value) => setLayoutDensity(value as LayoutDensity)}>
                <SelectTrigger className="w-full dark:bg-slate-900 dark:border-gray-700 dark:text-white">
                  <SelectValue placeholder="Selecione a densidade" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-gray-700">
                  <SelectItem value="compact" className="dark:text-white dark:focus:bg-slate-800">
                    Compacto
                  </SelectItem>
                  <SelectItem value="comfortable" className="dark:text-white dark:focus:bg-slate-800">
                    Confortável
                  </SelectItem>
                  <SelectItem value="spacious" className="dark:text-white dark:focus:bg-slate-800">
                    Espaçoso
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Ajusta o espaçamento entre elementos da interface
              </p>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* High Contrast */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                <Label className="text-base font-semibold dark:text-white">Alto Contraste</Label>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast" className="text-sm font-normal dark:text-white">
                    Ativar modo de alto contraste
                  </Label>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Melhora a legibilidade para acessibilidade
                  </p>
                </div>
                <Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Reset Button */}
            <Button
              variant="outline"
              className="w-full bg-transparent dark:border-gray-700 dark:text-white dark:hover:bg-slate-800"
              onClick={() => {
                resetSettings()
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padrões
            </Button>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 bg-muted/30 dark:bg-slate-900/30">
          <Button
            variant="outline"
            className="w-full bg-transparent dark:border-gray-700 dark:text-white dark:hover:bg-slate-800"
            onClick={() => setOpen(false)}
          >
            Fechar
          </Button>
        </div>
      </div>
    </>
  )
}
