import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskSummaryCard, summarizeTask } from "./task-summary";

const specialties = [{ id: "sp1", name: "Designer" }, { id: "sp2", name: "Gestor de tráfego" }, { id: "sp3", name: "Redator IA" }];
const steps = (list: any[]) => list.map((s, i) => ({ id: `s${i}`, sort_order: i + 1, name: `Passo ${i + 1}`, ...s }));

describe("resumo da tarefa vem das etapas", () => {
  it("todas as etapas humanas → Humano; a especialidade vem de cada etapa", () => {
    const s = summarizeTask({ execution_mode: "humano", steps: steps([{ execution_mode: "humano", specialty_id: "sp1" }, { execution_mode: "humano", specialty_id: "sp2" }]) }, specialties);
    expect(s.executorLabel).toBe("Humano");
    expect(s.specialties).toEqual(["Designer", "Gestor de tráfego"]);
  });
  it("etapa com IA e outra humana → Misto, e o detalhe diz o que cada etapa faz", () => {
    const s = summarizeTask({ execution_mode: "humano", steps: steps([{ execution_mode: "humano", specialty_id: "sp1" }, { execution_mode: "ia" }]) }, specialties);
    expect(s.executorLabel).toBe("Misto (Humano + IA)");
    expect(s.executorHelp).toBe("Etapa 1 — Passo 1: Humano\nEtapa 2 — Passo 2: IA");
    expect(s.specialtiesHelp).toContain("Etapa 2 — Passo 2: sem especialidade");
  });
  it("etapa 'Humano ou IA' mostra as duas especialidades (humana + IA)", () => {
    const s = summarizeTask({ execution_mode: "hibrido", steps: steps([{ execution_mode: "hibrido", specialty_id: "sp1", ai_specialty_id: "sp3" }]) }, specialties);
    expect(s.executorLabel).toBe("Híbrido");
    expect(s.specialtiesHelp).toBe("Etapa 1 — Passo 1: Designer + Redator IA");
  });
  it("dado antigo sem executor nas etapas herda o da tarefa; etapa sem especialidade usa a da tarefa", () => {
    const s = summarizeTask({ execution_mode: "ia", specialty: { name: "Copywriter" }, steps: steps([{}, {}]) }, specialties);
    expect(s.executorLabel).toBe("IA");
    expect(s.specialties).toEqual(["Copywriter"]);
  });
  it("o cartão é o resumo único: executor, especialidades e as métricas das etapas, sem nenhum campo editável", () => {
    render(<TaskSummaryCard specialties={specialties} metrics={[{ label: "Horas das etapas", value: "4 h" }, { label: "Prazo pelas etapas", value: "4 h úteis" }, { label: "Custo total estimado", value: "R$ 120,00" }]}
      task={{ execution_mode: "humano", steps: steps([{ execution_mode: "ia" }, { execution_mode: "humano", specialty_id: "sp1" }]) }} />);
    expect(screen.getByTestId("task-summary-executor").textContent).toMatch(/Misto/);
    expect(screen.getByTestId("task-summary-card").textContent).toMatch(/Horas das etapas\s*4 h/);
    expect(screen.getByTestId("task-summary-card").textContent).toMatch(/Prazo pelas etapas\s*4 h úteis/);
    expect(screen.getByTestId("task-summary-card").textContent).toMatch(/Custo total estimado\s*R\$ 120,00/);
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
