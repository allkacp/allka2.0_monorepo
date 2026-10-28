import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  slate: "bg-slate-50 text-slate-600 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  blue: "bg-sky-50 text-[#1877e8] ring-sky-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  emerald: "bg-emerald-50 text-[#05ae70] ring-emerald-100",
};

/** Mesmo ritmo visual de Clientes; mantém os filtros próprios de Tarefas. */
export function TaskReferenceStat({ label, value, icon: Icon, tone, active, onClick }: {
  label: string; value: number; icon: LucideIcon; tone: keyof typeof tones; active?: boolean; onClick?: () => void;
}) {
  return <button type="button" aria-pressed={!!active} onClick={onClick}
    className={cn("task-reference-stat flex min-w-0 items-center text-left transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 focus-visible:-outline-offset-2", active ? "task-reference-stat-active bg-violet-50/70" : "hover:bg-slate-50")}>
    <span className={cn("task-reference-stat-icon flex shrink-0 items-center justify-center rounded-full ring-1", tones[tone])}><Icon aria-hidden="true" /></span>
    <span className="min-w-0"><span className="task-reference-stat-label block font-bold uppercase tracking-[.02em] text-[#31578f]">{label}</span><span className="task-reference-stat-value mt-1 block font-extrabold tracking-tight text-[#0c2455]">{value}</span></span>
  </button>;
}
