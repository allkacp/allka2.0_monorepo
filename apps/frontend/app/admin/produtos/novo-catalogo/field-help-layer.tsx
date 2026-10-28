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

// Regra única de tooltip: SÓ o ícone "i" mostra ajuda. O `title` nativo do navegador (que aparecia em cima do card/campo e
// duplicava o tooltip do "i") é retirado de tudo que não é botão só de ícone; o texto vira `data-help-title` e alimenta o "i"
// dos campos que ainda não tinham ajuda cadastrada. Textos cortados (truncate) mantêm o title para dar para ler o conteúdo inteiro.
const KEEP_TITLE = "button, a, summary, [role=button], .truncate, [data-keep-title]";
/** Retira o tooltip nativo do navegador de tudo dentro de `root` e o mantém retirado (conteúdo que vive em janelas/portais fica fora da camada de ajuda e, sem isso, mostraria dois tooltips: o do ⓘ e o do navegador). */
export function keepNativeTitlesStripped(root: Element): () => void {
  stripNativeTitles(root);
  const obs = new MutationObserver(() => { obs.disconnect(); stripNativeTitles(root); obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] }); });
  obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] });
  return () => obs.disconnect();
}

function stripNativeTitles(root: Element) {
  const nodes: Element[] = root.matches?.("[title]") ? [root] : [];
  nodes.push(...Array.from(root.querySelectorAll("[title]")));
  for (const el of nodes) {
    const title = el.getAttribute("title");
    if (title == null) continue;
    if (el.matches(KEEP_TITLE) && !(el.matches("button, a, summary, [role=button]") && (el.textContent ?? "").trim() !== "" && !el.matches(".truncate"))) continue;
    if (title.trim()) el.setAttribute("data-help-title", title.trim());
    el.removeAttribute("title");
  }
}
/** Ajuda vinda do antigo `title` do próprio rótulo (ou do <label> que o envolve / do campo dentro dele). */
function titleHelpFor(el: HTMLElement): string | null {
  const own = el.getAttribute("data-help-title");
  if (own) return own;
  const label = el.closest("label");
  const fromLabel = label?.getAttribute("data-help-title");
  if (fromLabel) return fromLabel;
  const field = label?.querySelector("[data-help-title]");
  return field?.getAttribute("data-help-title") ?? null;
}

function ensureIcons(root: HTMLElement, helpOf: (t: string) => string | null, strict = false) {
  stripNativeTitles(root);
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
    // strict (camada geral): só o texto que é o rótulo inteiro do elemento (aceita * e :), nunca um pedaço de frase como "4 empresas".
    if (strict && (el.textContent ?? "").replace(/[\s*:]+$/g, "").trim() !== v.replace(/[\s*:]+$/g, "").trim()) continue;
    // Palavras curtas ("de", "até") só ganham o "i" quando são o rótulo inteiro do elemento. Dentro de uma frase
    // ("3 de 4 classificações") o React cria um pedaço de texto " de " que antes ganhava o ícone por engano.
    if (v.replace(/[\s*:]+$/g, "").trim().length <= 4 && (el.textContent ?? "").replace(/[\s*:]+$/g, "").trim() !== v.replace(/[\s*:]+$/g, "").trim()) continue;
    if (helpOf(v)) { found.push(t); continue; }
    // Sem ajuda cadastrada: usa o antigo title do rótulo, mas só quando o texto é o rótulo inteiro (nunca um pedaço de frase).
    if (v.trim().length <= 70 && (el.textContent ?? "").replace(/[\s*:]+$/g, "").trim() === v.replace(/[\s*:]+$/g, "").trim() && titleHelpFor(el)) found.push(t);
  }
  for (const t of found) {
    const help = helpOf(t.nodeValue ?? "") ?? (t.parentElement ? titleHelpFor(t.parentElement) : null);
    if (!help) continue;
    const i = document.createElement("span");
    i.className = "field-info";
    i.setAttribute("data-help", help);
    i.setAttribute("aria-hidden", "true");
    i.textContent = "i";
    t.parentNode?.insertBefore(i, t.nextSibling);
  }
}

export function FieldHelpLayer({ children, help = helpFor, strict = false }: { children: React.ReactNode; help?: (label: string) => string | null; strict?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Incremental: só reexamina os pedaços da tela que MUDARAM (antes varria a tela inteira a cada mudança, o que pesava em telas grandes).
    const pending = new Set<Node>();
    let timer = 0;
    const flush = () => {
      timer = 0;
      obs.disconnect();
      try {
        for (const n of pending) {
          if (!root.contains(n)) continue;
          const el = n.nodeType === 1 ? (n as HTMLElement) : n.parentElement;
          if (el && !el.closest(".field-info")) ensureIcons(el, help, strict);
        }
      } finally {
        pending.clear();
        obs.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["title"] });
      }
    };
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "attributes") { if (r.target.nodeType === 1 && !(r.target as Element).closest(".field-info")) pending.add(r.target); }
        else if (r.type === "characterData") pending.add(r.target);
        else r.addedNodes.forEach((n) => { if (n.nodeType === 1 || n.nodeType === 3) pending.add(n); });
      }
      if (pending.size && !timer) timer = window.setTimeout(flush, 120);
    });
    pending.add(root);
    flush(); // primeira passada: a tela toda, uma vez
    return () => { obs.disconnect(); if (timer) window.clearTimeout(timer); };
  }, [help, strict]);

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
        <div role="tooltip" style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translateX(-50%)", maxWidth: 320, zIndex: 9999, whiteSpace: "pre-line" }} className="pointer-events-none rounded-lg bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-xl">
          {tip.text}
        </div>,
        document.body,
      )}
    </div>
  );
}
