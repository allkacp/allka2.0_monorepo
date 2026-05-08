
import { CheckCircle, Pause, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type CompanyStatus = "active" | "inactive" | "pending"

interface CompanyStatusSelectorProps {
  value: CompanyStatus
  onChange: (status: CompanyStatus) => void
  disabled?: boolean
  showLabel?: boolean
}

const statusConfig = {
  active: {
    label: "Ativa",
    icon: CheckCircle,
    classes: "bg-emerald-500 text-white shadow-md scale-105",
    hoverClasses: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  },
  inactive: {
    label: "Inativa",
    icon: Pause,
    classes: "bg-gray-500 text-white shadow-md scale-105",
    hoverClasses: "bg-gray-200 text-gray-700 hover:bg-gray-300",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    classes: "bg-amber-500 text-white shadow-md scale-105",
    hoverClasses: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  },
}

export function CompanyStatusSelector({
  value,
  onChange,
  disabled = false,
  showLabel = true,
}: CompanyStatusSelectorProps) {
  const statusOptions: (keyof typeof statusConfig)[] = ["active", "inactive", "pending"]

  return (
    <div className="flex items-center gap-3">
      {showLabel && (
        <span className="text-xs font-semibold text-blue-900 whitespace-nowrap">Status:</span>
      )}
      <div className="flex items-center gap-1.5">
        {statusOptions.map((status) => {
          const config = statusConfig[status]
          const Icon = config.icon
          const isSelected = value === status
          
          return (
            <button
              key={status}
              onClick={() => onChange(status)}
              disabled={disabled}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-all duration-200",
                isSelected ? config.classes : config.hoverClasses,
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <Icon className="h-3 w-3" />
              {config.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}


