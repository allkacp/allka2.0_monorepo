import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { setTestViewportWidth } from "@/vitest.setup";
import { DocumentDeleteButton } from "@/components/document-delete-button";

// Fechamento do bloco 1 (ata 2026-08): a exclusão FÍSICA de documento (base
// de conhecimento em Admin → Configurações; documentos do projeto no modal
// de gestão) deixou de usar `window.confirm` de uma etapa e passou a usar o
// ConfirmationDialog compartilhado em duas etapas. Este arquivo cobre o
// componente extraído isolado — as páginas que o usam são grandes demais
// pra montar.

const { toastSpy } = vi.hoisted(() => ({ toastSpy: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
  toast: toastSpy,
}));

function renderButton(props: Partial<React.ComponentProps<typeof DocumentDeleteButton>> = {}) {
  const onDelete = props.onDelete ?? vi.fn().mockResolvedValue(undefined);
  const onDeleted = props.onDeleted ?? vi.fn();
  render(
    <MemoryRouter>
      <SidebarProvider>
        <DocumentDeleteButton
          documentName="contrato-2026.pdf"
          scopeLabel='da base "Comercial"'
          onDelete={onDelete}
          onDeleted={onDeleted}
          {...props}
        >
          {(open) => (
            <button type="button" onClick={open}>
              excluir
            </button>
          )}
        </DocumentDeleteButton>
      </SidebarProvider>
    </MemoryRouter>,
  );
  return { onDelete, onDeleted };
}

async function openToFinalStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /^excluir$/i }));
  await user.click(await screen.findByRole("button", { name: /continuar para confirmação/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  setTestViewportWidth(1280);
});

it("o gatilho não exclui nada — só abre a 1ª etapa, mostrando o nome do arquivo", async () => {
  const user = userEvent.setup();
  const { onDelete } = renderButton();
  await user.click(screen.getByRole("button", { name: /^excluir$/i }));
  expect(await screen.findByText(/não pode ser desfeita/i)).toBeInTheDocument();
  expect(screen.getAllByText(/contrato-2026\.pdf/i).length).toBeGreaterThan(0);
  expect(onDelete).not.toHaveBeenCalled();
});

it("a 1ª etapa (Continuar) ainda não chama a API", async () => {
  const user = userEvent.setup();
  const { onDelete } = renderButton();
  await openToFinalStep(user);
  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /excluir "contrato-2026\.pdf" definitivamente/i })).toBeInTheDocument();
});

it("confirmação final chama a API, mostra toast de sucesso e recarrega a lista", async () => {
  const user = userEvent.setup();
  const onDeleted = vi.fn().mockResolvedValue(undefined);
  const { onDelete } = renderButton({ onDeleted });
  await openToFinalStep(user);
  await user.click(screen.getByRole("button", { name: /excluir "contrato-2026\.pdf" definitivamente/i }));
  await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "Documento removido" }));
});

it("erro da API (ex.: 403) aparece DENTRO do diálogo e o documento é preservado (sem recarga, sem toast de sucesso)", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn().mockRejectedValue(new Error("Sem permissão para excluir este documento."));
  const onDeleted = vi.fn();
  renderButton({ onDelete, onDeleted });
  await openToFinalStep(user);
  await user.click(screen.getByRole("button", { name: /excluir "contrato-2026\.pdf" definitivamente/i }));
  expect(await screen.findByText(/sem permissão para excluir este documento/i)).toBeInTheDocument();
  expect(onDeleted).not.toHaveBeenCalled();
  expect(toastSpy).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Documento removido" }));
  // diálogo continua aberto
  expect(screen.getByRole("button", { name: /excluir "contrato-2026\.pdf" definitivamente/i })).toBeInTheDocument();
});

it("clique duplo no botão final não dispara duas exclusões", async () => {
  const user = userEvent.setup();
  let resolveDelete: () => void = () => {};
  const onDelete = vi.fn().mockImplementation(
    () => new Promise<void>((res) => { resolveDelete = res; }),
  );
  renderButton({ onDelete });
  await openToFinalStep(user);
  const finalBtn = screen.getByRole("button", { name: /excluir "contrato-2026\.pdf" definitivamente/i });
  fireEvent.click(finalBtn);
  fireEvent.click(finalBtn);
  fireEvent.click(finalBtn);
  resolveDelete();
  await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
});

it("falha só na recarga NÃO reabre erro nem reverte — a exclusão já aconteceu no servidor", async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const onDeleted = vi.fn().mockRejectedValue(new Error("falha de rede na recarga"));
  renderButton({ onDelete, onDeleted });
  await openToFinalStep(user);
  await user.click(screen.getByRole("button", { name: /excluir "contrato-2026\.pdf" definitivamente/i }));
  await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "Documento removido" }));
  await waitFor(() =>
    expect(screen.queryByText(/falha de rede na recarga/i)).not.toBeInTheDocument(),
  );
});
