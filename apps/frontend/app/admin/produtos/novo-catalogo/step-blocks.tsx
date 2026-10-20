"use client";

// Os 5 blocos do painel de edição da etapa como ACORDEÕES independentes: cada um abre e fecha sozinho, fechado mostra um resumo compacto,
// o cabeçalho diz se está completo / incompleto / com erro, e o conteúdo NUNCA é desmontado ao fechar (nada digitado se perde).
// Em telas estreitas só um bloco fica aberto por vez.
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { STATUS_LABEL, type BlockStatus, type StepBlockId } from "./step-completeness";

export function useIsNarrow(maxWidth = 767): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return narrow;
}

/** Estado de abertura dos blocos. `narrow`: só um aberto por vez. */
export function useBlocks(initial: StepBlockId[] = [], narrow = false, onChange?: (open: StepBlockId[]) => void) {
  const [openSet, setOpenSet] = useState<Set<StepBlockId>>(new Set(initial));
  // Avisa quem quiser lembrar o que está aberto (ex.: para voltar igual depois de F5).
  useEffect(() => { onChange?.([...openSet].sort()); }, [openSet]); // eslint-disable-line react-hooks/exhaustive-deps
  // Ao estreitar a tela, fica só o primeiro aberto.
  useEffect(() => { if (narrow) setOpenSet((cur) => (cur.size > 1 ? new Set([[...cur].sort()[0]]) : cur)); }, [narrow]);
  const toggle = useCallback((n: StepBlockId) => setOpenSet((cur) => {
    if (cur.has(n)) { const c = new Set(cur); c.delete(n); return c; }
    return narrow ? new Set([n]) : new Set([...cur, n]);
  }), [narrow]);
  /** Abre o bloco (sem fechar os outros, a não ser em tela estreita). */
  const reveal = useCallback((n: StepBlockId) => setOpenSet((cur) => (cur.has(n) ? cur : narrow ? new Set([n]) : new Set([...cur, n]))), [narrow]);
  const expandAll = useCallback(() => setOpenSet(new Set<StepBlockId>(narrow ? [1] : [1, 2, 3, 4, 5, 6])), [narrow]);
  const collapseAll = useCallback(() => setOpenSet(new Set()), []);
  return { open: openSet, toggle, reveal, expandAll, collapseAll };
}

const CHIP: Record<BlockStatus, string> = {
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  incomplete: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  optional: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  na: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export function StepBlock({ n, title, status, count = 0, summary, open, onToggle, help, children }: {
  n: StepBlockId; title: string; status: BlockStatus; /** pendências reais do bloco (mostradas no selo) */ count?: number; summary?: string; open: boolean; onToggle: () => void; help?: string; children: React.ReactNode;
}) {
  const id = `step-block-${n}`;
  return (
    <section className={`min-w-0 rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${status === "error" ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 dark:border-slate-700"}`} data-testid={`step-block-${n}`} data-status={status} data-open={open ? "true" : "false"}>
      <h5 className="m-0">
        <button type="button" id={`${id}-header`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle}
          className="flex w-full min-w-0 items-center gap-2 rounded-xl px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-slate-800/50">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{n}</span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</span>
              {help && <span className="field-info" data-help={help} aria-hidden="true">i</span>}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CHIP[status]}`} data-testid={`step-block-${n}-status`}>{STATUS_LABEL[status]}{(status === "incomplete" || status === "error") && count > 0 ? ` · ${count} ${count === 1 ? "pendência" : "pendências"}` : ""}</span>
            </span>
            {!open && summary && <span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-slate-400" data-testid={`step-block-${n}-summary`}>{summary}</span>}
          </span>
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />}
        </button>
      </h5>
      {/* hidden (e não desmontar): o que foi digitado continua no lugar ao fechar o bloco. */}
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-header`} hidden={!open} className="min-w-0 space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
        {children}
      </div>
    </section>
  );
}
