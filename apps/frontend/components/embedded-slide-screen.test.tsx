import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmbeddedSlideScreen } from "./embedded-slide-screen";
import { FramedModal } from "./framed-panel";

vi.mock("@/contexts/open-screens-context", () => ({
  usePinEntry: () => ({ pinned: false, toggle: vi.fn() }),
  useOpenScreens: () => ({ addPinned: vi.fn() }),
}));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));

describe("EmbeddedSlideScreen — modo asPage", () => {
  it("asPage: card no fluxo normal (relative, sem 'absolute inset-0'), sem X, sem título de slide-over", () => {
    render(
      <EmbeddedSlideScreen asPage open onClose={vi.fn()} title="X">
        <div data-testid="conteudo">olá</div>
      </EmbeddedSlideScreen>,
    );
    const conteudo = screen.getByTestId("conteudo");
    const card = conteudo.closest("div.relative")!;
    expect(card.className).toContain("relative");
    expect(card.className).not.toContain("absolute");
    expect(card.className).not.toContain("inset-0");
    expect(screen.queryByRole("button", { name: /fechar/i })).not.toBeInTheDocument();
  });

  it("asPage: Escape NÃO chama onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <EmbeddedSlideScreen asPage open onClose={onClose}>
        <div>x</div>
      </EmbeddedSlideScreen>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("slide-over (sem asPage): mantém o overlay absoluto e fecha no Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <EmbeddedSlideScreen open onClose={onClose} title="T">
        <div data-testid="c2">y</div>
      </EmbeddedSlideScreen>,
    );
    const card = screen.getByTestId("c2").closest("div.absolute")!;
    expect(card.className).toContain("inset-0");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("duas Telas Slide uma sobre a outra (detalhe da tarefa sobre o projeto): cada Escape fecha só a de cima", async () => {
    const user = userEvent.setup();
    const closeProject = vi.fn();
    function Telas() {
      const [project, setProject] = useState(true);
      const [task, setTask] = useState(true);
      return (
        <>
          <EmbeddedSlideScreen open={project} onClose={() => { closeProject(); setProject(false); }} title="Projeto"><p>Kanban</p></EmbeddedSlideScreen>
          <EmbeddedSlideScreen open={task} onClose={() => setTask(false)} title="Tarefa T015718"><p>Detalhe da tarefa</p></EmbeddedSlideScreen>
        </>
      );
    }
    const { rerender } = render(<Telas />);
    rerender(<Telas />); // re-render não pode tirar a tela de baixo da ordem de abertura
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Detalhe da tarefa")).not.toBeInTheDocument());
    expect(closeProject).not.toHaveBeenCalled();
    expect(screen.getByText("Kanban")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(closeProject).toHaveBeenCalledTimes(1);
  });

  it("Escape com uma Janela Moldura aberta por cima fecha só a janela; a tela de trás continua (auditoria T28)", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    function TelaDoProjeto() {
      const [fatura, setFatura] = useState(true);
      return (
        <>
          <EmbeddedSlideScreen open onClose={onClose} title="Projeto">
            <p>Faturamento</p>
          </EmbeddedSlideScreen>
          <FramedModal open={fatura} onOpenChange={setFatura} testId="fatura" title="Detalhes da Fatura">
            <button type="button">Baixar PDF</button>
          </FramedModal>
        </>
      );
    }
    render(<TelaDoProjeto />);
    expect(screen.getByTestId("fatura")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByTestId("fatura")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Faturamento")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
