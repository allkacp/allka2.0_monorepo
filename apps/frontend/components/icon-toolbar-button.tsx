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
              "group relative flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 transition-all hover:border-transparent dark:border-slate-700",
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
            <Icon className="relative z-10 h-4 w-4 text-[#7d1b6a] transition-colors group-hover:text-white dark:text-[#c07ab0]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
