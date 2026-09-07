import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccountTypeProvider, useAccountType } from "@/contexts/account-type-context";

function Probe() {
  const { accountType } = useAccountType();
  return <output data-testid="account-type">{accountType}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AccountTypeProvider>
        <Probe />
      </AccountTypeProvider>
    </MemoryRouter>,
  );
}

afterEach(() => localStorage.clear());

describe("AccountTypeProvider — sessão em rotas compartilhadas", () => {
  it("mantém o portal do Nômade em /allkademy; a rota sem prefixo nunca pode cair no shell admin", () => {
    localStorage.setItem("allka_token", "test-token");
    localStorage.setItem("allka_user", JSON.stringify({ account_type: "nomades", role: "nomad" }));

    renderAt("/allkademy");

    expect(screen.getByTestId("account-type")).toHaveTextContent("nomades");
  });

  it("usa a inferência da rota somente quando não há sessão autenticada", () => {
    renderAt("/nomades/minhastarefas");
    expect(screen.getByTestId("account-type")).toHaveTextContent("nomades");
  });
});
