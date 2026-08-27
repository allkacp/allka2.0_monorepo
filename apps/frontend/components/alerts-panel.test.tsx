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
  },
}));

import { apiClient } from "@/lib/api-client";

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
    expect(apiClient.recordSystemAlertEvent).toHaveBeenCalledWith("alert-1", "origin_clicked");
  });
});
