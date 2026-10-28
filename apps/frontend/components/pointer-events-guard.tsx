"use client";
import { useEffect } from "react";

// Rede de segurança contra o "overlay invisível": às vezes, ao fechar uma janela (principalmente quando uma janela abre outra, ou um menu
// abre uma janela), a biblioteca de janelas deixa \`pointer-events: none\` no <body> e a tela inteira para de responder a cliques.
// Se não há NENHUMA janela, menu ou camada aberta e o <body> continua bloqueado, o bloqueio é removido.
const OPEN_LAYERS = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-menu-content][data-state="open"], [data-radix-popper-content-wrapper] [data-state="open"], [data-slot="sheet-content"][data-state="open"]';

export function PointerEventsGuard() {
  useEffect(() => {
    let timer = 0;
    const check = () => {
      timer = 0;
      if (document.body.style.pointerEvents !== "none") return;
      if (document.querySelector(OPEN_LAYERS)) return;
      document.body.style.pointerEvents = "";
    };
    const schedule = () => { if (!timer) timer = window.setTimeout(check, 350); };
    const obs = new MutationObserver(schedule);
    obs.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    obs.observe(document.body, { childList: true });
    schedule();
    return () => { obs.disconnect(); if (timer) window.clearTimeout(timer); };
  }, []);
  return null;
}
