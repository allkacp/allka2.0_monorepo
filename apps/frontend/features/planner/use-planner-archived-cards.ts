// Estado + paginação da lista de "Cards arquivados" do Planejador (item
// seguinte ao lote de persistência — ata 2026-08-24). Hook separado de
// usePlannerBoard: listar arquivados é uma tela própria, paginada, com o
// próprio ciclo de carregando/vazio/erro — só a AÇÃO de restaurar precisa
// "vazar" pro board ativo (o chamador injeta o card restaurado lá).
import { useCallback, useRef, useState } from "react";
import { apiClient, ApiError, type PlannerArchivedCard, type PlannerCard } from "@/lib/api-client";

const PAGE_SIZE = 10;

export type ArchivedListStatus = "loading" | "error" | "ready";

export type RestoreResult =
  | { ok: true; card: PlannerCard; usedFallbackColumn: boolean }
  | { ok: false; error: string };

function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  return fallback;
}

export function usePlannerArchivedCards() {
  const [status, setStatus] = useState<ArchivedListStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlannerArchivedCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // Restauração em andamento, por card — evita clique duplo no mesmo item
  // sem travar os outros cards da lista. Guarda de verdade é o ref (síncrono,
  // sem o atraso de um re-render do useState) — o Set em state é só pra UI
  // (spinner/"Restaurando…"), nunca usado pra decidir se chama a API de novo.
  const restoringRef = useRef<Set<string>>(new Set());
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (targetPage: number) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await apiClient.getPlannerArchivedCards(targetPage, PAGE_SIZE);
      // Página que ficou vazia (ex.: depois de restaurar o único item da
      // última página) volta pra anterior automaticamente, nunca fica
      // presa numa tela em branco com itens só numa página anterior.
      if (res.data.length === 0 && targetPage > 1) {
        const prevPage = targetPage - 1;
        const retry = await apiClient.getPlannerArchivedCards(prevPage, PAGE_SIZE);
        setData(retry.data);
        setTotal(retry.total);
        setPage(prevPage);
        setStatus("ready");
        return;
      }
      setData(res.data);
      setTotal(res.total);
      setPage(res.page);
      setStatus("ready");
    } catch (err) {
      setError(friendlyError(err, "Não foi possível carregar os cards arquivados."));
      setStatus("error");
    }
  }, []);

  const restore = useCallback(async (id: string): Promise<RestoreResult> => {
    if (restoringRef.current.has(id)) return { ok: false, error: "Restauração já em andamento." };
    restoringRef.current.add(id);
    setRestoringIds(new Set(restoringRef.current));
    try {
      const res = await apiClient.restorePlannerCard(id);
      setData((prev) => prev.filter((c) => c.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      return { ok: true, card: res.card, usedFallbackColumn: res.usedFallbackColumn };
    } catch (err) {
      return { ok: false, error: friendlyError(err, "Não foi possível restaurar o card.") };
    } finally {
      restoringRef.current.delete(id);
      setRestoringIds(new Set(restoringRef.current));
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    status,
    error,
    data,
    total,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
    load,
    restore,
    isRestoring: (id: string) => restoringIds.has(id),
  };
}

export type UsePlannerArchivedCardsResult = ReturnType<typeof usePlannerArchivedCards>;
