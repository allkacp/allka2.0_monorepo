import { useCallback, useEffect, useState } from "react";

/**
 * Persists a screen's "grid columns / list" view-mode preference in
 * localStorage so the choice survives reloads (F5) — same convention as
 * `useItemsPerPage` (see lib/use-items-per-page.ts). Each screen passes a
 * unique `key`; the preference is isolated per screen, per browser (never
 * shared between users — localStorage is already per-browser).
 *
 * Restored 2026-09 (reparo "recuperação completa dos layouts") — the
 * Cadastro de Produtos view-mode toggle existed before c86eaa2 with its own
 * ad-hoc localStorage key ("allka_cadastro_produtos_view_mode"); this hook
 * generalizes that same convention for both Cadastro and Catálogo without
 * inventing server-side persistence that didn't exist before.
 *
 * Usage:
 *   const [viewMode, setViewMode] = usePersistedViewMode("admin-produtos", 3);
 */
export type ProductViewMode = 2 | 3 | 4 | 5 | "list";

export function usePersistedViewMode(key: string, defaultValue: ProductViewMode) {
  const storageKey = `allka:view-mode:${key}`;
  const [value, setValue] = useState<ProductViewMode>(defaultValue);

  // Hydrate from localStorage after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "list") setValue("list");
      else {
        const n = Number(stored);
        if (n === 2 || n === 3 || n === 4 || n === 5) setValue(n);
      }
    } catch {
      /* localStorage unavailable — fall back to in-memory state */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const setPersisted = useCallback(
    (v: ProductViewMode) => {
      setValue(v);
      try {
        window.localStorage.setItem(storageKey, String(v));
      } catch {
        /* ignore write failures */
      }
    },
    [storageKey],
  );

  return [value, setPersisted] as const;
}

/** Classe de grid Tailwind pro número de colunas (ou "" pra lista). */
export function viewModeGridClass(mode: ProductViewMode): string {
  if (mode === "list") return "";
  if (mode === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-4";
  if (mode === 3) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
  if (mode === 4) return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
  return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3";
}
