import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = { updateCatalog2VersionInfo: vi.fn().mockResolvedValue({}), getWorkCalendar: vi.fn().mockResolvedValue({ business_hours_per_day: 8, work_days: [1, 2, 3, 4, 5], start_time: "09:00", end_time: "18:00" }) };
vi.mock("@/lib/api-client", () => ({ apiClient: new Proxy({}, { get: (_t, k: string) => (api as any)[k] }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ sidebarWidth: 72 }) }));
import { DeadlineBaseField } from "./product-editor";

const act = vi.fn(async (fn: any) => { await fn(); });
const version = (hours: number | null) => ({ id: "v1", state: "rascunho", base_commercial_deadline_hours: hours, tasks: [] });
const mount = (hours: number | null = 720) => render(<DeadlineBaseField version={version(hours)} act={act} ringOf={() => ""} locked={false} compact />);
const input = () => screen.getByTestId("deadline-unit").parentElement!.querySelector("input") as HTMLInputElement;
const unit = () => screen.getByTestId("deadline-unit") as HTMLSelectElement;

beforeEach(() => { act.mockClear(); api.updateCatalog2VersionInfo.mockClear(); });

// R21-15 (reunião 21/10): prazo comercial em minutos, horas ou dias, com conversão automática para HORAS (o que é guardado).
describe("Prazo comercial · seletor de unidade", () => {
  it("começa em horas e troca o valor ao mudar de unidade (720 h = 30 dias = 43200 min)", () => {
    mount(720);
    expect(unit().value).toBe("h");
    expect(input().value).toBe("720");
    fireEvent.change(unit(), { target: { value: "d" } });
    expect(input().value).toBe("30");
    fireEvent.change(unit(), { target: { value: "min" } });
    expect(input().value).toBe("43200");
    fireEvent.change(unit(), { target: { value: "h" } });
    expect(input().value).toBe("720");
  });

  it("dias digitados viram horas: 2 dias = 48 h, e o aviso explica a conversão", async () => {
    mount(720);
    fireEvent.change(unit(), { target: { value: "d" } });
    fireEvent.change(input(), { target: { value: "2" } });
    expect(screen.getByTestId("deadline-conversion").textContent).toContain("2 dia(s) = 48 h");
    fireEvent.blur(input());
    await waitFor(() => expect(api.updateCatalog2VersionInfo).toHaveBeenCalledWith("v1", { base_commercial_deadline_hours: 48 }));
  });

  it("minutos sobem para a hora inteira seguinte: 90 min = 2 h; 30 min = 1 h", async () => {
    mount(720);
    fireEvent.change(unit(), { target: { value: "min" } });
    fireEvent.change(input(), { target: { value: "90" } });
    expect(screen.getByTestId("deadline-conversion").textContent).toContain("90 min = 2 h");
    fireEvent.change(input(), { target: { value: "30" } });
    expect(screen.getByTestId("deadline-conversion").textContent).toContain("30 min = 1 h");
    fireEvent.blur(input());
    await waitFor(() => expect(api.updateCatalog2VersionInfo).toHaveBeenCalledWith("v1", { base_commercial_deadline_hours: 1 }));
  });

  it("em horas continua exigindo número inteiro (1,5 h não vale)", () => {
    mount(720);
    fireEvent.change(input(), { target: { value: "1.5" } });
    fireEvent.blur(input());
    expect(api.updateCatalog2VersionInfo).not.toHaveBeenCalled();
  });
});
