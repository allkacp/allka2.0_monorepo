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
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

import {
  getDashboardStorageKey,
  type DashboardStoragePortal,
} from "@/lib/dashboard-storage-scope";

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

// ─────────────────────────────────────────────────────────────────────────────
// Período GLOBAL do dashboard (distinto do override por widget acima) +
// persistência por perfil.
//
// Correção pós-QA do Item 1 (reunião 09/09/2026). Antes, cada uma das 5
// telas tinha o mesmo par de efeitos:
//
//   const [globalPeriod, setGlobalPeriod] = useState({ type: "last_30_days", ... });
//   useEffect(() => { const s = localStorage.getItem(key); if (s) setGlobalPeriod(JSON.parse(s)); }, []);   // (A) hidrata TARDE
//   useEffect(() => { localStorage.setItem(key, JSON.stringify(globalPeriod)); }, [globalPeriod]);          // (B) grava
//
// Duas falhas reais disso:
//
//  1. Persistência (F5 voltava pro padrão). Na montagem, (B) roda com o
//     valor PADRÃO — que ainda é o estado corrente — e grava "Últimos 30
//     dias" por cima do valor salvo, ANTES de (A) aplicar o valor lido.
//     Sob React.StrictMode (ligado em dev, ver apps/frontend/main.tsx) o
//     efeito monta→desmonta→monta: o `setGlobalPeriod` da 1ª montagem é
//     descartado e a 2ª montagem relê o localStorage já sobrescrito pelo
//     padrão. Resultado: a escolha do usuário some no reload.
//
//  2. Dados "presos" no período errado após o reload. Os efeitos de fetch
//     dos widgets globais dependem de `[globalPeriod]`; como (1) deixava
//     `globalPeriod` travado no padrão depois do F5, todo widget que segue
//     o período global buscava sempre a janela de 30 dias, dando a
//     impressão de que trocar o período "não muda nada".
//
// Correção: hidratar do localStorage JÁ no inicializador preguiçoso do
// useState (valor certo no 1º render, sem corrida, sem "piscar" pro
// padrão). A gravação passa a acontecer só a partir da 1ª mudança REAL
// (guarda `isFirstRun`), nunca na montagem — mesma disciplina do guard
// `if (!currentDashboardId) return` já usado pras outras chaves de
// dashboard. A chave continua escopada por perfil via
// `getDashboardStorageKey(..., portal)`, então Admin/Company/Agency/
// Partner/Leader nunca leem ou escrevem o período um do outro. O formato
// salvo ({ type, from?, to?, label }, datas em ISO) é o mesmo de antes —
// valores já gravados continuam sendo lidos.

export interface GlobalDashboardPeriod<T extends string = string> {
  type: T;
  from?: Date;
  to?: Date;
  label: string;
}

export const GLOBAL_DASHBOARD_PERIOD_STORAGE_KEY = "dashboard_global_period";

const DEFAULT_GLOBAL_DASHBOARD_PERIOD = {
  type: "last_30_days",
  label: "Últimos 30 dias",
} as const;

/** Lê e valida o período global salvo pra um perfil. Retorna `null` quando
 * não há nada salvo, o JSON é inválido, ou o localStorage está indisponível
 * (aba privada, cota) — nesses casos o chamador usa o padrão. */
export function readSavedGlobalDashboardPeriod<T extends string = string>(
  portal: DashboardStoragePortal,
): GlobalDashboardPeriod<T> | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(
      getDashboardStorageKey(GLOBAL_DASHBOARD_PERIOD_STORAGE_KEY, portal),
    );
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      type?: unknown;
      from?: unknown;
      to?: unknown;
      label?: unknown;
    };
    if (typeof parsed?.type !== "string" || typeof parsed?.label !== "string") {
      return null;
    }
    const from =
      typeof parsed.from === "string" ? new Date(parsed.from) : undefined;
    const to = typeof parsed.to === "string" ? new Date(parsed.to) : undefined;
    return {
      type: parsed.type as T,
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      label: parsed.label,
    };
  } catch {
    return null;
  }
}

/**
 * Estado do período global do dashboard, hidratado do localStorage no
 * primeiro render e persistido (por perfil) a cada mudança real. Substitui,
 * nas 5 telas, o `useState` + os dois `useEffect` (ler/gravar) que corriam
 * entre si. A API de retorno é a mesma de um `useState`, então o resto de
 * cada página (`setGlobalPeriod({ type, from, to, label })`) não muda.
 */
export function useGlobalDashboardPeriod<T extends string = string>(
  portal: DashboardStoragePortal,
): [GlobalDashboardPeriod<T>, Dispatch<SetStateAction<GlobalDashboardPeriod<T>>>] {
  const [period, setPeriod] = useState<GlobalDashboardPeriod<T>>(
    () =>
      readSavedGlobalDashboardPeriod<T>(portal) ?? {
        ...(DEFAULT_GLOBAL_DASHBOARD_PERIOD as unknown as GlobalDashboardPeriod<T>),
      },
  );

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      // Nunca grava na montagem: o valor já veio do localStorage (ou é o
      // padrão), então não há o que persistir ainda — e é isso que impede
      // o padrão de sobrescrever a escolha salva.
      isFirstRun.current = false;
      return;
    }
    try {
      window.localStorage.setItem(
        getDashboardStorageKey(GLOBAL_DASHBOARD_PERIOD_STORAGE_KEY, portal),
        JSON.stringify({
          type: period.type,
          from: period.from?.toISOString(),
          to: period.to?.toISOString(),
          label: period.label,
        }),
      );
    } catch {
      /* localStorage indisponível — o estado em memória continua válido */
    }
  }, [portal, period]);

  return [period, setPeriod];
}
