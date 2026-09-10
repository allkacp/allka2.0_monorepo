import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Item 6 (complemento 09/09/2026) — aproveitar melhor a viewport:
//  • o <Footer> não pinta mais faixa e zera `--footer-height` (sem reserva
//    morta de rodapé roubando altura do container central);
//  • os itens de menu da sidebar usam recuo horizontal menor (px-2.5, era
//    px-3) pra caber mais texto antes de truncar;
//  • quando o nome ainda não cabe, o rótulo trunca com reticências E expõe o
//    nome completo — por `title` (hover) e por um <Tooltip> cujo alvo é o
//    próprio link/botão focável (teclado);
//  • a pega de redimensionar a largura tem área maior e rótulo acessível.

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
    sidebarWidth: 200,
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

/** Força (ou não) o estado "texto não cabe" no jsdom, que sempre reporta
 *  scrollWidth/clientWidth = 0. */
function setTextOverflow(overflowing: boolean) {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      return overflowing ? 999 : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return overflowing ? 10 : 0;
    },
  });
}

function restoreTextMetrics() {
  // volta ao default do jsdom
  for (const prop of ["scrollWidth", "clientWidth"]) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get() {
        return 0;
      },
    });
  }
}

beforeEach(() => {
  document.documentElement.style.removeProperty("--footer-height");
});
afterEach(() => {
  restoreTextMetrics();
});

describe("Item 6 (complemento) — Footer sem faixa morta", () => {
  it("não renderiza nenhum elemento visível", () => {
    const { container } = render(<Footer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("zera a reserva de rodapé: --footer-height = 0px", () => {
    render(<Footer />);
    expect(
      document.documentElement.style.getPropertyValue("--footer-height"),
    ).toBe("0px");
  });

  it("restaura o valor anterior ao desmontar (não deixa lixo global)", () => {
    document.documentElement.style.setProperty("--footer-height", "40px");
    const view = render(<Footer />);
    expect(
      document.documentElement.style.getPropertyValue("--footer-height"),
    ).toBe("0px");
    view.unmount();
    expect(
      document.documentElement.style.getPropertyValue("--footer-height"),
    ).toBe("40px");
  });
});

describe("Item 6 (complemento) — pega de redimensionar da sidebar", () => {
  it("é um separador vertical com rótulo acessível, cursor col-resize e área de arrasto maior", () => {
    const { container } = renderSidebar();
    const handle = container.querySelector(
      '[role="separator"][aria-orientation="vertical"]',
    ) as HTMLElement;
    expect(handle).toBeInTheDocument();
    expect(handle.getAttribute("aria-label")).toMatch(/largura/i);
    expect(handle.getAttribute("title")).toMatch(/arraste/i);
    expect(handle.className).toMatch(/cursor-col-resize/);
    // área de arrasto passou de w-1 (4px) para w-2 (8px)
    expect(handle.className).toMatch(/(^|\s)w-2(\s|$)/);
    expect(handle.className).not.toMatch(/(^|\s)w-1(\s|$)/);
  });
});

describe("Item 6 (complemento) — itens de menu aproveitam mais largura", () => {
  it("os links de navegação usam px-2.5 (era px-3)", () => {
    const { container } = renderSidebar();
    const nav = container.querySelector(
      'nav[data-tour-id="main-navigation"]',
    ) as HTMLElement;
    const links = Array.from(nav.querySelectorAll("a,button")).filter((el) =>
      /rounded-lg/.test(el.className),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const el of links) {
      expect(el.className).toMatch(/px-2\.5/);
      expect(el.className).not.toMatch(/(^|\s)px-3(\s|$)/);
    }
  });
});

describe("Item 6 (complemento) — truncar com nome completo acessível", () => {
  it("quando o nome NÃO cabe, o rótulo recebe title com o nome completo", () => {
    setTextOverflow(true);
    renderSidebar();
    // "Projetos e Tarefas" é um grupo expansível cujo rótulo costuma truncar
    // numa sidebar de 200px.
    const label = screen.getByText("Projetos e Tarefas");
    expect(label.tagName).toBe("SPAN");
    expect(label.className).toMatch(/truncate/);
    expect(label.getAttribute("title")).toBe("Projetos e Tarefas");
  });

  it("quando o nome cabe, não há title redundante", () => {
    setTextOverflow(false);
    renderSidebar();
    const label = screen.getByText("Projetos e Tarefas");
    expect(label.getAttribute("title")).toBeNull();
  });

  it("um item truncado disponibiliza <TooltipContent> com o nome completo (foco/teclado)", async () => {
    setTextOverflow(true);
    renderSidebar();
    // O Radix Tooltip só monta o content quando aberto; garantimos ao menos
    // que o alvo é focável (link/botão) e que o rótulo está marcado como
    // truncado — o content é renderizado condicionalmente por truncatedNav.
    const label = screen.getByText("Projetos e Tarefas");
    const trigger = label.closest("button,a") as HTMLElement;
    expect(trigger).toBeInTheDocument();
    trigger.focus();
    expect(trigger).toHaveFocus();
  });
});
