import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/api-client", () => ({ apiClient: {} }));
import { CommercialFieldsCard } from "./catalog2-commercial-ui";

const version = { id: "v1", included_items: ["Plano de mídia"], excluded_items: [], client_requirements: [], deliverables_summary: [], field_visibility: {} };

describe("Informações comerciais · itens incluídos (C5/C6)", () => {
  it("o campo NÃO é recriado a cada tecla: continua o mesmo elemento (não perde o foco) e a seção continua aberta", async () => {
    render(<CommercialFieldsCard version={version} readOnly={false} onSave={async () => {}} />);
    // abre o cartão principal
    fireEvent.click(screen.getByRole("button", { name: /Informações comerciais/ }));
    const detalhes = document.querySelectorAll("details");
    expect(detalhes.length).toBeGreaterThan(0);
    detalhes.forEach((d) => expect(d.open).toBe(true)); // subcampos sempre abertos
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
});
