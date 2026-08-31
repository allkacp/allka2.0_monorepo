import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// Item seguinte ao lote de persistência do Planejador (ata 2026-08-24) —
// "Cards arquivados". Cobre o hook de listagem paginada + restauração.

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
      getPlannerArchivedCards: vi.fn(),
      restorePlannerCard: vi.fn(),
    },
  };
});

vi.mock("@/lib/api-client", () => ({
  apiClient: apiMock,
  ApiError: ApiErrorMock,
}));

import { usePlannerArchivedCards } from "@/features/planner/use-planner-archived-cards";

function archivedCard(overrides: Partial<any> = {}) {
  return {
    id: "card-1",
    columnId: "col-1",
    columnLabel: "Backlog",
    title: "Card arquivado",
    description: null,
    priority: "medium",
    dueDate: null,
    projectId: null,
    position: 0,
    archivedAt: "2026-08-24T00:00:00.000Z",
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlannerArchivedCards", () => {
  it("carrega a página pedida e preenche total/page", async () => {
    apiMock.getPlannerArchivedCards.mockResolvedValue({ data: [archivedCard()], total: 1, page: 1, limit: 10 });
    const { result } = renderHook(() => usePlannerArchivedCards());
    await act(async () => {
      await result.current.load(1);
    });
    expect(result.current.status).toBe("ready");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("erro de carregamento vira mensagem amigável, nunca o erro técnico bruto", async () => {
    apiMock.getPlannerArchivedCards.mockRejectedValue(new ApiErrorMock("Falha ao listar arquivados", 500));
    const { result } = renderHook(() => usePlannerArchivedCards());
    await act(async () => {
      await result.current.load(1);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Falha ao listar arquivados");
  });

  it("página que fica vazia depois de restaurar o único item volta pra anterior automaticamente", async () => {
    apiMock.getPlannerArchivedCards.mockImplementation((page: number) => {
      if (page === 2) return Promise.resolve({ data: [], total: 5, page: 2, limit: 5 });
      return Promise.resolve({ data: [archivedCard()], total: 5, page: 1, limit: 5 });
    });
    const { result } = renderHook(() => usePlannerArchivedCards());
    await act(async () => {
      await result.current.load(2);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.data).toHaveLength(1);
  });

  it("restaurar remove o card da lista local e decrementa o total", async () => {
    apiMock.getPlannerArchivedCards.mockResolvedValue({ data: [archivedCard()], total: 1, page: 1, limit: 10 });
    apiMock.restorePlannerCard.mockResolvedValue({ ok: true, card: { id: "card-1" }, usedFallbackColumn: false });
    const { result } = renderHook(() => usePlannerArchivedCards());
    await act(async () => {
      await result.current.load(1);
    });

    let restoreResult: any;
    await act(async () => {
      restoreResult = await result.current.restore("card-1");
    });
    expect(restoreResult.ok).toBe(true);
    expect(result.current.data).toHaveLength(0);
    expect(result.current.total).toBe(0);
  });

  it("restauração já em andamento pro mesmo card ignora uma segunda chamada concorrente (clique duplo)", async () => {
    apiMock.getPlannerArchivedCards.mockResolvedValue({ data: [archivedCard()], total: 1, page: 1, limit: 10 });
    let resolveRestore: (v: any) => void = () => {};
    apiMock.restorePlannerCard.mockImplementation(() => new Promise((resolve) => { resolveRestore = resolve; }));
    const { result } = renderHook(() => usePlannerArchivedCards());
    await act(async () => {
      await result.current.load(1);
    });

    let firstCall: Promise<any>;
    let secondResult: any;
    await act(async () => {
      firstCall = result.current.restore("card-1");
      secondResult = await result.current.restore("card-1");
      resolveRestore({ ok: true, card: { id: "card-1" }, usedFallbackColumn: false });
      await firstCall;
    });
    expect(secondResult.ok).toBe(false);
    expect(apiMock.restorePlannerCard).toHaveBeenCalledTimes(1);
  });

  it("erro ao restaurar mantém o card na lista de arquivados", async () => {
    apiMock.getPlannerArchivedCards.mockResolvedValue({ data: [archivedCard()], total: 1, page: 1, limit: 10 });
    apiMock.restorePlannerCard.mockRejectedValue(new ApiErrorMock("Não foi possível restaurar", 500));
    const { result } = renderHook(() => usePlannerArchivedCards());
    await act(async () => {
      await result.current.load(1);
    });

    let restoreResult: any;
    await act(async () => {
      restoreResult = await result.current.restore("card-1");
    });
    expect(restoreResult.ok).toBe(false);
    expect(result.current.data).toHaveLength(1);
  });
});
