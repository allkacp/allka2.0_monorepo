/**
 * HeaderFloatingTools — modo escuro e tamanho de fonte, como ícones
 * flutuantes fixos abaixo da Bandeja de Telas (mesmo estilo do chat/bandeja/
 * alertas: ícone puro, sem fundo, tooltip no hover). Antes viviam como chips
 * dentro do cabeçalho — movidos pra cá a pedido do usuário (2026-07-18).
 */
import { useState } from "react";
import { Moon, Sun, Type, Minus, Plus, RotateCcw } from "lucide-react";
import { useSettings } from "@/contexts/settings-context";
import { useFontScale, FONT_SCALE_LEVELS } from "@/hooks/useFontScale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function HeaderFloatingTools() {
  const { theme, setTheme } = useSettings();
  const {
    levelId,
    currentLevel,
    isMin,
    isMax,
    isDefault,
    setLevel,
    decrease,
    increase,
    reset,
  } = useFontScale();
  const [fontOpen, setFontOpen] = useState(false);

  return (
    <>
      {/* Modo escuro/claro */}
      <div className="hidden xl:block fixed top-[205px] right-[8px] z-65 group">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          className="flex items-center justify-center h-10 w-10 text-white/70 hover:text-white transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
        </button>
        <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
          {theme === "dark" ? "Modo claro" : "Modo escuro"}
        </span>
      </div>

      {/* Tamanho da fonte — clique abre popover com diminuir/padrão/aumentar */}
      <div className="hidden xl:block fixed top-[245px] right-[8px] z-65">
        <Popover open={fontOpen} onOpenChange={setFontOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title="Tamanho da fonte"
              className="group relative flex items-center justify-center h-10 w-10 text-white/70 hover:text-white transition-colors"
            >
              <Type className="h-5 w-5 shrink-0" />
              <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-xl border border-white/10 transition-opacity duration-150 group-hover:opacity-100">
                Tamanho da fonte
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            <p className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Tamanho da fonte
            </p>
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <button
                type="button"
                onClick={decrease}
                disabled={isMin}
                title="Diminuir"
                className="flex-1 flex items-center justify-center h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={reset}
                title="Padrão"
                className={`flex-1 flex items-center justify-center gap-1 h-8 rounded-lg border transition-colors ${
                  isDefault
                    ? "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <RotateCcw className="h-3 w-3" />
                <span className="text-[11px] font-semibold">{currentLevel.px}px</span>
              </button>
              <button
                type="button"
                onClick={increase}
                disabled={isMax}
                title="Aumentar"
                className="flex-1 flex items-center justify-center h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
              {FONT_SCALE_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setLevel(level.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    levelId === level.id
                      ? "bg-accent font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{level.label}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {level.px}px
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
