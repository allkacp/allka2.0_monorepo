import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  /** Usually a string, but accepts a ReactNode for headers that need more
   * than plain text (e.g. an avatar next to the title). */
  title: ReactNode;
  subtitle?: ReactNode;
  /** "full" spans from the sidebar to the right edge (filters, column config,
   * record detail). "compact" is a fixed-width panel anchored to the right
   * edge (small forms, confirmations). */
  widthMode?: "full" | "compact";
  compactWidth?: number;
  zIndex?: number;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Platform-standard slide-from-right panel: no backdrop, positioned so it
 * never covers the sidebar/header/footer, closes on X/Escape with the exit
 * animation playing before unmount. Reference implementation this was
 * extracted from: the Filtros Avançados panel in
 * apps/frontend/app/admin/empresas/page.tsx.
 *
 * Rendered via a portal directly under <body> so `position: fixed` is
 * always relative to the viewport, regardless of any transform/filter an
 * ancestor might apply.
 */
export function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  widthMode = "full",
  compactWidth = 480,
  zIndex = 70,
  footer,
  children,
}: SlidePanelProps) {
  const { sidebarWidth, headerHeight, footerHeight } = useAppFrameMetrics();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      // 450ms — a saída real (CSS global em globals.css, [data-slot="sheet-content"][data-state="closed"])
      // roda a 420ms; desmontar antes disso corta a animação. 450ms dá uma margem seguindo o mesmo valor.
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 450);
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

  const left = sidebarWidth - 2;
  const top = headerHeight - 1;
  const bottom = footerHeight - 1;

  const style: React.CSSProperties =
    widthMode === "compact"
      ? {
          top,
          bottom,
          right: 0,
          width: `min(${compactWidth}px, calc(100vw - ${left}px))`,
          zIndex,
        }
      : {
          left,
          top,
          bottom,
          right: 0,
          width: `calc(100vw - ${left}px)`,
          zIndex,
        };

  return createPortal(
    <div
      data-slot="sheet-content"
      data-state={closing ? "closed" : "open"}
      style={style}
      className="fixed bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-slate-700/80 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0 duration-300"
    >
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          background:
            "var(--app-brand-gradient, var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628)))",
        }}
      >
        <div className="min-w-0 flex-1 truncate">
          <p className="text-base font-semibold text-white truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs font-normal text-white/70 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white hover:bg-white/25 rounded-lg p-2 transition-all duration-200 flex-shrink-0 ml-3"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">{children}</div>

      {footer && (
        <div className="flex-shrink-0 border-t border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-4">
          {footer}
        </div>
      )}
    </div>,
    document.body,
  );
}
