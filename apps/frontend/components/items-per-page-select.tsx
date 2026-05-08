
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ItemsPerPageSelectProps {
  value: string
  onValueChange: (value: string) => void
  variant?: 'top' | 'bottom'
}

export function ItemsPerPageSelect({ value, onValueChange, variant = 'top' }: ItemsPerPageSelectProps) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Itens:</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[4.5rem] h-7 text-xs font-semibold text-white border-0 hover:opacity-90 transition-opacity rounded-full px-3 focus:ring-0 focus:ring-offset-0 btn-brand">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10</SelectItem>
          <SelectItem value="25">25</SelectItem>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
