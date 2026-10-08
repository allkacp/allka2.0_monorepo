import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/api-client", () => ({ apiClient: {} }));
import { CommercialFieldsCard } from "./catalog2-commercial-ui";

const version = { id: "v1", included_items: ["Plano de mídia"], excluded_items: [], client_requirements: [], deliverables_summary: [], field_visibility: {} };

describe("Informações comerciais · itens e requisitos (C5/C6, P-7)", () => {
  it("os acordeões de Itens e Requisitos carregam FECHADOS e abrem ao clicar no título", () => {
    render(<CommercialFieldsCard version={version} readOnly={false} onSave={async () => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Informações comerciais/ }));
    const detalhes = Array.from(document.querySelectorAll("details"));
    expect(detalhes.length).toBe(2);
    detalhes.forEach((d) => expect(d.open).toBe(false)); // P-7: fechados por padrão
    // o título é clicável (não bloqueia o clique)
    const resumo = detalhes[0].querySelector("summary") as HTMLElement;
    const evento = new MouseEvent("click", { bubbles: true, cancelable: true });
    resumo.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
  });

  it("o campo NÃO é recriado a cada tecla: continua o mesmo elemento (não perde o foco) e a seção aberta continua aberta", async () => {
    render(<CommercialFieldsCard version={version} readOnly={false} onSave={async () => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Informações comerciais/ }));
    document.querySelectorAll("details").forEach((d) => { d.open = true; });
    fireEvent.click(screen.getAllByRole("button", { name: /Adicionar item/ })[0]);
    const antes = screen.getByLabelText("Itens incluídos 2");
    antes.focus();
    fireEvent.change(antes, { target: { value: "Relatório" } });
    fireEvent.change(antes, { target: { value: "Relatório mensal" } });
    const depois = screen.getByLabelText("Itens incluídos 2");
    expect(depois).toBe(antes); // mesma instância de DOM: não houve remontagem
    expect((depois as HTMLInputElement).value).toBe("Relatório mensal");
    expect(document.activeElement).toBe(depois);
    document.querySelectorAll("details").forEach((d) => expect(d.open).toBe(true));
  });

  it("listas longas rolam dentro do cartão (barra de rolagem), sem esticar a tela", () => {
    render(<CommercialFieldsCard version={{ ...version, included_items: Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`) }} readOnly={false} onSave={async () => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Informações comerciais/ }));
    const lista = screen.getByTestId("list-scroll-included_items");
    expect(lista.className).toMatch(/max-h-/);
    expect(lista.className).toMatch(/overflow-y-auto/);
  });
});
