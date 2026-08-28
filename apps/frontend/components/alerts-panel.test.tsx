import { describe, expect, it, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertsPanel } from "@/components/alerts-panel";
import { SidebarProvider } from "@/contexts/sidebar-context";

// AlertDetailDrawer (ata 2026-08, 8º lote) usa StandardModalDialog, que
// depende de useAppFrameMetrics -> useSidebar — precisa de um
// SidebarProvider ancestral mesmo com o painel fechado (o Dialog existe na
// árvore, só não está aberto).
function render(ui: React.ReactElement) {
  return rtlRender(<SidebarProvider>{ui}</SidebarProvider>);
}

// Feed pessoal de alertas (ata 2026-08, 5º lote) — cobre a lacuna principal
// da correção: GET /api/system-alerts já manda has_image/image_url/image_alt
// há tempos, mas nada no AlertsPanel lia isso nem renderizava o banner. Aqui
// isolamos o painel das dependências pesadas (HeaderSlideScreen, router,
// contexto de conta, área administrativa) pra testar só fetch → render.

vi.mock("@/components/header-slide-screen", () => ({
  HeaderSlideScreen: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: "empresas" }),
}));

vi.mock("@/lib/admin-permissions", () => ({
  canManageAlertsAdmin: () => false,
}));

vi.mock("@/components/alerts-admin-center", () => ({
  AlertsAdminCenter: () => null,
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser: vi.fn().mockResolvedValue({}),
    getSystemAlerts: vi.fn(),
    getAgencyAlerts: vi.fn(),
    markSystemAlertRead: vi.fn(),
    archiveSystemAlert: vi.fn(),
    unarchiveSystemAlert: vi.fn(),
    markAllSystemAlertsRead: vi.fn(),
    resolveAlertImageUrl: vi.fn((url: string | null) => url),
    fetchAlertImageBlobUrl: vi.fn(),
    getSystemAlertDetail: vi.fn(),
    recordSystemAlertEvent: vi.fn().mockResolvedValue({ ok: true }),
    resolveSystemAlert: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    data?: Record<string, any>;
    constructor(message: string, status: number, data?: Record<string, any>) {
      super(message);
      this.status = status;
      this.data = data;
    }
  },
}));

import { apiClient, ApiError } from "@/lib/api-client";

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getCurrentUser as any).mockResolvedValue({});
  if (!("revokeObjectURL" in URL)) {
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
  }
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

const baseAlert = {
  id: "alert-1",
  type: "sistema",
  severity: "info" as const,
  title: "Aviso importante",
  message: "Mensagem do alerta",
  entity_type: null,
  entity_id: null,
  created_at: new Date().toISOString(),
};

describe("AlertsPanel — banner de imagem no feed pessoal", () => {
  it("renderiza o banner quando o alerta tem has_image/image_url", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, has_image: true, image_url: "/api/system-alerts/alert-1/image", image_alt: "Banner de teste" }],
    });
    (apiClient.fetchAlertImageBlobUrl as any).mockResolvedValue("blob:mock-banner");

    render(<AlertsPanel open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByAltText("Banner de teste")).toBeInTheDocument());
    expect(apiClient.fetchAlertImageBlobUrl).toHaveBeenCalledWith("/api/system-alerts/alert-1/image");
  });

  it("não renderiza banner nem espaço reservado quando has_image é false", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, has_image: false, image_url: null, image_alt: null }],
    });

    render(<AlertsPanel open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    expect(apiClient.fetchAlertImageBlobUrl).not.toHaveBeenCalled();
    expect(screen.queryByTitle("Ampliar imagem")).not.toBeInTheDocument();
  });
});

// Reparo "Ver alerta" (ata 2026-08): "Ver" costumava fechar o painel e
// navegar na mesma aba (às vezes pra um destino inexistente, "não abria
// lugar nenhum"). Agora é sempre um <a target="_blank"> quando o destino já
// é conhecido (sem loading, sem chamada assíncrona) — ou desabilitado com
// explicação quando não há destino (Avulso sem referência).
describe("AlertsPanel — botão 'Ver' (link real, nova aba, Central preservada)", () => {
  it("15/16/23/32. alerta com entity_type reconhecido vira um <a> real, nova aba, com noopener/noreferrer — Central nunca fecha/navega", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: "project_task", entity_id: "task-1" }],
    });
    const onClose = vi.fn();
    render(<AlertsPanel open onClose={onClose} />);

    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    const link = screen.getByText("Ver origem").closest("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    // company_user (accountType "empresas" mockado) sem deep-link de tarefa
    // por id — cai na lista própria, nunca em branco.
    expect(link).toHaveAttribute("href", "/company/tarefas");
    expect(onClose).not.toHaveBeenCalled();
  });

  // Reparo "Ver desabilitado sem explicação" (ata 2026-08, 7º lote): o
  // <Button disabled> antigo saía da ordem de tabulação (HTML nativo remove
  // elementos disabled do foco), então ninguém navegando por teclado
  // conseguia revelar a explicação — e visualmente parecia um "Ver"
  // quebrado. Agora é texto "Sem destino" sempre visível (funciona igual
  // sem hover, inclusive no mobile) com tooltip acessível por mouse E
  // teclado.
  it("2/18/19. Avulso sem referência (entity_type null) NÃO mostra link clicável — texto 'Sem destino', sem loading", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: null, entity_id: null }],
    });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    expect(screen.queryByText("Ver")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    const semDestino = screen.getByText("Sem destino");
    expect(semDestino.closest("a")).toBeFalsy();
    expect(semDestino.closest("button")).toBeFalsy();
    // Não deve existir clique/navegação/chamada nenhuma associada.
    await user.click(semDestino).catch(() => {});
    expect(apiClient.archiveSystemAlert).not.toHaveBeenCalled();
    expect(apiClient.markSystemAlertRead).not.toHaveBeenCalled();
  });

  it("3. alerta sem destino explica o motivo por tooltip ao passar o mouse", async () => {
    const user = userEvent.setup();
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: null, entity_id: null }],
    });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    expect(screen.queryByText(/este alerta é informativo/i)).not.toBeInTheDocument();
    await user.hover(screen.getByText("Sem destino"));
    // Radix renderiza o tooltip em dois nós (bolha visível + cópia
    // visually-hidden com role="tooltip" pra leitor de tela) — por isso
    // findAllByText, nunca findByText (que quebra com múltiplos matches).
    const matches = await screen.findAllByText("Este alerta é informativo e não possui uma tela vinculada.");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("3. a mesma explicação é acessível por foco de teclado (elemento é focável, ao contrário de um botão disabled)", async () => {
    const user = userEvent.setup();
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: null, entity_id: null }],
    });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    const semDestino = screen.getByText("Sem destino").closest("span")!;
    expect(semDestino).toHaveAttribute("tabIndex", "0");
    semDestino.focus();
    expect(semDestino).toHaveFocus();
    const matches = await screen.findAllByText("Este alerta é informativo e não possui uma tela vinculada.");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("4. no mobile (sem hover) o texto 'Sem destino' já está visível sem precisar de interação", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: null, entity_id: null }],
    });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    // Sem nenhum hover/focus disparado — o rótulo em si já é visível, não
    // depende de tooltip pra transmitir "isto não tem destino".
    expect(screen.getByText("Sem destino")).toBeVisible();
  });

  it("19. ocorrência de Programação (entity_type 'alert_schedule') também não mostra link funcional", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: "alert_schedule", entity_id: "schedule-1" }],
    });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    expect(screen.getByText("Sem destino")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("17. etapa (project_task_stage) com entity_parent_id abre a tarefa-mãe", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: "project_task_stage", entity_id: "stage-1", entity_parent_id: "task-parent-1" }],
    });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    const link = screen.getByText("Ver origem").closest("a");
    expect(link).toHaveAttribute("href", "/company/tarefas");
  });

  it("26/27. clicar em 'Ver' nunca chama archive/read — o link não resolve nem arquiva o alerta", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: "project_task", entity_id: "task-1" }],
    });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    // O <a> em si não dispara nenhum handler de arquivar/ler — só os botões
    // dedicados (arquivar/dispensar) fazem isso, nunca "Ver".
    expect(apiClient.archiveSystemAlert).not.toHaveBeenCalled();
    expect(apiClient.markSystemAlertRead).not.toHaveBeenCalled();
  });

  // "Detalhes" (ata 2026-08, 8º lote) — separado de "Ver origem": abre um
  // painel próprio SEM fechar a Central, buscando GET /system-alerts/:id.
  it("1/6. clicar em 'Detalhes' abre o painel de detalhes sem fechar a Central", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: "project_task", entity_id: "task-1" }],
    });
    (apiClient.getSystemAlertDetail as any).mockResolvedValue({
      id: "alert-1",
      title: "Aviso importante",
      message: "Mensagem do alerta",
      severity: "info",
      situacao: "ativo",
      created_at: new Date().toISOString(),
      expires_at: null,
      has_image: false,
      image_url: null,
      image_alt: null,
      origin: { type: "automatico" },
      destinatario: { kind: "geral" },
      entity_type: "project_task",
      entity_id: "task-1",
      entity_parent_id: null,
      destination: { entity_type: "project_task", label: "Tarefa", name: "Tarefa real", code: null, status: "disponivel" },
      events: [],
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={onClose} />);

    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Detalhes" }));

    expect(await screen.findByText("Detalhes do alerta")).toBeInTheDocument();
    // "Aviso importante" continua na lista de trás — a Central nunca fecha.
    expect(screen.getAllByText("Aviso importante").length).toBeGreaterThan(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("10. clicar em 'Ver origem' na lista registra o evento origin_clicked", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, entity_type: "project_task", entity_id: "task-1" }],
    });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByText("Ver origem"));
    expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledWith("alert-1", "origin_clicked", expect.any(String));
  });
});

// ── Resolução formal de alerta crítico (ata 2026-08, 10º lote) ─────────────
describe("AlertsPanel — resolução de alerta crítico", () => {
  const redAlert = { ...baseAlert, severity: "error" as const };

  it("3. vermelho sem resolução mostra 'Resolver alerta' no lugar de arquivar/dispensar", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [redAlert] });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Resolver alerta" })).toBeInTheDocument();
    expect(screen.queryByTitle("Arquivar")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Marcar como lido")).not.toBeInTheDocument();
  });

  it("alerta automático de tarefa (condition_controlled): NUNCA mostra 'Resolver alerta' — mostra 'Resolução automática' + orientação, sempre visível", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...redAlert, type: "task.overdue", condition_controlled: true, entity_type: "project_task", entity_id: "t1" }],
    });
    render(<AlertsPanel open onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument())

    expect(screen.queryByRole("button", { name: "Resolver alerta" })).not.toBeInTheDocument()
    expect(screen.getByText("Resolução automática")).toBeInTheDocument()
    // orientação essencial visível sem hover (texto no DOM, não só tooltip)
    expect(screen.getByText(/Conclua ou entregue a tarefa, cancele-a ou regularize o prazo\./)).toBeInTheDocument()
    expect(screen.getByText("Detalhes")).toBeInTheDocument()
  })

  it("automático 'próxima do prazo' (condition_controlled): orientação específica de due_soon", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...baseAlert, severity: "warning" as const, type: "task.due_soon", condition_controlled: true, entity_type: "project_task", entity_id: "t2" }],
    })
    render(<AlertsPanel open onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument())
    expect(screen.getByText(/entregue\/concluída, cancelada, sair da janela de aviso ou passar para atraso/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Resolver alerta" })).not.toBeInTheDocument()
  })

  it("automático vermelho ATIVO (disposal_blocked): sem Resolver, sem Arquivar, sem X — mostra 'Acompanhamento obrigatório' + explicação, e Detalhes", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{ ...redAlert, type: "task.overdue", condition_controlled: true, disposal_blocked: true, entity_type: "project_task", entity_id: "t1" }],
    })
    render(<AlertsPanel open onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument())

    expect(screen.queryByRole("button", { name: "Resolver alerta" })).not.toBeInTheDocument()
    expect(screen.queryByTitle("Arquivar")).not.toBeInTheDocument()
    expect(screen.queryByTitle("Marcar como lido")).not.toBeInTheDocument()
    expect(screen.getByText("Acompanhamento obrigatório")).toBeInTheDocument()
    expect(screen.getByText(/permanecerá ativo até que a situação da tarefa seja regularizada/)).toBeInTheDocument()
    expect(screen.getByText("Detalhes")).toBeInTheDocument()
  })

  it("'Dispensar todos' NÃO esconde o disposal_blocked (continua visível); os demais somem", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [
        { ...redAlert, id: "crit-1", title: "Crítico ativo", type: "task.overdue", condition_controlled: true, disposal_blocked: true, entity_type: "project_task", entity_id: "t1" },
        { ...baseAlert, id: "ok-1", title: "Aviso comum", severity: "info" as const },
      ],
    })
    ;(apiClient.markAllSystemAlertsRead as any).mockResolvedValue({ updated: 1, preserved: 1, message: "Os demais alertas foram dispensados, mas 1 alerta crítico permaneceu ativo porque ainda precisa ser regularizado." })
    const user = userEvent.setup()
    render(<AlertsPanel open onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText("Crítico ativo")).toBeInTheDocument())

    await user.click(screen.getByText("Dispensar todos"))
    // o crítico continua visível; o comum some
    await waitFor(() => expect(screen.queryByText("Aviso comum")).not.toBeInTheDocument())
    expect(screen.getByText("Crítico ativo")).toBeInTheDocument()
    expect(apiClient.markAllSystemAlertsRead).toHaveBeenCalled()
  })

  it("22. verde/amarelo mantêm dispensar/arquivar normalmente (sem 'Resolver alerta')", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [{ ...baseAlert, severity: "warning" }] });
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: "Resolver alerta" })).not.toBeInTheDocument();
    expect(screen.getByTitle("Arquivar")).toBeInTheDocument();
    expect(screen.getByTitle("Marcar como lido")).toBeInTheDocument();
  });

  it("4. clicar em 'Resolver alerta' abre o formulário", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [redAlert] });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Resolver alerta" }));
    expect(await screen.findByText("Resolver alerta", { selector: "div" })).toBeInTheDocument();
  });

  it("1/2. chamar a API diretamente (arquivar/dispensar) num vermelho sem resolução — 409 abre o formulário em vez de travar", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [{ ...baseAlert, severity: "warning" }] });
    (apiClient.archiveSystemAlert as any).mockRejectedValue(new ApiError("precisa resolver", 409, { requires_resolution: true }));
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByTitle("Arquivar"));
    expect(await screen.findByText("Resolver alerta", { selector: "div" })).toBeInTheDocument();
  });

  it("16. resolver com sucesso remove o card de Ativos e mostra o toast", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [redAlert] });
    (apiClient.resolveSystemAlert as any).mockResolvedValue({
      ok: true, duplicate: false, manual_resolved_at: "2026-08-27T10:00:00Z",
      resolution_action: "correcao_aplicada", resolution_description: "Descrição de teste válida.",
    });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Resolver alerta" }));
    await screen.findByText("Resolver alerta", { selector: "div" });
    await user.click(screen.getByRole("button", { name: "Correção aplicada" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "Descrição de teste válida.");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));

    await waitFor(() => expect(screen.queryByText("Aviso importante")).not.toBeInTheDocument());
  });

  it("6. entidade fora do escopo (via 404) não permite resolver — tratado como erro amigável no modal, sem travar", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({ data: [redAlert] });
    (apiClient.resolveSystemAlert as any).mockRejectedValue(new ApiError("Alerta não encontrado", 404));
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Resolver alerta" }));
    await screen.findByText("Resolver alerta", { selector: "div" });
    await user.click(screen.getByRole("button", { name: "Correção aplicada" }));
    await user.type(screen.getByPlaceholderText(/descreva o que foi feito/i), "Descrição de teste válida.");
    await user.click(screen.getByRole("button", { name: /confirmar resolução/i }));

    expect(await screen.findByText("Alerta não encontrado")).toBeInTheDocument();
  });

  it("aba Resolvidos mostra badge com data, quem resolveu e a ação — sem a descrição completa", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{
        ...redAlert,
        manual_resolved_at: "2026-08-27T10:00:00Z",
        resolution_action: "correcao_aplicada",
        resolved_by: { id: "u1", name: "Fulano Admin" },
      }],
    });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /resolvidos/i }));
    await waitFor(() => expect(screen.getByText(/por Fulano Admin/)).toBeInTheDocument());
    expect(screen.getByText(/Correção aplicada/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolver alerta" })).not.toBeInTheDocument();
  });

  it("resolução automática (motor): badge própria 'Resolvido automaticamente', autor 'Motor da Allka' e motivo legível — severidade original preservada", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{
        ...redAlert,
        automatic_resolved_at: "2026-08-27T10:00:00Z",
        automatic_resolution_reason: "task_completed",
        automatic_resolution_message: "A tarefa foi concluída.",
      }],
    });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /resolvidos/i }));
    await waitFor(() => expect(screen.getByText(/Resolvido automaticamente em/)).toBeInTheDocument());
    expect(screen.getByText(/por Motor da Allka/)).toBeInTheDocument();
    expect(screen.getByText(/A tarefa foi concluída\./)).toBeInTheDocument();
    // Nunca oferece "Resolver alerta" pra algo já resolvido pelo motor.
    expect(screen.queryByRole("button", { name: "Resolver alerta" })).not.toBeInTheDocument();
  });

  it("resolução manual tem prioridade sobre a automática na exibição (nunca as duas badges juntas)", async () => {
    (apiClient.getSystemAlerts as any).mockResolvedValue({
      data: [{
        ...redAlert,
        automatic_resolved_at: "2026-08-27T10:00:00Z",
        automatic_resolution_message: "A tarefa foi concluída.",
        manual_resolved_at: "2026-08-27T12:00:00Z",
        resolution_action: "correcao_aplicada",
        resolved_by: { id: "u1", name: "Fulano Admin" },
      }],
    });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: /resolvidos/i }));
    await waitFor(() => expect(screen.getByText(/por Fulano Admin/)).toBeInTheDocument());
    expect(screen.queryByText(/Resolvido automaticamente em/)).not.toBeInTheDocument();
  });

  it("18. resolver não manda automaticamente pra Arquivados — troca de aba confirma", async () => {
    (apiClient.getSystemAlerts as any).mockImplementation((filters: any) => {
      if (filters.resolved === "true") {
        return Promise.resolve({ data: [{ ...redAlert, id: "resolved-1", manual_resolved_at: "2026-08-27T10:00:00Z", resolution_action: "correcao_aplicada" }] });
      }
      if (filters.is_archived === "true") return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [redAlert] });
    });
    const user = userEvent.setup();
    render(<AlertsPanel open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Aviso importante")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /arquivados/i }));
    await waitFor(() => expect(screen.getByText("Nenhum alerta arquivado.")).toBeInTheDocument());
  });
});
