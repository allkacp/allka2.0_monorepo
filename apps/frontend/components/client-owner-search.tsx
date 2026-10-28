import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { apiClient } from "@/lib/api-client";
export interface ClientOwnerOption { id: string; kind: "agency" | "company" | "partner"; name: string; category: string }

export function ClientOwnerSearch({ value, onChange, disabled = false }: { value: ClientOwnerOption | null; onChange: (value: ClientOwnerOption | null) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ClientOwnerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [active, setActive] = useState(-1);
  const anchor = useRef<HTMLDivElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    let current = true;
    setLoading(true); setError(""); setOptions([]); setActive(-1);
    const timer = window.setTimeout(() => {
      apiClient.searchClientOwnerOptions(query.trim()).then(result => {
        if (!current) return;
        setOptions(result.data); setMore(result.has_more); setLoading(false);
      }).catch(() => { if (current) { setLoading(false); setError("Não foi possível buscar as empresas. Digite novamente para tentar."); } });
    }, 200);
    return () => { current = false; window.clearTimeout(timer); };
  }, [query, open]);
  function select(option: ClientOwnerOption) { onChange(option); setQuery(""); setOpen(false); }
  return <div className="space-y-2">
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild><div ref={anchor} className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input role="combobox" aria-label="Buscar empresa para vincular" aria-autocomplete="list" aria-expanded={open && !disabled} aria-controls={open ? listId : undefined} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} maxLength={100} disabled={disabled} className="pl-9" placeholder="Digite o nome da empresa…" value={query} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(index => options.length ? (index < 0 ? (event.key === "ArrowDown" ? 0 : options.length - 1) : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length) : -1); }
        if (event.key === "Enter") { event.preventDefault(); if (open && active >= 0 && options[active]) select(options[active]); }
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      }} /></div></PopoverAnchor>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width,26rem)] max-w-[calc(100vw-2rem)] p-1" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onInteractOutside={event => { if (anchor.current?.contains(event.target as Node)) event.preventDefault(); }}>
        {loading ? <p role="status" className="px-3 py-2 text-xs text-slate-500">Buscando empresas…</p> : error ? <p role="alert" className="px-3 py-2 text-xs text-red-600">{error}</p> : <div role="listbox" id={listId} aria-label="Empresas cadastradas">
          {options.map((option, index) => <button key={`${option.kind}:${option.id}`} id={`${listId}-${index}`} role="option" aria-selected={value?.id === option.id && value.kind === option.kind} type="button" onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(option)} className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs hover:bg-violet-50 ${active === index ? "bg-violet-50" : ""}`}><span className="min-w-0 truncate font-semibold">{option.name}</span><span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">{option.category}</span></button>)}
          {!options.length && <p className="px-3 py-2 text-xs text-slate-500">Nenhuma empresa encontrada.</p>}
          {more && <p className="px-3 py-1 text-[10px] text-slate-500">Digite mais letras para refinar a busca.</p>}
        </div>}
      </PopoverContent>
    </Popover>
    {value ? <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs"><span><strong>{value.name}</strong><span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">{value.category}</span></span><button type="button" disabled={disabled} aria-label="Remover vínculo selecionado" className="shrink-0 text-slate-500 hover:text-violet-700" onClick={() => onChange(null)}><X className="h-4 w-4" /></button></div> : <p className="text-xs text-slate-500">Sem vínculo selecionado. Digite e escolha uma empresa da lista.</p>}
    <p className="text-[10px] text-slate-400">O vínculo só será gravado ao salvar. Empresas Nômade não podem ser vinculadas.</p>
  </div>;
}
