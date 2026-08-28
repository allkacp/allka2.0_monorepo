import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmbeddedSlideScreen } from "./embedded-slide-screen";

vi.mock("@/contexts/open-screens-context", () => ({
  usePinEntry: () => ({ pinned: false, toggle: vi.fn() }),
  useOpenScreens: () => ({ addPinned: vi.fn() }),
}));

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
});
