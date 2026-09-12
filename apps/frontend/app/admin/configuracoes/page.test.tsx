import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { OpenScreensProvider } from "@/contexts/open-screens-context";

// Correção ("preservação do histórico da Base de Conhecimento da IAllka"):
// o frontend nunca oferece "Excluir" pra um documento que faça parte de
// uma cadeia de versões (foi substituído ou substituiu outro) — mostra o
// botão desabilitado com o motivo explicado; um documento SEM histórico
// continua excluível normalmente.

const { api } = vi.hoisted(() => ({
  api: {
    getCurrentUser: vi.fn(),
    getKnowledgeCategories: vi.fn(),
    getKnowledgeDocuments: vi.fn(),
    getAIUsageSummary: vi.fn(),
    deleteKnowledgeDocument: vi.fn(),
    deactivateKnowledgeDocument: vi.fn(),
    activateKnowledgeDocument: vi.fn(),
    replaceKnowledgeDocument: vi.fn(),
    uploadKnowledgeDocument: vi.fn(),
    createKnowledgeCategory: vi.fn(),
    downloadKnowledgeDocument: vi.fn(),
  },
}));
vi.mock("@/lib/api-client", () => ({ apiClient: api }));
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

import AdminConfiguracoesPage from "@/app/admin/configuracoes/page";

const CATEGORY = { id: "cat1", key: "politicas", name: "Políticas", description: "", document_count: 2 };

const STANDALONE_DOC = {
  id: "doc-standalone",
  name: "avulso.txt",
  size: 120,
  uploaded_by: "admin@allka.com",
  created_at: new Date().toISOString(),
  is_active: true,
  version: 1,
  replaces_document_id: null,
  replaced_by: null,
};

const OLD_VERSION_DOC = {
  id: "doc-v1",
  name: "politica.txt",
  size: 200,
  uploaded_by: "admin@allka.com",
  created_at: new Date().toISOString(),
  is_active: false,
  version: 1,
  replaces_document_id: null,
  replaced_by: { id: "doc-v2", name: "politica-v2.txt", version: 2 },
};

const ACTIVE_VERSIONED_DOC = {
  id: "doc-v2",
  name: "politica-v2.txt",
  size: 210,
  uploaded_by: "admin@allka.com",
  created_at: new Date().toISOString(),
  is_active: true,
  version: 2,
  replaces_document_id: "doc-v1",
  replaced_by: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <OpenScreensProvider>
          <AdminConfiguracoesPage />
        </OpenScreensProvider>
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getCurrentUser.mockResolvedValue({ id: "u1", account_type: "admin", admin_profile: { is_active: true, is_master: true } });
  api.getKnowledgeCategories.mockResolvedValue({ categories: [CATEGORY] });
  api.getKnowledgeDocuments.mockResolvedValue({ documents: [STANDALONE_DOC, OLD_VERSION_DOC, ACTIVE_VERSIONED_DOC] });
  api.getAIUsageSummary.mockResolvedValue({ services: [] });
});

async function openKnowledgeBaseTab() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("tab", { name: "Base de Conhecimento IA" }));
  await screen.findByText("avulso.txt");
}

describe("Configurações > Base de Conhecimento IA — preservação do histórico", () => {
  it("6a. documento SEM histórico mostra 'Excluir' habilitado", async () => {
    renderPage();
    await openKnowledgeBaseTab();
    const row = screen.getByText("avulso.txt").closest("tr");
    const deleteBtn = row.querySelector('button[title="Excluir"]');
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn).not.toBeDisabled();
  });

  it("6b. versão ANTIGA (substituída) mostra 'Excluir' desabilitado, com o motivo no title", async () => {
    renderPage();
    await openKnowledgeBaseTab();
    const row = screen.getByText("politica.txt").closest("tr");
    const deleteBtn = row.querySelector("button[title*='Excluir indisponível']");
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn.getAttribute("title")).toMatch(/histórico de versões/i);
    // nunca o botão de exclusão real (com confirmação) pra este documento
    expect(row.querySelector('button[title="Excluir"]')).toBeNull();
  });

  it("6c. versão VIGENTE de uma cadeia também mostra 'Excluir' desabilitado, com o motivo", async () => {
    renderPage();
    await openKnowledgeBaseTab();
    const row = screen.getByText("politica-v2.txt").closest("tr");
    const deleteBtn = row.querySelector("button[title*='Excluir indisponível']");
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn.getAttribute("title")).toMatch(/foi substituído ou substituiu outro/i);
  });

  it("clicar em 'Excluir' desabilitado nunca chama a API de exclusão", async () => {
    renderPage();
    await openKnowledgeBaseTab();
    const row = screen.getByText("politica-v2.txt").closest("tr");
    const deleteBtn = row.querySelector("button[title*='Excluir indisponível']");
    await userEvent.click(deleteBtn, { pointerEventsCheck: 0 });
    expect(api.deleteKnowledgeDocument).not.toHaveBeenCalled();
  });
});
