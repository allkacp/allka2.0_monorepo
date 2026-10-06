import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FieldHelpLayer } from "./field-help-layer";
import { helpFor, HELP_KEYS } from "./field-help";

describe("ajuda por campo (ícone i)", () => {
  it("helpFor ignora acento, maiúscula, dois-pontos, asterisco e (opcional)", () => {
    expect(helpFor("Título comercial *")).toMatch(/nome do produto/i);
    expect(helpFor("Exemplo de evidência (opcional)")).toBeTruthy();
    expect(helpFor("Quando começa:")).toBeTruthy();
    expect(helpFor("Campo que não existe")).toBeNull();
    expect(HELP_KEYS.length).toBeGreaterThan(150);
  });

  it("coloca o ícone ao lado do rótulo, não mexe em botões e mostra o texto ao passar o mouse", async () => {
    const { container } = render(
      <FieldHelpLayer>
        <label>Prazo comercial base<input aria-label="horas" /></label>
        <button type="button">Quando começa</button>
        <span>Texto solto sem ajuda</span>
      </FieldHelpLayer>,
    );
    await waitFor(() => expect(container.querySelectorAll(".field-info").length).toBe(1));
    const icon = container.querySelector(".field-info") as HTMLElement;
    expect(icon.previousSibling?.nodeValue).toBe("Prazo comercial base");
    fireEvent.mouseOver(icon);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(/24 h = 1 dia/);
    fireEvent.mouseOut(icon);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });
});
