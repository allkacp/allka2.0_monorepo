import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ItemsPerPageSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  variant?: "top" | "bottom";
  /** Versão menor para barras apertadas. */
  compact?: boolean;
}

export function ItemsPerPageSelect({
  value,
  onValueChange,
  variant = "top",
  compact = false,
}: ItemsPerPageSelectProps) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="items-per-page-select flex items-center gap-1.5 whitespace-nowrap">
            {!compact && (
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Itens:
              </span>
            )}
            <Select value={value} onValueChange={onValueChange}>
              <SelectTrigger className={`${compact ? "h-8 w-[3.6rem] px-2" : "h-9 w-[4.5rem] px-3"} rounded-lg border-0 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus:ring-0 focus:ring-offset-0 btn-brand`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side={variant === "top" ? "bottom" : "top"}
          sideOffset={6}
        >
          Quantidade de itens exibidos por página
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
