import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { ReportConfigsTable } from "./report-configs-table";

// Dupla confirmação (ata 2026-08, bloco interface/usabilidade): a exclusão
// FÍSICA de uma configuração de relatório saiu do `confirm(...)` nativo para
// o ConfirmationDialog de duas etapas.

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    deleteAdminReport: vi.fn().mockResolvedValue({ ok: true }),
    updateAdminReport: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { apiClient } from "@/lib/api-client";

const config = {
  report_key: "revenue",
  is_active: true,
  allowed_account_types: [],
  allowed_roles: [],
  allowed_user_ids: [],
  blocked_user_ids: [],
  data_scope: "GLOBAL",
} as any;

function renderTable(overrides: Partial<Parameters<typeof ReportConfigsTable>[0]> = {}) {
  const onRefresh = vi.fn();
  render(
    <SidebarProvider>
      <ReportConfigsTable
        configs={[config]}
        loading={false}
        error={null}
        onEdit={vi.fn()}
        onCreate={vi.fn()}
        onRefresh={onRefresh}
        {...overrides}
      />
    </SidebarProvider>,
  );
  return { onRefresh };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportConfigsTable — exclusão com dupla confirmação", () => {
  it("não usa window.confirm; clicar em remover abre o diálogo de duas etapas", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    const user = userEvent.setup();
    renderTable();

    await user.click(await screen.findByRole("button", { name: /remover configuração de/i }));

    // 1ª etapa: explica alvo e consequência, sem botão final ainda
    expect(await screen.findByText("Excluir configuração de relatório")).toBeInTheDocument();
    expect(screen.getByText(/O relatório fica inacessível para todos os perfis\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /definitivamente/i })).not.toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("percorre as duas etapas, chama deleteAdminReport uma vez e faz onRefresh; clique duplo não duplica", async () => {
    const user = userEvent.setup();
    const { onRefresh } = renderTable();

    await user.click(await screen.findByRole("button", { name: /remover configuração de/i }));
    await user.click(await screen.findByRole("button", { name: /continuar para confirmação/i }));

    const finalBtn = await screen.findByRole("button", { name: /Excluir "Receitas e Faturamento" definitivamente/i });
    await user.click(finalBtn);
    await user.click(finalBtn).catch(() => {});

    await waitFor(() => expect(apiClient.deleteAdminReport).toHaveBeenCalledTimes(1));
    expect(apiClient.deleteAdminReport).toHaveBeenCalledWith("revenue");
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
  });

  it("erro da API mantém a linha e mostra a mensagem dentro do diálogo", async () => {
    (apiClient.deleteAdminReport as any).mockRejectedValueOnce(new Error("Sem permissão"));
    const user = userEvent.setup();
    const { onRefresh } = renderTable();

    await user.click(await screen.findByRole("button", { name: /remover configuração de/i }));
    await user.click(await screen.findByRole("button", { name: /continuar para confirmação/i }));
    await user.click(await screen.findByRole("button", { name: /definitivamente/i }));

    expect(await screen.findByText(/Sem permissão/)).toBeInTheDocument();
    expect(onRefresh).not.toHaveBeenCalled();
    // diálogo continua aberto
    expect(screen.getByRole("button", { name: /definitivamente/i })).toBeInTheDocument();
  });
});
