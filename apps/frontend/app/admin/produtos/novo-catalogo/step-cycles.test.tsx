import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StepCyclesSection, cyclesProblem, cyclesSummary, generateCycles } from "./step-cycles";
import { stepSummaryRows } from "./step-details-summary";

function Harness({ initial = {} as any }) {
  const [ops, setOps] = useState<any>(initial);
  return <><StepCyclesSection ops={ops} setOps={(p) => setOps((o: any) => ({ ...o, ...p }))} readOnly={false} /><output data-testid="ops">{JSON.stringify(ops)}</output></>;
}
const ops = () => JSON.parse(screen.getByTestId("ops").textContent!);

describe("Etapa em ciclos (cadastro ciclo a ciclo)", () => {
  it("gera os períodos como no exemplo: 30 dias em ciclos de 7 → 1–7, 8–14, 15–21, 22–28, 29–30", () => {
    expect(generateCycles(7, 30, 2).map((x) => [x.from_day, x.to_day])).toEqual([[1, 7], [8, 14], [15, 21], [22, 28], [29, 30]]);
    expect(generateCycles(10, 5)).toEqual([]);
  });
  it("aponta o problema de cada ciclo e resume em linguagem simples", () => {
    expect(cyclesProblem({ items: [] })).toMatch(/ao menos um ciclo/);
    expect(cyclesProblem({ items: [{ from_day: 1, to_day: 7, approval_window_days: 2 }, { from_day: 7, to_day: 14, approval_window_days: 2 }] })).toMatch(/Ciclo 2.*não podem se sobrepor/);
    expect(cyclesProblem({ items: [{ from_day: 1, to_day: 7, approval_window_days: 0 }] })).toMatch(/Ciclo 1.*prazo de aprovação/);
    expect(cyclesProblem({ items: generateCycles(7, 30, 2) })).toBeNull();
    expect(cyclesSummary({ items: generateCycles(7, 30, 2) })).toMatch(/5 ciclos em 30 dias.*2 dia\(s\) útil\(eis\)/);
    expect(cyclesSummary(null)).toBe("");
  });
  it("ligar cria os ciclos padrão; cada ciclo se edita (datas, prazo, horas, regra); dá para adicionar e remover; desligar remove tudo", () => {
    render(<Harness />);
    expect(screen.queryByTestId("step-cycles-list")).toBeNull();
    fireEvent.click(screen.getByTestId("step-cycles-toggle"));
    expect(ops().cycles.items).toHaveLength(5);
    expect(screen.getAllByTestId("step-cycle-row")).toHaveLength(5);
    fireEvent.change(screen.getByLabelText("Ciclo 2: prazo de aprovação (dias úteis)"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Ciclo 1: regra"), { target: { value: "Relatório da 1ª semana" } });
    fireEvent.change(screen.getByLabelText("Ciclo 1: horas"), { target: { value: "5" } });
    expect(ops().cycles.items[1].approval_window_days).toBe(3);
    expect(ops().cycles.items[0]).toMatchObject({ rule: "Relatório da 1ª semana", hours: 5 });
    fireEvent.click(screen.getByTestId("step-cycle-add"));
    expect(ops().cycles.items[5]).toEqual({ from_day: 31, to_day: 37, approval_window_days: 2 }); // continua depois do último, mesmo tamanho
    fireEvent.click(screen.getByLabelText("Remover o ciclo 6"));
    expect(ops().cycles.items).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Quinzenal" }));
    expect(ops().cycles.items.map((x: any) => [x.from_day, x.to_day])).toEqual([[1, 15], [16, 30]]);
    fireEvent.click(screen.getByTestId("step-cycles-toggle"));
    expect(ops().cycles).toBeUndefined();
  });
  it("mostra o erro quando dois ciclos se sobrepõem", () => {
    render(<Harness initial={{ cycles: { items: [{ from_day: 1, to_day: 7, approval_window_days: 2 }, { from_day: 5, to_day: 10, approval_window_days: 2 }] } }} />);
    expect(screen.getByTestId("step-cycles-error").textContent).toMatch(/Ciclo 2/);
    expect(screen.queryByTestId("step-cycles-preview")).toBeNull();
  });
  it("aparece na ficha da etapa (Ver)", () => {
    const rows = stepSummaryRows({ ops: { cycles: { items: generateCycles(7, 30, 2) } } });
    expect(rows.find((x) => x.label === "Ciclos")?.value).toMatch(/5 ciclos em 30 dias/);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
describe("Criar etapa nova pergunta se é em ciclos", () => {
  const src = readFileSync(path.join(__dirname, "product-editor.tsx"), "utf8");
  it("“Criar nova etapa” abre a pergunta; Sim cria a etapa já com os ciclos padrão, Não cria etapa comum", () => {
    expect(src).toMatch(/data-testid="create-new-step"/);
    expect(src).toMatch(/<DropdownMenuItem onClick=\{\(\) => setAskCycles\(true\)\} data-testid="create-new-step">/);
    expect(src).toMatch(/Esta etapa é em ciclos\?/);
    expect(src).toMatch(/startNew\(true\)/);
    expect(src).toMatch(/startNew\(false\)/);
    expect(src).toMatch(/ops: \{ cycles: \{ items: generateCycles\(7, 30, 2\) \} \}/);
  });
});
