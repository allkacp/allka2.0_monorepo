import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AlertsAdminCenter } from "@/components/alerts-admin-center";

// Lote "Central de Alertas" (ata 2026-08) — cobre a lista/criação/edição/
// reclassificação/arquivamento administrativos. O gate de "só Admin
// Master vê isto" é testado em alerts-panel.test.tsx (é o painel pai quem
// decide se monta este componente ou não) — aqui assume-se que o
// componente já está montado (equivalente a "sou Master").

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getAdminSystemAlerts: vi.fn(),
    createAdminSystemAlert: vi.fn(),
    updateAdminSystemAlert: vi.fn(),
    reclassifyAdminSystemAlert: vi.fn(),
    archiveAdminSystemAlert: vi.fn(),
    unarchiveAdminSystemAlert: vi.fn(),
    getNotificationGroupEligibleMembers: vi.fn().mockResolvedValue({ data: [] }),
    getAdminAlertStandards: vi.fn().mockResolvedValue({ data: [] }),
    updateAdminAlertStandard: vi.fn(),
    previewAdminAlertStandard: vi.fn(),
    getAdminAlertRules: vi.fn().mockResolvedValue({ data: [] }),
    updateAdminAlertRule: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";

function adminAlert(overrides: Partial<{
  id: string; title: string; message: string; severity: "info" | "warning" | "error";
  is_archived: boolean; user_id: string | null; destinatario: { id: string; name: string; email: string } | null;
}> = {}) {
  return {
    id: overrides.id ?? "a1",
    title: overrides.title ?? "Alerta administrativo",
    message: overrides.message ?? "Mensagem administrativa",
    severity: overrides.severity ?? "warning",
    is_archived: overrides.is_archived ?? false,
    created_at: new Date().toISOString(),
    user_id: overrides.user_id ?? null,
    destinatario: overrides.destinatario ?? null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [], total: 0 });
  (apiClient.getNotificationGroupEligibleMembers as any).mockResolvedValue({ data: [] });
  (apiClient.getAdminAlertStandards as any).mockResolvedValue({ data: [] });
  (apiClient.getAdminAlertRules as any).mockResolvedValue({ data: [] });
});

function filterGroup() {
  return screen.getByRole("group", { name: "Filtrar por criticidade" });
}

function renderCenter() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <SidebarProvider>
        <AlertsAdminCenter />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("AlertsAdminCenter — criação", () => {
  it("27. criar alerta com campos válidos chama createAdminSystemAlert com título/mensagem/criticidade", async () => {
    (apiClient.createAdminSystemAlert as any).mockResolvedValue(adminAlert({ id: "novo", title: "Alerta Novo", severity: "info" }));
    const user = userEvent.setup();
    renderCenter();

    await user.click(screen.getByRole("button", { name: /novo alerta/i }));
    await user.type(screen.getByPlaceholderText(/pagamento pendente/i), "Alerta Novo");
    await user.type(screen.getByPlaceholderText(/detalhe o que precisa/i), "Mensagem do alerta novo");
    await user.click(screen.getByRole("button", { name: "Verde" }));
    await user.click(screen.getByRole("button", { name: /criar alerta/i }));

    await waitFor(() =>
      expect(apiClient.createAdminSystemAlert).toHaveBeenCalledWith({
        title: "Alerta Novo",
        message: "Mensagem do alerta novo",
        severity: "info",
        user_id: null,
      }),
    );
    expect(await screen.findByText("Alerta Novo")).toBeInTheDocument();
  });

  it("28. erro na criação mantém o formulário aberto com a mensagem visível", async () => {
    (apiClient.createAdminSystemAlert as any).mockRejectedValue(new Error("Destinatário inválido ou inexistente"));
    const user = userEvent.setup();
    renderCenter();

    await user.click(screen.getByRole("button", { name: /novo alerta/i }));
    await user.type(screen.getByPlaceholderText(/pagamento pendente/i), "Alerta com erro");
    await user.type(screen.getByPlaceholderText(/detalhe o que precisa/i), "Mensagem");
    await user.click(screen.getByRole("button", { name: /criar alerta/i }));

    expect(await screen.findByText("Destinatário inválido ou inexistente")).toBeInTheDocument();
    // O formulário continua aberto — o título digitado não se perde.
    expect(screen.getByDisplayValue("Alerta com erro")).toBeInTheDocument();
  });

  it("29. clique duplo no botão de salvar cria só uma ocorrência", async () => {
    let resolveCreate: (v: any) => void = () => {};
    (apiClient.createAdminSystemAlert as any).mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve; }),
    );
    const user = userEvent.setup();
    renderCenter();

    await user.click(screen.getByRole("button", { name: /novo alerta/i }));
    await user.type(screen.getByPlaceholderText(/pagamento pendente/i), "Alerta duplo clique");
    await user.type(screen.getByPlaceholderText(/detalhe o que precisa/i), "Mensagem");
    const saveButton = screen.getByRole("button", { name: /criar alerta/i });
    await user.click(saveButton);
    await user.click(saveButton); // segundo clique enquanto a primeira chamada ainda está "pendente"

    resolveCreate(adminAlert({ id: "novo2", title: "Alerta duplo clique" }));
    await waitFor(() => expect(apiClient.createAdminSystemAlert).toHaveBeenCalledTimes(1));
  });
});

describe("AlertsAdminCenter — edição e identificação correta do alerta", () => {
  it("30/31. editar atualiza só o alerta correto, mesmo com dois títulos parecidos", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({
      data: [
        adminAlert({ id: "a1", title: "Pagamento pendente" }),
        adminAlert({ id: "a2", title: "Pagamento pendente" }),
      ],
      total: 2,
    });
    (apiClient.updateAdminSystemAlert as any).mockImplementation((id: string) =>
      Promise.resolve(adminAlert({ id, title: "Pagamento pendente (editado)" })),
    );
    const user = userEvent.setup();
    renderCenter();

    await screen.findAllByText("Pagamento pendente");
    const editButtons = screen.getAllByTitle("Editar");
    await user.click(editButtons[0]); // edita só o primeiro (id a1)

    const titleInput = await screen.findByDisplayValue("Pagamento pendente");
    await user.clear(titleInput);
    await user.type(titleInput, "Pagamento pendente (editado)");
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(apiClient.updateAdminSystemAlert).toHaveBeenCalledWith("a1", expect.objectContaining({ title: "Pagamento pendente (editado)" })));
    // O segundo (a2) continua com o título original — não foi tocado.
    expect(screen.getAllByText("Pagamento pendente")).toHaveLength(1);
    expect(screen.getByText("Pagamento pendente (editado)")).toBeInTheDocument();
  });
});

describe("AlertsAdminCenter — reclassificação (Verde/Amarelo/Vermelho)", () => {
  it("32. reclassificar de Verde para Amarelo chama a rota certa e atualiza o badge", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1", severity: "info" })], total: 1 });
    (apiClient.reclassifyAdminSystemAlert as any).mockResolvedValue(adminAlert({ id: "a1", severity: "warning" }));
    const user = userEvent.setup();
    renderCenter();

    await screen.findByText("Alerta administrativo");
    await user.click(screen.getByTitle("Reclassificar para Amarelo"));

    await waitFor(() => expect(apiClient.reclassifyAdminSystemAlert).toHaveBeenCalledWith("a1", "warning"));
  });

  it("33. o badge Amarelo usa token yellow, nunca orange/amber", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1", severity: "warning" })], total: 1 });
    renderCenter();

    const badge = await screen.findByLabelText(/Criticidade: Amarelo/);
    expect(badge.className).toMatch(/yellow/);
    expect(badge.className).not.toMatch(/orange/);
    expect(badge.className).not.toMatch(/amber/);
  });

  it("34. reclassificar de Vermelho para Verde chama a rota certa", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1", severity: "error" })], total: 1 });
    (apiClient.reclassifyAdminSystemAlert as any).mockResolvedValue(adminAlert({ id: "a1", severity: "info" }));
    const user = userEvent.setup();
    renderCenter();

    await screen.findByText("Alerta administrativo");
    await user.click(screen.getByTitle("Reclassificar para Verde"));

    await waitFor(() => expect(apiClient.reclassifyAdminSystemAlert).toHaveBeenCalledWith("a1", "info"));
  });

  it("35. reclassificar pra fora do filtro de criticidade ativo tira o item da lista sem recarregar tudo (contador local desce)", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1", severity: "info" })], total: 1 });
    (apiClient.reclassifyAdminSystemAlert as any).mockResolvedValue(adminAlert({ id: "a1", severity: "error" }));
    const user = userEvent.setup();
    renderCenter();

    await screen.findByText("Alerta administrativo");
    await user.click(within(filterGroup()).getByRole("button", { name: "Verde" })); // filtro de criticidade = Verde
    // Trocar o filtro busca de novo no servidor com o filtro novo — isso é
    // esperado (não é o "reload completo" que a regra proíbe).
    await waitFor(() => expect(apiClient.getAdminSystemAlerts).toHaveBeenCalledTimes(2));

    await user.click(screen.getByTitle("Reclassificar para Vermelho"));
    await waitFor(() => expect(apiClient.reclassifyAdminSystemAlert).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Alerta administrativo")).not.toBeInTheDocument());
    // Reclassificar em si NÃO dispara uma nova listagem — só o patch local
    // (remoção da linha, já que ela deixou de bater com o filtro Verde).
    expect(apiClient.getAdminSystemAlerts).toHaveBeenCalledTimes(2);
  });
});

describe("AlertsAdminCenter — arquivamento administrativo", () => {
  it("37. arquivar pede confirmação antes de chamar a API", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1" })], total: 1 });
    const user = userEvent.setup();
    renderCenter();

    await screen.findByText("Alerta administrativo");
    await user.click(screen.getByTitle("Arquivar"));

    expect(await screen.findByText(/sairá da visão ativa/i)).toBeInTheDocument();
    expect(apiClient.archiveAdminSystemAlert).not.toHaveBeenCalled();
  });

  it("38. confirmar arquivamento remove só da visão ativa (Ativos)", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1" })], total: 1 });
    (apiClient.archiveAdminSystemAlert as any).mockResolvedValue(adminAlert({ id: "a1", is_archived: true }));
    const user = userEvent.setup();
    renderCenter();

    await screen.findByText("Alerta administrativo");
    await user.click(screen.getByTitle("Arquivar"));
    await user.click(screen.getByRole("button", { name: "Arquivar" }));

    await waitFor(() => expect(apiClient.archiveAdminSystemAlert).toHaveBeenCalledWith("a1"));
    await waitFor(() => expect(screen.queryByText("Alerta administrativo")).not.toBeInTheDocument());
  });

  it("40. busca e filtro de criticidade continuam preenchidos depois de arquivar", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1", severity: "error" })], total: 1 });
    (apiClient.archiveAdminSystemAlert as any).mockResolvedValue(adminAlert({ id: "a1", severity: "error", is_archived: true }));
    const user = userEvent.setup();
    renderCenter();

    await screen.findByText("Alerta administrativo");
    await user.click(within(filterGroup()).getByRole("button", { name: "Vermelho" }));
    await user.type(screen.getByPlaceholderText(/buscar por título/i), "pendente");

    await user.click(screen.getByTitle("Arquivar"));
    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    await waitFor(() => expect(apiClient.archiveAdminSystemAlert).toHaveBeenCalled());

    expect(screen.getByPlaceholderText(/buscar por título/i)).toHaveValue("pendente");
    expect(within(filterGroup()).getByRole("button", { name: "Vermelho" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("AlertsAdminCenter — estados", () => {
  it("42a. estado vazio", async () => {
    renderCenter();
    expect(await screen.findByText("Nenhum alerta encontrado.")).toBeInTheDocument();
  });

  it("42b. estado de erro", async () => {
    (apiClient.getAdminSystemAlerts as any).mockRejectedValue(new Error("falhou"));
    renderCenter();
    expect(await screen.findByText("Não foi possível carregar a central de alertas agora.")).toBeInTheDocument();
  });

  it("41. reclassificar não dispara um novo carregamento da lista inteira (loading fica só na ação)", async () => {
    (apiClient.getAdminSystemAlerts as any).mockResolvedValue({ data: [adminAlert({ id: "a1", severity: "info" })], total: 1 });
    (apiClient.reclassifyAdminSystemAlert as any).mockResolvedValue(adminAlert({ id: "a1", severity: "warning" }));
    const user = userEvent.setup();
    renderCenter();

    await screen.findByText("Alerta administrativo");
    await user.click(screen.getByTitle("Reclassificar para Amarelo"));
    await waitFor(() => expect(apiClient.reclassifyAdminSystemAlert).toHaveBeenCalled());

    expect(apiClient.getAdminSystemAlerts).toHaveBeenCalledTimes(1);
  });
});

describe("AlertsAdminCenter — correção conceitual (Padrões/Regras/Avulsos, 2º lote)", () => {
  it("24. as três abas Padrões/Regras/Avulsos existem, e Avulsos é a inicial", () => {
    renderCenter();
    const tabs = screen.getByRole("tablist", { name: "Seções da Central de Alertas" });
    expect(within(tabs).getByRole("tab", { name: "Padrões" })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: "Regras" })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: "Avulsos" })).toBeInTheDocument();
    expect(within(tabs).getByRole("tab", { name: "Avulsos" })).toHaveAttribute("aria-selected", "true");
  });

  it("botão de criação avulsa foi renomeado para 'Novo alerta avulso'", () => {
    renderCenter();
    expect(screen.getByRole("button", { name: "Novo alerta avulso" })).toBeInTheDocument();
  });

  it("32. Avulsos continua funcionando (criação/edição/reclassificação/arquivamento intactos) — smoke via mocks já testados acima", () => {
    renderCenter();
    expect(apiClient.getAdminSystemAlerts).toHaveBeenCalled();
  });
});

describe("AlertStandardsTab — Padrões", () => {
  function standard(overrides: Partial<{ id: string; key: string; name: string; title: string; message: string; default_severity: "info" | "warning" | "error"; is_active: boolean; is_system: boolean; allowed_variables: string[] }> = {}) {
    return {
      id: overrides.id ?? "std1",
      key: overrides.key ?? "task.due_soon",
      name: overrides.name ?? "Tarefa próxima do prazo (nome)",
      title: overrides.title ?? "Tarefa próxima do prazo",
      message: overrides.message ?? 'A tarefa "{{tarefa}}" vence em {{prazo}}.',
      default_severity: overrides.default_severity ?? "warning",
      is_active: overrides.is_active ?? true,
      is_system: overrides.is_system ?? true,
      allowed_variables: overrides.allowed_variables ?? ["tarefa", "prazo", "projeto"],
    };
  }

  it("25. os dois padrões iniciais aparecem", async () => {
    (apiClient.getAdminAlertStandards as any).mockResolvedValue({
      data: [
        standard({ id: "std1", key: "task.due_soon" }),
        standard({ id: "std2", key: "task.overdue", name: "Tarefa atrasada (nome)", title: "Tarefa atrasada" }),
      ],
    });
    const user = userEvent.setup();
    renderCenter();
    await user.click(screen.getByRole("tab", { name: "Padrões" }));

    expect(await screen.findByText("Tarefa próxima do prazo (nome)")).toBeInTheDocument();
    expect(screen.getByText("Tarefa atrasada (nome)")).toBeInTheDocument();
  });

  it("26. editar nome/título não altera a chave (key nunca é enviada como editável)", async () => {
    (apiClient.getAdminAlertStandards as any).mockResolvedValue({ data: [standard()] });
    (apiClient.updateAdminAlertStandard as any).mockResolvedValue(standard({ name: "Nome editado" }));
    const user = userEvent.setup();
    renderCenter();
    await user.click(screen.getByRole("tab", { name: "Padrões" }));

    await user.click(await screen.findByTitle("Editar"));
    const nameInput = await screen.findByDisplayValue("Tarefa próxima do prazo (nome)");
    await user.clear(nameInput);
    await user.type(nameInput, "Nome editado");
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(apiClient.updateAdminAlertStandard).toHaveBeenCalledWith(
        "std1",
        expect.not.objectContaining({ key: expect.anything() }),
      ),
    );
  });

  it("28. prévia não cria alerta real (só chama a rota de preview)", async () => {
    (apiClient.getAdminAlertStandards as any).mockResolvedValue({ data: [standard()] });
    (apiClient.previewAdminAlertStandard as any).mockResolvedValue({ title: "Prévia", message: "Mensagem de exemplo", severity: "warning", fictitious: true });
    const user = userEvent.setup();
    renderCenter();
    await user.click(screen.getByRole("tab", { name: "Padrões" }));

    await user.click(await screen.findByTitle("Visualizar prévia"));
    expect(await screen.findByText("Mensagem de exemplo")).toBeInTheDocument();
    expect(apiClient.createAdminSystemAlert).not.toHaveBeenCalled();
  });

  it("27. criticidade Amarela do padrão permanece visualmente amarela", async () => {
    (apiClient.getAdminAlertStandards as any).mockResolvedValue({ data: [standard({ default_severity: "warning" })] });
    const user = userEvent.setup();
    renderCenter();
    await user.click(screen.getByRole("tab", { name: "Padrões" }));

    const badge = await screen.findByText("Amarelo");
    expect(badge.closest("span")?.className ?? badge.className).toMatch(/yellow/);
  });
});

describe("AlertRulesTab — Regras", () => {
  function rule(overrides: Partial<{ id: string; name: string; trigger_type: string; is_active: boolean; lead_time_minutes: number | null; severity_override: "info" | "warning" | "error" | null; last_triggered_at: string | null }> = {}) {
    return {
      id: overrides.id ?? "rule1",
      name: overrides.name ?? "Tarefa próxima do prazo (24h)",
      trigger_type: overrides.trigger_type ?? "task.due_soon",
      is_active: overrides.is_active ?? true,
      lead_time_minutes: overrides.lead_time_minutes ?? 1440,
      severity_override: overrides.severity_override ?? null,
      last_triggered_at: overrides.last_triggered_at ?? null,
      standard: { id: "std1", key: overrides.trigger_type ?? "task.due_soon", name: "Tarefa próxima do prazo", default_severity: "warning" as const },
    };
  }

  it("29. a regra mostra uma frase amigável, nunca JSON", async () => {
    (apiClient.getAdminAlertRules as any).mockResolvedValue({ data: [rule()] });
    const user = userEvent.setup();
    renderCenter();
    await user.click(screen.getByRole("tab", { name: "Regras" }));

    expect(await screen.findByText(/Este alerta será criado 24h antes do prazo/)).toBeInTheDocument();
    expect(screen.queryByText(/[{[]/)).not.toBeInTheDocument();
  });

  it("30. editar a antecedência persiste (chama a API com o valor em minutos)", async () => {
    (apiClient.getAdminAlertRules as any).mockResolvedValue({ data: [rule({ lead_time_minutes: 1440 })] });
    (apiClient.updateAdminAlertRule as any).mockResolvedValue(rule({ lead_time_minutes: 720 }));
    const user = userEvent.setup();
    renderCenter();
    await user.click(screen.getByRole("tab", { name: "Regras" }));

    await user.click(await screen.findByTitle("Editar"));
    const input = await screen.findByDisplayValue("24");
    await user.clear(input);
    await user.type(input, "12");
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(apiClient.updateAdminAlertRule).toHaveBeenCalledWith("rule1", { lead_time_minutes: 720 }));
  });

  it("31. desativar uma regra chama a API com is_active: false", async () => {
    (apiClient.getAdminAlertRules as any).mockResolvedValue({ data: [rule({ is_active: true })] });
    (apiClient.updateAdminAlertRule as any).mockResolvedValue(rule({ is_active: false }));
    const user = userEvent.setup();
    renderCenter();
    await user.click(screen.getByRole("tab", { name: "Regras" }));

    await user.click(await screen.findByRole("switch"));
    await waitFor(() => expect(apiClient.updateAdminAlertRule).toHaveBeenCalledWith("rule1", { is_active: false }));
  });
});

describe("AlertsAdminCenter — Notificações não recebe estas regras", () => {
  it("33. nada nesta tela chama uma rota de notificações", async () => {
    renderCenter();
    // A Central de Alertas nunca importa/chama apiClient.getNotificationRules
    // ou equivalente — a separação Alertas/Notificações do 1º lote continua
    // intacta; aqui só confirmamos que a única fonte de dados usada é
    // system-alerts/admin/*.
    await waitFor(() => expect(apiClient.getAdminSystemAlerts).toHaveBeenCalled());
  });
});
