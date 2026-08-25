import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Lote 6 (ata 2026-08-24) — Planejador persistente. Antes, plannerColumns/
// plannerCards eram só useState local: nenhuma chamada de API, F5 sempre
// recarregava os 7 cards de exemplo. Este arquivo cobre o hook que
// substituiu isso (usePlannerBoard) — carregamento, CRUD otimista com
// rollback, conflito (409) e a guarda contra clique duplo.

const { apiMock, ApiErrorMock } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiErrorMock,
    apiMock: {
      getPlannerBoard: vi.fn(),
      createPlannerColumn: vi.fn(),
      updatePlannerColumn: vi.fn(),
      reorderPlannerColumns: vi.fn(),
      deletePlannerColumn: vi.fn(),
      createPlannerCard: vi.fn(),
      updatePlannerCard: vi.fn(),
      movePlannerCard: vi.fn(),
      archivePlannerCard: vi.fn(),
      deletePlannerCard: vi.fn(),
      restorePlannerCard: vi.fn(),
    },
  };
});

vi.mock("@/lib/api-client", () => ({
  apiClient: apiMock,
  ApiError: ApiErrorMock,
}));

import { usePlannerBoard } from "@/features/planner/use-planner-board";

function column(overrides: Partial<any> = {}) {
  return { id: "col-1", label: "Backlog", color: "bg-slate-500", position: 0, updatedAt: "2026-08-24T00:00:00.000Z", ...overrides };
}
function card(overrides: Partial<any> = {}) {
  return {
    id: "card-1",
    columnId: "col-1",
    title: "Card",
    description: null,
    priority: "medium",
    dueDate: null,
    projectId: null,
    position: 0,
    archivedAt: null,
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
});

describe("usePlannerBoard — carregamento", () => {
  it("1. começa em 'loading' e vai para 'ready' com os dados do board", async () => {
    const { result } = renderHook(() => usePlannerBoard());
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.columns).toHaveLength(1);
  });

  it("3. erro na carga vai para 'error' com mensagem amigável", async () => {
    apiMock.getPlannerBoard.mockRejectedValueOnce(new ApiErrorMock("Falha ao carregar", 500));
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Falha ao carregar");
  });
});

describe("usePlannerBoard — criar card", () => {
  it("5. criar persiste — card criado aparece na lista local com o que o servidor devolveu", async () => {
    apiMock.createPlannerCard.mockResolvedValue({ card: card({ id: "card-server", title: "Novo" }) });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.createCard({ columnId: "col-1", title: "Novo" });
    });
    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].id).toBe("card-server");
  });

  it("14. clique duplo não duplica — segunda chamada concorrente é ignorada", async () => {
    let resolveCreate: (v: any) => void = () => {};
    apiMock.createPlannerCard.mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve; }),
    );
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let firstCall: Promise<any>;
    let secondResult: any;
    await act(async () => {
      firstCall = result.current.createCard({ columnId: "col-1", title: "Um" });
      secondResult = await result.current.createCard({ columnId: "col-1", title: "Um de novo" });
      resolveCreate({ card: card({ id: "card-server" }) });
      await firstCall;
    });
    expect(secondResult).toBeNull();
    expect(apiMock.createPlannerCard).toHaveBeenCalledTimes(1);
  });
});

describe("usePlannerBoard — editar card", () => {
  it("7. editar persiste e mantém o que o servidor devolveu", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.updatePlannerCard.mockResolvedValue({ card: card({ title: "Editado" }) });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.updateCard("card-1", { title: "Editado" });
    });
    expect(mutation.ok).toBe(true);
    expect(result.current.cards[0].title).toBe("Editado");
  });

  it("erro na edição reverte pro estado anterior (rollback) e não perde o card", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card({ title: "Original" })] });
    apiMock.updatePlannerCard.mockRejectedValue(new ApiErrorMock("Falha ao salvar", 500));
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.updateCard("card-1", { title: "Tentativa" });
    });
    expect(mutation.ok).toBe(false);
    expect(result.current.cards[0].title).toBe("Original");
  });

  it("12. conflito (409) marca conflict:true na resposta", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.updatePlannerCard.mockRejectedValue(new ApiErrorMock("Conflito", 409));
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.updateCard("card-1", { title: "x" });
    });
    expect(mutation.ok).toBe(false);
    expect(mutation.conflict).toBe(true);
  });
});

describe("usePlannerBoard — mover card", () => {
  it("8. mover persiste — columnId final é o que o servidor devolveu", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({
      columns: [column(), column({ id: "col-2", label: "Fazendo" })],
      cards: [card()],
    });
    apiMock.movePlannerCard.mockResolvedValue({ card: card({ columnId: "col-2", position: 0 }) });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.moveCard("card-1", "col-2", 0);
    });
    expect(mutation.ok).toBe(true);
    expect(result.current.cards.find((c) => c.id === "card-1")?.columnId).toBe("col-2");
  });

  it("9. reordenar dentro da mesma coluna reflete a posição devolvida pelo servidor", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({
      columns: [column()],
      cards: [card({ id: "c1", position: 0 }), card({ id: "c2", position: 1 })],
    });
    apiMock.movePlannerCard.mockResolvedValue({ card: card({ id: "c2", columnId: "col-1", position: 0 }) });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.moveCard("c2", "col-1", 0);
    });
    expect(result.current.cards.find((c) => c.id === "c2")?.position).toBe(0);
  });
});

describe("usePlannerBoard — arquivar card (reversível)", () => {
  it("sucesso arquiva (chama archivePlannerCard) e remove o card da lista ativa", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.archivePlannerCard.mockResolvedValue({ ok: true, card: card({ archivedAt: "2026-08-24T00:00:00.000Z" }) });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.archiveCard("card-1");
    });
    expect(mutation.ok).toBe(true);
    expect(result.current.cards).toHaveLength(0);
    expect(apiMock.archivePlannerCard).toHaveBeenCalledWith("card-1");
    expect(apiMock.deletePlannerCard).not.toHaveBeenCalled();
  });

  it("erro ao arquivar mantém o card visível (rollback)", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.archivePlannerCard.mockRejectedValue(new ApiErrorMock("Sem permissão", 403));
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.archiveCard("card-1");
    });
    expect(mutation.ok).toBe(false);
    expect(result.current.cards).toHaveLength(1);
  });
});

describe("usePlannerBoard — excluir card definitivamente (irreversível)", () => {
  it("sucesso chama deletePlannerCard (nunca archivePlannerCard) e remove o card da lista", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.deletePlannerCard.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.deleteCardPermanently("card-1");
    });
    expect(mutation.ok).toBe(true);
    expect(result.current.cards).toHaveLength(0);
    expect(apiMock.deletePlannerCard).toHaveBeenCalledWith("card-1");
    expect(apiMock.archivePlannerCard).not.toHaveBeenCalled();
  });

  it("erro ao excluir mantém o card visível (rollback)", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.deletePlannerCard.mockRejectedValue(new ApiErrorMock("Sem permissão", 403));
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.deleteCardPermanently("card-1");
    });
    expect(mutation.ok).toBe(false);
    expect(result.current.cards).toHaveLength(1);
  });

  it("clique duplo (chamada concorrente pro mesmo id) só chama a API uma vez", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    let resolveDelete: (v: any) => void = () => {};
    apiMock.deletePlannerCard.mockImplementation(() => new Promise((resolve) => { resolveDelete = resolve; }));
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let firstCall: Promise<any>;
    let secondResult: any;
    await act(async () => {
      firstCall = result.current.deleteCardPermanently("card-1");
      secondResult = await result.current.deleteCardPermanently("card-1");
      resolveDelete({ ok: true });
      await firstCall;
    });
    expect(secondResult.ok).toBe(false);
    expect(apiMock.deletePlannerCard).toHaveBeenCalledTimes(1);
  });
});

describe("usePlannerBoard — restaurar card", () => {
  it("restaurar card arquivado adiciona de volta à lista", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    apiMock.restorePlannerCard.mockResolvedValue({ ok: true, card: card({ archivedAt: null }) });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.restoreCard("card-1");
    });
    expect(result.current.cards).toHaveLength(1);
  });
});

describe("usePlannerBoard — colunas", () => {
  it("excluir coluna com conflito (409) reverte a remoção otimista", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    apiMock.deletePlannerColumn.mockRejectedValue(new ApiErrorMock("Coluna tem cards", 409));
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    let mutation: any;
    await act(async () => {
      mutation = await result.current.deleteColumn("col-1");
    });
    expect(mutation.ok).toBe(false);
    expect(result.current.columns).toHaveLength(1);
  });

  it("reordenar colunas persiste a ordem devolvida pelo servidor", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({
      columns: [column({ id: "a", position: 0 }), column({ id: "b", position: 1 })],
      cards: [],
    });
    apiMock.reorderPlannerColumns.mockResolvedValue({
      columns: [column({ id: "b", position: 0 }), column({ id: "a", position: 1 })],
    });
    const { result } = renderHook(() => usePlannerBoard());
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await act(async () => {
      await result.current.reorderColumns(["b", "a"]);
    });
    expect(result.current.columns.map((c) => c.id)).toEqual(["b", "a"]);
  });
});
