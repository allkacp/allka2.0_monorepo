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
    fireEvent.click(screen.getByLabelText("Agency Partner"));
    expect(api.setCatalog2ProductVisibility).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledTimes(1);
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledWith("p1", ["partner"], []);
    expect(onDone).toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledTimes(1);
  });

  it("várias marcações seguidas viram UMA gravação (espera o usuário terminar) e os níveis cadastrados entram junto", async () => {
    render(<AudienceCard product={{ id: "p2", visibility_mode: "all", visibility_agency_levels: null }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    fireEvent.click(screen.getByLabelText("Agency (sem partner)"));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    fireEvent.click(screen.getByLabelText("Elite"));
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledTimes(1);
    expect(api.setCatalog2ProductVisibility).toHaveBeenCalledWith("p2", ["agency"], ["elite"]);
  });

  it("somente leitura nunca grava", async () => {
    render(<AudienceCard product={{ id: "p3", visibility_mode: "all" }} readOnly />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(api.setCatalog2ProductVisibility).not.toHaveBeenCalled();
  });
});
