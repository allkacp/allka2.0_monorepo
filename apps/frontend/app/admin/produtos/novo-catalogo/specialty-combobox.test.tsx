import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpecialtyCombobox } from "./specialty-combobox";

const list = [
  { id: "h1", name: "Designer Gráfico", execution_kind: "humano", max_hourly_rate: 50 },
  { id: "h2", name: "Gestor de Tráfego", execution_kind: "humano", max_hourly_rate: 60 },
  { id: "i1", name: "IA de Texto", execution_kind: "ia", max_hourly_rate: 5 },
  { id: "x1", name: "Redator ou IA", execution_kind: "hibrido", max_hourly_rate: 20 },
];
const open = () => fireEvent.click(screen.getByRole("button", { expanded: false }));
const names = () => screen.getAllByRole("option").map((o) => o.getAttribute("title"));

describe("especialidade da etapa: filtrada pelo executor e com busca", () => {
  it("humano mostra só as humanas; IA só as de IA; humano ou IA mostra todas", () => {
    const { rerender } = render(<SpecialtyCombobox specialties={list} mode="humano" value="" onChange={() => {}} />);
    open(); expect(names()).toEqual(["Designer Gráfico", "Gestor de Tráfego"]);
    rerender(<SpecialtyCombobox specialties={list} mode="ia" value="" onChange={() => {}} />);
    expect(names()).toEqual(["IA de Texto"]);
    rerender(<SpecialtyCombobox specialties={list} mode="hibrido" value="" onChange={() => {}} />);
    expect(names()).toEqual(["Designer Gráfico", "Gestor de Tráfego", "IA de Texto"]); // o tipo antigo "humano ou IA" não aparece mais
  });
  it("não oferece mais 'usa a da tarefa'; digitar afunila a lista e clicar escolhe", () => {
    const onChange = vi.fn();
    render(<SpecialtyCombobox specialties={list} mode="hibrido" value="" onChange={onChange} />);
    expect(screen.queryByText(/da tarefa/)).toBeNull();
    open();
    fireEvent.change(screen.getByLabelText("Buscar especialidade"), { target: { value: "graf" } });
    expect(names()).toEqual(["Designer Gráfico"]);
    fireEvent.click(screen.getByRole("option"));
    expect(onChange).toHaveBeenCalledWith("h1");
  });
  it("sem resultado explica; o nome escolhido aparece cortado no campo com o nome inteiro no title", () => {
    render(<SpecialtyCombobox specialties={list} mode="humano" value="h1" onChange={() => {}} />);
    const btn = screen.getByRole("button", { expanded: false });
    expect(btn.getAttribute("title")).toBe("Designer Gráfico");
    expect(btn.querySelector(".truncate")).toBeTruthy();
    fireEvent.click(btn);
    fireEvent.change(screen.getByLabelText("Buscar especialidade"), { target: { value: "zzz" } });
    expect(screen.getByTestId("specialty-empty-hint").textContent).toMatch(/Nenhuma especialidade com esse nome/);
  });
});
