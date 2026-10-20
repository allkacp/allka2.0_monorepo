"use client";

// ABRIR / FECHAR TODOS OS ACORDEÕES (padrão global, 20/10) — botãozinho que vai em TODA tela que tiver acordeões.
// Como usar: coloque <AccordionToggleAll /> perto do topo da tela e, em cada acordeão, chame useAccordionAll(setOpen).
// Acordeões nativos (<details>) só precisam da marca data-accordion.
import { useEffect } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

export const ACCORDION_ALL_EVENT = "catalog2:accordion-all";

/** Faz o acordeão obedecer ao "Abrir todos / Fechar todos". */
export function useAccordionAll(setOpen: (open: boolean) => void) {
  useEffect(() => {
    const h = (e: Event) => setOpen(!!(e as CustomEvent<{ open: boolean }>).detail?.open);
    window.addEventListener(ACCORDION_ALL_EVENT, h);
    return () => window.removeEventListener(ACCORDION_ALL_EVENT, h);
  }, [setOpen]);
}

function setAll(open: boolean) {
  window.dispatchEvent(new CustomEvent(ACCORDION_ALL_EVENT, { detail: { open } }));
  // Cartões de tarefa (aba Entrega) têm o próprio evento.
  window.dispatchEvent(new Event(open ? "catalog2:expand-tasks" : "catalog2:collapse-tasks"));
  document.querySelectorAll<HTMLDetailsElement>("details[data-accordion]").forEach((d) => { d.open = open; });
}

export function AccordionToggleAll({ className = "" }: { className?: string }) {
  const btn = "inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  return (
    <div className={`flex items-center gap-1 ${className}`} data-testid="accordion-toggle-all">
      <button type="button" className={btn} onClick={() => setAll(true)} title="Abrir todos os blocos desta tela"><ChevronsUpDown className="h-3 w-3" />Abrir todos</button>
      <button type="button" className={btn} onClick={() => setAll(false)} title="Fechar todos os blocos desta tela"><ChevronsDownUp className="h-3 w-3" />Fechar todos</button>
    </div>
  );
}
