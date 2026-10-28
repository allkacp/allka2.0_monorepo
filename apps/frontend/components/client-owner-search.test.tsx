import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientOwnerSearch, type ClientOwnerOption } from "./client-owner-search";
import { apiClient } from "@/lib/api-client";
import { formatClientSequenceId } from "@/lib/client-display-id";

vi.mock("@/lib/api-client", () => ({ apiClient: { searchClientOwnerOptions: vi.fn() } }));
const agency: ClientOwnerOption = { id: "a1", kind: "agency", name: "Lamego Academy", category: "Agência Partner" };
const company: ClientOwnerOption = { id: "c1", kind: "company", name: "Loja Teste", category: "Company" };
const search = vi.mocked(apiClient.searchClientOwnerOptions);
beforeEach(() => { search.mockReset(); search.mockResolvedValue({ data: [agency, company], has_more: false }); });
afterEach(cleanup);
describe("Vínculo do cliente por empresa cadastrada", () => {
  it("consulta ao digitar, exibe nome/categoria e só seleciona no clique", async () => {
    const change = vi.fn();
    render(<ClientOwnerSearch value={null} onChange={change} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "L" } });
    expect(await screen.findByRole("option", { name: /Lamego Academy/ })).toHaveTextContent("Agência Partner");
    expect(search).toHaveBeenLastCalledWith("L");
    expect(change).not.toHaveBeenCalled();
    search.mockResolvedValue({ data: [agency], has_more: false });
    fireEvent.change(input, { target: { value: "Lame" } });
    await waitFor(() => expect(screen.queryByRole("option", { name: /Loja/ })).not.toBeInTheDocument());
    const option = await screen.findByRole("option", { name: /Lamego/ });
    expect(search).toHaveBeenLastCalledWith("Lame");
    fireEvent.click(option);
    expect(change).toHaveBeenCalledWith(agency);
  });
  it("buscar e cancelar não removem o vínculo salvo; X remove explicitamente", async () => {
    const change = vi.fn();
    render(<ClientOwnerSearch value={agency} onChange={change} />);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Outra" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByText("Lamego Academy")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover vínculo selecionado" }));
    expect(change).toHaveBeenCalledWith(null);
  });
  it("permite selecionar pelo teclado e mostra o escolhido sem categoria manual", async () => {
    function Harness() { const [value, setValue] = useState<ClientOwnerOption | null>(null); return <ClientOwnerSearch value={value} onChange={setValue} />; }
    render(<Harness />);
    const input = screen.getByRole("combobox"); fireEvent.focus(input);
    await screen.findByRole("option", { name: /Loja Teste/ });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Loja Teste")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
  it("mostra erro de busca sem alterar o cliente", async () => {
    search.mockRejectedValue(new Error("offline")); const change = vi.fn();
    render(<ClientOwnerSearch value={null} onChange={change} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível buscar");
    expect(change).not.toHaveBeenCalled();
  });
  it("resposta atrasada não substitui a busca mais recente", async () => {
    let resolveOld!: (value: { data: ClientOwnerOption[]; has_more: boolean }) => void;
    search.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    render(<ClientOwnerSearch value={null} onChange={vi.fn()} />);
    const input = screen.getByRole("combobox"); fireEvent.focus(input);
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    search.mockResolvedValue({ data: [company], has_more: false });
    fireEvent.change(input, { target: { value: "Loja" } });
    await screen.findByRole("option", { name: /Loja Teste/ });
    resolveOld({ data: [agency], has_more: false });
    await waitFor(() => expect(screen.queryByRole("option", { name: /Lamego/ })).not.toBeInTheDocument());
  });
  it("nenhum resultado e campo desabilitado não criam vínculo", async () => {
    search.mockResolvedValue({ data: [], has_more: false }); const change = vi.fn();
    const view = render(<ClientOwnerSearch value={null} onChange={change} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(await screen.findByText("Nenhuma empresa encontrada.")).toBeInTheDocument();
    view.rerender(<ClientOwnerSearch value={null} onChange={change} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(change).not.toHaveBeenCalled();
  });
  it("exibe sequência pública sem prefixo e preserva números acima de 999", () => {
    expect(formatClientSequenceId(1)).toBe("001");
    expect(formatClientSequenceId(2)).toBe("002");
    expect(formatClientSequenceId(1237)).toBe("1237");
  });
});
