import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Tabs } from "@/components/ui/tabs";
import { PROJECT_TABS, ProjectTabsList } from "./project-tabs-list";

// O jsdom não mede layout: o tamanho real foi conferido no navegador (390/768/1480 px). Aqui fica travada a regra:
// no desktop a grade de 9 colunas de sempre; abaixo de 1024 px as abas quebram em linhas e a margem lateral encolhe no celular.
describe("abas da tela do projeto", () => {
  it("mantém as 9 abas na mesma ordem e a grade do desktop", () => {
    render(<Tabs value="faturamento"><ProjectTabsList /></Tabs>);
    const list = screen.getByTestId("project-tabs");
    expect(within(list).getAllByRole("tab").map((t) => t.textContent)).toEqual(PROJECT_TABS.map((t) => t.label));
    expect(within(list).getByRole("tab", { name: "Faturamento" })).toHaveAttribute("data-state", "active");
    expect(list).toHaveClass("grid", "w-max", "grid-cols-9");
    expect(screen.getByTestId("project-tabs-bar")).toHaveClass("px-[50px]");
  });

  it("abaixo de 1024 px quebra em linhas (sem a faixa de ~1.200 px que exigia rolagem lateral)", () => {
    render(<Tabs value="dashboard"><ProjectTabsList /></Tabs>);
    expect(screen.getByTestId("project-tabs")).toHaveClass("max-lg:flex", "max-lg:flex-wrap", "max-lg:w-full");
    expect(screen.getByTestId("project-tabs-bar")).toHaveClass("max-md:px-3");
  });
});
