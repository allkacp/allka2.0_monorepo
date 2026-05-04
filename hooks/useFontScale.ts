import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "allka_font_scale";

// 7 níveis simétricos: 3 abaixo / padrão / 3 acima
// offset: posição relativa ao padrão (0)
export const FONT_SCALE_LEVELS = [
  { id: "min3",    label: "Mínimo",      scale: 0.75,   px: 12, offset: -3 },
  { id: "min2",    label: "Bem menor",   scale: 0.8125, px: 13, offset: -2 },
  { id: "min1",    label: "Menor",       scale: 0.875,  px: 14, offset: -1 },
  { id: "default", label: "Padrão",      scale: 0.9375, px: 15, offset:  0 },
  { id: "plus1",   label: "Maior",       scale: 1.0,    px: 16, offset: +1 },
  { id: "plus2",   label: "Bem maior",   scale: 1.0625, px: 17, offset: +2 },
  { id: "plus3",   label: "Máximo",      scale: 1.125,  px: 18, offset: +3 },
] as const;

export type FontScaleId = (typeof FONT_SCALE_LEVELS)[number]["id"];

const DEFAULT_LEVEL: FontScaleId = "default";

function applyScale(scale: number) {
  // Inline style tem precedência sobre qualquer regra CSS — isso garante que
  // nenhum outro setter (ex: sidebar-context) pode sobrescrever a preferência.
  const px = `${Math.round(16 * scale * 100) / 100}px`;
  document.documentElement.style.fontSize = px;
  // CSS variable mantida para leituras em JS (ex: cálculos de componentes)
  document.documentElement.style.setProperty(
    "--allka-font-scale",
    String(scale),
  );
}

function readStoredId(): FontScaleId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && FONT_SCALE_LEVELS.some((l) => l.id === stored)) {
      return stored as FontScaleId;
    }
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_LEVEL;
}

export function useFontScale() {
  const [levelId, setLevelId] = useState<FontScaleId>(DEFAULT_LEVEL);

  // Carrega e aplica o nível salvo na montagem
  useEffect(() => {
    const id = readStoredId();
    setLevelId(id);
    const level = FONT_SCALE_LEVELS.find((l) => l.id === id)!;
    applyScale(level.scale);
  }, []);

  const setLevel = useCallback((id: FontScaleId) => {
    const level = FONT_SCALE_LEVELS.find((l) => l.id === id);
    if (!level) return;
    setLevelId(id);
    applyScale(level.scale);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const increase = useCallback(() => {
    setLevelId((current) => {
      const idx = FONT_SCALE_LEVELS.findIndex((l) => l.id === current);
      const next = FONT_SCALE_LEVELS[idx + 1];
      if (!next) return current;
      setLevel(next.id);
      return next.id;
    });
  }, [setLevel]);

  const decrease = useCallback(() => {
    setLevelId((current) => {
      const idx = FONT_SCALE_LEVELS.findIndex((l) => l.id === current);
      const prev = FONT_SCALE_LEVELS[idx - 1];
      if (!prev) return current;
      setLevel(prev.id);
      return prev.id;
    });
  }, [setLevel]);

  const reset = useCallback(() => {
    setLevel(DEFAULT_LEVEL);
  }, [setLevel]);

  const currentLevel =
    FONT_SCALE_LEVELS.find((l) => l.id === levelId) ?? FONT_SCALE_LEVELS[3];

  const isMin = levelId === FONT_SCALE_LEVELS[0].id;
  const isMax = levelId === FONT_SCALE_LEVELS[FONT_SCALE_LEVELS.length - 1].id;
  const isDefault = levelId === DEFAULT_LEVEL;

  return {
    levelId,
    currentLevel,
    isMin,
    isMax,
    isDefault,
    setLevel,
    increase,
    decrease,
    reset,
  };
}
