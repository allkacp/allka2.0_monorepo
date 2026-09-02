import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TourRunner } from "@/components/onboarding/tour-runner";
import type { TourDefinition } from "@/lib/tours/types";

// Motor + overlay do tour guiado (sprint de onboarding, bloco 1/3) — testado
// isoladamente com um TourDefinition sintético (nunca depende do registro
// real), provando a mecânica: navegação, pulo seguro de passo opcional
// ausente, Escape nunca conclui, e nunca abre um tutorial vazio.

function threeStepTour(overrides: Partial<TourDefinition> = {}): TourDefinition {
  return {
    key: "teste",
    version: 1,
    title: "Tour de teste",
    description: "desc",
    category: "primeiros-passos",
    routes: [],
    steps: [
      { id: "step-a", target: "alvo-a", title: "Passo A", description: "Descrição A", placement: "bottom" },
      { id: "step-missing", target: "alvo-inexistente", title: "Passo ausente", description: "nunca deveria aparecer", optional: true },
      { id: "step-b", target: "alvo-b", title: "Passo B", description: "Descrição B", placement: "bottom" },
    ],
    ...overrides,
  };
}

function mountTargets() {
  document.body.innerHTML = '<div data-tour-id="alvo-a" style="width:10px;height:10px"></div><div data-tour-id="alvo-b" style="width:10px;height:10px"></div>';
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("TourRunner", () => {
  it("mostra o primeiro passo e navega com Próximo/Anterior", async () => {
    mountTargets();
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(<TourRunner tour={threeStepTour()} onStepChange={onStepChange} onComplete={vi.fn()} onExit={vi.fn()} />);

    expect(await screen.findByText("Passo A")).toBeInTheDocument();
    expect(screen.getByText("1 de 3")).toBeInTheDocument();
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith("step-a"));

    // passo opcional sem alvo é pulado com segurança — vai direto pro Passo B
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    expect(await screen.findByText("Passo B")).toBeInTheDocument();
    expect(screen.queryByText("Passo ausente")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /anterior/i }));
    expect(await screen.findByText("Passo A")).toBeInTheDocument();
  });

  it("no último passo, o botão vira 'Concluir' e chama onComplete", async () => {
    mountTargets();
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<TourRunner tour={threeStepTour()} onStepChange={vi.fn()} onComplete={onComplete} onExit={vi.fn()} />);
    await screen.findByText("Passo A");
    await user.click(screen.getByRole("button", { name: /próximo/i })); // pula o opcional, vai pro B (último)
    await screen.findByText("Passo B");
    await user.click(screen.getByRole("button", { name: /concluir/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("Escape sai sem concluir (onExit, nunca onComplete)", async () => {
    mountTargets();
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onExit = vi.fn();
    render(<TourRunner tour={threeStepTour()} onStepChange={vi.fn()} onComplete={onComplete} onExit={onExit} />);
    await screen.findByText("Passo A");
    await user.keyboard("{Escape}");
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("botão 'Sair' chama onExit", async () => {
    mountTargets();
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<TourRunner tour={threeStepTour()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={onExit} />);
    await screen.findByText("Passo A");
    await user.click(screen.getByRole("button", { name: /^sair$/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("navegação por teclado: seta direita avança, seta esquerda volta", async () => {
    mountTargets();
    const user = userEvent.setup();
    render(<TourRunner tour={threeStepTour()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    await screen.findByText("Passo A");
    await user.keyboard("{ArrowRight}");
    await screen.findByText("Passo B");
    await user.keyboard("{ArrowLeft}");
    await screen.findByText("Passo A");
  });

  it("retoma a partir do passo salvo (startStepId)", async () => {
    mountTargets();
    render(<TourRunner tour={threeStepTour()} startStepId="step-b" onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText("Passo B")).toBeInTheDocument();
    expect(screen.getByText("3 de 3")).toBeInTheDocument();
  });

  it("nunca abre um tutorial vazio: se TODOS os alvos estiverem ausentes, sai com segurança em vez de travar", async () => {
    // nenhum elemento montado no DOM
    const onExit = vi.fn();
    const allOptionalMissing = threeStepTour({
      steps: [
        { id: "a", target: "some-missing-a", title: "A", description: "A", optional: true },
        { id: "b", target: "some-missing-b", title: "B", description: "B", optional: true },
      ],
    });
    render(<TourRunner tour={allOptionalMissing} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={onExit} />);
    await waitFor(() => expect(onExit).toHaveBeenCalled());
  });

  it("escolhe o elemento VISÍVEL quando dois compartilham o mesmo data-tour-id (padrão desktop/mobile)", async () => {
    document.body.innerHTML =
      '<div data-tour-id="alvo-a" style="display:none"></div>' +
      '<div data-tour-id="alvo-a" style="width:20px;height:20px"></div>';
    render(
      <TourRunner
        tour={threeStepTour({ steps: [{ id: "step-a", target: "alvo-a", title: "Passo A", description: "d" }] })}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    // não deveria quebrar, e deveria conseguir posicionar a partir do elemento visível
    expect(await screen.findByText("Passo A")).toBeInTheDocument();
  });

  it("viewport mobile: o balão nunca fica cortado (permanece dentro da largura da tela)", async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 360 });
    try {
      mountTargets();
      render(<TourRunner tour={threeStepTour()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
      const balloon = (await screen.findByText("Passo A")).closest("div[style]") as HTMLElement;
      expect(balloon).toBeTruthy();
      const width = parseInt(balloon.style.width || "0", 10);
      const left = parseInt(balloon.style.left || "0", 10);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + width).toBeLessThanOrEqual(360);
    } finally {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: originalWidth });
    }
  });
});
