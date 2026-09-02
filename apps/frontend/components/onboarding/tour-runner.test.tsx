import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

  it("z-index nunca fica acima do MandatoryBannerGate (z-[120]) — avisos obrigatórios da plataforma nunca ficam escondidos atrás de um tour", async () => {
    mountTargets();
    render(<TourRunner tour={threeStepTour()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    const dialog = await screen.findByRole("dialog");
    const zIndexMatch = dialog.className.match(/z-\[(\d+)\]/);
    expect(zIndexMatch).not.toBeNull();
    expect(Number(zIndexMatch![1])).toBeLessThan(120);
  });

  it("foco inicial vai pro balão e é devolvido ao elemento anterior ao sair (Escape)", async () => {
    mountTargets();
    const trigger = document.createElement("button");
    trigger.textContent = "Abrir tour";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(<TourRunner tour={threeStepTour()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    const heading = await screen.findByText("Passo A");
    const balloon = heading.closest('div[tabindex="-1"]') as HTMLElement;
    await waitFor(() => expect(document.activeElement).toBe(balloon));

    unmount();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("TourRunner — painel fechado (requiresOpening, bloco 3/3)", () => {
  function tourWithClosedPanel(overrides: Partial<TourDefinition["steps"][number]> = {}): TourDefinition {
    return {
      key: "teste-painel",
      version: 1,
      title: "Tour painel",
      description: "desc",
      category: "primeiros-passos",
      routes: [],
      steps: [
        {
          id: "panel-step",
          target: "conteudo-do-painel",
          title: "Conteúdo do painel",
          description: "Descrição real do conteúdo",
          requiresOpening: { openerTarget: "abre-painel", instruction: "Para continuar, abra o painel." },
          ...overrides,
        },
      ],
    };
  }

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("destaca o botão que abre o painel e espera a pessoa clicar — nunca clica sozinho", async () => {
    document.body.innerHTML = '<button data-tour-id="abre-painel">Abrir</button>';
    const opener = document.querySelector('[data-tour-id="abre-painel"]') as HTMLElement;
    const clickSpy = vi.fn();
    opener.addEventListener("click", clickSpy);

    render(<TourRunner tour={tourWithClosedPanel()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText("Para continuar, abra o painel.")).toBeInTheDocument();
    // o título do passo real continua visível (nunca troca de passo, só de mensagem)
    expect(screen.getByText("Conteúdo do painel")).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("assim que o conteúdo real monta (a pessoa abriu o painel de verdade), o passo segue normalmente", async () => {
    document.body.innerHTML = '<button data-tour-id="abre-painel">Abrir</button>';
    const onStepChange = vi.fn();
    render(<TourRunner tour={tourWithClosedPanel()} onStepChange={onStepChange} onComplete={vi.fn()} onExit={vi.fn()} />);
    await screen.findByText("Para continuar, abra o painel.");

    const real = document.createElement("div");
    real.setAttribute("data-tour-id", "conteudo-do-painel");
    real.style.width = "10px";
    real.style.height = "10px";
    document.body.appendChild(real);

    expect(await screen.findByText("Descrição real do conteúdo")).toBeInTheDocument();
    expect(screen.queryByText("Para continuar, abra o painel.")).not.toBeInTheDocument();
  });

  it("se nem o botão que abre o painel existir (perfil sem acesso ao módulo), mostra indisponível em vez de travar esperando", async () => {
    // DOM vazio: nem o alvo real, nem o botão de abertura existem
    render(<TourRunner tour={tourWithClosedPanel()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText("Este conteúdo não está disponível no momento.")).toBeInTheDocument();
  });

  it("timeout seguro: se o painel nunca é aberto, explica e mantém Sair disponível — nunca trava esperando pra sempre", async () => {
    document.body.innerHTML = '<button data-tour-id="abre-painel">Abrir</button>';
    const onExit = vi.fn();
    render(
      <TourRunner
        tour={tourWithClosedPanel()}
        onStepChange={vi.fn()}
        onComplete={vi.fn()}
        onExit={onExit}
        prepareOpenTimeoutMs={30}
      />,
    );
    await screen.findByText("Para continuar, abra o painel.");
    expect(await screen.findByText(/não detectamos que o painel foi aberto a tempo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^sair$/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe("TourRunner — tour de registro específico sem nenhum dado aberto (noDataMessage, bloco 3/3)", () => {
  function tourScopedToARecord(): TourDefinition {
    return {
      key: "teste-registro",
      version: 1,
      title: "Tour de registro",
      description: "desc",
      category: "produtos-catalogo",
      routes: [],
      noDataMessage: "Não encontramos um projeto aberto agora. Abra um projeto para continuar.",
      steps: [
        { id: "a", target: "projeto-secao-a", title: "Seção A", description: "Descrição A", optional: true },
        { id: "b", target: "projeto-secao-b", title: "Seção B", description: "Descrição B", optional: true },
        { id: "explain", target: null, title: "Conceito", description: "Uma explicação central, sem alvo." },
      ],
    };
  }

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("sem NENHUM alvo real em lugar nenhum da tela: mostra noDataMessage em vez de sumir ou ensinar ação impossível", async () => {
    render(<TourRunner tour={tourScopedToARecord()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText("Não encontramos um projeto aberto agora. Abra um projeto para continuar.")).toBeInTheDocument();
    // nunca ensina a ação impossível (não mostra o texto normal do passo)
    expect(screen.queryByText("Descrição A")).not.toBeInTheDocument();
  });

  it("permite sair normalmente a partir do estado 'sem dado' (nunca trava)", async () => {
    const onExit = vi.fn();
    render(<TourRunner tour={tourScopedToARecord()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={onExit} />);
    await screen.findByText(/não encontramos um projeto aberto/i);
    fireEvent.click(screen.getByRole("button", { name: /^sair$/i }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("assim que existir QUALQUER alvo real do tour na tela (registro foi aberto), o passo funciona normalmente — nunca fica preso na mensagem vazia", async () => {
    document.body.innerHTML = '<div data-tour-id="projeto-secao-a" style="width:10px;height:10px"></div>';
    render(<TourRunner tour={tourScopedToARecord()} onStepChange={vi.fn()} onComplete={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText("Descrição A")).toBeInTheDocument();
    expect(screen.queryByText(/não encontramos um projeto aberto/i)).not.toBeInTheDocument();
  });
});
