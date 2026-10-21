import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const api = {
  setCatalog2ProductVisibility: vi.fn(async () => ({ ok: true })),
  getCatalog2AgencyLevels: vi.fn(async () => ({ data: [{ key: "bronze", name: "Bronze" }, { key: "gold", name: "Gold" }, { key: "elite", name: "Elite" }] })),
};
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
import { AudienceCard } from "./catalog2-audience-ui";

describe("Público do produto: salva sozinho (P-4)", () => {
  beforeEach(() => { vi.useFakeTimers(); api.setCatalog2ProductVisibility.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("marcar um público e esperar: grava sem precisar clicar em salvar; a mesma marcação não grava duas vezes", async () => {
    const onDone = vi.fn();
    render(<AudienceCard product={{ id: "p1", visibility_mode: "all", visibility_agency_levels: null }} onDone={onDone} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); }); // carrega os níveis cadastrados
    fireEvent.click(screen.getByLabelText("Agency Partner")); // desmarca o partner (começa com os três marcados)
    expect(api.setCatalog2ProductVisibility).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledTimes(1);
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledWith("p1", ["company", "agency"], []);
    expect(onDone).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledTimes(1);
  });

  it("várias marcações seguidas viram UMA gravação (espera o usuário terminar) e os níveis cadastrados entram junto", async () => {
    render(<AudienceCard product={{ id: "p2", visibility_mode: "all", visibility_agency_levels: null }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    fireEvent.click(screen.getByLabelText("Company")); // fica agency + partner
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    fireEvent.click(screen.getByLabelText("Elite"));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledTimes(1);
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledWith("p2", ["agency", "partner"], ["elite"]);
  });

  it("dentro do editor: não salva sozinho, sem botão próprio; grava só quando o editor pede (Salvar rascunho)", async () => {
    let flush: () => Promise<void> = async () => {};
    const registerFlush = (fn: () => Promise<void>) => { flush = fn; return () => {}; };
    render(<AudienceCard product={{ id: "p4", visibility_mode: "all", visibility_agency_levels: null }} registerFlush={registerFlush} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    fireEvent.click(screen.getByLabelText("Agency (sem partner)"));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(api.setCatalog2ProductVisibility).not.toHaveBeenCalled();
    expect(screen.queryByText("Salvar agora")).toBeNull();
    await act(async () => { await flush(); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledTimes(1);
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledWith("p4", ["company", "partner"], []);
  });

  it("\"Todos\" é um atalho que marca os três públicos de cliente; limpar tudo avisa e não grava vazio", async () => {
    render(<AudienceCard product={{ id: "p5", visibility_mode: "company" }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    const todos = screen.getByLabelText("Todos") as HTMLInputElement;
    expect(todos.checked).toBe(false); // só Company marcado
    fireEvent.click(todos); // marca Company + Agency + Agency Partner
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledWith("p5", ["company", "agency", "partner"], []);
    api.setCatalog2ProductVisibility.mockClear();
    fireEvent.click(todos); // desmarcar o Todos limpa as três
    expect(screen.getByRole("alert").textContent).toContain("ao menos um público");
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(api.setCatalog2ProductVisibility).not.toHaveBeenCalled(); // vazio nunca é gravado
  });

  it("somente leitura nunca grava", async () => {
    render(<AudienceCard product={{ id: "p3", visibility_mode: "all" }} readOnly />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(api.setCatalog2ProductVisibility).not.toHaveBeenCalled();
  });
});
