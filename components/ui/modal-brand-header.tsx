import { ReactNode } from "react"
import { X } from "lucide-react"

interface ModalBrandHeaderProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  left?: ReactNode
  right?: ReactNode
  onClose?: () => void
}

export function ModalBrandHeader({ title, subtitle, icon, left, right, onClose }: ModalBrandHeaderProps) {
  return (
    <div className="app-brand-header flex items-center gap-3 pl-5 pr-20 py-3 min-h-[100px]">
      {/* Icon */}
      {icon && (
        <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-white">
          {icon}
        </div>
      )}

      {/* Left custom content */}
      {left && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {left}
        </div>
      )}

      {/* Title + Subtitle */}
      <div className="flex-1 min-w-0">
        {subtitle && (
          <p className="text-white/60 text-[10px] font-medium leading-none mb-0.5 uppercase tracking-wide truncate">
            {subtitle}
          </p>
        )}
        <h2 className="text-white text-sm font-bold leading-tight truncate">
          {title}
        </h2>
      </div>

      {/* Right custom actions */}
      {right && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {right}
        </div>
      )}

      {/* Standardized close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/30"
          title="Fechar"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
