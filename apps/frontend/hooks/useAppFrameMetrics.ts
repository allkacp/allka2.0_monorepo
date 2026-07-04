import { useEffect, useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";

/**
 * Live sidebar/header/footer dimensions, used to position slide-from-right
 * panels so they never cover the sidebar, header or footer. Extracted from
 * the original measurement logic in admin/empresas/page.tsx: the app shell
 * mounts two <header>/<footer> pairs (desktop + mobile, one hidden via CSS
 * at a time), so we pick whichever candidate actually has real height
 * instead of trusting querySelector's first match, and keep watching via
 * ResizeObserver since the header's second row (level/points pills) can
 * mount/resize after this first runs.
 */
export function useAppFrameMetrics() {
  const { sidebarWidth } = useSidebar();
  const [headerHeight, setHeaderHeight] = useState(64);
  const [footerHeight, setFooterHeight] = useState(40);

  useEffect(() => {
    const headers = Array.from(document.querySelectorAll("header"));
    const footers = Array.from(document.querySelectorAll("footer"));
    const measure = () => {
      const h = headers.find((el) => el.offsetHeight > 0);
      const f = footers.find((el) => el.offsetHeight > 0);
      if (h) setHeaderHeight(h.offsetHeight);
      if (f) setFooterHeight(f.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    headers.forEach((el) => ro.observe(el));
    footers.forEach((el) => ro.observe(el));
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  return { sidebarWidth, headerHeight, footerHeight };
}
