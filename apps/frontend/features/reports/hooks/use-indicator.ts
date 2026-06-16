// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { IndicatorResult } from "../types";

interface UseIndicatorOptions {
  indicatorId: string;
  startDate: string;
  endDate: string;
  filters?: Record<string, unknown>;
  comparisonMode?: string;
  enabled?: boolean;
}

interface UseIndicatorReturn {
  data: IndicatorResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useIndicator({
  indicatorId,
  startDate,
  endDate,
  filters,
  comparisonMode,
  enabled = true,
}: UseIndicatorOptions): UseIndicatorReturn {
  const [data, setData] = useState<IndicatorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled || !indicatorId || !startDate || !endDate) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.runIndicator({
        indicatorId,
        startDate,
        endDate,
        filters,
        comparisonMode,
      });
      setData(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar indicador.";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [indicatorId, startDate, endDate, JSON.stringify(filters), comparisonMode, enabled]);

  useEffect(() => {
    fetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Batch hook ─────────────────────────────────────────────────────────────

interface BatchIndicatorRequest {
  indicatorId: string;
  startDate: string;
  endDate: string;
  filters?: Record<string, unknown>;
  comparisonMode?: string;
}

interface UseBatchIndicatorsReturn {
  data: IndicatorResult[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBatchIndicators(
  indicators: BatchIndicatorRequest[],
  enabled = true,
): UseBatchIndicatorsReturn {
  const [data, setData] = useState<IndicatorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled || indicators.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.runIndicatorBatch(indicators);
      setData(Array.isArray(res?.results) ? res.results : []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao carregar indicadores.";
      setError(msg);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(indicators), enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
