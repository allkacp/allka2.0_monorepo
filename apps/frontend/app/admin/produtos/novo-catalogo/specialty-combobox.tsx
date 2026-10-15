"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { EXEC_KIND_LABEL, emptySpecialtyHint, filterSpecialties, isSpecialtyCompatible, specialtiesForMode, specialtyKind } from "./catalog2-specialty-kind";

// Especialidade da etapa: lista das especialidades CADASTRADAS, filtrada pelo "Quem executa" (humano = humanas, IA = de IA,
// humano ou IA = todas) e com BUSCA: digite parte do nome e a lista vai afunilando. O campo corta o nome longo dentro de si
// (o nome inteiro aparece na lista e ao passar o mouse) e nunca invade o campo vizinho.
export function SpecialtyCombobox({ specialties, mode, value, onChange, placeholder = "Selecione a especialidade…", disabled }: {
  specialties: any[]; mode?: string | null; value: string; onChange: (id: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const all = specialties ?? [];
  const available = useMemo(() => (mode ? specialtiesForMode(all, mode) : all), [all, mode]);
  const shown = useMemo(() => filterSpecialties(available, q), [available, q]);
  const current = value ? all.find((sp) => sp.id === value) ?? null : null;
  const orphan = mode && current && !isSpecialtyCompatible(current, mode) ? current : null;
  const showKind = mode === "hibrido";
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const pick = (id: string) => { onChange(id); setOpen(false); setQ(""); };
  return (
    <div ref={box} className="relative min-w-0" data-testid="specialty-combobox">
      <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} title={current?.name ?? undefined} onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-left text-[13px] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900">
        <span className={`min-w-0 flex-1 truncate ${current ? "" : "text-slate-400"}`}>{current ? current.name : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 min-w-[16rem] rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900" role="listbox">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <input autoFocus aria-label="Buscar especialidade" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite para buscar (ex.: gráf, tráfego)…" className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
          </div>
          <ul className="mt-1 max-h-56 overflow-y-auto">
            {orphan && <li className="px-2 py-1 text-[11px] text-amber-700">{orphan.name} é de tipo {EXEC_KIND_LABEL[specialtyKind(orphan)]} — escolha outra.</li>}
            {shown.map((sp) => (
              <li key={sp.id}>
                <button type="button" role="option" aria-selected={sp.id === value} onClick={() => pick(sp.id)} title={sp.name}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-violet-50 dark:hover:bg-slate-800 ${sp.id === value ? "bg-violet-100 font-semibold dark:bg-slate-800" : ""}`}>
                  <span className="min-w-0 flex-1">{sp.name}{sp.max_hourly_rate == null ? <span className="text-slate-400"> (sem valor/hora)</span> : ""}</span>
                  {showKind && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{EXEC_KIND_LABEL[specialtyKind(sp)]}</span>}
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-2 text-xs text-slate-500" data-testid="specialty-empty-hint">{available.length === 0 ? emptySpecialtyHint(mode) : "Nenhuma especialidade com esse nome."}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
