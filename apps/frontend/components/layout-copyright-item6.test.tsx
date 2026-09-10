import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Item 6 (reunião 09/09/2026) — o copyright saiu da barra fixa que
// "flutuava" no fim de todo conteúdo (Footer) e foi pro rodapé da sidebar,
// discreto e legível.

const { mockAccountType } = vi.hoisted(() => ({
  mockAccountType: { value: "admin" as string },
}));

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    getProjects: vi.fn().mockResolvedValue(null),
    getCompanies: vi.fn().mockResolvedValue(null),
    getAgencies: vi.fn().mockResolvedValue(null),
    getNomades: vi.fn().mockResolvedValue(null),
    getUsers: vi.fn().mockResolvedValue(null),
    getClientRecords: vi.fn().mockResolvedValue(null),
    startRoadmapSso: vi.fn(),
    getRoadmapSsoBaseUrl: vi.fn(),
  },
}));
vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({
    accountType: mockAccountType.value,
    accountSubType: "company",
    isPartnerActive: false,
    isOrgAdmin: true,
  }),
}));
vi.mock("@/contexts/agencia-context", () => ({
  useAgencia: () => ({ profile: null }),
}));
vi.mock("@/contexts/sidebar-context", () => ({
  useSidebar: () => ({
    sidebarSettings: { backgroundColor: "bg-slate-900" },
    previewTheme: null,
    previewEnabled: false,
    agencyProfile: null,
    userProfile: { name: "Admin Teste", avatar: "AT", job_title: "Admin", role: "admin" },
    setSidebarCollapsed: vi.fn(),
    setSidebarWidth: vi.fn(),
    sidebarWidth: 216,
    sidebarCollapsed: false,
  }),
}));

import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/footer";

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe("Item 6 — copyright ancorado no rodapé DA sidebar (correção)", () => {
  it("mostra o copyright discreto, com marca e ano", () => {
    renderSidebar();
    const cr = screen.getByText(/ALLKA by Lamego/i);
    expect(cr).toBeInTheDocument();
    expect(cr.textContent).toMatch(/©?\s*2026\s*ALLKA by Lamego/i);
  });

  it("o copyright fica DENTRO do data-sidebar-root, depois da navegação (fim vertical), sem estourar a altura", () => {
    const { container } = renderSidebar();
    const root = container.querySelector("[data-sidebar-root]") as HTMLElement;
    expect(root).toBeInTheDocument();

    const cr = screen.getByText(/ALLKA by Lamego/i);
    expect(cr.closest("[data-sidebar-root]")).toBe(root);

    const nav = root.querySelector('nav[data-tour-id="main-navigation"]') as HTMLElement;
    expect(nav.compareDocumentPosition(cr) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // nada com o copyright renderiza como irmão logo APÓS o data-sidebar-root
    const afterRoot = root.nextElementSibling as HTMLElement | null;
    if (afterRoot) {
      expect(afterRoot.textContent ?? "").not.toMatch(/ALLKA by Lamego/i);
    }
  });

  it("NÃO existe mais cartão/pill de perfil na sidebar (identidade de papel só no cabeçalho)", () => {
    renderSidebar();
    // o texto de identificação de papel que ficava no pill do rodapé some
    for (const role of ["Administrador", "Agência", "Empresa", "Nômade", "Parceiro"]) {
      expect(screen.queryByText(role)).not.toBeInTheDocument();
    }
    // e "Personalizar Sidebar" segue acessível pelo botão de paleta do topo
    expect(
      screen.getByRole("button", { name: /personalizar sidebar/i }),
    ).toBeInTheDocument();
  });

  it("o Footer (barra do fim do conteúdo) NÃO mostra mais o copyright — não é faixa fixa", () => {
    render(<Footer />);
    expect(screen.queryByText(/ALLKA by Lamego/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/direitos reservados/i)).not.toBeInTheDocument();
  });
});
