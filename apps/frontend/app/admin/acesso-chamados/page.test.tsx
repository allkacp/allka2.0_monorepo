import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser: vi.fn(),
    getProductFeedbackAdminConfig: vi.fn(),
    getProductFeedbackAdminSummary: vi.fn(),
    getProductFeedbackAdminUsers: vi.fn(),
    getProductFeedbackGroups: vi.fn(),
    getProductFeedbackAudit: vi.fn(),
    updateProductFeedbackAdminConfig: vi.fn(),
    setProductFeedbackUserOverride: vi.fn(),
    createProductFeedbackGroup: vi.fn(),
    updateProductFeedbackGroup: vi.fn(),
    archiveProductFeedbackGroup: vi.fn(),
    getProductFeedbackGroupMembers: vi.fn(),
    addProductFeedbackGroupMembers: vi.fn(),
    removeProductFeedbackGroupMember: vi.fn(),
    batchSetProductFeedbackOverride: vi.fn(),
    simulateProductFeedbackAccess: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import AcessoAosChamadosPage from "@/app/admin/acesso-chamados/page";

function setStoredUser(user: Record<string, unknown> | null) {
  if (user) {
    window.localStorage.setItem("allka_user", JSON.stringify(user));
  } else {
    window.localStorage.removeItem("allka_user");
  }
}

function mockHappyPathResponses() {
  // Perfil "is_master": mesmo comportamento legado do middleware
  // requirePermission (libera visualização e edição), a menos que um teste
  // sobrescreva explicitamente para simular um perfil granular.
  (apiClient.getCurrentUser as any).mockResolvedValue({
    id: "admin-1",
    role: "admin",
    account_type: "admin",
    admin_profile: { id: "profile-1", name: "Master", is_master: true, is_active: true, permissions: [] },
  });
  (apiClient.getProductFeedbackAdminConfig as any).mockResolvedValue({
    enabled: true,
    defaultPolicy: "ALLOW_ALL_ACTIVE",
    technicallyConfigured: true,
    roadmapInternalUrl: null,
  });
  (apiClient.getProductFeedbackAdminSummary as any).mockResolvedValue({
    released: 10,
    blocked: 2,
    exceptions: 1,
    inactive: 3,
    total: 12,
  });
  (apiClient.getProductFeedbackAdminUsers as any).mockResolvedValue({
    items: [
      {
        id: "user-1",
        name: "Fulano de Tal",
        email: "fulano@example.com",
        userCode: "00001",
        accountType: "empresas",
        isActive: true,
        status: "ativo",
        canUse: true,
        source: "default_policy",
        override: null,
        groupCount: 0,
      },
    ],
    pagination: { page: 1, limit: 20, total: 1 },
  });
  (apiClient.getProductFeedbackGroups as any).mockResolvedValue({ items: [] });
  (apiClient.getProductFeedbackAudit as any).mockResolvedValue({
    items: [],
    pagination: { page: 1, limit: 20, total: 0 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("AcessoAosChamadosPage — role gate", () => {
  it("blocks a non-admin user without ever calling the admin API", async () => {
    setStoredUser({ role: "company_user", account_type: "empresas" });
    render(<AcessoAosChamadosPage />);
    expect(await screen.findByText("Você não tem permissão para ver esta página.")).toBeInTheDocument();
    expect(apiClient.getProductFeedbackAdminConfig).not.toHaveBeenCalled();
  });

  it("blocks when there is no logged-in user at all", async () => {
    setStoredUser(null);
    render(<AcessoAosChamadosPage />);
    expect(await screen.findByText("Você não tem permissão para ver esta página.")).toBeInTheDocument();
  });

  it("loads the full page for an admin user", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    render(<AcessoAosChamadosPage />);

    await waitFor(() => expect(apiClient.getProductFeedbackAdminConfig).toHaveBeenCalled());
    expect(await screen.findByText("Fulano de Tal")).toBeInTheDocument();
    expect(screen.getByText("Produto ligado")).toBeInTheDocument();
    expect(screen.getByText("Integração técnica configurada")).toBeInTheDocument();
  });

  it("shows the summary counts returned by the backend", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Fulano de Tal");
    expect(screen.getByText("10")).toBeInTheDocument(); // released
    expect(screen.getByText("2")).toBeInTheDocument(); // blocked
  });

  it("blocks an admin whose granular profile lacks 'sistema:view', even though the role is admin", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    (apiClient.getCurrentUser as any).mockResolvedValue({
      id: "admin-2",
      role: "admin",
      account_type: "admin",
      admin_profile: { id: "profile-2", name: "Suporte", is_master: false, is_active: true, permissions: [] },
    });
    render(<AcessoAosChamadosPage />);

    expect(await screen.findByText("Você não tem permissão para ver esta página.")).toBeInTheDocument();
    expect(apiClient.getProductFeedbackAdminConfig).not.toHaveBeenCalled();
  });

  it("shows a read-only page (no write controls) for an admin with 'sistema:view' but not 'sistema:edit'", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    (apiClient.getCurrentUser as any).mockResolvedValue({
      id: "admin-3",
      role: "admin",
      account_type: "admin",
      admin_profile: {
        id: "profile-3",
        name: "Suporte leitura",
        is_master: false,
        is_active: true,
        permissions: [{ module: "sistema", action: "view" }],
      },
    });
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Fulano de Tal");
    expect(screen.queryByLabelText("Selecionar Fulano de Tal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^liberar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /criar grupo/i })).not.toBeInTheDocument();
  });

  it("warns when the technical integration isn't configured", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    (apiClient.getProductFeedbackAdminConfig as any).mockResolvedValue({
      enabled: true,
      defaultPolicy: "ALLOW_ALL_ACTIVE",
      technicallyConfigured: false,
      roadmapInternalUrl: null,
    });
    render(<AcessoAosChamadosPage />);
    expect(
      await screen.findByText(/Integração técnica não configurada/),
    ).toBeInTheDocument();
  });
});

describe("AcessoAosChamadosPage — batch actions on selected users", () => {
  it("selecting a user shows the batch action bar, and 'Liberar selecionados' calls the batch endpoint", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    (apiClient.batchSetProductFeedbackOverride as any).mockResolvedValue({ updated: 1 });
    const user = userEvent.setup();
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Fulano de Tal");
    expect(screen.queryByText(/selecionado\(s\)/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Selecionar Fulano de Tal"));
    expect(await screen.findByText("1 selecionado(s)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /liberar selecionados/i }));
    await waitFor(() =>
      expect(apiClient.batchSetProductFeedbackOverride).toHaveBeenCalledWith(
        expect.objectContaining({ userIds: ["user-1"], effect: "ALLOW" }),
      ),
    );
  });
});

describe("AcessoAosChamadosPage — group management", () => {
  function mockWithOneGroup() {
    mockHappyPathResponses();
    (apiClient.getProductFeedbackGroups as any).mockResolvedValue({
      items: [
        {
          id: "group-1",
          name: "Beta testers",
          effect: "ALLOW",
          priority: 5,
          active: true,
          expiresAt: null,
          reason: null,
          memberCount: 1,
        },
      ],
    });
  }

  it("clicking 'Editar' on a group reveals an editable form that saves via updateProductFeedbackGroup", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockWithOneGroup();
    (apiClient.updateProductFeedbackGroup as any).mockResolvedValue({ id: "group-1" });
    const user = userEvent.setup();
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Beta testers");
    await user.click(screen.getByRole("button", { name: /^editar$/i }));

    expect(await screen.findByRole("button", { name: /^salvar$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(apiClient.updateProductFeedbackGroup).toHaveBeenCalledWith("group-1", expect.any(Object)));
  });

  it("expanding a group loads and lists its members, and lets an admin remove one", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockWithOneGroup();
    (apiClient.getProductFeedbackGroupMembers as any).mockResolvedValue({
      items: [{ userId: "user-9", name: "Membro Um", email: "membro@example.com", userCode: null, addedAt: new Date().toISOString() }],
    });
    (apiClient.removeProductFeedbackGroupMember as any).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Beta testers");
    await user.click(screen.getByText("Beta testers"));

    expect(await screen.findByText(/Membro Um/)).toBeInTheDocument();
    expect(apiClient.getProductFeedbackGroupMembers).toHaveBeenCalledWith("group-1");

    await user.click(screen.getByRole("button", { name: /remover/i }));
    await waitFor(() => expect(apiClient.removeProductFeedbackGroupMember).toHaveBeenCalledWith("group-1", "user-9"));
  });

  it("selecting a user and choosing a group adds them to it via 'Adicionar ao grupo'", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockWithOneGroup();
    (apiClient.addProductFeedbackGroupMembers as any).mockResolvedValue({ added: 1 });
    const user = userEvent.setup();
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Fulano de Tal");
    await user.click(screen.getByLabelText("Selecionar Fulano de Tal"));
    await screen.findByText("1 selecionado(s)");

    // Radix Select: open the trigger (the combobox button, not the inner
    // display span — that one can end up covered/pointer-events:none in
    // jsdom), then pick the option from the listbox. The page has several
    // comboboxes at once, so target this one by its accessible name.
    await user.click(screen.getByRole("combobox", { name: "Escolher grupo para adicionar em lote" }));
    await user.click(await screen.findByRole("option", { name: "Beta testers" }));

    await user.click(screen.getByRole("button", { name: /adicionar ao grupo/i }));
    await waitFor(() =>
      expect(apiClient.addProductFeedbackGroupMembers).toHaveBeenCalledWith("group-1", ["user-1"]),
    );
  });
});

describe("AcessoAosChamadosPage — simulate and audit pagination", () => {
  it("clicking 'Simular' on a user row shows the simulated decision inline", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    (apiClient.simulateProductFeedbackAccess as any).mockResolvedValue({
      canUse: false,
      reason: "user_override_deny",
      source: "override",
    });
    const user = userEvent.setup();
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Fulano de Tal");
    await user.click(screen.getByRole("button", { name: /simular/i }));

    expect(await screen.findByText(/Simulação: bloqueado/)).toBeInTheDocument();
    expect(apiClient.simulateProductFeedbackAccess).toHaveBeenCalledWith("user-1");
  });

  it("paginates the audit trail with real page controls", async () => {
    setStoredUser({ role: "admin", account_type: "admin" });
    mockHappyPathResponses();
    (apiClient.getProductFeedbackAudit as any).mockResolvedValue({
      items: [{ id: "a1", actor_id: null, target_user_id: null, action: "config.updated", before_json: null, after_json: null, reason: null, created_at: new Date().toISOString() }],
      pagination: { page: 1, limit: 20, total: 25 },
    });
    const user = userEvent.setup();
    render(<AcessoAosChamadosPage />);

    await screen.findByText("Fulano de Tal");
    expect(await screen.findByText("Página 1 — 25 eventos")).toBeInTheDocument();

    const nextButtons = screen.getAllByRole("button", { name: /próxima/i });
    // The audit section's "Próxima" is the second occurrence (after the
    // users table's own pagination controls).
    await user.click(nextButtons[nextButtons.length - 1]!);

    await waitFor(() =>
      expect(apiClient.getProductFeedbackAudit).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
  });
});
