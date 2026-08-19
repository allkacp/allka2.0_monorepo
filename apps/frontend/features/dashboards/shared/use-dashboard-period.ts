// Item 18 — fonte única de verdade pra resolver o período efetivo de um
// widget (Global x Custom). Lógica extraída de apps/frontend/app/agency/
// dashboard/page.tsx (getWidgetPeriod/setWidgetCustomPeriod), que já era
// correta lá — sem fallback silencioso tipo `localPeriod || globalPeriod`,
// sem o global sobrescrever o custom por acidente. O que faltava era isso
// viver num lugar só em vez de cada uma das 5 telas reimplementar a mesma
// regra (e arriscar divergir com o tempo).
//
// Regra:
//   - widget sem override, ou override com mode="global" → segue
//     globalPeriod SEMPRE (muda junto quando o global muda).
//   - widget com override mode="custom" → usa o período próprio, imune a
//     mudanças no global, até o usuário escolher "Seguir período global"
//     de novo (o que REMOVE o override, não copia o valor do global).
import { useCallback, useEffect, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface GlobalPeriod {
  type: string;
  from?: Date;
  to?: Date;
  label: string;
}

export interface WidgetPeriodOverride {
  widgetId: string;
  mode: "global" | "custom";
  customPeriod?: {
    from: string;
    to: string;
    label: string;
    periodKey?: string;
  };
}

export interface ResolvedPeriod {
  from: Date;
  to: Date;
  label: string;
  periodKey?: string;
  /** true = widget está em modo custom (imune ao global); false = segue o global. */
  isCustom: boolean;
}

// Mesmas 7 opções fixas já oferecidas nos 5 dashboards — centralizadas
// aqui pra não haver 5 cópias do mesmo switch/case podendo divergir.
export const WIDGET_PERIOD_OPTIONS: { key: string; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7days", label: "Últimos 7 dias" },
  { key: "30days", label: "Últimos 30 dias" },
  { key: "thisMonth", label: "Este mês" },
  { key: "lastMonth", label: "Mês passado" },
  { key: "90days", label: "Últimos 90 dias" },
  { key: "365days", label: "Último ano" },
];

const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  WIDGET_PERIOD_OPTIONS.map((o) => [o.label, o.key]),
);

function computePeriodRange(periodKey: string): { from: string; to: string; label: string } | null {
  const now = new Date();
  const to = format(now, "yyyy-MM-dd");
  switch (periodKey) {
    case "today":
      return { from: format(now, "yyyy-MM-dd"), to, label: "Hoje" };
    case "7days":
      return { from: format(subDays(now, 7), "yyyy-MM-dd"), to, label: "Últimos 7 dias" };
    case "30days":
      return { from: format(subDays(now, 30), "yyyy-MM-dd"), to, label: "Últimos 30 dias" };
    case "thisMonth":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to, label: "Este mês" };
    case "lastMonth":
      return {
        from: format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"),
        to: format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd"),
        label: "Mês passado",
      };
    case "90days":
      return { from: format(subDays(now, 90), "yyyy-MM-dd"), to, label: "Últimos 90 dias" };
    case "365days":
      return { from: format(subDays(now, 365), "yyyy-MM-dd"), to, label: "Último ano" };
    default:
      return null;
  }
}

/** Resolve o período efetivo de UM widget — a regra Global x Local, num lugar só. */
export function resolveWidgetPeriod(
  overrides: WidgetPeriodOverride[],
  globalPeriod: GlobalPeriod,
  widgetId: string,
): ResolvedPeriod {
  const override = overrides.find((wp) => wp.widgetId === widgetId);
  if (override && override.mode === "custom" && override.customPeriod) {
    const periodKey = override.customPeriod.periodKey ?? LABEL_TO_KEY[override.customPeriod.label];
    return {
      from: new Date(override.customPeriod.from),
      to: new Date(override.customPeriod.to),
      label: override.customPeriod.label,
      periodKey,
      isCustom: true,
    };
  }
  return {
    from: globalPeriod.from ?? new Date(0),
    to: globalPeriod.to ?? new Date(),
    label: globalPeriod.label,
    isCustom: false,
  };
}

/**
 * Estado + persistência dos overrides de período por widget. `storageKey`
 * inclui o perfil (ex.: "dashboard-widget-periods-agency") — ver
 * limitação documentada no relatório: hoje é 1 chave por perfil, não por
 * visão salva individual (mesmo comportamento que já existia nos 5
 * dashboards antes desta extração).
 */
export function useWidgetPeriodOverrides(storageKey: string) {
  const [widgetPeriods, setWidgetPeriods] = useState<WidgetPeriodOverride[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widgetPeriods));
    } catch {}
  }, [storageKey, widgetPeriods]);

  const getWidgetPeriod = useCallback(
    (globalPeriod: GlobalPeriod, widgetId: string) => resolveWidgetPeriod(widgetPeriods, globalPeriod, widgetId),
    [widgetPeriods],
  );

  /** periodKey="global" remove o override (não copia o valor — a regra explícita do item 18). */
  const setWidgetCustomPeriod = useCallback((widgetId: string, periodKey: string) => {
    if (periodKey === "global") {
      setWidgetPeriods((prev) => prev.filter((wp) => wp.widgetId !== widgetId));
      return;
    }
    const range = computePeriodRange(periodKey);
    if (!range) return;
    setWidgetPeriods((prev) => [
      ...prev.filter((wp) => wp.widgetId !== widgetId),
      { widgetId, mode: "custom", customPeriod: { ...range, periodKey } },
    ]);
  }, []);

  const isWidgetCustom = useCallback(
    (widgetId: string) => widgetPeriods.some((wp) => wp.widgetId === widgetId && wp.mode === "custom"),
    [widgetPeriods],
  );

  return { widgetPeriods, setWidgetPeriods, getWidgetPeriod, setWidgetCustomPeriod, isWidgetCustom };
}
