import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepDetailsSummary, stepSummaryRows } from "./step-details-summary";

const step = {
  executor_kind: "nomad", requires_qualification: true, qualifier_kind: "leader_person", approval_hours: 24, ai_free_changes: 2,
  completion_criteria: "Campanha publicada e conferida", release_next_auto: true,
  ops: { ai_prompt: "Crie 3 variações", checklist: [{ id: 1 }, { id: 2 }], evidence_types: ["print", "link"], access_keys: ["meta-ads"] },
};

describe("ficha compacta da etapa (somente leitura)", () => {
  it("lista só o que está configurado", () => {
    const labels = stepSummaryRows(step).map((r) => r.label);
    expect(labels).toEqual(expect.arrayContaining(["Quem executa", "Qualificação", "Aprovação do cliente", "Checklist", "Evidências", "Acessos", "Prompt da IA"]));
    expect(labels).not.toContain("Prazo de refação");
  });
  it("etapa Humano ou IA mostra as duas configurações de qualificação", () => {
    const rows = stepSummaryRows({ execution_mode: "hibrido", requires_qualification: false, qualifier_kind: "leader", ops: { ai_qualifier_kind: "person" } });
    expect(rows.find((r) => r.label === "Qualificação (se humano executar)")?.value).toBe("Sem qualificação");
    expect(rows.find((r) => r.label === "Qualificação (se a IA executar)")?.value).toBe("Pessoa específica");
  });
  it("mostra tudo como texto, sem campos para preencher", () => {
    render(<StepDetailsSummary step={step} />);
    const txt = screen.getByTestId("step-details-summary").textContent ?? "";
    expect(txt).toMatch(/Checklisti2 itens/);
    // todo item da ficha tem o "i" com explicação detalhada
    const rowsCount = stepSummaryRows(step).length;
    expect(document.querySelectorAll("[data-testid=step-details-summary] .field-info").length).toBe(rowsCount);
    document.querySelectorAll("[data-testid=step-details-summary] .field-info").forEach((el) => expect((el.getAttribute("data-help") ?? "").length).toBeGreaterThan(30));
    expect(txt).toMatch(/Crie 3 variações/);
    expect(txt).toMatch(/Campanha publicada/);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
