import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

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
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 lg:mb-7",
        "bg-white dark:bg-slate-900 border border-border/70 rounded-xl",
        "px-[13px] py-[10px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.10),0_1px_6px_-2px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
          {title}
        </h1>
        {desc && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{desc}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
      )}
    </div>
  )
}

export default PageHeader
