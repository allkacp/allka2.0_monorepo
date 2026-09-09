import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

import {
  OpenScreensProvider,
  usePinnedPage,
  useOpenScreens,
  type PinnedEntry,
} from "@/contexts/open-screens-context";
import { OpenScreensTray } from "@/components/open-screens-tray";

// Item 5 (reunião 09/09/2026) — a bandeja de telas: o X remove de verdade,
// abrir/fechar/fixar não gera duplicidade nem item fantasma, e o botão de
// pin da tela de origem consegue DESAFIXAR (era o bug de closure velha).

const A: PinnedEntry = { id: "tela-a", label: "Tela A", icon: LayoutGrid, path: "/a" };
const B: PinnedEntry = { id: "tela-b", label: "Tela B", icon: LayoutGrid, path: "/b" };

function PinButton({ entry }: { entry: PinnedEntry }) {
  const { pinned, toggle } = usePinnedPage(entry);
  return (
    <button type="button" onClick={toggle} aria-pressed={pinned} data-testid={`pin-${entry.id}`}>
      {pinned ? "fixado" : "fixar"} {entry.label}
    </button>
  );
}

/** Simula "abrir a mesma tela várias vezes" = várias chamadas a addPinned. */
function AddButton({ entry }: { entry: PinnedEntry }) {
  const { addPinned } = useOpenScreens();
  return (
    <button type="button" onClick={() => addPinned(entry)} data-testid={`add-${entry.id}`}>
      abrir {entry.label}
    </button>
  );
}

function LocationProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function Harness({ entries = [A] }: { entries?: PinnedEntry[] }) {
  return (
    <MemoryRouter initialEntries={["/start"]}>
      <OpenScreensProvider>
        {entries.map((e) => (
          <React.Fragment key={e.id}>
            <PinButton entry={e} />
            <AddButton entry={e} />
          </React.Fragment>
        ))}
        <LocationProbe />
        <OpenScreensTray />
      </OpenScreensProvider>
    </MemoryRouter>
  );
}

async function openTray(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Bandeja de Telas" }));
}

function trayRow(label: string) {
  return screen.getByText(label).closest("div.group\\/row") as HTMLElement;
}

beforeEach(() => cleanup());

describe("OpenScreensTray — o X remove de verdade", () => {
  it("abrir uma tela entra na bandeja; clicar no X remove só aquele item", async () => {
    const user = userEvent.setup();
    render(<Harness entries={[A]} />);

    await user.click(screen.getByTestId("pin-tela-a")); // fixa a Tela A
    await openTray(user);
    expect(screen.getByText("Tela A")).toBeInTheDocument();

    const x = screen.getByRole("button", { name: "Remover Tela A da bandeja de telas" });
    await user.click(x);

    expect(screen.queryByText("Tela A")).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhuma tela adicionada ainda/i)).toBeInTheDocument();
    // o botão de pin da origem volta pra "não fixado"
    expect(screen.getByTestId("pin-tela-a")).toHaveAttribute("aria-pressed", "false");
  });

  it("depois de remover, um re-render (ou remontagem) não faz o item voltar", async () => {
    const user = userEvent.setup();
    const view = render(<Harness entries={[A]} />);

    await user.click(screen.getByTestId("pin-tela-a"));
    await openTray(user);
    await user.click(screen.getByRole("button", { name: "Remover Tela A da bandeja de telas" }));
    // o popover segue aberto, agora no estado vazio
    expect(screen.getByText(/Nenhuma tela adicionada ainda/i)).toBeInTheDocument();

    // re-render (o provider permanece montado) — o item não ressurge
    view.rerender(<Harness entries={[A]} />);
    expect(screen.queryByText("Tela A")).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhuma tela adicionada ainda/i)).toBeInTheDocument();

    // remontagem limpa ("atualizar a página"): bandeja começa vazia, nada ressurge
    cleanup();
    render(<Harness entries={[A]} />);
    await openTray(user);
    expect(screen.getByText(/Nenhuma tela adicionada ainda/i)).toBeInTheDocument();
  });

  it("abrir a MESMA tela várias vezes cria só um item", async () => {
    const user = userEvent.setup();
    render(<Harness entries={[A]} />);

    await user.click(screen.getByTestId("add-tela-a"));
    await user.click(screen.getByTestId("add-tela-a"));
    await user.click(screen.getByTestId("add-tela-a"));

    await openTray(user);
    const content = document.querySelector('[data-slot="popover-content"]') as HTMLElement;
    expect(within(content).getAllByText("Tela A")).toHaveLength(1);
  });

  it("com duas telas, remover uma tira só ela", async () => {
    const user = userEvent.setup();
    render(<Harness entries={[A, B]} />);

    await user.click(screen.getByTestId("pin-tela-a"));
    await user.click(screen.getByTestId("pin-tela-b"));
    await openTray(user);
    expect(screen.getByText("Tela A")).toBeInTheDocument();
    expect(screen.getByText("Tela B")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remover Tela A da bandeja de telas" }));

    expect(screen.queryByText("Tela A")).not.toBeInTheDocument();
    expect(screen.getByText("Tela B")).toBeInTheDocument();
    expect(screen.getByTestId("pin-tela-b")).toHaveAttribute("aria-pressed", "true");
  });

  it("reabrir a tela removida a insere uma única vez e ela navega normalmente", async () => {
    const user = userEvent.setup();
    render(<Harness entries={[A]} />);

    await user.click(screen.getByTestId("pin-tela-a"));
    await openTray(user);
    await user.click(screen.getByRole("button", { name: "Remover Tela A da bandeja de telas" }));

    // reabre pela origem
    await user.click(screen.getByTestId("pin-tela-a"));
    expect(screen.getByTestId("pin-tela-a")).toHaveAttribute("aria-pressed", "true");

    await openTray(user);
    const content = document.querySelector('[data-slot="popover-content"]') as HTMLElement;
    expect(within(content).getAllByText("Tela A")).toHaveLength(1);

    // clicar na linha navega pra rota da tela
    await user.click(within(content).getByRole("button", { name: "Tela A" }));
    expect(screen.getByTestId("path")).toHaveTextContent("/a");
  });
});

describe("OpenScreensTray — consistência do pin de origem (bug do Item 5)", () => {
  it("o botão de pin da tela de origem fixa E desafixa (não fica só adicionando)", async () => {
    const user = userEvent.setup();
    render(<Harness entries={[A]} />);
    const pin = screen.getByTestId("pin-tela-a");

    await user.click(pin);
    expect(pin).toHaveAttribute("aria-pressed", "true");

    await user.click(pin); // segundo clique: DESAFIXAR
    expect(pin).toHaveAttribute("aria-pressed", "false");

    await openTray(user);
    expect(screen.getByText(/Nenhuma tela adicionada ainda/i)).toBeInTheDocument();

    // e volta a fixar no clique seguinte
    await user.click(pin);
    expect(pin).toHaveAttribute("aria-pressed", "true");
  });
});

describe("OpenScreensTray — acessibilidade e camadas", () => {
  it("o X tem aria-label, não depende de hover e é operável por teclado (Enter)", async () => {
    const user = userEvent.setup();
    render(<Harness entries={[A]} />);
    await user.click(screen.getByTestId("pin-tela-a"));
    await openTray(user);

    const x = screen.getByRole("button", { name: "Remover Tela A da bandeja de telas" });
    expect(x).toHaveAttribute("aria-label");
    expect(x).toHaveAttribute("title");
    // não escondido só por hover
    expect(x.className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
    expect(x.className).toMatch(/focus-visible:opacity-100/);

    // teclado: foca e ativa com Enter, sem passar o mouse pela linha antes
    x.focus();
    expect(x).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByText("Tela A")).not.toBeInTheDocument();
  });

  it("o conteúdo da bandeja fica acima dos painéis (z-70) e fecha no Escape", async () => {
    const user = userEvent.setup();
    render(<Harness entries={[A]} />);
    await user.click(screen.getByTestId("pin-tela-a"));
    await openTray(user);

    const content = document.querySelector('[data-slot="popover-content"]') as HTMLElement;
    expect(content.className).toMatch(/(^|\s)z-70(\s|$)/);

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(document.querySelector('[data-slot="popover-content"]')).not.toBeInTheDocument(),
    );
    // reabre normalmente — bandeja não travou
    await openTray(user);
    expect(document.querySelector('[data-slot="popover-content"]')).toBeInTheDocument();
  });
});
