import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Lote 6 (ata 2026-08-24) — Planejador persistente. Cobre o componente
// extraído (PlannerBoard) isoladamente, sem montar admin/projetos/page.tsx
// (~6000 linhas, não monta em jsdom por um loop pré-existente do
// @radix-ui/react-compose-refs — ver auditoria). Estados obrigatórios
// (carregando/vazio/erro/sucesso), criação, edição, exclusão com
// confirmação dupla (cancelar/erro/sucesso) e proteção contra clique duplo.

const { apiMock, ApiErrorMock, toastSpy } = vi.hoisted(() => {
  class ApiErrorMock extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    ApiErrorMock,
    toastSpy: vi.fn(),
    apiMock: {
      getPlannerBoard: vi.fn(),
      createPlannerColumn: vi.fn(),
      updatePlannerColumn: vi.fn(),
      reorderPlannerColumns: vi.fn(),
      deletePlannerColumn: vi.fn(),
      createPlannerCard: vi.fn(),
      updatePlannerCard: vi.fn(),
      movePlannerCard: vi.fn(),
      deletePlannerCard: vi.fn(),
      restorePlannerCard: vi.fn(),
      getPlannerArchivedCards: vi.fn(),
    },
  };
});

vi.mock("@/lib/api-client", () => ({
  apiClient: apiMock,
  ApiError: ApiErrorMock,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

import { PlannerBoard } from "@/features/planner/planner-board";
import { SidebarProvider } from "@/contexts/sidebar-context";
import type { FrontendProject } from "@/lib/project-adapter";

const PROJECTS = [{ id: "proj-1", name: "Site institucional" }] as unknown as FrontendProject[];

function renderBoard() {
  return render(
    <SidebarProvider>
      <PlannerBoard projects={PROJECTS} />
    </SidebarProvider>,
  );
}

function column(overrides: Partial<any> = {}) {
  return { id: "col-1", label: "Backlog", color: "bg-slate-500", position: 0, updatedAt: "2026-08-24T00:00:00.000Z", ...overrides };
}
function card(overrides: Partial<any> = {}) {
  return {
    id: "card-1",
    columnId: "col-1",
    title: "Briefing com cliente",
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
  // Contador do botão "Cards arquivados" no cabeçalho — default neutro
  // (0 arquivados) pra não quebrar os testes que não são sobre ele.
  apiMock.getPlannerArchivedCards.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1 });
});

describe("PlannerBoard — estados obrigatórios", () => {
  it("1. carregando — mostra indicador antes dos dados chegarem", async () => {
    let resolveBoard: (v: any) => void = () => {};
    apiMock.getPlannerBoard.mockImplementation(() => new Promise((resolve) => { resolveBoard = resolve; }));
    renderBoard();
    expect(screen.getByText(/carregando planejador/i)).toBeInTheDocument();
    resolveBoard({ columns: [column()], cards: [] });
    await waitFor(() => expect(screen.queryByText(/carregando planejador/i)).not.toBeInTheDocument());
  });

  it("2. vazio — sem cards, mostra estado vazio com ação de criar o primeiro card", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    renderBoard();
    expect(await screen.findByText(/nenhum card ainda/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /criar primeiro card/i })).toBeInTheDocument();
  });

  it("3. erro — mensagem amigável com opção de tentar de novo", async () => {
    apiMock.getPlannerBoard.mockRejectedValue(new ApiErrorMock("Falha ao carregar o quadro", 500));
    renderBoard();
    expect(await screen.findByText("Falha ao carregar o quadro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it("4. sucesso — lista cards e colunas reais vindos do backend", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    renderBoard();
    expect(await screen.findByText("Briefing com cliente")).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
  });
});

describe("PlannerBoard — criar card", () => {
  it("5. criação persiste — card aparece no quadro depois de salvar", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    apiMock.createPlannerCard.mockResolvedValue({ card: card({ id: "card-novo", title: "Ligar pro fornecedor" }) });
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole("button", { name: /criar primeiro card/i }));
    await user.type(screen.getByPlaceholderText(/o que precisa ser feito/i), "Ligar pro fornecedor");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByText("Ligar pro fornecedor")).toBeInTheDocument();
    expect(apiMock.createPlannerCard).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Ligar pro fornecedor", columnId: "col-1" }),
    );
  });

  it("14. clique duplo no Salvar não cria dois cards", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    let resolveCreate: (v: any) => void = () => {};
    apiMock.createPlannerCard.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByRole("button", { name: /criar primeiro card/i }));
    await user.type(screen.getByPlaceholderText(/o que precisa ser feito/i), "Card único");
    const saveBtn = screen.getByRole("button", { name: /salvando|^salvar$/i });
    await user.click(saveBtn);
    await user.click(saveBtn); // segundo clique enquanto a 1ª chamada ainda não respondeu
    resolveCreate({ card: card({ id: "card-1", title: "Card único" }) });

    await waitFor(() => expect(apiMock.createPlannerCard).toHaveBeenCalledTimes(1));
  });
});

describe("PlannerBoard — editar card", () => {
  it("6. edição persiste — abrir pelo título, mudar e salvar reflete no quadro", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.updatePlannerCard.mockResolvedValue({ ok: true, card: card({ title: "Briefing revisado" }) });
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByText("Briefing com cliente"));
    const titleInput = await screen.findByDisplayValue("Briefing com cliente");
    await user.clear(titleInput);
    await user.type(titleInput, "Briefing revisado");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByText("Briefing revisado")).toBeInTheDocument();
  });

  it("15. erro ao editar (ex.: sem permissão) mostra aviso e não perde o card", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.updatePlannerCard.mockRejectedValue(new ApiErrorMock("Seu perfil não permite editar", 403));
    const user = userEvent.setup();
    renderBoard();

    await user.click(await screen.findByText("Briefing com cliente"));
    const titleInput = await screen.findByDisplayValue("Briefing com cliente");
    await user.clear(titleInput);
    await user.type(titleInput, "Tentativa sem permissão");
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    expect(await screen.findByText("Briefing com cliente")).toBeInTheDocument();
  });
});

describe("PlannerBoard — remover card (confirmação dupla)", () => {
  it("9/10. confirmação dupla — abrir não remove; cancelar não remove", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    const user = userEvent.setup();
    renderBoard();

    await screen.findByText("Briefing com cliente");
    await user.click(screen.getByRole("button", { name: /remover card/i }));
    expect(await screen.findByText(/remover card/i)).toBeInTheDocument();
    expect(apiMock.deletePlannerCard).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    await waitFor(() => expect(screen.queryByRole("button", { name: /remover este card/i })).not.toBeInTheDocument());
    expect(screen.getByText("Briefing com cliente")).toBeInTheDocument();
    expect(apiMock.deletePlannerCard).not.toHaveBeenCalled();
  });

  it("11. erro na remoção mantém o card visível", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.deletePlannerCard.mockRejectedValue(new ApiErrorMock("Não foi possível remover", 500));
    const user = userEvent.setup();
    renderBoard();

    await screen.findByText("Briefing com cliente");
    await user.click(screen.getByRole("button", { name: /remover card/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /remover este card/i }));

    // O card continua no quadro (a mensagem de erro do ConfirmationDialog
    // também repete o nome do card, por isso findAllByText).
    await waitFor(() => expect(screen.getAllByText("Briefing com cliente").length).toBeGreaterThan(0));
    expect(apiMock.deletePlannerCard).toHaveBeenCalled();
  });

  it("12. sucesso remove o card do quadro", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [card()] });
    apiMock.deletePlannerCard.mockResolvedValue({ ok: true, card: card({ archivedAt: "2026-08-24T00:00:00.000Z" }) });
    const user = userEvent.setup();
    renderBoard();

    await screen.findByText("Briefing com cliente");
    await user.click(screen.getByRole("button", { name: /remover card/i }));
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /remover este card/i }));

    await waitFor(() => expect(screen.queryByText("Briefing com cliente")).not.toBeInTheDocument());
    expect(apiMock.deletePlannerCard).toHaveBeenCalledWith("card-1");
  });
});

describe("PlannerBoard — botão e contador de Cards arquivados", () => {
  it("1. botão aparece sem número quando não há arquivados", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    apiMock.getPlannerArchivedCards.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1 });
    renderBoard();
    const btn = await screen.findByRole("button", { name: /cards arquivados/i });
    expect(btn.textContent).not.toMatch(/\(\d+\)/);
  });

  it("1. contador mostra a quantidade quando há arquivados", async () => {
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    apiMock.getPlannerArchivedCards.mockResolvedValue({ data: [], total: 3, page: 1, limit: 1 });
    renderBoard();
    await waitFor(async () => {
      const btn = await screen.findByRole("button", { name: /cards arquivados/i });
      expect(btn.textContent).toContain("(3)");
    });
  });
});

describe("PlannerBoard — painel de Cards arquivados", () => {
  function archivedCard(overrides: Partial<any> = {}) {
    return {
      id: "arch-1",
      columnId: "col-1",
      columnLabel: "Backlog",
      title: "Card arquivado de teste",
      description: "Descrição resumida",
      priority: "medium",
      dueDate: null,
      projectId: null,
      position: 0,
      archivedAt: "2026-08-20T12:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-20T12:00:00.000Z",
      ...overrides,
    };
  }

  async function openPanel() {
    const user = userEvent.setup();
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });
    renderBoard();
    await user.click(await screen.findByRole("button", { name: /cards arquivados/i }));
    return user;
  }

  it("2/3. estado vazio e carregamento", async () => {
    let resolveList: (v: any) => void = () => {};
    apiMock.getPlannerArchivedCards
      .mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 1 }) // contador do cabeçalho
      .mockImplementationOnce(() => new Promise((resolve) => { resolveList = resolve; }));
    const user = await openPanel();
    expect(screen.getByText(/carregando cards arquivados/i)).toBeInTheDocument();
    resolveList({ data: [], total: 0, page: 1, limit: 10 });
    expect(await screen.findByText(/nenhum card arquivado/i)).toBeInTheDocument();
  });

  it("4. erro amigável, nunca a mensagem técnica bruta", async () => {
    apiMock.getPlannerArchivedCards
      .mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 1 })
      .mockRejectedValueOnce(new ApiErrorMock("Não foi possível carregar os cards arquivados.", 500));
    await openPanel();
    expect(await screen.findByText("Não foi possível carregar os cards arquivados.")).toBeInTheDocument();
  });

  it("5/6/7. listagem mostra título, descrição resumida e data legível", async () => {
    apiMock.getPlannerArchivedCards
      .mockResolvedValueOnce({ data: [], total: 1, page: 1, limit: 1 })
      .mockResolvedValueOnce({ data: [archivedCard()], total: 1, page: 1, limit: 10 });
    await openPanel();
    expect(await screen.findByText("Card arquivado de teste")).toBeInTheDocument();
    expect(screen.getByText("Descrição resumida")).toBeInTheDocument();
    expect(screen.getByText(/coluna: backlog/i)).toBeInTheDocument();
    expect(screen.getByText(/ago\.? de 2026|20 ago/i)).toBeInTheDocument();
  });

  it("13. coluna removida mostra aviso em vez de travar", async () => {
    apiMock.getPlannerArchivedCards
      .mockResolvedValueOnce({ data: [], total: 1, page: 1, limit: 1 })
      .mockResolvedValueOnce({ data: [archivedCard({ columnLabel: null })], total: 1, page: 1, limit: 10 });
    await openPanel();
    expect(await screen.findByText(/coluna removida/i)).toBeInTheDocument();
  });

  it("8/11/12. restaurar remove da lista de arquivados, volta ao quadro e avisa quando usou fallback", async () => {
    apiMock.getPlannerArchivedCards
      .mockResolvedValueOnce({ data: [], total: 1, page: 1, limit: 1 })
      .mockResolvedValueOnce({ data: [archivedCard()], total: 1, page: 1, limit: 10 });
    apiMock.restorePlannerCard.mockResolvedValue({
      ok: true,
      card: { ...archivedCard(), archivedAt: null },
      usedFallbackColumn: true,
    });
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });

    const user = await openPanel();
    await screen.findByText("Card arquivado de teste");
    await user.click(screen.getByRole("button", { name: /^restaurar$/i }));

    await waitFor(() => expect(screen.queryByText("Card arquivado de teste")).not.toBeInTheDocument());
    expect(apiMock.restorePlannerCard).toHaveBeenCalledWith("arch-1");
    expect(apiMock.getPlannerBoard).toHaveBeenCalled(); // board.reload() após restaurar
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ description: expect.stringMatching(/backlog/i) }),
      ),
    );
  });

  it("9/10. clique duplo em Restaurar chama a API só uma vez", async () => {
    apiMock.getPlannerArchivedCards
      .mockResolvedValueOnce({ data: [], total: 1, page: 1, limit: 1 })
      .mockResolvedValueOnce({ data: [archivedCard()], total: 1, page: 1, limit: 10 });
    let resolveRestore: (v: any) => void = () => {};
    apiMock.restorePlannerCard.mockImplementation(() => new Promise((resolve) => { resolveRestore = resolve; }));
    apiMock.getPlannerBoard.mockResolvedValue({ columns: [column()], cards: [] });

    const user = await openPanel();
    await screen.findByText("Card arquivado de teste");
    const restoreBtn = screen.getByRole("button", { name: /^restaurar$/i });
    await user.click(restoreBtn);
    expect(await screen.findByText(/restaurando/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /restaurando/i })).catch(() => {});
    resolveRestore({ ok: true, card: { ...archivedCard(), archivedAt: null }, usedFallbackColumn: false });

    await waitFor(() => expect(apiMock.restorePlannerCard).toHaveBeenCalledTimes(1));
  });
});
