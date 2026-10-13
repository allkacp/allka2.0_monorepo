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
  // Largura visível da área da tabela, para quem quiser encolher as
  // colunas até caber (sem rolagem lateral).
  const [tableBoxWidth, setTableBoxWidth] = useState(0);

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
    const check = () => {
      setHasHorizontalOverflow(el.scrollWidth > el.clientWidth + 8);
      setTableBoxWidth(el.clientWidth);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    // A tabela dentro também muda de largura (colunas que encolhem para
    // caber); sem isso a barra de cima ficaria presa em "tem rolagem".
    if (el.firstElementChild) ro.observe(el.firstElementChild);
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
    tableBoxWidth,
  };
}

/**
 * Encolhe as larguras das colunas na proporção até caberem em `available`
 * (px), sem deixar nenhuma abaixo do seu mínimo (`mins[i]`, ou `min`).
 * Usado para a tabela caber na tela sem barra de rolagem horizontal.
 */
export function fitColumnWidths(
  widths: number[],
  available: number,
  min = 60,
  mins: (number | undefined)[] = [],
): number[] {
  const minOf = (i: number) => Math.min(widths[i], mins[i] ?? min);
  const total = widths.reduce((a, w) => a + w, 0);
  if (available <= 0 || total <= available) return widths;
  const pinned = new Set<number>();
  for (let guard = 0; guard <= widths.length; guard++) {
    const freeTotal = widths.reduce((a, w, i) => (pinned.has(i) ? a : a + w), 0);
    const room =
      available - [...pinned].reduce((a, i) => a + minOf(i), 0);
    const scale = freeTotal > 0 ? Math.max(0, room) / freeTotal : 0;
    let changed = false;
    widths.forEach((w, i) => {
      if (!pinned.has(i) && w * scale < minOf(i)) {
        pinned.add(i);
        changed = true;
      }
    });
    if (!changed) {
      return widths.map((w, i) =>
        pinned.has(i) ? minOf(i) : Math.floor(w * scale),
      );
    }
  }
  return widths.map((_, i) => minOf(i));
}
