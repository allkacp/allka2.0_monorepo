import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// "Meu Perfil" como página dedicada no container padrão (ata 2026-08).
// A identidade vem SEMPRE da sessão (admin/nomad: GET /users/me; company/
// agency: contexto do portal). URL/query nunca trocam de usuário.

const { accountConfig, empresaCtx, agenciaCtx, apiClientMock, panelProps } = vi.hoisted(() => ({
  accountConfig: { accountType: "admin" as string },
  empresaCtx: { profile: null as any },
  agenciaCtx: { profile: null as any, projects: [] as any[], invoices: [] as any[] },
  apiClientMock: { getCurrentUser: vi.fn() },
  panelProps: { current: null as any },
}));

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: accountConfig.accountType }),
}));
vi.mock("@/contexts/empresa-context", () => ({ useEmpresa: () => empresaCtx }));
vi.mock("@/contexts/agencia-context", () => ({ useAgencia: () => agenciaCtx }));
vi.mock("@/lib/api-client", () => ({ apiClient: apiClientMock }));

vi.mock("@/components/user-view-slide-panel", () => ({
  UserViewSlidePanel: (props: any) => {
    panelProps.current = props;
    return (
      <div
        data-testid="panel"
        data-as-page={String(!!props.asPage)}
        data-viewer-role={props.viewerRole}
        data-user-name={props.user?.name ?? ""}
        data-user-id={String(props.user?.id ?? "")}
      />
    );
  },
}));

import SelfProfilePage from "./page";

function renderPage(route = "/admin/perfil") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/:portal/perfil" element={<SelfProfilePage />} />
        <Route path="*" element={<SelfProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  accountConfig.accountType = "admin";
  empresaCtx.profile = null;
  agenciaCtx.profile = null;
  agenciaCtx.projects = [];
  agenciaCtx.invoices = [];
  apiClientMock.getCurrentUser.mockResolvedValue({ id: "u-me", name: "Vinícius Guardia", email: "cp@lamego.com.vc" });
});

describe("SelfProfilePage", () => {
  it("admin: busca a sessão (getCurrentUser) e monta o painel em asPage, viewerRole=admin, com a identidade da sessão", async () => {
    renderPage("/admin/perfil?userId=999");
    await waitFor(() => expect(screen.getByTestId("panel")).toBeInTheDocument());
    const panel = screen.getByTestId("panel");
    expect(panel).toHaveAttribute("data-as-page", "true");
    expect(panel).toHaveAttribute("data-viewer-role", "admin");
    expect(panel).toHaveAttribute("data-user-name", "Vinícius Guardia");
    // O `userId` da query NUNCA é lido — a identidade vem só de getCurrentUser.
    expect(panel).toHaveAttribute("data-user-id", "u-me");
    expect(apiClientMock.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("mostra o loading dentro do container enquanto busca a sessão", async () => {
    let resolve: (v: any) => void = () => {};
    apiClientMock.getCurrentUser.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    expect(screen.getByRole("status", { name: /carregando seu perfil/i })).toBeInTheDocument();
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
    resolve({ id: "u-me", name: "X" });
    await waitFor(() => expect(screen.getByTestId("panel")).toBeInTheDocument());
  });

  it("erro na sessão mostra mensagem e 'Tentar novamente' — o retry refaz a chamada", async () => {
    apiClientMock.getCurrentUser.mockRejectedValueOnce(new Error("Sessão expirada"));
    apiClientMock.getCurrentUser.mockResolvedValueOnce({ id: "u-me", name: "X" });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/Sessão expirada/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    await waitFor(() => expect(screen.getByTestId("panel")).toBeInTheDocument());
    expect(apiClientMock.getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("empresa: identidade vem do contexto do portal (não chama getCurrentUser), viewerRole=company", async () => {
    accountConfig.accountType = "empresas";
    empresaCtx.profile = { id: "emp-1", name: "Rose Empresa LTDA", email: "rose@x.com", status: "active" };
    renderPage("/company/perfil");
    await waitFor(() => expect(screen.getByTestId("panel")).toBeInTheDocument());
    expect(screen.getByTestId("panel")).toHaveAttribute("data-viewer-role", "company");
    expect(screen.getByTestId("panel")).toHaveAttribute("data-user-name", "Rose Empresa LTDA");
    expect(apiClientMock.getCurrentUser).not.toHaveBeenCalled();
  });

  it("agência: identidade + agencyFinancial do contexto, viewerRole=agency", async () => {
    accountConfig.accountType = "agencias";
    agenciaCtx.profile = { id: "ag-1", name: "Gabriel Agency", email: "g@x.com", currentMrr: 1000, plan: "pro", planDiscount: 0 };
    agenciaCtx.projects = [{ value: 500 }, { value: 300 }];
    agenciaCtx.invoices = [{ id: "i1" }];
    renderPage("/agency/perfil");
    await waitFor(() => expect(screen.getByTestId("panel")).toBeInTheDocument());
    expect(screen.getByTestId("panel")).toHaveAttribute("data-viewer-role", "agency");
    expect(panelProps.current.agencyFinancial).toMatchObject({ currentMrr: 1000, projectRevenue: 800 });
  });
});
