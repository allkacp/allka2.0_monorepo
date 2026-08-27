import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AlertsPanel } from "@/components/alerts-panel";

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
