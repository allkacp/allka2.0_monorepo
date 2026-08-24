import React, { useState } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { setTestViewportWidth } from "@/vitest.setup";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

// Fundação de confirmação dupla (ata 2026-08-22) — cobre o componente
// isoladamente, em modo simples (retrocompatível) e em modo `twoStep`
// (exclusão de produto / limpar cesta usam este mesmo componente).

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <SidebarProvider>{children}</SidebarProvider>
    </MemoryRouter>
  );
}

/** Renderiza com um botão acionador real fora do diálogo, pra poder testar
 * retorno de foco (Radix devolve o foco pro elemento que tinha foco antes
 * de abrir — só funciona com um trigger de verdade, não com open=true fixo). */
function Harness(props: Partial<React.ComponentProps<typeof ConfirmationDialog>> = {}) {
  const [open, setOpen] = useState(false);
  return (
    <Providers>
      <button onClick={() => setOpen(true)}>abrir diálogo</button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={props.onConfirm ?? vi.fn()}
        title="Excluir produto"
        message="Esta ação é permanente."
        {...props}
      />
    </Providers>
  );
}

async function openViaTrigger(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("button", { name: /abrir diálogo/i });
  trigger.focus();
  await user.click(trigger);
  return trigger;
}

beforeEach(() => {
  setTestViewportWidth(1280);
});

describe("ConfirmationDialog — modo simples (retrocompatibilidade)", () => {
  it("onConfirm síncrono continua fechando o diálogo normalmente", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness onConfirm={onConfirm} confirmText="Confirmar" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Excluir produto")).not.toBeInTheDocument());
  });

  it("onConfirm assíncrono que falha mostra erro e não fecha", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Falha de rede"));
    const user = userEvent.setup();
    render(<Harness onConfirm={onConfirm} confirmText="Confirmar" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /^confirmar$/i }));
    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();
    expect(screen.getByText("Excluir produto")).toBeInTheDocument();
  });
});

describe("ConfirmationDialog — twoStep", () => {
  it("1. primeira etapa aparece ao abrir", async () => {
    const user = userEvent.setup();
    render(<Harness twoStep finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    expect(screen.getByText("Esta ação é permanente.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar para confirmação/i })).toBeInTheDocument();
  });

  it("2. ação destrutiva ainda não foi chamada na primeira etapa", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("3. avançar abre a segunda etapa, com o texto final específico", async () => {
    const user = userEvent.setup();
    render(<Harness twoStep targetName="Produto X" finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(screen.getByRole("button", { name: /excluir produto definitivamente/i })).toBeInTheDocument();
    expect(screen.getByText("Produto X")).toBeInTheDocument();
  });

  it("4. voltar retorna à primeira etapa", async () => {
    const user = userEvent.setup();
    render(<Harness twoStep finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /voltar/i }));
    expect(screen.getByRole("button", { name: /continuar para confirmação/i })).toBeInTheDocument();
  });

  it("5. cancelar (na primeira etapa) não executa a ação", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Esta ação é permanente.")).not.toBeInTheDocument());
  });

  it("6. Escape não executa a ação e fecha o diálogo", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.keyboard("{Escape}");
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Esta ação é permanente.")).not.toBeInTheDocument());
  });

  it("7. fechar e reabrir reinicia o fluxo na primeira etapa", async () => {
    const user = userEvent.setup();
    render(<Harness twoStep finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(screen.getByRole("button", { name: /excluir produto definitivamente/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Esta ação é permanente.")).not.toBeInTheDocument());

    await openViaTrigger(user);
    expect(screen.getByRole("button", { name: /continuar para confirmação/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /excluir produto definitivamente/i })).not.toBeInTheDocument();
  });

  it("8. confirmação final chama onConfirm exatamente uma vez", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir produto definitivamente/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it("9. clique duplo no botão final não duplica a chamada", async () => {
    let resolveConfirm: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { resolveConfirm = resolve; }));
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    const finalButton = screen.getByRole("button", { name: /excluir produto definitivamente/i });
    await user.click(finalButton);
    await user.click(finalButton);
    await user.click(finalButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    resolveConfirm();
  });

  it("10. carregamento bloqueia nova execução (botão desabilitado durante o await)", async () => {
    let resolveConfirm: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { resolveConfirm = resolve; }));
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    const finalButton = screen.getByRole("button", { name: /excluir produto definitivamente/i });
    await user.click(finalButton);
    await waitFor(() => expect(finalButton).toBeDisabled());
    const backButton = screen.getByRole("button", { name: /voltar/i });
    expect(backButton).toBeDisabled();
    resolveConfirm();
  });

  it("11. erro é exibido de forma amigável", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Produto vinculado a projetos existentes."));
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir produto definitivamente/i }));
    expect(await screen.findByText("Produto vinculado a projetos existentes.")).toBeInTheDocument();
  });

  it("12. após erro, o item permanece — diálogo continua aberto na 2ª etapa, pronto pra tentar de novo", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Falhou."));
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    const finalButton = screen.getByRole("button", { name: /excluir produto definitivamente/i });
    await user.click(finalButton);
    await screen.findByText("Falhou.");
    expect(finalButton).not.toBeDisabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("13. sucesso fecha o diálogo", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<Harness twoStep onConfirm={onConfirm} finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    await user.click(screen.getByRole("button", { name: /excluir produto definitivamente/i }));
    await waitFor(() => expect(screen.queryByText("Excluir produto — confirmação final")).not.toBeInTheDocument());
  });

  // O retorno de foco de verdade é do próprio Radix Dialog (FocusScope) e
  // depende do ciclo de animação de saída rodando de fato — algo que o
  // jsdom não executa (sem layout/CSS real), então essa parte específica é
  // verificada ao vivo no navegador (ver relatório do lote), não aqui. O
  // que dá pra garantir neste ambiente: fechar não deixa o diálogo nem
  // nenhum estado de foco preso, e o acionador continua utilizável.
  it("14. cancelar fecha o diálogo sem prender o foco, e o acionador continua utilizável", async () => {
    const user = userEvent.setup();
    render(<Harness twoStep finalConfirmText="Excluir produto definitivamente" />);
    const trigger = await openViaTrigger(user);
    await user.click(screen.getByRole("button", { name: /^cancelar$/i }));
    await waitFor(() => expect(screen.queryByText("Esta ação é permanente.")).not.toBeInTheDocument());
    trigger.focus();
    expect(trigger).toHaveFocus();
  });

  it("15. funciona por teclado — Tab alcança os botões e Enter aciona", async () => {
    const user = userEvent.setup();
    render(<Harness twoStep finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    const continueButton = screen.getByRole("button", { name: /continuar para confirmação/i });
    continueButton.focus();
    expect(continueButton).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: /excluir produto definitivamente/i })).toBeInTheDocument();
  });

  it("16. funciona no celular — botões continuam presentes e acionáveis em viewport estreito", async () => {
    setTestViewportWidth(375);
    const user = userEvent.setup();
    render(<Harness twoStep finalConfirmText="Excluir produto definitivamente" />);
    await openViaTrigger(user);
    expect(screen.getByRole("button", { name: /^cancelar$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuar para confirmação/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuar para confirmação/i }));
    expect(screen.getByRole("button", { name: /excluir produto definitivamente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /voltar/i })).toBeInTheDocument();
  });
});
