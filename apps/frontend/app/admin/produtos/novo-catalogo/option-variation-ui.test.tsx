import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const add = vi.fn(async () => ({}));
const del = vi.fn(async () => ({}));
const upload = vi.fn(async () => ({ file: { id: "11111111-1111-4111-8111-111111111111.pdf", name: "modelo.pdf", size: 2048, mime: "application/pdf" } }));
vi.mock("@/lib/api-client", () => ({ apiClient: { addCatalog2OptionEffect: (...a: unknown[]) => (add as any)(...a), deleteCatalog2OptionEffect: (...a: unknown[]) => (del as any)(...a), uploadCatalog2DeliverableFile: (...a: unknown[]) => (upload as any)(...a), downloadCatalog2DeliverableFile: vi.fn() } }));
import { OptionExamples } from "./option-examples-ui";
import { OptionStepAdjustments, extraHoursFor, stepRefsOf } from "./option-step-adjust-ui";

const act = async (fn: () => Promise<any>) => fn();
const version = { tasks: [{ key: "t1", name: "Campanhas", steps: [{ key: "e1", name: "Criar campanhas", sort_order: 1, specialty_id: "sp1" }, { key: "e2", name: "Relatório", sort_order: 2, specialty_id: null }] }] };
const specialties = [{ id: "sp1", name: "Gestor", max_hourly_rate: 50 }];
beforeEach(() => { add.mockClear(); del.mockClear(); upload.mockClear(); });

describe("variação: horas extras por etapa", () => {
  it("lê as horas já cadastradas (horas e minutos) por etapa", () => {
    const fx = [{ id: "a", effect_type: "add_effort_hours", effect_value: "2", source_task_key: "t1", source_step_key: "e1" }, { id: "b", effect_type: "add_effort_minutes", effect_value: "30", source_task_key: "t1", source_step_key: "e1" }];
    expect(extraHoursFor(fx, "t1", "e1")).toEqual({ hours: 2.5, ids: ["a", "b"], specialtyId: null });
    expect(extraHoursFor(fx, "t1", "e2").hours).toBe(0);
    expect(stepRefsOf(version, specialties).map((r) => [r.stepName, r.rate])).toEqual([["Criar campanhas", 50], ["Relatório", null]]);
  });
  it("escolher a etapa e informar as horas cria o impacto de esforço e mostra a especialidade e o custo", async () => {
    render(<OptionStepAdjustments option={{ id: "o1", effects: [] }} version={version} specialties={specialties} readOnly={false} act={act} />);
    expect(screen.getByTestId("adjust-empty")).toBeTruthy();
    // sem escolher a etapa / sem horas: avisa o motivo
    fireEvent.click(screen.getByText("Adicionar horas extras"));
    expect(screen.getByTestId("adjust-error").textContent).toMatch(/Escolha a etapa/);
    fireEvent.change(screen.getByLabelText("Etapa que recebe horas extras"), { target: { value: "t1::e1" } });
    fireEvent.click(screen.getByText("Adicionar horas extras"));
    expect(screen.getByTestId("adjust-error").textContent).toMatch(/Informe as horas/);
    fireEvent.change(screen.getByLabelText("Horas extras a adicionar"), { target: { value: "3" } });
    fireEvent.click(screen.getByText("Adicionar horas extras"));
    await waitFor(() => expect(add).toHaveBeenCalledWith("o1", expect.objectContaining({ effect_type: "add_effort_hours", effect_value: "3", source_task_key: "t1", source_step_key: "e1" })));
  });
  it("etapa com horas extras aparece na lista com especialidade e custo; trocar o valor substitui; remover apaga", async () => {
    const fx = [{ id: "a", effect_type: "add_effort_hours", effect_value: "2", source_task_key: "t1", source_step_key: "e1" }];
    render(<OptionStepAdjustments option={{ id: "o1", effects: fx }} version={version} specialties={specialties} readOnly={false} act={act} />);
    const input = screen.getByLabelText("Horas extras na etapa Criar campanhas") as HTMLInputElement;
    expect(input.value).toBe("2");
    expect(screen.getByTestId("option-step-adjust").textContent).toMatch(/especialidade: Gestor/);
    expect(screen.getByTestId("adjust-cost").textContent).toMatch(/R\$\s*100,00/);
    // só a etapa com horas está na lista; a outra fica para ser escolhida no "adicionar"
    expect(screen.queryByLabelText("Horas extras na etapa Relatório")).toBeNull();
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.blur(input);
    await waitFor(() => expect(del).toHaveBeenCalledWith("a"));
    await waitFor(() => expect(add).toHaveBeenCalledWith("o1", expect.objectContaining({ effect_value: "5" })));
    del.mockClear(); add.mockClear();
    fireEvent.click(screen.getByLabelText("Remover horas extras da etapa Criar campanhas"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("a"));
    expect(add).not.toHaveBeenCalled();
  });
  it("especialidade própria das horas extras: vai no efeito, aparece na lista e define o custo", async () => {
    const sp2 = [{ id: "sp1", name: "Gestor", max_hourly_rate: 50 }, { id: "sp9", name: "Designer", max_hourly_rate: 80 }];
    const { rerender } = render(<OptionStepAdjustments option={{ id: "o1", effects: [] }} version={version} specialties={sp2} readOnly={false} act={act} />);
    fireEvent.change(screen.getByLabelText("Etapa que recebe horas extras"), { target: { value: "t1::" } });
    fireEvent.change(screen.getByLabelText("Especialidade das horas extras"), { target: { value: "sp9" } });
    fireEvent.change(screen.getByLabelText("Horas extras a adicionar"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("Adicionar horas extras"));
    await waitFor(() => expect(add).toHaveBeenCalledWith("o1", expect.objectContaining({ source_task_key: "t1", source_step_key: null, specialty_id: "sp9", effect_value: "2" })));
    const fx = [{ id: "z", effect_type: "add_effort_hours", effect_value: "2", source_task_key: "t1", source_step_key: null, specialty_id: "sp9" }];
    rerender(<OptionStepAdjustments option={{ id: "o1", effects: fx }} version={version} specialties={sp2} readOnly={false} act={act} />);
    expect(screen.getByTestId("option-step-adjust").textContent).toMatch(/especialidade própria: Designer/);
    expect(screen.getByTestId("adjust-cost").textContent).toMatch(/R\$\s*160,00/);
  });
  it("opção padrão (produto original) não mostra a área de horas extras", () => {
    render(<OptionStepAdjustments option={{ id: "o1", is_default: true, effects: [] }} version={version} specialties={specialties} readOnly={false} act={act} />);
    expect(screen.queryByTestId("option-step-adjust")).toBeNull();
    expect(screen.queryByText("Adicionar horas extras")).toBeNull();
  });
});

describe("variação: descrição, links e arquivo-modelo", () => {
  it("salva a descrição ao sair do campo e adiciona links válidos; recusa link sem http", async () => {
    const put = vi.fn(async () => ({}));
    render(<OptionExamples option={{ short_description: "", example_links: [], example_file: null }} readOnly={false} put={put} />);
    const d = screen.getByLabelText("Descrição curta da opção");
    fireEvent.change(d, { target: { value: "4 campanhas por mês" } }); fireEvent.blur(d);
    expect(put).toHaveBeenLastCalledWith({ short_description: "4 campanhas por mês" }, "Descrição salva.");
    fireEvent.change(screen.getByLabelText("Endereço do link de exemplo"), { target: { value: "drive.google.com/x" } });
    fireEvent.click(screen.getByText("Adicionar link"));
    expect(screen.getByRole("alert").textContent).toMatch(/http/);
    fireEvent.change(screen.getByLabelText("Endereço do link de exemplo"), { target: { value: "https://drive.google.com/x" } });
    fireEvent.change(screen.getByLabelText("Nome do link de exemplo"), { target: { value: "Modelo no Drive" } });
    fireEvent.click(screen.getByText("Adicionar link"));
    expect(put).toHaveBeenLastCalledWith({ example_links: [{ label: "Modelo no Drive", url: "https://drive.google.com/x" }] }, "Link de exemplo adicionado.");
  });
  it("anexa o arquivo-modelo (qualquer tipo) e permite remover", async () => {
    const put = vi.fn(async () => ({}));
    const { rerender } = render(<OptionExamples option={{ example_links: [], example_file: null }} readOnly={false} put={put} />);
    const input = screen.getByLabelText("Escolher arquivo-modelo do entregável");
    fireEvent.change(input, { target: { files: [new File(["x"], "modelo.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(put).toHaveBeenCalledWith({ example_file: expect.objectContaining({ name: "modelo.pdf" }) }, "Arquivo-modelo anexado."));
    rerender(<OptionExamples option={{ example_links: [], example_file: { id: "x", name: "modelo.pdf", size: 2048, mime: "application/pdf" } }} readOnly={false} put={put} />);
    fireEvent.click(screen.getByLabelText("Remover arquivo-modelo"));
    expect(put).toHaveBeenLastCalledWith({ example_file: null }, "Arquivo-modelo removido.");
  });
});
