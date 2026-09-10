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

describe("Item 6 — copyright no rodapé da sidebar", () => {
  it("a sidebar expandida mostra o copyright discreto no rodapé", () => {
    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Sidebar />
      </MemoryRouter>,
    );
    const cr = screen.getByText(/ALLKA by Lamego/i);
    expect(cr).toBeInTheDocument();
    expect(cr.textContent).toMatch(/©?\s*2026\s*ALLKA by Lamego/i);
  });

  it("o Footer (barra do fim do conteúdo) NÃO mostra mais o copyright", () => {
    render(<Footer />);
    expect(screen.queryByText(/ALLKA by Lamego/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/direitos reservados/i)).not.toBeInTheDocument();
  });
});
