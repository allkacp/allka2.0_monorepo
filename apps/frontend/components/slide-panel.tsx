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
      const t = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 300);
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
      className="fixed bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:fade-out-0 duration-300"
    >
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{
          background:
            "var(--brand-gradient, linear-gradient(to right, #0a1628, #1e3a8a, #0a1628))",
        }}
      >
        <div className="min-w-0 flex-1 text-sm font-bold text-white truncate">
          {title}
          {subtitle && (
            <p className="text-[11px] font-normal text-white/60 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">{children}</div>

      {footer && (
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 px-5 py-3">
          {footer}
        </div>
      )}
    </div>,
    document.body,
  );
}
