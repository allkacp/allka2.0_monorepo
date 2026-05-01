import * as React from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

export interface SearchableSelectItem {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  items: SearchableSelectItem[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  /** Show a loading spinner / text inside the dropdown */
  loading?: boolean;
  loadingMessage?: string;
  /** Show an error message inside the dropdown instead of the empty message */
  errorMessage?: string;
}

export function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Pesquisar...",
  emptyMessage = "Nenhum resultado encontrado.",
  className,
  onAddNew,
  addNewLabel = "Adicionar novo",
  loading = false,
  loadingMessage = "Carregando...",
  errorMessage,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedItem = items.find((item) => item.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm shadow-xs dark:bg-card",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedItem && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          {/* Search row — with inline "+" when onAddNew is provided */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
              placeholder={searchPlaceholder}
              className="placeholder:text-muted-foreground flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
            />
            {onAddNew && (
              <button
                type="button"
                title={addNewLabel}
                onClick={() => {
                  setOpen(false);
                  // Delay until after Radix focus-return scroll so callers can override scroll
                  requestAnimationFrame(() => onAddNew());
                }}
                className="ml-1 h-6 w-6 shrink-0 flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-400 text-slate-400 hover:text-violet-600 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {loadingMessage}
              </div>
            ) : errorMessage ? (
              <div className="py-6 text-center text-sm text-red-500">
                {errorMessage}
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.value}
                      value={item.label}
                      onSelect={() => {
                        onValueChange(item.value === value ? "" : item.value);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === item.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.sublabel && (
                          <span className="text-xs text-muted-foreground truncate">
                            {item.sublabel}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
