"use client";

// PAINEL MOLDURA (padrão global, 19/10) — o container grande que abre por cima da página:
//  • contorno violeta (borda 2 px + halo suave), cantos arredondados, fundo claro;
//  • ocupa TODO o espaço ao lado da barra lateral, com 30 px de margem em cima, embaixo e dos dois lados;
//  • acompanha a barra lateral: recolheu → o painel cresce; expandiu → ele diminui (a margem continua 30 px);
//  • fundo escurecido só sobre a área de conteúdo (a barra lateral continua visível);
//  • margem interna de 10 px em volta de TUDO que fica dentro do painel (regra global, 20/10);
//  • cabeçalho em banner dentro do painel usa FRAMED_HEADER_CLASS (+2 px = 12 px no total, alinhada aos cartões abaixo).
// Quando o usuário disser "transforme isso num Painel Moldura", é este componente que se usa.
import { createContext, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { keepNativeTitlesStripped } from "@/app/admin/produtos/novo-catalogo/field-help-layer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { cn } from "@/lib/utils";

export const FRAMED_PANEL_MARGIN = 30;
/** Um Painel Moldura aberto de dentro de uma Janela Moldura (ex.: editar um acesso dentro do bloco da etapa) precisa ficar POR CIMA dela, senão abre atrás e não dá para clicar. */
export const InsideFramedModal = createContext(false);
/** Cabeçalho em faixa/banner dentro do Painel Moldura: NÃO fica colado nas bordas; usa a mesma margem dos cartões de baixo (12 px em cima e dos lados). */
export const FRAMED_HEADER_CLASS = "mx-[2px] mt-[2px]";
/** Rodapé com botões: mesma margem lateral do cabeçalho (12 px) nos DOIS lados — o botão da direita alinha com a margem, e há folga embaixo. */
export const FRAMED_FOOTER_CLASS = "px-[2px] pb-[2px]";

export function framedPanelStyle(sidebarWidthPx: number, margin = FRAMED_PANEL_MARGIN): React.CSSProperties {
  return { left: `${sidebarWidthPx + margin}px`, top: `${margin}px`, width: `calc(100vw - ${sidebarWidthPx}px - ${margin * 2}px)`, height: `calc(100dvh - ${margin * 2}px)`, maxHeight: "none", transform: "none", translate: "none" };
}

export function FramedPanel({ open, onOpenChange, children, testId = "framed-panel", className, title }: {
  open: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode; testId?: string; className?: string; /** Título só para leitores de tela. */ title?: string;
}) {
  const { sidebarWidth } = useAppFrameMetrics();
  const sidebarWidthPx = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(String(sidebarWidth)) || 0;
  const aboveModal = useContext(InsideFramedModal);
  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      {open && typeof document !== "undefined" && createPortal(
        <div aria-hidden="true" className={cn("fixed inset-y-0 right-0 bg-slate-950/60 backdrop-blur-[2px]", aboveModal ? "z-[1255]" : "z-[1200]")} style={{ left: sidebarWidthPx }} data-testid={`${testId}-overlay`} />, document.body)}
      <DialogContent showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} overlayClassName="hidden"
        className={cn(aboveModal ? "!z-[1256]" : "!z-[1201]", "flex max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-2 border-violet-300 bg-[#f4f6fc] p-[10px] shadow-2xl ring-4 ring-violet-200/60 sm:!max-w-none dark:border-violet-700 dark:bg-slate-950 dark:ring-violet-900/50", className)}
        style={framedPanelStyle(sidebarWidthPx)} data-testid={testId}>
        {title && <DialogTitle className="sr-only">{title}</DialogTitle>}
        <TitleStripper>{children}</TitleStripper>
      </DialogContent>
    </Dialog>
  );
}

/** Dentro das janelas só o ⓘ mostra ajuda: o tooltip nativo do navegador (atributo title) é retirado, senão apareceria um segundo balão. */
function TitleStripper({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? keepNativeTitlesStripped(ref.current) : undefined), []);
  return <div ref={ref} className="contents">{children}</div>;
}

/**
 * JANELA MOLDURA (padrão global, 20/10) — janela menor por cima de um Painel Moldura: centralizada na área ao lado da barra lateral,
 * com fundo CLARO (branco translúcido) que cobre tudo menos a sidebar (acompanha ela recolhendo/expandindo).
 */
export function FramedModal({ open, onOpenChange, children, testId = "framed-modal", className, title, style }: {
  open: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode; testId?: string; className?: string; title?: string; style?: React.CSSProperties;
}) {
  const { sidebarWidth } = useAppFrameMetrics();
  const sw = typeof sidebarWidth === "number" ? sidebarWidth : parseInt(String(sidebarWidth)) || 0;
  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      {open && typeof document !== "undefined" && createPortal(
        <div aria-hidden="true" className="fixed inset-y-0 right-0 z-[1250] bg-white/55 backdrop-blur-[1px]" style={{ left: sw }} data-testid={`${testId}-overlay`} />, document.body)}
      <DialogContent showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} overlayClassName="hidden"
        className={cn("!z-[1251] flex max-h-[calc(100dvh-4rem)] w-[calc(100vw-2rem)] max-w-[66rem] flex-col gap-0 overflow-hidden rounded-2xl border-2 border-violet-300 bg-[#f4f6fc] p-[10px] shadow-2xl ring-4 ring-violet-200/60 sm:!max-w-[66rem] dark:border-violet-700 dark:bg-slate-950 dark:ring-violet-900/50", className)}
        style={{ left: `calc(${sw}px + (100vw - ${sw}px) / 2)`, top: "50%", transform: "translate(-50%, -50%)", translate: "none", ...style }} data-testid={testId}>
        {title && <DialogTitle className="sr-only">{title}</DialogTitle>}
        <InsideFramedModal.Provider value={true}><TitleStripper>{children}</TitleStripper></InsideFramedModal.Provider>
      </DialogContent>
    </Dialog>
  );
}
