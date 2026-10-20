"use client";

// Campos dependentes (19/10): quando uma escolha revela outros campos, o bloco aparece, a tela rola até ele, ele é destacado por
// instantes e diz quantos campos ainda faltam. Nada fica escondido esperando o administrador procurar.
import { useEffect, useRef, useState } from "react";

/** Rola até o elemento (suave) e o destaca por ~2 s. Seguro em ambientes sem scrollIntoView (testes). */
export function flashElement(el: HTMLElement | null | undefined, opts: { scroll?: boolean } = {}) {
  if (!el) return;
  if (opts.scroll !== false) el.scrollIntoView?.({ block: "center", behavior: "smooth" });
  el.setAttribute("data-flash", "true");
  window.setTimeout(() => el.removeAttribute("data-flash"), 2200);
}

/** Vale para o 1º foco de um campo dentro do elemento (input/select/textarea/botão). */
export function focusFirst(el: HTMLElement | null | undefined) {
  const t = el?.matches?.("input,select,textarea,button") ? el : el?.querySelector<HTMLElement>("input,select,textarea,button,[tabindex]");
  t?.focus?.({ preventScroll: true });
}

/**
 * Bloco que só existe por causa de uma escolha. Quando \`active\` passa de falso para verdadeiro (depois de montado):
 * chama \`onReveal\` (ex.: abrir o acordeão pai), rola até o bloco, destaca e foca o primeiro campo.
 */
export function RevealBox({ active, missing = 0, title, onReveal, children, className = "", testId }: {
  active: boolean; missing?: number; title?: string; onReveal?: () => void; children: React.ReactNode; className?: string; testId?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const was = useRef(active);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) { was.current = active; return; }
    if (active && !was.current) {
      onReveal?.();
      window.setTimeout(() => { flashElement(ref.current); focusFirst(ref.current); }, 60);
    }
    was.current = active;
  }, [active, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!active) return null;
  return (
    <div ref={ref} data-testid={testId} data-reveal="true" className={`rounded-lg transition-shadow data-[flash=true]:ring-2 data-[flash=true]:ring-amber-400 data-[flash=true]:ring-offset-2 ${className}`}>
      {(title || missing > 0) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          {title && <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{title}</p>}
          {missing > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800" data-testid="reveal-missing">{missing === 1 ? "falta 1 campo" : `faltam ${missing} campos`}</span>}
        </div>
      )}
      {children}
    </div>
  );
}
