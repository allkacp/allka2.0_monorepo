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
// Matches the exact breakpoint the sidebar itself uses to go from hidden to
// visible (App.tsx: "hidden lg:flex" wraps <Sidebar>). Below this width the
// desktop sidebar occupies zero real screen space no matter what
// sidebarWidth (72/expanded) says — it's off-canvas.
const DESKTOP_SIDEBAR_QUERY = "(min-width: 1024px)";

export function useAppFrameMetrics() {
  const { sidebarWidth: contextSidebarWidth } = useSidebar();
  const [headerHeight, setHeaderHeight] = useState(64);
  const [footerHeight, setFooterHeight] = useState(40);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches,
  );

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

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_SIDEBAR_QUERY);
    const onChange = () => setIsDesktopSidebarVisible(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Panels positioned by "left: sidebarWidth" (HeaderSlideScreen and
  // friends) must never reserve room for a sidebar that's actually
  // off-canvas — that's what was squeezing every slide panel down to a
  // sliver on mobile, regardless of which one opened it.
  const sidebarWidth = isDesktopSidebarVisible ? contextSidebarWidth : 0;

  return { sidebarWidth, headerHeight, footerHeight };
}
