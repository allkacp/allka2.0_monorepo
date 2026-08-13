import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getProductFeedbackAdminConfig: vi.fn(),
    getProductFeedbackAdminSummary: vi.fn(),
    getProductFeedbackAdminUsers: vi.fn(),
    getProductFeedbackGroups: vi.fn(),
    getProductFeedbackAudit: vi.fn(),
    updateProductFeedbackAdminConfig: vi.fn(),
    setProductFeedbackUserOverride: vi.fn(),
    createProductFeedbackGroup: vi.fn(),
    archiveProductFeedbackGroup: vi.fn(),
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
  (apiClient.getProductFeedbackAudit as any).mockResolvedValue({ items: [] });
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
