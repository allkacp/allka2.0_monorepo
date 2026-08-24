// Estado + persistência do Planejador (Admin → Projetos → Planejador).
// Extraído de admin/projetos/page.tsx (lote 6, ata 2026-08-24) — antes,
// plannerColumns/plannerCards eram só useState local, sem nenhuma chamada
// de API: F5 sempre recarregava os 7 cartões de exemplo hardcoded, criar/
// editar/mover/remover nunca chegava ao backend. Esta versão carrega do
// backend real (GET /api/planner/board) e cada ação chama o endpoint
// correspondente, com atualização otimista + rollback em caso de erro.
import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiError, type PlannerCard, type PlannerColumn } from "@/lib/api-client";

export type PlannerPriority = PlannerCard["priority"];

export type PlannerBoardStatus = "loading" | "error" | "ready";

export interface CreateCardInput {
  columnId: string;
  title: string;
  description?: string;
  priority?: PlannerPriority;
  dueDate?: string | null;
  projectId?: string | null;
}

export interface UpdateCardInput {
  title?: string;
  description?: string | null;
  priority?: PlannerPriority;
  dueDate?: string | null;
  projectId?: string | null;
}

// `error`/`conflict` opcionais mesmo em `ok: false` (em vez de union
// discriminada estrita) — this repo builds with `strict: false`, e o
// narrowing de union discriminada via `if (!result.ok)` não é confiável
// nesse modo; manter os campos sempre presentes no shape evita depender
// dele.
export type MutationResult = { ok: boolean; error?: string; conflict?: boolean };

function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  return fallback;
}

export function usePlannerBoard() {
  const [status, setStatus] = useState<PlannerBoardStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<PlannerColumn[]>([]);
  const [cards, setCards] = useState<PlannerCard[]>([]);
  // Guarda contra clique duplo/duplo-submit — uma criação por vez.
  const creatingRef = useRef(false);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const { columns: c, cards: k } = await apiClient.getPlannerBoard();
      setColumns(c);
      setCards(k);
      setStatus("ready");
    } catch (err) {
      setError(friendlyError(err, "Não foi possível carregar o Planejador."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createColumn = useCallback(async (input: { label: string; color?: string }) => {
    const { column } = await apiClient.createPlannerColumn(input);
    setColumns((prev) => [...prev, column]);
    return column;
  }, []);

  const updateColumn = useCallback(async (id: string, input: { label?: string; color?: string }) => {
    const previous = columns;
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
    try {
      const { column } = await apiClient.updatePlannerColumn(id, input);
      setColumns((prev) => prev.map((c) => (c.id === id ? column : c)));
    } catch (err) {
      setColumns(previous);
      throw err;
    }
  }, [columns]);

  const deleteColumn = useCallback(async (id: string): Promise<MutationResult> => {
    const previousColumns = columns;
    setColumns((prev) => prev.filter((c) => c.id !== id));
    try {
      await apiClient.deletePlannerColumn(id);
      return { ok: true };
    } catch (err) {
      setColumns(previousColumns);
      return { ok: false, error: friendlyError(err, "Não foi possível excluir a coluna.") };
    }
  }, [columns]);

  const reorderColumns = useCallback(async (orderedIds: string[]): Promise<MutationResult> => {
    const previous = columns;
    setColumns((prev) =>
      orderedIds
        .map((id, index) => {
          const found = prev.find((c) => c.id === id);
          return found ? { ...found, position: index } : null;
        })
        .filter((c): c is PlannerColumn => c !== null),
    );
    try {
      const { columns: updated } = await apiClient.reorderPlannerColumns(orderedIds);
      setColumns(updated);
      return { ok: true };
    } catch (err) {
      setColumns(previous);
      return { ok: false, error: friendlyError(err, "Não foi possível reordenar as colunas.") };
    }
  }, [columns]);

  const createCard = useCallback(async (input: CreateCardInput): Promise<PlannerCard | null> => {
    if (creatingRef.current) return null;
    creatingRef.current = true;
    try {
      const { card } = await apiClient.createPlannerCard(input);
      setCards((prev) => [...prev, card]);
      return card;
    } finally {
      creatingRef.current = false;
    }
  }, []);

  const updateCard = useCallback(
    async (id: string, input: UpdateCardInput): Promise<MutationResult> => {
      const previous = cards;
      const current = cards.find((c) => c.id === id);
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...input } : c)));
      try {
        const { card } = await apiClient.updatePlannerCard(id, { ...input, updatedAt: current?.updatedAt });
        setCards((prev) => prev.map((c) => (c.id === id ? card : c)));
        return { ok: true };
      } catch (err) {
        setCards(previous);
        const conflict = err instanceof ApiError && err.status === 409;
        return {
          ok: false,
          error: friendlyError(err, "Não foi possível salvar as alterações."),
          conflict,
        };
      }
    },
    [cards],
  );

  const moveCard = useCallback(
    async (id: string, columnId: string, position: number): Promise<MutationResult> => {
      const previous = cards;
      const current = cards.find((c) => c.id === id);
      if (!current) return { ok: false, error: "Card não encontrado." };

      // Reordenação otimista local (mesma regra do dnd-kit arrayMove usado
      // antes): tira o card da lista, recoloca na coluna/posição alvo,
      // reindexa. O servidor é a fonte de verdade final — se der erro,
      // volta pro snapshot anterior.
      setCards((prev) => {
        const withoutCard = prev.filter((c) => c.id !== id);
        const destCards = withoutCard
          .filter((c) => c.columnId === columnId)
          .sort((a, b) => a.position - b.position);
        const clamped = Math.max(0, Math.min(position, destCards.length));
        destCards.splice(clamped, 0, { ...current, columnId });
        const reindexedDest = destCards.map((c, i) => ({ ...c, position: i }));
        const rest = withoutCard.filter((c) => c.columnId !== columnId);
        return [...rest, ...reindexedDest];
      });

      try {
        const { card } = await apiClient.movePlannerCard(id, {
          columnId,
          position,
          updatedAt: current.updatedAt,
        });
        setCards((prev) => prev.map((c) => (c.id === id ? card : c)));
        return { ok: true };
      } catch (err) {
        setCards(previous);
        const conflict = err instanceof ApiError && err.status === 409;
        return {
          ok: false,
          error: friendlyError(err, "Não foi possível mover o card."),
          conflict,
        };
      }
    },
    [cards],
  );

  const removeCard = useCallback(async (id: string): Promise<MutationResult> => {
    const previous = cards;
    setCards((prev) => prev.filter((c) => c.id !== id));
    try {
      await apiClient.deletePlannerCard(id);
      return { ok: true };
    } catch (err) {
      setCards(previous);
      return { ok: false, error: friendlyError(err, "Não foi possível remover o card.") };
    }
  }, [cards]);

  const restoreCard = useCallback(async (id: string): Promise<MutationResult> => {
    try {
      const { card } = await apiClient.restorePlannerCard(id);
      setCards((prev) => [...prev, card]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyError(err, "Não foi possível restaurar o card.") };
    }
  }, []);

  return {
    status,
    error,
    columns,
    cards,
    reload,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    createCard,
    updateCard,
    moveCard,
    removeCard,
    restoreCard,
  };
}

export type UsePlannerBoardResult = ReturnType<typeof usePlannerBoard>;
