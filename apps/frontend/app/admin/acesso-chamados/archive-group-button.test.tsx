import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { setTestViewportWidth } from "@/vitest.setup";
import { ArchiveGroupButton } from "./archive-group-button";

// Fechamento do bloco 1 (ata 2026-08): arquivar um grupo de acesso a
// chamados deixou de usar `window.confirm` de uma etapa. Como NÃO é uma
// exclusão, a confirmação usa a variante `attention` (âmbar) do
// ConfirmationDialog em duas etapas — sem "excluir definitivamente", sem
// vermelho. Só a confirmação muda: regras, membros e permissões continuam
// intocados.

function renderButton(props: Partial<React.ComponentProps<typeof ArchiveGroupButton>> = {}) {
  const onArchive = props.onArchive ?? vi.fn().mockResolvedValue(undefined);
  const onArchived = props.onArchived ?? vi.fn();
  render(
    <MemoryRouter>
      <SidebarProvider>
        <ArchiveGroupButton
          groupName="Suporte N2"
          memberCount={4}
          onArchive={onArchive}
          onArchived={onArchived}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>,
  );
  return { onArchive, onArchived };
}

const trigger = () => screen.getByRole("button", { name: /^arquivar$/i });

beforeEach(() => {
  vi.clearAllMocks();
  setTestViewportWidth(1280);
});

it("clicar em 'Arquivar' abre a 1ª etapa (nome do grupo + impacto nos membros) e não arquiva nada", async () => {
  const user = userEvent.setup();
  const { onArchive } = renderButton();
  await user.click(trigger());
  expect(await screen.findByText(/não é uma exclusão/i)).toBeInTheDocument();
  expect(screen.getByText(/deixam de ser aplicadas a 4 membros/i)).toBeInTheDocument();
  expect(screen.getAllByText(/suporte n2/i).length).toBeGreaterThan(0);
  expect(onArchive).not.toHaveBeenCalled();
});

it("não oferece linguagem de exclusão — o botão final diz 'Arquivar grupo', não 'excluir definitivamente'", async () => {
  const user = userEvent.setup();
  renderButton();
  await user.click(trigger());
  await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
  expect(screen.getByRole("button", { name: /^arquivar grupo$/i })).toBeInTheDocument();
  expect(screen.queryByText(/excluir definitivamente/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /excluir/i })).not.toBeInTheDocument();
});

it("confirmação final chama onArchive e depois recarrega a lista", async () => {
  const user = userEvent.setup();
  const onArchived = vi.fn().mockResolvedValue(undefined);
  const { onArchive } = renderButton({ onArchived });
  await user.click(trigger());
  await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
  await user.click(screen.getByRole("button", { name: /^arquivar grupo$/i }));
  await waitFor(() => expect(onArchive).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(onArchived).toHaveBeenCalledTimes(1));
});

it("erro da API aparece dentro do diálogo e o grupo é preservado (sem recarga)", async () => {
  const user = userEvent.setup();
  const onArchive = vi.fn().mockRejectedValue(new Error("Não foi possível arquivar o grupo agora."));
  const onArchived = vi.fn();
  renderButton({ onArchive, onArchived });
  await user.click(trigger());
  await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
  await user.click(screen.getByRole("button", { name: /^arquivar grupo$/i }));
  expect(await screen.findByText(/não foi possível arquivar o grupo agora/i)).toBeInTheDocument();
  expect(onArchived).not.toHaveBeenCalled();
});

it("clique duplo no botão final não arquiva duas vezes", async () => {
  const user = userEvent.setup();
  let resolve: () => void = () => {};
  const onArchive = vi.fn().mockImplementation(
    () => new Promise<void>((res) => { resolve = res; }),
  );
  renderButton({ onArchive });
  await user.click(trigger());
  await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
  const finalBtn = screen.getByRole("button", { name: /^arquivar grupo$/i });
  fireEvent.click(finalBtn);
  fireEvent.click(finalBtn);
  resolve();
  await waitFor(() => expect(onArchive).toHaveBeenCalledTimes(1));
});

it("com 1 membro a frase fica no singular", async () => {
  const user = userEvent.setup();
  renderButton({ memberCount: 1 });
  await user.click(trigger());
  expect(await screen.findByText(/deixam de ser aplicadas a 1 membro\b/i)).toBeInTheDocument();
});

it("com 0 membros diz que o grupo não tem membros", async () => {
  const user = userEvent.setup();
  renderButton({ memberCount: 0 });
  await user.click(trigger());
  expect(await screen.findByText(/não tem membros no momento/i)).toBeInTheDocument();
});
