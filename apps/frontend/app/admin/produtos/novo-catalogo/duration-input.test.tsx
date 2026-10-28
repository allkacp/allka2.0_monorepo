import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { BusinessHoursInput, DurationInput } from "./duration-input";

beforeEach(() => window.localStorage.clear());

function Biz({ start = "" }: { start?: string }) {
  const [v, setV] = useState(start);
  return <><BusinessHoursInput ariaLabel="Prazo" value={v} onChange={setV} hoursPerDay={8} unitKey="t" /><output data-testid="stored">{v}</output></>;
}

describe("prazo em horas úteis com minutos, horas ou dias", () => {
  it("em horas guarda o número; em dias converte pelo expediente e mostra a tradução; em minutos sobe para a hora cheia", () => {
    render(<Biz />);
    const input = screen.getByLabelText("Prazo") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "24" } });
    expect(screen.getByTestId("stored").textContent).toBe("24");
    expect(screen.getByTestId("business-hours-note").textContent).toMatch(/3 dias úteis/);
    fireEvent.change(screen.getByLabelText("Unidade — Prazo"), { target: { value: "d" } });
    expect((screen.getByLabelText("Prazo") as HTMLInputElement).value).toBe("3"); // 24 h = 3 dias úteis: o campo mostra na unidade escolhida
    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2" } });
    expect(screen.getByTestId("stored").textContent).toBe("16");
    expect(screen.getByTestId("business-hours-note").textContent).toMatch(/2 dias úteis = 16 h úteis/);
    fireEvent.change(screen.getByLabelText("Unidade — Prazo"), { target: { value: "min" } });
    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "30" } });
    expect(screen.getByTestId("stored").textContent).toBe("1");
    expect(screen.getByTestId("business-hours-note").textContent).toMatch(/hora cheia/);
  });
  it("a unidade escolhida permanece (volta igual ao reabrir) e vazio fica vazio", () => {
    const { unmount } = render(<Biz start="16" />);
    fireEvent.change(screen.getByLabelText("Unidade — Prazo"), { target: { value: "d" } });
    unmount();
    render(<Biz start="16" />);
    expect((screen.getByLabelText("Prazo") as HTMLInputElement).value).toBe("2");
    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "" } });
    expect(screen.getByTestId("stored").textContent).toBe("");
  });
  it("horas estimadas da etapa: 1 minuto vira 1/60 de hora e continua aparecendo como 1 min", () => {
    const seen = vi.fn();
    function Est() { const [v, setV] = useState(""); seen(v); return <DurationInput value={v} onChange={setV} ariaLabel="Horas" />; }
    render(<Est />);
    fireEvent.change(screen.getByLabelText("Unidade — Horas"), { target: { value: "min" } });
    fireEvent.change(screen.getByLabelText("Horas"), { target: { value: "1" } });
    expect(Number(seen.mock.calls.at(-1)![0]) * 60).toBeCloseTo(1, 6);
    expect((screen.getByLabelText("Horas") as HTMLInputElement).value).toBe("1");
  });
});
