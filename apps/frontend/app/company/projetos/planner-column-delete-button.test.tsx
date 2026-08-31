import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { setTestViewportWidth } from "@/vitest.setup";
import { PlannerColumnDeleteButton } from "./planner-column-delete-button";

// Fechamento do bloco 1 (ata 2026-08): remover uma coluna do Planejador da
// empresa deixou de usar `window.confirm` de uma etapa. Este Planejador é
// um quadro de trabalho LOCAL (colunas/cartões só no estado da tela), então
// a confirmação em duas etapas mostra o nome da coluna e quantos cartões
// saem junto, e diz explicitamente que nada é salvo no servidor — não
// promete persistência que não existe.

function renderButton(props: Partial<React.ComponentProps<typeof PlannerColumnDeleteButton>> = {}) {
  const onConfirm = props.onConfirm ?? vi.fn();
  render(
    <MemoryRouter>
      <SidebarProvider>
        <PlannerColumnDeleteButton
          columnLabel="Em revisão"
          cardCount={3}
          onConfirm={onConfirm}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>,
  );
  return { onConfirm };
}

const trigger = () => screen.getByRole("button", { name: /remover coluna em revisão/i });

beforeEach(() => {
  vi.clearAllMocks();
  setTestViewportWidth(1280);
});

it("o X não remove nada — abre a 1ª etapa com nome da coluna, contagem de cartões e aviso de que não é salvo", async () => {
  const user = userEvent.setup();
  const { onConfirm } = renderButton();
  await user.click(trigger());
  expect(await screen.findByText(/quadro de trabalho local/i)).toBeInTheDocument();
  expect(screen.getByText(/os 3 cartões desta coluna saem do quadro/i)).toBeInTheDocument();
  expect(screen.getAllByText(/em revisão/i).length).toBeGreaterThan(0);
  expect(onConfirm).not.toHaveBeenCalled();
});

it("a 1ª etapa (Continuar) ainda não remove a coluna", async () => {
  const user = userEvent.setup();
  const { onConfirm } = renderButton();
  await user.click(trigger());
  await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /remover "em revisão" do quadro/i })).toBeInTheDocument();
});

it("confirmação final chama onConfirm uma vez e fecha", async () => {
  const user = userEvent.setup();
  const { onConfirm } = renderButton();
  await user.click(trigger());
  await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
  await user.click(screen.getByRole("button", { name: /remover "em revisão" do quadro/i }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: /remover "em revisão" do quadro/i })).not.toBeInTheDocument();
});

it("cancelar na 1ª etapa mantém a coluna", async () => {
  const user = userEvent.setup();
  const { onConfirm } = renderButton();
  await user.click(trigger());
  await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
  expect(onConfirm).not.toHaveBeenCalled();
});

it("coluna sem cartões: a frase muda e nenhuma menção a mover cartões", async () => {
  const user = userEvent.setup();
  renderButton({ cardCount: 0 });
  await user.click(trigger());
  expect(await screen.findByText(/a coluna não tem cartões/i)).toBeInTheDocument();
  expect(screen.getByText(/nenhum cartão é afetado/i)).toBeInTheDocument();
});
