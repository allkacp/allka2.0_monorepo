// @ts-nocheck
import {
  useFontScale,
  FONT_SCALE_LEVELS,
  type FontScaleId,
} from "@/hooks/useFontScale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";

/** Controle compacto A- / A / A+ para o header */
export function FontScaleControl() {
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

  // Tooltips contextuais com o nível de destino
  const allLevels = FONT_SCALE_LEVELS as readonly (typeof FONT_SCALE_LEVELS)[number][];
  const idx = allLevels.findIndex((l) => l.id === levelId);
  const prevLevel = allLevels[idx - 1];
  const nextLevel = allLevels[idx + 1];
  const offset = (currentLevel as any).offset as number;

  const decreaseTooltip = isMin
    ? "Já no tamanho mínimo"
    : `Diminuir → ${prevLevel?.label} (${prevLevel?.px}px)`;
  const increaseTooltip = isMax
    ? "Já no tamanho máximo"
    : `Aumentar → ${nextLevel?.label} (${nextLevel?.px}px)`;
  const resetTooltip = isDefault
    ? `Tamanho padrão ativo (${currentLevel.px}px)`
    : `Voltar ao padrão — agora: ${currentLevel.label} (${currentLevel.px}px)`;

  return (
    <TooltipProvider delayDuration={400}>
      {/* Wrapper group de 3 botões lado a lado */}
      <div className="hidden lg:flex items-center rounded-md bg-white/10 border border-white/15 overflow-hidden">
        {/* A- */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={decrease}
              disabled={isMin}
              aria-label="Diminuir fonte"
              className={cn(
                "flex items-center justify-center h-6 w-5 transition-all text-white/70 hover:bg-white/20 hover:text-white",
                isMin && "opacity-25 cursor-not-allowed",
              )}
            >
              <span className="text-[9px] font-semibold leading-none select-none tracking-tight">
                A-
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {decreaseTooltip}
          </TooltipContent>
        </Tooltip>

        {/* Divisor */}
        <div className="w-px h-2.5 bg-white/20 shrink-0" />

        {/* A (padrão) — redefine ao padrão com clique */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={reset}
              aria-label="Fonte padrão"
              className={cn(
                "relative flex items-center justify-center h-6 w-5 transition-all",
                isDefault
                  ? "text-white bg-white/15"
                  : "text-white/70 hover:bg-white/20 hover:text-white",
              )}
            >
              <span className="text-[10px] font-bold leading-none select-none">
                A
              </span>
              {/* Indicador de nível deslocado */}
              {!isDefault && (
                <span className={cn(
                  "absolute -top-0.5 -right-0.5 text-[7px] font-bold leading-none",
                  offset < 0 ? "text-blue-300" : "text-amber-300",
                )}>
                  {offset > 0 ? `+${offset}` : offset}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {resetTooltip}
          </TooltipContent>
        </Tooltip>

        {/* Divisor */}
        <div className="w-px h-2.5 bg-white/20 shrink-0" />

        {/* A+ */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={increase}
              disabled={isMax}
              aria-label="Aumentar fonte"
              className={cn(
                "flex items-center justify-center h-6 w-5 transition-all text-white/70 hover:bg-white/20 hover:text-white",
                isMax && "opacity-25 cursor-not-allowed",
              )}
            >
              <span className="text-[9px] font-semibold leading-none select-none tracking-tight">
                A+
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {increaseTooltip}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Versão mobile: botão ícone com dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Tamanho da fonte"
                className="lg:hidden flex items-center justify-center h-9 w-9 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 hover:text-white transition-all"
              >
                <Type className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Tamanho da fonte
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="w-44 rounded-xl p-1"
        >
          <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Tamanho da fonte
          </p>
          <DropdownMenuSeparator />
          {FONT_SCALE_LEVELS.map((level) => (
            <DropdownMenuItem
              key={level.id}
              onClick={() => setLevel(level.id as FontScaleId)}
              className={cn(
                "flex items-center justify-between rounded-lg text-sm cursor-pointer",
                levelId === level.id && "bg-accent font-semibold",
              )}
            >
              <span>{level.label}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {level.px}px
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
