import { useCallback, useEffect, useState } from "react";

/**
 * Persists a table's "items per page" preference in localStorage so the choice
 * survives reloads (F5). Each table passes a unique `key`; the preference is
 * remembered per table, per browser.
 *
 * Drop-in replacement for `useState<number>(default)` — returns the same
 * `[value, setValue]` tuple, including functional-update support.
 *
 * Usage:
 *   const [itemsPerPage, setItemsPerPage] = useItemsPerPage("admin-projetos", 10);
 */
export function useItemsPerPage(key: string, defaultValue = 10) {
  const storageKey = `allka:ipp:${key}`;
  const [value, setValue] = useState<number>(defaultValue);

  // Hydrate from localStorage after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored != null) {
        const n = parseInt(stored, 10);
        if (Number.isFinite(n) && n > 0) setValue(n);
      }
    } catch {
      /* localStorage unavailable — fall back to in-memory state */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setPersisted = useCallback(
    (v: number | ((prev: number) => number)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: number) => number)(prev) : v;
        try {
          window.localStorage.setItem(storageKey, String(next));
        } catch {
          /* ignore write failures */
        }
        return next;
      });
    },
    [storageKey],
  );

  return [value, setPersisted] as const;
}
