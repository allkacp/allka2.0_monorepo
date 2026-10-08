import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = {
  getClientCatalog2RequestQuestionnaire: vi.fn(),
  listClientCatalog2CommercialRequests: vi.fn(),
  createClientCatalog2CommercialRequest: vi.fn(async () => ({ id: "r1", already_existed: false })),
  respondClientCatalog2CommercialRequest: vi.fn(async () => ({})),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { OnRequestBox, missingRequired } from "./catalog2-on-request-box";

const Q = [
  { id: "q1", group: "T", label: "Qual é o objetivo?", is_required: true, question_type: "texto_longo", help_text: null, options: [] },
  { id: "q2", group: "T", label: "Plataformas", is_required: true, question_type: "selecao_multipla", help_text: null, options: [{ value: "Meta", label: "Meta" }, { value: "Google", label: "Google" }] },
  { id: "q3", group: "T", label: "Verba", is_required: false, question_type: "moeda", help_text: null, options: [] },
];

describe("Produto sob consulta (tela do cliente)", () => {
  beforeEach(() => { Object.values(api).forEach((f: any) => f.mockClear?.()); api.getClientCatalog2RequestQuestionnaire.mockResolvedValue({ product_id: "p1", questions: Q }); api.listClientCatalog2CommercialRequests.mockResolvedValue({ data: [] }); });

  it("missingRequired lista só o que é obrigatório e está vazio", () => {
    expect(missingRequired(Q as any, { q1: "x" })).toEqual(["Plataformas"]);
    expect(missingRequired(Q as any, { q1: "x", q2: ["Meta"] })).toEqual([]);
  });

  it("só habilita o envio com as obrigatórias respondidas e manda as respostas ao servidor", async () => {
    render(<OnRequestBox productId="slug" selection={{ quantity: 1 }} period={null} />);
    await screen.findByText(/peça um orçamento/i);
    const enviar = screen.getByRole("button", { name: "Enviar pedido de orçamento" }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
    expect(screen.getByTestId("missing").textContent).toContain("Qual é o objetivo?");
    fireEvent.change(screen.getByLabelText("Qual é o objetivo? *"), { target: { value: "Vender mais" } });
    fireEvent.click(screen.getByLabelText("Meta"));
    expect(enviar.disabled).toBe(false);
    fireEvent.click(enviar);
    await waitFor(() => expect(api.createClientCatalog2CommercialRequest).toHaveBeenCalled());
    expect((api.createClientCatalog2CommercialRequest.mock.calls[0] as any[])[4]).toEqual({ q1: "Vender mais", q2: ["Meta"] });
  });

  it("com pedido em andamento mostra a situação (sem formulário); com proposta enviada o cliente aprova ou recusa", async () => {
    api.listClientCatalog2CommercialRequests.mockResolvedValue({ data: [{ id: "r1", product_id: "p1", status: "proposta_enviada", can_respond: true, proposal: { proposed_price: 7800, proposed_deadline_days: 20, proposal_valid_until: "2030-01-01T00:00:00Z" } }] });
    render(<OnRequestBox productId="slug" selection={{}} />);
    expect((await screen.findByTestId("request-status")).textContent).toBe("Proposta enviada");
    expect(screen.getByTestId("proposal").textContent).toMatch(/7\.800,00/);
    expect(screen.queryByRole("button", { name: "Enviar pedido de orçamento" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Aprovar proposta/ }));
    await waitFor(() => expect(api.respondClientCatalog2CommercialRequest).toHaveBeenCalledWith("r1", "aprovar", undefined));
  });

  it("proposta ainda em preparo não mostra valor nem botões de resposta", async () => {
    api.listClientCatalog2CommercialRequests.mockResolvedValue({ data: [{ id: "r2", product_id: "p1", status: "em_analise", can_respond: false, proposal: null }] });
    render(<OnRequestBox productId="slug" selection={{}} />);
    expect((await screen.findByTestId("request-status")).textContent).toBe("Em análise");
    expect(screen.queryByTestId("proposal")).toBeNull();
    expect(screen.queryByRole("button", { name: /Aprovar proposta/ })).toBeNull();
  });
});
