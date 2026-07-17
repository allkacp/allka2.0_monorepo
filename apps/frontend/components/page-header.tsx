import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PageHeaderProps {
  title: string | ReactNode
  description?: string
  subtitle?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, subtitle, actions, className }: PageHeaderProps) {
  const desc = description ?? subtitle
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1 gap-y-2 mb-5 lg:mb-7",
        "bg-background border border-border/70 rounded-xl",
        "px-[13px] py-[10px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.10),0_1px_6px_-2px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      {/* Título + ícone de info */}
      <div className="flex items-center gap-1 shrink-0 mr-2">
        <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        {desc && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted transition-colors shrink-0"
                >
                  <Info className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px] p-3" sideOffset={6}>
                <p className="text-xs text-primary-foreground leading-relaxed">{desc}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Ações */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}

export default PageHeader
