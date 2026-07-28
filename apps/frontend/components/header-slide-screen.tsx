// @ts-nocheck
/**
 * HeaderSlideScreen — mesma linguagem visual do <EmbeddedSlideScreen> (Tela
 * Slide: cantos arredondados, gradiente de marca, X, entrada com
 * fade+zoom+slide, pin pra Bandeja de Telas), mas para painéis GLOBAIS
 * abertos a partir do cabeçalho (Cesta, Notificações, Alertas) — não vivem
 * dentro de uma página específica, então não têm um container
 * `position: relative` de página pra ancorar `absolute inset-0`.
 *
 * Pra encaixar EXATAMENTE no mesmo retângulo onde o painel branco
 * (STANDARD_SHELL_PANEL_CLASS) de qualquer página fica — mesmas classes
 * responsivas do <main> em App.tsx (px-4 sm:px-6 lg:px-14 py-4 lg:py-12) —
 * em vez de valores fixos em px, que quebrariam em resoluções diferentes.
 *
 *   <HeaderSlideScreen open={open} onClose={onClose} title="..." subtitle="...">
 *     {children}
 *   </HeaderSlideScreen>
 */
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Pin, X } from "lucide-react";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";
import { usePinEntry, type PinnedEntry } from "@/contexts/open-screens-context";
import { isStandardShellRoute } from "@/components/standard-page-shell";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderSlideScreenProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  zIndex?: number;
  hideHeader?: boolean;
  pin?: PinnedEntry;
}

export function HeaderSlideScreen({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  zIndex = 60,
  hideHeader = false,
  pin,
}: HeaderSlideScreenProps) {
  const { sidebarWidth, headerHeight } = useAppFrameMetrics();
  const { pathname } = useLocation();
  const isShellRoute = isStandardShellRoute(pathname);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const { pinned, toggle: togglePin } = usePinEntry(pin ?? null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 320);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <>
      {/* Área clicável fora do painel pra fechar — sem escurecer/desfocar o
          fundo (Tela Slide nunca usa overlay; isso é só de Popup 1/2). */}
      <div
        onClick={onClose}
        style={{ left: sidebarWidth, top: headerHeight, bottom: 0, zIndex: zIndex - 1 }}
        className="fixed right-0"
      />
      {/* Mesmo padding responsivo do <main> — garante que o retângulo abaixo
          caia exatamente onde o painel branco da página cairia. O <Footer>
          real é fixed (fora do fluxo) com z-index mais alto, então <main> se
          estende até o fim da viewport e o footer só pinta por cima — daí
          "bottom: 0" aqui em vez de descontar footerHeight (senão o painel
          fica mais curto que o retângulo real e sobra uma tira vazando). */}
      <div
        style={{ left: sidebarWidth, top: headerHeight, bottom: 0, zIndex }}
        className={cn(
          "fixed right-0 flex px-4 sm:px-6 py-4 pointer-events-none",
          isShellRoute
            ? "lg:pt-[20px] lg:pl-[20px] lg:pr-14 lg:!pb-[25px]"
            : "lg:px-14 lg:py-12",
        )}
      >
        <div
          data-state={closing ? "closed" : "open"}
          className="relative ml-auto w-full h-full flex flex-col overflow-hidden border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 rounded-2xl lg:rounded-[1.5rem] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] p-3 sm:p-5 lg:p-[12px] pointer-events-auto data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-right-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-right-4 duration-300"
        >
          <div className="h-full min-h-0 flex flex-col">
            {!hideHeader && (
              <div className="shrink-0 mb-3 sm:mb-4 rounded-2xl lg:rounded-[1.25rem] overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]">
                <div
                  className="flex items-center gap-3 px-6 py-4"
                  style={{
                    background:
                      "var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))",
                  }}
                >
                  <div className="min-w-0 flex-1 truncate">
                    <div className="text-base font-semibold text-white truncate flex items-center gap-3">
                      {title}
                    </div>
                    {subtitle && (
                      <p className="text-xs font-normal text-white/70 mt-1 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {pin && (
                    <TooltipProvider delayDuration={400}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={togglePin}
                            aria-pressed={pinned}
                            className={`flex items-center justify-center h-9 w-9 rounded-lg border transition-colors shrink-0 ${
                              pinned
                                ? "border-white bg-white/25 text-white"
                                : "border-white/40 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                            }`}
                          >
                            <Pin className={`h-4 w-4 ${pinned ? "fill-current" : ""}`} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6}>
                          {pinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {hideHeader && pin && (
              <TooltipProvider delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={togglePin}
                      aria-pressed={pinned}
                      className={`absolute top-5 right-16 z-10 flex items-center justify-center h-8 w-8 rounded-lg transition-all ${
                        pinned
                          ? "bg-white/25 text-white"
                          : "text-white/80 hover:bg-white/20 hover:text-white"
                      }`}
                    >
                      <Pin className={`h-4 w-4 ${pinned ? "fill-current" : ""}`} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    {pinned ? "Remover da Bandeja de Telas" : "Adicionar à Bandeja de Telas"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <div className="flex flex-1 overflow-hidden min-h-0 rounded-2xl lg:rounded-[1.25rem]">{children}</div>

            {footer && (
              <div className="shrink-0 mt-3 sm:mt-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-4">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
