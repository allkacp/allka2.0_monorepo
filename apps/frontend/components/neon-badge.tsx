import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getBadgeClasses, type BadgeColor } from "@/lib/badge-styles";
import { cn } from "@/lib/utils";

interface NeonBadgeProps {
  color: BadgeColor;
  children: ReactNode;
  /** Optional hover explanation — same "tooltips everywhere" convention as
   * the rest of the redesigned tables. */
  tooltip?: ReactNode;
  className?: string;
}

export function NeonBadge({ color, children, tooltip, className }: NeonBadgeProps) {
  const badge = (
    <span className={cn(getBadgeClasses(color), "cursor-default", className)}>
      {children}
    </span>
  );

  if (!tooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="text-xs max-w-[220px] leading-snug">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
