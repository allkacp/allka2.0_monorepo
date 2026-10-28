import type { ReactNode } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, ChevronUp, ChevronsUpDown, ListFilter } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
type Option = { value: string; label: string; color?: string };
export function UsersColumnMenu({ label, field, sortKey, sortDir, onSort, options = [], selected = [], onToggle, onClear, children, date = false, filterActive = false }: {
  label: string; field: string; sortKey: string | null; sortDir: "asc" | "desc"; onSort: (key: string, dir: "asc" | "desc") => void;
  options?: readonly Option[]; selected?: string[]; onToggle?: (value: string) => void; onClear?: () => void; children?: ReactNode; date?: boolean; filterActive?: boolean;
}) {
  const active = sortKey === field;
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={label} className={cn("inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide hover:text-violet-700", active ? "text-violet-700" : "text-slate-500")}>
    {label}{active ? sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3" />}
    {(options.length > 0 || children) && <ListFilter className={cn("h-3 w-3", selected.length || filterActive ? "text-violet-700" : "text-slate-400")} />}
  </button></DropdownMenuTrigger><DropdownMenuContent align="start" className={date ? "w-72" : "w-60"}>
    <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
    {(["asc", "desc"] as const).map(dir => <DropdownMenuItem key={dir} onSelect={() => onSort(field, dir)} className={cn("gap-2 text-xs", active && sortDir === dir && "bg-violet-50 text-violet-700")}>
      {dir === "asc" ? <ArrowUpNarrowWide className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />}
      {date ? dir === "asc" ? "Mais antigo primeiro" : "Mais recente primeiro" : dir === "asc" ? "A → Z" : "Z → A"}{active && sortDir === dir && <Check className="ml-auto h-3.5 w-3.5" />}
    </DropdownMenuItem>)}
    {(options.length > 0 || children) && <><DropdownMenuSeparator /><div className="flex items-center justify-between px-2 py-1 text-xs"><span>Filtrar</span>{onClear && <button type="button" className="font-semibold text-violet-700" onClick={onClear}>Limpar</button>}</div></>}
    {options.map(option => <DropdownMenuCheckboxItem key={option.value} checked={selected.includes(option.value)} onSelect={e => e.preventDefault()} onCheckedChange={() => onToggle?.(option.value)} className="text-xs"><span className={cn("inline-flex rounded-full px-2 py-0.5 font-semibold", option.color)}>{option.label}</span></DropdownMenuCheckboxItem>)}
    {options.length > 0 && <p className="px-2 py-1 text-[10px] text-slate-500">{selected.length ? "Você pode selecionar vários badges." : "Nenhum selecionado: mostrar todos."}</p>}
    {children}
  </DropdownMenuContent></DropdownMenu>;
}
