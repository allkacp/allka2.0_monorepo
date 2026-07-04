import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drives the "two horizontal scrollbar mirrors" pattern (one above the
 * table, one below/in the footer, both kept in sync with the real table
 * scroll) used across the redesigned tables. Extracted from
 * admin/empresas/page.tsx.
 *
 * Pass `loadingDeps` with any flag that gates the table behind an early
 * loading return (e.g. `[companiesLoading]`) — the overflow check only
 * has something to measure once that real table element mounts, so it
 * must re-run when loading flips to false, not just when column widths
 * change.
 */
export function useTableScrollSync(loadingDeps: React.DependencyList = []) {
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);

  // The mirror bars are narrow flex-1 strips sitting next to other
  // toolbar/footer controls, while the real table div spans the full card
  // width — their scrollable widths differ. Sync by the *ratio* of scroll
  // completion instead of raw scrollLeft pixels, so all three always reach
  // 0% and 100% together regardless of their individual widths.
  const syncScrollFrom = useCallback((source: HTMLDivElement | null) => {
    if (isSyncingScroll.current || !source) return;
    isSyncingScroll.current = true;
    const sourceMax = source.scrollWidth - source.clientWidth;
    const ratio = sourceMax > 0 ? source.scrollLeft / sourceMax : 0;
    [tableScrollRef, topScrollRef, bottomScrollRef].forEach((ref) => {
      const el = ref.current;
      if (!el || el === source) return;
      const max = el.scrollWidth - el.clientWidth;
      el.scrollLeft = ratio * max;
    });
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, []);

  const handleTopBarScroll = useCallback(
    () => syncScrollFrom(topScrollRef.current),
    [syncScrollFrom],
  );
  const handleTableScroll = useCallback(
    () => syncScrollFrom(tableScrollRef.current),
    [syncScrollFrom],
  );
  const handleBottomBarScroll = useCallback(
    () => syncScrollFrom(bottomScrollRef.current),
    [syncScrollFrom],
  );

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    // A few px of slack (scrollbar-width rounding, border-collapse edge
    // cases) shouldn't count as "overflow" — only show the mirrors when
    // there's genuinely more to scroll than that.
    const check = () => setHasHorizontalOverflow(el.scrollWidth > el.clientWidth + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, loadingDeps);

  return {
    tableScrollRef,
    topScrollRef,
    bottomScrollRef,
    handleTopBarScroll,
    handleTableScroll,
    handleBottomBarScroll,
    hasHorizontalOverflow,
  };
}
