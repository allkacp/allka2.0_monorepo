import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

// Reunião 10/09 ("Feedback visual global de botões e controles clicáveis"):
// o componente compartilhado <Button> passa a garantir, pra toda a
// plataforma que o usa, os estados normal/hover/foco/pressionado/
// carregando/desabilitado descritos na reunião — sem precisar tocar em
// cada tela individualmente.
describe("Button — estados de interação (componente global)", () => {
  it("classes globais de hover/foco/pressionado/cursor estão presentes por padrão", () => {
    render(<Button>Salvar</Button>);
    const btn = screen.getByRole("button", { name: "Salvar" });
    expect(btn.className).toContain("cursor-pointer");
    expect(btn.className).toContain("active:scale-[0.98]");
    expect(btn.className).toContain("focus-visible:ring-ring/50");
    expect(btn.className).toContain("disabled:cursor-not-allowed");
  });

  it("loading: mostra spinner, marca aria-busy, desabilita e bloqueia novo clique (nunca dispara a ação duas vezes)", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button loading onClick={onClick}>Publicar</Button>);
    const btn = screen.getByRole("button", { name: /publicar/i });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg.animate-spin")).toBeTruthy();

    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled(); // desabilitado — clique não passa

    rerender(<Button loading={false} onClick={onClick}>Publicar</Button>);
    const btnReady = screen.getByRole("button", { name: "Publicar" });
    expect(btnReady).not.toBeDisabled();
    expect(btnReady).not.toHaveAttribute("aria-busy");
    await userEvent.click(btnReady);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled (sem loading) continua com cursor-not-allowed e nunca executa a ação", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Excluir</Button>);
    const btn = screen.getByRole("button", { name: "Excluir" });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("asChild (Slot) não aplica loading/disabled sintéticos — o chamador continua no controle total do filho", () => {
    render(
      <Button asChild loading>
        <a href="/x">Ir</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ir" });
    expect(link).not.toHaveAttribute("aria-busy");
    expect(link).not.toHaveAttribute("disabled");
  });

  it("foco por teclado (Tab) chega ao botão — navegação por teclado funciona", async () => {
    render(<Button>Continuar</Button>);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Continuar" })).toHaveFocus();
  });
});
