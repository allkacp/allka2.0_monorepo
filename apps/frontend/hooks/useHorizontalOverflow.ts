import { useEffect, useState, type RefObject } from "react";

/**
 * True while the given element's content actually overflows horizontally —
 * used to hide horizontal-scrollbar mirrors when there's nothing to scroll,
 * instead of always rendering an empty-looking scroll strip.
 */
export function useHorizontalOverflow(
  ref: RefObject<HTMLElement | null>,
  deps: React.DependencyList = [],
) {
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return hasOverflow;
}
