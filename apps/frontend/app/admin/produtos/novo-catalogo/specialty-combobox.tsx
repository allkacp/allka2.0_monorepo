"use client";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search } from "lucide-react";
import { EXEC_KIND_LABEL, emptySpecialtyHint, filterSpecialties, isSpecialtyCompatible, specialtiesForMode, specialtyKind } from "./catalog2-specialty-kind";

// Especialidade da etapa: lista das especialidades CADASTRADAS, filtrada pelo "Quem executa" (humano = humanas, IA = de IA,
// humano ou IA = todas) e com BUSCA: digite parte do nome e a lista vai afunilando. O campo corta o nome longo dentro de si
// (o nome inteiro aparece na lista e ao passar o mouse) e nunca invade o campo vizinho.
// A lista abre em cima de tudo (não é cortada pela janela) e as especialidades que VOCÊ mais escolhe aparecem primeiro, em "Mais usadas".
const USAGE_KEY = "allka:specialty-usage";
const readUsage = (): Record<string, number> => { try { return JSON.parse(window.localStorage.getItem(USAGE_KEY) ?? "{}") ?? {}; } catch { return {}; } };
const bumpUsage = (id: string) => { try { const u = readUsage(); u[id] = (u[id] ?? 0) + 1; window.localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch { /* sem armazenamento: só não lembra */ } };

export function SpecialtyCombobox({ specialties, mode, value, onChange, placeholder = "Selecione a especialidade…", disabled }: {
  specialties: any[]; mode?: string | null; value: string; onChange: (id: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [usage, setUsage] = useState<Record<string, number>>(() => readUsage());
  const all = specialties ?? [];
  const available = useMemo(() => (mode ? specialtiesForMode(all, mode) : all), [all, mode]);
  // As mais escolhidas por você vêm primeiro (empate: a ordem de sempre).
  const shown = useMemo(() => {
    const list = filterSpecialties(available, q);
    return [...list].sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0));
  }, [available, q, usage]);
  const topCount = !q.trim() ? shown.filter((sp) => (usage[sp.id] ?? 0) > 0).slice(0, 5).length : 0;
  const current = value ? all.find((sp) => sp.id === value) ?? null : null;
  const orphan = mode && current && !isSpecialtyCompatible(current, mode) ? current : null;
  const showKind = mode === "hibrido";
  const pick = (id: string) => { bumpUsage(id); setUsage(readUsage()); onChange(id); setOpen(false); setQ(""); };
  return (
    <div className="relative min-w-0" data-testid="specialty-combobox">
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
      <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} title={current?.name ?? undefined}
        className="flex h-8 w-full min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-left text-[13px] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900">
        <span className={`min-w-0 flex-1 truncate ${current ? "" : "text-slate-400"}`}>{current ? current.name : placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[max(var(--radix-popover-trigger-width),18rem)] rounded-lg bg-white p-1.5 dark:bg-slate-900" role="listbox">
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            <input autoFocus aria-label="Buscar especialidade" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite para buscar (ex.: gráf, tráfego)…" className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs dark:border-slate-700 dark:bg-slate-900" />
          </div>
          <ul className="mt-1 max-h-72 overflow-y-auto">
            {orphan && <li className="px-2 py-1 text-[11px] text-amber-700">{orphan.name} é de tipo {EXEC_KIND_LABEL[specialtyKind(orphan)]} — escolha outra.</li>}
            {shown.map((sp, idx) => (
              <li key={sp.id}>
                {topCount > 0 && idx === 0 && <p className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-violet-700" data-testid="specialty-top-label">Mais usadas</p>}
                {topCount > 0 && idx === topCount && <p className="px-2 pb-0.5 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Todas</p>}
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
      </PopoverContent>
      </Popover>
    </div>
  );
}
