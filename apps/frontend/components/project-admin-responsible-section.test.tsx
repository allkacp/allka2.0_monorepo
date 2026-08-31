import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountTypeProvider } from "@/contexts/account-type-context";
import { ProjectAdminResponsibleSection } from "@/components/project-admin-responsible-section";

// Reparo "editar Admin responsável de projeto já existente" (ata 2026-08) —
// seção FUNCIONAL e isolada dentro da tela de gestão de um projeto, com
// salvamento próprio. Deliberadamente testada em isolamento (não montando
// project-management-modal.tsx inteiro, que tem um loop pré-existente do
// @radix-ui/react-compose-refs em jsdom, já documentado em
// project-adapter.test.ts) — este componente sozinho é a unidade real de
// comportamento nova deste lote.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    getAdminResponsibleOptions: vi.fn(),
    updateProject: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";

function admins() {
  return [
    { id: "admin-1", name: "Admin Um", email: "um@allka.test" },
    { id: "admin-2", name: "Admin Dois", email: "dois@allka.test" },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  (apiClient.getAdminResponsibleOptions as any).mockResolvedValue({ data: admins() });
});

function renderSection(props: Partial<React.ComponentProps<typeof ProjectAdminResponsibleSection>> = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <AccountTypeProvider>
        <ProjectAdminResponsibleSection projectId="proj-1" {...props} />
      </AccountTypeProvider>
    </MemoryRouter>,
  );
}

describe("ProjectAdminResponsibleSection", () => {
  it("11. projeto existente mostra o Admin atual (nome, e-mail e badge)", async () => {
    renderSection({ adminResponsibleId: "admin-1", adminResponsibleName: "Admin Um", adminResponsibleEmail: "um@allka.test", adminResponsibleIsMaster: false });
    expect(await screen.findByText("Admin Um")).toBeInTheDocument();
    expect(screen.getByText("um@allka.test")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("badge mostra 'Master' quando o Admin responsável é Master", async () => {
    renderSection({ adminResponsibleId: "admin-1", adminResponsibleName: "Admin Master", adminResponsibleEmail: "master@allka.test", adminResponsibleIsMaster: true });
    expect(await screen.findByText("Master")).toBeInTheDocument();
  });

  it("12. projeto sem Admin mostra aviso 'Admin responsável não definido'", async () => {
    renderSection({ adminResponsibleId: null });
    expect(await screen.findByText("Admin responsável não definido")).toBeInTheDocument();
  });

  it("13. seletor lista somente Admins ativos (vindos do endpoint admin-only)", async () => {
    renderSection({ adminResponsibleId: null });
    const user = userEvent.setup();
    await user.click(await screen.findByText("Sem responsável"));
    expect(await screen.findByText("Admin Um")).toBeInTheDocument();
    expect(screen.getByText("Admin Dois")).toBeInTheDocument();
  });

  it("14. salvamento chama a API real de atualização (não é decorativo)", async () => {
    (apiClient.updateProject as any).mockResolvedValue({
      admin_responsible_user_id: "admin-1",
      admin_responsible: { id: "admin-1", name: "Admin Um", email: "um@allka.test", admin_profile: { is_master: false } },
    });
    const user = userEvent.setup();
    renderSection({ adminResponsibleId: null });

    await user.click(await screen.findByText("Sem responsável"));
    await user.click(await screen.findByText("Admin Um"));
    await user.click(screen.getByRole("button", { name: /salvar admin responsável/i }));

    await waitFor(() => expect(apiClient.updateProject).toHaveBeenCalledWith("proj-1", { admin_responsible_user_id: "admin-1" }));
  });

  it("15. sucesso atualiza a exibição e mostra mensagem de sucesso", async () => {
    (apiClient.updateProject as any).mockResolvedValue({
      admin_responsible_user_id: "admin-2",
      admin_responsible: { id: "admin-2", name: "Admin Dois", email: "dois@allka.test", admin_profile: { is_master: false } },
    });
    const user = userEvent.setup();
    renderSection({ adminResponsibleId: null });

    await user.click(await screen.findByText("Sem responsável"));
    await user.click(await screen.findByText("Admin Dois"));
    await user.click(screen.getByRole("button", { name: /salvar admin responsável/i }));

    expect(await screen.findByText("Admin responsável atualizado.")).toBeInTheDocument();
    expect(screen.getByText("dois@allka.test")).toBeInTheDocument();
  });

  it("16. erro mantém a exibição do valor anterior (não fica 'meio trocado')", async () => {
    (apiClient.updateProject as any).mockRejectedValue(new Error("Admin responsável inválido"));
    const user = userEvent.setup();
    renderSection({ adminResponsibleId: "admin-1", adminResponsibleName: "Admin Um", adminResponsibleEmail: "um@allka.test" });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Admin Dois"));
    await user.click(screen.getByRole("button", { name: /salvar admin responsável/i }));

    expect(await screen.findByText("Admin responsável inválido")).toBeInTheDocument();
    // "Admin Um" aparece tanto no resumo quanto de volta no botão do
    // seletor (a seleção reverte pro valor salvo) — as duas ocorrências
    // confirmam que nada ficou "meio trocado".
    expect(screen.getAllByText("Admin Um").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Admin Dois")).not.toBeInTheDocument();
  });

  it("17. clique duplo no botão de salvar gera só uma requisição", async () => {
    let resolveSave: (v: any) => void = () => {};
    (apiClient.updateProject as any).mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    const user = userEvent.setup();
    renderSection({ adminResponsibleId: null });

    await user.click(await screen.findByText("Sem responsável"));
    await user.click(await screen.findByText("Admin Um"));
    const saveBtn = screen.getByRole("button", { name: /salvar admin responsável/i });
    await user.click(saveBtn);
    await user.click(saveBtn);

    resolveSave({ admin_responsible_user_id: "admin-1", admin_responsible: { id: "admin-1", name: "Admin Um", email: "um@allka.test", admin_profile: { is_master: false } } });
    await waitFor(() => expect(apiClient.updateProject).toHaveBeenCalledTimes(1));
  });

  it("18. remover Admin (selecionar 'Sem responsável') funciona", async () => {
    (apiClient.updateProject as any).mockResolvedValue({ admin_responsible_user_id: null, admin_responsible: null });
    const user = userEvent.setup();
    renderSection({ adminResponsibleId: "admin-1", adminResponsibleName: "Admin Um", adminResponsibleEmail: "um@allka.test" });

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Sem responsável"));
    await user.click(screen.getByRole("button", { name: /salvar admin responsável/i }));

    await waitFor(() => expect(apiClient.updateProject).toHaveBeenCalledWith("proj-1", { admin_responsible_user_id: null }));
    expect(await screen.findByText("Admin responsável não definido")).toBeInTheDocument();
  });

  it("botão de salvar fica desabilitado quando não há alteração pendente", async () => {
    renderSection({ adminResponsibleId: "admin-1", adminResponsibleName: "Admin Um", adminResponsibleEmail: "um@allka.test" });
    expect(await screen.findByRole("button", { name: /salvar admin responsável/i })).toBeDisabled();
  });
});
