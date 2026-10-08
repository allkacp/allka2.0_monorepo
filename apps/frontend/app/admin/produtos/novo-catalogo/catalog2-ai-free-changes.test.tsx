import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const set = vi.fn();
vi.mock("@/lib/api-client", () => ({ apiClient: { setCatalog2ProductAiFreeChanges: (...a: unknown[]) => set(...a) } }));
import { AiFreeChangesCard, parseFreeChanges } from "./catalog2-ai-free-changes";

beforeEach(() => { set.mockReset(); set.mockResolvedValue({ id: "p1", ai_free_changes: 2 }); });

describe("alterações por IA grátis no produto (P-11)", () => {
  it("valida o número: vazio = regra global, inteiro 0..100", () => {
    expect(parseFreeChanges("")).toEqual({ ok: true, value: null });
    expect(parseFreeChanges(" 3 ")).toEqual({ ok: true, value: 3 });
    expect(parseFreeChanges("0")).toEqual({ ok: true, value: 0 });
    expect(parseFreeChanges("1,5").ok).toBe(false);
    expect(parseFreeChanges("-1").ok).toBe(false);
    expect(parseFreeChanges("101").ok).toBe(false);
  });
  it("salva ao sair do campo e mostra o resultado; número inválido não chama o servidor", async () => {
    render(<AiFreeChangesCard product={{ id: "p1", ai_free_changes: null }} />);
    const input = screen.getByLabelText("Alterações por IA grátis");
    fireEvent.change(input, { target: { value: "x" } }); fireEvent.blur(input);
    expect(await screen.findByText(/número inteiro/)).toBeTruthy();
    expect(set).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "2" } }); fireEvent.blur(input);
    await waitFor(() => expect(set).toHaveBeenCalledWith("p1", 2));
    expect(await screen.findByText("Salvo.")).toBeTruthy();
    fireEvent.change(input, { target: { value: "" } }); fireEvent.blur(input);
    await waitFor(() => expect(set).toHaveBeenLastCalledWith("p1", null));
    expect(await screen.findByText("Usando a regra global.")).toBeTruthy();
  });
  it("sem produto salvo o campo fica desabilitado", () => {
    render(<AiFreeChangesCard product={null} readOnly />);
    expect((screen.getByLabelText("Alterações por IA grátis") as HTMLInputElement).disabled).toBe(true);
  });
});
