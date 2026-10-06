"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { helpFor } from "./field-help";

// Camada de ajuda por campo: coloca um ícone "i" ao lado do nome de cada campo (quando existe ajuda cadastrada em field-help.ts)
// e mostra o texto ao passar o mouse. Funciona sobre o que já está na tela (sem alterar cada campo), e reaplica quando a tela muda.
const CSS = `
.field-info{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;margin:0 3px;border-radius:9999px;border:1px solid #7c3aed;color:#7c3aed;background:#fff;font:700 9px/1 system-ui,sans-serif;cursor:help;vertical-align:middle;user-select:none;flex:none}
.field-info:hover{background:#7c3aed;color:#fff}
.dark .field-info{background:#1e1b4b;color:#c4b5fd;border-color:#a78bfa}
`;
const SKIP = "button, option, select, textarea, input, script, style, [role=tab], [role=tablist], [data-no-info], .field-info";

function ensureIcons(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text;
    const v = t.nodeValue;
    if (!v || v.length < 2 || v.length > 130) continue;
    const el = t.parentElement;
    if (!el || el.closest(SKIP)) continue;
    const next = t.nextSibling as HTMLElement | null;
    if (next && next.nodeType === 1 && next.classList?.contains("field-info")) continue;
    if (helpFor(v)) found.push(t);
  }
  for (const t of found) {
    const help = helpFor(t.nodeValue ?? "");
    if (!help) continue;
    const i = document.createElement("span");
    i.className = "field-info";
    i.setAttribute("data-help", help);
    i.setAttribute("aria-hidden", "true");
    i.textContent = "i";
    t.parentNode?.insertBefore(i, t.nextSibling);
  }
}

export function FieldHelpLayer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let raf = 0;
    const run = () => { raf = 0; obs.disconnect(); try { ensureIcons(root); } finally { obs.observe(root, { childList: true, subtree: true, characterData: true }); } };
    const obs = new MutationObserver(() => { if (!raf) raf = window.setTimeout(run, 120) as unknown as number; });
    run();
    return () => { obs.disconnect(); if (raf) window.clearTimeout(raf); };
  }, []);

  const show = (e: React.MouseEvent | React.FocusEvent) => {
    const el = (e.target as HTMLElement | null)?.closest?.(".field-info") as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTip({ text: el.getAttribute("data-help") ?? "", x: Math.min(Math.max(8, r.left + r.width / 2), window.innerWidth - 8), y: r.bottom + 6 });
  };
  const hide = (e: React.MouseEvent | React.FocusEvent) => { if ((e.target as HTMLElement | null)?.closest?.(".field-info")) setTip(null); };
  const block = (e: React.MouseEvent) => { if ((e.target as HTMLElement | null)?.closest?.(".field-info")) { e.preventDefault(); e.stopPropagation(); } };

  return (
    <div ref={ref} className="contents" onMouseOver={show} onMouseOut={hide} onClickCapture={block} data-field-help-layer>
      <style>{CSS}</style>
      {children}
      {tip && typeof document !== "undefined" && createPortal(
        <div role="tooltip" style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translateX(-50%)", maxWidth: 320, zIndex: 9999 }} className="pointer-events-none rounded-lg bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-xl">
          {tip.text}
        </div>,
        document.body,
      )}
    </div>
  );
}
