import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ProjectBasketProvider,
  useProjectBasket,
} from "@/contexts/project-basket-context";

// Fundação de confirmação dupla (ata 2026-08-22) — "Limpar" na cesta chama
// clearBasket() do contexto real (não mockado aqui, ao contrário de
// project-basket-drawer.test.tsx). Este arquivo prova a garantia estrutural
// exigida pelo lote: limpar a cesta de uma conta nunca afeta outra conta —
// cada identidade grava em uma chave de localStorage própria
// (getCatalogBasketStorageKey), então clearBasket() só pode tocar a chave
// da conta atualmente logada.

const accountConfig = { accountType: "agencias" as const };

vi.mock("@/contexts/account-type-context", () => ({
  useAccountType: () => ({ accountType: accountConfig.accountType, accountSubType: null }),
}));

vi.mock("@/contexts/global-header-panel-context", () => ({
  useGlobalHeaderPanel: () => ({
    isActive: () => false,
    openPanel: vi.fn(),
    closePanel: vi.fn(),
  }),
}));

function setLoggedUser(user: Record<string, unknown>) {
  window.localStorage.setItem("allka_user", JSON.stringify(user));
}

/** O polyfill de localStorage do vitest.setup.ts guarda tudo num Map
 * interno — Object.keys(window.localStorage) não enxerga as chaves
 * (ao contrário do localStorage real de navegador). Precisa iterar via
 * .key(i)/.length, que é a API padrão que ele implementa de verdade. */
function findStorageKeyContaining(substring: string): string | undefined {
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.includes(substring)) return key;
  }
  return undefined;
}

function Probe() {
  const basket = useProjectBasket();
  return (
    <div>
      <span data-testid="count">{basket.items.length}</span>
      <button onClick={() => basket.addItem({ id: "prod-1", name: "Produto", finalPrice: 100, category: "x" })}>
        adicionar
      </button>
      <button onClick={() => basket.clearBasket()}>limpar</button>
    </div>
  );
}

function renderForAccount() {
  return render(
    <ProjectBasketProvider>
      <Probe />
    </ProjectBasketProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("ProjectBasketProvider — isolamento por conta/usuário", () => {
  it("limpar a cesta da conta A não apaga a cesta já salva da conta B", async () => {
    // Conta B já tem itens salvos sob a própria chave de armazenamento.
    setLoggedUser({ id: "user-b", agency_id: "agency-b" });
    const user = userEvent.setup();
    const { unmount } = renderForAccount();
    await user.click(screen.getByText("adicionar"));
    expect(screen.getByTestId("count").textContent).toBe("1");
    unmount();

    const keyB = findStorageKeyContaining("agency-b");
    expect(keyB).toBeTruthy();
    const savedB = window.localStorage.getItem(keyB!);
    expect(savedB).toContain("prod-1");

    // Troca para a conta A (chave diferente, pois agencyId muda) e limpa a
    // cesta dela — a cesta da conta B, salva sob outra chave, não é tocada.
    setLoggedUser({ id: "user-a", agency_id: "agency-a" });
    render(
      <ProjectBasketProvider>
        <Probe />
      </ProjectBasketProvider>,
    );
    await user.click(screen.getByText("adicionar"));
    await user.click(screen.getByText("limpar"));

    const keyA = findStorageKeyContaining("agency-a");
    expect(keyA).toBeTruthy();
    expect(keyA).not.toBe(keyB);

    // A cesta da conta B permanece exatamente como estava.
    expect(window.localStorage.getItem(keyB!)).toBe(savedB);
  });
});
