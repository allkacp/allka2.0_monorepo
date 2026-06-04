import { useState, useMemo, useRef } from "react";

export interface DashboardWidget<T extends string = string> {
  id: T;
  visible: boolean;
  order: number;
  customTitle?: string;
  colSpan: 1 | 2;
}

export interface WidgetMeta<T extends string = string> {
  id: T;
  defaultTitle: string;
  description: string;
  icon: any;
  defaultColSpan: 1 | 2;
}

function load<T extends string>(
  storageKey: string,
  defaults: DashboardWidget<T>[],
): DashboardWidget<T>[] {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return defaults;
    const parsed: DashboardWidget<T>[] = JSON.parse(saved);
    const ids = new Set(parsed.map((w) => w.id));
    const merged = [...parsed];
    defaults.forEach((dw) => {
      if (!ids.has(dw.id)) merged.push({ ...dw, visible: false });
    });
    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return defaults;
  }
}

function save<T extends string>(
  storageKey: string,
  widgets: DashboardWidget<T>[],
) {
  localStorage.setItem(storageKey, JSON.stringify(widgets));
}

export function useDashboardWidgets<T extends string>(
  storageKey: string,
  defaults: DashboardWidget<T>[],
  meta: Record<T, WidgetMeta<T>>,
) {
  const [widgets, setWidgets] = useState<DashboardWidget<T>[]>(() =>
    load(storageKey, defaults),
  );
  const [showCustomize, setShowCustomize] = useState(false);
  const dragIdx = useRef<number | null>(null);

  const sorted = useMemo(
    () => [...widgets].sort((a, b) => a.order - b.order),
    [widgets],
  );
  const visible = useMemo(() => sorted.filter((w) => w.visible), [sorted]);
  const hidden = useMemo(() => sorted.filter((w) => !w.visible), [sorted]);

  function persist(updated: DashboardWidget<T>[]) {
    setWidgets(updated);
    save(storageKey, updated);
  }

  function saveLayout(updated: DashboardWidget<T>[]) {
    persist(updated);
    setShowCustomize(false);
  }

  function getTitle(w: DashboardWidget<T>) {
    return w.customTitle || meta[w.id]?.defaultTitle || w.id;
  }

  // ── Customize panel actions ──────────────────────────────────────────────────

  function buildDraftActions(
    draft: DashboardWidget<T>[],
    setDraft: React.Dispatch<React.SetStateAction<DashboardWidget<T>[]>>,
  ) {
    const activeSorted = draft
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);

    function remove(id: T) {
      setDraft((prev) =>
        prev.map((w) => (w.id === id ? { ...w, visible: false } : w)),
      );
    }

    function add(id: T) {
      setDraft((prev) => {
        const maxOrder = Math.max(...prev.map((w) => w.order), -1);
        return prev.map((w) =>
          w.id === id ? { ...w, visible: true, order: maxOrder + 1 } : w,
        );
      });
    }

    function moveUp(idx: number) {
      if (idx === 0) return;
      setDraft((prev) => {
        const active = prev
          .filter((w) => w.visible)
          .sort((a, b) => a.order - b.order);
        const hidden = prev.filter((w) => !w.visible);
        const arr = [...active];
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        return [
          ...arr.map((w, i) => ({ ...w, order: i })),
          ...hidden.map((w, i) => ({ ...w, order: arr.length + i })),
        ];
      });
    }

    function moveDown(idx: number) {
      if (idx >= activeSorted.length - 1) return;
      setDraft((prev) => {
        const active = prev
          .filter((w) => w.visible)
          .sort((a, b) => a.order - b.order);
        const hidden = prev.filter((w) => !w.visible);
        const arr = [...active];
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
        return [
          ...arr.map((w, i) => ({ ...w, order: i })),
          ...hidden.map((w, i) => ({ ...w, order: arr.length + i })),
        ];
      });
    }

    function toggleColSpan(id: T) {
      setDraft((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, colSpan: w.colSpan === 2 ? 1 : 2 } : w,
        ),
      );
    }

    function setCustomTitle(id: T, title: string) {
      setDraft((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, customTitle: title.trim() || undefined } : w,
        ),
      );
    }

    function resetToDefault() {
      setDraft([...defaults]);
    }

    function onDragStart(idx: number) {
      dragIdx.current = idx;
    }

    function onDragOver(e: React.DragEvent, toIdx: number) {
      e.preventDefault();
      if (dragIdx.current === null || dragIdx.current === toIdx) return;
      setDraft((prev) => {
        const active = prev
          .filter((w) => w.visible)
          .sort((a, b) => a.order - b.order);
        const hidden = prev.filter((w) => !w.visible);
        const arr = [...active];
        const [item] = arr.splice(dragIdx.current!, 1);
        arr.splice(toIdx, 0, item);
        dragIdx.current = toIdx;
        return [
          ...arr.map((w, i) => ({ ...w, order: i })),
          ...hidden.map((w, i) => ({ ...w, order: arr.length + i })),
        ];
      });
    }

    return {
      remove,
      add,
      moveUp,
      moveDown,
      toggleColSpan,
      setCustomTitle,
      resetToDefault,
      onDragStart,
      onDragOver,
    };
  }

  return {
    widgets,
    sorted,
    visible,
    hidden,
    showCustomize,
    setShowCustomize,
    saveLayout,
    getTitle,
    buildDraftActions,
    meta,
  };
}
