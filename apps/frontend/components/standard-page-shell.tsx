// @ts-nocheck
/**
 * Tela Global com tabela principal — padrão de shell congelado a partir de
 * /admin/empresas em 2026-07-16. Qualquer ajuste aqui se propaga pra todas
 * as páginas que usam este componente (esse é o ponto: mudar 1 vez, refletir
 * em todas). Ver memória "project_tela_global_tabela_principal".
 *
 * Não inclui modais/slide-panels internos — só o container/banner/cards.
 */
import { useState } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Painel branco flutuante — wrapper mais externo da tela.
export const STANDARD_SHELL_PANEL_CLASS =
  "admin-empresas-panel w-full h-full rounded-2xl lg:rounded-[1.5rem] border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18),0_4px_16px_-4px_rgba(15,23,42,0.10)] p-3 sm:p-5 lg:p-[12px] overflow-hidden";

// Cartão principal da tabela (usar como className do <Card>).
export const STANDARD_SHELL_TABLE_CARD_CLASS =
  "rounded-[20px] border border-[#e6ebf3] dark:border-slate-700/60 shadow-[0_12px_32px_rgba(15,23,42,0.06)] overflow-hidden mx-0";

// Paleta compartilhada dos 4 stat cards (mesmas 4 cores usadas em todas as
// telas até agora — repita/estenda aqui se precisar de uma 5ª cor no futuro).
export const STANDARD_STAT_COLORS: Record<
  string,
  {
    gradient: string;
    darkGradient: string;
    borderClass: string;
    strokeColor: string;
  }
> = {
  blue: {
    gradient: "from-blue-500 to-blue-700",
    darkGradient: "dark:from-blue-800 dark:to-blue-950",
    borderClass: "border-2 border-blue-300/70 dark:border-blue-800/70",
    strokeColor: "white",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    darkGradient: "dark:from-emerald-800 dark:to-teal-900",
    borderClass: "border-2 border-emerald-300/70 dark:border-emerald-800/70",
    strokeColor: "white",
  },
  violet: {
    gradient: "from-violet-500 to-purple-700",
    darkGradient: "dark:from-violet-800 dark:to-purple-950",
    borderClass: "border-2 border-violet-300/70 dark:border-violet-800/70",
    strokeColor: "white",
  },
  orange: {
    gradient: "from-orange-500 to-rose-600",
    darkGradient: "dark:from-orange-800 dark:to-rose-900",
    borderClass: "border-2 border-orange-300/70 dark:border-orange-800/70",
    strokeColor: "white",
  },
};

// Dado decorativo fixo do sparkline — não representa tendência real (não há
// histórico real por trás dos indicadores). Mesmo array em todas as telas.
export const STANDARD_DECORATIVE_SPARK_DATA = [
  4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11,
];

export function StandardSparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const w = 56,
    h = 16;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - 4 - ((v - min) / range) * (h - 12),
  }));
  const polyPts = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M0,${h} ${pts.map((p) => `L${p.x},${p.y}`).join(" ")} L${w},${h} Z`;
  const gradId = `standard-fill-${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyPts}
      />
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export function StandardMetricCard({
  label,
  value,
  icon: Icon,
  colorKey,
  sparkData = STANDARD_DECORATIVE_SPARK_DATA,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorKey: keyof typeof STANDARD_STAT_COLORS;
  sparkData?: number[];
}) {
  const colors = STANDARD_STAT_COLORS[colorKey] ?? STANDARD_STAT_COLORS.blue;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`relative rounded-xl overflow-hidden cursor-default transition-all duration-200 bg-gradient-to-br ${colors.gradient} ${colors.darkGradient} ${colors.borderClass} ${hovered ? "shadow-xl scale-[1.01]" : "shadow-lg"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Info tooltip */}
      <div
        className={`absolute top-2 right-2 z-10 transition-opacity duration-150 ${hovered ? "opacity-100" : "opacity-0"}`}
      >
        <TooltipProvider>
          <Tooltip open={hovered}>
            <TooltipTrigger asChild>
              <div className="bg-white/20 hover:bg-white/30 rounded-md p-0.5 cursor-pointer transition-colors">
                <Info className="h-2.5 w-2.5 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-slate-100 border-slate-200 text-slate-900 p-3 rounded-xl shadow-xl"
            >
              <div className="min-w-[130px]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {label}
                </p>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-xs text-slate-500">Valor atual</span>
                  <span className="text-sm font-bold text-slate-900">
                    {value}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Sem comparação disponível
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="px-2.5 pt-1.5 pb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[10px] font-semibold text-white/80 uppercase tracking-wider leading-tight truncate">
            {label}
          </p>
          <div className="bg-white/20 rounded-md p-0.5 flex-shrink-0 ml-1">
            <Icon className="h-2.5 w-2.5 text-white" />
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold leading-none text-white">
              {value}
            </p>
            <p className="mt-0.5 text-[9px] text-white/60 inline-block leading-tight">
              Sem comparação disponível
            </p>
          </div>
          <div className="flex-shrink-0">
            <StandardSparkline data={sparkData} color={colors.strokeColor} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StandardPageBanner({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-5 lg:mb-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 88% 15%, rgba(255,255,255,0.35), transparent 45%)",
        }}
      />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3 sm:py-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-blue-500 to-fuchsia-600 shadow-md">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 shrink-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {title}
              </h1>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-white/15 transition-colors shrink-0"
                    >
                      <Info
                        className="h-3.5 w-3.5 text-white/70"
                        strokeWidth={2.5}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="max-w-[240px] p-3"
                    sideOffset={6}
                  >
                    <p className="text-xs leading-relaxed">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-white/70 truncate sm:whitespace-normal">
              {description}
            </p>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// Estrutura do shell (usar direto no return de cada página):
//
// <div className={STANDARD_SHELL_PANEL_CLASS}>
//   <div className="h-full min-h-0 flex flex-col" ref={pageRef}>
//     <div className="shrink-0 -mb-[11px]">
//       <StandardPageBanner icon={...} title="..." description="..." actions={...} />
//     </div>
//     <div className="flex-1 min-h-0 overflow-y-auto">
//       <div className="space-y-5">
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
//           <StandardMetricCard ... /> x4
//         </div>
//         <Card className={STANDARD_SHELL_TABLE_CARD_CLASS}>
//           {/* toolbar + tabela + paginação — próprios de cada página */}
//         </Card>
//       </div>
//     </div>
//   </div>
// </div>
