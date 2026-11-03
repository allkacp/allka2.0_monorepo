import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("react-router-dom", () => ({ useParams: () => ({ token: "signed-test-link" }) }));
import AgencyClientPayment from "./agency-client-payment";
const fixture = { code: "QA-001", total: 120, paid: false, sandbox: true, items: [{ name: "Serviço contratado", total: 120 }] };
const request = vi.fn();
const response = (body: any, ok = true) => ({ ok, json: async () => body });
beforeEach(() => { request.mockReset(); vi.stubGlobal("fetch", request); });
afterEach(() => vi.unstubAllGlobals());

describe("Link do cliente final", () => {
  it("mostra apenas total comercial e confirma sandbox sem login", async () => {
    request.mockResolvedValueOnce(response(fixture)).mockResolvedValueOnce(response({ paid: true })).mockResolvedValueOnce(response({ ...fixture, paid: true }));
    const user = userEvent.setup(); render(<AgencyClientPayment />);
    await user.click(await screen.findByRole("button", { name: "Simular pagamento" }));
    await screen.findByRole("status");
    expect(request.mock.calls[1][1]).toEqual(expect.objectContaining({ credentials: "omit", method: "POST", body: JSON.stringify({ card_last_digits: "4242" }) }));
    expect(screen.queryByText(/comissão/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simular pagamento" })).not.toBeInTheDocument();
  });
  it("mostra recusa e mantém opção de nova tentativa", async () => {
    request.mockResolvedValueOnce(response(fixture)).mockResolvedValueOnce(response({ error: "Cartão recusado pelo sandbox" }, false));
    const user = userEvent.setup(); render(<AgencyClientPayment />);
    await user.selectOptions(await screen.findByRole("combobox", { name: "Cartão de teste" }), "0002");
    await user.click(screen.getByRole("button", { name: "Simular pagamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Cartão recusado");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  // 01/11 (teste do Codex no proj_956): só título e total; quantidade 2, mensal/recorrência e escolhas do SEO
  // não apareciam, e o cabeçalho ficava branco sobre branco fora do portal logado.
  it("mostra quantidade, modalidade, recorrência e opções de cada linha, com cabeçalho legível e sem comissão", async () => {
    request.mockResolvedValueOnce(response({ code: "proj_956", total: 2148.66, paid: false, sandbox: true, items: [
      { name: "SEO — Otimização para Buscadores", total: 1540.22, modality: "avulso", period_months: null, quantity: 1, delivery_groups: [1], options: ["Quantidade de páginas: Até 10 páginas", "Análise comparativa de concorrentes"] },
      { name: "Manutenção e Alteração de Site", total: 608.44, modality: "mensal", period_months: 1, quantity: 2, delivery_groups: [2], options: [] },
    ] }));
    render(<AgencyClientPayment />);
    expect(await screen.findByText("Avulso — pagamento único, sem renovação automática.")).toBeInTheDocument();
    expect(screen.getByText("Opções contratadas: Quantidade de páginas: Até 10 páginas · Análise comparativa de concorrentes")).toBeInTheDocument();
    expect(screen.getByText("Quantidade: 2 · entregues juntas")).toBeInTheDocument();
    expect(screen.getByText("Assinatura mensal — este pagamento cobre o primeiro mês; a assinatura renova a cada mês.")).toBeInTheDocument();
    const header = screen.getByRole("heading", { name: "Pagamento da contratação" }).closest("header")!;
    expect(header.getAttribute("style")).toContain("var(--app-brand-gradient, linear-gradient(");
    expect(header.className).toContain("text-white");
    expect(screen.queryByText(/comissão|custo/i)).not.toBeInTheDocument();
  });
  it("não oferece simulação fora do sandbox", async () => {
    request.mockResolvedValue(response({ ...fixture, sandbox: false })); render(<AgencyClientPayment />);
    await screen.findByText(/Pagamento real ainda não habilitado/);
    expect(screen.queryByRole("button", { name: "Simular pagamento" })).not.toBeInTheDocument();
  });
});
