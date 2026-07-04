import type { ComponentType, SVGProps } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IconToolbarButtonProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tooltip: string;
  onClick: () => void;
  className?: string;
}

/**
 * Square icon-only toolbar button (Filtros, column config, etc.): thin
 * border at rest, gradient overlay fading in on hover, icon turning white.
 * Always paired with a tooltip since there's no visible label. Reference
 * implementation: the "+ Nova Empresa" button in admin/empresas/page.tsx.
 */
export function IconToolbarButton({
  icon: Icon,
  tooltip,
  onClick,
  className,
}: IconToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "group relative flex items-center justify-center h-11 w-11 rounded-[12px] border border-slate-200 dark:border-slate-700 hover:border-transparent overflow-hidden transition-all flex-shrink-0",
              className,
            )}
          >
            <span
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)",
              }}
            />
            <Icon className="relative z-10 h-5 w-5 text-[#7d1b6a] dark:text-[#c07ab0] group-hover:text-white transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
