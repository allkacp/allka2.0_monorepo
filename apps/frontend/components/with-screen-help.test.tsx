import { describe, expect, it } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { withScreenHelp, GlobalScreenHelp } from "./with-screen-help";
import { GLOBAL_HELP, SECURE_BROWSER_HELP, INTERNAL_TASKS_HELP, SETTINGS_HELP, PLAC_HELP } from "@/lib/screen-help";
import { lookupHelp, normalizeHelpKey } from "@/app/admin/produtos/novo-catalogo/field-help";

// P-5/P-6 (08/10): ajuda (i) nas telas fora do editor de produto + padrão de campos.
const Form = () => <form><label>Sites permitidos</label><input aria-label="x" /><span>Texto solto sem ajuda</span><textarea aria-label="t" /></form>;

describe("ajuda (i) por tela", () => {
  it("a tela envolvida ganha o ícone (i) só nos campos do seu dicionário, e o texto aparece ao passar o mouse", async () => {
    const Wrapped = withScreenHelp(Form, SECURE_BROWSER_HELP);
    const { container } = render(<Wrapped />);
    await waitFor(() => expect(container.querySelectorAll(".field-info").length).toBe(1));
    const icon = container.querySelector(".field-info") as HTMLElement;
    fireEvent.mouseOver(icon);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(/Somente estes sites abrem/);
    expect(container.querySelector(".screen-std")).toBeTruthy();
  });
  it("a mesma palavra tem ajuda diferente em cada tela (Prazo)", () => {
    expect(lookupHelp(Object.fromEntries(Object.entries(INTERNAL_TASKS_HELP).map(([k, v]) => [normalizeHelpKey(k), v])), "Prazo")).toMatch(/Data limite/);
    expect(lookupHelp(Object.fromEntries(Object.entries(PLAC_HELP).map(([k, v]) => [normalizeHelpKey(k), v])), "Prazo")).toMatch(/calculada pelo plano/);
  });
  it("toda ajuda está escrita (sem vazio) e as telas pedidas têm dicionário", () => {
    for (const d of [SECURE_BROWSER_HELP, INTERNAL_TASKS_HELP, SETTINGS_HELP, PLAC_HELP]) {
      expect(Object.keys(d).length).toBeGreaterThan(5);
      for (const [k, v] of Object.entries(d)) expect(v.length, k).toBeGreaterThan(10);
    }
  });
  it("lookupHelp ignora '(...)' no fim e o que vem depois de ' — ' (rótulos longos do navegador seguro)", () => {
    const d = { [normalizeHelpKey("Validade do login")]: "ok" };
    expect(lookupHelp(d, "Validade do login (min) — depois disso é preciso logar de novo")).toBe("ok");
    expect(lookupHelp(d, "Outra coisa")).toBeNull();
  });

  it("camada geral: qualquer tela ganha (i) em campos comuns (E-mail, CNPJ); a tela com dicionário próprio vence; sem duplicar", async () => {
    const Own = withScreenHelp(() => <label>Prazo</label>, INTERNAL_TASKS_HELP);
    const { container } = render(<GlobalScreenHelp><form><label>E-mail</label><input aria-label="e" /><label>CNPJ</label><span>Ativo</span></form><Own /></GlobalScreenHelp>);
    await waitFor(() => expect(container.querySelectorAll(".field-info").length).toBe(3));
    const helps = Array.from(container.querySelectorAll(".field-info")).map((i) => i.getAttribute("data-help"));
    expect(helps.some((h) => /Data limite para concluir a tarefa/.test(h ?? ""))).toBe(true);
    expect(helps.some((h) => /Data limite para concluir.$/.test(h ?? ""))).toBe(false);
    expect(container.querySelector(".screen-std-global")).toBeTruthy();
  });
  it("dicionário geral: textos escritos e sem valores de dados", () => {
    for (const [k, v] of Object.entries(GLOBAL_HELP)) expect(v.length, k).toBeGreaterThan(10);
    for (const valor of ["Ativo", "Pendente", "Concluído", "Sim", "Não"]) expect(Object.keys(GLOBAL_HELP)).not.toContain(valor);
  });
});
